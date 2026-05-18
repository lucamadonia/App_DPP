-- Public order lookup for the embeddable tracking widget that lives on
-- shop.fambliss.de (or any other Fambliss-owned page). Customers paste
-- their order number + email; if both match a shipment we return the
-- tracking token so the widget can deep-link to the branded tracking page.
--
-- Security:
--   - both order number AND email must match (case-insensitive)
--   - order number is matched against either the Shopify order id,
--     the order_reference 'Shopify #1234' string, or the shipment_number
--   - throws nothing on miss — returns no row so the widget reads "not found"
--   - rate limiting is left to the frontend / a CDN layer

CREATE OR REPLACE FUNCTION lookup_shipment_by_order_email(
  p_order TEXT,
  p_email TEXT
)
RETURNS TABLE (
  tracking_token TEXT,
  shipment_number TEXT,
  status TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  WITH params AS (
    SELECT
      LOWER(TRIM(p_email)) AS clean_email,
      TRIM(p_order)        AS raw_order,
      -- Strip leading '#', 'SHOPIFY ', '#SHOPIFY' etc. so '#1234' === '1234' === 'Shopify #1234'.
      REGEXP_REPLACE(LOWER(TRIM(p_order)), '^(shopify\s*#?|#)', '') AS norm_order
  )
  SELECT s.tracking_token, s.shipment_number, s.status
  FROM wh_shipments s, params p
  WHERE s.tracking_token IS NOT NULL
    AND LOWER(s.recipient_email) = p.clean_email
    AND (
      LOWER(s.shipment_number)                                = p.norm_order
      OR LOWER(s.shipment_number)                             = LOWER(p.raw_order)
      OR LOWER(s.order_reference)                             = LOWER(p.raw_order)
      OR LOWER(REPLACE(s.order_reference, 'Shopify ', ''))    = LOWER(p.raw_order)
      OR LOWER(REPLACE(s.order_reference, 'Shopify ', ''))    = '#' || p.norm_order
      OR LOWER(REPLACE(s.order_reference, 'Shopify #', ''))   = p.norm_order
      OR s.shopify_order_id::text                             = p.norm_order
    )
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_shipment_by_order_email(TEXT, TEXT) TO anon, authenticated;
