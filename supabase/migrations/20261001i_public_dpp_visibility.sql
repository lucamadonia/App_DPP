-- =====================================================================
-- 20261001i_public_dpp_visibility.sql
-- (Go-live hardening, package B: RLS-5 + F stage-2 preparation)
--
-- Public DPP pages (/p/:gtin/:serial and /01/:gtin/21/:serial, consumer and
-- customs view) now read ONE server-filtered payload:
--
--   get_public_dpp_product(p_gtins text[], p_serial text, p_view text DEFAULT 'consumer')
--
-- What changes against the version from 20261001f:
--   * Visibility V2/V3 (visibility_settings) is resolved server-side with the
--     same precedence as the client (product row -> tenant row -> built-in
--     defaults; V2 rows are migrated to V3 exactly like
--     migrateVisibilityV2toV3()). Only fields visible for the requested view
--     are returned. 'internal' is never a valid view: anything except
--     'customs' is treated as 'consumer'.
--   * The customs view stays ungated, exactly as today (the /customs routes
--     are public; there is no customs login). It returns consumer+customs
--     fields per the tenant's configuration, never fields the tenant marked
--     internal (= neither consumer nor customs).
--   * The product / batch payload is an explicit column whitelist per
--     visibility field (no more to_jsonb(row)). Never returned: batch notes,
--     status, quantity, price_per_unit, currency, supplier_id; product
--     supplier ids, aggregation_overrides, EAR fields, created/updated_at.
--   * supply_chain_entries: never supplier, supplier_id, risk_level, notes,
--     coordinates, document_ids, verified, duration_days. date only with
--     supplyChainFull, process_type / transport_mode / emissions_kg / cost +
--     currency only with their own flag. Only product-level entries and the
--     entries of the resolved batch (other batches' entries were leaked
--     before). Nothing at all unless supplyChainSimple or supplyChainFull.
--   * product_components: only with setComponents, same-tenant only, no notes.
--     Component product fields follow the parent's visibility.
--   * The resolved visibility map is returned as payload.visibility, so the
--     client no longer reads visibility_settings directly.
--   * The primary product_images URL is folded into product.image_url (only
--     if 'image' is visible), so the client no longer reads product_images.
--   * Cross-tenant batch injection fix: resolve_public_dpp_product is
--     replaced so a batch only matches when b.tenant_id = p.tenant_id, and
--     the batch row is re-checked against product + tenant. Before, any
--     tenant could INSERT a product_batches row (own tenant_id, VICTIM
--     product_id) with overrides and thereby hijack the victim's public DPP
--     (including shadowing legacy products.serial_number DPPs).
--   * Defense in depth: BEFORE INSERT/UPDATE trigger
--     _guard_same_tenant_product_refs on product_batches,
--     supply_chain_entries, product_components and product_images rejects
--     references to products / batches of another tenant (all roles).
--
-- This migration is ADDITIVE: it does not remove any table policy. The
-- blanket anon SELECT policies are removed by the staged script
--   supabase/20261001f_stage2_restrict_public_product_select.sql
-- which must run only AFTER the frontend that calls this RPC is deployed
-- (the old frontend still reads the tables directly).
--
-- Requires 20261001f (resolve_public_dpp_product). Idempotent.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Built-in visibility defaults (keep in sync with src/types/visibility.ts;
--    src/services/supabase/public-dpp.test.ts fails when they drift)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._dpp_visibility_default_v3()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT $json$
  {
    "name": {"consumer": true, "customs": true},
    "image": {"consumer": true, "customs": true},
    "description": {"consumer": true, "customs": true},
    "manufacturer": {"consumer": true, "customs": true},
    "category": {"consumer": true, "customs": true},
    "gtin": {"consumer": false, "customs": true},
    "serialNumber": {"consumer": false, "customs": true},
    "batchNumber": {"consumer": false, "customs": true},
    "uniqueProductId": {"consumer": false, "customs": true},
    "productionDate": {"consumer": false, "customs": true},
    "expirationDate": {"consumer": false, "customs": true},
    "productDimensions": {"consumer": true, "customs": true},
    "packagingDetails": {"consumer": true, "customs": true},
    "importerName": {"consumer": false, "customs": true},
    "importerEORI": {"consumer": false, "customs": true},
    "authorizedRepresentative": {"consumer": false, "customs": true},
    "dppResponsible": {"consumer": true, "customs": true},
    "materials": {"consumer": true, "customs": true},
    "substancesOfConcern": {"consumer": true, "customs": true},
    "recycledContentPercentage": {"consumer": true, "customs": true},
    "carbonFootprint": {"consumer": true, "customs": true},
    "energyConsumptionKWh": {"consumer": true, "customs": true},
    "durabilityYears": {"consumer": true, "customs": true},
    "repairabilityScore": {"consumer": true, "customs": true},
    "recyclability": {"consumer": true, "customs": true},
    "disassemblyInstructions": {"consumer": true, "customs": true},
    "endOfLifeInstructions": {"consumer": true, "customs": true},
    "certifications": {"consumer": true, "customs": true},
    "euDeclarationOfConformity": {"consumer": false, "customs": true},
    "testReports": {"consumer": false, "customs": true},
    "ceMarking": {"consumer": true, "customs": true},
    "registrations": {"consumer": false, "customs": true},
    "supplyChainSimple": {"consumer": true, "customs": true},
    "supplyChainFull": {"consumer": false, "customs": true},
    "supplyChainProcessType": {"consumer": true, "customs": true},
    "supplyChainTransport": {"consumer": false, "customs": true},
    "supplyChainEmissions": {"consumer": true, "customs": true},
    "supplyChainCost": {"consumer": false, "customs": false},
    "hsCode": {"consumer": false, "customs": true},
    "countryOfOrigin": {"consumer": false, "customs": true},
    "netWeight": {"consumer": false, "customs": true},
    "grossWeight": {"consumer": false, "customs": true},
    "manufacturerAddress": {"consumer": false, "customs": true},
    "manufacturerEORI": {"consumer": false, "customs": true},
    "manufacturerVAT": {"consumer": false, "customs": true},
    "customsValue": {"consumer": false, "customs": true},
    "preferenceProof": {"consumer": false, "customs": true},
    "setComponents": {"consumer": true, "customs": true},
    "componentDppUrls": {"consumer": true, "customs": true},
    "supportResources": {"consumer": true, "customs": true},
    "supportWarranty": {"consumer": true, "customs": true},
    "supportFaq": {"consumer": true, "customs": true},
    "supportVideos": {"consumer": true, "customs": true},
    "supportRepair": {"consumer": true, "customs": true},
    "supportSpareParts": {"consumer": true, "customs": true},
    "userManualUrl": {"consumer": true, "customs": true},
    "safetyInformation": {"consumer": true, "customs": true},
    "dppRegistryId": {"consumer": false, "customs": true}
  }
  $json$::jsonb
