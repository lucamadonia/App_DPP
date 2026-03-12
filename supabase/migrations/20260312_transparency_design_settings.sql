-- Add design settings JSONB column to transparency_page_config
ALTER TABLE transparency_page_config
  ADD COLUMN IF NOT EXISTS design JSONB DEFAULT '{}'::jsonb;

-- Add access control JSONB column to transparency_page_config
ALTER TABLE transparency_page_config
  ADD COLUMN IF NOT EXISTS access_control JSONB DEFAULT '{"enabled": false, "orderPrefix": ""}'::jsonb;

-- Backfill existing rows with defaults
UPDATE transparency_page_config SET design = '{}'::jsonb WHERE design IS NULL;
UPDATE transparency_page_config SET access_control = '{"enabled": false, "orderPrefix": ""}'::jsonb WHERE access_control IS NULL;
