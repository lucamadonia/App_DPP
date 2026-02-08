-- ============================================
-- FEATURE PACK MIGRATION
-- Adds: Product Registrations, Support Resources, Product Images,
--        User Management, Invitations, Activity Log,
--        Expanded News/Regulations/Checklists
-- ============================================

-- === PRODUCT REGISTRATIONS & SUPPORT ===
ALTER TABLE products ADD COLUMN IF NOT EXISTS registrations JSONB DEFAULT '{}';
ALTER TABLE products ADD COLUMN IF NOT EXISTS support_resources JSONB DEFAULT '{}';

-- === PRODUCT IMAGES TABLE ===
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    storage_path TEXT,
    caption TEXT,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_tenant_select" ON product_images
    FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "product_images_tenant_insert" ON product_images
    FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "product_images_tenant_update" ON product_images
    FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "product_images_tenant_delete" ON product_images
    FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Public can view product images for DPP" ON product_images
    FOR SELECT TO public USING (true);

-- === EXPANDED DOCUMENT CATEGORIES ===
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_category_check;

-- === USER MANAGEMENT FIELDS ===
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by UUID;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Add check constraint for status (safe: won't fail if already exists)
DO $$
BEGIN
    ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
        CHECK (status IN ('active', 'inactive', 'pending'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- === INVITATIONS TABLE ===
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'viewer',
    name TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    invited_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(tenant_id, email)
);

DO $$
BEGIN
    ALTER TABLE invitations ADD CONSTRAINT invitations_role_check
        CHECK (role IN ('admin', 'editor', 'viewer'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE invitations ADD CONSTRAINT invitations_status_check
        CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invitations_tenant_select" ON invitations
    FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "invitations_tenant_insert" ON invitations
    FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "invitations_tenant_update" ON invitations
    FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "invitations_tenant_delete" ON invitations
    FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- === ACTIVITY LOG TABLE ===
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant ON activity_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_tenant_select" ON activity_log
    FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "activity_log_tenant_insert" ON activity_log
    FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- === NEWS EXPANSION ===
ALTER TABLE news_items DROP CONSTRAINT IF EXISTS news_items_category_check;
ALTER TABLE news_items ADD CONSTRAINT news_items_category_check
    CHECK (category IN ('regulation','deadline','update','warning','recall','standard','guidance','consultation'));
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE news_items ADD COLUMN IF NOT EXISTS source TEXT;

-- === EU REGULATIONS EXPANSION ===
ALTER TABLE eu_regulations DROP CONSTRAINT IF EXISTS eu_regulations_category_check;
ALTER TABLE eu_regulations ADD CONSTRAINT eu_regulations_category_check
    CHECK (category IN ('environment','chemicals','recycling','safety','energy','sustainability','digital','trade','labeling'));
ALTER TABLE eu_regulations ADD COLUMN IF NOT EXISTS penalties TEXT;
ALTER TABLE eu_regulations ADD COLUMN IF NOT EXISTS enforcement_body TEXT;
ALTER TABLE eu_regulations ADD COLUMN IF NOT EXISTS official_reference TEXT;

-- === CHECKLISTS EXPANSION ===
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS regulation_id UUID;
ALTER TABLE checklist_templates ADD COLUMN IF NOT EXISTS required_document_categories TEXT[];
