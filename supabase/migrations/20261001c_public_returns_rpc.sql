-- =====================================================================
-- 20261001c_public_returns_rpc.sql  (Go-live hardening, package C)
-- Findings: DB-05 (anon reads/cancels every return), DB-06 (anon inserts
-- arbitrary returns/items/timeline), SRE-04 (returns/items/timeline part).
--
-- Replaces all direct anon table access on rh_returns, rh_return_items and
-- rh_return_timeline with three SECURITY DEFINER RPCs:
--   public_track_return(p_return_number, p_email)        -> minimal projection
--   public_cancel_return(p_return_number, p_email, p_reason)
--   public_create_return(p_tenant_id, p_payload)         -> status CREATED only
-- Tracking and cancellation require return number AND matching e-mail.
-- Creation is validated server-side and rate-limited per client IP (+tenant),
-- per e-mail+tenant, with a tenant-wide circuit breaker. Track/cancel are
-- throttled per client IP and per e-mail (never per return number).
--
-- Customer-portal flows (authenticated customers via rh_customer_profiles)
-- keep their own policies. Two narrow customer policies are added so that
-- customer cancellation + timeline entries keep working without any
-- anon/unconstrained policy (column tampering is blocked by a trigger).
-- Customer INSERTs on rh_returns / rh_return_items are sanitized by BEFORE
-- INSERT guards (status CREATED, no refund/shopify/label/assignment data).
-- public_create_return only accepts tenants with an enabled + licensed
-- Returns Hub. Active return_* workflow rules move to the durable engine.
-- Re-audit: anon loses SELECT on rh_workflow_rules (RLS-1) and INSERT on
-- rh_customers / rh_tickets / rh_ticket_messages; public support tickets go
-- through the rate-limited public_create_ticket(p_tenant_id, p_payload) (RLS-2).
--
-- Idempotent: safe to run multiple times.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Drop anon / unconstrained policies on the three return tables
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Public insert returns" ON public.rh_returns;
DROP POLICY IF EXISTS "Public read returns by number" ON public.rh_returns;
DROP POLICY IF EXISTS "Public cancel returns" ON public.rh_returns;
DROP POLICY IF EXISTS "Public insert return items" ON public.rh_return_items;
DROP POLICY IF EXISTS "Public read return items" ON public.rh_return_items;
DROP POLICY IF EXISTS "Public insert return timeline" ON public.rh_return_timeline;
DROP POLICY IF EXISTS "Public read return timeline" ON public.rh_return_timeline;

-- Prod has policies that are not in the repo (e.g. "Public read return
-- items", roles {anon,authenticated}). Drop every remaining policy on these
-- tables that applies to anon, or that is completely unconstrained
-- (USING true / WITH CHECK true) for any role.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('rh_returns', 'rh_return_items', 'rh_return_timeline')
      AND (
        'anon' = ANY (roles)
        OR (COALESCE(TRIM(qual), 'true') = 'true'
            AND COALESCE(TRIM(with_check), 'true') = 'true')
      )
  LOOP
    RAISE NOTICE 'Dropping policy % on %', pol.policyname, pol.tablename;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Defense in depth: anon needs no direct table privileges on these tables.
REVOKE ALL ON public.rh_returns FROM anon;
REVOKE ALL ON public.rh_return_items FROM anon;
REVOKE ALL ON public.rh_return_timeline FROM anon;

-- ---------------------------------------------------------------------
-- 2. Customer portal: narrow cancel/timeline policies + insert/update guards
-- ---------------------------------------------------------------------
-- customer-portal.ts customerCancelReturn() updates status -> CANCELLED and
-- inserts a customer timeline row. Previously this could only work through
-- the (now dropped) public policies.
DROP POLICY IF EXISTS "Customers can cancel own returns" ON public.rh_returns;
CREATE POLICY "Customers can cancel own returns"
ON public.rh_returns FOR UPDATE
TO authenticated
USING (
  is_customer()
  AND tenant_id = get_customer_tenant_id()
  AND customer_id = get_customer_id()
  AND status IN ('CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED')
)
WITH CHECK (
  is_customer()
  AND tenant_id = get_customer_tenant_id()
  AND customer_id = get_customer_id()
  AND status = 'CANCELLED'
);

-- Timeline rows written by customers may only describe customer actions
-- (registration, cancellation); fake 'REFUND_COMPLETED' etc. are rejected.
DROP POLICY IF EXISTS "Customers can add own return timeline" ON public.rh_return_timeline;
CREATE POLICY "Customers can add own return timeline"
ON public.rh_return_timeline FOR INSERT
TO authenticated
WITH CHECK (
  is_customer()
  AND tenant_id = get_customer_tenant_id()
  AND actor_type = 'customer'
  AND status IN ('CREATED', 'CANCELLED')
  AND return_id IN (SELECT id FROM public.rh_returns WHERE customer_id = get_customer_id())
);

-- True when the request comes from a customer-portal user (rh_customer_profiles)
-- who is not also an admin (profiles). Only meaningful together with a
-- current_user check in the caller: SECURITY DEFINER RPCs (public_*_return,
-- workflow engine, webhooks) run as the function owner and are not guarded.
CREATE OR REPLACE FUNCTION public._rh_is_customer_only_session()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.rh_customer_profiles WHERE id = auth.uid())
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public._rh_is_customer_only_session() FROM PUBLIC, anon;
-- The guard triggers below are SECURITY INVOKER (so current_user is the
-- client role) and call this helper as that role.
GRANT EXECUTE ON FUNCTION public._rh_is_customer_only_session() TO authenticated;

