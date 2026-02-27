-- ============================================
-- Shopify Bidirectional Integration
-- 3 tables: product mapping, location mapping, sync log
-- ============================================

-- 1. shopify_product_map — Shopify variant ↔ Trackbliss product/batch
CREATE TABLE IF NOT EXISTS shopify_product_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shopify_product_id BIGINT NOT NULL,
    shopify_variant_id BIGINT NOT NULL,
    shopify_inventory_item_id BIGINT,
    shopify_product_title TEXT,
    shopify_variant_title TEXT,
    shopify_sku TEXT,
    shopify_barcode TEXT,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    sync_direction TEXT NOT NULL DEFAULT 'both'
        CHECK (sync_direction IN ('import_only', 'export_only', 'both')),
    is_active BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, shopify_variant_id)
);

-- 2. shopify_location_map — Shopify location ↔ wh_locations
CREATE TABLE IF NOT EXISTS shopify_location_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shopify_location_id BIGINT NOT NULL,
    shopify_location_name TEXT,
    location_id UUID NOT NULL REFERENCES wh_locations(id) ON DELETE CASCADE,
    sync_inventory BOOLEAN DEFAULT true,
    sync_orders BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, shopify_location_id)
);

-- 3. shopify_sync_log — sync history / audit trail
CREATE TABLE IF NOT EXISTS shopify_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sync_type TEXT NOT NULL
        CHECK (sync_type IN ('products', 'orders', 'inventory', 'fulfillment', 'customers', 'full')),
    direction TEXT NOT NULL
        CHECK (direction IN ('import', 'export')),
    status TEXT NOT NULL DEFAULT 'running'
        CHECK (status IN ('running', 'completed', 'partial', 'failed')),
    total_count INTEGER DEFAULT 0,
    processed_count INTEGER DEFAULT 0,
    created_count INTEGER DEFAULT 0,
    updated_count INTEGER DEFAULT 0,
    skipped_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    trigger_type TEXT DEFAULT 'manual'
        CHECK (trigger_type IN ('manual', 'scheduled', 'webhook')),
    triggered_by UUID,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE shopify_product_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_location_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_sync_log ENABLE ROW LEVEL SECURITY;

-- shopify_product_map: tenant-scoped CRUD
CREATE POLICY "shopify_product_map_select"
    ON shopify_product_map FOR SELECT TO authenticated
    USING (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

CREATE POLICY "shopify_product_map_insert"
    ON shopify_product_map FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

CREATE POLICY "shopify_product_map_update"
    ON shopify_product_map FOR UPDATE TO authenticated
    USING (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

CREATE POLICY "shopify_product_map_delete"
    ON shopify_product_map FOR DELETE TO authenticated
    USING (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

-- shopify_location_map: tenant-scoped CRUD
CREATE POLICY "shopify_location_map_select"
    ON shopify_location_map FOR SELECT TO authenticated
    USING (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

CREATE POLICY "shopify_location_map_insert"
    ON shopify_location_map FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

CREATE POLICY "shopify_location_map_update"
    ON shopify_location_map FOR UPDATE TO authenticated
    USING (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

CREATE POLICY "shopify_location_map_delete"
    ON shopify_location_map FOR DELETE TO authenticated
    USING (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

-- shopify_sync_log: tenant-scoped SELECT + INSERT
CREATE POLICY "shopify_sync_log_select"
    ON shopify_sync_log FOR SELECT TO authenticated
    USING (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

CREATE POLICY "shopify_sync_log_insert"
    ON shopify_sync_log FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (
        SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
    ));

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_shopify_product_map_tenant
    ON shopify_product_map(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_map_product
    ON shopify_product_map(product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_map_variant
    ON shopify_product_map(shopify_variant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_map_sku
    ON shopify_product_map(shopify_sku) WHERE shopify_sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shopify_product_map_barcode
    ON shopify_product_map(shopify_barcode) WHERE shopify_barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shopify_location_map_tenant
    ON shopify_location_map(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_location_map_location
    ON shopify_location_map(location_id);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_log_tenant
    ON shopify_sync_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_log_type
    ON shopify_sync_log(tenant_id, sync_type, direction);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_log_started
    ON shopify_sync_log(tenant_id, started_at DESC);

-- ============================================
-- updated_at TRIGGERS
-- ============================================

CREATE OR REPLACE TRIGGER set_shopify_product_map_updated_at
    BEFORE UPDATE ON shopify_product_map
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_shopify_location_map_updated_at
    BEFORE UPDATE ON shopify_location_map
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
