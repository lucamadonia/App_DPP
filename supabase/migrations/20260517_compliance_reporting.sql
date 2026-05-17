-- =====================================================================
-- Compliance Reporting: EAR (ElektroG) + LUCID (VerpackG)
-- =====================================================================
-- Adds infrastructure for the two German monthly compliance reports that
-- tenants selling electronics + shipping packaged goods must file by the
-- 15th of every month:
--
--   1. EAR / Stiftung Elektro-Altgeräte-Register
--      Units placed on market per device category (1-6).
--
--   2. LUCID / Zentrale Stelle Verpackungsregister
--      Weight of packaging material placed on market per material class.
--
-- Extends the existing data model (products + wh_packaging_types) with the
-- per-item classification needed for aggregation, adds a tenant-scoped
-- archive table for submitted reports + audit log, and seeds the official
-- EAR category lookup.
-- =====================================================================

-- =====================================================================
-- 1) Products: per-item EAR classification
-- =====================================================================
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_electronic BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ear_category SMALLINT
    CHECK (ear_category IS NULL OR ear_category BETWEEN 1 AND 6),
  ADD COLUMN IF NOT EXISTS ear_device_type TEXT,
  ADD COLUMN IF NOT EXISTS ear_brand TEXT,
  ADD COLUMN IF NOT EXISTS ear_includes_battery BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ear_battery_weight_grams INTEGER
    CHECK (ear_battery_weight_grams IS NULL OR ear_battery_weight_grams >= 0),
  ADD COLUMN IF NOT EXISTS ear_b2b BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_products_electronic
  ON products(tenant_id, is_electronic)
  WHERE is_electronic = TRUE;

CREATE INDEX IF NOT EXISTS idx_products_ear_category
  ON products(tenant_id, ear_category)
  WHERE ear_category IS NOT NULL;

-- =====================================================================
-- 2) Packaging types: LUCID material classification + composite split
-- =====================================================================
ALTER TABLE wh_packaging_types
  ADD COLUMN IF NOT EXISTS primary_material TEXT
    CHECK (primary_material IS NULL OR primary_material IN (
      'paper','plastic','glass','aluminum','steel','composite','wood','other'
    )),
  ADD COLUMN IF NOT EXISTS material_split JSONB;
-- material_split shape (when set):
--   [{"material":"paper","weight_grams":240},{"material":"plastic","weight_grams":10}]
-- When null: full tare_weight_grams attributed to primary_material.

CREATE INDEX IF NOT EXISTS idx_wh_packaging_types_material
  ON wh_packaging_types(tenant_id, primary_material)
  WHERE primary_material IS NOT NULL;

-- =====================================================================
-- 3) EAR categories lookup (global, no RLS — same pattern as countries)
-- =====================================================================
CREATE TABLE IF NOT EXISTS ear_categories (
  id              SMALLINT PRIMARY KEY,
  name_de         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_de  TEXT,
  description_en  TEXT,
  examples_de     TEXT[] DEFAULT ARRAY[]::TEXT[],
  examples_en     TEXT[] DEFAULT ARRAY[]::TEXT[]
);

INSERT INTO ear_categories (id, name_de, name_en, description_de, description_en, examples_de, examples_en)
VALUES
  (1, 'Wärmeüberträger', 'Temperature exchange equipment',
      'Geräte zur Wärme-/Kälteübertragung — Kühl, Klima, Wärmepumpen',
      'Heat/cold exchange devices — refrigeration, AC, heat pumps',
      ARRAY['Kühlschrank','Gefriergerät','Klimagerät','Wärmepumpe','Entfeuchter'],
      ARRAY['Refrigerator','Freezer','Air conditioner','Heat pump','Dehumidifier']),
  (2, 'Bildschirme & Monitore', 'Screens & Monitors',
      'Bildschirme und Geräte mit Bildschirmen größer 100 cm²',
      'Screens and devices with screens larger than 100 cm²',
      ARRAY['Fernseher','Monitor','Laptop','Tablet','Bilderrahmen'],
      ARRAY['TV','Monitor','Laptop','Tablet','Photo frame']),
  (3, 'Lampen', 'Lamps',
      'Leuchtstofflampen, LED, Hochdruckdampflampen, Natriumdampflampen',
      'Fluorescent, LED, high-pressure sodium and vapor lamps',
      ARRAY['LED-Lampe','Leuchtstoffröhre','Energiesparlampe','Halogenlampe'],
      ARRAY['LED bulb','Fluorescent tube','Energy-saving lamp','Halogen lamp']),
  (4, 'Großgeräte', 'Large equipment',
      'Geräte mit Außenmaß größer 50 cm (Nicht-IT, Nicht-Bildschirm, Nicht-Wärme)',
      'Devices with external dimension greater than 50 cm (non-IT, non-screen, non-thermal)',
      ARRAY['Waschmaschine','Backofen','Geschirrspüler','Wäschetrockner','Heizkörper'],
      ARRAY['Washing machine','Oven','Dishwasher','Tumble dryer','Radiator']),
  (5, 'Kleingeräte', 'Small equipment',
      'Geräte mit Außenmaß bis 50 cm (Nicht-IT, Nicht-Bildschirm, Nicht-Wärme)',
      'Devices with external dimension up to 50 cm (non-IT, non-screen, non-thermal)',
      ARRAY['Wasserkocher','Föhn','Toaster','Rasierer','Bohrmaschine','Spielzeug'],
      ARRAY['Kettle','Hair dryer','Toaster','Shaver','Drill','Toy']),
  (6, 'IT- und Telekommunikationsgeräte', 'Small IT & telecommunications',
      'IT- und Telekommunikationsgeräte mit Außenmaß bis 50 cm',
      'IT and telecom equipment with external dimension up to 50 cm',
      ARRAY['Smartphone','Router','Drucker','Tastatur','Maus','Festplatte'],
      ARRAY['Smartphone','Router','Printer','Keyboard','Mouse','Hard drive'])
