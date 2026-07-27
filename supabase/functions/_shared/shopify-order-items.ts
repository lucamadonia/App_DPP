/**
 * Shopify line item -> wh_shipment_items resolution, shared by the two import
 * paths (shopify-webhook/handleOrderCreated and shopify-sync/handleSyncOrders).
 *
 * WHY THIS EXISTS
 * Both paths used to do the same thing inline:
 *
 *     const mapping = variantMap.get(li.variant_id);
 *     if (!mapping) continue;              // <- line item silently dropped
 *
 * shopify_product_map is strictly 1 variant -> 1 product, so a Shopify "Set"
 * (three of them were created on 2026-07-13; they are NOT native Shopify
 * bundles and arrive as a single line item) could not be expressed at all.
 * Unmapped lines vanished without trace, and when an order consisted only of a
 * Set the shipment was never created — order #1054 disappeared entirely, #1055
 * arrived with 1 of its 9 positions.
 *
 * Resolution order per line item is now:
 *   1. shopify_bundle_map  -> one draft row PER COMPONENT (the Set explosion)
 *   2. shopify_product_map -> one draft row (unchanged legacy behaviour)
 *   3. neither             -> zero rows + an ImportWarning (never silent)
 *
 * Exploded components are deliberately kept as SEPARATE rows rather than being
 * merged with an identical standalone line, so the packer can see what belongs
 * to which Set. PickPackConfirmDialog was fixed in the same change to pick the
 * first not-yet-confirmed matching row, which is what makes several rows of the
 * same product individually scannable.
 */

// deno-lint-ignore-file no-explicit-any

export interface BundleComponentDef {
  productId: string;
  batchId: string | null;
  quantity: number;
  autoBatch: boolean;
  sortOrder: number;
}

export interface BundleDef {
  bundleId: string;
  shopifyVariantId: number;
  label: string;
  components: BundleComponentDef[];
}

export interface ShipmentItemDraft {
  tenant_id: string;
  product_id: string;
  batch_id: string | null;
  location_id: string;
  quantity: number;
  unit_price: number | null;
  currency: string;
  notes: string | null;
  bundle_group: string | null;
  bundle_label: string | null;
}

export type ImportWarningType =
  | 'unmapped_variant'
  | 'no_primary_location'
  | 'bundle_without_components'
  | 'auto_batch_fallback'
  | 'bundle_component_no_batch';

export interface ImportWarning {
  type: ImportWarningType;
  shopifyVariantId?: number;
  shopifyProductId?: number;
  shopifyProductTitle?: string;
  shopifyVariantTitle?: string;
  sku?: string | null;
  quantity?: number;
  productId?: string;
  message?: string;
  detectedAt: string;
}

export interface MappingContext {
  variantMap: Map<number, any>;
  bundleMap: Map<number, BundleDef>;
}

/** FEFO/stock-aware batch picker, injected so each edge function keeps its own copy. */
export type AutoBatchResolver = (
  supabase: any,
  tenantId: string,
  productId: string,
  sourceLocationId: string | null,
) => Promise<{ batchId: string | null; stockBacked: boolean }>;

const AUTO_BATCH_NOTE = 'auto-batch ohne Stock-Check (FIFO-Fallback)';

/**
 * Load both mapping tables once per order batch.
 *
 * Note the variantMap is keyed by shopify_variant_id and built from a filtered
 * is_active list — identical to the previous inline behaviour, so single-product
 * imports resolve exactly as before.
 */
