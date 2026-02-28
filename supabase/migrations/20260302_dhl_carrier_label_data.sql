-- DHL Carrier Label Data: JSONB column on wh_shipments for carrier-specific metadata
-- Stores DHL shipment number, product, label format, label storage path, timestamps

ALTER TABLE wh_shipments ADD COLUMN IF NOT EXISTS carrier_label_data JSONB;

COMMENT ON COLUMN wh_shipments.carrier_label_data IS 'Carrier-specific label metadata (DHL shipment number, product, label storage path)';
