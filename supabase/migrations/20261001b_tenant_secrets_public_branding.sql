-- ================================================================
-- Migration: 20261001b_tenant_secrets_public_branding.sql
--
-- Go-live hardening, package B (DB-02 / SEC-01 / SRE-01).
--
-- Problem: "Public can read tenants for DPP" (TO public USING (true)) let
-- anyone holding the public anon key read tenants.settings, which held the
-- DHL GKP credentials, the Deutsche Post INTERNETMARKE / Portokasse login and
-- the Shopify Admin access token of every tenant.
--
-- This migration:
--   1. Creates public.tenant_secrets (RLS on, no anon/authenticated policies,
--      no grants) — readable only by the service role (edge functions).
--   2. Installs a BEFORE INSERT/UPDATE trigger on tenants that moves any
--      credential written into tenants.settings into tenant_secrets and strips
--      it from settings. This is the single choke point: whatever writes
--      settings (old clients, edge functions, the SQL editor), secrets never
--      persist in the anon/tenant-readable JSONB again.
--   3. Migrates existing credentials (touching the rows fires the trigger).
--   4. Replaces the anon USING(true) SELECT on tenants: anon keeps row
--      visibility for the `id` column only (the hardened anon INSERT policies
--      from 20260611 use EXISTS (SELECT 1 FROM tenants WHERE id = ...)),
--      every other column is revoked. A pg_policies sweep drops any other
--      open (USING true) SELECT/ALL policy (dashboard drift). Authenticated
--      users keep the own-tenant policy "Users can view their tenant";
--      super admins get "Super admins can view all tenants" (admin panel).
--      Tenant INSERT becomes service-role only (signup runs through the
--      SECURITY DEFINER handle_new_user); the open "Service can create
--      tenants" policy and authenticated's INSERT grant are removed. The
--      secrets trigger never merges on unprivileged INSERTs.
--      Portal custom domains are unique server-side (trigger + index) and
--      get_public_tenant_by_domain fails closed on ambiguity.
--   7. Hard post-conditions RAISE if anon can still read settings/name/slug,
--      an open policy remains, or credentials remain in settings.
--   5. Adds SECURITY DEFINER RPCs that return ONLY whitelisted public
--      branding / portal fields:
--        get_public_tenant_by_id(uuid), get_public_tenant_by_slug(text),
--        get_public_tenant_by_domain(text), get_public_tenant_branding(uuid)
--      plus is_portal_domain_available(text) for the domain wizard,
--      get_own_tenant_secret_status() (booleans only) and
--      delete_own_tenant_secret(text) (admin, write-only).
--   6. Makes resolve_tenant_by_host() SECURITY DEFINER (it was invoker-mode
--      and relied on the anon USING(true) policy).
--
-- Idempotent. AFTER deploying: rotate every DHL / Portokasse / Shopify
-- credential that ever lived in tenants.settings — treat them as leaked.
-- ================================================================

-- ----------------------------------------------------------------
-- 1. tenant_secrets
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tenant_secrets (
  tenant_id  uuid        NOT NULL,
  provider   text        NOT NULL CHECK (provider IN ('dhl', 'internetmarke', 'shopify')),
  secrets    jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, provider)
);

-- Deferred FK so the BEFORE INSERT trigger on tenants may already write the
-- secret row for a tenant that is being inserted in the same statement.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_secrets_tenant_id_fkey'
  ) THEN
    ALTER TABLE public.tenant_secrets
      ADD CONSTRAINT tenant_secrets_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id)
      ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

ALTER TABLE public.tenant_secrets ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: only service_role (BYPASSRLS) may touch rows.
REVOKE ALL ON public.tenant_secrets FROM PUBLIC;
REVOKE ALL ON public.tenant_secrets FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_secrets TO service_role;

COMMENT ON TABLE public.tenant_secrets IS
  'Per-tenant integration credentials (DHL, INTERNETMARKE/Portokasse, Shopify). Service role only — never expose to anon/authenticated.';