$$;

CREATE OR REPLACE FUNCTION public._dpp_visibility_default_v2()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT $json$
  {
    "name": "consumer",
    "image": "consumer",
    "description": "consumer",
    "manufacturer": "consumer",
    "category": "consumer",
    "materials": "consumer",
    "materialOrigins": "consumer",
    "packagingMaterials": "consumer",
    "packagingRecyclability": "consumer",
    "packagingRecyclingInstructions": "consumer",
    "packagingDisposalMethods": "consumer",
    "carbonFootprint": "consumer",
    "carbonRating": "consumer",
    "recyclability": "consumer",
    "recyclingInstructions": "consumer",
    "disposalMethods": "consumer",
    "certifications": "consumer",
    "supplyChainSimple": "consumer",
    "supplyChainFull": "customs",
    "supplyChainProcessType": "consumer",
    "supplyChainTransport": "customs",
    "supplyChainEmissions": "consumer",
    "supplyChainCost": "internal",
    "gtin": "customs",
    "serialNumber": "customs",
    "batchNumber": "customs",
    "hsCode": "customs",
    "countryOfOrigin": "customs",
    "netWeight": "customs",
    "grossWeight": "customs",
    "manufacturerAddress": "customs",
    "manufacturerEORI": "customs",
    "manufacturerVAT": "customs",
    "certificateDownloads": "customs",
    "setComponents": "consumer",
    "supportResources": "consumer",
    "supportWarranty": "consumer",
    "supportFaq": "consumer",
    "supportVideos": "consumer",
    "supportRepair": "consumer",
    "supportSpareParts": "consumer"
  }
  $json$::jsonb
