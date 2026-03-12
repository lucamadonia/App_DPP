-- Add design settings JSONB column to transparency_page_config
ALTER TABLE transparency_page_config
  ADD COLUMN IF NOT EXISTS design JSONB DEFAULT '{}'::jsonb;

-- Backfill existing rows with empty object (will use client-side defaults)
UPDATE transparency_page_config SET design = '{}'::jsonb WHERE design IS NULL;
