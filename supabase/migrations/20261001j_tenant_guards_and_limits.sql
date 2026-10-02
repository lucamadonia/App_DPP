-- =============================================================================
-- Migration: tenant guards, workflow entitlement, deferred mails, misc fixes
-- Date: 2026-10-01 (suffix j) — go-live re-audit, package C
--
-- Requires 20261001a..g (is_platform_super_admin, _rh_is_customer_only_session,
-- _public_returns_* helpers, rate_limit_hit, tenant_mail_tier, the
-- rh_notifications insert guard, durable workflows). Apply AFTER them.
--
-- Findings closed here:
--   RLS-3  Durable workflows are gated by a billing entitlement (active
--          returns_hub_* module or an enterprise plan), not only by the
--          tenant-writable settings flag. Runs of tenants that lose the
--          entitlement are cancelled by workflow_tick() with a visible error.
--          Workflow mails keep counting against the tenant caps (20261001d).
--   RLS-4  BEFORE UPDATE guard on tenants: only service_role, the database
--          owner (cron/SQL editor) or a platform super admin may change
--          status, suspended_*, admin_notes, trial_ends_at, health_*,
--          custom_domain, custom_domain_verified(_at), dns_verification_token.
--          A client can no longer mark settings.returnsHub.portalDomain as
--          verified: a client-set domainStatus='verified' for a domain that
--          was not already verified is stored as 'pending', and
--          domainVerifiedAt is server-owned. manage-vercel-domain (verify
--          action, service role) persists the verified state.
--   REG-1  Platform staff with any admin_role (support/billing/security)
--          can read all tenants again (SELECT only; credentials live in
--          tenant_secrets since 20261001b).
--   REG-2  Mails over the paid/own-SMTP caps are no longer lost: the insert
--          guard stores them with status 'deferred' (reason in metadata) and
--          rh_notifications_release_deferred() (cron, every 10 min) releases
--          them into the normal dispatch path as budget frees up. Deferred
--          rows older than 72 h become 'failed' (error 'deferred_expired'),
--          visible in the notification log. Free tenants on the platform
--          sender are still rejected (anti-abuse), with an error. Deferred
--          rows cost budget only when released (hits are refunded), the
--          backlog is capped (3000 per tenant, 20 per recipient; beyond that
--          rejected as before) and the release picks rows round-robin per
--          tenant, skipping full tenants/recipients without consuming hits.
--   RLS-6  The public track/cancel failure throttle no longer has an
--          e-mail-only bucket a third party could exhaust. Failures are
--          counted per IP (20/h) and per e-mail + IP (10/h); the global
--          per-e-mail count only raises a WARNING for alerting.
--   XFF    _public_returns_client_ip(): cf-connecting-ip, then the RIGHT-most
--          X-Forwarded-For hop, then x-real-ip (same order as
--          _shared/rate-limit.ts and public_enqueue_notification). The first
--          XFF entry is client-controlled.
--   RLS-7  No anonymous read of rh_email_templates (public mails are
--          rendered server-side by notify-dispatch).
--   RLS-8  Customer-portal sessions inserting into rh_tickets get status
--          'open', priority 'normal', no assignee/SLA/resolution data, no
--          tags, fixed metadata, and a return link only to their own return.
--   RLS-10 No anonymous SELECT on tenants at all (tenant ids/names could be
--          enumerated). Anon policies that checked tenant existence with
--          EXISTS (SELECT 1 FROM tenants ...) are rewritten to the
--          SECURITY DEFINER helper tenant_exists(uuid).
--   Bug    create_public_support_ticket inserted the nonexistent column
--          rh_customers.name (every ticket for a new e-mail failed with
--          42703). Now first_name/last_name, input limits and rate limits.
--
-- Idempotent: safe to re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Helper: is this request service_role or a direct DB session (cron, SQL
--    editor, migrations)? Same caller detection as tenants_guard_shopify_domain
--    (20261001b). SECURITY DEFINER functions do not change session_user, so a
--    tenant user calling a definer function is still not privileged.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._request_is_service_or_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    BEGIN
        v_role := COALESCE(
            NULLIF(current_setting('request.jwt.claim.role', true), ''),
            NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
        );
    EXCEPTION WHEN others THEN
        v_role := NULL;
    END;
    RETURN v_role = 'service_role'
        OR (v_role IS NULL AND session_user NOT IN ('authenticator', 'anon', 'authenticated'));
END;
$$;
REVOKE ALL ON FUNCTION public._request_is_service_or_owner() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._request_is_service_or_owner() TO service_role;

-- -----------------------------------------------------------------------------
-- 1. RLS-4: platform-owned tenant columns
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenants_guard_admin_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_col  TEXT;
    v_new  JSONB;
    v_old  JSONB;
    v_npd  JSONB;
    v_opd  JSONB;
    v_same BOOLEAN;
