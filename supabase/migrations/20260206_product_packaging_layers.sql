-- Migration: Add product_packaging table for multiple packaging layers
-- Date: 2026-02-06

-- Create product_packaging table
CREATE TABLE IF NOT EXISTS product_packaging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Packaging layer info
  layer_type TEXT NOT NULL DEFAULT 'primary', -- primary, secondary, tertiary, transport
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Packaging details (same fields as before, but per layer)
  packaging_type TEXT, -- box, blister, bottle, pouch, can, tube, bag, clamshell, wrap, pallet, other
  packaging_description TEXT,
  height_cm NUMERIC,
  width_cm NUMERIC,
  depth_cm NUMERIC,
  weight_g NUMERIC, -- Packaging weight in grams

  -- Material info for this packaging layer
  material TEXT, -- Main material (e.g., cardboard, plastic, glass)
  recyclable BOOLEAN DEFAULT false,
  recycling_code TEXT, -- e.g., PAP 21, LDPE 04

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_packaging_product_id ON product_packaging(product_id);
CREATE INDEX IF NOT EXISTS idx_product_packaging_tenant_id ON product_packaging(tenant_id);

-- Enable RLS
ALTER TABLE product_packaging ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant's packaging"
  ON product_packaging FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert packaging for their tenant"
  ON product_packaging FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant's packaging"
  ON product_packaging FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant's packaging"
  ON product_packaging FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add comments
COMMENT ON TABLE product_packaging IS 'Multiple packaging layers per product (primary, secondary, tertiary, transport)';
COMMENT ON COLUMN product_packaging.layer_type IS 'Packaging layer: primary (direct), secondary (outer box), tertiary (case), transport (pallet)';
COMMENT ON COLUMN product_packaging.sort_order IS 'Order of packaging layers (0 = innermost)';
COMMENT ON COLUMN product_packaging.recycling_code IS 'Recycling identification code (e.g., PAP 21 for cardboard)';
