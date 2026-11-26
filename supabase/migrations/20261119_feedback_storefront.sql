-- =============================================================================
-- Migration: Feedback module, native storefront integration
-- Date: 2026-11-19
--
-- The Fambliss Hydrogen storefront (shop.fambliss.de) shows customer
-- experience reports natively and collects them on its own page
-- (/bewerten?t=<token>). Decision: text-only reports, no star ratings.
--
-- What this does:
--   1. feedback_reviews.rating becomes optional (1 to 5 check stays for
--      non-null values).
--   2. submit_feedback_reviews(): accepts reviews without rating, validates
--      length (title 120, comment 4000), rejects empty reviews, rate limited
--      per token. Everything else is unchanged from 20260602c.
--   3. get_public_feedback_reviews_by_shopify(): approved text reviews of one
--      Shopify product (via shopify_product_map), paginated, no rating.
--   4. get_public_feedback_summary(): approved review counts per Shopify
--      product.
--   5. lookup_feedback_by_order_email(): order number + email of a DELIVERED
--      shipment -> feedback token (reuses an open request or creates the
--      requests like the delivered flow / day-7 cron do).
--   6. feedback_photos: public SELECT only for photos of approved reviews.
--   7. get_public_shipment_by_token(): two extra columns at the end,
--      feedback_token + feedback_url (open request of a delivered shipment,
--      NULL otherwise). Existing columns are unchanged.
--   8. Seeds tenants.settings.feedback.storefrontReviewUrl for the Fambliss
--      tenant (only when not set yet).
--
-- Depends on: 20260516 (feedback tables), 20260228b (shopify_product_map),
--   20260506 (generate_tracking_token), 20261001d (rate_limit_hit).
--
-- Rate limiting note: the storefront calls these RPCs server-side (Oxygen
-- worker), so the client IP PostgREST sees is a shared worker egress address.
-- The limits below are therefore keyed on token / tenant / e-mail, never on
-- the IP. Rejections are RETURNED (not raised) so the counters persist.
--
-- Idempotent: safe to re-run.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. rating is optional
-- -----------------------------------------------------------------------------
-- The inline CHECK (rating BETWEEN 1 AND 5) from 20260516 stays: a CHECK
-- passes for NULL, so it keeps guarding non-null values.

ALTER TABLE public.feedback_reviews ALTER COLUMN rating DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. submit_feedback_reviews: rating optional, length limits, rate limit
-- -----------------------------------------------------------------------------
-- p_reviews: [ { request_id, rating?, title?, comment?, reviewer_city?,
--               name_visibility?, reviewer_children? }, ... ]
-- New error codes (returned as {"error": ...}): rate_limited, invalid_payload,
-- invalid_rating, title_too_long, comment_too_long, empty_review.
-- The whole payload is validated BEFORE the first insert, so a rejected call
-- never stores a partial submission.

CREATE OR REPLACE FUNCTION public.submit_feedback_reviews(p_token TEXT, p_reviews JSONB)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_req feedback_requests%ROWTYPE;
  v_review JSONB;
  v_request_id UUID;
  v_target_req feedback_requests%ROWTYPE;
  v_visibility TEXT;
  v_display_name TEXT;
  v_children JSONB;
  v_review_id UUID;
  v_inserted_ids UUID[] := ARRAY[]::UUID[];
  v_ok BOOLEAN;
  v_rating_txt TEXT;
  v_title TEXT;
  v_comment TEXT;
