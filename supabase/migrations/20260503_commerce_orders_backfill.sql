-- ================================================================
-- Backfill: existing Shopify shipments → commerce_orders
-- Migration: 20260503_commerce_orders_backfill.sql
--
-- Until today, Shopify orders only landed in wh_shipments and never
-- reached commerce_orders, which is what the Mega Dashboard reads.
-- Result: the dashboard was missing orders synced before the
-- shopify-sync / shopify-webhook bridge fix.
--
-- This migration walks every wh_shipments row that has a shopify_order_id
-- and creates a matching commerce_orders row, plus one commerce_order_items
-- row per wh_shipment_items. Idempotent — uses ON CONFLICT DO NOTHING on
-- the (tenant_id, platform, external_order_id) unique constraint.
--
-- The DPP linkage from wh_shipment_items.product_id / .batch_id carries
-- straight through. shopify_product_map gives us variant_id + variant_title.
-- ================================================================

DO $$
DECLARE
    v_audit_session TEXT := 'commerce_backfill_' || extract(epoch FROM now())::bigint::text;
    v_inserted_orders INT := 0;
    v_inserted_items INT := 0;
BEGIN
    -- Insert one commerce_orders row per shopify-linked wh_shipments
    WITH inserted AS (
        INSERT INTO commerce_orders (
            tenant_id, platform,
            external_order_id, external_order_number,
            currency, total_amount,
            customer_email, customer_name,
            customer_country, customer_city, customer_postal_code,
            order_status, fulfillment_status,
            item_count,
            placed_at, fulfilled_at, cancelled_at,
            metadata
        )
        SELECT
            s.tenant_id, 'shopify',
            s.shopify_order_id::text,
            s.order_reference,
            COALESCE(s.currency, 'EUR'),
            COALESCE(s.shipping_cost, 0),
            s.recipient_email, s.recipient_name,
            s.shipping_country, s.shipping_city, s.shipping_postal_code,
            CASE
                WHEN s.status = 'cancelled' THEN 'cancelled'
                WHEN s.status = 'delivered' THEN 'closed'
                ELSE 'open'
            END,
            CASE
                WHEN s.status IN ('shipped', 'in_transit', 'delivered') THEN 'shipped'
                WHEN s.status = 'cancelled' THEN 'cancelled'
                ELSE 'unfulfilled'
            END,
            COALESCE(s.total_items, 0),
            s.created_at,
            s.shipped_at,
            CASE WHEN s.status = 'cancelled' THEN s.updated_at ELSE NULL END,
            jsonb_build_object('source', 'backfill_migration', 'audit_session', v_audit_session, 'wh_shipment_id', s.id)
        FROM wh_shipments s
        WHERE s.shopify_order_id IS NOT NULL
        ON CONFLICT (tenant_id, platform, external_order_id) DO NOTHING
        RETURNING id, external_order_id, tenant_id
    )
    SELECT COUNT(*) INTO v_inserted_orders FROM inserted;

    -- For every newly-bridged order, copy line items.
    -- Use the same idempotency: only orders we just inserted (the items table
    -- has no unique constraint, so we anchor via the source wh_shipments).
    WITH new_orders AS (
        SELECT co.id AS order_id, co.tenant_id,
               (co.metadata->>'wh_shipment_id')::uuid AS shipment_id
        FROM commerce_orders co
        WHERE co.metadata->>'audit_session' = v_audit_session
    ),
    inserted_items AS (
        INSERT INTO commerce_order_items (
            tenant_id, order_id,
            external_variant_id,
            title, variant_title, sku,
            quantity, unit_price, total_price,
            product_id, batch_id,
            match_method, match_confidence
        )
        SELECT
            no.tenant_id, no.order_id,
            spm.shopify_variant_id::text,
            COALESCE(p.name, 'Item'),
            spm.shopify_variant_title,
            NULL,
            si.quantity,
            COALESCE(si.unit_price, 0),
            COALESCE(si.unit_price, 0) * si.quantity,
            si.product_id,
            si.batch_id,
            CASE WHEN si.product_id IS NOT NULL THEN 'gtin' ELSE NULL END,
            CASE WHEN si.product_id IS NOT NULL THEN 1.0 ELSE NULL END
        FROM new_orders no
        JOIN wh_shipment_items si ON si.shipment_id = no.shipment_id
        LEFT JOIN products p ON p.id = si.product_id
        LEFT JOIN shopify_product_map spm
            ON spm.tenant_id = no.tenant_id
           AND spm.product_id = si.product_id
           AND (spm.batch_id = si.batch_id OR spm.batch_id IS NULL)
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_inserted_items FROM inserted_items;

    -- Patch dpp_linked_count + dpp_total_count for the new rows
    UPDATE commerce_orders co
    SET dpp_linked_count = sub.linked,
        dpp_total_count  = sub.total
    FROM (
        SELECT order_id,
               SUM(quantity) FILTER (WHERE product_id IS NOT NULL) AS linked,
               SUM(quantity) AS total
        FROM commerce_order_items
        GROUP BY order_id
    ) sub
    WHERE co.id = sub.order_id
      AND co.metadata->>'audit_session' = v_audit_session;

    INSERT INTO activity_log (tenant_id, action, entity_type, details)
    SELECT DISTINCT s.tenant_id,
                    'commerce_backfill.complete',
                    'commerce_orders',
                    jsonb_build_object(
                        'audit_session', v_audit_session,
                        'migration', '20260503_commerce_orders_backfill',
                        'orders_inserted', v_inserted_orders,
                        'items_inserted', v_inserted_items
                    )
    FROM wh_shipments s
    WHERE s.shopify_order_id IS NOT NULL;
END $$;
