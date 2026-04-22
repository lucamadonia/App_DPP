-- Packaging-Typen: Kartons, Pakete, Tüten mit Tara-Gewicht und Innenmaßen.
-- Werden Shipments zugeordnet, damit das DHL-Label das Gesamt-Gewicht inkl.
-- Verpackung bekommt, und damit ein Auto-Vorschlag anhand der Produktmaße
-- möglich ist.

CREATE TABLE IF NOT EXISTS wh_packaging_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Karton-Maße innen (cm)
  inner_length_cm NUMERIC(8,2),
  inner_width_cm NUMERIC(8,2),
  inner_height_cm NUMERIC(8,2),
  -- Tara-Gewicht (leeres Packaging in Gramm)
  tare_weight_grams INTEGER NOT NULL DEFAULT 0,
  -- Max Füllgewicht (optional, für Safety-Check)
  max_load_grams INTEGER,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_packaging_types_tenant
  ON wh_packaging_types (tenant_id) WHERE is_active = true;

ALTER TABLE wh_packaging_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_packaging_types_select" ON wh_packaging_types FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "wh_packaging_types_insert" ON wh_packaging_types FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "wh_packaging_types_update" ON wh_packaging_types FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "wh_packaging_types_delete" ON wh_packaging_types FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

-- updated_at trigger
CREATE OR REPLACE TRIGGER set_wh_packaging_types_updated_at
  BEFORE UPDATE ON wh_packaging_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Shipment bekommt optionales Packaging
ALTER TABLE wh_shipments
  ADD COLUMN IF NOT EXISTS packaging_type_id UUID REFERENCES wh_packaging_types(id) ON DELETE SET NULL;
