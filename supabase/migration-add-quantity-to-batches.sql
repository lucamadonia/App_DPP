-- ============================================
-- MIGRATION: Add quantity column to product_batches
-- ============================================
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- This adds the missing 'quantity' column to the product_batches table
-- if it doesn't already exist. Safe to re-run (idempotent).

-- Add quantity column to product_batches
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'product_batches' 
        AND column_name = 'quantity'
    ) THEN
        ALTER TABLE product_batches ADD COLUMN quantity INTEGER;
        RAISE NOTICE 'Column quantity added to product_batches table';
    ELSE
        RAISE NOTICE 'Column quantity already exists in product_batches table';
    END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'product_batches'
ORDER BY ordinal_position;
