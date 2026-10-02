-- =====================================================================
-- 20261001f_stage2_restrict_public_product_select.sql
-- (Go-live hardening, package F, stage 2 of SRE-07)
--
-- STAGED ON PURPOSE (lives in supabase/, not supabase/migrations/):
-- removes the blanket anon/public SELECT on products, product_batches,
-- supply_chain_entries and product_components. Public DPP pages must read
-- through get_public_dpp_product / resolve_public_dpp_product
-- (created in migrations/20261001f_supplier_portal_rpc.sql) instead.
--
-- Apply ONLY after
--   1. migrations/20261001f_supplier_portal_rpc.sql is applied, and
--   2. the frontend that uses the RPCs (products.ts getProductByGtinSerial,
--      visibility.ts getPublicVisibilitySettings, tenants.ts
--      getPublicBrandingByProduct / getPublicTenantQRSettings /
--      getPublicTenantDPPDesign, product-components.ts
--      getProductComponentsPublic) is deployed and a public DPP page
--      (/p/:gtin/:serial and /01/:gtin/21/:serial, customer + customs view,
--      a set product with components) was verified in a private window.
--
--   node scripts/db-migrate.mjs --file 20261001f_stage2_restrict_public_product_select.sql
--
-- Tenant members keep their own tenant-scoped SELECT policies.
-- Idempotent: safe to run multiple times.
-- =====================================================================

DROP POLICY IF EXISTS "Public can view products by GTIN for DPP" ON public.products;
DROP POLICY IF EXISTS "Public can view batches for DPP" ON public.product_batches;
DROP POLICY IF EXISTS "Public can view supply chain for DPP" ON public.supply_chain_entries;
DROP POLICY IF EXISTS "product_components_public_read" ON public.product_components;

-- Prod-only leftovers: any SELECT policy on these tables that is unconstrained
-- (USING true) or granted to anon.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('products', 'product_batches', 'supply_chain_entries', 'product_components')
      AND cmd IN ('SELECT', 'ALL')
      AND (
        'anon' = ANY (roles)
        OR coalesce(btrim(qual), '') IN ('true', '(true)')
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;
