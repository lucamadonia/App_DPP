-- ================================================================
-- Warehouse & Fulfillment Module
-- Migration: 20260228_warehouse_fulfillment.sql
--
-- 6 new tables: wh_locations, wh_contacts, wh_stock_levels,
-- wh_shipments, wh_shipment_items, wh_stock_transactions
-- ================================================================

-- ================================================================
-- 1. wh_locations — Warehouse Locations
-- ================================================================

CREATE TABLE IF NOT EXISTS wh_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    type TEXT NOT NULL DEFAULT 'main'
        CHECK (type IN ('main','external','dropship','consignment','returns')),
    street TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    facility_identifier TEXT,
    capacity_units INTEGER,
    capacity_volume_m3 NUMERIC,
    zones JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_locations_tenant ON wh_locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_locations_active ON wh_locations(tenant_id, is_active);

ALTER TABLE wh_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_locations_select" ON wh_locations
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_locations_insert" ON wh_locations
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_locations_update" ON wh_locations
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_locations_delete" ON wh_locations
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ================================================================
-- 2. wh_contacts — B2B Contacts / Shipping Recipients
-- ================================================================

CREATE TABLE IF NOT EXISTS wh_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'b2b' CHECK (type IN ('b2b','other')),
    company_name TEXT,
    contact_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    street TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT,
    customer_number TEXT,
    vat_id TEXT,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_contacts_tenant ON wh_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_contacts_active ON wh_contacts(tenant_id, is_active);

ALTER TABLE wh_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_contacts_select" ON wh_contacts
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_contacts_insert" ON wh_contacts
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_contacts_update" ON wh_contacts
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_contacts_delete" ON wh_contacts
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ================================================================
-- 3. wh_shipments — Shipment Orders
-- ================================================================

CREATE TABLE IF NOT EXISTS wh_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
        'draft','picking','packed','label_created',
        'shipped','in_transit','delivered','cancelled'
    )),
    recipient_type TEXT NOT NULL CHECK (recipient_type IN (
        'customer','b2b_partner','warehouse','other'
    )),
    recipient_name TEXT NOT NULL,
    recipient_company TEXT,
    recipient_email TEXT,
    recipient_phone TEXT,
    shipping_street TEXT NOT NULL,
    shipping_city TEXT NOT NULL,
    shipping_state TEXT,
    shipping_postal_code TEXT NOT NULL,
    shipping_country TEXT NOT NULL,
    carrier TEXT,
    service_level TEXT,
    tracking_number TEXT,
    label_url TEXT,
    estimated_delivery DATE,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    shipping_cost NUMERIC,
    currency TEXT DEFAULT 'EUR',
    total_weight_grams NUMERIC,
    total_items INTEGER DEFAULT 0,
    source_location_id UUID REFERENCES wh_locations(id),
    order_reference TEXT,
    customer_id UUID,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    notes TEXT,
    internal_notes TEXT,
    packed_by UUID,
    shipped_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, shipment_number)
);

CREATE INDEX IF NOT EXISTS idx_wh_shipments_tenant ON wh_shipments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_shipments_status ON wh_shipments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wh_shipments_number ON wh_shipments(shipment_number);
CREATE INDEX IF NOT EXISTS idx_wh_shipments_tracking ON wh_shipments(tracking_number) WHERE tracking_number IS NOT NULL;

ALTER TABLE wh_shipments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_shipments_select" ON wh_shipments
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_shipments_insert" ON wh_shipments
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_shipments_update" ON wh_shipments
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_shipments_delete" ON wh_shipments
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ================================================================
-- 4. wh_stock_levels — Stock per Batch per Location
-- ================================================================

CREATE TABLE IF NOT EXISTS wh_stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES wh_locations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID NOT NULL REFERENCES product_batches(id) ON DELETE CASCADE,
    quantity_available INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_damaged INTEGER NOT NULL DEFAULT 0,
    quantity_quarantine INTEGER NOT NULL DEFAULT 0,
    bin_location TEXT,
    zone TEXT,
    reorder_point INTEGER,
    reorder_quantity INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, location_id, batch_id),
    CHECK (quantity_available >= 0),
    CHECK (quantity_reserved >= 0),
    CHECK (quantity_damaged >= 0),
    CHECK (quantity_quarantine >= 0)
);

