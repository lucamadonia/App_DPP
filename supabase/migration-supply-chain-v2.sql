-- Supply Chain V2 Migration
-- Adds new columns to supply_chain_entries for process type, transport, status, emissions, etc.

ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS process_type TEXT
  CHECK (process_type IN ('raw_material_sourcing','manufacturing','assembly','quality_control','packaging','warehousing','transport','distribution','customs_clearance'));
ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS transport_mode TEXT
  CHECK (transport_mode IN ('road','rail','sea','air','multimodal'));
ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed'
  CHECK (status IN ('planned','in_progress','completed','delayed','cancelled'));
ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS document_ids UUID[] DEFAULT '{}';
ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS emissions_kg NUMERIC;
ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS duration_days INTEGER;
ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS cost NUMERIC;
ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
