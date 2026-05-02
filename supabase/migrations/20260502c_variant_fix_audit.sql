-- ================================================================
-- Variant Fix for Fambliss tenant + complete audit trail
-- Migration: 20260502c_variant_fix_audit.sql
--
-- One-off data fix for two products whose Shopify variants doubled
-- the inventory after the recent inventory export:
--
-- 1) Magnetuhr — only "white" is real, "black" is a leftover variant.
--    Delete the black variant mapping; user will manually delete the
--    variant or zero its stock in Shopify Admin.
--
-- 2) Magnetwand — both "beige" and "rose" are real, current single
--    DPP batch holds 201 units. Split into two batches:
--    - existing batch keeps 100 units → linked to "beige" variant
--    - new "-ROSE" batch holds 101 units → linked to "rose" variant
--    The existing 1 reserved unit stays on the beige batch.
--
-- All steps create activity_log + (where applicable)
-- wh_stock_transactions entries so the change is fully auditable.
-- ================================================================

DO $$
DECLARE
    v_tenant_id            UUID := '522f6254-f73c-4a26-b1e9-662035194bc5';
    v_uhr_black_mapping_id UUID := '851e9fcd-da0c-4739-89a4-bc923ee85431';
    v_wand_beige_mapping_id UUID := '73450779-5099-4783-9065-ba4179fb41b6';
    v_wand_rose_mapping_id  UUID := '287a9093-b2a1-4fc4-8530-6354164c598b';
    v_wand_product_id      UUID := '86c396f1-3d9a-4dbc-b33d-bcfc4c09eb57';
    v_wand_existing_batch  UUID := 'cee97a51-fb66-4cd2-a7c1-8295331cc5a6';
    v_munzingen_loc_id     UUID := '231d4124-155d-404c-8324-33e52c8e62c6';
    v_existing_stock_id    UUID;
    v_existing_qty_avail   INT;
    v_new_batch_id         UUID;
    v_audit_session        TEXT := 'variant_fix_' || extract(epoch FROM now())::bigint::text;
