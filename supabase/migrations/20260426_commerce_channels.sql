-- ============================================
-- Commerce Hub: Multi-Channel Sales Tracking
-- Whitelabel SaaS module for connecting Shopify,
-- Etsy, Pinterest, Amazon, eBay, WooCommerce, TikTok Shop.
-- Unifies orders into a single revenue + DPP tracking layer.
-- ============================================

-- 1. commerce_channel_connections — one row per connected platform per tenant
CREATE TABLE IF NOT EXISTS commerce_channel_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    platform TEXT NOT NULL
        CHECK (platform IN (
            'shopify', 'etsy', 'pinterest', 'amazon',
            'ebay', 'woocommerce', 'tiktok_shop',
            'manual', 'custom_api'
        )),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'connecting', 'connected', 'error', 'disconnected', 'reauth_required')),

    -- Display info (no secrets here)
    account_label TEXT NOT NULL,
    account_url TEXT,
    account_external_id TEXT,
    account_currency TEXT DEFAULT 'EUR',
    account_country TEXT,
    icon_color TEXT,

    -- Capabilities — what this connection has been authorized to do
    can_read_orders BOOLEAN DEFAULT true,
    can_read_products BOOLEAN DEFAULT true,
    can_write_inventory BOOLEAN DEFAULT false,
    can_write_fulfillment BOOLEAN DEFAULT false,

    -- Encrypted credentials are stored ONLY in tenants.settings.commerceHubCredentials
    -- to keep this row safe to expose via RLS to authenticated users.
    credential_ref TEXT,
    scopes TEXT[],
    webhook_secret_hash TEXT,
    webhook_subscription_ids TEXT[],

    -- Sync state
    last_full_sync_at TIMESTAMPTZ,
    last_incremental_sync_at TIMESTAMPTZ,
    last_error_message TEXT,
    last_error_at TIMESTAMPTZ,
    next_sync_after TIMESTAMPTZ,
    sync_cursor TEXT,
    auto_sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INTEGER DEFAULT 15,

    -- Auto-DPP matching configuration
    auto_match_by_gtin BOOLEAN DEFAULT true,
    auto_match_by_sku BOOLEAN DEFAULT true,
    auto_match_threshold NUMERIC(3,2) DEFAULT 0.85,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, platform, account_external_id)
);

-- 2. commerce_orders — normalized order from any platform
CREATE TABLE IF NOT EXISTS commerce_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES commerce_channel_connections(id) ON DELETE SET NULL,
    platform TEXT NOT NULL,

    -- External identity
    external_order_id TEXT NOT NULL,
    external_order_number TEXT,
    external_customer_id TEXT,
    external_url TEXT,

    -- Money
    currency TEXT NOT NULL DEFAULT 'EUR',
    subtotal_amount NUMERIC(14,2) DEFAULT 0,
    shipping_amount NUMERIC(14,2) DEFAULT 0,
    tax_amount NUMERIC(14,2) DEFAULT 0,
    discount_amount NUMERIC(14,2) DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- Total in EUR for cross-platform aggregation (snapshot at sync time)
    total_amount_eur NUMERIC(14,2),

    -- Customer (denormalized for fast dashboards; PII minimized)
    customer_email TEXT,
    customer_name TEXT,
    customer_country TEXT,         -- ISO 3166-1 alpha-2
    customer_country_name TEXT,
    customer_city TEXT,
    customer_postal_code TEXT,
    customer_lat NUMERIC(9,6),
    customer_lng NUMERIC(9,6),
    customer_is_returning BOOLEAN DEFAULT false,

    -- Status & lifecycle
    financial_status TEXT,         -- paid, pending, refunded, partially_refunded, voided
    fulfillment_status TEXT,       -- unfulfilled, partial, shipped, delivered
    order_status TEXT,             -- open, closed, cancelled
    is_test BOOLEAN DEFAULT false,
    item_count INTEGER DEFAULT 0,

    -- DPP tracking — populated as items are matched to products
    dpp_linked_count INTEGER DEFAULT 0,
    dpp_total_count INTEGER DEFAULT 0,

    -- Carbon tracking aggregate
    carbon_footprint_kg NUMERIC(10,3),

    -- Times
    placed_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    fulfilled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    synced_at TIMESTAMPTZ DEFAULT NOW(),

    raw_payload JSONB,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(tenant_id, platform, external_order_id)
);

-- 3. commerce_order_items — line items with DPP linkage
CREATE TABLE IF NOT EXISTS commerce_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,

    -- External
    external_item_id TEXT,
    external_product_id TEXT,
    external_variant_id TEXT,

    title TEXT NOT NULL,
    variant_title TEXT,
    sku TEXT,
    gtin TEXT,
    image_url TEXT,

    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(14,2) DEFAULT 0,
    total_price NUMERIC(14,2) DEFAULT 0,

    -- DPP linkage (the crown jewel)
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    match_method TEXT
        CHECK (match_method IN ('gtin', 'sku', 'manual', 'auto_fuzzy', NULL)),
    match_confidence NUMERIC(3,2),
    dpp_url TEXT,
    dpp_qr_emitted_at TIMESTAMPTZ,

    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. commerce_sync_events — audit + observability of every sync run
