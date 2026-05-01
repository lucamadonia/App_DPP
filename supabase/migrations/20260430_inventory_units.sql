-- ================================================================
-- Per-Unit Inventory Tracking
-- Migration: 20260430_inventory_units.sql
--
-- Adds inventory_units table to track individual physical units
-- within a batch. Enables "scan each unit and see what is missing"
-- workflow on top of the existing batch-level model.
--
-- Coexistence: existing batches keep working with aggregate quantity
-- in wh_stock_levels. New batches can opt in via
-- product_batches.unit_tracking_enabled.
-- ================================================================

-- ================================================================
-- 1. product_batches — opt-in flag
-- ================================================================

ALTER TABLE product_batches
    ADD COLUMN IF NOT EXISTS unit_tracking_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_product_batches_unit_tracking
    ON product_batches(tenant_id, unit_tracking_enabled)
    WHERE unit_tracking_enabled = TRUE;

COMMENT ON COLUMN product_batches.unit_tracking_enabled
    IS 'When true, batch is split into individual inventory_units rows for per-unit serial scanning';

-- ================================================================
-- 2. inventory_units — one row per physical unit
-- ================================================================

CREATE TABLE IF NOT EXISTS inventory_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES product_batches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    unit_serial TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'expected' CHECK (status IN (
        'expected','received','reserved','shipped','damaged','quarantine','returned','lost','consumed'
    )),
    location_id UUID REFERENCES wh_locations(id) ON DELETE SET NULL,
    bin_location TEXT,
    received_at TIMESTAMPTZ,
    received_by UUID,
    shipped_at TIMESTAMPTZ,
    shipped_by UUID,
    shipment_id UUID REFERENCES wh_shipments(id) ON DELETE SET NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, unit_serial)
);

CREATE INDEX IF NOT EXISTS idx_inventory_units_tenant
    ON inventory_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_batch
    ON inventory_units(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_batch_status
    ON inventory_units(tenant_id, batch_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_units_location
    ON inventory_units(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_units_status
    ON inventory_units(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_units_serial
    ON inventory_units(unit_serial);
CREATE INDEX IF NOT EXISTS idx_inventory_units_shipment
    ON inventory_units(shipment_id) WHERE shipment_id IS NOT NULL;

ALTER TABLE inventory_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_units_select" ON inventory_units
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "inventory_units_insert" ON inventory_units
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "inventory_units_update" ON inventory_units
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "inventory_units_delete" ON inventory_units
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- updated_at trigger (function already exists from warehouse migration)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_inventory_units_updated_at') THEN
        CREATE TRIGGER set_inventory_units_updated_at
            BEFORE UPDATE ON inventory_units
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

COMMENT ON TABLE inventory_units IS 'Per-unit physical inventory tracking. One row per individual unit within a unit-tracked batch.';
COMMENT ON COLUMN inventory_units.unit_serial IS 'Unique serial of this single physical unit (e.g., BATCH-001, BATCH-002...). Tenant-unique.';
COMMENT ON COLUMN inventory_units.status IS 'Lifecycle: expected (created, not yet received) → received → reserved → shipped. Or damaged/quarantine/returned/lost/consumed.';