export async function loadShopifyMappings(
  supabase: any,
  tenantId: string,
): Promise<MappingContext & { productMaps: any[] }> {
  const [{ data: productMaps }, { data: bundles }] = await Promise.all([
    supabase.from('shopify_product_map').select('*').eq('tenant_id', tenantId).eq('is_active', true),
    supabase
      .from('shopify_bundle_map')
      .select('id, shopify_variant_id, shopify_product_title, shopify_variant_title, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
  ]);

  const variantMap = new Map<number, any>(
    (productMaps || []).map((m: any) => [m.shopify_variant_id, m]),
  );

  const bundleMap = new Map<number, BundleDef>();
  if (bundles?.length) {
    const { data: components } = await supabase
      .from('shopify_bundle_components')
      .select('bundle_id, component_product_id, component_batch_id, quantity, auto_batch, sort_order')
      .in('bundle_id', bundles.map((b: any) => b.id))
      .order('sort_order', { ascending: true });

    const byBundle = new Map<string, BundleComponentDef[]>();
    for (const c of components || []) {
      const list = byBundle.get(c.bundle_id) || [];
      list.push({
        productId: c.component_product_id,
        batchId: c.component_batch_id || null,
        quantity: c.quantity || 1,
        autoBatch: c.auto_batch !== false,
        sortOrder: c.sort_order || 0,
      });
      byBundle.set(c.bundle_id, list);
    }

    for (const b of bundles) {
      const variantLabel = b.shopify_variant_title && b.shopify_variant_title !== 'Default Title'
        ? ` (${b.shopify_variant_title})`
        : '';
      bundleMap.set(b.shopify_variant_id, {
        bundleId: b.id,
        shopifyVariantId: b.shopify_variant_id,
        label: `${b.shopify_product_title || 'Set'}${variantLabel}`,
        components: byBundle.get(b.id) || [],
      });
    }
  }

  return { productMaps: productMaps || [], variantMap, bundleMap };
}

/**
 * Split a line total across components in integer cents, largest-remainder style.
 *
 * Keeps Σ(unit_price × quantity) exactly equal to the Shopify line total, so
 * shipment revenue (crm-analytics) and the CSV exports stay correct. Putting the
 * full price on one component and 0 on the rest would also total correctly but
 * prints "0,00 €" lines on the delivery note, which reads as a pricing error and
 * collides with the is_gift => unit_price 0 convention.
 */
function splitUnitPrices(lineTotalCents: number, unitCounts: number[]): (number | null)[] {
  const totalUnits = unitCounts.reduce((a, b) => a + b, 0);
  if (!totalUnits || !lineTotalCents) return unitCounts.map(() => null);

  const shares = unitCounts.map((u) => Math.floor((lineTotalCents * u) / totalUnits));
  const remainder = lineTotalCents - shares.reduce((a, b) => a + b, 0);
  shares[0] += remainder;

  return shares.map((cents, i) => (unitCounts[i] > 0 ? cents / unitCounts[i] / 100 : null));
}

/**
 * Resolve one Shopify line item into zero or more shipment item drafts.
 * Never throws and never returns silently — anything unresolvable produces a warning.
 */
export async function resolveLineItem(
  supabase: any,
  tenantId: string,
  locationId: string,
  currency: string,
  ctx: MappingContext,
  li: any,
  resolveAutoBatch: AutoBatchResolver,
): Promise<{ items: ShipmentItemDraft[]; warnings: ImportWarning[] }> {
  const now = new Date().toISOString();
  const lineQty = li.fulfillable_quantity || li.quantity || 1;
  const warnings: ImportWarning[] = [];

  const describe = () => ({
    shopifyVariantId: li.variant_id,
    shopifyProductId: li.product_id,
    shopifyProductTitle: li.title,
    shopifyVariantTitle: li.variant_title,
    sku: li.sku ?? null,
    quantity: lineQty,
  });

  // ---- 1. Set / bundle -------------------------------------------------
  const bundle = ctx.bundleMap.get(li.variant_id);
  if (bundle) {
    if (!bundle.components.length) {
      warnings.push({
        type: 'bundle_without_components',
        ...describe(),
        message: `Set "${bundle.label}" hat keine Komponenten hinterlegt`,
        detectedAt: now,
      });
      return { items: [], warnings };
    }

    const components = [...bundle.components].sort((a, b) => a.sortOrder - b.sortOrder);
    const unitCounts = components.map((c) => c.quantity * lineQty);
    const lineTotalCents = Math.round((parseFloat(li.price) || 0) * 100) * lineQty;
    const prices = splitUnitPrices(lineTotalCents, unitCounts);

    const items: ShipmentItemDraft[] = [];
    for (let i = 0; i < components.length; i++) {
      const c = components[i];
      let batchId = c.batchId;
      const notes: string[] = [`Set: ${bundle.label}`];

      if (!batchId && c.autoBatch) {
        const picked = await resolveAutoBatch(supabase, tenantId, c.productId, locationId);
        batchId = picked.batchId;
        if (batchId && !picked.stockBacked) {
          notes.push(AUTO_BATCH_NOTE);
          warnings.push({
            type: 'auto_batch_fallback',
            ...describe(),
            productId: c.productId,
            message: 'Set-Komponente ohne Bestand am Standort — FIFO-Fallback',
            detectedAt: now,
          });
        }
      }

      if (!batchId) {
        warnings.push({
          type: 'bundle_component_no_batch',
          ...describe(),
          productId: c.productId,
          message: 'Set-Komponente ohne Charge — bitte manuell zuordnen',
          detectedAt: now,
        });
      }

      items.push({
        tenant_id: tenantId,
        product_id: c.productId,
        batch_id: batchId,
        location_id: locationId,
        quantity: unitCounts[i],
        unit_price: prices[i],
        currency,
        notes: notes.join(' — '),
        bundle_group: li.id ? String(li.id) : `${li.variant_id}`,
        bundle_label: bundle.label,
      });
    }
    return { items, warnings };
  }

  // ---- 2. Plain 1:1 mapping (unchanged legacy path) --------------------
  const mapping = ctx.variantMap.get(li.variant_id);
  if (mapping) {
    let batchId = mapping.batch_id || null;
    let itemNote: string | null = null;
    if (!batchId && mapping.auto_batch) {
      const picked = await resolveAutoBatch(supabase, tenantId, mapping.product_id, locationId);
      batchId = picked.batchId;
      if (batchId && !picked.stockBacked) itemNote = AUTO_BATCH_NOTE;
    }

    return {
      items: [{
        tenant_id: tenantId,
        product_id: mapping.product_id,
        batch_id: batchId,
        location_id: locationId,
        quantity: lineQty,
        unit_price: parseFloat(li.price) || null,
        currency,
        notes: itemNote,
        bundle_group: null,
        bundle_label: null,
      }],
      warnings,
    };
  }

  // ---- 3. Nothing matched — record it, never drop silently -------------
  warnings.push({ type: 'unmapped_variant', ...describe(), detectedAt: now });
  return { items: [], warnings };
}

/**
 * Resolve every line item of an order.
 *
 * Unlike the old inline loops this never returns "nothing to do": if no line
 * resolves, the caller still creates the shipment and surfaces the warnings, so
 * the order stays visible instead of disappearing.
 */
export async function buildShipmentItems(
  supabase: any,
  tenantId: string,
  locationId: string | null,
  order: any,
  ctx: MappingContext,
  resolveAutoBatch: AutoBatchResolver,
): Promise<{ items: ShipmentItemDraft[]; warnings: ImportWarning[] }> {
  const lineItems = order.line_items || [];
  const currency = order.currency || 'EUR';

  if (!locationId) {
    return {
      items: [],
      warnings: [{
        type: 'no_primary_location',
        message: 'Keine primäre Shopify-Location gemappt — Positionen können nicht angelegt werden',
        detectedAt: new Date().toISOString(),
      }],
    };
  }

  const items: ShipmentItemDraft[] = [];
  const warnings: ImportWarning[] = [];
  for (const li of lineItems) {
    const r = await resolveLineItem(supabase, tenantId, locationId, currency, ctx, li, resolveAutoBatch);
    items.push(...r.items);
    warnings.push(...r.warnings);
  }
  return { items, warnings };
}
