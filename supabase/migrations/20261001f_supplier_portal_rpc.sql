-- =====================================================================
-- 20261001f_supplier_portal_rpc.sql  (Go-live hardening, package F)
-- Findings: DB-04 (anyone can rewrite any product/batch via the
-- supplier-data-request policies), DB-07 / SRE-07 (supplier data requests
-- incl. password hashes and all supplier invitation codes anon-readable).
--
-- What this migration does:
--   1. Drops every anon / unconstrained policy on supplier_data_requests and
--      supplier_invitations, and every products / product_batches policy that
--      grants access through supplier_data_requests. Revokes anon table
--      privileges on both supplier tables.
--   2. Recreates the tenant-admin INSERT/UPDATE policies on
--      supplier_data_requests (TO authenticated, WITH CHECK) and adds a
--      trigger that rejects product ids from another tenant.
--   3. Hashes data-request passwords server-side with bcrypt (pgcrypto).
--      The client keeps sending the SHA-256 hex of the password; the DB only
--      stores crypt(sha256hex, gen_salt('bf')). Existing rows are re-hashed.
--      Adds a failed-attempt lockout (10 attempts -> 15 min lock).
--   4. SECURITY DEFINER RPCs for the public supplier data portal
--      (code + password verified server-side, field whitelist enforced
--      server-side, tenant of every touched product checked).
--   5. SECURITY DEFINER RPCs for the supplier self-registration portal
--      (lookup by invitation code, registration insert).
--   6. SECURITY DEFINER RPCs for the public DPP page
--      (get_public_dpp_product / resolve_public_dpp_product) so that the
--      blanket anon SELECT on products, product_batches, supply_chain_entries
--      and product_components can be removed. The removal itself is staged in
--      supabase/20261001f_stage2_restrict_public_product_select.sql and must
--      only be applied AFTER the frontend that uses these RPCs is deployed.
--
-- Idempotent: safe to run multiple times.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ---------------------------------------------------------------------
-- 1. Drop anon / unconstrained policies
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view data requests by access code" ON public.supplier_data_requests;
DROP POLICY IF EXISTS "Public can update data request status" ON public.supplier_data_requests;
DROP POLICY IF EXISTS "Public can view invitations by code" ON public.supplier_invitations;
DROP POLICY IF EXISTS "Supplier data portal can update products" ON public.products;
DROP POLICY IF EXISTS "Supplier data portal can view batches" ON public.product_batches;
DROP POLICY IF EXISTS "Supplier data portal can create batches" ON public.product_batches;
DROP POLICY IF EXISTS "Supplier data portal can update batches" ON public.product_batches;

-- Prod may carry policies that are not in the repo. Drop every remaining
-- policy on the two supplier tables that applies to anon or is completely
-- unconstrained, and every products/product_batches policy whose expression
-- goes through supplier_data_requests.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('supplier_data_requests', 'supplier_invitations')
      AND (
        'anon' = ANY (roles)
        OR coalesce(btrim(qual), '') IN ('true', '(true)')
        OR coalesce(btrim(with_check), '') IN ('true', '(true)')
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;

  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('products', 'product_batches')
      AND (
        coalesce(qual, '') ILIKE '%supplier_data_requests%'
        OR coalesce(with_check, '') ILIKE '%supplier_data_requests%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

REVOKE ALL ON public.supplier_data_requests FROM anon;
REVOKE ALL ON public.supplier_invitations FROM anon;

-- ---------------------------------------------------------------------
-- 2. Tenant-admin policies with product ownership checks
-- ---------------------------------------------------------------------
-- Every product referenced by a data request must belong to the request's
-- tenant. Enforced by trigger (not in the policy) so that it is only checked
-- when the product list or tenant actually changes: a later product deletion
-- must not block cancelling an old request.
CREATE OR REPLACE FUNCTION public.supplier_data_requests_validate_products()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.product_ids IS NOT DISTINCT FROM OLD.product_ids
     AND NEW.product_id IS NOT DISTINCT FROM OLD.product_id
     AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id THEN
    RETURN NEW;
  END IF;

  IF jsonb_typeof(coalesce(NEW.product_ids, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'product_ids must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF NEW.product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = NEW.product_id AND p.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'Product does not belong to this tenant' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(coalesce(NEW.product_ids, '[]'::jsonb)) AS e(pid)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id::text = e.pid AND p.tenant_id = NEW.tenant_id
    )
  ) THEN
    RAISE EXCEPTION 'Product does not belong to this tenant' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.supplier_data_requests_validate_products() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_supplier_data_requests_validate_products ON public.supplier_data_requests;
CREATE TRIGGER trg_supplier_data_requests_validate_products
  BEFORE INSERT OR UPDATE ON public.supplier_data_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.supplier_data_requests_validate_products();

-- A data request is a write capability for products/batches (the portal
-- RPCs are SECURITY DEFINER). Only roles that may edit products themselves
-- ('admin', 'editor', mirroring "Editors can update products") may create,
-- change or delete requests; viewers keep read access only.
-- Permissive policies are OR'ed, so first drop every other write policy on
-- the table (including prod-only leftovers that only check tenant_id).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'supplier_data_requests'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Admins can create data requests for their tenant" ON public.supplier_data_requests;
CREATE POLICY "Admins can create data requests for their tenant"
  ON public.supplier_data_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT pr.tenant_id FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Admins can update data requests for their tenant" ON public.supplier_data_requests;
CREATE POLICY "Admins can update data requests for their tenant"
  ON public.supplier_data_requests FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT pr.tenant_id FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT pr.tenant_id FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Admins can delete data requests for their tenant" ON public.supplier_data_requests;
CREATE POLICY "Admins can delete data requests for their tenant"
  ON public.supplier_data_requests FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT pr.tenant_id FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('admin', 'editor')
    )
  );

