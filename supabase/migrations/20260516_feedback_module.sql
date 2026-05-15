-- =====================================================================
-- Feedback Module
-- =====================================================================
-- Two complementary feedback surfaces, both tenant-scoped:
--
--   A) Customer Reviews — verified buyer leaves a star rating per
--      product/variant after delivery. Token-link based (no login).
--      Embeddable on tenant homepages.
--
--   B) Partner Idea Board — power users (influencers, beta testers)
--      submit improvement ideas / bug reports / feature requests via
--      token-link. Admin approves, then the idea appears on a public
--      board where other partners can up-vote.
--
-- Public access is mediated entirely through SECURITY DEFINER RPCs;
-- token IS the auth (like a Google Docs share link). Reuses the
-- existing `generate_tracking_token()` function from the shipment
-- tracking migration (20260506).
-- =====================================================================

-- =====================================================================
-- A) CUSTOMER REVIEWS
-- =====================================================================

-- 1) feedback_requests — one row per (shipment_item variant) when admin
--    triggers a review-request email. Single-use token per row.
CREATE TABLE IF NOT EXISTS feedback_requests (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    shipment_id         UUID NOT NULL REFERENCES wh_shipments(id) ON DELETE CASCADE,
    product_id          UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id            UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    variant_title       TEXT,
    customer_email      TEXT NOT NULL,
    customer_name       TEXT NOT NULL,
    token               TEXT NOT NULL UNIQUE,
    status              TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','opened','submitted','expired','cancelled')),
    sent_at             TIMESTAMPTZ,
    opened_at           TIMESTAMPTZ,
    submitted_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days'),
    reminder_sent_at    TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_requests_tenant_status
    ON feedback_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_shipment
    ON feedback_requests(shipment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_token
    ON feedback_requests(token);

-- 2) feedback_reviews — the actual customer review
CREATE TABLE IF NOT EXISTS feedback_reviews (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_id               UUID NOT NULL REFERENCES feedback_requests(id) ON DELETE CASCADE,
    product_id               UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id                 UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    variant_title            TEXT,
    rating                   SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title                    TEXT,
    comment                  TEXT,
    reviewer_display_name    TEXT NOT NULL,
    reviewer_city            TEXT,
    reviewer_country         TEXT,
    status                   TEXT NOT NULL DEFAULT 'pending_review'
                               CHECK (status IN ('pending_review','approved','rejected','hidden')),
    moderation_notes         TEXT,
    ai_sentiment             TEXT CHECK (ai_sentiment IN ('positive','neutral','negative')),
    ai_spam_score            NUMERIC(3,2),
    ai_flags                 JSONB DEFAULT '{}'::jsonb,
    ai_suggested_tags        TEXT[] DEFAULT ARRAY[]::TEXT[],
    tags                     TEXT[] DEFAULT ARRAY[]::TEXT[],
    approved_at              TIMESTAMPTZ,
    approved_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rejected_at              TIMESTAMPTZ,
    rejected_reason          TEXT,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_reviews_tenant_status
    ON feedback_reviews(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_reviews_product_status
    ON feedback_reviews(product_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_reviews_batch
    ON feedback_reviews(batch_id) WHERE batch_id IS NOT NULL;

-- 3) feedback_photos — up to N photos per review
CREATE TABLE IF NOT EXISTS feedback_photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    review_id       UUID NOT NULL REFERENCES feedback_reviews(id) ON DELETE CASCADE,
    storage_path    TEXT NOT NULL,
    sort_order      INTEGER DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_photos_review
    ON feedback_photos(review_id);

-- 4) feedback_replies — tenant's public reply to a review
CREATE TABLE IF NOT EXISTS feedback_replies (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    review_id                UUID NOT NULL REFERENCES feedback_reviews(id) ON DELETE CASCADE,
    author_user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    author_display_name      TEXT NOT NULL,
    content                  TEXT NOT NULL,
    visible                  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_replies_review
    ON feedback_replies(review_id);

-- =====================================================================
-- B) PARTNER IDEA BOARD
-- =====================================================================

-- 5) feedback_idea_invites — token-link sent to a partner so they can
--    submit ideas / vote on the board without logging in.
CREATE TABLE IF NOT EXISTS feedback_idea_invites (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    partner_email       TEXT NOT NULL,
    partner_name        TEXT NOT NULL,
    token               TEXT NOT NULL UNIQUE,
    shipment_id         UUID REFERENCES wh_shipments(id) ON DELETE SET NULL,
    status              TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','opened','active','expired','cancelled')),
    sent_at             TIMESTAMPTZ,
    opened_at           TIMESTAMPTZ,
    last_used_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '365 days'),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_idea_invites_tenant_status
    ON feedback_idea_invites(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_idea_invites_token
    ON feedback_idea_invites(token);

-- 6) feedback_ideas — the partner's submission
CREATE TABLE IF NOT EXISTS feedback_ideas (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invite_id                UUID REFERENCES feedback_idea_invites(id) ON DELETE SET NULL,
    submitter_email          TEXT NOT NULL,
    submitter_name           TEXT NOT NULL,
    submitter_display_name   TEXT NOT NULL,
    area                     TEXT NOT NULL DEFAULT 'app_portal'
                               CHECK (area IN ('app_portal','products','general')),
    category                 TEXT NOT NULL DEFAULT 'improvement'
                               CHECK (category IN ('improvement','new_idea','bug','praise','other')),
    title                    TEXT NOT NULL,
    body                     TEXT NOT NULL,
    rating                   SMALLINT CHECK (rating BETWEEN 1 AND 5),
    is_public_requested      BOOLEAN NOT NULL DEFAULT TRUE,
    status                   TEXT NOT NULL DEFAULT 'pending_review'
                               CHECK (status IN ('pending_review','published','in_progress','done','rejected','hidden')),
    roadmap_status           TEXT
                               CHECK (roadmap_status IN ('considering','planned','in_progress','shipped','wont_do')),
    admin_response           TEXT,
    moderation_notes         TEXT,
    upvote_count             INTEGER NOT NULL DEFAULT 0,
    tags                     TEXT[] DEFAULT ARRAY[]::TEXT[],
    approved_at              TIMESTAMPTZ,
    approved_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    completed_at             TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_ideas_tenant_status
    ON feedback_ideas(tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_ideas_public
    ON feedback_ideas(tenant_id, status, upvote_count DESC)
    WHERE status IN ('published','in_progress','done');

-- 7) feedback_idea_votes — partner up-votes (one per partner per idea)
CREATE TABLE IF NOT EXISTS feedback_idea_votes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    idea_id         UUID NOT NULL REFERENCES feedback_ideas(id) ON DELETE CASCADE,
    voter_email     TEXT NOT NULL,
    invite_id       UUID REFERENCES feedback_idea_invites(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (idea_id, voter_email)
);

CREATE INDEX IF NOT EXISTS idx_feedback_idea_votes_idea
    ON feedback_idea_votes(idea_id);

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Keep updated_at fresh on reviews + ideas
CREATE OR REPLACE FUNCTION feedback_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_reviews_updated_at ON feedback_reviews;
CREATE TRIGGER trg_feedback_reviews_updated_at
  BEFORE UPDATE ON feedback_reviews
  FOR EACH ROW EXECUTE FUNCTION feedback_set_updated_at();

DROP TRIGGER IF EXISTS trg_feedback_ideas_updated_at ON feedback_ideas;
CREATE TRIGGER trg_feedback_ideas_updated_at
  BEFORE UPDATE ON feedback_ideas
  FOR EACH ROW EXECUTE FUNCTION feedback_set_updated_at();

-- Maintain upvote_count on feedback_ideas via vote trigger
CREATE OR REPLACE FUNCTION feedback_recount_idea_votes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_idea UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_idea := OLD.idea_id;
  ELSE
    v_idea := NEW.idea_id;
  END IF;

  UPDATE feedback_ideas
    SET upvote_count = (SELECT COUNT(*) FROM feedback_idea_votes WHERE idea_id = v_idea)
    WHERE id = v_idea;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_feedback_idea_votes_recount ON feedback_idea_votes;
CREATE TRIGGER trg_feedback_idea_votes_recount
  AFTER INSERT OR DELETE ON feedback_idea_votes
  FOR EACH ROW EXECUTE FUNCTION feedback_recount_idea_votes();

-- =====================================================================
-- RLS — Customer Reviews
-- =====================================================================

ALTER TABLE feedback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_replies  ENABLE ROW LEVEL SECURITY;

-- Helper: current user's tenant
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- feedback_requests: authenticated CRUD on own tenant
CREATE POLICY "feedback_requests_select" ON feedback_requests
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());
CREATE POLICY "feedback_requests_insert" ON feedback_requests
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY "feedback_requests_update" ON feedback_requests
  FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id());
