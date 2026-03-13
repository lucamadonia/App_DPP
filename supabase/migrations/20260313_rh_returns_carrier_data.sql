-- Add carrier_label_data JSONB column to rh_returns
-- Stores structured DHL/carrier metadata for label management (cancel, re-download, etc.)

ALTER TABLE rh_returns ADD COLUMN IF NOT EXISTS carrier_label_data JSONB;

-- Comment
COMMENT ON COLUMN rh_returns.carrier_label_data IS 'Structured carrier metadata: carrier name, shipment number, product, label format, storage path, timestamps';
