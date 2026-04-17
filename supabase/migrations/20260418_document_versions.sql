-- Dokumentenversionierung: archiviert jeden Upload als eigene Version-Zeile.
-- Die documents-Zeile repräsentiert weiterhin die aktuelle Version; document_versions
-- ist die Historie (inkl. v1 per Backfill). Idempotent anwendbar.
CREATE TABLE IF NOT EXISTS document_versions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT,
  size TEXT,
  type TEXT CHECK (type IN ('pdf','image','other')),
  valid_until DATE,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID REFERENCES auth.users(id),
  change_note TEXT,
  ai_classification JSONB,
  ai_confidence NUMERIC(3,2),
  ai_model TEXT,
  UNIQUE (document_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_document_versions_document
  ON document_versions(document_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_tenant
  ON document_versions(tenant_id);

ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view document versions in their tenant" ON document_versions;
CREATE POLICY "Users view document versions in their tenant" ON document_versions
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Editors manage document versions in their tenant" ON document_versions;
CREATE POLICY "Editors manage document versions in their tenant" ON document_versions
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin','editor')
  );

-- Backfill: pro existierendem Dokument eine v1-Zeile mit dem aktuellen Stand
INSERT INTO document_versions (
  tenant_id, document_id, version_number, file_name, storage_path, size, type,
  valid_until, uploaded_at, uploaded_by, ai_classification, ai_confidence, ai_model
)
SELECT
  d.tenant_id, d.id, 1, d.name, d.storage_path, d.size, d.type,
  d.valid_until, d.uploaded_at, d.uploaded_by, d.ai_classification, d.ai_confidence, d.ai_model
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM document_versions v WHERE v.document_id = d.id
);
