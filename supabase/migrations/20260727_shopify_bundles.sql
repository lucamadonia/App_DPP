-- ============================================
-- Shopify Bundle/Set explosion + import gap visibility
-- 2026-07-27
--
-- PROBLEM
-- shopify_product_map is strictly 1 Shopify variant -> 1 Trackbliss product.
-- The "Set" products created in Shopify on 2026-07-13 are NOT native Shopify
-- bundles (productVariantComponents empty, requiresComponents=false, sku/barcode
-- null, inventoryItem.tracked=false) — Shopify delivers them as ONE line item.
-- They therefore could not be mapped at all, and unmapped line items were
-- silently dropped on import (shopify-webhook handleOrderCreated).
-- Result: order #1054 produced no shipment at all, #1055 lost its Set.
--
-- WHY A SEPARATE TABLE INSTEAD OF RELAXING shopify_product_map's UNIQUE
-- shopify_product_map also drives:
--   * the inventory export loop (one inventory_levels/set.json call per row) —
--     N rows per variant would issue N conflicting writes to the same Shopify
--     inventory item, last-write-wins;
--   * variantMap lookups built as new Map(rows.map(m => [m.shopify_variant_id, m]))
--     in both edge functions — a Map silently keeps only the LAST row per
--     variant, making today's single-product imports non-deterministic.
-- Bundles are a pure import-side concern, so they get their own tables and the
-- existing 1:1 path stays untouched.
--
-- WHY component_batch_id EXISTS
-- The Magnetwand is ONE product (86c396f1) with TWO batches — cee97a51 (beige)
-- and 5bb94146 (rose). Which one ships depends on the Shopify Set variant
-- (Beige/Rosa). product_components (the DPP-side set model) is product-scoped
-- and has no batch column, so it cannot express this.
-- ============================================

-- 1. shopify_bundle_map — header, one row per Shopify variant that is a Set
CREATE TABLE IF NOT EXISTS shopify_bundle_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shopify_product_id BIGINT NOT NULL,
    shopify_variant_id BIGINT NOT NULL,
    shopify_product_title TEXT,
    shopify_variant_title TEXT,
    shopify_sku TEXT,
    shopify_barcode TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, shopify_variant_id)
);

-- 2. shopify_bundle_components — lines, N rows per bundle
--    ON DELETE RESTRICT on component_product_id is deliberate: deleting a
--    Trackbliss product that is still part of a Set must fail loudly rather
--    than silently shrink every Set that contains it.
CREATE TABLE IF NOT EXISTS shopify_bundle_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    bundle_id UUID NOT NULL REFERENCES shopify_bundle_map(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    component_batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    auto_batch BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bundle_id, component_product_id, component_batch_id)
);

-- 3. Import gap visibility.
--    NOT reusing wh_shipments.notes: that column is user-editable free text on
--    ShipmentDetailPage and is already populated from the Shopify order note,
--    so warnings written there would be clobbered by the first user edit.
ALTER TABLE wh_shipments
    ADD COLUMN IF NOT EXISTS import_warnings JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 4. Set provenance on the exploded positions.
--    bundle_group = the Shopify line item id, so two identical Sets in one
--    order stay distinguishable. bundle_label is what the packer reads.
ALTER TABLE wh_shipment_items
    ADD COLUMN IF NOT EXISTS bundle_group TEXT,
    ADD COLUMN IF NOT EXISTS bundle_label TEXT;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE shopify_bundle_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_bundle_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shopify_bundle_map_select" ON shopify_bundle_map;
CREATE POLICY "shopify_bundle_map_select"
    ON shopify_bundle_map FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "shopify_bundle_map_insert" ON shopify_bundle_map;
CREATE POLICY "shopify_bundle_map_insert"
    ON shopify_bundle_map FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "shopify_bundle_map_update" ON shopify_bundle_map;
CREATE POLICY "shopify_bundle_map_update"
    ON shopify_bundle_map FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "shopify_bundle_map_delete" ON shopify_bundle_map;
CREATE POLICY "shopify_bundle_map_delete"
    ON shopify_bundle_map FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "shopify_bundle_components_select" ON shopify_bundle_components;
CREATE POLICY "shopify_bundle_components_select"
    ON shopify_bundle_components FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "shopify_bundle_components_insert" ON shopify_bundle_components;
CREATE POLICY "shopify_bundle_components_insert"
    ON shopify_bundle_components FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "shopify_bundle_components_update" ON shopify_bundle_components;
CREATE POLICY "shopify_bundle_components_update"
    ON shopify_bundle_components FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "shopify_bundle_components_delete" ON shopify_bundle_components;
CREATE POLICY "shopify_bundle_components_delete"
    ON shopify_bundle_components FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_shopify_bundle_map_tenant
    ON shopify_bundle_map(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_bundle_map_variant
    ON shopify_bundle_map(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_bundle_components_bundle
    ON shopify_bundle_components(bundle_id);
CREATE INDEX IF NOT EXISTS idx_shopify_bundle_components_product
    ON shopify_bundle_components(component_product_id);
CREATE INDEX IF NOT EXISTS idx_wh_shipments_import_warnings
    ON wh_shipments (tenant_id, created_at DESC)
    WHERE jsonb_array_length(import_warnings) > 0;
CREATE INDEX IF NOT EXISTS idx_wh_shipment_items_bundle_group
    ON wh_shipment_items (shipment_id, bundle_group)
    WHERE bundle_group IS NOT NULL;

-- ============================================
-- updated_at triggers
-- ============================================
CREATE OR REPLACE TRIGGER set_shopify_bundle_map_updated_at
    BEFORE UPDATE ON shopify_bundle_map
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_shopify_bundle_components_updated_at
    BEFORE UPDATE ON shopify_bundle_components
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
