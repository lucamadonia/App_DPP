-- Credentials are isolated from tenant settings.  Only service-role edge
-- functions may read this table; no authenticated RLS policies are defined.
CREATE TABLE IF NOT EXISTS commerce_connection_credentials (
  connection_id UUID PRIMARY KEY REFERENCES commerce_channel_connections(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE commerce_connection_credentials ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cc_credentials_tenant ON commerce_connection_credentials(tenant_id);

CREATE OR REPLACE TRIGGER set_cc_credentials_updated_at
  BEFORE UPDATE ON commerce_connection_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
