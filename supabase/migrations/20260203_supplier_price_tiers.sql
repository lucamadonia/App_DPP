-- Add price_tiers JSONB column to supplier_products for volume pricing
-- Schema: [{ minQty: number, maxQty: number|null, pricePerUnit: number, currency: string }]
ALTER TABLE supplier_products ADD COLUMN IF NOT EXISTS price_tiers JSONB;