-- Customers (rh_customer_profiles users) may only change status/updated_at on
-- returns. Admins (profiles), service_role and SECURITY DEFINER functions are
-- unaffected.
CREATE OR REPLACE FUNCTION public.rh_returns_guard_customer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND public._rh_is_customer_only_session() THEN
    IF (to_jsonb(NEW) - 'status' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'Customers may only change the return status'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.rh_returns_guard_customer_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS rh_returns_guard_customer_update ON public.rh_returns;
CREATE TRIGGER rh_returns_guard_customer_update
BEFORE UPDATE ON public.rh_returns
FOR EACH ROW EXECUTE FUNCTION public.rh_returns_guard_customer_update();

-- DB-06 (customer variant): the existing "Customers can create own returns"
-- policy only checks tenant/customer, so a self-registered portal customer
-- could INSERT a return in any status with refund_amount/shopify_order_id/
-- label/assignment data (shopify-sync refunds rh_returns.refund_amount to
-- shopify_order_id as stored). For customer sessions this trigger forces
-- status CREATED / priority normal, rebuilds metadata and nulls every
-- privileged column (refund*, shopify_*, tracking_*, label_*, carrier_*,
-- inspection_*, customs_*, last_refund*, assigned_to, internal_notes).
CREATE OR REPLACE FUNCTION public.rh_returns_guard_customer_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
DECLARE
  v_nulls JSONB;
  v_email TEXT;
BEGIN
  IF current_user IN ('anon', 'authenticated') AND public._rh_is_customer_only_session() THEN
    SELECT COALESCE(jsonb_object_agg(a.attname::text, NULL::text), '{}'::jsonb)
      INTO v_nulls
      FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = 'public.rh_returns'::regclass
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND NOT a.attnotnull
       AND (a.attname ~ '^(refund|shopify_|tracking_|label_|carrier_|inspection_|customs_|last_refund)'
            OR a.attname IN ('assigned_to', 'internal_notes'));

    -- RLS already pins customer_id to the caller; read its e-mail for metadata.
    SELECT email INTO v_email FROM public.rh_customers
     WHERE id = NEW.customer_id AND tenant_id = NEW.tenant_id;

    NEW := jsonb_populate_record(NEW, v_nulls || jsonb_build_object(
      'status', 'CREATED',
      'priority', 'normal',
      'metadata', jsonb_build_object('source', 'customer_portal', 'email', COALESCE(v_email, ''))
    ));
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.rh_returns_guard_customer_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS rh_returns_guard_customer_insert ON public.rh_returns;
CREATE TRIGGER rh_returns_guard_customer_insert
BEFORE INSERT ON public.rh_returns
FOR EACH ROW EXECUTE FUNCTION public.rh_returns_guard_customer_insert();

-- Same for items: customers may only add items to their own returns while the
-- return is still CREATED, and never set refund_amount / unit_price /
-- approved (forced to the column default TRUE, which the app reads as
-- "not rejected"; refund amounts are set by admins during inspection).
CREATE OR REPLACE FUNCTION public.rh_return_items_guard_customer_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, auth
AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND public._rh_is_customer_only_session() THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rh_returns
       WHERE id = NEW.return_id AND tenant_id = NEW.tenant_id AND status = 'CREATED'
    ) THEN
      RAISE EXCEPTION 'Items can only be added while the return is open'
        USING ERRCODE = '42501';
    END IF;
    NEW.refund_amount := NULL;
    NEW.unit_price := NULL;
    NEW.approved := TRUE;
    NEW.quantity := LEAST(GREATEST(COALESCE(NEW.quantity, 1), 1), 999);
    IF NEW.product_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.products WHERE id = NEW.product_id AND tenant_id = NEW.tenant_id
    ) THEN
      NEW.product_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION public.rh_return_items_guard_customer_insert() FROM PUBLIC;

DROP TRIGGER IF EXISTS rh_return_items_guard_customer_insert ON public.rh_return_items;
CREATE TRIGGER rh_return_items_guard_customer_insert
BEFORE INSERT ON public.rh_return_items
FOR EACH ROW EXECUTE FUNCTION public.rh_return_items_guard_customer_insert();

