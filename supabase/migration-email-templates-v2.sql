-- Migration: Email Templates V2 - Add visual editor columns
-- Adds category, name, description, design_config, html_template, preview_text, sort_order

-- Add new columns
ALTER TABLE rh_email_templates
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'returns',
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS design_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS html_template TEXT,
  ADD COLUMN IF NOT EXISTS preview_text TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Backfill existing templates with name, category, sort_order
UPDATE rh_email_templates SET name = 'Return Confirmed', category = 'returns', sort_order = 1 WHERE event_type = 'return_confirmed' AND name IS NULL;
UPDATE rh_email_templates SET name = 'Return Approved', category = 'returns', sort_order = 2 WHERE event_type = 'return_approved' AND name IS NULL;
UPDATE rh_email_templates SET name = 'Return Rejected', category = 'returns', sort_order = 3 WHERE event_type = 'return_rejected' AND name IS NULL;
UPDATE rh_email_templates SET name = 'Return Shipped', category = 'returns', sort_order = 4 WHERE event_type = 'return_shipped' AND name IS NULL;
UPDATE rh_email_templates SET name = 'Refund Completed', category = 'returns', sort_order = 7 WHERE event_type = 'refund_completed' AND name IS NULL;
UPDATE rh_email_templates SET name = 'Ticket Created', category = 'tickets', sort_order = 9 WHERE event_type = 'ticket_created' AND name IS NULL;
UPDATE rh_email_templates SET name = 'Agent Reply', category = 'tickets', sort_order = 10 WHERE event_type = 'ticket_agent_reply' AND name IS NULL;

-- Index for tenant + category queries
CREATE INDEX IF NOT EXISTS idx_rh_email_templates_tenant_category ON rh_email_templates (tenant_id, category);
