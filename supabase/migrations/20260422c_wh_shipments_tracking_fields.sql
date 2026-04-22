-- Expose latest DHL tracking event on the shipment for UI display
ALTER TABLE wh_shipments
  ADD COLUMN IF NOT EXISTS tracking_last_status TEXT,
  ADD COLUMN IF NOT EXISTS tracking_last_description TEXT,
  ADD COLUMN IF NOT EXISTS tracking_last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_last_location TEXT,
  ADD COLUMN IF NOT EXISTS tracking_polled_at TIMESTAMPTZ;