-- ----------------------------------------------------------------
-- 2. Trigger: move credentials out of tenants.settings
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenant_secrets_merge(
  p_tenant_id uuid, p_provider text, p_secrets jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_tenant_id IS NULL OR p_secrets IS NULL OR p_secrets = '{}'::jsonb THEN
    RETURN;
  END IF;
  INSERT INTO public.tenant_secrets AS s (tenant_id, provider, secrets)
  VALUES (p_tenant_id, p_provider, p_secrets)
  ON CONFLICT (tenant_id, provider) DO UPDATE
    SET secrets = s.secrets || EXCLUDED.secrets,
        updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.tenant_secrets_merge(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

-- SECURITY: credentials are only ever merged into tenant_secrets for
--   * UPDATE: OLD.id, the row the caller already passed the UPDATE RLS
--     policy for (never NEW.id, which a caller could try to change), and
--   * INSERT: only when the caller is privileged (service_role JWT, or a
--     direct DB session such as postgres / supabase_auth_admin). BEFORE
--     INSERT row triggers fire before the ON CONFLICT check, so merging on an
--     unprivileged INSERT would let `INSERT ... ON CONFLICT DO NOTHING` with a
--     victim's tenant id overwrite the victim's secrets while the row itself
--     is silently skipped. Unprivileged inserts only get secrets stripped.
-- Inside SECURITY DEFINER current_user is the owner, so the caller is derived
-- from the PostgREST JWT claims plus session_user.
CREATE OR REPLACE FUNCTION public.tenants_extract_secrets()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_dhl    jsonb;
  v_im     jsonb;
  v_shop   jsonb;
  v_role   text;
  v_target uuid;
BEGIN
  IF NEW.settings IS NULL OR jsonb_typeof(NEW.settings) <> 'object' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_target := OLD.id;
  ELSE
    v_role := COALESCE(
      NULLIF(current_setting('request.jwt.claim.role', true), ''),
      NULLIF(current_setting('request.jwt.claims', true), '')::jsonb->>'role'
    );
    IF v_role = 'service_role'
       OR (v_role IS NULL AND session_user NOT IN ('authenticator', 'anon', 'authenticated')) THEN
      v_target := NEW.id;
    ELSE
      v_target := NULL;  -- strip only; tenant_secrets_merge ignores NULL ids
    END IF;
  END IF;

  v_dhl := NEW.settings #> '{warehouse,dhl}';
  IF v_dhl IS NOT NULL AND jsonb_typeof(v_dhl) = 'object' THEN
    -- Empty strings are ignored so a partial save never wipes a stored secret.
    PERFORM public.tenant_secrets_merge(v_target, 'dhl', jsonb_strip_nulls(jsonb_build_object(
      'apiKey',   NULLIF(v_dhl->>'apiKey', ''),
      'username', NULLIF(v_dhl->>'username', ''),
      'password', NULLIF(v_dhl->>'password', '')
    )));

    v_im := v_dhl->'internetmarke';
    IF v_im IS NOT NULL AND jsonb_typeof(v_im) = 'object' THEN
      PERFORM public.tenant_secrets_merge(v_target, 'internetmarke', jsonb_strip_nulls(jsonb_build_object(
        'clientId',           NULLIF(v_im->>'clientId', ''),
        'clientSecret',       NULLIF(v_im->>'clientSecret', ''),
        'portokasseUsername', NULLIF(v_im->>'portokasseUsername', ''),
        'portokassePassword', NULLIF(v_im->>'portokassePassword', '')
      )));
    END IF;

    NEW.settings := NEW.settings
      #- '{warehouse,dhl,apiKey}'
      #- '{warehouse,dhl,username}'
      #- '{warehouse,dhl,password}'
      #- '{warehouse,dhl,internetmarke,clientId}'
      #- '{warehouse,dhl,internetmarke,clientSecret}'
      #- '{warehouse,dhl,internetmarke,portokasseUsername}'
      #- '{warehouse,dhl,internetmarke,portokassePassword}';
  END IF;

  v_shop := NEW.settings->'shopifyIntegration';
  IF v_shop IS NOT NULL AND jsonb_typeof(v_shop) = 'object' THEN
    PERFORM public.tenant_secrets_merge(v_target, 'shopify', jsonb_strip_nulls(jsonb_build_object(
      'accessToken', NULLIF(v_shop->>'accessToken', '')
    )));
    NEW.settings := NEW.settings #- '{shopifyIntegration,accessToken}';
  END IF;

  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tenants_extract_secrets() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tenants_extract_secrets ON public.tenants;
CREATE TRIGGER tenants_extract_secrets
  BEFORE INSERT OR UPDATE OF settings ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tenants_extract_secrets();

-- ----------------------------------------------------------------
-- 3. Data migration: touching settings fires the trigger above
-- ----------------------------------------------------------------
UPDATE public.tenants
   SET settings = settings
 WHERE settings #> '{warehouse,dhl}' ?| ARRAY['apiKey', 'username', 'password']
    OR settings #> '{warehouse,dhl,internetmarke}' ?| ARRAY['clientId', 'clientSecret', 'portokasseUsername', 'portokassePassword']
    OR settings #> '{shopifyIntegration}' ? 'accessToken';

-- ----------------------------------------------------------------
-- 4. Lock down anon / cross-tenant SELECT on tenants
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Public can read tenants for DPP" ON public.tenants;

-- anon keeps row visibility so the hardened anon INSERT policies of
-- 20260611 (EXISTS (SELECT 1 FROM tenants WHERE tenants.id = ...)) keep
-- working — but only the id column is granted (see below).
DROP POLICY IF EXISTS "Anon can check tenant existence" ON public.tenants;
CREATE POLICY "Anon can check tenant existence"
  ON public.tenants FOR SELECT
  TO anon
  USING (true);

REVOKE ALL ON public.tenants FROM PUBLIC;
REVOKE ALL ON public.tenants FROM anon;
GRANT SELECT (id) ON public.tenants TO anon;

-- Tenants are created only by handle_new_user() (SECURITY DEFINER, owner
-- postgres) and by the service role. The live DB carries a dashboard policy
-- "Service can create tenants" TO public WITH CHECK (true) plus the default
-- INSERT grant for authenticated, which let any account insert tenant rows
-- (and, before the trigger fix above, target other tenants' secrets).
DROP POLICY IF EXISTS "Service can create tenants" ON public.tenants;
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'tenants'
       AND cmd = 'INSERT'
       AND roles && ARRAY['public', 'anon', 'authenticated']::name[]
  LOOP
    RAISE NOTICE 'Dropping tenants INSERT policy: %', pol.policyname;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenants', pol.policyname);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "Service role can create tenants" ON public.tenants;
CREATE POLICY "Service role can create tenants"
  ON public.tenants FOR INSERT
  TO service_role
  WITH CHECK (true);
REVOKE INSERT ON public.tenants FROM authenticated;

-- Sweep: the live DB may carry dashboard-created policies that are not in
-- the repo. Drop EVERY permissive SELECT/ALL policy on tenants that is open
-- (USING true) to public, anon or authenticated — except the id-only anon
-- policy above. Otherwise cross-tenant settings, stripe_customer_id,
-- admin_notes and suspended_reason would stay readable.
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'tenants'
       AND permissive = 'PERMISSIVE'
       AND cmd IN ('SELECT', 'ALL')
       AND roles && ARRAY['public', 'anon', 'authenticated']::name[]
       AND regexp_replace(lower(COALESCE(qual, '')), '[\s()]', '', 'g') = 'true'
       AND policyname <> 'Anon can check tenant existence'
  LOOP
    RAISE NOTICE 'Dropping open tenants policy: %', pol.policyname;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenants', pol.policyname);
  END LOOP;
END $$;

-- Super-admin panel (admin.ts getTenantsHealth / getTenantHealthScore /
-- getTenantWhitelabel) reads other tenants' rows. It only worked through the
-- dropped USING(true) policy. Safe now that credentials live in
-- tenant_secrets and is_super_admin is locked (20261001a).
DROP POLICY IF EXISTS "Super admins can view all tenants" ON public.tenants;
CREATE POLICY "Super admins can view all tenants"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.is_super_admin = true
    )
  );

-- ----------------------------------------------------------------
-- 5. Public RPCs (whitelisted fields only)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tenant_public_payload(p_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'id',   t.id,
    'name', t.name,
    'slug', t.slug,
    'logo', t.logo,
    'settings', jsonb_strip_nulls(jsonb_build_object(
      'defaultLanguage',  t.settings->'defaultLanguage',
      'productLanguages', t.settings->'productLanguages',
      'publicDomain',     t.settings->'publicDomain',
      'branding',         t.settings->'branding',
      'qrCode',           t.settings->'qrCode',
      'dppDesign',        t.settings->'dppDesign',
      'returnsHub', CASE WHEN t.settings ? 'returnsHub' THEN jsonb_strip_nulls(jsonb_build_object(
        'enabled',             t.settings #> '{returnsHub,enabled}',
        'prefix',              t.settings #> '{returnsHub,prefix}',
        'features',            t.settings #> '{returnsHub,features}',
        'branding',            t.settings #> '{returnsHub,branding}',
        'embedAllowedDomains', t.settings #> '{returnsHub,embedAllowedDomains}',
        'customerPortal',      t.settings #> '{returnsHub,customerPortal}',
        'notifications', jsonb_strip_nulls(jsonb_build_object(
          'emailLocale', t.settings #> '{returnsHub,notifications,emailLocale}'
        )),
        'portalDomain', CASE WHEN t.settings #> '{returnsHub,portalDomain}' IS NOT NULL THEN jsonb_strip_nulls(jsonb_build_object(
          'customDomain', t.settings #> '{returnsHub,portalDomain,customDomain}',
          'portalType',   t.settings #> '{returnsHub,portalDomain,portalType}',
          'domainStatus', t.settings #> '{returnsHub,portalDomain,domainStatus}'
        )) END
      )) END,
      -- Feedback embed widget: display config only (no emails/moderation).
      'feedback', CASE WHEN t.settings ? 'feedback' THEN jsonb_strip_nulls(jsonb_build_object(
        'enabled', t.settings #> '{feedback,enabled}',
        'widget',  CASE WHEN t.settings #> '{feedback,widget}' IS NOT NULL THEN jsonb_strip_nulls(jsonb_build_object(
          'defaultMode',            t.settings #> '{feedback,widget,defaultMode}',
          'maxReviews',             t.settings #> '{feedback,widget,maxReviews}',
          'showRatingDistribution', t.settings #> '{feedback,widget,showRatingDistribution}',
          'showProductFilter',      t.settings #> '{feedback,widget,showProductFilter}',
          'accentColor',            t.settings #> '{feedback,widget,accentColor}',
          'fontFamily',             t.settings #> '{feedback,widget,fontFamily}',
          'cardStyle',              t.settings #> '{feedback,widget,cardStyle}'
        )) END
      )) END,
      'supplierPortal', CASE WHEN t.settings ? 'supplierPortal' THEN jsonb_strip_nulls(jsonb_build_object(
        'enabled',              t.settings #> '{supplierPortal,enabled}',
        'invitationExpiryDays', t.settings #> '{supplierPortal,invitationExpiryDays}',
        'requireApproval',      t.settings #> '{supplierPortal,requireApproval}',
        'welcomeMessage',       t.settings #> '{supplierPortal,welcomeMessage}'
      )) END
    ))
  )
  FROM public.tenants t
  WHERE t.id = p_id;