$$;

-- Visibility field -> columns it releases (products and product_batches).
-- gtin and serial_number are not listed: the caller already holds both (they
-- are the lookup key printed in the QR code) and the client gates their
-- display with isFieldVisible('gtin' / 'serialNumber').
CREATE OR REPLACE FUNCTION public._dpp_field_columns()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT '{
    "name": ["name"],
    "image": ["image_url"],
    "description": ["description", "description_override"],
    "manufacturer": ["manufacturer"],
    "category": ["category"],
    "batchNumber": ["batch_number"],
    "uniqueProductId": ["unique_product_id"],
    "productionDate": ["production_date"],
    "expirationDate": ["expiration_date"],
    "productDimensions": ["product_height_cm", "product_width_cm", "product_depth_cm"],
    "packagingDetails": ["packaging_type", "packaging_description", "packaging_height_cm", "packaging_width_cm", "packaging_depth_cm"],
    "importerName": ["importer_name"],
    "importerEORI": ["importer_eori"],
    "authorizedRepresentative": ["authorized_representative"],
    "dppResponsible": ["dpp_responsible"],
    "materials": ["materials", "materials_override"],
    "substancesOfConcern": ["substances_of_concern"],
    "recycledContentPercentage": ["recycled_content_percentage"],
    "carbonFootprint": ["carbon_footprint", "carbon_footprint_override"],
    "energyConsumptionKWh": ["energy_consumption_kwh"],
    "durabilityYears": ["durability_years"],
    "repairabilityScore": ["repairability_score"],
    "recyclability": ["recyclability", "recyclability_override"],
    "disassemblyInstructions": ["disassembly_instructions"],
    "endOfLifeInstructions": ["end_of_life_instructions"],
    "certifications": ["certifications", "certifications_override"],
    "euDeclarationOfConformity": ["eu_declaration_of_conformity"],
    "testReports": ["test_reports"],
    "ceMarking": ["ce_marking"],
    "registrations": ["registrations"],
    "hsCode": ["hs_code"],
    "countryOfOrigin": ["country_of_origin"],
    "netWeight": ["net_weight"],
    "grossWeight": ["gross_weight"],
    "manufacturerAddress": ["manufacturer_address"],
    "manufacturerEORI": ["manufacturer_eori"],
    "manufacturerVAT": ["manufacturer_vat"],
    "customsValue": ["customs_value"],
    "preferenceProof": ["preference_proof"],
    "componentDppUrls": ["component_dpp_urls"],
    "supportResources": ["support_resources"],
    "userManualUrl": ["user_manual_url"],
    "safetyInformation": ["safety_information"],
    "dppRegistryId": ["dpp_registry_id"]
  }'::jsonb
$$;

