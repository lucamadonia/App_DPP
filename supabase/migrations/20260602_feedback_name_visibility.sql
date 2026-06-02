-- Feedback reviews: customer name-visibility consent.
--
-- Lets the customer choose how their name appears on a published review:
--   'full'        → full clear name (Klarname), e.g. "Stefan Genscher"
--   'abbreviated' → first name + last initial, e.g. "Stefan G." (default,
--                   matches the previous hard-coded behaviour)
--   'anonymous'   → "Anonym"
--
-- The display name is ALWAYS derived server-side from the trusted
-- feedback_requests.customer_name (never from client input) to prevent
-- impersonation. The client only sends the chosen visibility level.

ALTER TABLE feedback_reviews
  ADD COLUMN IF NOT EXISTS name_visibility TEXT NOT NULL DEFAULT 'abbreviated'
  CHECK (name_visibility IN ('full', 'abbreviated', 'anonymous'));

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
  v_review_id UUID;
  v_inserted_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  SELECT * INTO v_req FROM feedback_requests WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_req.expires_at < NOW() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  IF v_req.status = 'submitted' THEN
    RETURN jsonb_build_object('error', 'already_submitted');
  END IF;

  -- Loop over each review item
  FOR v_review IN SELECT * FROM jsonb_array_elements(p_reviews) LOOP
    v_request_id := (v_review->>'request_id')::UUID;

    -- Validate the request belongs to the same shipment + tenant
    SELECT * INTO v_target_req FROM feedback_requests
      WHERE id = v_request_id
        AND tenant_id = v_req.tenant_id
        AND shipment_id = v_req.shipment_id;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Name-visibility consent (default: abbreviated). Display name is derived
    -- from the trusted customer_name, never from client-supplied text.
    v_visibility := COALESCE(NULLIF(v_review->>'name_visibility', ''), 'abbreviated');
    IF v_visibility NOT IN ('full', 'abbreviated', 'anonymous') THEN
      v_visibility := 'abbreviated';
    END IF;

    IF v_visibility = 'anonymous' THEN
      v_display_name := 'Anonym';
    ELSIF v_visibility = 'full' THEN
      v_display_name := btrim(v_target_req.customer_name);
    ELSE
      -- abbreviated: "Stefan G."
      v_display_name := split_part(v_target_req.customer_name, ' ', 1)
        || CASE
           WHEN array_length(regexp_split_to_array(v_target_req.customer_name, ' '), 1) > 1
           THEN ' ' || substr(split_part(v_target_req.customer_name, ' ', 2), 1, 1) || '.'
           ELSE ''
           END;
    END IF;

    -- Guard against an empty derived name (e.g. blank customer_name on 'full').
    IF v_display_name IS NULL OR btrim(v_display_name) = '' THEN
      v_display_name := 'Anonym';
    END IF;

    INSERT INTO feedback_reviews (
      tenant_id, request_id, product_id, batch_id, variant_title,
      rating, title, comment, reviewer_display_name, reviewer_city, name_visibility
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
      v_visibility
    )
    RETURNING id INTO v_review_id;

    v_inserted_ids := v_inserted_ids || v_review_id;

    -- Mark the request as submitted
    UPDATE feedback_requests
      SET status = 'submitted', submitted_at = NOW()
      WHERE id = v_target_req.id;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'review_ids', to_jsonb(v_inserted_ids));
END;
$$;

GRANT EXECUTE ON FUNCTION submit_feedback_reviews(TEXT, JSONB) TO anon, authenticated;