CREATE POLICY "feedback_requests_delete" ON feedback_requests
  FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id());

-- feedback_reviews: authenticated CRUD on own tenant, anon SELECT only when approved
CREATE POLICY "feedback_reviews_select_auth" ON feedback_reviews
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());
CREATE POLICY "feedback_reviews_select_public" ON feedback_reviews
  FOR SELECT TO anon
  USING (status = 'approved');
CREATE POLICY "feedback_reviews_insert" ON feedback_reviews
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY "feedback_reviews_update" ON feedback_reviews
  FOR UPDATE TO authenticated
  USING (tenant_id = current_tenant_id());
CREATE POLICY "feedback_reviews_delete" ON feedback_reviews
  FOR DELETE TO authenticated
  USING (tenant_id = current_tenant_id());

-- feedback_photos: anon SELECT, auth CRUD
CREATE POLICY "feedback_photos_select" ON feedback_photos
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "feedback_photos_write" ON feedback_photos
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- feedback_replies: anon SELECT visible+approved, auth CRUD
CREATE POLICY "feedback_replies_select_auth" ON feedback_replies
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());
CREATE POLICY "feedback_replies_select_public" ON feedback_replies
  FOR SELECT TO anon
  USING (visible = TRUE AND EXISTS (
    SELECT 1 FROM feedback_reviews r
    WHERE r.id = feedback_replies.review_id AND r.status = 'approved'
  ));
