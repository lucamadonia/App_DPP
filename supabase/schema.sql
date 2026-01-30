-- ============================================
-- DPP Manager - Supabase Database Schema
-- ============================================
-- Dieses Schema erstellt alle 17 Tabellen für die DPP Manager App
-- Führen Sie dieses SQL in Ihrem Supabase SQL Editor aus
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MASTER-DATEN (ohne RLS - für alle lesbar)
-- ============================================

-- Produktkategorien
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    regulations TEXT[],
    sort_order INTEGER,
    subcategories TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Länder
CREATE TABLE IF NOT EXISTS countries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    flag TEXT NOT NULL,
    regulations INTEGER DEFAULT 0,
    checklists INTEGER DEFAULT 0,
    authorities TEXT[] DEFAULT '{}',
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EU-Regulierungen
CREATE TABLE IF NOT EXISTS eu_regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('environment', 'chemicals', 'recycling', 'safety', 'energy')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'upcoming')),
    effective_date DATE NOT NULL,
    application_date DATE NOT NULL,
    key_requirements TEXT[] DEFAULT '{}',
    affected_products TEXT[] DEFAULT '{}',
    dpp_deadlines JSONB DEFAULT '{}',
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nationale Regulierungen
CREATE TABLE IF NOT EXISTS national_regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code TEXT NOT NULL REFERENCES countries(code),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    mandatory BOOLEAN DEFAULT true,
    effective_date DATE NOT NULL,
    authority TEXT NOT NULL,
    penalties TEXT DEFAULT '',
    products TEXT[] DEFAULT '{}',
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Piktogramme
CREATE TABLE IF NOT EXISTS pictograms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    mandatory BOOLEAN DEFAULT false,
    countries TEXT[] DEFAULT '{}',
    category TEXT NOT NULL CHECK (category IN ('safety', 'recycling', 'chemicals', 'energy', 'durability')),
    dimensions TEXT DEFAULT '',
    placement TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recycling-Codes
CREATE TABLE IF NOT EXISTS recycling_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    examples TEXT DEFAULT '',
    recyclable BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist-Templates
CREATE TABLE IF NOT EXISTS checklist_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    country_code TEXT NOT NULL,
    category_key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    detailed_description TEXT,
    mandatory BOOLEAN DEFAULT true,
    category TEXT NOT NULL,
    subcategory TEXT,
    document_required BOOLEAN DEFAULT false,
    document_types TEXT[],
    legal_basis TEXT,
    authority TEXT,
    deadline TEXT,
    penalties TEXT,
    tips TEXT[],
    links JSONB,
    applicable_products TEXT[],
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    sort_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- News
CREATE TABLE IF NOT EXISTS news_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('regulation', 'deadline', 'update', 'warning')),
    countries TEXT[] DEFAULT '{}',
    published_at TIMESTAMPTZ DEFAULT NOW(),
    effective_date DATE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    tags TEXT[] DEFAULT '{}',
    link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TENANT-DATEN (mit RLS)
-- ============================================

-- Tenants (Mandanten/Organisationen)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo TEXT,
    address TEXT,
    country TEXT,
    eori TEXT,
    vat TEXT,
    settings JSONB,
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (verknüpft mit auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Produkte
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    manufacturer TEXT NOT NULL,
    gtin TEXT NOT NULL,
    serial_number TEXT NOT NULL,
    production_date DATE NOT NULL,
    expiration_date DATE,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    materials JSONB DEFAULT '[]',
    certifications JSONB DEFAULT '[]',
    carbon_footprint JSONB,
    recyclability JSONB DEFAULT '{"recyclablePercentage": 0, "instructions": "", "disposalMethods": []}',
    image_url TEXT,
    hs_code TEXT,
    batch_number TEXT,
    country_of_origin TEXT,
    net_weight NUMERIC,
    gross_weight NUMERIC,
    manufacturer_address TEXT,
    manufacturer_eori TEXT,
    manufacturer_vat TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(gtin, serial_number)
);