DROP POLICY IF EXISTS "Admins can update invitations for their tenant" ON public.supplier_invitations;
CREATE POLICY "Admins can update invitations for their tenant"
  ON public.supplier_invitations FOR UPDATE
  TO authenticated
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ---------------------------------------------------------------------
-- 3. Server-side password hashing + lockout
-- ---------------------------------------------------------------------
ALTER TABLE public.supplier_data_requests
  ADD COLUMN IF NOT EXISTS failed_password_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS password_locked_until timestamptz;

CREATE OR REPLACE FUNCTION public.supplier_data_requests_hash_password()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  -- Already a bcrypt hash -> keep. Everything else (the client-side SHA-256
  -- hex of the password) is wrapped in bcrypt before it is stored.
  IF NEW.password_hash IS NOT NULL AND NEW.password_hash NOT LIKE '$2%' THEN
    NEW.password_hash := crypt(NEW.password_hash, gen_salt('bf', 10));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.supplier_data_requests_hash_password() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_supplier_data_requests_hash_password ON public.supplier_data_requests;
CREATE TRIGGER trg_supplier_data_requests_hash_password
  BEFORE INSERT OR UPDATE OF password_hash ON public.supplier_data_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.supplier_data_requests_hash_password();

-- Re-hash legacy rows (plain SHA-256 hex) through the trigger above, which
-- resolves crypt()/gen_salt() wherever pgcrypto is installed.
-- Idempotent: bcrypt rows are skipped.
UPDATE public.supplier_data_requests
SET password_hash = password_hash
WHERE password_hash IS NOT NULL AND password_hash NOT LIKE '$2%';

COMMENT ON COLUMN public.supplier_data_requests.password_hash
  IS 'bcrypt(crypt) of the client-side SHA-256 hex of the access password. Verified only server-side in SECURITY DEFINER RPCs.';

-- ---------------------------------------------------------------------
-- 4. Supplier data portal RPCs
-- ---------------------------------------------------------------------

-- camelCase field key -> column whitelists (mirror of src/lib/supplier-data-fields.ts)
CREATE OR REPLACE FUNCTION public._sdr_product_field_map()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'name', 'name', 'manufacturer', 'manufacturer', 'gtin', 'gtin',
    'description', 'description', 'category', 'category',
    'countryOfOrigin', 'country_of_origin', 'materials', 'materials',
    'recyclability', 'recyclability', 'certifications', 'certifications',
    'carbonFootprint', 'carbon_footprint', 'hsCode', 'hs_code',
    'netWeight', 'net_weight', 'grossWeight', 'gross_weight',
    'manufacturerAddress', 'manufacturer_address',
    'manufacturerEORI', 'manufacturer_eori', 'manufacturerVAT', 'manufacturer_vat',
    'productHeightCm', 'product_height_cm', 'productWidthCm', 'product_width_cm',
    'productDepthCm', 'product_depth_cm', 'packagingType', 'packaging_type',
    'packagingDescription', 'packaging_description',
    'packagingHeightCm', 'packaging_height_cm', 'packagingWidthCm', 'packaging_width_cm',
    'packagingDepthCm', 'packaging_depth_cm', 'importerName', 'importer_name',
    'importerEORI', 'importer_eori', 'authorizedRepresentative', 'authorized_representative',
    'substancesOfConcern', 'substances_of_concern', 'durabilityYears', 'durability_years',
    'repairabilityScore', 'repairability_score', 'ceMarking', 'ce_marking',
    'euDeclarationOfConformity', 'eu_declaration_of_conformity',
    'recycledContentPercentage', 'recycled_content_percentage',
    'energyConsumptionKWh', 'energy_consumption_kwh'
  );
