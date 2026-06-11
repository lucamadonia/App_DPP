-- ================================================================
-- Carrier Integrations Hub (Phase 1)
-- Migration: 20260612_wh_carrier_integrations.sql
--
-- One row per (tenant, carrier) connection. Stores connection status
-- and non-sensitive settings only (account references, preferences).
-- API credentials NEVER live here — DHL credentials stay server-side
-- in tenants.settings.warehouse.dhl, managed by the dhl-shipping
-- Edge Function. Future label-capable carriers follow the same rule.
-- ================================================================

CREATE TABLE IF NOT EXISTS wh_carrier_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  carrier_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'connected', 'error')),
  -- Non-secret settings only (account references, display preferences).
  settings JSONB NOT NULL DEFAULT '{}',
  -- Human-readable account reference shown in the UI (e.g. customer number).
  account_hint TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, carrier_id)
);

COMMENT ON TABLE wh_carrier_integrations
  IS 'Per-tenant carrier connections for the Integrations Hub. settings JSONB must never contain API keys, passwords or tokens.';
COMMENT ON COLUMN wh_carrier_integrations.settings
  IS 'Non-sensitive settings only — no secrets. Credentials for label-capable carriers are stored server-side (Edge Function).';

CREATE INDEX IF NOT EXISTS idx_wh_carrier_integrations_tenant
  ON wh_carrier_integrations (tenant_id);

ALTER TABLE wh_carrier_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_carrier_integrations_select" ON wh_carrier_integrations FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "wh_carrier_integrations_insert" ON wh_carrier_integrations FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "wh_carrier_integrations_update" ON wh_carrier_integrations FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "wh_carrier_integrations_delete" ON wh_carrier_integrations FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

-- updated_at trigger (shared helper function, same as other wh_ tables)
CREATE OR REPLACE TRIGGER set_wh_carrier_integrations_updated_at
  BEFORE UPDATE ON wh_carrier_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
