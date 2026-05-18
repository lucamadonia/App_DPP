-- Tracking page showed "no image" for products that use the gallery system
-- (product_images table) because the RPC only read p.image_url, which is
-- often empty for tenants that manage images via the gallery instead of
-- the legacy single-field workflow.
--
-- Patch the RPC to fall back to the primary product_images.url (highest
-- priority), then the lowest sort_order gallery image, then the legacy
-- p.image_url, then NULL.

CREATE OR REPLACE FUNCTION get_public_shipment_items_by_token(p_token TEXT)
RETURNS TABLE (
  product_id              UUID,
  product_name            TEXT,
  product_image_url       TEXT,
  product_gtin            TEXT,
  product_serial          TEXT,
  product_manufacturer    TEXT,
  product_category        TEXT,
  quantity                INTEGER,
  carbon_footprint_total  NUMERIC,
  carbon_footprint_unit   TEXT,
  recyclability_pct       NUMERIC
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id AS product_id,
    p.name AS product_name,
    COALESCE(
      -- 1) primary gallery image
      (SELECT url FROM product_images
        WHERE product_id = p.id AND is_primary = true
        ORDER BY sort_order, created_at LIMIT 1),
      -- 2) first non-primary gallery image (lowest sort_order)
      (SELECT url FROM product_images
        WHERE product_id = p.id
        ORDER BY sort_order, created_at LIMIT 1),
      -- 3) legacy single image_url
      p.image_url
    ) AS product_image_url,
    p.gtin AS product_gtin,
    p.serial_number AS product_serial,
    p.manufacturer AS product_manufacturer,
    p.category AS product_category,
    si.quantity,
    NULLIF(p.carbon_footprint->>'total', '')::NUMERIC AS carbon_footprint_total,
    COALESCE(p.carbon_footprint->>'unit', 'kg CO2e') AS carbon_footprint_unit,
    NULLIF(p.recyclability->>'recyclablePercentage', '')::NUMERIC AS recyclability_pct
  FROM wh_shipments s
  JOIN wh_shipment_items si ON si.shipment_id = s.id
  JOIN products p ON p.id = si.product_id
  WHERE s.tracking_token = p_token
    AND s.tracking_token IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION get_public_shipment_items_by_token(TEXT) TO anon, authenticated;
