-- Warehouse Phase 1 Overhaul: area_m2, contact types, shipment→contact FK

-- 1. Area (m²) for locations
ALTER TABLE wh_locations ADD COLUMN IF NOT EXISTS area_m2 NUMERIC;

-- 2. Extend contact types: b2b, b2c, supplier, other
ALTER TABLE wh_contacts DROP CONSTRAINT IF EXISTS wh_contacts_type_check;
ALTER TABLE wh_contacts ADD CONSTRAINT wh_contacts_type_check
  CHECK (type IN ('b2b', 'b2c', 'supplier', 'other'));

-- 3. Link shipments to contacts (FK)
ALTER TABLE wh_shipments ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES wh_contacts(id);
CREATE INDEX IF NOT EXISTS idx_wh_shipments_contact ON wh_shipments(contact_id) WHERE contact_id IS NOT NULL;
