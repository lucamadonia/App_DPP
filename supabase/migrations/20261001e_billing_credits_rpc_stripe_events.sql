-- ============================================================================
-- 20261001e — Billing & AI cost hardening (go-live package E)
--
-- Findings: DB-03/SEC-06 (clients could write their own credit balance),
--           QA-2/SEC-12 (non-atomic credit deduction, no durable rate limit),
--           SRE-11 (Stripe webhook not idempotent), SEC-05/SRE-05 (support).
--
-- 1. Drop every client write policy on billing_credits and
--    billing_credit_transactions and revoke table write grants from
--    anon/authenticated. All mutations now go through the RPCs below.
-- 2. consume_credits()       — atomic (row lock) deduction, monthly first,
--                              then purchased; durable per-tenant rate limit.
--                              Callable by authenticated users (own tenant
--                              only) and by service_role (explicit tenant).
-- 3. refund_credits()        — service_role only (openrouter-proxy refunds
--                              a failed upstream call). Clients can never
--                              add credits.
-- 4. grant_purchased_credits() — service_role only, idempotent per Stripe
--                              checkout session id.
-- 5. stripe_events + claim_stripe_event()/finish_stripe_event() —
--                              webhook idempotency (event id primary key).
-- 6. Guard trigger: tenants.stripe_customer_id and tenants.plan can only be
--    changed by service_role (the webhook resolves the tenant from
--    stripe_customer_id, so tenants must not be able to point it elsewhere).
--
-- Idempotent: safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Helper: is the current request privileged (service_role / DB owner)?
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.billing_is_service_request()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, auth
AS $$
  SELECT coalesce(auth.role(), '') = 'service_role'
      OR session_user IN ('postgres', 'supabase_admin');
$$;

REVOKE EXECUTE ON FUNCTION public.billing_is_service_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_is_service_request() TO service_role;

-- ----------------------------------------------------------------------------
-- 1. Lock down client writes
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "billing_credits_update_own" ON public.billing_credits;
DROP POLICY IF EXISTS "billing_credit_transactions_insert_own" ON public.billing_credit_transactions;

-- Drop any other (possibly dashboard-created) write policy on these tables.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('billing_credits', 'billing_credit_transactions')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.billing_credits FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.billing_credit_transactions FROM anon, authenticated;

-- Fast lookup for the purchase idempotency check.
CREATE INDEX IF NOT EXISTS idx_credit_tx_purchase_session
  ON public.billing_credit_transactions ((metadata ->> 'session_id'))
  WHERE type = 'purchase';

-- ----------------------------------------------------------------------------
-- 2. consume_credits
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.consume_credits(integer, text, jsonb, uuid);