-- Product Batches (Chargen)
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number TEXT,
    serial_number TEXT NOT NULL,
    production_date DATE NOT NULL,
    expiration_date DATE,
    net_weight NUMERIC,
    gross_weight NUMERIC,
    quantity INTEGER,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
    notes TEXT,
    -- Override fields (NULL = inherit from product master data)
    materials_override JSONB,
    certifications_override JSONB,
    carbon_footprint_override JSONB,
    recyclability_override JSONB,
    description_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, product_id, serial_number)
);

-- Dokumente
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('pdf', 'image', 'other')),
    category TEXT NOT NULL,
    storage_path TEXT,
    url TEXT,
    size TEXT,
    valid_until DATE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    uploaded_by UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'expiring', 'expired'))
);

-- Supply Chain Entries
CREATE TABLE IF NOT EXISTS supply_chain_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    step INTEGER NOT NULL,
    location TEXT NOT NULL,
    country TEXT NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    supplier TEXT,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
    verified BOOLEAN DEFAULT false,
    coordinates TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist Progress
CREATE TABLE IF NOT EXISTS checklist_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    checklist_item_id TEXT NOT NULL,
    checked BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'not_applicable')),
    notes TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(tenant_id, product_id, checklist_item_id)
);

-- Lieferanten
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    legal_form TEXT,
    contact_person TEXT,
    contact_position TEXT,
    email TEXT,
    phone TEXT,
    mobile TEXT,
    fax TEXT,
    additional_contacts JSONB,
    website TEXT,
    linkedin TEXT,
    address TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    country TEXT NOT NULL,
    postal_code TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_country TEXT,
    shipping_postal_code TEXT,
    tax_id TEXT,
    vat_id TEXT,
    duns_number TEXT,
    registration_number TEXT,
    bank_name TEXT,
    iban TEXT,
    bic TEXT,
    payment_terms TEXT,
    risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
    quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
    delivery_rating INTEGER CHECK (delivery_rating BETWEEN 1 AND 5),
    verified BOOLEAN DEFAULT false,
    verification_date DATE,
    verified_by UUID REFERENCES auth.users(id),
    certifications TEXT[],
    audit_date DATE,
    next_audit_date DATE,
    compliance_status TEXT CHECK (compliance_status IN ('compliant', 'pending', 'non_compliant')),
    supplier_type TEXT CHECK (supplier_type IN ('manufacturer', 'wholesaler', 'distributor', 'service_provider')),
    industry TEXT,
    product_categories TEXT[],
    contract_start DATE,
    contract_end DATE,
    min_order_value NUMERIC,
    currency TEXT,
    notes TEXT,
    internal_notes TEXT,
    tags TEXT[],
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'pending_approval')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id)
);

-- Supplier-Product Zuordnung
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('manufacturer', 'importeur', 'component', 'raw_material', 'packaging', 'logistics')),
    is_primary BOOLEAN DEFAULT false,
    lead_time_days INTEGER,
    price_per_unit NUMERIC,
    currency TEXT,
    min_order_quantity INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(supplier_id, product_id, role)
);

