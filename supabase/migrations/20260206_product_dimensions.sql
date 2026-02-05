-- Migration: Add product and packaging dimensions to products and product_batches
-- Date: 2026-02-06

-- Products table: Standard values (master data)
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_height_cm NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_width_cm NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_depth_cm NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_type TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_height_cm NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_width_cm NUMERIC;
ALTER TABLE products ADD COLUMN IF NOT EXISTS packaging_depth_cm NUMERIC;

-- Product batches table: Override capability per batch
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS product_height_cm NUMERIC;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS product_width_cm NUMERIC;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS product_depth_cm NUMERIC;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS packaging_type TEXT;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS packaging_description TEXT;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS packaging_height_cm NUMERIC;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS packaging_width_cm NUMERIC;
ALTER TABLE product_batches ADD COLUMN IF NOT EXISTS packaging_depth_cm NUMERIC;

-- Add comments for documentation
COMMENT ON COLUMN products.product_height_cm IS 'Product height in centimeters';
COMMENT ON COLUMN products.product_width_cm IS 'Product width in centimeters';
COMMENT ON COLUMN products.product_depth_cm IS 'Product depth in centimeters';
COMMENT ON COLUMN products.packaging_type IS 'Packaging type: box, blister, bottle, pouch, can, tube, bag, clamshell, wrap, pallet, other';
COMMENT ON COLUMN products.packaging_description IS 'Free-text description of packaging';
COMMENT ON COLUMN products.packaging_height_cm IS 'Packaging height in centimeters';
COMMENT ON COLUMN products.packaging_width_cm IS 'Packaging width in centimeters';
COMMENT ON COLUMN products.packaging_depth_cm IS 'Packaging depth in centimeters';

COMMENT ON COLUMN product_batches.product_height_cm IS 'Override: Product height in centimeters';
COMMENT ON COLUMN product_batches.product_width_cm IS 'Override: Product width in centimeters';
COMMENT ON COLUMN product_batches.product_depth_cm IS 'Override: Product depth in centimeters';
COMMENT ON COLUMN product_batches.packaging_type IS 'Override: Packaging type';
COMMENT ON COLUMN product_batches.packaging_description IS 'Override: Description of packaging';
COMMENT ON COLUMN product_batches.packaging_height_cm IS 'Override: Packaging height in centimeters';
COMMENT ON COLUMN product_batches.packaging_width_cm IS 'Override: Packaging width in centimeters';
COMMENT ON COLUMN product_batches.packaging_depth_cm IS 'Override: Packaging depth in centimeters';