CREATE OR REPLACE FUNCTION public.consume_credits(
  p_amount      integer,
  p_description text  DEFAULT NULL,
  p_metadata    jsonb DEFAULT '{}'::jsonb,
  p_tenant_id   uuid  DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_is_service  boolean := public.billing_is_service_request();
  v_uid         uuid := auth.uid();
  v_tenant      uuid;
  v_row         public.billing_credits%ROWTYPE;
  v_monthly_rem integer;
  v_total       integer;
  v_from_month  integer;
  v_from_purch  integer;
  v_recent      integer;
  v_rate_limit  constant integer := 30;  -- consume calls per tenant per minute
  v_desc        text := left(coalesce(nullif(p_description, ''), 'AI operation'), 200);
  v_meta        jsonb := coalesce(p_metadata, '{}'::jsonb);
BEGIN
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 100 THEN
    RAISE EXCEPTION 'invalid credit amount' USING ERRCODE = '22023';
  END IF;

  IF v_is_service THEN
    IF p_tenant_id IS NULL THEN
      RAISE EXCEPTION 'tenant id required' USING ERRCODE = '22023';
    END IF;
    v_tenant := p_tenant_id;
  ELSE
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
    END IF;
    SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = v_uid;
    IF v_tenant IS NULL THEN
      RAISE EXCEPTION 'no tenant' USING ERRCODE = '42501';
    END IF;
    IF p_tenant_id IS NOT NULL AND p_tenant_id <> v_tenant THEN
      RAISE EXCEPTION 'tenant mismatch' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Serialize all credit mutations for this tenant.
  SELECT * INTO v_row FROM public.billing_credits WHERE tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_CREDIT_ACCOUNT', 'remaining', 0);
  END IF;

  v_monthly_rem := greatest(0, v_row.monthly_allowance - v_row.monthly_used);
  v_total := v_monthly_rem + greatest(0, v_row.purchased_balance);

  -- Durable per-tenant rate limit (survives edge cold starts / instances).
  SELECT count(*) INTO v_recent
  FROM public.billing_credit_transactions
  WHERE tenant_id = v_tenant
    AND type = 'consume'
    AND created_at > now() - interval '1 minute';
  IF v_recent >= v_rate_limit THEN
    RETURN jsonb_build_object('success', false, 'code', 'RATE_LIMITED', 'remaining', v_total);
  END IF;

  IF v_total < p_amount THEN
    RETURN jsonb_build_object('success', false, 'code', 'INSUFFICIENT_CREDITS', 'remaining', v_total);
  END IF;

  v_from_month := least(p_amount, v_monthly_rem);
  v_from_purch := p_amount - v_from_month;

  UPDATE public.billing_credits
     SET monthly_used      = monthly_used + v_from_month,
         purchased_balance = purchased_balance - v_from_purch,
         total_consumed    = total_consumed + p_amount,
         updated_at        = now()
   WHERE tenant_id = v_tenant;

  IF v_from_month > 0 THEN
    INSERT INTO public.billing_credit_transactions
      (tenant_id, type, amount, balance_after, source, description, metadata, user_id)
    VALUES
      (v_tenant, 'consume', -v_from_month, v_total - v_from_month, 'monthly', v_desc, v_meta, v_uid);
  END IF;
  IF v_from_purch > 0 THEN
    INSERT INTO public.billing_credit_transactions
      (tenant_id, type, amount, balance_after, source, description, metadata, user_id)
    VALUES
      (v_tenant, 'consume', -v_from_purch, v_total - p_amount, 'purchased', v_desc, v_meta, v_uid);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'remaining', v_total - p_amount,
    'from_monthly', v_from_month,
    'from_purchased', v_from_purch
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_credits(integer, text, jsonb, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_credits(integer, text, jsonb, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.consume_credits(integer, text, jsonb, uuid) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 3. refund_credits (service_role only)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.refund_credits(uuid, integer, integer, text, jsonb);

CREATE OR REPLACE FUNCTION public.refund_credits(
  p_tenant_id      uuid,
  p_from_monthly   integer,
  p_from_purchased integer DEFAULT 0,
  p_description    text  DEFAULT NULL,
  p_metadata       jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row     public.billing_credits%ROWTYPE;
  v_month   integer := greatest(0, coalesce(p_from_monthly, 0));
  v_purch   integer := greatest(0, coalesce(p_from_purchased, 0));
  v_total   integer;
  v_desc    text := left('Refund: ' || coalesce(nullif(p_description, ''), 'AI operation'), 200);
BEGIN
  IF NOT public.billing_is_service_request() THEN
    RAISE EXCEPTION 'refund_credits is restricted to the service role' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant id required' USING ERRCODE = '22023';
  END IF;
  IF v_month + v_purch < 1 OR v_month + v_purch > 100 THEN
    RAISE EXCEPTION 'invalid refund amount' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_row FROM public.billing_credits WHERE tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'code', 'NO_CREDIT_ACCOUNT');
  END IF;

  -- Never refund more monthly usage than was recorded.
  v_month := least(v_month, v_row.monthly_used);

  UPDATE public.billing_credits
     SET monthly_used      = monthly_used - v_month,
         purchased_balance = purchased_balance + v_purch,
         total_consumed    = greatest(0, total_consumed - (v_month + v_purch)),
         updated_at        = now()
   WHERE tenant_id = p_tenant_id;

  v_total := greatest(0, v_row.monthly_allowance - (v_row.monthly_used - v_month))
           + v_row.purchased_balance + v_purch;

  IF v_month > 0 THEN
    INSERT INTO public.billing_credit_transactions
      (tenant_id, type, amount, balance_after, source, description, metadata)
    VALUES (p_tenant_id, 'refund', v_month, v_total, 'monthly', v_desc, coalesce(p_metadata, '{}'::jsonb));
  END IF;
  IF v_purch > 0 THEN
    INSERT INTO public.billing_credit_transactions
      (tenant_id, type, amount, balance_after, source, description, metadata)
    VALUES (p_tenant_id, 'refund', v_purch, v_total, 'purchased', v_desc, coalesce(p_metadata, '{}'::jsonb));
  END IF;

  RETURN jsonb_build_object('success', true, 'remaining', v_total);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.refund_credits(uuid, integer, integer, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refund_credits(uuid, integer, integer, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_credits(uuid, integer, integer, text, jsonb) TO service_role;

-- ----------------------------------------------------------------------------
-- 4. grant_purchased_credits (service_role only, idempotent per session)
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.grant_purchased_credits(uuid, integer, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.grant_purchased_credits(
  p_tenant_id   uuid,
  p_amount      integer,
  p_session_id  text,
  p_description text  DEFAULT NULL,
  p_metadata    jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.billing_credits%ROWTYPE;
BEGIN
  IF NOT public.billing_is_service_request() THEN
    RAISE EXCEPTION 'grant_purchased_credits is restricted to the service role' USING ERRCODE = '42501';
  END IF;
  IF p_tenant_id IS NULL OR coalesce(p_session_id, '') = '' THEN
    RAISE EXCEPTION 'tenant id and session id required' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount < 1 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'invalid credit amount' USING ERRCODE = '22023';
  END IF;

  -- Make sure a credit account exists, then lock it (serializes concurrent
  -- deliveries of the same event).
  INSERT INTO public.billing_credits (tenant_id) VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;

  SELECT * INTO v_row FROM public.billing_credits WHERE tenant_id = p_tenant_id FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.billing_credit_transactions
    WHERE type = 'purchase'
      AND metadata ->> 'session_id' = p_session_id
  ) THEN
    RETURN jsonb_build_object('granted', false, 'reason', 'already_granted',
                              'purchased_balance', v_row.purchased_balance);
  END IF;

  UPDATE public.billing_credits
     SET purchased_balance = purchased_balance + p_amount,
         total_purchased   = total_purchased + p_amount,
         updated_at        = now()
   WHERE tenant_id = p_tenant_id;

  INSERT INTO public.billing_credit_transactions
    (tenant_id, type, amount, balance_after, source, description, metadata)
  VALUES (
    p_tenant_id, 'purchase', p_amount, v_row.purchased_balance + p_amount, 'purchased',
    left(coalesce(nullif(p_description, ''), 'Credit pack purchase'), 200),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('session_id', p_session_id)
  );

  RETURN jsonb_build_object('granted', true, 'purchased_balance', v_row.purchased_balance + p_amount);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_purchased_credits(uuid, integer, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_purchased_credits(uuid, integer, text, text, jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_purchased_credits(uuid, integer, text, text, jsonb) TO service_role;

-- ----------------------------------------------------------------------------
-- 5. Stripe webhook idempotency
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stripe_events (
  event_id     text PRIMARY KEY,
  type         text NOT NULL,
  status       text NOT NULL DEFAULT 'processing'
               CHECK (status IN ('processing', 'processed', 'failed')),
  attempts     integer NOT NULL DEFAULT 1,
  last_error   text,
  received_at  timestamptz NOT NULL DEFAULT now(),
  claimed_at   timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (bypasses RLS) may touch it.
REVOKE ALL ON public.stripe_events FROM anon, authenticated;

/**
 * Returns 'claimed' when the caller should process the event,
 * 'duplicate' when it was already processed, and 'in_flight' when another
 * delivery is processing it right now (caller should answer non-2xx so
 * Stripe retries later). A 'failed' or stale 'processing' row is re-claimed.
 */
CREATE OR REPLACE FUNCTION public.claim_stripe_event(p_event_id text, p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.billing_is_service_request() THEN
    RAISE EXCEPTION 'claim_stripe_event is restricted to the service role' USING ERRCODE = '42501';
  END IF;
  IF coalesce(p_event_id, '') = '' THEN
    RAISE EXCEPTION 'event id required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.stripe_events (event_id, type)
  VALUES (p_event_id, coalesce(p_type, 'unknown'))
  ON CONFLICT (event_id) DO NOTHING;
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  UPDATE public.stripe_events
     SET status = 'processing',
         attempts = attempts + 1,
         claimed_at = now(),
         last_error = NULL
   WHERE event_id = p_event_id
     AND (status = 'failed'
          OR (status = 'processing' AND claimed_at < now() - interval '5 minutes'));
  IF FOUND THEN
    RETURN 'claimed';
  END IF;

  SELECT status INTO v_status FROM public.stripe_events WHERE event_id = p_event_id;
  RETURN CASE WHEN v_status = 'processed' THEN 'duplicate' ELSE 'in_flight' END;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_stripe_event(p_event_id text, p_success boolean, p_error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.billing_is_service_request() THEN
    RAISE EXCEPTION 'finish_stripe_event is restricted to the service role' USING ERRCODE = '42501';
  END IF;
  UPDATE public.stripe_events
     SET status = CASE WHEN p_success THEN 'processed' ELSE 'failed' END,
         processed_at = CASE WHEN p_success THEN now() ELSE processed_at END,
         last_error = CASE WHEN p_success THEN NULL ELSE left(p_error, 1000) END
   WHERE event_id = p_event_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_stripe_event(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_stripe_event(text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_event(text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.finish_stripe_event(text, boolean, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finish_stripe_event(text, boolean, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_stripe_event(text, boolean, text) TO service_role;

-- ----------------------------------------------------------------------------
-- 6. Guard billing-relevant tenant columns
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenants_guard_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.billing_is_service_request() THEN
    RETURN NEW;
  END IF;
  IF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
    RAISE EXCEPTION 'tenants.stripe_customer_id can only be changed by the billing backend'
      USING ERRCODE = '42501';
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'tenants.plan can only be changed by the billing backend'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tenants_guard_billing_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_tenants_guard_billing_columns ON public.tenants;
CREATE TRIGGER trg_tenants_guard_billing_columns
  BEFORE UPDATE OF stripe_customer_id, plan ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.tenants_guard_billing_columns();