-- Visibility Settings (DPP Sichtbarkeitseinstellungen)
CREATE TABLE IF NOT EXISTS visibility_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 2,
    fields JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, product_id)
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_gtin ON products(gtin);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_batches_tenant ON product_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON product_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_serial_number ON product_batches(serial_number);
CREATE INDEX IF NOT EXISTS idx_batches_product_serial ON product_batches(product_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_product ON documents(product_id);
CREATE INDEX IF NOT EXISTS idx_documents_batch ON documents(batch_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_product ON supply_chain_entries(product_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_batch ON supply_chain_entries(batch_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_supplier ON supply_chain_entries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_checklist_progress_tenant ON checklist_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_national_regulations_country ON national_regulations(country_code);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on tenant-specific tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE visibility_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's tenant_id
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT tenant_id FROM profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their tenant"
    ON profiles FOR SELECT
    USING (tenant_id = get_user_tenant_id());

-- Tenants policies
CREATE POLICY "Users can view their tenant"
    ON tenants FOR SELECT
    USING (id = get_user_tenant_id());

CREATE POLICY "Admins can update their tenant"
    ON tenants FOR UPDATE
    USING (
        id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Products policies
CREATE POLICY "Users can view products in their tenant"
    ON products FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Public can view products by GTIN for DPP"
    ON products FOR SELECT
    USING (true);  -- Allow public access for DPP viewing

CREATE POLICY "Editors can create products"
    ON products FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Editors can update products"
    ON products FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Admins can delete products"
    ON products FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Product batches policies
CREATE POLICY "Users can view batches in their tenant"
    ON product_batches FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Public can view batches for DPP"
    ON product_batches FOR SELECT
    USING (true);

CREATE POLICY "Editors can create batches"
    ON product_batches FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Editors can update batches"
    ON product_batches FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Admins can delete batches"
    ON product_batches FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Documents policies
CREATE POLICY "Users can view documents in their tenant"
    ON documents FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Editors can manage documents"
    ON documents FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

-- Supply chain policies
CREATE POLICY "Users can view supply chain in their tenant"
    ON supply_chain_entries FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Public can view supply chain for DPP"
    ON supply_chain_entries FOR SELECT
    USING (true);

CREATE POLICY "Editors can manage supply chain"
    ON supply_chain_entries FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

-- Checklist progress policies
CREATE POLICY "Users can view checklist progress in their tenant"
    ON checklist_progress FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Editors can manage checklist progress"
    ON checklist_progress FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

-- Suppliers policies
CREATE POLICY "Users can view suppliers in their tenant"
    ON suppliers FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Editors can manage suppliers"
    ON suppliers FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

-- Supplier products policies
CREATE POLICY "Users can view supplier products in their tenant"
    ON supplier_products FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Editors can manage supplier products"
    ON supplier_products FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

-- Visibility settings policies
CREATE POLICY "Users can view visibility settings in their tenant"
    ON visibility_settings FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Editors can manage visibility settings"
    ON visibility_settings FOR ALL
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER product_batches_updated_at
    BEFORE UPDATE ON product_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER visibility_settings_updated_at
    BEFORE UPDATE ON visibility_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
BEGIN
    -- Create a new tenant for the user
    INSERT INTO tenants (name, slug)
    VALUES (
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), ' ', '-')) || '-' || SUBSTRING(NEW.id::TEXT, 1, 8)
    )
    RETURNING id INTO new_tenant_id;

    -- Create profile for the user
    INSERT INTO profiles (id, tenant_id, email, name, role)
    VALUES (
        NEW.id,
        new_tenant_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
        'admin'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Run these in a separate query or via Supabase Dashboard

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('documents', 'documents', false);

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('product-images', 'product-images', true);

-- Storage policies would go here but need to be run separately

-- ============================================
-- DATA MIGRATION: Products -> Product Batches
-- ============================================
-- Run this AFTER the schema above is applied.
-- Creates one batch per existing product, migrating batch-specific fields.
-- Existing products keep their columns temporarily for backwards compatibility.

-- INSERT INTO product_batches (tenant_id, product_id, batch_number, serial_number, production_date, expiration_date, net_weight, gross_weight, status)
-- SELECT
--     tenant_id,
--     id,
--     batch_number,
--     serial_number,
--     production_date,
--     expiration_date,
--     net_weight,
--     gross_weight,
--     COALESCE(status, 'draft')
-- FROM products
-- WHERE serial_number IS NOT NULL AND serial_number != '';

-- Migrate document references to batch_id:
-- UPDATE documents d
-- SET batch_id = pb.id
-- FROM product_batches pb
-- WHERE d.product_id = pb.product_id;

-- Migrate supply chain references to batch_id:
-- UPDATE supply_chain_entries sc
-- SET batch_id = pb.id
-- FROM product_batches pb
-- WHERE sc.product_id = pb.product_id;
