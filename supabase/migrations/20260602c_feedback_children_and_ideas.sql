-- =============================================================================
-- Feedback form enrichment:
--   1) reviewer_children (structured: {count, ages[]}) on feedback_reviews
--   2) submit_feedback_reviews — store reviewer_children (keeps name_visibility)
--   3) get_public_feedback_reviews — expose reviewer_children to the embed widget
--   4) submit_feedback_idea_from_request — let the public feedback form submit
--      ideas / overall feedback into the existing idea board (feedback_ideas)
--      using the FEEDBACK-REQUEST token (no separate idea-invite needed).
-- =============================================================================

ALTER TABLE feedback_reviews
  ADD COLUMN IF NOT EXISTS reviewer_children JSONB;

-- ── submit_feedback_reviews: + reviewer_children (name_visibility kept) ──
CREATE OR REPLACE FUNCTION submit_feedback_reviews(p_token TEXT, p_reviews JSONB)
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
BEGIN
  SELECT * INTO v_req FROM feedback_requests WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_req.expires_at < NOW() THEN RETURN jsonb_build_object('error', 'expired'); END IF;
  IF v_req.status = 'submitted' THEN RETURN jsonb_build_object('error', 'already_submitted'); END IF;

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
      (v_review->>'rating')::SMALLINT,
      NULLIF(v_review->>'title', ''),
      NULLIF(v_review->>'comment', ''),
      v_display_name,
      NULLIF(v_review->>'reviewer_city', ''),
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
GRANT EXECUTE ON FUNCTION submit_feedback_reviews(TEXT, JSONB) TO anon, authenticated;

-- ── get_public_feedback_reviews: + reviewer_children ──
-- The function already exists with a different OUT row type (deployed via
-- dashboard before this migration ran), so CREATE OR REPLACE alone fails.
DROP FUNCTION IF EXISTS get_public_feedback_reviews(TEXT, UUID, SMALLINT, INT);
CREATE OR REPLACE FUNCTION get_public_feedback_reviews(
  p_tenant_slug TEXT,
  p_product_id  UUID DEFAULT NULL,
  p_min_rating  SMALLINT DEFAULT 1,
  p_limit       INT DEFAULT 12
)
RETURNS TABLE (
  id                    UUID,
  product_id            UUID,
  product_name          TEXT,
  variant_title         TEXT,
  rating                SMALLINT,
  title                 TEXT,
  comment               TEXT,
  reviewer_display_name TEXT,
  reviewer_city         TEXT,
  reviewer_children     JSONB,
  created_at            TIMESTAMPTZ,
  photos                JSONB,
  reply                 JSONB,
  aggregate_rating      NUMERIC,
  total_count           INT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  WITH tenant AS (
    SELECT id FROM tenants WHERE slug = p_tenant_slug LIMIT 1
  ),
  agg AS (
    SELECT AVG(r.rating)::NUMERIC(3,2) AS avg_rating, COUNT(*)::INT AS total
    FROM feedback_reviews r, tenant t
    WHERE r.tenant_id = t.id AND r.status = 'approved'
      AND (p_product_id IS NULL OR r.product_id = p_product_id)
      AND r.rating >= p_min_rating
  )
  SELECT
    r.id, r.product_id, p.name AS product_name, r.variant_title, r.rating,
    r.title, r.comment, r.reviewer_display_name, r.reviewer_city, r.reviewer_children,
    r.created_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('path', fp.storage_path) ORDER BY fp.sort_order)
       FROM feedback_photos fp WHERE fp.review_id = r.id),
      '[]'::jsonb
    ) AS photos,
    (SELECT jsonb_build_object('author', rep.author_display_name, 'content', rep.content, 'created_at', rep.created_at)
     FROM feedback_replies rep
     WHERE rep.review_id = r.id AND rep.visible = TRUE
     ORDER BY rep.created_at DESC LIMIT 1) AS reply,
    (SELECT avg_rating FROM agg) AS aggregate_rating,
    (SELECT total FROM agg) AS total_count
  FROM feedback_reviews r
  JOIN tenant t ON t.id = r.tenant_id
  JOIN products p ON p.id = r.product_id
  WHERE r.status = 'approved'
    AND (p_product_id IS NULL OR r.product_id = p_product_id)
    AND r.rating >= p_min_rating
  ORDER BY r.created_at DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION get_public_feedback_reviews(TEXT, UUID, SMALLINT, INT) TO anon, authenticated;

-- ── submit_feedback_idea_from_request: idea / overall feedback from the
--    FEEDBACK-REQUEST token (used by the public feedback form). ──
-- p_payload: { area, category, title, body, is_public_requested }
CREATE OR REPLACE FUNCTION submit_feedback_idea_from_request(p_token TEXT, p_payload JSONB)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_req feedback_requests%ROWTYPE;
  v_display_name TEXT;
  v_idea_id UUID;
  v_area TEXT;
  v_category TEXT;
BEGIN
  SELECT * INTO v_req FROM feedback_requests WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_req.expires_at < NOW() THEN RETURN jsonb_build_object('error', 'expired'); END IF;

  IF COALESCE(btrim(p_payload->>'body'), '') = '' THEN
    RETURN jsonb_build_object('error', 'empty_body');
  END IF;

  v_display_name := split_part(v_req.customer_name, ' ', 1)
    || CASE WHEN array_length(regexp_split_to_array(v_req.customer_name, ' '), 1) > 1
            THEN ' ' || substr(split_part(v_req.customer_name, ' ', 2), 1, 1) || '.'
            ELSE '' END;

  v_area := COALESCE(NULLIF(p_payload->>'area', ''), 'products');
  IF v_area NOT IN ('app_portal','products','general') THEN v_area := 'general'; END IF;
  v_category := COALESCE(NULLIF(p_payload->>'category', ''), 'new_idea');
  IF v_category NOT IN ('improvement','new_idea','bug','praise','other') THEN v_category := 'other'; END IF;

  INSERT INTO feedback_ideas (
    tenant_id, invite_id, submitter_email, submitter_name, submitter_display_name,
    area, category, title, body, is_public_requested
  ) VALUES (
    v_req.tenant_id,
    NULL,
    v_req.customer_email,
    v_req.customer_name,
    v_display_name,
    v_area,
    v_category,
    COALESCE(NULLIF(p_payload->>'title', ''), left(p_payload->>'body', 60)),
    p_payload->>'body',
    COALESCE((p_payload->>'is_public_requested')::BOOLEAN, TRUE)
  )
  RETURNING id INTO v_idea_id;

  RETURN jsonb_build_object('ok', true, 'idea_id', v_idea_id);
END;
$$;
GRANT EXECUTE ON FUNCTION submit_feedback_idea_from_request(TEXT, JSONB) TO anon, authenticated;
