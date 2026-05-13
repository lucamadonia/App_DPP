-- Add gift flag + free-form note to shipment items.
-- Used when a packer/picker adds an extra product to an order
-- (Werbegeschenk, Beigabe, Goodie). Items with is_gift=true should
-- be excluded from invoices but still appear on the delivery note.
ALTER TABLE wh_shipment_items
  ADD COLUMN IF NOT EXISTS is_gift boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_note text;

CREATE INDEX IF NOT EXISTS idx_wh_shipment_items_is_gift
  ON wh_shipment_items (shipment_id)
  WHERE is_gift = true;
