-- Product Sets / Bundles: product_type, aggregation_overrides, and components junction table

-- product_type column on products (single vs set)
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'single'
    CHECK (product_type IN ('single', 'set'));

-- Aggregation override flags (which sustainability fields use manual data vs aggregated)
ALTER TABLE products ADD COLUMN IF NOT EXISTS aggregation_overrides JSONB DEFAULT '{}';

-- Junction table for set components
CREATE TABLE IF NOT EXISTS product_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    parent_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    sort_order INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(parent_product_id, component_product_id),
    CHECK (parent_product_id != component_product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_components_parent ON product_components(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_product_components_component ON product_components(component_product_id);
CREATE INDEX IF NOT EXISTS idx_product_components_tenant ON product_components(tenant_id);

-- RLS
ALTER TABLE product_components ENABLE ROW LEVEL SECURITY;

-- Tenant isolation: users can only see their own tenant's components
CREATE POLICY "product_components_tenant_isolation" ON product_components
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Public read access for DPP pages (anonymous users need to see set components)
CREATE POLICY "product_components_public_read" ON product_components
    FOR SELECT USING (true);
