-- ================================================================
-- Return-shipment tracking fields on rh_returns
-- Migration: 20260617_rh_returns_tracking.sql
--
-- Mirrors the wh_shipments tracking columns so the returns-tracking
-- cron (poll_returns_tracking_cron in the dhl-shipping function) can
-- persist DHL tracking state for return parcels — exactly like the
-- existing dhl-tracking-poll does for outbound shipments.
-- ================================================================

ALTER TABLE rh_returns
  ADD COLUMN IF NOT EXISTS tracking_history          JSONB,
  ADD COLUMN IF NOT EXISTS tracking_last_status      TEXT,
  ADD COLUMN IF NOT EXISTS tracking_last_description TEXT,
  ADD COLUMN IF NOT EXISTS tracking_last_event_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_last_location    TEXT,
  ADD COLUMN IF NOT EXISTS tracking_polled_at        TIMESTAMPTZ;

-- Helps the cron pick never-polled / oldest-polled returns first.
CREATE INDEX IF NOT EXISTS idx_rh_returns_tracking_poll
  ON rh_returns (tracking_polled_at NULLS FIRST)
  WHERE tracking_number IS NOT NULL;
