-- ================================================================
-- Multi-Bin Stock Tracking
-- Migration: 20260502_wh_stock_per_bin.sql
--
-- A real warehouse holds the same product/batch on several shelves.
-- The original unique constraint (tenant_id, location_id, batch_id)
-- forced one aggregate row per location, so the goods-receipt UI
-- could only target one bin per receipt and bin_location got
-- overwritten on every later receipt.
--
-- New constraint includes bin_location with NULLS NOT DISTINCT, so
-- each shelf gets its own row and (location, batch, NULL bin) is
-- still a single distinct row.
-- ================================================================

ALTER TABLE wh_stock_levels
    DROP CONSTRAINT IF EXISTS wh_stock_levels_tenant_id_location_id_batch_id_key;

-- Postgres 15+: NULLS NOT DISTINCT treats NULL bin_location as a single
-- value, so two rows with NULL bin at the same (location, batch) still
-- conflict. Supabase runs PG15+, so this is safe.
ALTER TABLE wh_stock_levels
    ADD CONSTRAINT wh_stock_levels_tenant_location_batch_bin_unique
    UNIQUE NULLS NOT DISTINCT (tenant_id, location_id, batch_id, bin_location);

COMMENT ON CONSTRAINT wh_stock_levels_tenant_location_batch_bin_unique
    ON wh_stock_levels
    IS 'One stock row per (tenant, location, batch, bin). Allows splitting a batch across multiple shelves at the same warehouse location.';