BEGIN
  SELECT * INTO v_req FROM feedback_requests WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  -- Per-token throttle. Counted only for tokens that exist, so random tokens
  -- cannot fill rate_limit_counters.
  SELECT allowed INTO v_ok
    FROM public.rate_limit_hit('fbsubmit:tok:' || md5(p_token), 10, 3600);
  IF NOT v_ok THEN RETURN jsonb_build_object('error', 'rate_limited'); END IF;

  IF v_req.expires_at < NOW() THEN RETURN jsonb_build_object('error', 'expired'); END IF;
  IF v_req.status = 'submitted' THEN RETURN jsonb_build_object('error', 'already_submitted'); END IF;

  IF p_reviews IS NULL OR jsonb_typeof(p_reviews) <> 'array'
     OR jsonb_array_length(p_reviews) = 0 OR jsonb_array_length(p_reviews) > 50 THEN
    RETURN jsonb_build_object('error', 'invalid_payload');
  END IF;

  -- Validation pass (no writes).
  FOR v_review IN SELECT * FROM jsonb_array_elements(p_reviews) LOOP
    IF jsonb_typeof(v_review) <> 'object'
       OR COALESCE(v_review->>'request_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RETURN jsonb_build_object('error', 'invalid_payload');
    END IF;

    v_rating_txt := NULLIF(btrim(COALESCE(v_review->>'rating', '')), '');
    IF v_rating_txt IS NOT NULL AND v_rating_txt !~ '^[1-5]$' THEN
      RETURN jsonb_build_object('error', 'invalid_rating');
    END IF;

    v_title := NULLIF(btrim(COALESCE(v_review->>'title', '')), '');
    v_comment := NULLIF(btrim(COALESCE(v_review->>'comment', '')), '');
    IF v_title IS NOT NULL AND char_length(v_title) > 120 THEN
      RETURN jsonb_build_object('error', 'title_too_long');
    END IF;
    IF v_comment IS NOT NULL AND char_length(v_comment) > 4000 THEN
      RETURN jsonb_build_object('error', 'comment_too_long');
    END IF;
    -- A review needs text. Star-only submissions (the classic Trackbliss
    -- form at /feedback/<token> still allows them) remain accepted.
    IF v_title IS NULL AND v_comment IS NULL AND v_rating_txt IS NULL THEN
      RETURN jsonb_build_object('error', 'empty_review');
    END IF;
  END LOOP;

  FOR v_review IN SELECT * FROM jsonb_array_elements(p_reviews) LOOP
    v_request_id := (v_review->>'request_id')::UUID;

    SELECT * INTO v_target_req FROM feedback_requests
      WHERE id = v_request_id
        AND tenant_id = v_req.tenant_id
        AND shipment_id = v_req.shipment_id;
    IF NOT FOUND THEN CONTINUE; END IF;

    v_visibility := COALESCE(NULLIF(v_review->>'name_visibility', ''), 'abbreviated');
    IF v_visibility NOT IN ('full', 'abbreviated', 'anonymous') THEN v_visibility := 'abbreviated'; END IF;

    IF v_visibility = 'anonymous' THEN
      v_display_name := 'Anonym';
    ELSIF v_visibility = 'full' THEN
      v_display_name := btrim(v_target_req.customer_name);
    ELSE
      v_display_name := split_part(v_target_req.customer_name, ' ', 1)
        || CASE WHEN array_length(regexp_split_to_array(v_target_req.customer_name, ' '), 1) > 1
                THEN ' ' || substr(split_part(v_target_req.customer_name, ' ', 2), 1, 1) || '.'
                ELSE '' END;
    END IF;
    IF v_display_name IS NULL OR btrim(v_display_name) = '' THEN v_display_name := 'Anonym'; END IF;

    -- Children context (optional). Accept a JSON object {count, ages[]}.
    v_children := CASE
      WHEN jsonb_typeof(v_review->'reviewer_children') = 'object' THEN v_review->'reviewer_children'
      ELSE NULL
    END;

    INSERT INTO feedback_reviews (
      tenant_id, request_id, product_id, batch_id, variant_title,
      rating, title, comment, reviewer_display_name, reviewer_city,
      name_visibility, reviewer_children
    ) VALUES (
      v_target_req.tenant_id,
      v_target_req.id,
      v_target_req.product_id,
      v_target_req.batch_id,
      v_target_req.variant_title,
      NULLIF(btrim(COALESCE(v_review->>'rating', '')), '')::SMALLINT,
      NULLIF(btrim(COALESCE(v_review->>'title', '')), ''),
      NULLIF(btrim(COALESCE(v_review->>'comment', '')), ''),
      v_display_name,
      NULLIF(left(btrim(COALESCE(v_review->>'reviewer_city', '')), 120), ''),
      v_visibility,
      v_children
    )
    RETURNING id INTO v_review_id;

    v_inserted_ids := v_inserted_ids || v_review_id;

    UPDATE feedback_requests SET status = 'submitted', submitted_at = NOW() WHERE id = v_target_req.id;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'review_ids', to_jsonb(v_inserted_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.submit_feedback_reviews(TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_feedback_reviews(TEXT, JSONB) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Public reviews of one Shopify product (storefront product page)
-- -----------------------------------------------------------------------------
-- p_shopify_product_id: numeric Shopify product id as text ("8123456789012"),
-- a "gid://shopify/Product/<id>" value is accepted as well.
-- shopify_product_map.shopify_product_id is BIGINT and has one row per
-- VARIANT, hence EXISTS (never a join) so a review is not multiplied.
-- Only reviews with text are returned: a star-only review would render as an
-- empty card on a storefront that shows no ratings.
-- Returns:
--   { "total_count": int,
--     "reviews": [ { "id", "title", "comment", "display_name",
--                    "variant_title", "created_at", "verified": true,
--                    "reply": { "author", "content", "created_at" } | null } ] }

CREATE OR REPLACE FUNCTION public.get_public_feedback_reviews_by_shopify(
  p_tenant_slug        TEXT,
  p_shopify_product_id TEXT,
  p_limit              INT DEFAULT 20,
  p_offset             INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_pid       BIGINT;
  v_limit     INT := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  v_offset    INT := LEAST(GREATEST(COALESCE(p_offset, 0), 0), 100000);
  v_result    JSONB;
BEGIN
  v_pid := substring(btrim(COALESCE(p_shopify_product_id, ''))
                     FROM '^(?:gid://shopify/Product/)?([0-9]{1,18})$')::BIGINT;

  SELECT t.id INTO v_tenant_id
    FROM tenants t
   WHERE t.slug = NULLIF(btrim(COALESCE(p_tenant_slug, '')), '')
   LIMIT 1;

  IF v_tenant_id IS NULL OR v_pid IS NULL THEN
    RETURN jsonb_build_object('total_count', 0, 'reviews', '[]'::jsonb);
  END IF;

  WITH matched AS (
    SELECT r.id, r.title, r.comment, r.reviewer_display_name, r.variant_title, r.created_at
      FROM feedback_reviews r
     WHERE r.tenant_id = v_tenant_id
       AND r.status = 'approved'
       AND (NULLIF(btrim(r.title), '') IS NOT NULL OR NULLIF(btrim(r.comment), '') IS NOT NULL)
       AND EXISTS (
             SELECT 1 FROM shopify_product_map m
              WHERE m.tenant_id = v_tenant_id
                AND m.shopify_product_id = v_pid
                AND m.product_id = r.product_id
           )
  ),
  page AS (
    SELECT * FROM matched
     ORDER BY created_at DESC, id DESC
     LIMIT v_limit OFFSET v_offset
  )
  SELECT jsonb_build_object(
           'total_count', (SELECT COUNT(*)::INT FROM matched),
           'reviews', COALESCE((
             SELECT jsonb_agg(
                      jsonb_build_object(
                        'id', p.id,
                        'title', NULLIF(btrim(p.title), ''),
                        'comment', NULLIF(btrim(p.comment), ''),
                        -- Derived server-side from name_visibility at submit
                        -- time (full / abbreviated / 'Anonym'), same column the
                        -- existing get_public_feedback_reviews exposes.
                        'display_name', p.reviewer_display_name,
                        'variant_title', NULLIF(btrim(p.variant_title), ''),
                        'created_at', p.created_at,
                        'verified', TRUE,
                        'reply', (
                          SELECT jsonb_build_object(
                                   'author', rep.author_display_name,
                                   'content', rep.content,
                                   'created_at', rep.created_at)
                            FROM feedback_replies rep
                           WHERE rep.review_id = p.id AND rep.visible = TRUE
                           ORDER BY rep.created_at DESC
                           LIMIT 1
                        )
                      )
                      ORDER BY p.created_at DESC, p.id DESC
                    )
               FROM page p
           ), '[]'::jsonb)
         )
    INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_feedback_reviews_by_shopify(TEXT, TEXT, INT, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_feedback_reviews_by_shopify(TEXT, TEXT, INT, INT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. Approved review counts per Shopify product (collection / listing pages)
-- -----------------------------------------------------------------------------
-- Returns: [ { "shopify_product_id": "<numeric id as text>", "count": int } ]
-- COUNT(DISTINCT r.id): the map has one row per variant. Same text filter as
-- section 3, so the count always equals that function's total_count.

CREATE OR REPLACE FUNCTION public.get_public_feedback_summary(p_tenant_slug TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
           jsonb_agg(
             jsonb_build_object('shopify_product_id', x.pid::TEXT, 'count', x.cnt)
             ORDER BY x.pid
           ),
           '[]'::jsonb
         )
    FROM (
      SELECT m.shopify_product_id AS pid, COUNT(DISTINCT r.id)::INT AS cnt
        FROM tenants t
        JOIN feedback_reviews r ON r.tenant_id = t.id
        JOIN shopify_product_map m
          ON m.tenant_id = t.id AND m.product_id = r.product_id
       WHERE t.slug = NULLIF(btrim(COALESCE(p_tenant_slug, '')), '')
         AND r.status = 'approved'
         AND (NULLIF(btrim(r.title), '') IS NOT NULL OR NULLIF(btrim(r.comment), '') IS NOT NULL)
       GROUP BY m.shopify_product_id
    ) x;
$$;

REVOKE ALL ON FUNCTION public.get_public_feedback_summary(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_feedback_summary(TEXT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. Order number + e-mail -> feedback token (storefront "Bewerten" entry)
-- -----------------------------------------------------------------------------
-- Matching mirrors lookup_shipment_by_order_email (20260518_widget_lookup.sql)
-- but is scoped to ONE tenant and does not require a tracking token.
-- Returns {"token": "<token>"} or {"token": null, "reason": <reason>}:
--   not_found          no shipment of this tenant matches order + e-mail
--   not_delivered      a shipment matches but none is delivered yet
--   already_submitted  every request of the delivered shipment was submitted
--   unavailable        delivered, but no request can be offered (feedback
--                      module not active, request cancelled, no items)
--   rate_limited       too many attempts
-- Request creation mirrors createFeedbackRequestsForShipment() and the day-7
-- cron (engagement-mail-cron processShipment): one row per
-- (product, batch, variant), variant title from shopify_product_map by batch
-- (active mapping preferred), customer_name falls back to 'Kunde', status
-- 'pending', sent_at = now(), gated on an active feedback_starter module.

CREATE OR REPLACE FUNCTION public.lookup_feedback_by_order_email(
  p_tenant_slug TEXT,
  p_order       TEXT,
  p_email       TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id     UUID;
  v_email         TEXT := lower(btrim(COALESCE(p_email, '')));
  v_raw_order     TEXT := btrim(COALESCE(p_order, ''));
  v_norm_order    TEXT;
  v_ok            BOOLEAN;
  v_ship          RECORD;
  v_token         TEXT;
  v_new_token     TEXT;
  v_item          RECORD;
  v_tries         INT;
  v_has_module    BOOLEAN;
  v_any_match     BOOLEAN := FALSE;
  v_any_delivered BOOLEAN := FALSE;
  v_any_submitted BOOLEAN := FALSE;
BEGIN
  IF v_email = '' OR v_raw_order = ''
     OR char_length(v_email) > 254 OR char_length(v_raw_order) > 64
     OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN jsonb_build_object('token', NULL, 'reason', 'not_found');
  END IF;

  SELECT t.id INTO v_tenant_id
    FROM tenants t
   WHERE t.slug = NULLIF(btrim(COALESCE(p_tenant_slug, '')), '')
   LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('token', NULL, 'reason', 'not_found');
  END IF;

  -- Tenant ceiling first (bounds brute force and counter rows), then a tight
  -- per-address budget so order numbers cannot be enumerated for one e-mail.
  SELECT allowed INTO v_ok
    FROM public.rate_limit_hit('fblookup:tenant:' || v_tenant_id::TEXT, 600, 3600);
  IF NOT v_ok THEN
    RETURN jsonb_build_object('token', NULL, 'reason', 'rate_limited');
  END IF;
  SELECT allowed INTO v_ok
    FROM public.rate_limit_hit('fblookup:rcpt:' || v_tenant_id::TEXT || ':' || md5(v_email), 10, 3600);
  IF NOT v_ok THEN
    RETURN jsonb_build_object('token', NULL, 'reason', 'rate_limited');
  END IF;

  -- '#1234' === '1234' === 'Shopify #1234'
  v_norm_order := regexp_replace(lower(v_raw_order), '^(shopify\s*#?|#)', '');

  FOR v_ship IN
    SELECT s.id, s.status, s.recipient_email, s.recipient_name
      FROM wh_shipments s
     WHERE s.tenant_id = v_tenant_id
       AND lower(s.recipient_email) = v_email
       AND (
            lower(s.shipment_number)                              = v_norm_order
         OR lower(s.shipment_number)                              = lower(v_raw_order)
         OR lower(s.order_reference)                              = lower(v_raw_order)
         OR lower(replace(s.order_reference, 'Shopify ', ''))     = lower(v_raw_order)
         OR lower(replace(s.order_reference, 'Shopify ', ''))     = '#' || v_norm_order
         OR lower(replace(s.order_reference, 'Shopify #', ''))    = v_norm_order
         OR s.shopify_order_id::TEXT                              = v_norm_order
       )
     ORDER BY (s.status = 'delivered') DESC, s.delivered_at DESC NULLS LAST, s.created_at DESC
     LIMIT 20
  LOOP
    v_any_match := TRUE;
    IF v_ship.status <> 'delivered' THEN
      CONTINUE;
    END IF;
    v_any_delivered := TRUE;

    -- Serialise concurrent lookups for the same shipment so two parallel
    -- calls cannot both create the request rows.
    PERFORM pg_advisory_xact_lock(hashtextextended('feedback_requests:' || v_ship.id::TEXT, 0));

    -- 1) Reuse an open request.
    SELECT fr.token INTO v_token
      FROM feedback_requests fr
     WHERE fr.shipment_id = v_ship.id
       AND fr.tenant_id = v_tenant_id
       AND fr.status IN ('pending', 'opened')
       AND fr.expires_at > NOW()
     ORDER BY fr.created_at ASC, fr.id ASC
     LIMIT 1;
    IF v_token IS NOT NULL THEN
      RETURN jsonb_build_object('token', v_token);
    END IF;

    -- 2) Nothing open: submitted -> done; cancelled -> an admin withdrew it,
    --    never re-create. Only "no rows" or "all expired" falls through.
    IF EXISTS (SELECT 1 FROM feedback_requests fr
                WHERE fr.shipment_id = v_ship.id AND fr.status = 'submitted') THEN
      v_any_submitted := TRUE;
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM feedback_requests fr
                WHERE fr.shipment_id = v_ship.id AND fr.status = 'cancelled') THEN
      CONTINUE;
    END IF;

    -- 3) Create the requests (module gate as in the delivered flow / cron).
    IF v_has_module IS NULL THEN
      v_has_module := EXISTS (
        SELECT 1 FROM billing_module_subscriptions b
         WHERE b.tenant_id = v_tenant_id
           AND b.module_id = 'feedback_starter'
           AND b.status = 'active'
      );
    END IF;
    IF NOT v_has_module THEN
      CONTINUE;
    END IF;

    FOR v_item IN
      SELECT DISTINCT ON (i.product_id, i.batch_id, vt.variant_title)
             i.product_id, i.batch_id, vt.variant_title
        FROM wh_shipment_items i
        LEFT JOIN LATERAL (
          SELECT NULLIF(m.shopify_variant_title, '') AS variant_title
            FROM shopify_product_map m
           WHERE m.batch_id = i.batch_id
             AND m.tenant_id = v_tenant_id
             AND NULLIF(m.shopify_variant_title, '') IS NOT NULL
           ORDER BY COALESCE(m.is_active, FALSE) DESC, m.created_at ASC, m.id ASC
           LIMIT 1
        ) vt ON TRUE
       WHERE i.shipment_id = v_ship.id
         AND i.product_id IS NOT NULL
       ORDER BY i.product_id, i.batch_id, vt.variant_title
    LOOP
      v_new_token := NULL;
      FOR v_tries IN 1..5 LOOP
        v_new_token := public.generate_tracking_token();
        EXIT WHEN NOT EXISTS (SELECT 1 FROM feedback_requests fr WHERE fr.token = v_new_token);
        v_new_token := NULL;
      END LOOP;
      IF v_new_token IS NULL THEN
        RAISE EXCEPTION 'lookup_feedback_by_order_email: token generation failed';
      END IF;

      INSERT INTO feedback_requests (
        tenant_id, shipment_id, product_id, batch_id, variant_title,
        customer_email, customer_name, token, status, sent_at
      ) VALUES (
        v_tenant_id, v_ship.id, v_item.product_id, v_item.batch_id, v_item.variant_title,
        v_ship.recipient_email,
        COALESCE(NULLIF(btrim(v_ship.recipient_name), ''), 'Kunde'),
        v_new_token, 'pending', NOW()
      );
      IF v_token IS NULL THEN v_token := v_new_token; END IF;
    END LOOP;

    IF v_token IS NOT NULL THEN
      RETURN jsonb_build_object('token', v_token);
    END IF;
  END LOOP;

  IF NOT v_any_match THEN
    RETURN jsonb_build_object('token', NULL, 'reason', 'not_found');
  END IF;
  IF NOT v_any_delivered THEN
    RETURN jsonb_build_object('token', NULL, 'reason', 'not_delivered');
  END IF;
  IF v_any_submitted THEN
    RETURN jsonb_build_object('token', NULL, 'reason', 'already_submitted');
  END IF;
  RETURN jsonb_build_object('token', NULL, 'reason', 'unavailable');
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_feedback_by_order_email(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_feedback_by_order_email(TEXT, TEXT, TEXT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. feedback_photos: public read only for approved reviews
-- -----------------------------------------------------------------------------
-- Before: "feedback_photos_select" FOR SELECT TO anon, authenticated USING (true)
-- exposed the storage paths of photos on pending / rejected / hidden reviews.
-- Tenant users keep full access to their own rows through
-- "feedback_photos_write" (FOR ALL, tenant_id = current_tenant_id()).
-- The feedback-photos BUCKET itself stays public (unchanged): an object is
-- still reachable by anyone who knows its path, this only stops listing paths.

DROP POLICY IF EXISTS "feedback_photos_select" ON public.feedback_photos;
DROP POLICY IF EXISTS "feedback_photos_select_public" ON public.feedback_photos;
CREATE POLICY "feedback_photos_select_public" ON public.feedback_photos
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.feedback_reviews r
     WHERE r.id = feedback_photos.review_id
       AND r.status = 'approved'
  ));

-- -----------------------------------------------------------------------------
-- 7. get_public_shipment_by_token: + feedback_token, feedback_url
-- -----------------------------------------------------------------------------
-- Same body as 20260518_public_support_ticket.sql plus two trailing columns.
-- The OUT row type changes, so the function has to be dropped first.
--   feedback_token  open (pending/opened, not expired) request of a shipment
--                   with status 'delivered', NULL otherwise. Read-only: this
--                   function never creates requests.
--   feedback_url    <tenants.settings.feedback.storefrontReviewUrl>?t=<token>
--                   when the tenant has an https storefront review page
--                   configured, NULL otherwise (the tracking page then links
--                   to the built-in /feedback/<token> form).

DROP FUNCTION IF EXISTS public.get_public_shipment_by_token(TEXT);

CREATE OR REPLACE FUNCTION public.get_public_shipment_by_token(p_token TEXT)
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
  total_items                     INTEGER,
  feedback_token                  TEXT,
  feedback_url                    TEXT
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
    ) AS total_items,
    fb.token AS feedback_token,
    CASE
      WHEN fb.token IS NOT NULL AND ts.review_url ~ '^https://[^[:space:]]+$'
      THEN ts.review_url
           || CASE WHEN position('?' IN ts.review_url) > 0 THEN '&' ELSE '?' END
           || 't=' || fb.token
      ELSE NULL
    END AS feedback_url
  FROM wh_shipments s
  LEFT JOIN LATERAL (
    SELECT fr.token
      FROM feedback_requests fr
     WHERE fr.shipment_id = s.id
       AND fr.tenant_id = s.tenant_id
       AND s.status = 'delivered'
       AND fr.status IN ('pending', 'opened')
       AND fr.expires_at > NOW()
     ORDER BY fr.created_at ASC, fr.id ASC
     LIMIT 1
  ) fb ON TRUE
  LEFT JOIN LATERAL (
    SELECT NULLIF(btrim(t.settings #>> '{feedback,storefrontReviewUrl}'), '') AS review_url
      FROM tenants t
     WHERE t.id = s.tenant_id
  ) ts ON TRUE
  WHERE s.tracking_token = p_token
    AND s.tracking_token IS NOT NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_shipment_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_shipment_by_token(TEXT) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 8. Storefront review page of the Fambliss tenant
-- -----------------------------------------------------------------------------
-- tenants.settings.feedback.storefrontReviewUrl is read by section 7 and by
-- engagement-mail-cron (day-7 mail). Tenants without it keep the built-in
-- Trackbliss form. Only set when missing, so a later manual change survives
-- a re-run.

UPDATE public.tenants t
   SET settings = jsonb_set(
         CASE
           WHEN jsonb_typeof(t.settings -> 'feedback') = 'object' THEN t.settings
           ELSE jsonb_set(COALESCE(t.settings, '{}'::jsonb), '{feedback}', '{}'::jsonb, true)
         END,
         '{feedback,storefrontReviewUrl}',
         to_jsonb('https://shop.fambliss.de/bewerten'::TEXT),
         true
       )
 WHERE t.id = '522f6254-f73c-4a26-b1e9-662035194bc5'
   AND NULLIF(btrim(COALESCE(t.settings #>> '{feedback,storefrontReviewUrl}', '')), '') IS NULL;

COMMIT;

-- PostgREST: pick up the new functions and the changed row type.
NOTIFY pgrst, 'reload schema';

-- =============================================================================
-- Verification (run manually):
--   SELECT is_nullable FROM information_schema.columns
--    WHERE table_name = 'feedback_reviews' AND column_name = 'rating';   -- YES
--   SELECT policyname, roles, qual FROM pg_policies WHERE tablename = 'feedback_photos';
--     -- expect feedback_photos_select_public (approved only) + feedback_photos_write
--   SELECT public.get_public_feedback_summary('<tenant-slug>');
--   SELECT public.get_public_feedback_reviews_by_shopify('<tenant-slug>', '<shopify product id>');
--   SELECT feedback_token, feedback_url FROM public.get_public_shipment_by_token('<tracking token>');
--   SELECT settings #>> '{feedback,storefrontReviewUrl}' FROM tenants
--    WHERE id = '522f6254-f73c-4a26-b1e9-662035194bc5';
-- =============================================================================
