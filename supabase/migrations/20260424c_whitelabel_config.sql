-- ============================================
-- Whitelabeling + Subdomain + Custom Domain + Custom SMTP
-- ============================================

-- 1. tenants: subdomain, custom domain, whitelabel config
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS subdomain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dns_verification_token TEXT,
  ADD COLUMN IF NOT EXISTS whitelabel_config JSONB DEFAULT '{}'::jsonb;

-- Slug-format enforcement for subdomain (lowercase letters, digits, hyphens,
-- 3..32 chars, no leading/trailing hyphen)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_subdomain_format'
  ) THEN
    ALTER TABLE tenants
      ADD CONSTRAINT tenants_subdomain_format
        CHECK (subdomain IS NULL OR subdomain ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdomain_unique
  ON tenants (subdomain) WHERE subdomain IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_custom_domain_unique
  ON tenants (LOWER(custom_domain)) WHERE custom_domain IS NOT NULL;

-- 2. tenant_smtp_config: per-tenant SMTP credentials
CREATE TABLE IF NOT EXISTS tenant_smtp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  host TEXT,
  port INT DEFAULT 465,
  username TEXT,
  password_encrypted TEXT,
  from_address TEXT,
  from_name TEXT,
  use_tls BOOLEAN DEFAULT TRUE,
  last_tested_at TIMESTAMPTZ,
  last_test_result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE tenant_smtp_config ENABLE ROW LEVEL SECURITY;

-- Super-admins can read everything
CREATE POLICY "smtp_select_super_admin" ON tenant_smtp_config FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- Super-admins can manage
CREATE POLICY "smtp_all_super_admin" ON tenant_smtp_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- Tenant admins can read (but not password) via view
CREATE OR REPLACE VIEW tenant_smtp_config_masked AS
  SELECT
    id,
    tenant_id,
    enabled,
    host,
    port,
    username,
    NULL::text AS password_encrypted,
    CASE WHEN password_encrypted IS NOT NULL THEN '****' ELSE NULL END AS password_hint,
    from_address,
    from_name,
    use_tls,
    last_tested_at,
    last_test_result,
    created_at,
    updated_at
  FROM tenant_smtp_config
  WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid());

GRANT SELECT ON tenant_smtp_config_masked TO authenticated;

-- 3. Helper: resolve tenant by host (subdomain or custom domain)
CREATE OR REPLACE FUNCTION resolve_tenant_by_host(p_host TEXT)
  RETURNS TABLE (tenant_id UUID, tenant_name TEXT, whitelabel_config JSONB) AS $$
DECLARE
  v_host TEXT := LOWER(TRIM(p_host));
  v_subdomain TEXT;
BEGIN
  -- 1. Exact match on custom_domain (verified)
  RETURN QUERY
    SELECT t.id, t.name, COALESCE(t.whitelabel_config, '{}'::jsonb)
      FROM tenants t
      WHERE LOWER(t.custom_domain) = v_host
        AND t.custom_domain_verified = true
        AND t.status = 'active'
      LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- 2. Subdomain on trackbliss.eu
  IF v_host LIKE '%.trackbliss.eu' THEN
    v_subdomain := SPLIT_PART(v_host, '.', 1);
    RETURN QUERY
      SELECT t.id, t.name, COALESCE(t.whitelabel_config, '{}'::jsonb)
        FROM tenants t
        WHERE t.subdomain = v_subdomain
          AND t.status = 'active'
        LIMIT 1;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