ON CONFLICT (id) DO UPDATE SET
  name_de = EXCLUDED.name_de,
  name_en = EXCLUDED.name_en,
  description_de = EXCLUDED.description_de,
  description_en = EXCLUDED.description_en,
  examples_de = EXCLUDED.examples_de,
  examples_en = EXCLUDED.examples_en;

-- =====================================================================
-- 4) Monthly report archive
-- =====================================================================
CREATE TABLE IF NOT EXISTS compliance_monthly_reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_type         TEXT NOT NULL CHECK (report_type IN ('ear','lucid')),
  report_month        DATE NOT NULL,        -- 1st of the reported month
  status              TEXT NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','submitted','confirmed','rejected','obsolete')),
  generated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at        TIMESTAMPTZ,
  submitted_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmed_at        TIMESTAMPTZ,
  external_reference  TEXT,                  -- EAR-AR-Nr or ZSVR-Submission-ID
  summary             JSONB NOT NULL,        -- aggregated rows + snapshot
  shipment_ids        UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  product_ids         UUID[] DEFAULT ARRAY[]::UUID[],
  packaging_type_ids  UUID[] DEFAULT ARRAY[]::UUID[],
  csv_storage_path    TEXT,                  -- compliance-reports/{tenant}/{id}.csv
  pdf_storage_path    TEXT,                  -- compliance-reports/{tenant}/{id}.pdf
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, report_type, report_month)
);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_tenant_month
  ON compliance_monthly_reports(tenant_id, report_month DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_reports_status
  ON compliance_monthly_reports(tenant_id, status);

-- =====================================================================
-- 5) Audit log
-- =====================================================================
CREATE TABLE IF NOT EXISTS compliance_audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_id     UUID REFERENCES compliance_monthly_reports(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  performed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  details       JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_tenant
  ON compliance_audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_report
  ON compliance_audit_log(report_id, created_at);

-- =====================================================================
-- Updated_at trigger
-- =====================================================================
CREATE OR REPLACE FUNCTION compliance_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_compliance_reports_updated ON compliance_monthly_reports;
CREATE TRIGGER trg_compliance_reports_updated
  BEFORE UPDATE ON compliance_monthly_reports
  FOR EACH ROW EXECUTE FUNCTION compliance_set_updated_at();

-- =====================================================================
-- RLS
-- =====================================================================
ALTER TABLE compliance_monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_audit_log       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_reports_select" ON compliance_monthly_reports;
CREATE POLICY "compliance_reports_select"
  ON compliance_monthly_reports FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "compliance_reports_insert" ON compliance_monthly_reports;
CREATE POLICY "compliance_reports_insert"
  ON compliance_monthly_reports FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "compliance_reports_update" ON compliance_monthly_reports;
CREATE POLICY "compliance_reports_update"
  ON compliance_monthly_reports FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "compliance_reports_delete" ON compliance_monthly_reports;
CREATE POLICY "compliance_reports_delete"
  ON compliance_monthly_reports FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "compliance_audit_select" ON compliance_audit_log;
CREATE POLICY "compliance_audit_select"
  ON compliance_audit_log FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "compliance_audit_insert" ON compliance_audit_log;
CREATE POLICY "compliance_audit_insert"
  ON compliance_audit_log FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
-- No UPDATE/DELETE on audit log — append-only.

-- =====================================================================
-- Storage bucket for archived PDFs + CSVs (10-year HGB retention)
-- =====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance-reports',
  'compliance-reports',
  FALSE,         -- private bucket — accessed via signed URLs only
  10485760,      -- 10 MB
  ARRAY['application/pdf','text/csv','text/plain']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "compliance_reports_storage_read" ON storage.objects;
CREATE POLICY "compliance_reports_storage_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'compliance-reports');

DROP POLICY IF EXISTS "compliance_reports_storage_write" ON storage.objects;
CREATE POLICY "compliance_reports_storage_write"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'compliance-reports')
  WITH CHECK (bucket_id = 'compliance-reports');

COMMENT ON TABLE compliance_monthly_reports IS
  'EAR (Stiftung Elektro-Altgeräte-Register) and LUCID (Zentrale Stelle Verpackungsregister) monthly reports — 10-year HGB retention.';
COMMENT ON TABLE compliance_audit_log IS
  'Append-only audit trail for every compliance-report state change.';
