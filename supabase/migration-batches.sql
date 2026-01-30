-- ============================================
-- MIGRATION: Product Batches System
-- ============================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- This creates the product_batches table, adds batch_id to related tables,
-- sets up indexes/RLS/triggers, and migrates existing product data.
-- All statements are idempotent (safe to re-run).

-- Step 1: Create product_batches table
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
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
    notes TEXT,
    materials_override JSONB,
    certifications_override JSONB,
    carbon_footprint_override JSONB,
    recyclability_override JSONB,
    description_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, product_id, serial_number)
);

-- Step 2: Add batch_id columns to existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'batch_id') THEN
        ALTER TABLE documents ADD COLUMN batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supply_chain_entries' AND column_name = 'batch_id') THEN
        ALTER TABLE supply_chain_entries ADD COLUMN batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 3: Indexes
CREATE INDEX IF NOT EXISTS idx_batches_tenant ON product_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON product_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_serial_number ON product_batches(serial_number);
CREATE INDEX IF NOT EXISTS idx_batches_product_serial ON product_batches(product_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_documents_batch ON documents(batch_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_batch ON supply_chain_entries(batch_id);

-- Step 4: Enable RLS
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist (idempotent)
DROP POLICY IF EXISTS "Users can view batches in their tenant" ON product_batches;
DROP POLICY IF EXISTS "Public can view batches for DPP" ON product_batches;
DROP POLICY IF EXISTS "Editors can create batches" ON product_batches;
DROP POLICY IF EXISTS "Editors can update batches" ON product_batches;
DROP POLICY IF EXISTS "Admins can delete batches" ON product_batches;

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

-- Step 5: Trigger for updated_at
DO $$
BEGIN
    CREATE TRIGGER product_batches_updated_at
        BEFORE UPDATE ON product_batches
        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 6: Migrate existing products into batches
-- Creates one batch per existing product that has a serial_number
INSERT INTO product_batches (tenant_id, product_id, batch_number, serial_number, production_date, expiration_date, net_weight, gross_weight, status)
SELECT
    tenant_id,
    id,
    batch_number,
    serial_number,
    production_date,
    expiration_date,
    net_weight,
    gross_weight,
    COALESCE(status, 'draft')
FROM products
WHERE serial_number IS NOT NULL AND serial_number != ''
ON CONFLICT (tenant_id, product_id, serial_number) DO NOTHING;

-- Step 7: Migrate document references to batch_id
UPDATE documents d
SET batch_id = pb.id
FROM product_batches pb
WHERE d.product_id = pb.product_id
  AND d.batch_id IS NULL;

-- Step 8: Migrate supply chain references to batch_id
UPDATE supply_chain_entries sc
SET batch_id = pb.id
FROM product_batches pb
WHERE sc.product_id = pb.product_id
  AND sc.batch_id IS NULL;

-- Done! Verify:
SELECT 'product_batches created' AS step, count(*) AS rows FROM product_batches
UNION ALL
SELECT 'documents with batch_id', count(*) FROM documents WHERE batch_id IS NOT NULL
UNION ALL
SELECT 'supply_chain with batch_id', count(*) FROM supply_chain_entries WHERE batch_id IS NOT NULL;