-- ---------------------------------------------------------------------
-- 3. Rate-limit bookkeeping (service-only table, no policies)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.public_returns_rate_limit (
  id BIGSERIAL PRIMARY KEY,
  bucket TEXT NOT NULL,          -- e.g. 'create:email:<tenant>:<md5>', 'track:<md5>'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_public_returns_rate_limit_bucket
  ON public.public_returns_rate_limit (bucket, created_at);
CREATE INDEX IF NOT EXISTS idx_public_returns_rate_limit_created
  ON public.public_returns_rate_limit (created_at);
ALTER TABLE public.public_returns_rate_limit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.public_returns_rate_limit FROM PUBLIC, anon, authenticated;

-- Rate-limit thresholds (per rolling hour). Bucket design:
--   lookup:ip:<md5 ip>               failed track/cancel lookups per client IP (20)
--   lookup:email:<md5 email>         failed lookups per e-mail, any IP (30).
--                                    Stops number brute force against a known
--                                    e-mail via rotating IPs (30 guesses/h vs a
--                                    ~1M/day key space). No per-return-number
--                                    bucket: third parties can no longer lock a
--                                    customer out of a known return number.
--   create:ip:<tenant>:<md5 ip>      successful creates per IP + tenant (10)
--   create:ipall:<md5 ip>            successful creates per IP, all tenants (30)
--   create:email:<tenant>:<md5 mail> successful creates per e-mail + tenant (5)
--   create:tenant:<tenant>           tenant-wide circuit breaker (2000), logs a
--                                    WARNING for alerting when it trips.
-- Blocked calls never insert rows, so rows per IP/e-mail are bounded by the
-- caps; old rows are purged on every write path (see _public_returns_record).

-- Internal helper: counts hits in the last hour for a bucket.
CREATE OR REPLACE FUNCTION public._public_returns_hits(p_bucket TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.public_returns_rate_limit
  WHERE bucket = p_bucket AND created_at > NOW() - INTERVAL '1 hour';
$$;
REVOKE ALL ON FUNCTION public._public_returns_hits(TEXT) FROM PUBLIC, anon, authenticated;

-- Internal helper: records hits for buckets and purges expired rows.
-- The purge runs on every recording call (track, cancel and create paths),
-- uses the created_at index and is capped per call so a single request never
-- does unbounded work.
CREATE OR REPLACE FUNCTION public._public_returns_record(p_buckets TEXT[])
RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.public_returns_rate_limit
  WHERE id IN (
    SELECT id FROM public.public_returns_rate_limit
    WHERE created_at < NOW() - INTERVAL '2 hours'
    ORDER BY created_at
    LIMIT 500
  );
  INSERT INTO public.public_returns_rate_limit (bucket)
  SELECT b FROM unnest(p_buckets) AS b WHERE b IS NOT NULL;
END $$;
REVOKE ALL ON FUNCTION public._public_returns_record(TEXT[]) FROM PUBLIC, anon, authenticated;

-- Internal helper: client IP as forwarded by the API gateway / PostgREST.
-- Prefers cf-connecting-ip (set by Cloudflare in front of Supabase, not
-- client-controllable), then x-real-ip, then the first x-forwarded-for entry.
-- Returns NULL outside an HTTP request (e.g. SQL editor), in which case the
-- IP buckets are skipped and the e-mail / tenant buckets still apply.
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
  RETURN NULLIF(LEFT(TRIM(COALESCE(
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip',
    split_part(COALESCE(v_headers ->> 'x-forwarded-for', ''), ',', 1)
  )), 64), '');
END $$;
REVOKE ALL ON FUNCTION public._public_returns_client_ip() FROM PUBLIC, anon, authenticated;

-- Internal helper: pre-lookup throttle shared by track + cancel. Returns the
-- buckets to record on a failed lookup, or NULL when the caller is blocked.
CREATE OR REPLACE FUNCTION public._public_returns_lookup_buckets(p_email TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ip TEXT := public._public_returns_client_ip();
  v_ip_bucket TEXT;
  v_email_bucket TEXT := 'lookup:email:' || md5(LOWER(TRIM(COALESCE(p_email, ''))));
BEGIN
  -- Serialize concurrent calls of the same caller so parallel bursts cannot
  -- all pass the check before any hit is recorded (lock ends with the txn).
  PERFORM pg_advisory_xact_lock(hashtext(v_email_bucket));
  IF v_ip IS NOT NULL THEN
    v_ip_bucket := 'lookup:ip:' || md5(v_ip);
    PERFORM pg_advisory_xact_lock(hashtext(v_ip_bucket));
    IF public._public_returns_hits(v_ip_bucket) >= 20 THEN
      RETURN NULL;
    END IF;
  END IF;
  IF public._public_returns_hits(v_email_bucket) >= 30 THEN
    RETURN NULL;
  END IF;
  RETURN ARRAY[v_ip_bucket, v_email_bucket];
END $$;
REVOKE ALL ON FUNCTION public._public_returns_lookup_buckets(TEXT) FROM PUBLIC, anon, authenticated;

-- Internal helper: does the e-mail belong to the return?
CREATE OR REPLACE FUNCTION public._public_return_email_matches(p_return public.rh_returns, p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LENGTH(TRIM(COALESCE(p_email, ''))) > 3
     AND POSITION('@' IN p_email) > 1
     AND (
       LOWER(TRIM(COALESCE(p_return.metadata->>'email', ''))) = LOWER(TRIM(p_email))
       OR EXISTS (
         SELECT 1 FROM public.rh_customers c
         WHERE c.id = p_return.customer_id
           AND c.tenant_id = p_return.tenant_id
           AND LOWER(TRIM(c.email)) = LOWER(TRIM(p_email))
       )
     );
$$;
REVOKE ALL ON FUNCTION public._public_return_email_matches(public.rh_returns, TEXT) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. public_track_return(return_number, email)
-- ---------------------------------------------------------------------
-- Returns NULL when not found / e-mail mismatch / rate-limited (no oracle).
CREATE OR REPLACE FUNCTION public.public_track_return(p_return_number TEXT, p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number TEXT := UPPER(TRIM(COALESCE(p_return_number, '')));
  v_buckets TEXT[];
  r public.rh_returns;
  v_slug TEXT;
  v_items JSONB;
  v_timeline JSONB;
  c JSONB;
BEGIN
  IF v_number = '' OR LENGTH(v_number) > 64 OR p_email IS NULL OR LENGTH(p_email) > 254 THEN
    RETURN NULL;
  END IF;

  -- Per-IP and per-e-mail failure throttle (caller-scoped; no per-number
  -- bucket that third parties could exhaust).
  v_buckets := public._public_returns_lookup_buckets(p_email);
  IF v_buckets IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO r FROM public.rh_returns x
  WHERE UPPER(x.return_number) = v_number
    AND public._public_return_email_matches(x, p_email)
  ORDER BY x.created_at DESC
  LIMIT 1;

  IF r.id IS NULL THEN
    PERFORM public._public_returns_record(v_buckets);
    RETURN NULL;
  END IF;

  SELECT slug INTO v_slug FROM public.tenants WHERE id = r.tenant_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', i.id,
           'name', i.name,
           'quantity', i.quantity,
           'condition', i.condition,
           'photos', COALESCE(to_jsonb(i.photos), '[]'::jsonb)
         ) ORDER BY i.created_at), '[]'::jsonb)
    INTO v_items
  FROM public.rh_return_items i WHERE i.return_id = r.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', t.id,
           'status', t.status,
           'comment', t.comment,
           'actor_type', t.actor_type,
           'created_at', t.created_at
         ) ORDER BY t.created_at), '[]'::jsonb)
    INTO v_timeline
  FROM public.rh_return_timeline t WHERE t.return_id = r.id;

  c := COALESCE(to_jsonb(r) -> 'carrier_label_data', 'null'::jsonb);
  IF jsonb_typeof(c) = 'object' THEN
    c := jsonb_strip_nulls(jsonb_build_object(
      'carrier', c->'carrier',
      'apiType', c->'apiType',
      'labelFormat', c->'labelFormat',
      'createdAt', c->'createdAt',
      'cancelledAt', c->'cancelledAt',
      'dhlReturnId', c->'dhlReturnId',
      'qrUrl', c->'qrUrl',
      'qrLink', c->'qrLink'
    ));
  ELSE
    c := NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', r.id,
    'tenant_id', r.tenant_id,
    'tenant_slug', v_slug,
    'return_number', r.return_number,
    'status', r.status,
    'order_id', r.order_id,
    'reason_category', r.reason_category,
    'desired_solution', r.desired_solution,
    'shipping_method', r.shipping_method,
    'tracking_number', r.tracking_number,
    'label_url', r.label_url,
    'label_expires_at', r.label_expires_at,
    'refund_amount', r.refund_amount,
    'refunded_at', r.refunded_at,
    'priority', r.priority,
    'carrier_label_data', c,
    'created_at', r.created_at,
    'updated_at', r.updated_at,
    'items', v_items,
    'timeline', v_timeline
  );
