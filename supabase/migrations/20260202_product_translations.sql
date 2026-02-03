-- Add translations JSONB column for multi-language product content
ALTER TABLE products ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}';

-- Add manufacturer/importer supplier reference fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS importer_supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_manufacturer_supplier ON products(manufacturer_supplier_id) WHERE manufacturer_supplier_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_importer_supplier ON products(importer_supplier_id) WHERE importer_supplier_id IS NOT NULL;
