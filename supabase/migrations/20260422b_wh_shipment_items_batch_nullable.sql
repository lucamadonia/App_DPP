-- Allow wh_shipment_items.batch_id to be NULL so order imports
-- can create shipment items for products that don't yet have a
-- batch registered (stock reservation then simply skipped).
ALTER TABLE wh_shipment_items ALTER COLUMN batch_id DROP NOT NULL;
