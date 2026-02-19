-- ============================================================
-- Tenant Pictogram Database
-- Per-tenant pictogram storage with file upload support
-- ============================================================

-- Table
CREATE TABLE IF NOT EXISTS tenant_pictograms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT 'custom',
  regulation_year TEXT DEFAULT '',
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('svg', 'png', 'jpg', 'jpeg')),
  file_size INTEGER NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenant_pictograms_tenant ON tenant_pictograms(tenant_id);
CREATE INDEX idx_tenant_pictograms_category ON tenant_pictograms(tenant_id, category);
CREATE INDEX idx_tenant_pictograms_regulation ON tenant_pictograms(tenant_id, regulation_year);

-- RLS
ALTER TABLE tenant_pictograms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tenant pictograms"
  ON tenant_pictograms FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own tenant pictograms"
  ON tenant_pictograms FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant pictograms"
  ON tenant_pictograms FOR UPDATE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete own tenant pictograms"
  ON tenant_pictograms FOR DELETE
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('pictograms', 'pictograms', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "Tenant pictogram upload" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pictograms'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant pictogram read" ON storage.objects FOR SELECT
  USING (bucket_id = 'pictograms');

CREATE POLICY "Tenant pictogram delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pictograms'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
  );