CREATE INDEX IF NOT EXISTS idx_wh_stock_tenant ON wh_stock_levels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_stock_location ON wh_stock_levels(location_id);
CREATE INDEX IF NOT EXISTS idx_wh_stock_product ON wh_stock_levels(product_id);
CREATE INDEX IF NOT EXISTS idx_wh_stock_batch ON wh_stock_levels(batch_id);
CREATE INDEX IF NOT EXISTS idx_wh_stock_low ON wh_stock_levels(tenant_id)
    WHERE reorder_point IS NOT NULL;

ALTER TABLE wh_stock_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_stock_levels_select" ON wh_stock_levels
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_stock_levels_insert" ON wh_stock_levels
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_stock_levels_update" ON wh_stock_levels
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_stock_levels_delete" ON wh_stock_levels
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ================================================================
-- 5. wh_shipment_items — Line Items in Shipment
-- ================================================================

CREATE TABLE IF NOT EXISTS wh_shipment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id UUID NOT NULL REFERENCES wh_shipments(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    batch_id UUID NOT NULL REFERENCES product_batches(id),
    location_id UUID NOT NULL REFERENCES wh_locations(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    quantity_picked INTEGER DEFAULT 0,
    quantity_packed INTEGER DEFAULT 0,
    unit_price NUMERIC,
    currency TEXT DEFAULT 'EUR',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_shipment_items_shipment ON wh_shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_wh_shipment_items_batch ON wh_shipment_items(batch_id);

ALTER TABLE wh_shipment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_shipment_items_select" ON wh_shipment_items
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_shipment_items_insert" ON wh_shipment_items
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_shipment_items_update" ON wh_shipment_items
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_shipment_items_delete" ON wh_shipment_items
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ================================================================
-- 6. wh_stock_transactions — Stock Movement Audit Trail
-- ================================================================

CREATE TABLE IF NOT EXISTS wh_stock_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transaction_number TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'goods_receipt','shipment','transfer_out','transfer_in',
        'adjustment','return_receipt','reservation','release',
        'damage','write_off'
    )),
    location_id UUID REFERENCES wh_locations(id),
    product_id UUID NOT NULL REFERENCES products(id),
    batch_id UUID NOT NULL REFERENCES product_batches(id),
    quantity INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    shipment_id UUID REFERENCES wh_shipments(id),
    return_id UUID,
    related_transaction_id UUID,
    reason TEXT,
    notes TEXT,
    reference_number TEXT,
    performed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_transactions_tenant ON wh_stock_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_transactions_location ON wh_stock_transactions(location_id);
CREATE INDEX IF NOT EXISTS idx_wh_transactions_batch ON wh_stock_transactions(batch_id);
CREATE INDEX IF NOT EXISTS idx_wh_transactions_type ON wh_stock_transactions(tenant_id, type);
CREATE INDEX IF NOT EXISTS idx_wh_transactions_shipment ON wh_stock_transactions(shipment_id) WHERE shipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wh_transactions_number ON wh_stock_transactions(transaction_number);

ALTER TABLE wh_stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_stock_transactions_select" ON wh_stock_transactions
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "wh_stock_transactions_insert" ON wh_stock_transactions
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ================================================================
-- updated_at triggers
-- ================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_wh_locations_updated_at') THEN
        CREATE TRIGGER set_wh_locations_updated_at
            BEFORE UPDATE ON wh_locations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_wh_contacts_updated_at') THEN
        CREATE TRIGGER set_wh_contacts_updated_at
            BEFORE UPDATE ON wh_contacts
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_wh_stock_levels_updated_at') THEN
        CREATE TRIGGER set_wh_stock_levels_updated_at
            BEFORE UPDATE ON wh_stock_levels
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_wh_shipments_updated_at') THEN
        CREATE TRIGGER set_wh_shipments_updated_at
            BEFORE UPDATE ON wh_shipments
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;
