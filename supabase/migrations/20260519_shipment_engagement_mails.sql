-- Shipment Lifecycle + Engagement Mail Pipeline
--
-- Extends two surfaces so Trackbliss can drive the post-purchase journey
-- without doubling Shopify's order/shipping confirmations:
--
--   1) products table grows four columns the engagement-mails service reads
--      to assemble the per-product onboarding blocks. They are filled by
--      the extract-product-onboarding edge function (AI-generated from
--      Shopify description) and editable by the operator.
--
--      onboarding_steps     JSONB array of 3-5 short bullet strings.
--      tutorial_url         deep-link to a Hydrogen / journal tutorial page.
--      review_url           deep-link to the Shopify product page review section.
--      onboarding_priority  smaller = appear higher up in the engagement mail
--                           when the customer has multiple items.
--
--   2) rh_notifications gains a wh_shipment_id reference so the admin UI
--      can list all mails per shipment + the daily cron can skip shipments
--      that have already received a given engagement_day_N mail.
--
-- Backwards-compatible: every column NULL-able, every default sensible.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS onboarding_steps    JSONB,
  ADD COLUMN IF NOT EXISTS tutorial_url        TEXT,
  ADD COLUMN IF NOT EXISTS review_url          TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_priority INTEGER DEFAULT 100;

ALTER TABLE rh_notifications
  ADD COLUMN IF NOT EXISTS wh_shipment_id UUID REFERENCES wh_shipments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rh_notifications_shipment
  ON rh_notifications(wh_shipment_id, template)
  WHERE wh_shipment_id IS NOT NULL;