BEGIN
    IF public._request_is_service_or_owner() OR public.is_platform_super_admin() THEN
        RETURN NEW;
    END IF;

    -- to_jsonb keeps this working if a column does not exist (yet).
    v_new := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    FOREACH v_col IN ARRAY ARRAY[
        'status', 'suspended_at', 'suspended_reason', 'admin_notes', 'trial_ends_at',
        'health_score', 'health_factors', 'health_updated_at',
        'custom_domain', 'custom_domain_verified', 'custom_domain_verified_at',
        'dns_verification_token'
    ] LOOP
        IF (v_new -> v_col) IS DISTINCT FROM (v_old -> v_col) THEN
            RAISE EXCEPTION 'tenants.% can only be changed by platform administrators', v_col
                USING ERRCODE = '42501';
        END IF;
    END LOOP;

    -- Portal custom domain: the verified state is server-owned. Silently
    -- downgrading (instead of raising) keeps unrelated settings saves of old
    -- clients working; get_public_tenant_by_domain only resolves 'verified'.
    IF NEW.settings IS DISTINCT FROM OLD.settings
       AND jsonb_typeof(NEW.settings #> '{returnsHub,portalDomain}') = 'object' THEN
        v_npd := NEW.settings #> '{returnsHub,portalDomain}';
        v_opd := CASE WHEN jsonb_typeof(OLD.settings #> '{returnsHub,portalDomain}') = 'object'
                      THEN OLD.settings #> '{returnsHub,portalDomain}' ELSE '{}'::jsonb END;
        v_same := COALESCE(NULLIF(lower(btrim(v_npd ->> 'customDomain')), ''), '#new')
                  = COALESCE(NULLIF(lower(btrim(v_opd ->> 'customDomain')), ''), '#old');
        IF v_npd ->> 'domainStatus' = 'verified'
           AND NOT (v_same AND v_opd ->> 'domainStatus' = 'verified') THEN
            v_npd := jsonb_set(v_npd, '{domainStatus}', '"pending"'::jsonb);
        END IF;
        IF v_same AND v_opd ? 'domainVerifiedAt' THEN
            v_npd := jsonb_set(v_npd, '{domainVerifiedAt}', v_opd -> 'domainVerifiedAt');
        ELSE
            v_npd := v_npd - 'domainVerifiedAt';
        END IF;
        NEW.settings := jsonb_set(NEW.settings, '{returnsHub,portalDomain}', v_npd);
    END IF;

    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tenants_guard_admin_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tenants_guard_admin_columns ON public.tenants;
CREATE TRIGGER tenants_guard_admin_columns
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.tenants_guard_admin_columns();

-- Server-side result of the CNAME check (manage-vercel-domain, action
-- "verify", service role). Only touches the domain stored in the tenant's
-- settings; returns false when it does not match (nothing changed).
CREATE OR REPLACE FUNCTION public.set_portal_domain_status(
    p_tenant_id UUID,
    p_domain    TEXT,
    p_status    TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_domain TEXT := lower(rtrim(btrim(COALESCE(p_domain, '')), '.'));
BEGIN
    IF NOT public._request_is_service_or_owner() THEN
        RAISE EXCEPTION 'set_portal_domain_status is restricted to the service role'
            USING ERRCODE = '42501';
    END IF;
    IF p_status NOT IN ('pending', 'verified', 'failed') OR v_domain = '' THEN
        RAISE EXCEPTION 'set_portal_domain_status: invalid arguments' USING ERRCODE = '22023';
    END IF;
    UPDATE public.tenants t
       SET settings = jsonb_set(
               t.settings,
               '{returnsHub,portalDomain}',
               CASE WHEN p_status = 'verified'
                    THEN (t.settings #> '{returnsHub,portalDomain}')
                         || jsonb_build_object('domainStatus', 'verified', 'domainVerifiedAt', to_jsonb(now()))
                    ELSE (t.settings #> '{returnsHub,portalDomain}')
                         || jsonb_build_object('domainStatus', p_status)
               END)
     WHERE t.id = p_tenant_id
       AND jsonb_typeof(t.settings #> '{returnsHub,portalDomain}') = 'object'
       AND lower(rtrim(btrim(t.settings #>> '{returnsHub,portalDomain,customDomain}'), '.')) = v_domain;
    RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.set_portal_domain_status(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_portal_domain_status(UUID, TEXT, TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 2. REG-1: platform staff (any admin_role) may read all tenants
-- -----------------------------------------------------------------------------
-- admin_role / is_super_admin are not client-writable (20261001a).
CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT (p.is_super_admin IS TRUE) OR p.admin_role IS NOT NULL
           FROM public.profiles p
          WHERE p.id = auth.uid()),
        FALSE
    );
$$;
REVOKE ALL ON FUNCTION public.is_platform_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_staff() TO authenticated, service_role;

DROP POLICY IF EXISTS "Super admins can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Platform staff can view all tenants" ON public.tenants;
CREATE POLICY "Platform staff can view all tenants"
    ON public.tenants FOR SELECT
    TO authenticated
    USING (public.is_platform_staff());

-- -----------------------------------------------------------------------------
-- 3. RLS-10: no anonymous SELECT on tenants
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenant_exists(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT p_tenant_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = p_tenant_id);
$$;
REVOKE ALL ON FUNCTION public.tenant_exists(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_exists(UUID) TO anon, authenticated, service_role;

-- Rewrite anon/public policies that check tenant existence by reading
-- tenants directly (pattern of 20260611). Anything else that still reads
-- tenants for anon keeps the id-only grant and is reported (WARNING).
DO $$
DECLARE
    pol       RECORD;
    v_re      CONSTANT TEXT := 'EXISTS\s*\(\s*SELECT\s+1\s+FROM\s+(public\.)?tenants\s+WHERE\s+\(?\s*tenants\.id\s*=\s*([A-Za-z0-9_."]+)\s*\)?\s*\)';
    v_qual    TEXT;
    v_check   TEXT;
    v_left    INTEGER := 0;
BEGIN
    FOR pol IN
        SELECT tablename, policyname, qual, with_check
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename <> 'tenants'
           AND roles && ARRAY['anon', 'public']::name[]
           AND (COALESCE(qual, '') ~* 'from\s+(public\.)?tenants\M'
                OR COALESCE(with_check, '') ~* 'from\s+(public\.)?tenants\M')
    LOOP
        v_qual  := regexp_replace(pol.qual, v_re, 'public.tenant_exists(\2)', 'gi');
        v_check := regexp_replace(pol.with_check, v_re, 'public.tenant_exists(\2)', 'gi');
        IF COALESCE(v_qual, '') ~* 'from\s+(public\.)?tenants\M'
           OR COALESCE(v_check, '') ~* 'from\s+(public\.)?tenants\M' THEN
            v_left := v_left + 1;
            RAISE WARNING 'RLS-10: policy % on % still reads tenants; not rewritten', pol.policyname, pol.tablename;
            CONTINUE;
        END IF;
        IF v_qual IS NOT NULL THEN
            EXECUTE format('ALTER POLICY %I ON public.%I USING (%s)', pol.policyname, pol.tablename, v_qual);
        END IF;
        IF v_check IS NOT NULL THEN
            EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK (%s)', pol.policyname, pol.tablename, v_check);
        END IF;
        RAISE NOTICE 'RLS-10: rewrote policy % on % to tenant_exists()', pol.policyname, pol.tablename;
    END LOOP;

    IF v_left = 0 THEN
        DROP POLICY IF EXISTS "Anon can check tenant existence" ON public.tenants;
        REVOKE ALL ON public.tenants FROM anon;
        REVOKE SELECT (id) ON public.tenants FROM anon;
    ELSE
        RAISE WARNING 'RLS-10: % anon policies still read tenants; anon keeps SELECT(id) on tenants', v_left;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. RLS-7: no anonymous read of rh_email_templates
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "rh_email_templates_anon_select" ON public.rh_email_templates;
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'rh_email_templates'
           AND 'anon' = ANY (roles)
    LOOP
        RAISE NOTICE 'Dropping anon policy % on rh_email_templates', pol.policyname;
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rh_email_templates', pol.policyname);
    END LOOP;
END $$;
REVOKE ALL ON public.rh_email_templates FROM anon;

-- -----------------------------------------------------------------------------
-- 5. RLS-8: customer-portal ticket inserts
-- -----------------------------------------------------------------------------
-- SECURITY INVOKER like rh_returns_guard_customer_insert (20261001c):
-- current_user is the client role. Staff, service_role and SECURITY DEFINER
-- RPCs (public_create_ticket, create_public_support_ticket) are unaffected.
CREATE OR REPLACE FUNCTION public.rh_tickets_guard_customer_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
    v_nulls JSONB;
BEGIN
    IF current_user IN ('anon', 'authenticated') AND public._rh_is_customer_only_session() THEN
        SELECT COALESCE(jsonb_object_agg(a.attname::text, NULL::text), '{}'::jsonb)
          INTO v_nulls
          FROM pg_catalog.pg_attribute a
         WHERE a.attrelid = 'public.rh_tickets'::regclass
           AND a.attnum > 0
           AND NOT a.attisdropped
           AND NOT a.attnotnull
           AND (a.attname ~ '^(sla_|assigned|first_respon|resolved|closed_|merged|escalat|internal)');

        NEW := jsonb_populate_record(NEW, v_nulls || jsonb_build_object(
            'status', 'open',
            'priority', 'normal',
            'tags', '{}'::text[],
            'metadata', jsonb_build_object('source', 'customer_portal')
        ));
        NEW.subject := left(trim(regexp_replace(COALESCE(NEW.subject, ''), '[[:cntrl:]]', ' ', 'g')), 200);
        NEW.category := left(NEW.category, 50);
        NEW.subcategory := left(NEW.subcategory, 50);
        -- RLS of the customer session: only its own returns are visible.
        IF NEW.return_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM public.rh_returns r
             WHERE r.id = NEW.return_id AND r.tenant_id = NEW.tenant_id
               AND r.customer_id = NEW.customer_id
        ) THEN
            NEW.return_id := NULL;
        END IF;
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.rh_tickets_guard_customer_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS rh_tickets_guard_customer_insert ON public.rh_tickets;
CREATE TRIGGER rh_tickets_guard_customer_insert
    BEFORE INSERT ON public.rh_tickets
    FOR EACH ROW EXECUTE FUNCTION public.rh_tickets_guard_customer_insert();

-- -----------------------------------------------------------------------------
-- 6. XFF + RLS-6: public returns client IP and lookup throttle
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._public_returns_client_ip()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_headers JSONB;
BEGIN
    BEGIN
        v_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
    EXCEPTION WHEN others THEN
        v_headers := NULL;
    END;
    IF v_headers IS NULL THEN
        RETURN NULL;
    END IF;
    -- Never the first X-Forwarded-For entry: proxies append to a
    -- client-supplied header, so that entry is attacker-controlled.
    RETURN NULLIF(LEFT(COALESCE(
        NULLIF(TRIM(v_headers ->> 'cf-connecting-ip'), ''),
        NULLIF(TRIM(regexp_replace(COALESCE(v_headers ->> 'x-forwarded-for', ''), '^.*,', '')), ''),
        NULLIF(TRIM(v_headers ->> 'x-real-ip'), '')
    ), 64), '');
END $$;
REVOKE ALL ON FUNCTION public._public_returns_client_ip() FROM PUBLIC, anon, authenticated;

-- Pre-lookup throttle shared by public_track_return / public_cancel_return
-- (same signature as 20261001c; the callers record the returned buckets on a
-- failed lookup, or stop when NULL is returned).
--   lookup:ip:<md5 ip>                    20 failures/h per client IP
--   lookup:emailip:<md5 email>:<md5 ip>   10 failures/h per e-mail and IP
--   lookup:email:<md5 email>              recorded, never blocking: a third
--                                         party must not be able to lock a
--                                         customer out (WARNING at 30/h)
-- Without a client IP (SQL editor, internal callers) the e-mail bucket blocks
-- at 30, as before.
CREATE OR REPLACE FUNCTION public._public_returns_lookup_buckets(p_email TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ip TEXT := public._public_returns_client_ip();
    v_email_hash TEXT := md5(LOWER(TRIM(COALESCE(p_email, ''))));
    v_email_bucket TEXT := 'lookup:email:' || md5(LOWER(TRIM(COALESCE(p_email, ''))));
    v_ip_bucket TEXT;
    v_pair_bucket TEXT;
    v_email_hits INTEGER;
BEGIN
    v_email_hits := public._public_returns_hits(v_email_bucket);
    IF v_ip IS NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext(v_email_bucket));
        IF public._public_returns_hits(v_email_bucket) >= 30 THEN
            RETURN NULL;
        END IF;
        RETURN ARRAY[v_email_bucket];
    END IF;

    v_ip_bucket := 'lookup:ip:' || md5(v_ip);
    v_pair_bucket := 'lookup:emailip:' || v_email_hash || ':' || md5(v_ip);
    -- Serialize concurrent calls of the same caller (lock ends with the txn).
    PERFORM pg_advisory_xact_lock(hashtext(v_ip_bucket));
    IF public._public_returns_hits(v_ip_bucket) >= 20
       OR public._public_returns_hits(v_pair_bucket) >= 10 THEN
        RETURN NULL;
    END IF;
    IF v_email_hits >= 30 THEN
        RAISE WARNING 'ALERT public returns lookup: >= 30 failed lookups in 1h for one e-mail (hash %)', left(v_email_hash, 12);
    END IF;
    RETURN ARRAY[v_ip_bucket, v_pair_bucket, v_email_bucket];
END $$;
REVOKE ALL ON FUNCTION public._public_returns_lookup_buckets(TEXT) FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 7. RLS-3: workflow automation requires a billing entitlement
-- -----------------------------------------------------------------------------
-- Entitled = tenant switched the feature on (settings flag, tenant-writable)
-- AND pays for it: an active/past_due returns_hub_* module (same licence check
-- as _public_returns_tenant_enabled) or an enterprise plan.
CREATE OR REPLACE FUNCTION public.workflow_tenant_entitled(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.tenants t
         WHERE t.id = p_tenant_id
           AND t.settings #>> '{returnsHub,features,workflowRules}' = 'true'
    )
    AND (
        EXISTS (
            SELECT 1 FROM public.billing_module_subscriptions m
             WHERE m.tenant_id = p_tenant_id
               AND m.module_id LIKE 'returns\_hub\_%'
               AND m.status IN ('active', 'past_due')
        )
        OR EXISTS (
            SELECT 1 FROM public.billing_subscriptions b
             WHERE b.tenant_id = p_tenant_id
               AND b.plan = 'enterprise'
               AND b.status IN ('active', 'trialing', 'past_due')
        )
    );
$$;
REVOKE ALL ON FUNCTION public.workflow_tenant_entitled(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_tenant_entitled(UUID) TO service_role;

-- Copy of 20260921 with the entitlement check (RLS-3).
CREATE OR REPLACE FUNCTION public.workflow_enqueue(rule public.rh_workflow_rules, event_key text, ctx jsonb, chain uuid[] DEFAULT '{}') RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE graph jsonb := rule.conditions; start_id text; run_id uuid;
BEGIN
  IF NOT rule.active OR NOT rule.server_execution OR rule.id=ANY(chain) OR cardinality(chain)>=20 THEN RETURN NULL; END IF;
  -- RLS-3: billing entitlement, not only the tenant-writable flag.
  IF NOT public.workflow_tenant_entitled(rule.tenant_id) THEN RETURN NULL; END IF;
  IF graph->>'_graphVersion'<>'2' OR graph->'nodes' IS NULL THEN RAISE EXCEPTION 'Save the rule in the visual builder first'; END IF;
  SELECT n->>'id' INTO start_id FROM jsonb_array_elements(graph->'nodes') n WHERE n->>'type'='trigger' LIMIT 1;
  IF start_id IS NULL THEN RAISE EXCEPTION 'Workflow trigger is missing'; END IF;
  INSERT INTO public.rh_workflow_runs(tenant_id,rule_id,event_key,graph,context,pending,chain)
  VALUES(rule.tenant_id,rule.id,event_key,graph,ctx,ARRAY[start_id],chain||rule.id)
  ON CONFLICT ON CONSTRAINT rh_workflow_runs_rule_id_event_key_key DO NOTHING RETURNING id INTO run_id;
  RETURN run_id;
END $$;

-- Copy of 20260921 workflow_tick(). RLS-3: before stepping, runs of tenants
-- without the entitlement are cancelled with a visible error, so
-- workflow_step() never executes them (it is only reachable via this tick
-- and service_role).
CREATE OR REPLACE FUNCTION public.workflow_tick() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp SET statement_timeout='20s' AS $$
DECLARE rule public.rh_workflow_rules; trigger_data jsonb; local_now timestamp; tz text; clock_time time; day_key text; run record; entity record; i int;
BEGIN
  IF NOT pg_try_advisory_xact_lock(hashtext('trackbliss.workflow_tick')) THEN RETURN; END IF;
  UPDATE public.rh_workflow_runs r
     SET status='cancelled',
         error='Workflow automation requires an active Returns Hub subscription',
         updated_at=now()
   WHERE r.status IN ('queued','waiting')
     AND NOT public.workflow_tenant_entitled(r.tenant_id);
  FOR rule IN SELECT * FROM public.rh_workflow_rules WHERE active AND server_execution AND trigger_type IN ('scheduled_daily','scheduled_weekly','scheduled_monthly','return_overdue','ticket_overdue') LOOP
    BEGIN
      SELECT n->'data' INTO trigger_data FROM jsonb_array_elements(rule.conditions->'nodes') n WHERE n->>'type'='trigger' LIMIT 1;
      IF rule.trigger_type LIKE 'scheduled_%' THEN
        tz:=coalesce(trigger_data#>>'{schedule,timezone}','Europe/Berlin');
        local_now:=now() AT TIME ZONE tz; clock_time:=coalesce(trigger_data#>>'{schedule,time}','09:00')::time;
        IF local_now::time<clock_time THEN CONTINUE; END IF;
        IF rule.trigger_type='scheduled_weekly' AND extract(dow FROM local_now)<>coalesce((trigger_data#>>'{schedule,dayOfWeek}')::int,1) THEN CONTINUE; END IF;
        IF rule.trigger_type='scheduled_monthly' AND extract(day FROM local_now)<>least(coalesce((trigger_data#>>'{schedule,dayOfMonth}')::int,1),extract(day FROM date_trunc('month',local_now)+interval '1 month - 1 day')) THEN CONTINUE; END IF;
        day_key:='schedule:'||local_now::date::text;
        PERFORM public.workflow_enqueue(rule,day_key,jsonb_build_object('tenantId',rule.tenant_id,'eventType',rule.trigger_type));
      ELSIF rule.trigger_type='ticket_overdue' THEN
        FOR entity IN SELECT id,customer_id,sla_resolution_at FROM public.rh_tickets t WHERE tenant_id=rule.tenant_id AND status NOT IN ('resolved','closed') AND sla_resolution_at<now()
          AND NOT EXISTS(SELECT 1 FROM public.rh_workflow_runs r WHERE r.rule_id=rule.id AND r.event_key='ticket-overdue:'||t.id::text||':'||t.sla_resolution_at::text) ORDER BY sla_resolution_at LIMIT 200 LOOP
          PERFORM public.workflow_enqueue(rule,'ticket-overdue:'||entity.id::text||':'||entity.sla_resolution_at::text,jsonb_build_object('tenantId',rule.tenant_id,'eventType',rule.trigger_type,'ticketId',entity.id,'customerId',entity.customer_id));
        END LOOP;
      ELSE
        FOR entity IN SELECT id,customer_id FROM public.rh_returns ret WHERE tenant_id=rule.tenant_id AND status NOT IN ('COMPLETED','REJECTED','CANCELLED','REFUND_COMPLETED') AND created_at<now()-greatest(1,coalesce((trigger_data->>'overdueDays')::int,7))*interval '1 day'
          AND NOT EXISTS(SELECT 1 FROM public.rh_workflow_runs r WHERE r.rule_id=rule.id AND r.event_key='return-overdue:'||ret.id::text) ORDER BY created_at LIMIT 200 LOOP
          PERFORM public.workflow_enqueue(rule,'return-overdue:'||entity.id::text,jsonb_build_object('tenantId',rule.tenant_id,'eventType',rule.trigger_type,'returnId',entity.id,'customerId',entity.customer_id));
        END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Workflow schedule % failed: %',rule.id,SQLERRM;
    END;
  END LOOP;
  FOR i IN 1..200 LOOP
    SELECT id INTO run FROM public.rh_workflow_runs WHERE status IN ('queued','waiting') AND available_at<=now() ORDER BY available_at,id LIMIT 1;
    EXIT WHEN NOT FOUND;
    PERFORM public.workflow_step(run.id);
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.workflow_enqueue(public.rh_workflow_rules,text,jsonb,uuid[]), public.workflow_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.workflow_tick() TO service_role;

-- -----------------------------------------------------------------------------
-- 8. REG-2: defer instead of dropping mails over the caps
-- -----------------------------------------------------------------------------
-- Allow status 'deferred'. Rebuilds the existing status CHECK with the same
-- values plus 'deferred' (the constraint name may differ per environment).
DO $$
DECLARE
    con     RECORD;
    v_vals  TEXT[] := ARRAY[]::TEXT[];
    v_found BOOLEAN := false;
BEGIN
    FOR con IN
        SELECT c.conname, pg_get_constraintdef(c.oid) AS def
          FROM pg_constraint c
         WHERE c.conrelid = 'public.rh_notifications'::regclass
           AND c.contype = 'c'
           AND pg_get_constraintdef(c.oid) ~* '\mstatus\M'
           AND pg_get_constraintdef(c.oid) ~* '''pending'''
    LOOP
        v_found := true;
        SELECT v_vals || COALESCE(array_agg(m[1]), ARRAY[]::TEXT[])
          INTO v_vals
          FROM regexp_matches(con.def, '''([^'']+)''', 'g') AS m;
        EXECUTE format('ALTER TABLE public.rh_notifications DROP CONSTRAINT %I', con.conname);
    END LOOP;
    IF v_found THEN
        SELECT array_agg(DISTINCT v) INTO v_vals FROM unnest(v_vals || ARRAY['deferred']) AS v;
        EXECUTE format(
            'ALTER TABLE public.rh_notifications ADD CONSTRAINT rh_notifications_status_check CHECK (status IN (%s))',
            (SELECT string_agg(quote_literal(v), ', ' ORDER BY v) FROM unnest(v_vals) AS v));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rh_notifications_deferred
    ON public.rh_notifications (created_at) WHERE status = 'deferred';
CREATE INDEX IF NOT EXISTS idx_rh_notifications_deferred_tenant
    ON public.rh_notifications (tenant_id, created_at) WHERE status = 'deferred';

-- Gives back hits taken by rate_limit_hit() in the current transaction.
-- now() is fixed per transaction, so this always targets the window the hit
-- went into. Used when a counted mail is deferred or not released, so a
-- deferred row costs budget only once: when it is actually sent.
CREATE OR REPLACE FUNCTION public._rate_limit_refund(
    p_bucket         TEXT,
    p_window_seconds INTEGER,
    p_cost           INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    UPDATE public.rate_limit_counters
       SET hits = GREATEST(hits - p_cost, 0)
     WHERE bucket = p_bucket
       AND window_start = to_timestamp(floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds);
$$;
REVOKE ALL ON FUNCTION public._rate_limit_refund(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

-- Copy of the 20261001d guard. Over-cap mails of paying / own-SMTP tenants
-- are stored as 'deferred' (no dispatch, released by cron) and their hits are
-- refunded (they are counted again when released). The backlog is bounded:
-- more than 3000 deferred rows per tenant or 20 per recipient are rejected
-- with an error, as in 20261001d. Free tenants on the platform sender are
-- still rejected with an error (anti-abuse). Clients cannot choose 'deferred'
-- themselves: only this guard defers.
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
    v_reason    TEXT;
    v_bucket_h  TEXT;
    v_bucket_d  TEXT;
    v_bucket_r  TEXT;
    v_hit_h     BOOLEAN := false;
    v_hit_d     BOOLEAN := false;
    v_hit_r     BOOLEAN := false;
    v_backlog   INTEGER;
BEGIN
    v_role := COALESCE(
        NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        ''
    );
    IF NEW.channel IS DISTINCT FROM 'email' THEN
        RETURN NEW;
    END IF;
    IF v_role <> 'authenticated'
       AND COALESCE(NEW.metadata ->> 'source', '') IS DISTINCT FROM 'workflow' THEN
        RETURN NEW;
    END IF;
    -- Every capped insert counts. 'deferred' is assigned by this guard only;
    -- a client-chosen 'deferred' is treated as a normal (pending) mail.
    IF NEW.status = 'deferred' THEN
        NEW.status := 'pending';
    END IF;
    v_tier := public.tenant_mail_tier(NEW.tenant_id);
    IF v_tier IN ('paid', 'own_smtp') THEN
        v_hour_cap := 600;
        v_day_cap  := 3000;
    ELSE
        v_hour_cap := 20;
        v_day_cap  := 50;
    END IF;
    v_bucket_h := 'notif:tenant:h:' || NEW.tenant_id::text;
    v_bucket_d := 'notif:tenant:d:' || NEW.tenant_id::text;
    IF NEW.recipient_email IS NOT NULL THEN
        v_bucket_r := 'notif:rcpt:' || NEW.tenant_id::text || ':' || md5(lower(trim(NEW.recipient_email)));
    END IF;

    SELECT allowed INTO v_ok FROM public.rate_limit_hit(v_bucket_h, v_hour_cap, 3600);
    v_hit_h := true;
    IF NOT v_ok THEN
        v_reason := 'tenant_hourly_cap';
    END IF;

    IF v_reason IS NULL THEN
        SELECT allowed INTO v_ok FROM public.rate_limit_hit(v_bucket_d, v_day_cap, 86400);
        v_hit_d := true;
        IF NOT v_ok THEN
            v_reason := 'tenant_daily_cap';
        END IF;
    END IF;

    IF v_reason IS NULL AND v_bucket_r IS NOT NULL THEN
        SELECT allowed INTO v_ok FROM public.rate_limit_hit(v_bucket_r, 20, 3600);
        v_hit_r := true;
        IF NOT v_ok THEN
            v_reason := 'recipient_hourly_cap';
        END IF;
    END IF;

    IF v_reason IS NULL THEN
        RETURN NEW;
    END IF;

    IF v_tier IN ('paid', 'own_smtp') THEN
        -- Bounded backlog: beyond it the mail is rejected as in 20261001d
        -- (the exception also rolls back the hits taken above).
        SELECT count(*) INTO v_backlog
          FROM (SELECT 1 FROM public.rh_notifications n
                 WHERE n.tenant_id = NEW.tenant_id AND n.status = 'deferred'
                 LIMIT 3000) s;
        IF v_backlog >= 3000 THEN
            RAISE EXCEPTION 'Notification backlog full for this organisation'
                USING ERRCODE = 'P0001', HINT = 'rate_limited';
        END IF;
        IF NEW.recipient_email IS NOT NULL THEN
            SELECT count(*) INTO v_backlog
              FROM (SELECT 1 FROM public.rh_notifications n
                     WHERE n.tenant_id = NEW.tenant_id AND n.status = 'deferred'
                       AND lower(trim(n.recipient_email)) = lower(trim(NEW.recipient_email))
                     LIMIT 20) s;
            IF v_backlog >= 20 THEN
                RAISE EXCEPTION 'Notification rate limit reached for this recipient'
                    USING ERRCODE = 'P0001', HINT = 'rate_limited';
            END IF;
        END IF;

        -- Not sent now: give the hits back, they are taken again on release.
        IF v_hit_h THEN PERFORM public._rate_limit_refund(v_bucket_h, 3600); END IF;
        IF v_hit_d THEN PERFORM public._rate_limit_refund(v_bucket_d, 86400); END IF;
        IF v_hit_r THEN PERFORM public._rate_limit_refund(v_bucket_r, 3600); END IF;

        RAISE WARNING 'rh_notifications: mail deferred for tenant % (%)', NEW.tenant_id, v_reason;
        NEW.status := 'deferred';
        NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb)
            || jsonb_build_object('deferred_reason', v_reason, 'deferred_at', now());
        RETURN NEW;
    END IF;

    IF v_reason = 'tenant_hourly_cap' THEN
        RAISE EXCEPTION 'Notification rate limit reached for this organisation (hourly)'
            USING ERRCODE = 'P0001', HINT = 'rate_limited';
    ELSIF v_reason = 'tenant_daily_cap' THEN
        RAISE EXCEPTION 'Notification rate limit reached for this organisation (daily)'
            USING ERRCODE = 'P0001', HINT = 'rate_limited';
    END IF;
    RAISE EXCEPTION 'Notification rate limit reached for this recipient'
        USING ERRCODE = 'P0001', HINT = 'rate_limited';
END;
$$;
REVOKE ALL ON FUNCTION public.rh_notifications_insert_guard() FROM PUBLIC, anon, authenticated;

-- Releases deferred mails as the tenant budget allows (same buckets as the
-- guard). Released rows go through the normal dispatch trigger below.
--   * Fair: candidates are taken round-robin per tenant (at most 200 per
--     tenant and 20 per recipient per run), and tenants / recipients whose
--     bucket is already full are left out before the LIMIT applies, so one
--     tenant's backlog cannot hide another tenant's mail.
--   * No budget leak: the recipient bucket is hit first; any hit for a row
--     that is not released is refunded, and a blocked tenant / recipient is
--     skipped for the rest of the run without new hits.
--   * One run at a time (transaction advisory lock).
CREATE OR REPLACE FUNCTION public.rh_notifications_release_deferred(p_limit INTEGER DEFAULT 300)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r              RECORD;
    v_ok           BOOLEAN;
    v_bucket_h     TEXT;
    v_bucket_d     TEXT;
    v_bucket_r     TEXT;
    v_blocked      UUID[] := ARRAY[]::UUID[];
    v_blocked_rcpt TEXT[] := ARRAY[]::TEXT[];
    v_released     INTEGER := 0;
    v_expired      INTEGER := 0;
    v_skipped      INTEGER := 0;
    v_limit        INTEGER := LEAST(GREATEST(COALESCE(p_limit, 300), 1), 2000);
    v_h_start      TIMESTAMPTZ := to_timestamp(floor(extract(epoch FROM now()) / 3600) * 3600);
    v_d_start      TIMESTAMPTZ := to_timestamp(floor(extract(epoch FROM now()) / 86400) * 86400);
BEGIN
    IF NOT public._request_is_service_or_owner() THEN
        RAISE EXCEPTION 'rh_notifications_release_deferred is restricted to the service role'
            USING ERRCODE = '42501';
    END IF;
    IF NOT pg_try_advisory_xact_lock(hashtext('rh_notifications_release_deferred')) THEN
        RETURN jsonb_build_object('released', 0, 'expired', 0, 'skipped', 0, 'busy', true);
    END IF;

    UPDATE public.rh_notifications
       SET status = 'failed',
           metadata = COALESCE(metadata, '{}'::jsonb)
               || jsonb_build_object('error', 'deferred_expired', 'expired_at', now())
     WHERE status = 'deferred'
       AND created_at < now() - INTERVAL '72 hours';
    GET DIAGNOSTICS v_expired = ROW_COUNT;

    FOR r IN
        WITH tenant_caps AS (
            SELECT d.tenant_id,
                   CASE WHEN d.tier IN ('paid', 'own_smtp') THEN 600 ELSE 20 END AS hour_cap,
                   CASE WHEN d.tier IN ('paid', 'own_smtp') THEN 3000 ELSE 50 END AS day_cap
              FROM (SELECT t.tenant_id, public.tenant_mail_tier(t.tenant_id) AS tier
                      FROM (SELECT DISTINCT n.tenant_id FROM public.rh_notifications n
                             WHERE n.status = 'deferred') t) d
        ),
        open_tenants AS (
            SELECT c.*
              FROM tenant_caps c
             WHERE COALESCE((SELECT k.hits FROM public.rate_limit_counters k
                              WHERE k.bucket = 'notif:tenant:h:' || c.tenant_id::text
                                AND k.window_start = v_h_start), 0) < c.hour_cap
               AND COALESCE((SELECT k.hits FROM public.rate_limit_counters k
                              WHERE k.bucket = 'notif:tenant:d:' || c.tenant_id::text
                                AND k.window_start = v_d_start), 0) < c.day_cap
        ),
        candidates AS (
            SELECT n.id, n.tenant_id, n.recipient_email, n.created_at, o.hour_cap, o.day_cap,
                   CASE WHEN n.recipient_email IS NOT NULL THEN
                       'notif:rcpt:' || n.tenant_id::text || ':' || md5(lower(trim(n.recipient_email)))
                   END AS rcpt_bucket
              FROM public.rh_notifications n
              JOIN open_tenants o ON o.tenant_id = n.tenant_id
             WHERE n.status = 'deferred'
        ),
        per_rcpt AS (
            SELECT c.*,
                   row_number() OVER (PARTITION BY c.tenant_id, COALESCE(c.rcpt_bucket, c.id::text)
                                      ORDER BY c.created_at, c.id) AS rr
              FROM candidates c
             WHERE c.rcpt_bucket IS NULL
                OR COALESCE((SELECT k.hits FROM public.rate_limit_counters k
                              WHERE k.bucket = c.rcpt_bucket AND k.window_start = v_h_start), 0) < 20
        ),
        per_tenant AS (
            SELECT p.*,
                   row_number() OVER (PARTITION BY p.tenant_id ORDER BY p.created_at, p.id) AS rt
              FROM per_rcpt p
             WHERE p.rr <= 20
        )
        SELECT t.id, t.tenant_id, t.rcpt_bucket, t.hour_cap, t.day_cap
          FROM per_tenant t
         WHERE t.rt <= 200
         ORDER BY t.rt, t.created_at, t.id
         LIMIT v_limit
    LOOP
        IF r.tenant_id = ANY (v_blocked)
           OR (r.rcpt_bucket IS NOT NULL AND r.rcpt_bucket = ANY (v_blocked_rcpt)) THEN
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;
        v_bucket_h := 'notif:tenant:h:' || r.tenant_id::text;
        v_bucket_d := 'notif:tenant:d:' || r.tenant_id::text;
        v_bucket_r := r.rcpt_bucket;

        IF v_bucket_r IS NOT NULL THEN
            SELECT allowed INTO v_ok FROM public.rate_limit_hit(v_bucket_r, 20, 3600);
            IF NOT v_ok THEN
                PERFORM public._rate_limit_refund(v_bucket_r, 3600);
                v_blocked_rcpt := v_blocked_rcpt || v_bucket_r;
                v_skipped := v_skipped + 1;
                CONTINUE;
            END IF;
        END IF;

        SELECT allowed INTO v_ok FROM public.rate_limit_hit(v_bucket_h, r.hour_cap, 3600);
        IF NOT v_ok THEN
            PERFORM public._rate_limit_refund(v_bucket_h, 3600);
        ELSE
            SELECT allowed INTO v_ok FROM public.rate_limit_hit(v_bucket_d, r.day_cap, 86400);
            IF NOT v_ok THEN
                PERFORM public._rate_limit_refund(v_bucket_d, 86400);
                PERFORM public._rate_limit_refund(v_bucket_h, 3600);
            END IF;
        END IF;
        IF NOT v_ok THEN
            IF v_bucket_r IS NOT NULL THEN
                PERFORM public._rate_limit_refund(v_bucket_r, 3600);
            END IF;
            v_blocked := v_blocked || r.tenant_id;
            v_skipped := v_skipped + 1;
            CONTINUE;
        END IF;

        UPDATE public.rh_notifications
           SET status = 'pending',
               metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('released_at', now())
         WHERE id = r.id AND status = 'deferred';
        IF FOUND THEN
            v_released := v_released + 1;
        ELSE
            -- Row changed meanwhile: nothing is sent, give the hits back.
            PERFORM public._rate_limit_refund(v_bucket_h, 3600);
            PERFORM public._rate_limit_refund(v_bucket_d, 86400);
            IF v_bucket_r IS NOT NULL THEN
                PERFORM public._rate_limit_refund(v_bucket_r, 3600);
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object('released', v_released, 'expired', v_expired, 'skipped', v_skipped);
END;
$$;
REVOKE ALL ON FUNCTION public.rh_notifications_release_deferred(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rh_notifications_release_deferred(INTEGER) TO service_role;

-- Only the service role / DB owner may take a row out of 'deferred' (tenant
-- users can UPDATE their rows through "Tenant isolation for rh_notifications";
-- deferred -> pending fires the dispatch trigger below and would bypass the
-- caps).
CREATE OR REPLACE FUNCTION public.rh_notifications_guard_deferred_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF OLD.status = 'deferred' AND NEW.status IS DISTINCT FROM 'deferred'
       AND NOT public._request_is_service_or_owner() THEN
        RAISE EXCEPTION 'Deferred notifications are released by the platform only'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.rh_notifications_guard_deferred_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_rh_notifications_guard_deferred_update ON public.rh_notifications;
CREATE TRIGGER trg_rh_notifications_guard_deferred_update
    BEFORE UPDATE OF status ON public.rh_notifications
    FOR EACH ROW EXECUTE FUNCTION public.rh_notifications_guard_deferred_update();

-- deferred -> pending goes through the same dispatch as a new pending row
-- (rh_notifications_dispatch from 20260602b checks channel/status itself).
DO $$
BEGIN
    IF to_regprocedure('public.rh_notifications_dispatch()') IS NOT NULL THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trg_rh_notifications_dispatch_released ON public.rh_notifications';
        EXECUTE 'CREATE TRIGGER trg_rh_notifications_dispatch_released
                   AFTER UPDATE OF status ON public.rh_notifications
                   FOR EACH ROW
                   WHEN (OLD.status = ''deferred'' AND NEW.status = ''pending'')
                   EXECUTE FUNCTION public.rh_notifications_dispatch()';
    ELSE
        RAISE WARNING 'rh_notifications_dispatch() missing: released deferred mails will not be dispatched';
    END IF;
END $$;

-- Cron: release every 10 minutes (pg_cron runs as the database owner).
DO $$
BEGIN
    IF to_regclass('cron.job') IS NOT NULL THEN
        PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'trackbliss-release-deferred-mails';
        PERFORM cron.schedule('trackbliss-release-deferred-mails', '*/10 * * * *',
            'SELECT public.rh_notifications_release_deferred();');
    ELSE
        RAISE WARNING 'pg_cron not available: schedule public.rh_notifications_release_deferred() manually';
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 9. create_public_support_ticket: rh_customers.name does not exist
-- -----------------------------------------------------------------------------
-- Same signature and result as 20260518. Token-gated (shipment tracking
-- token). Now rate limited (per IP, per token, per tenant); refusals return
-- no row (the counters must persist, so they are never RAISEd).
CREATE OR REPLACE FUNCTION public.create_public_support_ticket(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token         TEXT := LOWER(TRIM(COALESCE(p_token, '')));
    v_shipment_id   UUID;
    v_tenant_id     UUID;
    v_recipient     TEXT;
    v_customer_id   UUID;
    v_ticket_id     UUID := gen_random_uuid();
    v_ticket_number TEXT;
    v_subject       TEXT;
    v_message       TEXT;
    v_clean_email   TEXT;
    v_ip            TEXT;
    v_ok            BOOLEAN;
    v_products      UUID[];
BEGIN
    v_clean_email := LOWER(TRIM(COALESCE(p_email, '')));
    IF v_clean_email = '' OR LENGTH(v_clean_email) > 254
       OR v_clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
        RAISE EXCEPTION 'invalid_email';
    END IF;
    v_message := TRIM(COALESCE(p_message, ''));
    IF v_message = '' THEN
        RAISE EXCEPTION 'empty_message';
    END IF;
    v_message := LEFT(v_message, 5000);
    IF v_token = '' OR LENGTH(v_token) > 128 THEN
        RAISE EXCEPTION 'invalid_token';
    END IF;

    v_ip := public._public_ticket_client_ip();
    IF v_ip IS NOT NULL THEN
        SELECT allowed INTO v_ok FROM public.rate_limit_hit('supportticket:ip:' || md5(v_ip), 10, 3600);
        IF NOT v_ok THEN
            RETURN;
        END IF;
    END IF;

    SELECT s.id, s.tenant_id, s.recipient_name
      INTO v_shipment_id, v_tenant_id, v_recipient
      FROM public.wh_shipments s
     WHERE s.tracking_token = v_token
       AND s.tracking_token IS NOT NULL
     LIMIT 1;
    IF v_shipment_id IS NULL THEN
        RAISE EXCEPTION 'invalid_token';
    END IF;

    SELECT allowed INTO v_ok FROM public.rate_limit_hit('supportticket:token:' || md5(v_token), 5, 3600);
    IF NOT v_ok THEN
        RETURN;
    END IF;
    SELECT allowed INTO v_ok FROM public.rate_limit_hit('supportticket:tenant:' || v_tenant_id::text, 200, 3600);
    IF NOT v_ok THEN
        RAISE WARNING 'ALERT create_public_support_ticket circuit breaker tripped for tenant %', v_tenant_id;
        RETURN;
    END IF;

    v_recipient := NULLIF(LEFT(TRIM(regexp_replace(COALESCE(v_recipient, ''), '[[:cntrl:]]', ' ', 'g')), 100), '');

    SELECT c.id INTO v_customer_id
      FROM public.rh_customers c
     WHERE c.tenant_id = v_tenant_id AND LOWER(TRIM(c.email)) = v_clean_email
     ORDER BY c.created_at
     LIMIT 1;

    IF v_customer_id IS NULL THEN
        v_customer_id := gen_random_uuid();
        INSERT INTO public.rh_customers (id, tenant_id, email, first_name, last_name, tags, notes)
        VALUES (
            v_customer_id, v_tenant_id, v_clean_email,
            COALESCE(NULLIF(split_part(COALESCE(v_recipient, ''), ' ', 1), ''), split_part(v_clean_email, '@', 1)),
            NULLIF(TRIM(substr(COALESCE(v_recipient, ''), length(split_part(COALESCE(v_recipient, ''), ' ', 1)) + 1)), ''),
            ARRAY['public-tracking'],
            'Customer created via shipment tracking support request'
        );
    END IF;

    v_subject := NULLIF(LEFT(TRIM(regexp_replace(COALESCE(p_subject, ''), '[[:cntrl:]]', ' ', 'g')), 200), '');
    v_subject := COALESCE(v_subject, 'Support request');
    v_ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                       UPPER(SUBSTRING(REPLACE(v_ticket_id::text, '-', ''), 1, 8));

    -- Only products of this tenant, at most 50.
    SELECT COALESCE(array_agg(p.id), ARRAY[]::UUID[]) INTO v_products
      FROM (SELECT DISTINCT unnest(COALESCE(p_affected_product_ids, ARRAY[]::UUID[])) AS id LIMIT 50) x
      JOIN public.products p ON p.id = x.id AND p.tenant_id = v_tenant_id;

    INSERT INTO public.rh_tickets (
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
            'tracking_token',       v_token,
            'affected_product_ids', to_jsonb(v_products),
            'contact_email',        v_clean_email
        ),
        NOW(), NOW()
    );

    INSERT INTO public.rh_ticket_messages (
        id, tenant_id, ticket_id,
        sender_type, sender_email, sender_name,
        content, is_internal, created_at
    ) VALUES (
        gen_random_uuid(), v_tenant_id, v_ticket_id,
        'customer', v_clean_email, v_recipient,
        v_message, FALSE, NOW()
    );

    RETURN QUERY SELECT v_ticket_id, v_ticket_number;
END;
$$;
REVOKE ALL ON FUNCTION public.create_public_support_ticket(TEXT, TEXT, TEXT, TEXT, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_public_support_ticket(TEXT, TEXT, TEXT, TEXT, UUID[]) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 10. Post-conditions
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF has_table_privilege('anon', 'public.rh_email_templates', 'SELECT') THEN
        RAISE EXCEPTION 'rh_email_templates still readable by anon';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
         WHERE tgrelid = 'public.tenants'::regclass AND tgname = 'tenants_guard_admin_columns'
    ) THEN
        RAISE EXCEPTION 'tenants_guard_admin_columns trigger missing';
    END IF;
    IF has_any_column_privilege('anon', 'public.tenants', 'SELECT') THEN
        RAISE WARNING 'RLS-10 not closed: anon can still SELECT tenants columns (see warnings above)';
    END IF;
END $$;

-- =============================================================================
-- Verification (run manually):
--   SELECT has_any_column_privilege('anon','public.tenants','SELECT');        -- false
--   SELECT has_table_privilege('anon','public.rh_email_templates','SELECT');  -- false
--   SELECT status, count(*) FROM rh_notifications WHERE status='deferred' GROUP BY 1;
--   SELECT jobname, schedule FROM cron.job WHERE jobname='trackbliss-release-deferred-mails';
--   SELECT id, public.workflow_tenant_entitled(id) FROM tenants
--    WHERE settings #>> '{returnsHub,features,workflowRules}'='true';
-- =============================================================================
