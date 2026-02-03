-- Tenant-scoped categories with i18n translations
-- Custom categories are visible only to the creating tenant.
-- Global seed categories (tenant_id = NULL) remain shared.

ALTER TABLE categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS subcategory_translations JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);

-- RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "categories_select" ON categories;
DROP POLICY IF EXISTS "categories_insert" ON categories;
DROP POLICY IF EXISTS "categories_update" ON categories;
DROP POLICY IF EXISTS "categories_delete" ON categories;

-- SELECT: global (NULL) + own tenant
CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (tenant_id IS NULL OR tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- INSERT: only own tenant categories
CREATE POLICY "categories_insert" ON categories FOR INSERT
  WITH CHECK (tenant_id IS NOT NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- UPDATE: only own tenant categories
CREATE POLICY "categories_update" ON categories FOR UPDATE
  USING (tenant_id IS NOT NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- DELETE: only own tenant categories
CREATE POLICY "categories_delete" ON categories FOR DELETE
  USING (tenant_id IS NOT NULL AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