BEGIN
    -- ============================================================
    -- 0. Audit session start
    -- ============================================================
    INSERT INTO activity_log (tenant_id, action, entity_type, details)
    VALUES (
        v_tenant_id,
        'variant_fix.start',
        'shopify_product_map',
        jsonb_build_object(
            'migration', '20260502c_variant_fix_audit',
            'audit_session', v_audit_session,
            'reason', 'Magnetuhr black mapping leftover + Magnetwand variant split'
        )
    );

    -- ============================================================
    -- 1. Magnetuhr — log + delete the "black" mapping
    -- ============================================================
    INSERT INTO activity_log (tenant_id, action, entity_type, entity_id, details)
    SELECT
        v_tenant_id,
        'shopify_mapping.delete',
        'shopify_product_map',
        id,
        jsonb_build_object(
            'audit_session', v_audit_session,
            'reason', 'User confirmed Magnetuhr only sells white',
            'shopify_product_title', shopify_product_title,
            'shopify_variant_title', shopify_variant_title,
            'shopify_variant_id', shopify_variant_id,
            'shopify_inventory_item_id', shopify_inventory_item_id,
            'product_id', product_id,
            'batch_id', batch_id
        )
    FROM shopify_product_map
    WHERE id = v_uhr_black_mapping_id;

    DELETE FROM shopify_product_map WHERE id = v_uhr_black_mapping_id;

    -- ============================================================
    -- 2. Magnetwand — clone existing batch into a new "-ROSE" batch
    -- ============================================================
    INSERT INTO product_batches (
        tenant_id, product_id, batch_number, serial_number,
        production_date, expiration_date, quantity, status,
        supplier_id, notes,
        net_weight, gross_weight, price_per_unit, currency,
        materials_override, certifications_override,
        carbon_footprint_override, recyclability_override, description_override,
        product_height_cm, product_width_cm, product_depth_cm,
        packaging_type, packaging_description,
        packaging_height_cm, packaging_width_cm, packaging_depth_cm
    )
    SELECT
        tenant_id, product_id, batch_number,
        serial_number || '-ROSE',
        production_date, expiration_date, 101 /* rose count */, status,
        supplier_id,
        COALESCE(notes || ' | ', '') || 'Variant split from ' || serial_number || ' for rose color',
        net_weight, gross_weight, price_per_unit, currency,
        materials_override, certifications_override,
        carbon_footprint_override, recyclability_override, description_override,
        product_height_cm, product_width_cm, product_depth_cm,
        packaging_type, packaging_description,
        packaging_height_cm, packaging_width_cm, packaging_depth_cm
    FROM product_batches
    WHERE id = v_wand_existing_batch
    RETURNING id INTO v_new_batch_id;

    -- Update the existing batch's declared total to 100 (was 200) so reports
    -- match the split. Keep production_date, status, serial unchanged.
    UPDATE product_batches
    SET quantity = 100,
        notes = COALESCE(notes || ' | ', '') || 'Quantity reduced from 200 to 100 due to rose split (' || v_audit_session || ')'
    WHERE id = v_wand_existing_batch;

    INSERT INTO activity_log (tenant_id, action, entity_type, entity_id, details)
    VALUES
        (v_tenant_id, 'batch.update', 'product_batches', v_wand_existing_batch,
            jsonb_build_object(
                'audit_session', v_audit_session,
                'reason', 'Variant split — beige now tracks 100 of original 200',
                'quantity_before', 200,
                'quantity_after', 100,
                'paired_with_new_batch', v_new_batch_id
            )),
        (v_tenant_id, 'batch.create', 'product_batches', v_new_batch_id,
            jsonb_build_object(
                'audit_session', v_audit_session,
                'reason', 'Variant split — rose batch cloned from beige',
                'cloned_from_batch_id', v_wand_existing_batch,
                'serial_suffix', '-ROSE',
                'quantity', 101
            ));

    -- ============================================================
    -- 3. Split wh_stock_levels: existing 201 → 100 (beige) + 101 (rose)
    -- ============================================================
    SELECT id, quantity_available
    INTO v_existing_stock_id, v_existing_qty_avail
    FROM wh_stock_levels
    WHERE tenant_id = v_tenant_id
      AND batch_id = v_wand_existing_batch
      AND location_id = v_munzingen_loc_id
    LIMIT 1;

    IF v_existing_stock_id IS NULL THEN
        RAISE EXCEPTION 'Could not find existing wh_stock_levels row for Magnetwand beige batch in Munzingen';
    END IF;

    -- Reduce existing stock to 100 (1 reserved unit stays on this row)
    UPDATE wh_stock_levels
    SET quantity_available = 100
    WHERE id = v_existing_stock_id;

    INSERT INTO wh_stock_transactions (
        tenant_id, transaction_number, type,
        location_id, product_id, batch_id,
        quantity, quantity_before, quantity_after,
        reason, notes
    ) VALUES (
        v_tenant_id,
        'SPLIT-OUT-' || gen_random_uuid()::text,
        'adjustment',
        v_munzingen_loc_id, v_wand_product_id, v_wand_existing_batch,
        100 - v_existing_qty_avail,                -- e.g. -101 if was 201
        v_existing_qty_avail, 100,
        'variant_split_to_rose',
        'Migration 20260502c — moved units to new rose batch (' || v_audit_session || ')'
    );

    -- Insert new stock row for rose batch (101 units, no reservations)
    INSERT INTO wh_stock_levels (
        tenant_id, location_id, product_id, batch_id,
        quantity_available, quantity_reserved, quantity_damaged, quantity_quarantine,
        bin_location, zone
    )
    SELECT
        tenant_id, location_id, product_id, v_new_batch_id,
        101, 0, 0, 0,
        bin_location, zone
    FROM wh_stock_levels
    WHERE id = v_existing_stock_id;

    INSERT INTO wh_stock_transactions (
        tenant_id, transaction_number, type,
        location_id, product_id, batch_id,
        quantity, quantity_before, quantity_after,
        reason, notes
    ) VALUES (
        v_tenant_id,
        'SPLIT-IN-' || gen_random_uuid()::text,
        'adjustment',
        v_munzingen_loc_id, v_wand_product_id, v_new_batch_id,
        101, 0, 101,
        'variant_split_from_beige',
        'Migration 20260502c — incoming from beige batch split (' || v_audit_session || ')'
    );

    -- ============================================================
    -- 4. Link the two Magnetwand mappings to their batches
    -- ============================================================
    UPDATE shopify_product_map
    SET batch_id = v_wand_existing_batch
    WHERE id = v_wand_beige_mapping_id;

    UPDATE shopify_product_map
    SET batch_id = v_new_batch_id
    WHERE id = v_wand_rose_mapping_id;

    INSERT INTO activity_log (tenant_id, action, entity_type, entity_id, details)
    VALUES
        (v_tenant_id, 'shopify_mapping.update', 'shopify_product_map', v_wand_beige_mapping_id,
            jsonb_build_object(
                'audit_session', v_audit_session,
                'reason', 'Link beige variant to existing batch after split',
                'batch_id', v_wand_existing_batch
            )),
        (v_tenant_id, 'shopify_mapping.update', 'shopify_product_map', v_wand_rose_mapping_id,
            jsonb_build_object(
                'audit_session', v_audit_session,
                'reason', 'Link rose variant to new batch after split',
                'batch_id', v_new_batch_id
            ));

    -- ============================================================
    -- 5. Final summary entry
    -- ============================================================
    INSERT INTO activity_log (tenant_id, action, entity_type, details)
    VALUES (
        v_tenant_id,
        'variant_fix.complete',
        'shopify_product_map',
        jsonb_build_object(
            'audit_session', v_audit_session,
            'migration', '20260502c_variant_fix_audit',
            'magnetuhr', jsonb_build_object(
                'black_mapping_deleted', v_uhr_black_mapping_id
            ),
            'magnetwand', jsonb_build_object(
                'beige_batch_id', v_wand_existing_batch, 'beige_qty', 100,
                'rose_batch_id', v_new_batch_id, 'rose_qty', 101,
                'reservation_preserved_on', 'beige'
            )
        )
    );
END $$;