CREATE TABLE IF NOT EXISTS commerce_sync_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    connection_id UUID REFERENCES commerce_channel_connections(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'connection_created', 'connection_updated', 'connection_disconnected',
            'sync_started', 'sync_completed', 'sync_failed',
            'webhook_received', 'webhook_replayed',
            'order_imported', 'order_updated',
            'product_matched', 'match_failed'
        )),
    severity TEXT DEFAULT 'info'
        CHECK (severity IN ('info', 'success', 'warning', 'error')),
    title TEXT NOT NULL,
    description TEXT,
    duration_ms INTEGER,
    items_processed INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_cc_connections_tenant
    ON commerce_channel_connections(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cc_connections_platform
    ON commerce_channel_connections(tenant_id, platform);

CREATE INDEX IF NOT EXISTS idx_co_tenant_placed
    ON commerce_orders(tenant_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_co_connection
    ON commerce_orders(connection_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS idx_co_platform_status
    ON commerce_orders(tenant_id, platform, financial_status);
CREATE INDEX IF NOT EXISTS idx_co_country
    ON commerce_orders(tenant_id, customer_country) WHERE customer_country IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coi_order
    ON commerce_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_coi_product
    ON commerce_order_items(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coi_gtin
    ON commerce_order_items(tenant_id, gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_coi_sku
    ON commerce_order_items(tenant_id, sku) WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cse_tenant_recent
    ON commerce_sync_events(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cse_connection_recent
    ON commerce_sync_events(connection_id, created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE commerce_channel_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce_sync_events ENABLE ROW LEVEL SECURITY;

-- Helper: every policy uses the tenant_id mapping from profiles.
-- All four tables get tenant-scoped CRUD for authenticated users.

-- commerce_channel_connections
CREATE POLICY cc_connections_select ON commerce_channel_connections
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY cc_connections_insert ON commerce_channel_connections
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY cc_connections_update ON commerce_channel_connections
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY cc_connections_delete ON commerce_channel_connections
    FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

-- commerce_orders
CREATE POLICY co_select ON commerce_orders
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY co_insert ON commerce_orders
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY co_update ON commerce_orders
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY co_delete ON commerce_orders
    FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

-- commerce_order_items
CREATE POLICY coi_select ON commerce_order_items
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY coi_insert ON commerce_order_items
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY coi_update ON commerce_order_items
    FOR UPDATE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY coi_delete ON commerce_order_items
    FOR DELETE TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

-- commerce_sync_events (read-only from client; writes via service role / edge functions)
CREATE POLICY cse_select ON commerce_sync_events
    FOR SELECT TO authenticated
    USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY cse_insert ON commerce_sync_events
    FOR INSERT TO authenticated
    WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

-- ============================================
-- updated_at TRIGGERS
-- ============================================

CREATE OR REPLACE TRIGGER set_cc_connections_updated_at
    BEFORE UPDATE ON commerce_channel_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_co_updated_at
    BEFORE UPDATE ON commerce_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER set_coi_updated_at
    BEFORE UPDATE ON commerce_order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- COMMERCE HUB MODULE BILLING SUPPORT
-- Update billing_module_subscriptions CHECK to allow new module IDs.
-- This is non-destructive: drop old constraint if present, add a new one
-- that includes the existing module set + commerce_hub_*.
-- ============================================

DO $$
BEGIN
    -- Drop existing constraint(s) on module_id if they exist
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'billing_module_subscriptions'
          AND constraint_type = 'CHECK'
          AND constraint_name LIKE '%module_id%'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE billing_module_subscriptions DROP CONSTRAINT ' || quote_ident(constraint_name)
            FROM information_schema.table_constraints
            WHERE table_name = 'billing_module_subscriptions'
              AND constraint_type = 'CHECK'
              AND constraint_name LIKE '%module_id%'
            LIMIT 1
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Constraint shape varies by environment — best effort
    NULL;
END $$;

-- (We re-add module_id check in a forward-compatible way.)
ALTER TABLE billing_module_subscriptions
    DROP CONSTRAINT IF EXISTS billing_module_subscriptions_module_id_check;

ALTER TABLE billing_module_subscriptions
    ADD CONSTRAINT billing_module_subscriptions_module_id_check
    CHECK (module_id IN (
        'returns_hub_starter', 'returns_hub_professional', 'returns_hub_business',
        'supplier_portal', 'customer_portal', 'custom_domain',
        'warehouse_starter', 'warehouse_professional', 'warehouse_business',
        'commerce_hub_starter', 'commerce_hub_professional', 'commerce_hub_business'
    ));

-- ============================================
-- COMMENTS — for self-documenting schema
-- ============================================

COMMENT ON TABLE commerce_channel_connections IS
    'One row per connected sales platform per tenant. Credentials are stored encrypted in tenants.settings.commerceHubCredentials, never in this row.';

COMMENT ON TABLE commerce_orders IS
    'Normalized orders aggregated across all sales platforms. One source of truth for revenue & DPP tracking.';

COMMENT ON TABLE commerce_order_items IS
    'Line items with optional DPP linkage. product_id ties an external SKU back to the Trackbliss product passport.';

COMMENT ON TABLE commerce_sync_events IS
    'Audit trail for every sync run, webhook delivery, and DPP match attempt.';
