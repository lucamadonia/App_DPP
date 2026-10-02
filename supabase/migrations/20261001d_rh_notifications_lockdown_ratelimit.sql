-- =============================================================================
-- Migration: rh_notifications lockdown + persistent rate limiting
-- Date: 2026-10-01 (suffix d) — go-live hardening package D
--
-- Findings: SEC-04 / SRE-03 (anon INSERT into rh_notifications = open mail
-- relay via the dispatch trigger), SRE-04 (anon SELECT on rh_notifications
-- leaks every tenant's rendered customer mails), SEC-09 / SEC-10 (no persistent
-- rate limit for public edge functions).
--
-- What this does:
--   1. rate_limit_counters + rate_limit_hit(): a fixed-window counter usable
--      from SQL (SECURITY DEFINER functions) and from edge functions
--      (service role, see supabase/functions/_shared/rate-limit.ts).
--   2. Drops every anon policy on rh_notifications and revokes anon's table
--      privileges. Anonymous visitors can no longer write or read rows.
--   3. public_enqueue_notification(): the ONLY public way to queue a mail.
--      Fixed event allowlist, recipient derived from the return/ticket row,
--      no client-supplied subject/HTML (the row is flagged render='server' and
--      notify-dispatch renders the tenant template with HTML-escaped values),
--      one mail per entity+event, entity must be fresh, rate limited per
--      IP / tenant / recipient.
--   4. claim_rh_notification(): atomic per-stage claim so notify-dispatch and
--      send-email never deliver the same row twice.
--   5. BEFORE INSERT guard: authenticated (tenant) inserts are capped per
--      tenant and per recipient. Service-role inserts (crons, edge functions)
--      are not limited.
--   6. tenant_mail_tier() / sanitize_public_mail_text(): shared helpers for
--      the caps (complete own-SMTP config only) and for visitor free text.
--
-- ROLLOUT ORDER (mandatory, see docs/releases/golive-20261001-mail-rollout.md):
--   1. Apply THIS migration.
--   2. Check vault 'service_role_jwt' == SUPABASE_SERVICE_ROLE_KEY (or set the
--      SERVICE_ROLE_JWT edge secret), then deploy notify-dispatch AND
--      send-email together (both call claim_rh_notification /
--      tenant_mail_tier, which only exist after step 1).
--   3. Only then deploy the frontend (public mails via
--      public_enqueue_notification produce render='server' rows that only
--      the new notify-dispatch can render).
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Persistent rate limiting
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
    bucket       TEXT        NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    hits         INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (bucket, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_counters_window
    ON public.rate_limit_counters (window_start);

-- RLS on, no policies: only SECURITY DEFINER functions and service_role touch it.
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_counters FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limit_counters TO service_role;

-- Fixed-window counter. Counts the hit and reports whether it is within the
-- limit. Callers hash PII (emails, IPs) before building the bucket name.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
    p_bucket         TEXT,
    p_limit          INTEGER,
    p_window_seconds INTEGER,
    p_cost           INTEGER DEFAULT 1
)
RETURNS TABLE (allowed BOOLEAN, hits INTEGER, retry_after_seconds INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
    v_window_start TIMESTAMPTZ;
    v_hits         INTEGER;
BEGIN
    IF p_bucket IS NULL OR length(p_bucket) = 0 OR length(p_bucket) > 200 THEN
        RAISE EXCEPTION 'rate_limit_hit: invalid bucket' USING ERRCODE = '22023';
    END IF;
    IF p_limit IS NULL OR p_limit < 1 THEN
        RAISE EXCEPTION 'rate_limit_hit: invalid limit' USING ERRCODE = '22023';
    END IF;
    IF p_window_seconds IS NULL OR p_window_seconds < 1 OR p_window_seconds > 604800 THEN
        RAISE EXCEPTION 'rate_limit_hit: invalid window' USING ERRCODE = '22023';
    END IF;
    IF p_cost IS NULL OR p_cost < 0 OR p_cost > 1000 THEN
        RAISE EXCEPTION 'rate_limit_hit: invalid cost' USING ERRCODE = '22023';
    END IF;

    v_window_start := to_timestamp(
        floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
    );

    INSERT INTO public.rate_limit_counters AS c (bucket, window_start, hits)
    VALUES (p_bucket, v_window_start, p_cost)
    ON CONFLICT (bucket, window_start)
    DO UPDATE SET hits = c.hits + EXCLUDED.hits
    RETURNING c.hits INTO v_hits;

    -- Opportunistic cleanup (~1% of calls) so the table never grows unbounded.
    IF random() < 0.01 THEN
        DELETE FROM public.rate_limit_counters
        WHERE window_start < now() - INTERVAL '8 days';
    END IF;

    allowed := v_hits <= p_limit;
    hits := v_hits;
    retry_after_seconds := CASE WHEN v_hits <= p_limit THEN 0 ELSE
        GREATEST(1, ceil(extract(epoch FROM (v_window_start + make_interval(secs => p_window_seconds) - now())))::INTEGER)
    END;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(TEXT, INTEGER, INTEGER, INTEGER) TO service_role;

-- -----------------------------------------------------------------------------
-- 2. rh_notifications: no anonymous access at all
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Allow anon to create notifications" ON public.rh_notifications;
DROP POLICY IF EXISTS "rh_notifications_anon_insert" ON public.rh_notifications;
DROP POLICY IF EXISTS "Allow anon to read own notifications" ON public.rh_notifications;

REVOKE INSERT, SELECT, UPDATE, DELETE ON public.rh_notifications FROM anon;

-- -----------------------------------------------------------------------------
-- 3. Atomic per-stage claim (notify-dispatch = 'dispatch', send-email = 'smtp')
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_rh_notification(p_id UUID, p_stage TEXT)
RETURNS SETOF public.rh_notifications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key TEXT;
BEGIN
    IF p_stage NOT IN ('dispatch', 'smtp') THEN
        RAISE EXCEPTION 'claim_rh_notification: invalid stage' USING ERRCODE = '22023';
    END IF;
    v_key := p_stage || '_claimed_at';

    -- The WHERE clause is re-checked on the locked row, so two concurrent
    -- callers can never both win the claim.
    RETURN QUERY
    UPDATE public.rh_notifications n
       SET metadata = COALESCE(n.metadata, '{}'::jsonb) || jsonb_build_object(v_key, now())
     WHERE n.id = p_id
       AND n.status = 'pending'
       AND NOT (COALESCE(n.metadata, '{}'::jsonb) ? v_key)
    RETURNING n.*;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_rh_notification(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_rh_notification(UUID, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 3b. Mail tier of a tenant: 'paid' | 'own_smtp' | 'free'
-- -----------------------------------------------------------------------------
-- 'own_smtp' requires the SAME four fields send-email needs to actually use
-- the tenant mailbox (host, username, password_encrypted, from_address).
-- An enabled-but-incomplete config is 'free': send-email refuses to fall back
-- to the platform sender for it, and the caps below treat it as free, so a
-- throwaway account cannot unlock paid caps with {enabled:true, host:'x'}.
-- Used by the insert guard and by send-email (platform-sender quota).

CREATE OR REPLACE FUNCTION public.tenant_mail_tier(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_tenant_id IS NULL THEN
        RETURN 'free';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.billing_subscriptions b
         WHERE b.tenant_id = p_tenant_id AND b.plan <> 'free'
           AND b.status IN ('active', 'trialing', 'past_due')
    ) OR EXISTS (
        SELECT 1 FROM public.billing_module_subscriptions m
         WHERE m.tenant_id = p_tenant_id AND m.status IN ('active', 'past_due')
    ) THEN
        RETURN 'paid';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.tenant_smtp_config s
         WHERE s.tenant_id = p_tenant_id AND s.enabled = true
           AND NULLIF(trim(s.host), '') IS NOT NULL
           AND NULLIF(trim(s.username), '') IS NOT NULL
           AND NULLIF(s.password_encrypted, '') IS NOT NULL
           AND NULLIF(trim(s.from_address), '') IS NOT NULL
    ) THEN
        RETURN 'own_smtp';
    END IF;
    RETURN 'free';
END;
$$;

REVOKE ALL ON FUNCTION public.tenant_mail_tier(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_mail_tier(UUID) TO service_role;

-- -----------------------------------------------------------------------------
-- 3c. Free text from anonymous visitors that ends up in a mail
-- -----------------------------------------------------------------------------
-- Anonymous visitors control ticket subjects, return reasons and names. HTML
-- escaping stops markup, not spam/phishing text, and mail clients autolink
-- URLs and bare domains. Strip URLs, e-mail addresses and domain-like tokens,
-- drop unusual characters and shorten. Mirrors sanitizeName() in
-- widerruf-request and sanitizePublicText() in _shared/email-template-render.ts.

CREATE OR REPLACE FUNCTION public.sanitize_public_mail_text(p_text TEXT, p_max INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT left(trim(regexp_replace(
        regexp_replace(
            regexp_replace(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(COALESCE(p_text, ''), '[[:cntrl:]]', ' ', 'g'),
                    '(https?://|www\.)\S*', ' ', 'gi'),
                '\S+@\S+', ' ', 'g'),
            '\S+\.[a-z]{2,}\S*', ' ', 'gi'),
        '[^[:alnum:]_ .,;:!?()''/%+-]', ' ', 'g'),
    '\s+', ' ', 'g')), GREATEST(COALESCE(p_max, 0), 0));
$$;

REVOKE ALL ON FUNCTION public.sanitize_public_mail_text(TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sanitize_public_mail_text(TEXT, INTEGER) TO service_role;

-- -----------------------------------------------------------------------------
-- 4. Insert guard for tenant users (authenticated role)
-- -----------------------------------------------------------------------------
-- Tenant users may still queue their own (client-rendered) mails through the
-- "Tenant isolation for rh_notifications" policy, but a self-signup tenant can
-- no longer turn the platform SMTP into a bulk sender. Limits are generous
-- for paying tenants or tenants with their own SMTP (shipment lifecycle
-- mails in batches: 600/h, 3000/day); free tenants on the platform sender
-- get 20/h and 50/day (SEC-04 follow-up).
-- A rejected insert rolls back its own counter increment, so failed attempts
-- against foreign tenants (blocked by RLS) cannot exhaust a victim's budget.

CREATE OR REPLACE FUNCTION public.rh_notifications_insert_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role      TEXT;
    v_ok        BOOLEAN;
    v_tier      TEXT;
    v_hour_cap  INTEGER;
    v_day_cap   INTEGER;
BEGIN
    v_role := COALESCE(
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        ''
    );
    IF v_role <> 'authenticated' OR NEW.channel IS DISTINCT FROM 'email' THEN
        RETURN NEW;
    END IF;

    -- Tenants that send through their own SMTP (tenant_smtp_config) do not
    -- use the platform sender's reputation. Paying tenants (non-free plan or
    -- any active add-on module) are accountable via Stripe. Everyone else is
    -- a free self-signup tenant and may only send a handful of mails through
    -- noreply@trackbliss.eu, so a throwaway account is not a bulk relay.
    -- 'own_smtp' needs a COMPLETE config (see tenant_mail_tier). Should the
    -- tenant later blank its config, send-email still caps platform-sender
    -- mails of non-paying tenants (smtp:platform:* buckets).
    v_tier := public.tenant_mail_tier(NEW.tenant_id);

    IF v_tier IN ('paid', 'own_smtp') THEN
        v_hour_cap := 600;
        v_day_cap  := 3000;
    ELSE
        v_hour_cap := 20;
        v_day_cap  := 50;
    END IF;

    SELECT allowed INTO v_ok
      FROM public.rate_limit_hit('notif:tenant:h:' || NEW.tenant_id::text, v_hour_cap, 3600);
    IF NOT v_ok THEN
        RAISE EXCEPTION 'Notification rate limit reached for this organisation (hourly)'
            USING ERRCODE = 'P0001', HINT = 'rate_limited';
    END IF;

    SELECT allowed INTO v_ok
      FROM public.rate_limit_hit('notif:tenant:d:' || NEW.tenant_id::text, v_day_cap, 86400);
    IF NOT v_ok THEN
        RAISE EXCEPTION 'Notification rate limit reached for this organisation (daily)'
            USING ERRCODE = 'P0001', HINT = 'rate_limited';
    END IF;

    -- Per-recipient budget is scoped to the tenant: one tenant (or an
    -- anonymous visitor) can never exhaust another tenant's budget for the
    -- same customer address. There is deliberately no global per-recipient
    -- cap here; it would reintroduce exactly that cross-tenant DoS.
    IF NEW.recipient_email IS NOT NULL THEN
        SELECT allowed INTO v_ok
          FROM public.rate_limit_hit(
              'notif:rcpt:' || NEW.tenant_id::text || ':' || md5(lower(trim(NEW.recipient_email))), 20, 3600);
        IF NOT v_ok THEN
            RAISE EXCEPTION 'Notification rate limit reached for this recipient'
                USING ERRCODE = 'P0001', HINT = 'rate_limited';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.rh_notifications_insert_guard() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_rh_notifications_insert_guard ON public.rh_notifications;
CREATE TRIGGER trg_rh_notifications_insert_guard
    BEFORE INSERT ON public.rh_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.rh_notifications_insert_guard();

-- -----------------------------------------------------------------------------
-- 5. Public mail queueing (returns portal, customer portal, support form)
-- -----------------------------------------------------------------------------
-- Rejections are RETURNED (not raised) so the per-IP counter persists for
-- probing attempts. Entity checks run before the tenant/recipient counters so
-- random ids cannot exhaust a tenant's budget.

CREATE OR REPLACE FUNCTION public.public_enqueue_notification(
    p_tenant_id     UUID,
    p_event_type    TEXT,
    p_return_id     UUID DEFAULT NULL,
    p_return_number TEXT DEFAULT NULL,
    p_ticket_id     UUID DEFAULT NULL,
    p_ticket_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_fresh      CONSTANT INTERVAL := INTERVAL '30 minutes';
    v_headers    JSONB;
    v_ip         TEXT;
    v_ok         BOOLEAN;
    v_return     RECORD;
    v_ticket     RECORD;
    v_c_email    TEXT;
    v_c_name     TEXT;
    v_recipient  TEXT;
    v_name       TEXT;
    v_reason     TEXT;
    v_enabled    BOOLEAN;
    v_notif      JSONB;
    v_locale     TEXT;
    v_sender     TEXT;
    v_vars       JSONB;
    v_return_id  UUID;
    v_ticket_id  UUID;
    v_customer_id UUID;
    v_id         UUID := gen_random_uuid();
BEGIN
    IF p_tenant_id IS NULL OR p_event_type IS NULL
       OR p_event_type NOT IN ('return_confirmed', 'return_cancelled', 'ticket_created') THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'event_not_allowed');
    END IF;

    -- Per-IP throttle first (PostgREST forwards the request headers).
    -- NEVER the first X-Forwarded-For entry: the platform proxies append to a
    -- client-supplied XFF, so that entry is attacker-controlled. Prefer
    -- cf-connecting-ip (set by Cloudflare, overwrites any client value), then
    -- the right-most XFF hop (added by the last proxy), then x-real-ip.
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN others THEN
        v_headers := NULL;
    END;
    v_ip := COALESCE(
        NULLIF(trim(v_headers ->> 'cf-connecting-ip'), ''),
        NULLIF(trim(regexp_replace(COALESCE(v_headers ->> 'x-forwarded-for', ''), '^.*,', '')), ''),
        NULLIF(trim(v_headers ->> 'x-real-ip'), '')
    );
    IF v_ip IS NOT NULL THEN
        SELECT allowed INTO v_ok FROM public.rate_limit_hit('pubnotif:ip:' || md5(v_ip), 30, 3600);
        IF NOT v_ok THEN
            RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
        END IF;
    END IF;

    IF p_event_type IN ('return_confirmed', 'return_cancelled') THEN
        SELECT r.id, r.return_number, r.status, r.created_at,
               COALESCE(r.updated_at, r.created_at) AS changed_at,
               r.metadata, r.customer_id, r.reason_text, r.reason_category
          INTO v_return
          FROM public.rh_returns r
         WHERE r.tenant_id = p_tenant_id
           AND (
                (p_return_id IS NOT NULL AND r.id = p_return_id)
             OR (p_return_id IS NULL AND p_return_number IS NOT NULL AND r.return_number = p_return_number)
           )
         ORDER BY r.created_at DESC
         LIMIT 1;

        IF v_return.id IS NULL THEN
            RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
        END IF;
        IF p_event_type = 'return_confirmed' AND v_return.created_at < now() - v_fresh THEN
            RETURN jsonb_build_object('ok', false, 'reason', 'stale');
        END IF;
        IF p_event_type = 'return_cancelled'
           AND (v_return.status <> 'CANCELLED' OR v_return.changed_at < now() - v_fresh) THEN
            RETURN jsonb_build_object('ok', false, 'reason', 'stale');
        END IF;

        v_return_id := v_return.id;
        v_customer_id := v_return.customer_id;
        IF v_customer_id IS NOT NULL THEN
            SELECT c.email,
                   NULLIF(trim(concat_ws(' ', c.first_name, c.last_name)), '')
              INTO v_c_email, v_c_name
              FROM public.rh_customers c
             WHERE c.id = v_customer_id AND c.tenant_id = p_tenant_id;
        END IF;

        v_recipient := COALESCE(NULLIF(trim(v_return.metadata ->> 'email'), ''), NULLIF(trim(v_c_email), ''));
        v_name := COALESCE(NULLIF(trim(v_return.metadata ->> 'customerName'), ''), v_c_name);

        IF p_event_type = 'return_cancelled' THEN
            SELECT t.comment INTO v_reason
              FROM public.rh_return_timeline t
             WHERE t.return_id = v_return_id AND t.status = 'CANCELLED'
             ORDER BY t.created_at DESC
             LIMIT 1;
        ELSE
            v_reason := v_return.reason_text;
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.rh_notifications n
             WHERE n.tenant_id = p_tenant_id AND n.return_id = v_return_id AND n.template = p_event_type
        ) THEN
            RETURN jsonb_build_object('ok', true, 'skipped', 'duplicate');
        END IF;

        -- Free text (name, reason, category) is visitor-controlled: sanitised.
        v_name := public.sanitize_public_mail_text(v_name, 60);
        v_vars := jsonb_build_object(
            'customerName', v_name,
            'firstName', split_part(v_name, ' ', 1),
            'returnNumber', v_return.return_number,
            'status', v_return.status,
            'reason', public.sanitize_public_mail_text(v_reason, 200),
            'reasonCategory', public.sanitize_public_mail_text(v_return.reason_category, 60),
            'trackingUrl', 'https://dpp-app.fambliss.eu/returns/track/' || v_return.return_number
        );
    ELSE
        SELECT t.id, t.ticket_number, t.subject, t.status, t.created_at, t.customer_id, t.metadata
          INTO v_ticket
          FROM public.rh_tickets t
         WHERE t.tenant_id = p_tenant_id
           AND (
                (p_ticket_id IS NOT NULL AND t.id = p_ticket_id)
             OR (p_ticket_id IS NULL AND p_ticket_number IS NOT NULL AND t.ticket_number = p_ticket_number)
           )
         ORDER BY t.created_at DESC
         LIMIT 1;

        IF v_ticket.id IS NULL THEN
            RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
        END IF;
        IF v_ticket.created_at < now() - v_fresh THEN
            RETURN jsonb_build_object('ok', false, 'reason', 'stale');
        END IF;

        v_ticket_id := v_ticket.id;
        v_customer_id := v_ticket.customer_id;
        IF v_customer_id IS NOT NULL THEN
            SELECT c.email,
                   NULLIF(trim(concat_ws(' ', c.first_name, c.last_name)), '')
              INTO v_c_email, v_c_name
              FROM public.rh_customers c
             WHERE c.id = v_customer_id AND c.tenant_id = p_tenant_id;
        END IF;

        v_recipient := NULLIF(trim(v_c_email), '');
        IF v_recipient IS NULL THEN
            SELECT NULLIF(trim(m.sender_email), '') INTO v_recipient
              FROM public.rh_ticket_messages m
             WHERE m.ticket_id = v_ticket_id AND m.sender_type = 'customer'
             ORDER BY m.created_at ASC
             LIMIT 1;
        END IF;
        v_name := COALESCE(v_c_name, split_part(COALESCE(v_recipient, ''), '@', 1));

        IF EXISTS (
            SELECT 1 FROM public.rh_notifications n
             WHERE n.tenant_id = p_tenant_id AND n.ticket_id = v_ticket_id AND n.template = p_event_type
        ) THEN
            RETURN jsonb_build_object('ok', true, 'skipped', 'duplicate');
        END IF;

        -- Ticket subject and name come from anonymous visitors: sanitised and
        -- shortened (the subject usually lands in the Subject header).
        v_name := public.sanitize_public_mail_text(v_name, 60);
        v_vars := jsonb_build_object(
            'customerName', v_name,
            'firstName', split_part(v_name, ' ', 1),
            'ticketNumber', v_ticket.ticket_number,
            'subject', public.sanitize_public_mail_text(v_ticket.subject, 80),
            'status', COALESCE(v_ticket.status, '')
        );
    END IF;

    IF v_recipient IS NULL OR v_recipient !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'no_recipient');
    END IF;

    SELECT e.enabled INTO v_enabled
      FROM public.rh_email_templates e
     WHERE e.tenant_id = p_tenant_id AND e.event_type = p_event_type;
    IF v_enabled IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('ok', true, 'skipped', 'template_disabled');
    END IF;

    SELECT allowed INTO v_ok FROM public.rate_limit_hit('pubnotif:tenant:' || p_tenant_id::text, 100, 3600);
    IF NOT v_ok THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
    END IF;
    -- Recipient budget is per tenant (no cross-tenant exhaustion of a
    -- customer's address).
    SELECT allowed INTO v_ok FROM public.rate_limit_hit(
        'pubnotif:rcpt:' || p_tenant_id::text || ':' || md5(lower(v_recipient)), 5, 3600);
    IF NOT v_ok THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
    END IF;
    -- Global ceiling across ALL tenants: bounds the anonymous path even when
    -- an attacker rotates IPs and spreads over many tenants.
    SELECT allowed INTO v_ok FROM public.rate_limit_hit('pubnotif:global', 1000, 3600);
    IF NOT v_ok THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited');
    END IF;

    SELECT t.settings -> 'returnsHub' -> 'notifications' INTO v_notif
      FROM public.tenants t WHERE t.id = p_tenant_id;
    v_locale := CASE WHEN COALESCE(v_notif ->> 'emailLocale', 'de') = 'en' THEN 'en' ELSE 'de' END;
    v_sender := left(COALESCE(v_notif ->> 'senderName', ''), 100);

    INSERT INTO public.rh_notifications (
        id, tenant_id, return_id, ticket_id, customer_id, channel, template,
        recipient_email, subject, content, status, metadata
    ) VALUES (
        v_id, p_tenant_id, v_return_id, v_ticket_id, v_customer_id, 'email', p_event_type,
        lower(v_recipient), NULL, NULL, 'pending',
        jsonb_build_object(
            'render', 'server',
            'origin', 'public',
            'isHtml', true,
            'locale', v_locale,
            'senderName', v_sender,
            'vars', v_vars
        )
    );

    RETURN jsonb_build_object('ok', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.public_enqueue_notification(UUID, TEXT, UUID, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_enqueue_notification(UUID, TEXT, UUID, TEXT, UUID, TEXT) TO anon, authenticated;

-- =============================================================================
-- Verification (run manually):
--   SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'rh_notifications';
--     -- expect no policy with roles {anon}
--   SELECT has_table_privilege('anon', 'public.rh_notifications', 'INSERT'),
--          has_table_privilege('anon', 'public.rh_notifications', 'SELECT');  -- false, false
--   SELECT * FROM public.rate_limit_hit('selftest', 2, 60);  -- as service_role
-- =============================================================================
