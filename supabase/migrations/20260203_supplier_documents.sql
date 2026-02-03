-- Add supplier_id FK to documents table (nullable, same pattern as product_id)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_supplier ON documents(supplier_id) WHERE supplier_id IS NOT NULL;
