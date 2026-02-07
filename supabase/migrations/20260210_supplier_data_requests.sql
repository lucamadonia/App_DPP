-- Supplier Data Requests Table
-- Allows admins to create password-protected data collection requests for suppliers
-- Suppliers can fill in product/batch data via a public portal

CREATE TABLE IF NOT EXISTS supplier_data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  access_code text NOT NULL DEFAULT gen_random_uuid()::text,
  password_hash text NOT NULL,
  allowed_product_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  allowed_batch_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  allow_batch_create boolean NOT NULL DEFAULT false,
  allow_batch_edit boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'expired', 'cancelled')),
  message text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  submitted_at timestamptz,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_supplier_data_requests_access_code ON supplier_data_requests(access_code);
CREATE INDEX idx_supplier_data_requests_tenant_id ON supplier_data_requests(tenant_id);
CREATE INDEX idx_supplier_data_requests_product_id ON supplier_data_requests(product_id);
CREATE INDEX idx_supplier_data_requests_status ON supplier_data_requests(status);
CREATE INDEX idx_supplier_data_requests_expires_at ON supplier_data_requests(expires_at);

-- Enable RLS
ALTER TABLE supplier_data_requests ENABLE ROW LEVEL SECURITY;

-- Authenticated: tenant-scoped CRUD
CREATE POLICY "Admins can view data requests for their tenant"
  ON supplier_data_requests FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can create data requests for their tenant"
  ON supplier_data_requests FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update data requests for their tenant"
  ON supplier_data_requests FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can delete data requests for their tenant"
  ON supplier_data_requests FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Public (anon): SELECT by access_code for portal access
CREATE POLICY "Public can view data requests by access code"
  ON supplier_data_requests FOR SELECT
  USING (true);

-- Public (anon): UPDATE status to in_progress/submitted
CREATE POLICY "Public can update data request status"
  ON supplier_data_requests FOR UPDATE
  USING (true)
  WITH CHECK (status IN ('in_progress', 'submitted'));

-- Anon product UPDATE policy: only products with an active data request
CREATE POLICY "Supplier data portal can update products"
  ON products FOR UPDATE
  USING (
    id IN (
      SELECT product_id FROM supplier_data_requests
      WHERE status IN ('pending', 'in_progress')
        AND expires_at > now()
    )
  );

-- Anon batch SELECT: scoped to products with active data requests
CREATE POLICY "Supplier data portal can view batches"
  ON product_batches FOR SELECT
  USING (
    product_id IN (
      SELECT product_id FROM supplier_data_requests
      WHERE status IN ('pending', 'in_progress')
        AND expires_at > now()
    )
  );

-- Anon batch INSERT: only if allow_batch_create is true
CREATE POLICY "Supplier data portal can create batches"
  ON product_batches FOR INSERT
  WITH CHECK (
    product_id IN (
      SELECT product_id FROM supplier_data_requests
      WHERE status IN ('pending', 'in_progress')
        AND expires_at > now()
        AND allow_batch_create = true
    )
  );

-- Anon batch UPDATE: only if allow_batch_edit is true
CREATE POLICY "Supplier data portal can update batches"
  ON product_batches FOR UPDATE
  USING (
    product_id IN (
      SELECT product_id FROM supplier_data_requests
      WHERE status IN ('pending', 'in_progress')
        AND expires_at > now()
        AND allow_batch_edit = true
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_supplier_data_request_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_supplier_data_requests_updated_at
  BEFORE UPDATE ON supplier_data_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_data_request_updated_at();

-- Comments
COMMENT ON TABLE supplier_data_requests IS 'Password-protected data collection requests for suppliers to fill in product/batch data';
COMMENT ON COLUMN supplier_data_requests.access_code IS 'UUID-based code used in public portal URL';
COMMENT ON COLUMN supplier_data_requests.password_hash IS 'SHA-256 hex hash of the access password';
COMMENT ON COLUMN supplier_data_requests.allowed_product_fields IS 'JSON array of product field keys the supplier can edit';
COMMENT ON COLUMN supplier_data_requests.allowed_batch_fields IS 'JSON array of batch field keys the supplier can edit';
