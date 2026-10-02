-- =====================================================================
-- 20261001f_stage2_restrict_public_product_select.sql
-- (Go-live hardening, SRE-07 / RLS-5 stage 2; rewritten by package B)
--
-- STAGED ON PURPOSE (lives in supabase/, not supabase/migrations/), so a bare
-- `node scripts/db-migrate.mjs` never applies it. It removes every anon /
-- unconstrained SELECT path on the public DPP tables for ALL tenants:
--   products, product_batches, supply_chain_entries, product_components,
--   product_images, visibility_settings, documents.
-- Public DPP pages read exclusively through the SECURITY DEFINER RPCs
--   get_public_dpp_product(text[], text, text)   (migrations/20261001i)
--   resolve_public_dpp_product(text[], text)     (migrations/20261001f)
-- and tenant settings through get_public_tenant_by_id (20261001b).
--
-- Kept separate from 20261001i on purpose: the frontend that is live before
-- the 20261001i deploy still reads these tables directly, so dropping the
-- policies in the same step as adding the RPC would break every public DPP
-- page between `db-migrate` and the Vercel deploy.
--
-- Apply ONLY after
--   1. migrations/20261001i_public_dpp_visibility.sql is applied
--      (this script aborts otherwise), and
--   2. the frontend that calls get_public_dpp_product (use-public-product.ts,
--      products.ts getPublicDppProduct, tenants.ts getPublic*ByProduct) is
--      deployed, and /p/:gtin/:serial, /01/:gtin/21/:serial and both
--      /customs variants (incl. a set product) were checked in a private
--      window.
--
--   node scripts/db-migrate.mjs --file 20261001f_stage2_restrict_public_product_select.sql
--   (--file exits 0 on failure: read the output, then run the post-checks below)
--
-- Tenant members keep SELECT on their own rows: an explicit tenant-scoped
-- SELECT policy (TO authenticated) is (re)created for every table first, so
-- the result does not depend on which legacy tenant policies exist in prod.
-- Service-role code (edge functions, api/v1/public/products) bypasses RLS and
-- is unaffected. Idempotent: safe to run multiple times.
-- =====================================================================

DO $$
BEGIN
  IF to_regprocedure('public.get_public_dpp_product(text[], text, text)') IS NULL THEN
    RAISE EXCEPTION 'stage 2 aborted: apply migrations/20261001i_public_dpp_visibility.sql first';
  END IF;
END $$;

-- 1. Guaranteed tenant-scoped read access for authenticated tenant members.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['products', 'product_batches', 'supply_chain_entries', 'product_components',
                           'product_images', 'visibility_settings', 'documents']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_stage2_tenant_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated '
      'USING (tenant_id IN (SELECT pr.tenant_id FROM public.profiles pr WHERE pr.id = auth.uid()))',
      t || '_stage2_tenant_select', t);
  END LOOP;
END $$;

-- 2. Known blanket public policies.
DROP POLICY IF EXISTS "Public can view products by GTIN for DPP" ON public.products;
DROP POLICY IF EXISTS "Public can view batches for DPP" ON public.product_batches;
DROP POLICY IF EXISTS "Public can view supply chain for DPP" ON public.supply_chain_entries;
DROP POLICY IF EXISTS "product_components_public_read" ON public.product_components;
DROP POLICY IF EXISTS "Public can view product images for DPP" ON public.product_images;
DROP POLICY IF EXISTS "Public can view visibility settings for DPP" ON public.visibility_settings;

-- 3. Prod-only leftovers: any SELECT/ALL policy on these tables that is
--    unconstrained (USING true) or granted to anon. Tenant-scoped policies
--    (TO public with a tenant qual) are kept.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('products', 'product_batches', 'supply_chain_entries', 'product_components',
                        'product_images', 'visibility_settings', 'documents')
      AND cmd IN ('SELECT', 'ALL')
      AND (
        'anon' = ANY (roles)
        OR coalesce(btrim(qual), '') IN ('true', '(true)')
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 4. Defence in depth: anon has no business touching these tables at all
--    (every public path is a SECURITY DEFINER RPC or service-role code).
DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['products', 'product_batches', 'supply_chain_entries', 'product_components',
                           'product_images', 'visibility_settings', 'documents']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- Post-checks (SQL editor; both must return 0 rows):
--   SELECT tablename, policyname, roles, qual FROM pg_policies
--   WHERE schemaname = 'public' AND cmd IN ('SELECT','ALL')
--     AND tablename IN ('products','product_batches','supply_chain_entries','product_components',
--                       'product_images','visibility_settings','documents')
--     AND ('anon' = ANY (roles) OR coalesce(btrim(qual),'') IN ('true','(true)'));
--   SELECT table_name, privilege_type FROM information_schema.role_table_grants
--   WHERE grantee = 'anon' AND table_schema = 'public'
--     AND table_name IN ('products','product_batches','supply_chain_entries','product_components',
--                        'product_images','visibility_settings','documents');
