-- Public support flow for tracking links:
--   1) Extend get_public_shipment_by_token to surface recipient_email so the
--      Support dialog can pre-fill it (customer doesn't retype what we already know).
--   2) Add create_public_support_ticket(token, email, subject, message, affected_product_ids[])
--      that creates an rh_ticket + initial rh_ticket_message + finds or creates the
--      rh_customer record. Anon-callable but token-gated.

-- 1) Surface recipient_email on the public shipment row -------------------

DROP FUNCTION IF EXISTS get_public_shipment_by_token(TEXT);

CREATE OR REPLACE FUNCTION get_public_shipment_by_token(p_token TEXT)
RETURNS TABLE (
  id                              UUID,
  tenant_id                       UUID,
  shipment_number                 TEXT,
  status                          TEXT,
  recipient_first_name            TEXT,
  recipient_email                 TEXT,
  recipient_company               TEXT,
  shipping_city                   TEXT,
  shipping_postal_code            TEXT,
  shipping_country                TEXT,
  carrier                         TEXT,
  tracking_number                 TEXT,
  estimated_delivery              TIMESTAMPTZ,
  tracking_predicted_arrival_at   TIMESTAMPTZ,
  tracking_last_status            TEXT,
  tracking_last_description       TEXT,
  tracking_last_event_at          TIMESTAMPTZ,
  tracking_last_location          TEXT,
  tracking_polled_at              TIMESTAMPTZ,
  shipped_at                      TIMESTAMPTZ,
  delivered_at                    TIMESTAMPTZ,
  created_at                      TIMESTAMPTZ,
  total_items                     INTEGER
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
    s.status,
    split_part(s.recipient_name, ' ', 1) AS recipient_first_name,
    s.recipient_email,
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
    COALESCE(
      (SELECT SUM(quantity)::INTEGER FROM wh_shipment_items WHERE shipment_id = s.id),
      0
    ) AS total_items
  FROM wh_shipments s
  WHERE s.tracking_token = p_token
    AND s.tracking_token IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_shipment_by_token(TEXT) TO anon, authenticated;


-- 2) Public ticket creator ------------------------------------------------
--
-- Lookups: shipment from the token (must be valid + active). Finds or creates
-- the rh_customer by email within the shipment's tenant. Creates the ticket
-- with the shipment + affected products captured in metadata, then writes the
-- initial customer message into rh_ticket_messages.
--
-- Anti-abuse: rate-limited by a tenant-day-IP threshold left to the caller —
-- this RPC trusts that the token was issued by us. Tokens that are NULL or
-- not in wh_shipments fail closed.

CREATE OR REPLACE FUNCTION create_public_support_ticket(
  p_token                 TEXT,
  p_email                 TEXT,
  p_subject               TEXT,
  p_message               TEXT,
  p_affected_product_ids  UUID[]
)
RETURNS TABLE (
  ticket_id     UUID,
  ticket_number TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_shipment_id   UUID;
  v_tenant_id     UUID;
  v_recipient     TEXT;
  v_customer_id   UUID;
  v_ticket_id     UUID := gen_random_uuid();
  v_ticket_number TEXT;
  v_subject       TEXT;
  v_clean_email   TEXT;
BEGIN
  v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
  IF v_clean_email = '' OR v_clean_email NOT LIKE '%_@_%._%' THEN
    RAISE EXCEPTION 'invalid_email';
  END IF;

  IF COALESCE(TRIM(p_message), '') = '' THEN
    RAISE EXCEPTION 'empty_message';
  END IF;

  -- Resolve shipment from token
  SELECT s.id, s.tenant_id, s.recipient_name
    INTO v_shipment_id, v_tenant_id, v_recipient
  FROM wh_shipments s
  WHERE s.tracking_token = LOWER(TRIM(p_token))
    AND s.tracking_token IS NOT NULL
  LIMIT 1;

  IF v_shipment_id IS NULL THEN
    RAISE EXCEPTION 'invalid_token';
  END IF;

  -- Find or create rh_customer (per-tenant unique email)
  SELECT id INTO v_customer_id
  FROM rh_customers
  WHERE tenant_id = v_tenant_id AND LOWER(email) = v_clean_email
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    v_customer_id := gen_random_uuid();
    INSERT INTO rh_customers (
      id, tenant_id, email, name, created_at, updated_at
    ) VALUES (
      v_customer_id, v_tenant_id, v_clean_email,
      NULLIF(v_recipient, ''), NOW(), NOW()
    );
  END IF;

  v_subject := COALESCE(NULLIF(TRIM(p_subject), ''), 'Support request');
  v_ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                     UPPER(SUBSTRING(v_ticket_id::text, 1, 6));

  INSERT INTO rh_tickets (
    id, tenant_id, ticket_number, customer_id,
    category, priority, status, subject,
    tags, metadata, created_at, updated_at
  ) VALUES (
    v_ticket_id, v_tenant_id, v_ticket_number, v_customer_id,
    'shipping', 'normal', 'open', v_subject,
    ARRAY['public-tracking', 'shipment-support'],
    jsonb_build_object(
      'source',               'public_tracking',
      'shipment_id',          v_shipment_id,
      'tracking_token',       LOWER(TRIM(p_token)),
      'affected_product_ids', COALESCE(p_affected_product_ids, ARRAY[]::UUID[]),
      'contact_email',        v_clean_email
    ),
    NOW(), NOW()
  );

  INSERT INTO rh_ticket_messages (
    id, tenant_id, ticket_id,
    sender_type, sender_email, sender_name,
    content, is_internal, created_at
  ) VALUES (
    gen_random_uuid(), v_tenant_id, v_ticket_id,
    'customer', v_clean_email, NULLIF(v_recipient, ''),
    p_message, FALSE, NOW()
  );

  RETURN QUERY SELECT v_ticket_id, v_ticket_number;
END;
$$;

GRANT EXECUTE ON FUNCTION create_public_support_ticket(TEXT, TEXT, TEXT, TEXT, UUID[]) TO anon, authenticated;