CREATE POLICY "feedback_replies_write" ON feedback_replies
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =====================================================================
-- RLS — Idea Board
-- =====================================================================

ALTER TABLE feedback_idea_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_ideas        ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_idea_votes   ENABLE ROW LEVEL SECURITY;

-- Invites: auth CRUD on own tenant
CREATE POLICY "feedback_idea_invites_all" ON feedback_idea_invites
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Ideas: auth full, anon only public statuses
CREATE POLICY "feedback_ideas_select_auth" ON feedback_ideas
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());
CREATE POLICY "feedback_ideas_select_public" ON feedback_ideas
  FOR SELECT TO anon
  USING (status IN ('published','in_progress','done'));
CREATE POLICY "feedback_ideas_write" ON feedback_ideas
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- Votes: anon SELECT, auth full (anon writes via RPC)
CREATE POLICY "feedback_idea_votes_select" ON feedback_idea_votes
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "feedback_idea_votes_write" ON feedback_idea_votes
  FOR ALL TO authenticated
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

-- =====================================================================
-- SECURITY DEFINER RPCs — Public Layer
-- =====================================================================

-- A) Customer Review: lookup by token
CREATE OR REPLACE FUNCTION get_feedback_request_by_token(p_token TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_req feedback_requests%ROWTYPE;
  v_tenant_name TEXT;
  v_tenant_slug TEXT;
  v_tenant_settings JSONB;
  v_product RECORD;
  v_items JSONB;
BEGIN
  -- Find request by token
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

  -- Touch opened_at
  IF v_req.opened_at IS NULL THEN
    UPDATE feedback_requests
      SET opened_at = NOW(), status = 'opened'
      WHERE id = v_req.id;
  END IF;

  -- Tenant info
  SELECT name, slug, settings INTO v_tenant_name, v_tenant_slug, v_tenant_settings
    FROM tenants WHERE id = v_req.tenant_id;

  -- Sibling requests for the same shipment (same customer journey,
  -- multiple variants → one form for everything)
  SELECT jsonb_agg(jsonb_build_object(
      'request_id', fr.id,
      'product_id', fr.product_id,
      'batch_id', fr.batch_id,
      'variant_title', fr.variant_title,
      'product_name', p.name,
      'product_image', p.image_url,
      'is_self', fr.token = p_token
    ) ORDER BY p.name)
    INTO v_items
    FROM feedback_requests fr
    JOIN products p ON p.id = fr.product_id
    WHERE fr.shipment_id = v_req.shipment_id
      AND fr.status IN ('pending','opened');

  RETURN jsonb_build_object(
    'request_id', v_req.id,
    'token', v_req.token,
    'tenant_id', v_req.tenant_id,
    'tenant_name', v_tenant_name,
    'tenant_slug', v_tenant_slug,
    'tenant_branding', v_tenant_settings->'branding',
    'customer_name', v_req.customer_name,
    'customer_email', v_req.customer_email,
    'expires_at', v_req.expires_at,
    'items', COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_feedback_request_by_token(TEXT) TO anon, authenticated;

-- A) Customer Review: submit
-- p_reviews format: [ { request_id, rating, title, comment, reviewer_city }, ... ]
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

  -- Derive display name "Stefan G."
  v_display_name := split_part(v_req.customer_name, ' ', 1)
    || CASE
       WHEN array_length(regexp_split_to_array(v_req.customer_name, ' '), 1) > 1
       THEN ' ' || substr(split_part(v_req.customer_name, ' ', 2), 1, 1) || '.'
       ELSE ''
       END;

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

    INSERT INTO feedback_reviews (
      tenant_id, request_id, product_id, batch_id, variant_title,
      rating, title, comment, reviewer_display_name, reviewer_city
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
      NULLIF(v_review->>'reviewer_city', '')
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

-- A) Public reviews for a tenant (for embed widget)
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
    SELECT
      AVG(r.rating)::NUMERIC(3,2) AS avg_rating,
      COUNT(*)::INT AS total
    FROM feedback_reviews r, tenant t
    WHERE r.tenant_id = t.id
      AND r.status = 'approved'
      AND (p_product_id IS NULL OR r.product_id = p_product_id)
      AND r.rating >= p_min_rating
  )
  SELECT
    r.id,
    r.product_id,
    p.name AS product_name,
    r.variant_title,
    r.rating,
    r.title,
    r.comment,
    r.reviewer_display_name,
    r.reviewer_city,
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