-- ---------------------------------------------------------------------
-- 2. Helpers
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._dpp_visible(p_fields jsonb, p_field text, p_view text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_view IN ('consumer', 'customs')
     AND coalesce((p_fields -> p_field -> p_view) = 'true'::jsonb, false)
$$;

CREATE OR REPLACE FUNCTION public._dpp_pick(p_src jsonb, p_keys text[])
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT coalesce(jsonb_object_agg(k, p_src -> k), '{}'::jsonb)
  FROM unnest(p_keys) AS k
  WHERE p_src IS NOT NULL AND p_src ? k
$$;

-- supportResources sub-sections with their own visibility flag.
CREATE OR REPLACE FUNCTION public._dpp_filter_support(p_sr jsonb, p_fields jsonb, p_view text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_sr IS NULL OR jsonb_typeof(p_sr) <> 'object' THEN p_sr
    ELSE p_sr - ARRAY(
      SELECT m.k
      FROM (VALUES ('warranty', 'supportWarranty'), ('faq', 'supportFaq'), ('videos', 'supportVideos'),
                   ('repairInfo', 'supportRepair'), ('spareParts', 'supportSpareParts')) AS m(k, f)
      WHERE NOT public._dpp_visible(p_fields, m.f, p_view)
    )
  END
$$;

-- Effective V3 field map for a product: product row -> tenant row -> defaults.
-- Mirrors getVisibilitySettings()/transformVisibilitySettings() +
-- migrateVisibilityV2toV3() + the defaultVisibilityConfigV3 lookup fallback.
CREATE OR REPLACE FUNCTION public._dpp_effective_visibility(p_tenant_id uuid, p_product_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version int;
  v_fields jsonb;
  v_found boolean := false;
  v_v2 jsonb;
  v_migrated jsonb;
BEGIN
  SELECT vs.version, vs.fields INTO v_version, v_fields
  FROM public.visibility_settings vs
  WHERE vs.tenant_id = p_tenant_id AND vs.product_id = p_product_id
  ORDER BY vs.updated_at DESC NULLS LAST
  LIMIT 1;
  v_found := FOUND;

  IF NOT v_found THEN
    SELECT vs.version, vs.fields INTO v_version, v_fields
    FROM public.visibility_settings vs
    WHERE vs.tenant_id = p_tenant_id AND vs.product_id IS NULL
    ORDER BY vs.updated_at DESC NULLS LAST
    LIMIT 1;
    v_found := FOUND;
  END IF;

  IF NOT v_found THEN
    RETURN public._dpp_visibility_default_v3();
  END IF;

  IF v_fields IS NULL OR jsonb_typeof(v_fields) <> 'object' THEN
    v_fields := '{}'::jsonb;
  END IF;

  IF coalesce(v_version, 2) = 3 THEN
    RETURN public._dpp_visibility_default_v3() || v_fields;
  END IF;

  v_v2 := public._dpp_visibility_default_v2() || v_fields;
  SELECT coalesce(jsonb_object_agg(e.key, jsonb_build_object(
           'consumer', e.value = '"consumer"'::jsonb,
           'customs', e.value IN ('"consumer"'::jsonb, '"customs"'::jsonb))), '{}'::jsonb)
  INTO v_migrated
  FROM jsonb_each(v_v2) AS e;

  RETURN public._dpp_visibility_default_v3() || v_migrated;
END;
$$;

-- ---------------------------------------------------------------------
-- 2b. resolve_public_dpp_product: batch must belong to the product's tenant
-- ---------------------------------------------------------------------
-- Replaces the 20261001f version (same signature; CREATE OR REPLACE keeps
-- the grants). Without the tenant equality a foreign tenant's batch row
-- pointing at this product would win (the batch path is tried first).
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
  JOIN public.product_batches b ON b.product_id = p.id AND b.tenant_id = p.tenant_id
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

-- ---------------------------------------------------------------------
-- 3. get_public_dpp_product (3-arg, view-aware)
-- ---------------------------------------------------------------------
-- The 2-arg version from 20261001f returned unfiltered rows. Drop it so a
-- 2-arg call resolves to the new function (p_view defaults to 'consumer')
-- instead of being ambiguous.
DROP FUNCTION IF EXISTS public.get_public_dpp_product(text[], text);

CREATE OR REPLACE FUNCTION public.get_public_dpp_product(
  p_gtins text[],
  p_serial text,
  p_view text DEFAULT 'consumer'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_view text := CASE WHEN p_view = 'customs' THEN 'customs' ELSE 'consumer' END;
  v_ref jsonb;
  v_product_id uuid;
  v_batch_id uuid;
  v_tenant_id uuid;
  v_fields jsonb;
  v_p jsonb;
  v_b jsonb;
  v_prod jsonb;
  v_batch jsonb;
  v_field text;
  v_cols jsonb;
  v_keys text[];
  v_img text;
  v_tr_drop text[];
  v_sc_keys text[];
  v_cp_keys text[];
  v_sc jsonb := '[]'::jsonb;
  v_comp jsonb := '[]'::jsonb;
BEGIN
  v_ref := public.resolve_public_dpp_product(p_gtins, p_serial);
  IF v_ref IS NULL THEN
    RETURN NULL;
  END IF;
  v_product_id := (v_ref ->> 'product_id')::uuid;
  v_tenant_id := (v_ref ->> 'tenant_id')::uuid;
  v_batch_id := nullif(v_ref ->> 'batch_id', '')::uuid;

  SELECT to_jsonb(p) INTO v_p FROM public.products p
  WHERE p.id = v_product_id AND p.tenant_id = v_tenant_id;
  IF v_p IS NULL THEN
    RETURN NULL;
  END IF;
  IF v_batch_id IS NOT NULL THEN
    SELECT to_jsonb(b) INTO v_b FROM public.product_batches b
    WHERE b.id = v_batch_id AND b.product_id = v_product_id AND b.tenant_id = v_tenant_id;
    IF v_b IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  v_fields := public._dpp_effective_visibility(v_tenant_id, v_product_id);

  -- Structural keys the page needs regardless of visibility.
  v_prod := jsonb_build_object(
    'id', v_p -> 'id',
    'tenant_id', v_p -> 'tenant_id',
    'gtin', v_p -> 'gtin',
    'serial_number', to_jsonb(p_serial),
    'product_type', coalesce(v_p -> 'product_type', '"single"'::jsonb)
  );
  IF v_b IS NOT NULL THEN
    v_batch := jsonb_build_object('serial_number', v_b -> 'serial_number');
  END IF;

  FOR v_field, v_cols IN SELECT key, value FROM jsonb_each(public._dpp_field_columns()) LOOP
    IF public._dpp_visible(v_fields, v_field, v_view) THEN
      v_keys := ARRAY(SELECT jsonb_array_elements_text(v_cols));
      v_prod := v_prod || public._dpp_pick(v_p, v_keys);
      IF v_batch IS NOT NULL THEN
        v_batch := v_batch || public._dpp_pick(v_b, v_keys);
      END IF;
    END IF;
  END LOOP;

  IF v_prod ? 'support_resources' THEN
    v_prod := jsonb_set(v_prod, '{support_resources}',
      coalesce(public._dpp_filter_support(v_prod -> 'support_resources', v_fields, v_view), 'null'::jsonb));
  END IF;

  -- Primary gallery image as fallback for the legacy image_url column.
  IF public._dpp_visible(v_fields, 'image', v_view) AND coalesce(v_prod ->> 'image_url', '') = '' THEN
    SELECT to_jsonb(pi) ->> 'url' INTO v_img
    FROM public.product_images pi
    WHERE pi.product_id = v_product_id AND pi.tenant_id = v_tenant_id
    ORDER BY pi.is_primary DESC NULLS LAST, pi.sort_order ASC NULLS LAST
    LIMIT 1;
    IF v_img IS NOT NULL THEN
      v_prod := v_prod || jsonb_build_object('image_url', v_img);
    END IF;
  END IF;

  -- Translations: only translated texts of visible fields.
  IF jsonb_typeof(v_p -> 'translations') = 'object' THEN
    v_tr_drop := array_remove(ARRAY[
      CASE WHEN NOT public._dpp_visible(v_fields, 'name', v_view) THEN 'name' END,
      CASE WHEN NOT public._dpp_visible(v_fields, 'description', v_view) THEN 'description' END,
      CASE WHEN NOT public._dpp_visible(v_fields, 'recyclability', v_view) THEN 'recyclingInstructions' END,
      CASE WHEN NOT public._dpp_visible(v_fields, 'recyclability', v_view) THEN 'packagingInstructions' END,
      CASE WHEN NOT public._dpp_visible(v_fields, 'supportResources', v_view) THEN 'supportResources' END
    ], NULL);
    SELECT coalesce(jsonb_object_agg(t.key,
             CASE WHEN (t.value - v_tr_drop) ? 'supportResources'
               THEN jsonb_set(t.value - v_tr_drop, '{supportResources}',
                      coalesce(public._dpp_filter_support((t.value - v_tr_drop) -> 'supportResources', v_fields, v_view), 'null'::jsonb))
               ELSE t.value - v_tr_drop
             END), '{}'::jsonb)
    INTO STRICT v_cols
    FROM jsonb_each(v_p -> 'translations') AS t
    WHERE jsonb_typeof(t.value) = 'object';
    v_prod := v_prod || jsonb_build_object('translations', v_cols);
  END IF;

  -- Supply chain (product-level + this batch only).
  IF public._dpp_visible(v_fields, 'supplyChainSimple', v_view)
     OR public._dpp_visible(v_fields, 'supplyChainFull', v_view) THEN
    v_sc_keys := ARRAY['step', 'location', 'country', 'description', 'status'];
    IF public._dpp_visible(v_fields, 'supplyChainFull', v_view) THEN
      v_sc_keys := v_sc_keys || ARRAY['date'];
    END IF;
    IF public._dpp_visible(v_fields, 'supplyChainProcessType', v_view) THEN
      v_sc_keys := v_sc_keys || ARRAY['process_type'];
    END IF;
    IF public._dpp_visible(v_fields, 'supplyChainTransport', v_view) THEN
      v_sc_keys := v_sc_keys || ARRAY['transport_mode'];
    END IF;
    IF public._dpp_visible(v_fields, 'supplyChainEmissions', v_view) THEN
      v_sc_keys := v_sc_keys || ARRAY['emissions_kg'];
    END IF;
    IF public._dpp_visible(v_fields, 'supplyChainCost', v_view) THEN
      v_sc_keys := v_sc_keys || ARRAY['cost', 'currency'];
    END IF;

    SELECT coalesce(jsonb_agg(public._dpp_pick(x.sj, v_sc_keys) ORDER BY x.step), '[]'::jsonb)
    INTO v_sc
    FROM (
      SELECT s.step, to_jsonb(s) AS sj
      FROM public.supply_chain_entries s
      WHERE s.product_id = v_product_id AND s.tenant_id = v_tenant_id
    ) x
    WHERE (x.sj ->> 'batch_id') IS NULL
       OR (v_batch_id IS NOT NULL AND x.sj ->> 'batch_id' = v_batch_id::text);
  END IF;

  -- Set components (same tenant only).
  IF public._dpp_visible(v_fields, 'setComponents', v_view) THEN
    v_cp_keys := ARRAY['id', 'name', 'gtin'];
    IF public._dpp_visible(v_fields, 'manufacturer', v_view) THEN v_cp_keys := v_cp_keys || ARRAY['manufacturer']; END IF;
    IF public._dpp_visible(v_fields, 'category', v_view) THEN v_cp_keys := v_cp_keys || ARRAY['category']; END IF;
    IF public._dpp_visible(v_fields, 'image', v_view) THEN v_cp_keys := v_cp_keys || ARRAY['image_url']; END IF;
    IF public._dpp_visible(v_fields, 'materials', v_view) THEN v_cp_keys := v_cp_keys || ARRAY['materials']; END IF;
    IF public._dpp_visible(v_fields, 'carbonFootprint', v_view) THEN v_cp_keys := v_cp_keys || ARRAY['carbon_footprint']; END IF;
    IF public._dpp_visible(v_fields, 'recyclability', v_view) THEN v_cp_keys := v_cp_keys || ARRAY['recyclability']; END IF;
    IF public._dpp_visible(v_fields, 'netWeight', v_view) THEN v_cp_keys := v_cp_keys || ARRAY['net_weight']; END IF;
    IF public._dpp_visible(v_fields, 'grossWeight', v_view) THEN v_cp_keys := v_cp_keys || ARRAY['gross_weight']; END IF;

    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id', c.id,
             'parent_product_id', c.parent_product_id,
             'component_product_id', c.component_product_id,
             'quantity', c.quantity,
             'sort_order', c.sort_order,
             'component_product', (
               SELECT public._dpp_pick(to_jsonb(cp), v_cp_keys)
               FROM public.products cp
               WHERE cp.id = c.component_product_id AND cp.tenant_id = v_tenant_id
             )
           ) ORDER BY c.sort_order), '[]'::jsonb)
    INTO v_comp
    FROM public.product_components c
    WHERE c.parent_product_id = v_product_id AND c.tenant_id = v_tenant_id;
  END IF;

  RETURN jsonb_build_object(
    'tenant_id', v_tenant_id,
    'view', v_view,
    'visibility', jsonb_build_object('version', 3, 'fields', v_fields),
    'product', v_prod,
    'batch', v_batch,
    'supply_chain', v_sc,
    'components', v_comp
  );
END;
$$;

-- ---------------------------------------------------------------------
-- 4. Privileges: only the two public entry points are callable by clients
-- ---------------------------------------------------------------------
REVOKE ALL ON FUNCTION public._dpp_visibility_default_v3() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._dpp_visibility_default_v2() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._dpp_field_columns() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._dpp_visible(jsonb, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._dpp_pick(jsonb, text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._dpp_filter_support(jsonb, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._dpp_effective_visibility(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_dpp_product(text[], text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_public_dpp_product(text[], text) FROM PUBLIC;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public._dpp_visibility_default_v3() FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public._dpp_visibility_default_v2() FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public._dpp_field_columns() FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public._dpp_visible(jsonb, text, text) FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public._dpp_pick(jsonb, text[]) FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public._dpp_filter_support(jsonb, jsonb, text) FROM anon, authenticated';
    EXECUTE 'REVOKE ALL ON FUNCTION public._dpp_effective_visibility(uuid, uuid) FROM anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_public_dpp_product(text[], text, text) TO anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.resolve_public_dpp_product(text[], text) TO anon, authenticated';
  END IF;
END $$;

COMMENT ON FUNCTION public.get_public_dpp_product(text[], text, text) IS
  'Public DPP payload filtered by Visibility V3 for view consumer|customs (20261001i, RLS-5). Never returns internal fields.';

-- ---------------------------------------------------------------------
-- 5. Same-tenant guard for product references (defense in depth)
-- ---------------------------------------------------------------------
-- The INSERT/UPDATE policies on these tables only check
-- tenant_id = get_user_tenant_id(); they never checked that product_id /
-- batch_id belong to that tenant. Enforced for every role (service role
-- included): a cross-tenant reference is never legitimate.
-- Existing rows are not touched (the trigger fires on new writes only);
-- the footer query lists pre-existing violations.
CREATE OR REPLACE FUNCTION public._guard_same_tenant_product_refs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ref uuid;
BEGIN
  IF TG_TABLE_NAME = 'product_components' THEN
    FOREACH v_ref IN ARRAY ARRAY[NEW.parent_product_id, NEW.component_product_id] LOOP
      IF v_ref IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.products p WHERE p.id = v_ref AND p.tenant_id = NEW.tenant_id
      ) THEN
        RAISE EXCEPTION 'product % does not belong to the tenant of this % row', v_ref, TG_TABLE_NAME
          USING ERRCODE = '42501';
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  -- product_batches, supply_chain_entries, product_images: product_id
  IF NEW.product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.products p WHERE p.id = NEW.product_id AND p.tenant_id = NEW.tenant_id
  ) THEN
    RAISE EXCEPTION 'product % does not belong to the tenant of this % row', NEW.product_id, TG_TABLE_NAME
      USING ERRCODE = '42501';
  END IF;

  -- Nested IF: NEW.batch_id only exists on supply_chain_entries.
  IF TG_TABLE_NAME = 'supply_chain_entries' THEN
    IF NEW.batch_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.product_batches b WHERE b.id = NEW.batch_id AND b.tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'batch % does not belong to the tenant of this supply_chain_entries row', NEW.batch_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public._guard_same_tenant_product_refs() FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public._guard_same_tenant_product_refs() FROM anon, authenticated';
  END IF;
END $$;

DO $$
DECLARE
  t text;
  v_cols text;
BEGIN
  FOREACH t IN ARRAY ARRAY['product_batches', 'supply_chain_entries', 'product_components', 'product_images'] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      CONTINUE;
    END IF;
    v_cols := CASE t
      WHEN 'product_components' THEN 'tenant_id, parent_product_id, component_product_id'
      WHEN 'supply_chain_entries' THEN 'tenant_id, product_id, batch_id'
      ELSE 'tenant_id, product_id'
    END;
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_same_tenant_refs', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF %s ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public._guard_same_tenant_product_refs()',
      t || '_same_tenant_refs', v_cols, t);
  END LOOP;
END $$;

-- Post-apply check (read-only, expected 0 rows; investigate any hit):
--   SELECT 'product_batches' AS t, b.id FROM product_batches b JOIN products p ON p.id = b.product_id WHERE p.tenant_id <> b.tenant_id
--   UNION ALL SELECT 'supply_chain_entries', s.id FROM supply_chain_entries s JOIN products p ON p.id = s.product_id WHERE p.tenant_id <> s.tenant_id
--   UNION ALL SELECT 'supply_chain_entries.batch', s.id FROM supply_chain_entries s JOIN product_batches b ON b.id = s.batch_id WHERE b.tenant_id <> s.tenant_id
--   UNION ALL SELECT 'product_components', c.id FROM product_components c JOIN products p ON p.id IN (c.parent_product_id, c.component_product_id) WHERE p.tenant_id <> c.tenant_id
--   UNION ALL SELECT 'product_images', i.id FROM product_images i JOIN products p ON p.id = i.product_id WHERE p.tenant_id <> i.tenant_id;