$$;
-- Internal helper: only reachable through the public wrappers below.
REVOKE ALL ON FUNCTION public.tenant_public_payload(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_tenant_by_id(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tenant_public_payload(p_tenant_id) WHERE p_tenant_id IS NOT NULL;
$$;

-- Plan contract name (package C uses this for portal branding).
CREATE OR REPLACE FUNCTION public.get_public_tenant_branding(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tenant_public_payload(p_tenant_id) WHERE p_tenant_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.get_public_tenant_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.tenant_public_payload(t.id)
    FROM public.tenants t
   WHERE p_slug IS NOT NULL
     AND length(p_slug) BETWEEN 1 AND 100
     AND t.slug = p_slug
   LIMIT 1;
$$;

-- Fail closed on ambiguity: if more than one tenant claims the same verified
-- domain (domainStatus is tenant-writable), resolve to nobody instead of an
-- arbitrary row; otherwise a second tenant could hijack the hostname.
CREATE OR REPLACE FUNCTION public.get_public_tenant_by_domain(p_domain text)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH m AS (
    SELECT t.id
      FROM public.tenants t
     WHERE p_domain ~* '^[a-z0-9.-]{1,255}$'
       AND lower(btrim(t.settings #>> '{returnsHub,portalDomain,customDomain}')) = lower(p_domain)
       AND t.settings #>> '{returnsHub,portalDomain,domainStatus}' = 'verified'
  )
  SELECT public.tenant_public_payload(m.id)
    FROM m
   WHERE (SELECT count(*) FROM m) = 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_tenant_by_id(uuid)     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_tenant_branding(uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_tenant_by_slug(text)   FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_tenant_by_domain(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_tenant_by_id(uuid)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tenant_branding(uuid)  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tenant_by_slug(text)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_tenant_by_domain(text) TO anon, authenticated;

-- Domain wizard: cross-tenant uniqueness check (authenticated tenants can no
-- longer see other tenants' settings).
CREATE OR REPLACE FUNCTION public.is_portal_domain_available(p_domain text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = auth.uid();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_domain IS NULL OR p_domain !~* '^[a-z0-9.-]{1,255}$' THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.tenants t
     WHERE t.id <> v_tenant
       AND lower(t.settings #>> '{returnsHub,portalDomain,customDomain}') = lower(p_domain)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.is_portal_domain_available(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_portal_domain_available(text) TO authenticated;

-- Server-side uniqueness of portal custom domains (is_portal_domain_available
-- is only a client-side hint). First claim wins; a second tenant writing the
-- same customDomain is rejected. SECURITY DEFINER so it sees all tenants.
CREATE OR REPLACE FUNCTION public.tenants_guard_portal_domain()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_domain text := lower(NULLIF(btrim(NEW.settings #>> '{returnsHub,portalDomain,customDomain}'), ''));
BEGIN
  IF v_domain IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND v_domain IS NOT DISTINCT FROM lower(NULLIF(btrim(OLD.settings #>> '{returnsHub,portalDomain,customDomain}'), '')) THEN
    RETURN NEW;  -- unchanged: never block unrelated settings saves
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.tenants t
     WHERE t.id <> NEW.id
       AND lower(NULLIF(btrim(t.settings #>> '{returnsHub,portalDomain,customDomain}'), '')) = v_domain
  ) THEN
    RAISE EXCEPTION 'Portal domain already in use' USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.tenants_guard_portal_domain() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS tenants_guard_portal_domain ON public.tenants;
CREATE TRIGGER tenants_guard_portal_domain
  BEFORE INSERT OR UPDATE OF settings ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.tenants_guard_portal_domain();

-- Race-proof backstop. Only created when existing data has no duplicates, so
-- the migration never fails on legacy rows (the trigger and the fail-closed
-- resolver still apply; resolve duplicates manually, then re-run).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'tenants_portal_custom_domain_uniq'
  ) THEN
    IF EXISTS (
      SELECT 1
        FROM public.tenants
       WHERE NULLIF(btrim(settings #>> '{returnsHub,portalDomain,customDomain}'), '') IS NOT NULL
       GROUP BY lower(btrim(settings #>> '{returnsHub,portalDomain,customDomain}'))
      HAVING count(*) > 1
    ) THEN
      RAISE WARNING 'Duplicate portal custom domains exist; unique index tenants_portal_custom_domain_uniq NOT created. Resolve duplicates and re-run.';
    ELSE
      CREATE UNIQUE INDEX tenants_portal_custom_domain_uniq
        ON public.tenants (lower(NULLIF(btrim(settings #>> '{returnsHub,portalDomain,customDomain}'), '')));
    END IF;
  END IF;
END $$;

-- Which integrations have credentials stored? Booleans only, own tenant.
CREATE OR REPLACE FUNCTION public.get_own_tenant_secret_status()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_dhl    jsonb;
  v_im     jsonb;
  v_shop   jsonb;
BEGIN
  SELECT tenant_id INTO v_tenant FROM public.profiles WHERE id = auth.uid();
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  SELECT secrets INTO v_dhl  FROM public.tenant_secrets WHERE tenant_id = v_tenant AND provider = 'dhl';
  SELECT secrets INTO v_im   FROM public.tenant_secrets WHERE tenant_id = v_tenant AND provider = 'internetmarke';
  SELECT secrets INTO v_shop FROM public.tenant_secrets WHERE tenant_id = v_tenant AND provider = 'shopify';
  RETURN jsonb_build_object(
    'dhl', COALESCE(v_dhl->>'apiKey', '') <> ''
       AND COALESCE(v_dhl->>'username', '') <> ''
       AND COALESCE(v_dhl->>'password', '') <> '',
    'internetmarke', COALESCE(v_im->>'clientId', '') <> ''
       AND COALESCE(v_im->>'clientSecret', '') <> ''
       AND COALESCE(v_im->>'portokasseUsername', '') <> ''
       AND COALESCE(v_im->>'portokassePassword', '') <> '',
    'shopify', COALESCE(v_shop->>'accessToken', '') <> ''
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_own_tenant_secret_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_own_tenant_secret_status() TO authenticated;

-- Admin-only removal of stored credentials (e.g. "Disconnect Shopify").
CREATE OR REPLACE FUNCTION public.delete_own_tenant_secret(p_provider text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid;
  v_role   text;
BEGIN
  SELECT tenant_id, role INTO v_tenant, v_role FROM public.profiles WHERE id = auth.uid();
  IF v_tenant IS NULL OR v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF p_provider NOT IN ('dhl', 'internetmarke', 'shopify') THEN
    RAISE EXCEPTION 'Unknown provider' USING ERRCODE = '22023';
  END IF;
  DELETE FROM public.tenant_secrets WHERE tenant_id = v_tenant AND provider = p_provider;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_own_tenant_secret(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_tenant_secret(text) TO authenticated;

-- ----------------------------------------------------------------
-- 6. resolve_tenant_by_host: was SECURITY INVOKER and relied on the anon
--    USING(true) policy. Same body, now definer-mode with a fixed path.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_tenant_by_host(p_host TEXT)
  RETURNS TABLE (tenant_id UUID, tenant_name TEXT, whitelabel_config JSONB)
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_host TEXT := LOWER(TRIM(p_host));
  v_subdomain TEXT;
BEGIN
  IF v_host IS NULL OR length(v_host) > 255 THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT t.id, t.name, COALESCE(t.whitelabel_config, '{}'::jsonb)
      FROM public.tenants t
      WHERE LOWER(t.custom_domain) = v_host
        AND t.custom_domain_verified = true
        AND t.status = 'active'
      LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  IF v_host LIKE '%.trackbliss.eu' THEN
    v_subdomain := SPLIT_PART(v_host, '.', 1);
    RETURN QUERY
      SELECT t.id, t.name, COALESCE(t.whitelabel_config, '{}'::jsonb)
        FROM public.tenants t
        WHERE t.subdomain = v_subdomain
          AND t.status = 'active'
        LIMIT 1;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.resolve_tenant_by_host(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_tenant_by_host(TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------
-- 7. Hard post-conditions: fail loudly instead of reporting success while
--    tenant settings / credentials stay readable.
-- ----------------------------------------------------------------
DO $$
BEGIN
  IF has_column_privilege('anon', 'public.tenants', 'settings', 'SELECT')
     OR has_column_privilege('anon', 'public.tenants', 'name', 'SELECT')
     OR has_column_privilege('anon', 'public.tenants', 'slug', 'SELECT')
     OR has_column_privilege('anon', 'public.tenants', 'stripe_customer_id', 'SELECT') THEN
    RAISE EXCEPTION 'tenants still anon-readable beyond id';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'tenants'
       AND permissive = 'PERMISSIVE'
       AND cmd IN ('SELECT', 'ALL')
       AND roles && ARRAY['public', 'authenticated']::name[]
       AND regexp_replace(lower(COALESCE(qual, '')), '[\s()]', '', 'g') = 'true'
  ) THEN
    RAISE EXCEPTION 'tenants still has an open USING(true) SELECT policy for public/authenticated';
  END IF;

  IF has_table_privilege('authenticated', 'public.tenants', 'INSERT')
     OR has_any_column_privilege('authenticated', 'public.tenants', 'INSERT')
     OR has_table_privilege('anon', 'public.tenants', 'INSERT')
     OR has_any_column_privilege('anon', 'public.tenants', 'INSERT') THEN
    RAISE EXCEPTION 'anon/authenticated can still INSERT into tenants';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'tenants'
       AND cmd = 'INSERT'
       AND roles && ARRAY['public', 'anon', 'authenticated']::name[]
  ) THEN
    RAISE EXCEPTION 'tenants still has an INSERT policy for public/anon/authenticated';
  END IF;

  IF has_table_privilege('anon', 'public.tenant_secrets', 'SELECT')
     OR has_table_privilege('authenticated', 'public.tenant_secrets', 'SELECT') THEN
    RAISE EXCEPTION 'tenant_secrets readable by anon/authenticated';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tenants
     WHERE settings #> '{warehouse,dhl}' ?| ARRAY['apiKey', 'username', 'password']
        OR settings #> '{warehouse,dhl,internetmarke}' ?| ARRAY['clientId', 'clientSecret', 'portokasseUsername', 'portokassePassword']
        OR settings #> '{shopifyIntegration}' ? 'accessToken'
  ) THEN
    RAISE EXCEPTION 'credentials still present in tenants.settings';
  END IF;
END $$;
