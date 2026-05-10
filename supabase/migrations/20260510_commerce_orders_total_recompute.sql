-- ================================================================
-- Fix: recompute total_amount on backfilled commerce_orders
-- Migration: 20260510_commerce_orders_total_recompute.sql
--
-- The 20260503 backfill seeded total_amount with shipping_cost (the
-- carrier fee), not the order total. Since wh_shipments.shipping_cost
-- was usually null, every backfilled order ended up with
-- total_amount = 0 and total_amount_eur = NULL, so the Mega Dashboard
-- platform breakdown showed "Shopify · 1 order · 0 €" even when the
-- line items added up to real revenue.
--
-- This migration walks orders flagged with metadata.source =
-- 'backfill_migration' that still have total_amount = 0 and rebuilds
-- the totals from the already-correct commerce_order_items rows.
-- For EUR orders we also populate total_amount_eur. Idempotent —
-- skips orders that have no items or whose total_amount already
-- reflects the line items.
-- ================================================================

WITH recomputed AS (
    SELECT co.id,
           co.currency,
           SUM(coi.total_price)::numeric AS items_total
    FROM commerce_orders co
    JOIN commerce_order_items coi ON coi.order_id = co.id
    WHERE co.metadata->>'source' = 'backfill_migration'
      AND COALESCE(co.total_amount, 0) = 0
    GROUP BY co.id, co.currency
    HAVING SUM(coi.total_price) > 0
)
UPDATE commerce_orders co
SET total_amount = r.items_total,
    subtotal_amount = CASE
        WHEN COALESCE(co.subtotal_amount, 0) = 0 THEN r.items_total
        ELSE co.subtotal_amount
    END,
    total_amount_eur = CASE
        WHEN COALESCE(co.currency, 'EUR') = 'EUR' THEN r.items_total
        ELSE co.total_amount_eur
    END,
    metadata = COALESCE(co.metadata, '{}'::jsonb) || jsonb_build_object(
        'totals_recomputed_at', now(),
        'totals_recomputed_from', 'commerce_order_items'
    )
FROM recomputed r
WHERE co.id = r.id;