END $$;

REVOKE ALL ON FUNCTION public.public_track_return(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_track_return(TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. public_cancel_return(return_number, email, reason)
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.public_cancel_return(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.public_cancel_return(
  p_return_number TEXT,
  p_email TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number TEXT := UPPER(TRIM(COALESCE(p_return_number, '')));
  v_buckets TEXT[];
  v_reason TEXT := NULLIF(LEFT(TRIM(COALESCE(p_reason, '')), 1000), '');
  r public.rh_returns;
BEGIN
  IF v_number = '' OR LENGTH(v_number) > 64 OR p_email IS NULL OR LENGTH(p_email) > 254 THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  v_buckets := public._public_returns_lookup_buckets(p_email);
  IF v_buckets IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;

  SELECT * INTO r FROM public.rh_returns x
  WHERE UPPER(x.return_number) = v_number
    AND public._public_return_email_matches(x, p_email)
  ORDER BY x.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF r.id IS NULL THEN
    PERFORM public._public_returns_record(v_buckets);
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF r.status NOT IN ('CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_cancellable');
  END IF;

  UPDATE public.rh_returns
     SET status = 'CANCELLED', updated_at = NOW()
   WHERE id = r.id;

  INSERT INTO public.rh_return_timeline (return_id, tenant_id, status, comment, actor_type)
  VALUES (r.id, r.tenant_id, 'CANCELLED', v_reason, 'customer');

  RETURN jsonb_build_object(
    'success', true,
    'return_id', r.id,
    'tenant_id', r.tenant_id,
    'return_number', r.return_number,
    'customer_name', r.metadata->>'customerName'
  );
END $$;

REVOKE ALL ON FUNCTION public.public_cancel_return(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_cancel_return(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. public_create_return(tenant_id, payload)
-- ---------------------------------------------------------------------
-- Return-number format identical to src/lib/return-number.ts:
-- PREFIX-YYYYMMDD-XXXX<luhn>
CREATE OR REPLACE FUNCTION public._public_generate_return_number(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  rnd TEXT := '';
  i INT;
  ch INT;
  n INT;
  s INT := 0;
  alt BOOLEAN := false;
BEGIN
  FOR i IN 1..4 LOOP
    rnd := rnd || SUBSTR(alphabet, 1 + FLOOR(random() * 32)::int, 1);
  END LOOP;
  FOR i IN REVERSE 4..1 LOOP
    ch := ASCII(SUBSTR(rnd, i, 1));
    IF ch BETWEEN 48 AND 57 THEN n := ch - 48;
    ELSIF ch BETWEEN 65 AND 90 THEN n := ch - 55;
    ELSE n := 0; END IF;
    IF alt THEN
      n := n * 2;
      IF n > 9 THEN n := n - 9; END IF;
    END IF;
    s := s + n;
    alt := NOT alt;
  END LOOP;
  RETURN p_prefix || '-' || to_char(NOW() AT TIME ZONE 'Europe/Berlin', 'YYYYMMDD')
         || '-' || rnd || ((10 - (s % 10)) % 10)::text;
END $$;
REVOKE ALL ON FUNCTION public._public_generate_return_number(TEXT) FROM PUBLIC, anon, authenticated;

-- DB-06: public returns only for tenants with an enabled + licensed Returns Hub.
CREATE OR REPLACE FUNCTION public._public_returns_tenant_enabled(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
     WHERE t.id = p_tenant_id
       AND COALESCE(t.settings->'returnsHub'->>'enabled', 'false') = 'true'
  )
  AND EXISTS (
    SELECT 1 FROM public.billing_module_subscriptions m
     WHERE m.tenant_id = p_tenant_id
       AND m.module_id LIKE 'returns\_hub\_%'
       AND m.status IN ('active', 'past_due')
  );
$$;
REVOKE ALL ON FUNCTION public._public_returns_tenant_enabled(UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.public_create_return(p_tenant_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := p_tenant_id;
  v_settings JSONB;
  v_prefix TEXT;
  v_email TEXT;
  v_email_bucket TEXT;
  v_tenant_bucket TEXT;
  v_ip TEXT;
  v_ip_bucket TEXT;
  v_ip_all_bucket TEXT;
  v_solution TEXT;
  v_shipping TEXT;
  v_order TEXT;
  v_reason_cat TEXT;
  v_reason_text TEXT;
  v_addr JSONB;
  v_name TEXT;
  v_meta JSONB;
  v_items JSONB;
  v_item JSONB;
  v_item_name TEXT;
  v_qty INT;
  v_cond TEXT;
  v_pid UUID;
  v_customer_id UUID;
  v_return_id UUID := gen_random_uuid();
  v_number TEXT;
  v_tries INT := 0;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_payload');
  END IF;

  -- Tenant: explicit id, or resolved from payload.tenantSlug (public portal
  -- has only the slug and anon may no longer read tenants directly).
  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants
    WHERE slug = LEFT(TRIM(COALESCE(p_payload->>'tenantSlug', '')), 120);
  END IF;
  SELECT settings INTO v_settings FROM public.tenants WHERE id = v_tenant_id;
  IF v_tenant_id IS NULL OR NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'tenant_not_found');
  END IF;
  -- Only tenants that actually run the Returns Hub accept public returns
  -- (enabled flag AND an active/grace-period returns_hub_* module). Same
  -- error as an unknown slug, so tenant existence is not disclosed.
  IF NOT public._public_returns_tenant_enabled(v_tenant_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'tenant_not_found');
  END IF;

  -- E-mail
  v_email := LOWER(TRIM(COALESCE(p_payload->>'email', '')));
  IF LENGTH(v_email) > 254 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;

  -- Rate limits (per rolling hour): 10 per IP+tenant, 30 per IP overall,
  -- 5 per e-mail+tenant. The tenant-wide cap is only a circuit breaker
  -- (2000/h) that logs a WARNING for alerting; an attacker without a large IP
  -- pool can no longer exhaust a tenant's registrations.
  v_ip := public._public_returns_client_ip();
  IF v_ip IS NOT NULL THEN
    v_ip_bucket := 'create:ip:' || v_tenant_id::text || ':' || md5(v_ip);
    v_ip_all_bucket := 'create:ipall:' || md5(v_ip);
    -- Serialize bursts from one IP (see _public_returns_lookup_buckets).
    PERFORM pg_advisory_xact_lock(hashtext(v_ip_all_bucket));
    IF public._public_returns_hits(v_ip_bucket) >= 10
       OR public._public_returns_hits(v_ip_all_bucket) >= 30 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
    END IF;
  END IF;
  v_email_bucket := 'create:email:' || v_tenant_id::text || ':' || md5(v_email);
  v_tenant_bucket := 'create:tenant:' || v_tenant_id::text;
  PERFORM pg_advisory_xact_lock(hashtext(v_email_bucket));
  IF public._public_returns_hits(v_email_bucket) >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;
  IF public._public_returns_hits(v_tenant_bucket) >= 2000 THEN
    RAISE WARNING 'ALERT public_create_return circuit breaker tripped for tenant % (>= 2000 public returns in 1h)',
      v_tenant_id;
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;

  -- Scalar fields
  v_solution := p_payload->>'desiredSolution';
  IF v_solution IS NULL OR v_solution NOT IN ('refund', 'exchange', 'voucher', 'repair') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_solution');
  END IF;
  v_shipping := NULLIF(LEFT(TRIM(COALESCE(p_payload->>'shippingMethod', '')), 64), '');
  v_order := NULLIF(LEFT(TRIM(COALESCE(p_payload->>'orderNumber', '')), 100), '');
  v_reason_cat := NULLIF(LEFT(TRIM(COALESCE(p_payload->>'reasonCategory', '')), 100), '');
  v_reason_text := NULLIF(LEFT(TRIM(COALESCE(p_payload->>'reasonText', '')), 2000), '');

  v_meta := jsonb_build_object('source', 'public_portal', 'email', v_email);
  IF NULLIF(TRIM(COALESCE(p_payload->>'shipmentToken', '')), '') IS NOT NULL THEN
    v_meta := v_meta || jsonb_build_object('tracking_token', LEFT(TRIM(p_payload->>'shipmentToken'), 128));
  END IF;
  IF NULLIF(TRIM(COALESCE(p_payload->>'shipmentNumber', '')), '') IS NOT NULL THEN
    v_meta := v_meta || jsonb_build_object('shipment_number', LEFT(TRIM(p_payload->>'shipmentNumber'), 64));
  END IF;

  v_addr := p_payload->'shippingAddress';
  IF v_addr IS NOT NULL AND jsonb_typeof(v_addr) = 'object' THEN
    v_name := NULLIF(LEFT(TRIM(COALESCE(v_addr->>'name', '')), 200), '');
    v_meta := v_meta || jsonb_strip_nulls(jsonb_build_object(
      'customerName', v_name,
      'shippingCompany', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'company', '')), 200), ''),
      'shippingStreet', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'street', '')), 200), ''),
      'shippingCity', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'city', '')), 120), ''),
      'shippingPostalCode', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'postalCode', '')), 20), ''),
      'shippingCountry', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'country', '')), 60), '')
    ));
  ELSE
    v_addr := NULL;
  END IF;

  -- Items (0..50)
  v_items := COALESCE(p_payload->'items', '[]'::jsonb);
  IF jsonb_typeof(v_items) <> 'array' OR jsonb_array_length(v_items) > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_items');
  END IF;

  -- Customer: reuse by tenant + e-mail, else create
  SELECT id INTO v_customer_id FROM public.rh_customers
  WHERE tenant_id = v_tenant_id AND LOWER(TRIM(email)) = v_email
  ORDER BY created_at
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    v_customer_id := gen_random_uuid();
    INSERT INTO public.rh_customers (id, tenant_id, email, first_name, last_name, addresses)
    VALUES (
      v_customer_id,
      v_tenant_id,
      v_email,
      NULLIF(SPLIT_PART(COALESCE(v_name, ''), ' ', 1), ''),
      NULLIF(TRIM(SUBSTR(COALESCE(v_name, ''), LENGTH(SPLIT_PART(COALESCE(v_name, ''), ' ', 1)) + 1)), ''),
      CASE WHEN v_addr IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'type', 'shipping',
        'name', v_name,
        'company', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'company', '')), 200), ''),
        'street', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'street', '')), 200), ''),
        'postalCode', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'postalCode', '')), 20), ''),
        'city', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'city', '')), 120), ''),
        'country', NULLIF(LEFT(TRIM(COALESCE(v_addr->>'country', '')), 60), '')
      ))) END
    );
  END IF;

  -- Return number (unique per tenant)
  v_prefix := UPPER(COALESCE(v_settings->'returnsHub'->>'prefix', 'RET'));
  IF v_prefix !~ '^[A-Z0-9]{1,10}$' THEN v_prefix := 'RET'; END IF;
  LOOP
    v_number := public._public_generate_return_number(v_prefix);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.rh_returns WHERE tenant_id = v_tenant_id AND return_number = v_number
    );
    v_tries := v_tries + 1;
    IF v_tries > 10 THEN
      RETURN jsonb_build_object('success', false, 'error', 'number_generation_failed');
    END IF;
  END LOOP;

  -- Return: forced CREATED/normal, no refund/internal/assignment fields
  INSERT INTO public.rh_returns (
    id, tenant_id, return_number, status, customer_id, order_id,
    reason_category, reason_text, desired_solution, shipping_method,
    priority, metadata
  ) VALUES (
    v_return_id, v_tenant_id, v_number, 'CREATED', v_customer_id, v_order,
    v_reason_cat, v_reason_text, v_solution, v_shipping,
    'normal', v_meta
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    CONTINUE WHEN jsonb_typeof(v_item) <> 'object';
    v_item_name := LEFT(TRIM(COALESCE(v_item->>'name', '')), 200);
    CONTINUE WHEN v_item_name = '';
    v_qty := CASE WHEN COALESCE(v_item->>'quantity', '') ~ '^\d{1,4}$'
                  THEN LEAST(GREATEST((v_item->>'quantity')::int, 1), 999) ELSE 1 END;
    v_cond := v_item->>'condition';
    IF v_cond IS NOT NULL AND v_cond NOT IN ('new', 'like_new', 'used', 'damaged', 'defective') THEN
      v_cond := NULL;
    END IF;
    v_pid := NULL;
    IF COALESCE(v_item->>'productId', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      SELECT id INTO v_pid FROM public.products
      WHERE id = (v_item->>'productId')::uuid AND tenant_id = v_tenant_id;
    END IF;
    INSERT INTO public.rh_return_items (return_id, tenant_id, product_id, name, quantity, condition)
    VALUES (v_return_id, v_tenant_id, v_pid, v_item_name, v_qty, v_cond);
  END LOOP;

  INSERT INTO public.rh_return_timeline (return_id, tenant_id, status, comment, actor_type)
  VALUES (v_return_id, v_tenant_id, 'CREATED', 'Return registered via customer portal', 'customer');

  PERFORM public._public_returns_record(
    ARRAY[v_email_bucket, v_tenant_bucket, v_ip_bucket, v_ip_all_bucket]
  );

  RETURN jsonb_build_object(
    'success', true,
    'return_id', v_return_id,
    'return_number', v_number,
    'tenant_id', v_tenant_id,
    'customer_id', v_customer_id
  );
END $$;

REVOKE ALL ON FUNCTION public.public_create_return(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_create_return(UUID, JSONB) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. Workflows for public / customer-portal return events
-- ---------------------------------------------------------------------
-- Public returns are now created/cancelled inside SECURITY DEFINER RPCs, and
-- anon can no longer read returns, so the browser-side legacy engine
-- (rh-workflow-engine.ts, rules with server_execution=false) cannot run for
-- them. Only the DB trigger `workflow_capture` (durable engine, rules with
-- server_execution=true) sees these events. Move active return_created /
-- return_status_changed rules to the durable engine. The browser engine skips
-- server_execution rules, so admin-created events do not fire twice.
-- Rules the durable engine cannot run (not saved in the visual builder,
-- unknown action type, validation error) stay unchanged and raise a WARNING
-- that must be resolved (re-save in the builder) before go-live.
DO $$
DECLARE
  r RECORD;
  v_bad TEXT;
BEGIN
  IF to_regclass('public.rh_workflow_rules') IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM pg_catalog.pg_attribute
        WHERE attrelid = 'public.rh_workflow_rules'::regclass
          AND attname = 'server_execution' AND NOT attisdropped)
  THEN
    RAISE WARNING 'rh_workflow_rules.server_execution missing: apply 20260921_durable_workflows.sql first';
    RETURN;
  END IF;

  FOR r IN
    SELECT id, name, tenant_id, trigger_type, conditions
      FROM public.rh_workflow_rules
     WHERE active
       AND NOT server_execution
       AND trigger_type IN ('return_created', 'return_status_changed')
  LOOP
    IF r.conditions->>'_graphVersion' IS DISTINCT FROM '2'
       OR jsonb_typeof(r.conditions->'nodes') IS DISTINCT FROM 'array' THEN
      RAISE WARNING 'Workflow rule % (%) on tenant % is not in graph format v2; re-save it in the visual builder and enable server execution',
        r.name, r.id, r.tenant_id;
      CONTINUE;
    END IF;

    SELECT string_agg(DISTINCT COALESCE(n#>>'{data,actionType}', '<none>'), ', ')
      INTO v_bad
      FROM jsonb_array_elements(r.conditions->'nodes') n
     WHERE n->>'type' = 'action'
       AND COALESCE(n#>>'{data,actionType}', '') NOT IN (
         'set_status', 'set_priority', 'assign', 'approve', 'reject', 'add_note', 'update_field',
         'timeline_add_entry', 'ticket_create', 'ticket_set_status', 'ticket_set_priority',
         'ticket_assign', 'ticket_add_message', 'ticket_add_tag', 'customer_update_risk_score',
         'customer_add_tag', 'customer_update_notes', 'email_send_template', 'email_send_custom',
         'notification_internal', 'webhook_call');
    IF v_bad IS NOT NULL THEN
      RAISE WARNING 'Workflow rule % (%) uses actions the durable engine does not support (%); left unchanged',
        r.name, r.id, v_bad;
      CONTINUE;
    END IF;

    BEGIN
      UPDATE public.rh_workflow_rules SET server_execution = true WHERE id = r.id;
      RAISE NOTICE 'Workflow rule % (%) moved to server execution', r.name, r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Workflow rule % (%) could not be moved to server execution: %', r.name, r.id, SQLERRM;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 8. Workflow rules are never readable by anon (re-audit RLS-1)
-- ---------------------------------------------------------------------
-- 20260611_tighten_anon_rls kept "Anon read workflow rules" (active = true,
-- no tenant filter) for the browser workflow engine on public flows. Public
-- return/ticket events now run in the durable engine (section 7 above and
-- section 9 below), so anon no longer needs the rules. The policy leaked every
-- tenant's rule graphs, including webhook URLs, Authorization headers and
-- internal e-mail bodies/recipients. Webhook credentials already stored in
-- rules must be treated as leaked and rotated by the tenants.
DROP POLICY IF EXISTS "Anon read workflow rules" ON public.rh_workflow_rules;
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'rh_workflow_rules' AND 'anon' = ANY (roles)
  LOOP
    RAISE NOTICE 'Dropping policy % on rh_workflow_rules', pol.policyname;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.rh_workflow_rules', pol.policyname);
  END LOOP;
END $$;
REVOKE ALL ON public.rh_workflow_rules FROM anon;

-- ---------------------------------------------------------------------
-- 9. Public support tickets only through a rate-limited RPC (re-audit RLS-2)
-- ---------------------------------------------------------------------
-- The anon INSERT policies on rh_customers / rh_tickets / rh_ticket_messages
-- (20260611_tighten_anon_rls 3a-3c) let anyone create tickets for any tenant,
-- with any customer e-mail and free text, without a rate limit. Every insert
-- fired the tenant's durable ticket_created workflows (e.g. an auto-reply
-- e-mail to the attacker-chosen address). They are replaced by
-- public_create_ticket(): tenant must have an enabled + licensed Returns Hub
-- and public ticket creation switched on, input is validated and
-- length-limited, and creation is rate limited per IP (+tenant), per e-mail
-- (+tenant) and tenant-wide (circuit breaker). Workflow mails caused by
-- public events are additionally capped and sanitised in
-- 20261001g_workflow_public_mail_limits.sql.
DROP POLICY IF EXISTS "Allow anon to create customer records" ON public.rh_customers;
DROP POLICY IF EXISTS "Public insert customers" ON public.rh_customers;
DROP POLICY IF EXISTS "Allow anon to create tickets" ON public.rh_tickets;
DROP POLICY IF EXISTS "Allow anon to create ticket messages" ON public.rh_ticket_messages;
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('rh_customers', 'rh_tickets', 'rh_ticket_messages')
       AND (
         'anon' = ANY (roles)
         OR (COALESCE(TRIM(qual), 'true') = 'true'
             AND COALESCE(TRIM(with_check), 'true') = 'true')
       )
  LOOP
    RAISE NOTICE 'Dropping policy % on %', pol.policyname, pol.tablename;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.rh_customers, public.rh_tickets, public.rh_ticket_messages FROM anon;

-- Client IP for the ticket buckets. Same order as public_enqueue_notification
-- (20261001d): cf-connecting-ip, then the RIGHT-most X-Forwarded-For hop (the
-- first entry is client-controlled), then x-real-ip.
CREATE OR REPLACE FUNCTION public._public_ticket_client_ip()
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
  RETURN NULLIF(LEFT(COALESCE(
    NULLIF(TRIM(v_headers ->> 'cf-connecting-ip'), ''),
    NULLIF(TRIM(regexp_replace(COALESCE(v_headers ->> 'x-forwarded-for', ''), '^.*,', '')), ''),
    NULLIF(TRIM(v_headers ->> 'x-real-ip'), '')
  ), 64), '');
END $$;
REVOKE ALL ON FUNCTION public._public_ticket_client_ip() FROM PUBLIC, anon, authenticated;

-- p_payload: { tenantSlug?, source: 'public_product_page' | 'public_return_portal',
--              email, name?, subject, message, returnNumber?,
--              product?: { productName, gtin, serialNumber } }
-- Rate limits (rolling hour, table public_returns_rate_limit):
--   ticket:ip:<tenant>:<md5 ip>     5 per IP + tenant
--   ticket:ipall:<md5 ip>           20 per IP, all tenants
--   ticket:email:<tenant>:<md5>     3 per e-mail + tenant
--   ticket:tenant:<tenant>          500 per tenant (circuit breaker, WARNING)
-- Refusals are returned as {success:false, error}, never raised.
CREATE OR REPLACE FUNCTION public.public_create_ticket(p_tenant_id UUID, p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID := p_tenant_id;
  v_settings JSONB;
  v_source TEXT;
  v_email TEXT;
  v_name TEXT;
  v_subject TEXT;
  v_message TEXT;
  v_ip TEXT;
  v_ip_bucket TEXT;
  v_ip_all_bucket TEXT;
  v_email_bucket TEXT;
  v_tenant_bucket TEXT;
  v_customer_id UUID;
  v_return public.rh_returns;
  v_return_id UUID;
  v_ticket_id UUID := gen_random_uuid();
  v_number TEXT;
  v_tries INT := 0;
  v_meta JSONB;
  v_product JSONB;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_payload');
  END IF;

  IF v_tenant_id IS NULL THEN
    SELECT id INTO v_tenant_id FROM public.tenants
     WHERE slug = LEFT(TRIM(COALESCE(p_payload->>'tenantSlug', '')), 120);
  END IF;
  SELECT settings INTO v_settings FROM public.tenants WHERE id = v_tenant_id;
  IF v_tenant_id IS NULL OR NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'tenant_not_found');
  END IF;
  -- Licensed + enabled Returns Hub AND public ticket creation switched on.
  -- Same answer for every refusal so tenant configuration is not disclosed.
  IF NOT public._public_returns_tenant_enabled(v_tenant_id)
     OR COALESCE(v_settings #>> '{returnsHub,customerPortal,features,createTickets}', 'false') <> 'true' THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_enabled');
  END IF;

  v_source := COALESCE(p_payload->>'source', 'public_return_portal');
  IF v_source NOT IN ('public_product_page', 'public_return_portal') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_payload');
  END IF;

  v_email := LOWER(TRIM(COALESCE(p_payload->>'email', '')));
  IF LENGTH(v_email) > 254 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_email');
  END IF;
  v_subject := TRIM(regexp_replace(COALESCE(p_payload->>'subject', ''), '[[:cntrl:]]', ' ', 'g'));
  v_message := TRIM(COALESCE(p_payload->>'message', ''));
  IF v_subject = '' OR LENGTH(v_subject) > 200 OR v_message = '' OR LENGTH(v_message) > 5000 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input');
  END IF;
  v_name := NULLIF(LEFT(TRIM(regexp_replace(COALESCE(p_payload->>'name', ''), '[[:cntrl:]]', ' ', 'g')), 100), '');

  v_ip := public._public_ticket_client_ip();
  IF v_ip IS NOT NULL THEN
    v_ip_bucket := 'ticket:ip:' || v_tenant_id::text || ':' || md5(v_ip);
    v_ip_all_bucket := 'ticket:ipall:' || md5(v_ip);
    PERFORM pg_advisory_xact_lock(hashtext(v_ip_all_bucket));
    IF public._public_returns_hits(v_ip_bucket) >= 5
       OR public._public_returns_hits(v_ip_all_bucket) >= 20 THEN
      RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
    END IF;
  END IF;
  v_email_bucket := 'ticket:email:' || v_tenant_id::text || ':' || md5(v_email);
  v_tenant_bucket := 'ticket:tenant:' || v_tenant_id::text;
  PERFORM pg_advisory_xact_lock(hashtext(v_email_bucket));
  IF public._public_returns_hits(v_email_bucket) >= 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;
  IF public._public_returns_hits(v_tenant_bucket) >= 500 THEN
    RAISE WARNING 'ALERT public_create_ticket circuit breaker tripped for tenant % (>= 500 public tickets in 1h)',
      v_tenant_id;
    RETURN jsonb_build_object('success', false, 'error', 'rate_limited');
  END IF;

  -- Optional link to a return: only when this e-mail owns it.
  IF NULLIF(TRIM(COALESCE(p_payload->>'returnNumber', '')), '') IS NOT NULL THEN
    SELECT * INTO v_return FROM public.rh_returns
     WHERE tenant_id = v_tenant_id
       AND return_number = LEFT(TRIM(p_payload->>'returnNumber'), 64)
     ORDER BY created_at DESC
     LIMIT 1;
    IF v_return.id IS NOT NULL AND public._public_return_email_matches(v_return, v_email) THEN
      v_return_id := v_return.id;
    END IF;
  END IF;

  SELECT id INTO v_customer_id FROM public.rh_customers
   WHERE tenant_id = v_tenant_id AND LOWER(TRIM(email)) = v_email
   ORDER BY created_at
   LIMIT 1;
  IF v_customer_id IS NULL THEN
    v_customer_id := gen_random_uuid();
    INSERT INTO public.rh_customers (id, tenant_id, email, first_name, tags, notes)
    VALUES (
      v_customer_id, v_tenant_id, v_email,
      COALESCE(v_name, split_part(v_email, '@', 1)),
      ARRAY['public-ticket'],
      CASE v_source WHEN 'public_product_page' THEN 'Customer created via public product page ticket'
                    ELSE 'Customer created via public return portal ticket' END
    );
  END IF;

  LOOP
    v_number := 'TKT-' || to_char(now(), 'YYYYMMDD') || '-'
             || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.rh_tickets WHERE tenant_id = v_tenant_id AND ticket_number = v_number
    );
    v_tries := v_tries + 1;
    IF v_tries > 10 THEN
      RETURN jsonb_build_object('success', false, 'error', 'number_generation_failed');
    END IF;
  END LOOP;

  v_meta := jsonb_build_object('source', v_source, 'contact_email', v_email);
  v_product := p_payload->'product';
  IF v_source = 'public_product_page' AND v_product IS NOT NULL AND jsonb_typeof(v_product) = 'object' THEN
    v_meta := v_meta || jsonb_strip_nulls(jsonb_build_object(
      'productName', NULLIF(LEFT(TRIM(COALESCE(v_product->>'productName', '')), 200), ''),
      'gtin', NULLIF(LEFT(TRIM(COALESCE(v_product->>'gtin', '')), 32), ''),
      'serialNumber', NULLIF(LEFT(TRIM(COALESCE(v_product->>'serialNumber', '')), 64), '')
    ));
  END IF;

  INSERT INTO public.rh_tickets (
    id, tenant_id, ticket_number, customer_id, return_id, subject,
    category, priority, status, tags, metadata
  ) VALUES (
    v_ticket_id, v_tenant_id, v_number, v_customer_id, v_return_id, v_subject,
    CASE v_source WHEN 'public_product_page' THEN 'product_inquiry' ELSE 'return_inquiry' END,
    'normal', 'open',
    CASE v_source WHEN 'public_product_page' THEN ARRAY['public-product-page'] ELSE ARRAY['public-return-portal'] END,
    v_meta
  );

  INSERT INTO public.rh_ticket_messages (
    ticket_id, tenant_id, sender_type, sender_id, sender_name, sender_email, content, is_internal
  ) VALUES (
    v_ticket_id, v_tenant_id, 'customer', v_customer_id,
    COALESCE(v_name, split_part(v_email, '@', 1)), v_email, v_message, false
  );

  PERFORM public._public_returns_record(
    ARRAY[v_email_bucket, v_tenant_bucket, v_ip_bucket, v_ip_all_bucket]
  );

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'ticket_number', v_number,
    'tenant_id', v_tenant_id
  );
END $$;

REVOKE ALL ON FUNCTION public.public_create_ticket(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_create_ticket(UUID, JSONB) TO anon, authenticated;