-- B) Idea Board: lookup invite by token
CREATE OR REPLACE FUNCTION get_feedback_idea_invite_by_token(p_token TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite feedback_idea_invites%ROWTYPE;
  v_tenant_name TEXT;
  v_tenant_slug TEXT;
  v_tenant_settings JSONB;
BEGIN
  SELECT * INTO v_invite FROM feedback_idea_invites WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;
  IF v_invite.expires_at < NOW() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;
  IF v_invite.status = 'cancelled' THEN
    RETURN jsonb_build_object('error', 'cancelled');
  END IF;

  IF v_invite.opened_at IS NULL THEN
    UPDATE feedback_idea_invites
      SET opened_at = NOW(), status = CASE WHEN status='pending' THEN 'active' ELSE status END
      WHERE id = v_invite.id;
  END IF;

  SELECT name, slug, settings INTO v_tenant_name, v_tenant_slug, v_tenant_settings
    FROM tenants WHERE id = v_invite.tenant_id;

  RETURN jsonb_build_object(
    'invite_id', v_invite.id,
    'token', v_invite.token,
    'tenant_id', v_invite.tenant_id,
    'tenant_name', v_tenant_name,
    'tenant_slug', v_tenant_slug,
    'tenant_branding', v_tenant_settings->'branding',
    'partner_name', v_invite.partner_name,
    'partner_email', v_invite.partner_email,
    'expires_at', v_invite.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_feedback_idea_invite_by_token(TEXT) TO anon, authenticated;

-- B) Idea Board: submit an idea
-- p_payload: { area, category, title, body, rating, is_public_requested }
CREATE OR REPLACE FUNCTION submit_feedback_idea(p_token TEXT, p_payload JSONB)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite feedback_idea_invites%ROWTYPE;
  v_display_name TEXT;
  v_idea_id UUID;
BEGIN
  SELECT * INTO v_invite FROM feedback_idea_invites WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_invite.expires_at < NOW() THEN RETURN jsonb_build_object('error', 'expired'); END IF;
  IF v_invite.status = 'cancelled' THEN RETURN jsonb_build_object('error', 'cancelled'); END IF;

  v_display_name := split_part(v_invite.partner_name, ' ', 1)
    || CASE WHEN array_length(regexp_split_to_array(v_invite.partner_name, ' '), 1) > 1
            THEN ' ' || substr(split_part(v_invite.partner_name, ' ', 2), 1, 1) || '.'
            ELSE '' END;

  INSERT INTO feedback_ideas (
    tenant_id, invite_id, submitter_email, submitter_name, submitter_display_name,
    area, category, title, body, rating, is_public_requested
  ) VALUES (
    v_invite.tenant_id,
    v_invite.id,
    v_invite.partner_email,
    v_invite.partner_name,
    v_display_name,
    COALESCE(p_payload->>'area', 'app_portal'),
    COALESCE(p_payload->>'category', 'improvement'),
    p_payload->>'title',
    p_payload->>'body',
    NULLIF(p_payload->>'rating', '')::SMALLINT,
    COALESCE((p_payload->>'is_public_requested')::BOOLEAN, TRUE)
  )
  RETURNING id INTO v_idea_id;

  UPDATE feedback_idea_invites SET last_used_at = NOW() WHERE id = v_invite.id;

  RETURN jsonb_build_object('ok', true, 'idea_id', v_idea_id);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_feedback_idea(TEXT, JSONB) TO anon, authenticated;

-- B) Idea Board: public list (for board page + embed)
CREATE OR REPLACE FUNCTION get_public_feedback_ideas(
  p_tenant_slug TEXT,
  p_status      TEXT DEFAULT NULL,
  p_category    TEXT DEFAULT NULL,
  p_limit       INT DEFAULT 50
)
RETURNS TABLE (
  id                       UUID,
  area                     TEXT,
  category                 TEXT,
  title                    TEXT,
  body                     TEXT,
  rating                   SMALLINT,
  submitter_display_name   TEXT,
  status                   TEXT,
  roadmap_status           TEXT,
  admin_response           TEXT,
  upvote_count             INTEGER,
  tags                     TEXT[],
  created_at               TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    i.id, i.area, i.category, i.title, i.body, i.rating,
    i.submitter_display_name, i.status, i.roadmap_status, i.admin_response,
    i.upvote_count, i.tags, i.created_at, i.completed_at
  FROM feedback_ideas i
  JOIN tenants t ON t.id = i.tenant_id
  WHERE t.slug = p_tenant_slug
    AND i.status IN ('published','in_progress','done')
    AND (p_status IS NULL OR i.status = p_status)
    AND (p_category IS NULL OR i.category = p_category)
  ORDER BY i.upvote_count DESC, i.created_at DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION get_public_feedback_ideas(TEXT, TEXT, TEXT, INT) TO anon, authenticated;

-- B) Idea Board: cast an up-vote (idempotent)
CREATE OR REPLACE FUNCTION vote_feedback_idea(p_token TEXT, p_idea_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite feedback_idea_invites%ROWTYPE;
  v_idea feedback_ideas%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM feedback_idea_invites WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;
  IF v_invite.expires_at < NOW() THEN RETURN jsonb_build_object('error', 'expired'); END IF;

  SELECT * INTO v_idea FROM feedback_ideas
    WHERE id = p_idea_id
      AND tenant_id = v_invite.tenant_id
      AND status IN ('published','in_progress','done')
    LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'idea_not_found'); END IF;

  INSERT INTO feedback_idea_votes (tenant_id, idea_id, voter_email, invite_id)
    VALUES (v_invite.tenant_id, p_idea_id, v_invite.partner_email, v_invite.id)
    ON CONFLICT (idea_id, voter_email) DO NOTHING;

  UPDATE feedback_idea_invites SET last_used_at = NOW() WHERE id = v_invite.id;

  RETURN jsonb_build_object(
    'ok', true,
    'idea_id', p_idea_id,
    'upvote_count', (SELECT upvote_count FROM feedback_ideas WHERE id = p_idea_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION vote_feedback_idea(TEXT, UUID) TO anon, authenticated;

-- B) Idea Board: remove an up-vote
CREATE OR REPLACE FUNCTION unvote_feedback_idea(p_token TEXT, p_idea_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite feedback_idea_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM feedback_idea_invites WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'not_found'); END IF;

  DELETE FROM feedback_idea_votes
    WHERE idea_id = p_idea_id AND voter_email = v_invite.partner_email;

  RETURN jsonb_build_object(
    'ok', true,
    'idea_id', p_idea_id,
    'upvote_count', (SELECT upvote_count FROM feedback_ideas WHERE id = p_idea_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION unvote_feedback_idea(TEXT, UUID) TO anon, authenticated;

-- =====================================================================
-- STORAGE BUCKET: feedback-photos
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'feedback-photos',
  'feedback-photos',
  TRUE,
  10485760, -- 10MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anyone can read (public bucket already, but explicit RLS for clarity).
-- Writes only by authenticated users (admins). Public submission flow
-- uploads happen via SECURITY DEFINER RPC which bypasses RLS.

DROP POLICY IF EXISTS "feedback_photos_read" ON storage.objects;
CREATE POLICY "feedback_photos_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'feedback-photos');

DROP POLICY IF EXISTS "feedback_photos_write_auth" ON storage.objects;
CREATE POLICY "feedback_photos_write_auth"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'feedback-photos')
  WITH CHECK (bucket_id = 'feedback-photos');

-- =====================================================================
-- DONE
-- =====================================================================
COMMENT ON TABLE feedback_requests IS 'Customer review request tokens, one per shipment-variant.';
COMMENT ON TABLE feedback_reviews  IS 'Verified customer reviews (token-validated submission, admin-moderated publication).';
COMMENT ON TABLE feedback_ideas    IS 'Partner / influencer idea board submissions (private until approved, then public + votable).';
