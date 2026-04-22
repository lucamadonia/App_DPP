-- ============================================
-- Shopify ↔ DPP Full Bidirectional Integration
-- 2026-04-22
--
-- Adds:
--   1. Shopify-ID + Fulfillment-State columns on wh_shipments
--   2. Shopify-Customer-Link on rh_customers
--   3. Shopify-Order/Refund-Link on rh_returns
--   4. auto_batch flag on shopify_product_map (FEFO resolution)
--   5. metadata JSONB on shopify_sync_log (cursor persistence)
--   6. Indexed tenant lookup by shopDomain
--   7. shopify_webhook_events table (dead-letter + dedup)
-- ============================================

-- 1. wh_shipments — Shopify linkage + fulfillment export state
ALTER TABLE wh_shipments
  ADD COLUMN IF NOT EXISTS shopify_order_id BIGINT,
  ADD COLUMN IF NOT EXISTS shopify_fulfillment_id BIGINT,
  ADD COLUMN IF NOT EXISTS shopify_fulfillment_status TEXT,
  ADD COLUMN IF NOT EXISTS shopify_export_pending BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS shopify_export_attempts INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shopify_export_error TEXT,
  ADD COLUMN IF NOT EXISTS last_fulfillment_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wh_shipments_shopify_order
  ON wh_shipments (tenant_id, shopify_order_id)
  WHERE shopify_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wh_shipments_pending_export
  ON wh_shipments (tenant_id, shopify_export_pending)
  WHERE shopify_export_pending = true;

-- 2. rh_customers — Shopify customer linkage
ALTER TABLE rh_customers
  ADD COLUMN IF NOT EXISTS shopify_customer_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_customers_shopify
  ON rh_customers (tenant_id, shopify_customer_id)
  WHERE shopify_customer_id IS NOT NULL;

-- 3. rh_returns — Shopify order/refund linkage
ALTER TABLE rh_returns
  ADD COLUMN IF NOT EXISTS shopify_order_id BIGINT,
  ADD COLUMN IF NOT EXISTS shopify_refund_id BIGINT,
  ADD COLUMN IF NOT EXISTS last_refund_error TEXT;

CREATE INDEX IF NOT EXISTS idx_rh_returns_shopify_order
  ON rh_returns (tenant_id, shopify_order_id)
  WHERE shopify_order_id IS NOT NULL;

-- 4. shopify_product_map — auto-batch FEFO resolution flag
ALTER TABLE shopify_product_map
  ADD COLUMN IF NOT EXISTS auto_batch BOOLEAN DEFAULT false;

-- 5. shopify_sync_log — cursor/progress metadata
ALTER TABLE shopify_sync_log
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 6. Tenant lookup index (replaces O(n) scan in shopify-webhook)
CREATE INDEX IF NOT EXISTS idx_tenants_shopify_domain
  ON tenants ((settings->'shopifyIntegration'->>'shopDomain'));

-- 7. shopify_webhook_events — dead-letter queue + dedup
CREATE TABLE IF NOT EXISTS shopify_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  topic TEXT NOT NULL,
  shopify_webhook_id TEXT UNIQUE,
  payload JSONB NOT NULL,
  hmac_valid BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processed', 'failed', 'dead_letter')),
  attempts INT DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_status
  ON shopify_webhook_events (tenant_id, status, received_at);

CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_topic
  ON shopify_webhook_events (tenant_id, topic, received_at DESC);

ALTER TABLE shopify_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_webhook_events_select"
  ON shopify_webhook_events FOR SELECT TO authenticated
  USING (tenant_id IN (
    SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()
  ));
-- INSERT/UPDATE stays service-role only (Edge Function uses service role key)
