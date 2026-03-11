-- ============================================
-- Transparency Page Configuration
-- ============================================
-- Allows tenants to configure which products appear on
-- the public transparency page (fambliss.de/eu /transparency)

CREATE TABLE IF NOT EXISTS transparency_page_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  page_title TEXT DEFAULT NULL,
  page_description TEXT DEFAULT NULL,
  hero_image_url TEXT DEFAULT NULL,
  -- Array of { product_id, enabled } in display order
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_transparency_page_config_tenant
  ON transparency_page_config(tenant_id);

-- RLS
ALTER TABLE transparency_page_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY transparency_page_config_select ON transparency_page_config
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY transparency_page_config_insert ON transparency_page_config
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY transparency_page_config_update ON transparency_page_config
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY transparency_page_config_delete ON transparency_page_config
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
