-- Benutzerdefinierte Ordner für Dokumente
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES document_folders(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation" ON document_folders
  FOR ALL USING (tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  ));

CREATE INDEX idx_document_folders_tenant ON document_folders(tenant_id);

-- Ordner-FK auf documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES document_folders(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_folder ON documents(folder_id) WHERE folder_id IS NOT NULL;
