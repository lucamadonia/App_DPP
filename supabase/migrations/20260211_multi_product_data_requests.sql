-- Multi-Product Supplier Data Requests
-- Allows a single data request to cover multiple products

-- Add product_ids JSONB array column
ALTER TABLE supplier_data_requests
  ADD COLUMN IF NOT EXISTS product_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: copy existing product_id into product_ids
UPDATE supplier_data_requests
SET product_ids = jsonb_build_array(product_id::text)
WHERE product_id IS NOT NULL AND product_ids = '[]'::jsonb;

-- Make product_id nullable (keep for backward compat / index)
ALTER TABLE supplier_data_requests
  ALTER COLUMN product_id DROP NOT NULL;

-- Update RLS: product UPDATE policy — allow any product in the list
DROP POLICY IF EXISTS "Supplier data portal can update products" ON products;
CREATE POLICY "Supplier data portal can update products"
  ON products FOR UPDATE
  USING (
    id::text IN (
      SELECT jsonb_array_elements_text(product_ids) FROM supplier_data_requests
      WHERE status IN ('pending', 'in_progress')
        AND expires_at > now()
    )
  );

-- Update RLS: batch SELECT
DROP POLICY IF EXISTS "Supplier data portal can view batches" ON product_batches;
CREATE POLICY "Supplier data portal can view batches"
  ON product_batches FOR SELECT
  USING (
    product_id::text IN (
      SELECT jsonb_array_elements_text(product_ids) FROM supplier_data_requests
      WHERE status IN ('pending', 'in_progress')
        AND expires_at > now()
    )
  );

-- Update RLS: batch INSERT
DROP POLICY IF EXISTS "Supplier data portal can create batches" ON product_batches;
CREATE POLICY "Supplier data portal can create batches"
  ON product_batches FOR INSERT
  WITH CHECK (
    product_id::text IN (
      SELECT jsonb_array_elements_text(product_ids) FROM supplier_data_requests
      WHERE status IN ('pending', 'in_progress')
        AND expires_at > now()
        AND allow_batch_create = true
    )
  );

-- Update RLS: batch UPDATE
DROP POLICY IF EXISTS "Supplier data portal can update batches" ON product_batches;
CREATE POLICY "Supplier data portal can update batches"
  ON product_batches FOR UPDATE
  USING (
    product_id::text IN (
      SELECT jsonb_array_elements_text(product_ids) FROM supplier_data_requests
      WHERE status IN ('pending', 'in_progress')
        AND expires_at > now()
        AND allow_batch_edit = true
    )
  );

-- Index for JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_supplier_data_requests_product_ids
  ON supplier_data_requests USING gin (product_ids);
