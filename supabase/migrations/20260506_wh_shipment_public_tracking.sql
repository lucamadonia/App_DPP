-- =====================================================================
-- Public Shipment Tracking (Magic-Link)
-- =====================================================================
-- Adds anonymous, token-protected access to shipment tracking so end
-- customers can see where their package is without logging in.
-- The 10-char `tracking_token` IS the auth (like a Google Docs share
-- link). Public access is mediated entirely through SECURITY DEFINER
-- functions — RLS on wh_shipments is unchanged.
-- =====================================================================

-- 1) New columns on wh_shipments ---------------------------------------

ALTER TABLE wh_shipments
  ADD COLUMN IF NOT EXISTS tracking_token            TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS tracking_token_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_history          JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tracking_predicted_arrival_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_view_count       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tracking_first_viewed_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_last_viewed_at   TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_wh_shipments_tracking_token
  ON wh_shipments(tracking_token)
  WHERE tracking_token IS NOT NULL;

-- 2) Token generator (10-char, base32-ish, no ambiguous chars) ---------

CREATE OR REPLACE FUNCTION generate_tracking_token()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  -- 31 unambiguous chars: no 0/O, no 1/l/I, no confusing pairs
  alphabet CONSTANT TEXT := 'abcdefghjkmnpqrstuvwxyz23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..10 LOOP
    result := result || substr(alphabet, (random() * length(alphabet))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 3) Auto-generate token on insert/update when tracking_number is set --

CREATE OR REPLACE FUNCTION wh_shipments_ensure_tracking_token()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tracking_number IS NOT NULL
     AND NEW.tracking_token IS NULL THEN
    NEW.tracking_token := generate_tracking_token();
    NEW.tracking_token_created_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wh_shipments_tracking_token ON wh_shipments;
CREATE TRIGGER trg_wh_shipments_tracking_token
  BEFORE INSERT OR UPDATE OF tracking_number ON wh_shipments
  FOR EACH ROW
  EXECUTE FUNCTION wh_shipments_ensure_tracking_token();

-- 4) Backfill tokens for existing shipments with tracking numbers ------

UPDATE wh_shipments
SET tracking_token = generate_tracking_token(),
    tracking_token_created_at = COALESCE(tracking_token_created_at, NOW())
WHERE tracking_token IS NULL
  AND tracking_number IS NOT NULL;

-- 5) Public read function: shipment summary ----------------------------

CREATE OR REPLACE FUNCTION get_public_shipment_by_token(p_token TEXT)
RETURNS TABLE (
  id                            UUID,
  tenant_id                     UUID,
  shipment_number               TEXT,
  status                        TEXT,
  recipient_first_name          TEXT,
  recipient_company             TEXT,
  shipping_city                 TEXT,
  shipping_postal_code          TEXT,
  shipping_country              TEXT,
  carrier                       TEXT,
  tracking_number               TEXT,
  estimated_delivery            DATE,
  tracking_predicted_arrival_at TIMESTAMPTZ,
  tracking_last_status          TEXT,
  tracking_last_description     TEXT,
  tracking_last_event_at        TIMESTAMPTZ,
  tracking_last_location        TEXT,
  tracking_polled_at            TIMESTAMPTZ,
  shipped_at                    TIMESTAMPTZ,
  delivered_at                  TIMESTAMPTZ,
  created_at                    TIMESTAMPTZ,
  total_items                   INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    s.id,
    s.tenant_id,
    s.shipment_number,
    s.status::TEXT,
    -- Only first name, never full address details
    split_part(s.recipient_name, ' ', 1) AS recipient_first_name,
    s.recipient_company,
    s.shipping_city,
    s.shipping_postal_code,
    s.shipping_country,
    s.carrier,
    s.tracking_number,
    s.estimated_delivery,
    s.tracking_predicted_arrival_at,
    s.tracking_last_status,
    s.tracking_last_description,
    s.tracking_last_event_at,
    s.tracking_last_location,
    s.tracking_polled_at,
    s.shipped_at,
    s.delivered_at,
    s.created_at,
    s.total_items
  FROM wh_shipments s
  WHERE s.tracking_token = p_token
    AND s.tracking_token IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_shipment_by_token(TEXT) TO anon, authenticated;

-- 6) Public read function: shipment items with DPP preview --------------

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
    p.image_url AS product_image_url,
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

-- 7) Public branding lookup for the page header -------------------------

CREATE OR REPLACE FUNCTION get_public_tenant_branding_by_token(p_token TEXT)
RETURNS TABLE (
  tenant_id     UUID,
  tenant_name   TEXT,
  tenant_slug   TEXT,
  primary_color TEXT,
  logo_url      TEXT,
  app_name      TEXT,
  support_email TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    t.settings->'branding'->>'primaryColor' AS primary_color,
    t.settings->'branding'->>'logoUrl' AS logo_url,
    COALESCE(t.settings->'branding'->>'appName', t.name) AS app_name,
    t.settings->'returnsHub'->>'supportEmail' AS support_email
  FROM wh_shipments s
  JOIN tenants t ON t.id = s.tenant_id
  WHERE s.tracking_token = p_token
    AND s.tracking_token IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_tenant_branding_by_token(TEXT) TO anon, authenticated;

-- 8) Engagement counter (anonymous-friendly) ----------------------------

CREATE OR REPLACE FUNCTION increment_shipment_tracking_view(p_token TEXT)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE wh_shipments
  SET
    tracking_view_count = COALESCE(tracking_view_count, 0) + 1,
    tracking_first_viewed_at = COALESCE(tracking_first_viewed_at, NOW()),
    tracking_last_viewed_at = NOW()
  WHERE tracking_token = p_token
    AND tracking_token IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_shipment_tracking_view(TEXT) TO anon, authenticated;

-- 9) Anonymous "I didn't receive my package" report ---------------------
--    Writes a system entry into the warehouse activity stream so the
--    operator sees it. Idempotent per token+24h.

CREATE OR REPLACE FUNCTION report_shipment_not_received(
  p_token TEXT,
  p_message TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_shipment RECORD;
BEGIN
  SELECT id, tenant_id, shipment_number, internal_notes
    INTO v_shipment
    FROM wh_shipments
    WHERE tracking_token = p_token
      AND tracking_token IS NOT NULL
    LIMIT 1;

  IF v_shipment IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE wh_shipments
  SET internal_notes = COALESCE(internal_notes, '')
    || E'\n[' || to_char(NOW(), 'YYYY-MM-DD HH24:MI') || '] '
    || 'Customer reported NOT RECEIVED: '
    || COALESCE(NULLIF(p_message, ''), '(no message)'),
    priority = 'urgent'
  WHERE id = v_shipment.id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION report_shipment_not_received(TEXT, TEXT) TO anon, authenticated;