$$;

CREATE OR REPLACE FUNCTION public._sdr_batch_field_map()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'batchNumber', 'batch_number', 'serialNumber', 'serial_number',
    'productionDate', 'production_date', 'expirationDate', 'expiration_date',
    'status', 'status', 'quantity', 'quantity',
    'pricePerUnit', 'price_per_unit', 'currency', 'currency',
    'descriptionOverride', 'description_override',
    'materialsOverride', 'materials_override',
    'certificationsOverride', 'certifications_override',
    'carbonFootprintOverride', 'carbon_footprint_override',
    'productHeightCm', 'product_height_cm', 'productWidthCm', 'product_width_cm',
    'productDepthCm', 'product_depth_cm', 'packagingType', 'packaging_type',
    'packagingDescription', 'packaging_description',
    'packagingHeightCm', 'packaging_height_cm', 'packagingWidthCm', 'packaging_width_cm',
    'packagingDepthCm', 'packaging_depth_cm'
  );
$$;

-- Keeps only keys that are (a) allowed by the request, (b) in the whitelist
-- map and (c) an existing column of p_table. Returns {column: value}.
CREATE OR REPLACE FUNCTION public._sdr_filter_patch(
  p_data jsonb,
  p_allowed jsonb,
  p_map jsonb,
  p_table text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT coalesce(jsonb_object_agg(m.value #>> '{}', p_data -> a.key), '{}'::jsonb)
  FROM jsonb_array_elements_text(
         CASE WHEN jsonb_typeof(p_allowed) = 'array' THEN p_allowed ELSE '[]'::jsonb END
       ) AS a(key)
  JOIN jsonb_each(p_map) AS m ON m.key = a.key
  WHERE jsonb_typeof(p_data) = 'object'
    AND p_data ? a.key
    AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = p_table
        AND c.column_name = m.value #>> '{}'
    );
$$;

REVOKE ALL ON FUNCTION public._sdr_product_field_map() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._sdr_batch_field_map() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public._sdr_filter_patch(jsonb, jsonb, jsonb, text) FROM PUBLIC, anon, authenticated;

-- Loads the request by access code and verifies the password.
-- Returns the row on success, NULL on wrong password (failed attempt is
-- recorded and persisted because the caller RETURNS instead of RAISING).
-- Raises for unknown code, lockout and (if p_require_editable) inactive state.
CREATE OR REPLACE FUNCTION public._sdr_authenticate(
  p_access_code text,
  p_password_hash text,
  p_require_editable boolean
)
RETURNS public.supplier_data_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_req public.supplier_data_requests;
BEGIN
  IF p_access_code IS NULL OR length(p_access_code) > 100
     OR p_password_hash IS NULL OR length(p_password_hash) = 0 OR length(p_password_hash) > 200 THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_req
  FROM public.supplier_data_requests
  WHERE access_code = p_access_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_req.password_locked_until IS NOT NULL AND v_req.password_locked_until > now() THEN
    RAISE EXCEPTION 'locked' USING ERRCODE = 'P0001';
  END IF;

  IF v_req.password_hash IS NULL OR v_req.password_hash <> crypt(p_password_hash, v_req.password_hash) THEN
    UPDATE public.supplier_data_requests
    SET failed_password_attempts = CASE WHEN failed_password_attempts + 1 >= 10 THEN 0 ELSE failed_password_attempts + 1 END,
        password_locked_until = CASE WHEN failed_password_attempts + 1 >= 10 THEN now() + interval '15 minutes' ELSE password_locked_until END
    WHERE id = v_req.id;
    RETURN NULL;
  END IF;

  IF v_req.failed_password_attempts <> 0 OR v_req.password_locked_until IS NOT NULL THEN
    UPDATE public.supplier_data_requests
    SET failed_password_attempts = 0, password_locked_until = NULL
    WHERE id = v_req.id;
  END IF;

  IF p_require_editable THEN
    IF v_req.status NOT IN ('pending', 'in_progress') THEN
      RAISE EXCEPTION 'inactive' USING ERRCODE = 'P0001';
    END IF;
    IF v_req.expires_at <= now() THEN
      RAISE EXCEPTION 'expired' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN v_req;
END;
$$;

REVOKE ALL ON FUNCTION public._sdr_authenticate(text, text, boolean) FROM PUBLIC, anon, authenticated;

-- Resolves the target product of a request and checks it is part of the
-- request and belongs to the request's tenant.
CREATE OR REPLACE FUNCTION public._sdr_target_product(
  p_req public.supplier_data_requests,
  p_product_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ids jsonb := CASE WHEN jsonb_typeof(p_req.product_ids) = 'array' THEN p_req.product_ids ELSE '[]'::jsonb END;
  v_target uuid;
BEGIN
  v_target := coalesce(
    p_product_id,
    CASE WHEN jsonb_array_length(v_ids) > 0 THEN (v_ids ->> 0)::uuid END,
    p_req.product_id
  );
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'no_product' USING ERRCODE = 'P0001';
  END IF;
  IF NOT (v_ids ? v_target::text OR (jsonb_array_length(v_ids) = 0 AND p_req.product_id = v_target)) THEN
    RAISE EXCEPTION 'product_not_in_request' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_target AND tenant_id = p_req.tenant_id) THEN
    RAISE EXCEPTION 'product_not_in_request' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_target;
END;
$$;

REVOKE ALL ON FUNCTION public._sdr_target_product(public.supplier_data_requests, uuid) FROM PUBLIC, anon, authenticated;

-- 4a. Public info for the password gate (no password, no hash)
CREATE OR REPLACE FUNCTION public.get_supplier_data_request_public(p_access_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.supplier_data_requests;
  v_tenant public.tenants;
  v_ids jsonb;
BEGIN
  IF p_access_code IS NULL OR length(p_access_code) > 100 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_req FROM public.supplier_data_requests WHERE access_code = p_access_code;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = v_req.tenant_id;
  v_ids := CASE WHEN jsonb_typeof(v_req.product_ids) = 'array' THEN v_req.product_ids ELSE '[]'::jsonb END;

  RETURN jsonb_build_object(
    'dataRequest', jsonb_build_object(
      'id', v_req.id,
      'tenant_id', v_req.tenant_id,
      'product_id', v_req.product_id,
      'product_ids', v_ids,
      'access_code', v_req.access_code,
      'allowed_product_fields', v_req.allowed_product_fields,
      'allowed_batch_fields', v_req.allowed_batch_fields,
      'allow_batch_create', v_req.allow_batch_create,
      'allow_batch_edit', v_req.allow_batch_edit,
      'status', v_req.status,
      'message', v_req.message,
      'expires_at', v_req.expires_at,
      'submitted_at', v_req.submitted_at,
      'created_at', v_req.created_at,
      'updated_at', v_req.updated_at
    ),
    'tenant', jsonb_build_object('id', v_tenant.id, 'name', v_tenant.name, 'slug', v_tenant.slug),
    'branding', jsonb_build_object(
      'logoUrl', coalesce(v_tenant.settings #>> '{branding,logoUrl}', v_tenant.settings #>> '{branding,logo}'),
      'primaryColor', v_tenant.settings #>> '{branding,primaryColor}'
    ),
    'products', coalesce((
      SELECT jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name) ORDER BY e.ord)
      FROM jsonb_array_elements_text(v_ids) WITH ORDINALITY AS e(pid, ord)
      JOIN public.products p ON p.id::text = e.pid AND p.tenant_id = v_req.tenant_id
    ), '[]'::jsonb)
  );
END;
$$;

-- 4b. Password check (marks pending -> in_progress on success)
CREATE OR REPLACE FUNCTION public.verify_supplier_data_request_password(
  p_access_code text,
  p_password_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.supplier_data_requests;
BEGIN
  v_req := public._sdr_authenticate(p_access_code, p_password_hash, false);
  IF v_req.id IS NULL THEN
    RETURN false;
  END IF;
  IF v_req.status = 'pending' AND v_req.expires_at > now() THEN
    UPDATE public.supplier_data_requests SET status = 'in_progress' WHERE id = v_req.id;
  END IF;
  RETURN true;
EXCEPTION
  WHEN SQLSTATE 'P0002' THEN RETURN false;
END;
$$;

-- 4c. Product + batches for the portal (password required)
CREATE OR REPLACE FUNCTION public.get_supplier_data_request_product(
  p_access_code text,
  p_password_hash text,
  p_product_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.supplier_data_requests;
  v_target uuid;
BEGIN
  v_req := public._sdr_authenticate(p_access_code, p_password_hash, false);
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;
  IF v_req.status IN ('expired', 'cancelled') OR v_req.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'inactive');
  END IF;

  v_target := public._sdr_target_product(v_req, p_product_id);

  RETURN jsonb_build_object(
    'ok', true,
    'product', (
      SELECT to_jsonb(p) - 'importer_supplier_id' - 'manufacturer_supplier_id'
      FROM public.products p WHERE p.id = v_target
    ),
    'batches', coalesce((
      SELECT jsonb_agg(to_jsonb(b) - 'supplier_id' ORDER BY b.created_at DESC)
      FROM public.product_batches b
      WHERE b.product_id = v_target AND b.tenant_id = v_req.tenant_id
    ), '[]'::jsonb)
  );
END;
$$;

-- 4d. Save product fields (whitelisted by allowed_product_fields)
CREATE OR REPLACE FUNCTION public.submit_supplier_data_request_product(
  p_access_code text,
  p_password_hash text,
  p_product_id uuid,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.supplier_data_requests;
  v_target uuid;
  v_patch jsonb;
  v_set text;
BEGIN
  v_req := public._sdr_authenticate(p_access_code, p_password_hash, true);
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;

  v_target := public._sdr_target_product(v_req, p_product_id);
  v_patch := public._sdr_filter_patch(p_data, v_req.allowed_product_fields, public._sdr_product_field_map(), 'products');

  SELECT string_agg(format('%I = s.%I', k, k), ', ') INTO v_set
  FROM jsonb_object_keys(v_patch) AS k;

  IF v_set IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.products t SET %s FROM jsonb_populate_record(NULL::public.products, $1) s WHERE t.id = $2 AND t.tenant_id = $3',
      v_set
    ) USING v_patch, v_target, v_req.tenant_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'updatedFields', (SELECT count(*) FROM jsonb_object_keys(v_patch)));
END;
$$;

-- 4e. Save batch fields (requires allow_batch_edit)
CREATE OR REPLACE FUNCTION public.submit_supplier_data_request_batch(
  p_access_code text,
  p_password_hash text,
  p_product_id uuid,
  p_batch_id uuid,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.supplier_data_requests;
  v_target uuid;
  v_patch jsonb;
  v_set text;
BEGIN
  v_req := public._sdr_authenticate(p_access_code, p_password_hash, true);
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;
  IF NOT v_req.allow_batch_edit THEN
    RETURN jsonb_build_object('ok', false, 'error', 'batch_edit_not_allowed');
  END IF;

  v_target := public._sdr_target_product(v_req, p_product_id);
  IF NOT EXISTS (
    SELECT 1 FROM public.product_batches
    WHERE id = p_batch_id AND product_id = v_target AND tenant_id = v_req.tenant_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'batch_not_found');
  END IF;

  v_patch := public._sdr_filter_patch(p_data, v_req.allowed_batch_fields, public._sdr_batch_field_map(), 'product_batches');

  SELECT string_agg(format('%I = s.%I', k, k), ', ') INTO v_set
  FROM jsonb_object_keys(v_patch) AS k;

  IF v_set IS NOT NULL THEN
    EXECUTE format(
      'UPDATE public.product_batches t SET %s FROM jsonb_populate_record(NULL::public.product_batches, $1) s WHERE t.id = $2 AND t.product_id = $3 AND t.tenant_id = $4',
      v_set
    ) USING v_patch, p_batch_id, v_target, v_req.tenant_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'updatedFields', (SELECT count(*) FROM jsonb_object_keys(v_patch)));
END;
$$;

-- 4f. Create batch (requires allow_batch_create)
CREATE OR REPLACE FUNCTION public.create_supplier_data_request_batch(
  p_access_code text,
  p_password_hash text,
  p_product_id uuid,
  p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.supplier_data_requests;
  v_target uuid;
  v_patch jsonb;
  v_serial text;
  v_cols text;
  v_vals text;
  v_batch_id uuid := gen_random_uuid();
BEGIN
  v_req := public._sdr_authenticate(p_access_code, p_password_hash, true);
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;
  IF NOT v_req.allow_batch_create THEN
    RETURN jsonb_build_object('ok', false, 'error', 'batch_create_not_allowed');
  END IF;

  v_target := public._sdr_target_product(v_req, p_product_id);
  v_patch := public._sdr_filter_patch(p_data, v_req.allowed_batch_fields, public._sdr_batch_field_map(), 'product_batches');

  v_serial := nullif(btrim(coalesce(v_patch ->> 'serial_number', '')), '');
  IF v_serial IS NULL THEN
    v_serial := substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  ELSIF length(v_serial) > 100 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_serial');
  END IF;
  v_patch := v_patch - 'serial_number';

  SELECT coalesce(string_agg(format(', %I', k), ''), ''), coalesce(string_agg(format(', s.%I', k), ''), '')
  INTO v_cols, v_vals
  FROM jsonb_object_keys(v_patch) AS k;

  EXECUTE format(
    'INSERT INTO public.product_batches (id, tenant_id, product_id, serial_number%s) '
    'SELECT $2, $3, $4, $5%s FROM jsonb_populate_record(NULL::public.product_batches, $1) s',
    v_cols, v_vals
  ) USING v_patch, v_batch_id, v_req.tenant_id, v_target, v_serial;

  RETURN jsonb_build_object('ok', true, 'batchId', v_batch_id);
END;
$$;

-- 4g. Final submit
CREATE OR REPLACE FUNCTION public.mark_supplier_data_request_submitted(
  p_access_code text,
  p_password_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req public.supplier_data_requests;
BEGIN
  v_req := public._sdr_authenticate(p_access_code, p_password_hash, true);
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_password');
  END IF;

  UPDATE public.supplier_data_requests
  SET status = 'submitted', submitted_at = now()
  WHERE id = v_req.id;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_supplier_data_request_public(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_supplier_data_request_password(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_supplier_data_request_product(text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_supplier_data_request_product(text, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_supplier_data_request_batch(text, text, uuid, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_supplier_data_request_batch(text, text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_supplier_data_request_submitted(text, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_supplier_data_request_public(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_supplier_data_request_password(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_supplier_data_request_product(text, text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_supplier_data_request_product(text, text, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_supplier_data_request_batch(text, text, uuid, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_supplier_data_request_batch(text, text, uuid, jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_supplier_data_request_submitted(text, text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Supplier self-registration RPCs
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_supplier_invitation_by_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.supplier_invitations;
  v_tenant public.tenants;
BEGIN
  IF p_code IS NULL OR length(p_code) < 16 OR length(p_code) > 100 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_inv FROM public.supplier_invitations WHERE invitation_code = p_code;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_inv.status = 'pending' AND v_inv.expires_at < now() THEN
    UPDATE public.supplier_invitations SET status = 'expired' WHERE id = v_inv.id;
    v_inv.status := 'expired';
  END IF;

  SELECT * INTO v_tenant FROM public.tenants WHERE id = v_inv.tenant_id;

  RETURN jsonb_build_object(
    'invitation', jsonb_build_object(
      'id', v_inv.id,
      'tenant_id', v_inv.tenant_id,
      'email', v_inv.email,
      'contact_name', v_inv.contact_name,
      'company_name', v_inv.company_name,
      'invitation_code', v_inv.invitation_code,
      'status', v_inv.status,
      'created_at', v_inv.created_at,
      'expires_at', v_inv.expires_at,
      'completed_at', v_inv.completed_at
    ),
    'tenant', jsonb_build_object('id', v_tenant.id, 'name', v_tenant.name, 'slug', v_tenant.slug),
    'portalSettings', coalesce(v_tenant.settings -> 'supplierPortal', '{}'::jsonb),
    'branding', jsonb_build_object(
      'logoUrl', coalesce(v_tenant.settings #>> '{branding,logo}', v_tenant.settings #>> '{branding,logoUrl}'),
      'primaryColor', v_tenant.settings #>> '{branding,primaryColor}'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_supplier_registration(p_code text, p_data jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv public.supplier_invitations;
  v_supplier_id uuid := gen_random_uuid();
  v_key text;
  v_type text;
  v_shipping boolean;
BEGIN
  IF p_code IS NULL OR length(p_code) < 16 OR length(p_code) > 100 OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_inv FROM public.supplier_invitations WHERE invitation_code = p_code FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_inv.status <> 'pending' OR v_inv.expires_at < now() THEN
    RAISE EXCEPTION 'Invitation is no longer valid' USING ERRCODE = 'P0001';
  END IF;

  -- Required fields
  FOREACH v_key IN ARRAY ARRAY['companyName','contactName','email','street','city','country','postalCode','taxNumber','vatNumber','iban','bic'] LOOP
    IF nullif(btrim(coalesce(p_data ->> v_key, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Missing required field: %', v_key USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF coalesce((p_data ->> 'termsAccepted')::boolean, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'Terms must be accepted' USING ERRCODE = '22023';
  END IF;

  -- Length limits on every string value (abuse protection)
  IF EXISTS (
    SELECT 1 FROM jsonb_each_text(p_data) e
    WHERE length(e.value) > CASE WHEN e.key IN ('notes', 'certifications', 'productCategories') THEN 5000 ELSE 500 END
  ) THEN
    RAISE EXCEPTION 'Field value too long' USING ERRCODE = '22023';
  END IF;

  IF btrim(p_data ->> 'email') !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email' USING ERRCODE = '22023';
  END IF;

  v_type := p_data ->> 'supplierType';
  IF v_type IS NOT NULL AND v_type NOT IN ('manufacturer', 'wholesaler', 'distributor', 'service_provider') THEN
    v_type := NULL;
  END IF;
  v_shipping := coalesce((p_data ->> 'shippingAddressDifferent')::boolean, false);

  INSERT INTO public.suppliers (
    id, tenant_id, name, status, verified,
    legal_form, contact_person, contact_position, email, phone, mobile, website, linkedin,
    address, address_line2, city, state, country, postal_code,
    shipping_address, shipping_city, shipping_country, shipping_postal_code,
    tax_id, vat_id, registration_number, bank_name, iban, bic, payment_terms,
    supplier_type, industry, product_categories, certifications, notes
  ) VALUES (
    v_supplier_id, v_inv.tenant_id, btrim(p_data ->> 'companyName'), 'pending_approval', false,
    nullif(btrim(p_data ->> 'legalForm'), ''),
    btrim(p_data ->> 'contactName'),
    nullif(btrim(p_data ->> 'contactPosition'), ''),
    btrim(p_data ->> 'email'),
    nullif(btrim(p_data ->> 'phone'), ''),
    nullif(btrim(p_data ->> 'mobile'), ''),
    nullif(btrim(p_data ->> 'website'), ''),
    nullif(btrim(p_data ->> 'linkedin'), ''),
    btrim(p_data ->> 'street'),
    nullif(btrim(p_data ->> 'addressLine2'), ''),
    btrim(p_data ->> 'city'),
    nullif(btrim(p_data ->> 'state'), ''),
    btrim(p_data ->> 'country'),
    btrim(p_data ->> 'postalCode'),
    CASE WHEN v_shipping THEN nullif(concat_ws(', ', nullif(btrim(p_data ->> 'shippingStreet'), ''), nullif(btrim(p_data ->> 'shippingAddressLine2'), '')), '') END,
    CASE WHEN v_shipping THEN nullif(btrim(p_data ->> 'shippingCity'), '') END,
    CASE WHEN v_shipping THEN nullif(btrim(p_data ->> 'shippingCountry'), '') END,
    CASE WHEN v_shipping THEN nullif(btrim(p_data ->> 'shippingPostalCode'), '') END,
    btrim(p_data ->> 'taxNumber'),
    btrim(p_data ->> 'vatNumber'),
    nullif(btrim(p_data ->> 'commercialRegisterNumber'), ''),
    nullif(btrim(p_data ->> 'bankName'), ''),
    regexp_replace(p_data ->> 'iban', '\s', '', 'g'),
    regexp_replace(p_data ->> 'bic', '\s', '', 'g'),
    nullif(btrim(p_data ->> 'paymentTerms'), ''),
    v_type,
    nullif(btrim(p_data ->> 'industry'), ''),
    (SELECT array_agg(btrim(x)) FROM unnest(string_to_array(p_data ->> 'productCategories', ',')) x WHERE btrim(x) <> ''),
    (SELECT array_agg(btrim(x)) FROM unnest(string_to_array(p_data ->> 'certifications', ',')) x WHERE btrim(x) <> ''),
    nullif(btrim(p_data ->> 'notes'), '')
  );

  UPDATE public.supplier_invitations
  SET status = 'completed', completed_at = now(), supplier_id = v_supplier_id
  WHERE id = v_inv.id;

  RETURN v_supplier_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_supplier_invitation_by_code(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_supplier_registration(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_supplier_invitation_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_supplier_registration(text, jsonb) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. Public DPP product RPCs (replacement for blanket anon SELECT)
-- ---------------------------------------------------------------------
-- Resolves (GTIN candidates, serial) -> product/batch/tenant ids.
-- Batch serial match first, then legacy products.serial_number.
CREATE OR REPLACE FUNCTION public.resolve_public_dpp_product(p_gtins text[], p_serial text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_tenant_id uuid;
  v_batch_id uuid;
BEGIN
  IF p_gtins IS NULL OR cardinality(p_gtins) = 0 OR cardinality(p_gtins) > 10
     OR p_serial IS NULL OR length(p_serial) = 0 OR length(p_serial) > 200 THEN
    RETURN NULL;
  END IF;

  SELECT p.id, p.tenant_id, b.id INTO v_product_id, v_tenant_id, v_batch_id
  FROM public.products p
  JOIN public.product_batches b ON b.product_id = p.id
  WHERE p.gtin = ANY (p_gtins) AND b.serial_number = p_serial
  ORDER BY p.created_at, b.created_at
  LIMIT 1;

  IF v_product_id IS NULL THEN
    SELECT p.id, p.tenant_id INTO v_product_id, v_tenant_id
    FROM public.products p
    WHERE p.gtin = ANY (p_gtins) AND p.serial_number = p_serial
    ORDER BY p.created_at
    LIMIT 1;
  END IF;

  IF v_product_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object('product_id', v_product_id, 'tenant_id', v_tenant_id, 'batch_id', v_batch_id);
END;
$$;

-- Full public DPP payload: rows in the same snake_case shape PostgREST
-- returned before, so transformProduct()/mergeProductWithBatch() keep working.
CREATE OR REPLACE FUNCTION public.get_public_dpp_product(p_gtins text[], p_serial text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref jsonb;
  v_product_id uuid;
  v_batch_id uuid;
BEGIN
  v_ref := public.resolve_public_dpp_product(p_gtins, p_serial);
  IF v_ref IS NULL THEN
    RETURN NULL;
  END IF;
  v_product_id := (v_ref ->> 'product_id')::uuid;
  v_batch_id := nullif(v_ref ->> 'batch_id', '')::uuid;

  RETURN jsonb_build_object(
    'tenant_id', v_ref ->> 'tenant_id',
    'product', (
      SELECT to_jsonb(p) - 'importer_supplier_id' - 'manufacturer_supplier_id'
      FROM public.products p WHERE p.id = v_product_id
    ),
    'batch', (
      SELECT to_jsonb(b) - 'supplier_id' - 'price_per_unit' - 'currency'
      FROM public.product_batches b WHERE b.id = v_batch_id
    ),
    'supply_chain', coalesce((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.step)
      FROM public.supply_chain_entries s WHERE s.product_id = v_product_id
    ), '[]'::jsonb),
    'components', coalesce((
      SELECT jsonb_agg(
        to_jsonb(c) || jsonb_build_object('component_product', (
          SELECT jsonb_build_object(
            'id', cp.id, 'name', cp.name, 'gtin', cp.gtin, 'manufacturer', cp.manufacturer,
            'category', cp.category, 'image_url', cp.image_url, 'materials', cp.materials,
            'carbon_footprint', cp.carbon_footprint, 'recyclability', cp.recyclability,
            'net_weight', cp.net_weight, 'gross_weight', cp.gross_weight
          )
          FROM public.products cp WHERE cp.id = c.component_product_id
        ))
        ORDER BY c.sort_order
      )
      FROM public.product_components c WHERE c.parent_product_id = v_product_id
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_public_dpp_product(text[], text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_dpp_product(text[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_dpp_product(text[], text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_dpp_product(text[], text) TO anon, authenticated;
