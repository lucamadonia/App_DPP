-- ============================================
-- ESPR COMPLIANCE FIELDS MIGRATION
-- ============================================
-- Adds 21 new mandatory ESPR fields to products table
-- Plus facility_identifier to supply_chain_entries

-- ============================================
-- PRODUCTS TABLE - NEW ESPR FIELDS
-- ============================================

-- Identification
ALTER TABLE products ADD COLUMN IF NOT EXISTS unique_product_id TEXT;

-- Economic Operators
ALTER TABLE products ADD COLUMN IF NOT EXISTS importer_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS importer_eori TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS authorized_representative JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dpp_responsible JSONB;

-- Materials & Substances
ALTER TABLE products ADD COLUMN IF NOT EXISTS substances_of_concern JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS recycled_content_percentage NUMERIC;

-- Sustainability
ALTER TABLE products ADD COLUMN IF NOT EXISTS energy_consumption_kwh NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS durability_years NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS repairability_score INTEGER;

-- Recycling & End-of-Life
ALTER TABLE products ADD COLUMN IF NOT EXISTS disassembly_instructions TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS end_of_life_instructions TEXT;

-- Conformity & Certifications
ALTER TABLE products ADD COLUMN IF NOT EXISTS eu_declaration_of_conformity TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS test_reports JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ce_marking BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_manual_url TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS safety_information TEXT;

-- Customs Data
ALTER TABLE products ADD COLUMN IF NOT EXISTS customs_value NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS preference_proof TEXT;

-- Product Sets
ALTER TABLE products ADD COLUMN IF NOT EXISTS component_dpp_urls JSONB;

-- DPP Registry
ALTER TABLE products ADD COLUMN IF NOT EXISTS dpp_registry_id TEXT;

-- ============================================
-- SUPPLY CHAIN ENTRIES - FACILITY IDENTIFIER
-- ============================================

ALTER TABLE supply_chain_entries ADD COLUMN IF NOT EXISTS facility_identifier TEXT;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_products_unique_product_id ON products(unique_product_id);
CREATE INDEX IF NOT EXISTS idx_products_dpp_registry_id ON products(dpp_registry_id);
CREATE INDEX IF NOT EXISTS idx_products_ce_marking ON products(ce_marking) WHERE ce_marking = true;
CREATE INDEX IF NOT EXISTS idx_supply_chain_facility_identifier ON supply_chain_entries(facility_identifier) WHERE facility_identifier IS NOT NULL;

-- ============================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN products.unique_product_id IS 'Unique Product Identifier (UID) per ISO/IEC 15459';
COMMENT ON COLUMN products.importer_name IS 'EU Importer name (Economic Operator)';
COMMENT ON COLUMN products.importer_eori IS 'EU Importer EORI number';
COMMENT ON COLUMN products.authorized_representative IS 'Authorized Representative (name, address, email, phone, eori)';
COMMENT ON COLUMN products.dpp_responsible IS 'Person responsible for DPP updates (name, role, email, lastUpdate)';
COMMENT ON COLUMN products.substances_of_concern IS 'SVHC/SCIP substances array (name, casNumber, ecNumber, concentration, scipId, svhcListed)';
COMMENT ON COLUMN products.recycled_content_percentage IS 'Percentage of recycled content (0-100)';
COMMENT ON COLUMN products.energy_consumption_kwh IS 'Energy consumption in kWh/year';
COMMENT ON COLUMN products.durability_years IS 'Expected product durability in years';
COMMENT ON COLUMN products.repairability_score IS 'Repairability score (0-100)';
COMMENT ON COLUMN products.disassembly_instructions IS 'Disassembly instructions (text or URL)';
COMMENT ON COLUMN products.end_of_life_instructions IS 'End-of-Life disposal instructions';
COMMENT ON COLUMN products.eu_declaration_of_conformity IS 'EU Declaration of Conformity URL';
COMMENT ON COLUMN products.test_reports IS 'Array of test report URLs';
COMMENT ON COLUMN products.ce_marking IS 'CE Marking present (boolean)';
COMMENT ON COLUMN products.user_manual_url IS 'User manual PDF URL';
COMMENT ON COLUMN products.safety_information IS 'Safety information (text or URL)';
COMMENT ON COLUMN products.customs_value IS 'Customs value in EUR';
COMMENT ON COLUMN products.preference_proof IS 'Preferential origin proof (EUR.1, REX, etc.)';
COMMENT ON COLUMN products.component_dpp_urls IS 'Array of component DPP URLs for product sets';
COMMENT ON COLUMN products.dpp_registry_id IS 'EU DPP Registry ID';
COMMENT ON COLUMN supply_chain_entries.facility_identifier IS 'Unique Facility Identifier (GLN) per GS1 standards';
