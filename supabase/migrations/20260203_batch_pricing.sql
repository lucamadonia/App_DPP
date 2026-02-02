-- Add pricing and supplier fields to product_batches
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS price_per_unit NUMERIC;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_batches_supplier ON product_batches(supplier_id) WHERE supplier_id IS NOT NULL;
