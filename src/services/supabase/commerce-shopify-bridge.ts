/**
 * Commerce Hub — Shopify Bridge
 *
 * Mirrors the existing warehouse-side Shopify import (wh_shipments + wh_shipment_items)
 * into the unified Commerce Hub model (commerce_orders + commerce_order_items)
 * so existing Shopify customers see their sales in the Mega Dashboard immediately.
 *
 * Run idempotently — orders already mirrored are skipped via
 * (tenant_id, platform='shopify', external_order_id) uniqueness.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { createConnection, logSyncEvent } from './commerce-channels';
import type { CommerceChannelConnection } from '@/types/commerce-channels';

/**
 * Count Shopify shipments that are not yet mirrored in commerce_orders.
 * Lightweight — used by the Hub to show "X orders ready to import".
 */
export async function countUnbridgedShopifyOrders(): Promise<number> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return 0;

  const [shipRes, mirroredRes] = await Promise.all([
    supabase
      .from('wh_shipments')
      .select('shopify_order_id', { count: 'exact', head: false })
      .eq('tenant_id', tenantId)
      .not('shopify_order_id', 'is', null),
    supabase
      .from('commerce_orders')
      .select('external_order_id', { count: 'exact', head: false })
      .eq('tenant_id', tenantId)
      .eq('platform', 'shopify'),
  ]);

  const shipmentIds = new Set((shipRes.data || []).map((r) => String(r.shopify_order_id)));
  const mirroredIds = new Set((mirroredRes.data || []).map((r) => String(r.external_order_id)));

  let unbridged = 0;
  for (const id of shipmentIds) {
    if (!mirroredIds.has(id)) unbridged++;
  }
  return unbridged;
}

/**
 * Auto-link existing Warehouse-side integrations to Commerce Hub on first visit.
 * Currently supports Shopify; safe to extend with other warehouse-side connectors.
 * Returns true if any connection was created.
 */
export async function autoLinkWarehouseIntegrations(): Promise<{ shopifyLinked: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { shopifyLinked: false };

  // Was a Shopify row already there?
  const { data: existing } = await supabase
    .from('commerce_channel_connections')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('platform', 'shopify')
    .limit(1)
    .maybeSingle();

  if (existing) return { shopifyLinked: false };

  const conn = await ensureShopifyConnection(tenantId);
  return { shopifyLinked: Boolean(conn) };
}

interface BridgeResult {
  /** Whether a Shopify connection now exists in commerce_channel_connections */
  connection: CommerceChannelConnection | null;
  /** New commerce_orders rows inserted in this run */
  ordersInserted: number;
  /** Existing rows already present (skipped) */
  ordersSkipped: number;
  /** Total commerce_order_items rows inserted */
  itemsInserted: number;
  /** Items where the warehouse mapping had a product_id (DPP linked) */
  itemsLinkedToDpp: number;
  /** Earliest placed_at across imported orders, useful for the UI */
  earliestImportedAt: string | null;
  /** Latest placed_at — used to show "Bridged up to" */
  latestImportedAt: string | null;
}

/**
 * Get the Shopify connection or create it on demand.
 * Pulls shop metadata from tenants.settings.shopifyIntegration.
 *
 * Exported so the Commerce Hub page can auto-link an already-configured
 * Warehouse Shopify integration on first visit.
 */
export async function ensureShopifyConnection(tenantId: string): Promise<CommerceChannelConnection | null> {
  // Existing?
  const { data: existing } = await supabase
    .from('commerce_channel_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('platform', 'shopify')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return mapRow(existing);
  }

  // Create from tenants.settings.shopifyIntegration
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const sf = tenant?.settings?.shopifyIntegration as {
    enabled?: boolean;
    shopDomain?: string;
    shopName?: string;
  } | undefined;

  if (!sf?.enabled || !sf.shopDomain) {
    return null; // No Shopify configured — skip
  }

  const conn = await createConnection({
    platform: 'shopify',
    accountLabel: sf.shopName || sf.shopDomain,
    accountUrl: `https://${sf.shopDomain}`,
    accountExternalId: sf.shopDomain,
    accountCurrency: 'EUR',
    status: 'connected',
    scopes: ['read_orders', 'read_products', 'write_inventory', 'write_fulfillments'],
    autoSyncEnabled: true,
    syncIntervalMinutes: 15,
  });
  return conn;
}

/**
 * Idempotently import all Shopify orders that already live in wh_shipments
 * into commerce_orders + commerce_order_items.
 *
 * Returns a summary the UI can show.
 */
export async function bridgeShopifyToCommerceHub(opts?: {
  /** Skip already-mirrored orders (default true). Set false to re-import (e.g. after schema change). */
  skipExisting?: boolean;
  /** Only consider shipments newer than this ISO date (default: all-time). */
  sinceIso?: string;
}): Promise<BridgeResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const result: BridgeResult = {
    connection: null,
    ordersInserted: 0,
    ordersSkipped: 0,
    itemsInserted: 0,
    itemsLinkedToDpp: 0,
    earliestImportedAt: null,
    latestImportedAt: null,
  };

  // 1) Ensure connection
  result.connection = await ensureShopifyConnection(tenantId);
  if (!result.connection) {
    throw new Error(
      'Shopify is not connected in the warehouse module. Connect it under /warehouse/integrations/shopify first.',
    );
  }

  // 2) Pull all Shopify shipments (newest first for nicer UX)
  let shipQuery = supabase
    .from('wh_shipments')
    .select(`
      id, shopify_order_id, shipment_number, recipient_name, recipient_email,
      shipping_country, shipping_city, shipping_postal_code, shipping_state,
      currency, total_items, shipping_cost, shipped_at, delivered_at, status,
      tracking_number, carrier, order_reference, created_at, customer_id
    `)
    .eq('tenant_id', tenantId)
    .not('shopify_order_id', 'is', null)
    .order('created_at', { ascending: false });

  if (opts?.sinceIso) shipQuery = shipQuery.gte('created_at', opts.sinceIso);

  const { data: shipments, error: shipErr } = await shipQuery;
  if (shipErr) throw new Error(`Failed to load shipments: ${shipErr.message}`);
  if (!shipments || shipments.length === 0) {
    await logSyncEvent({
      connectionId: result.connection.id,
      platform: 'shopify',
      eventType: 'sync_completed',
      severity: 'info',
      title: 'No Shopify shipments to bridge',
    });
    return result;
  }

  // 3) Determine which shopify_order_ids are already in commerce_orders
  const externalIds = shipments.map((s) => String(s.shopify_order_id));
  const { data: alreadyMirrored } = await supabase
    .from('commerce_orders')
    .select('external_order_id')
    .eq('tenant_id', tenantId)
    .eq('platform', 'shopify')
    .in('external_order_id', externalIds);
  const mirroredSet = new Set((alreadyMirrored || []).map((o) => o.external_order_id));

  // 4) Pull all line items for these shipments (one round trip)
  const shipmentIds = shipments.map((s) => s.id);
  const { data: itemRows, error: itemErr } = await supabase
    .from('wh_shipment_items')
    .select('shipment_id, product_id, batch_id, quantity, unit_price, currency')
    .in('shipment_id', shipmentIds);
  if (itemErr) throw new Error(`Failed to load shipment items: ${itemErr.message}`);

  // Group items by shipment
  const itemsBySh = new Map<string, typeof itemRows>();
  for (const item of itemRows || []) {
    const arr = itemsBySh.get(item.shipment_id) || [];
    arr.push(item);
    itemsBySh.set(item.shipment_id, arr);
  }

  // 5) Resolve product names + GTIN/SKU once for nicer display + lat/lng for geo
  const productIds = Array.from(new Set((itemRows || []).map((i) => i.product_id).filter(Boolean)));
  const { data: products } = productIds.length
    ? await supabase
        .from('products')
        .select('id, name, gtin, sku')
        .in('id', productIds)
    : { data: [] as Array<{ id: string; name: string; gtin?: string; sku?: string }> };
  const productMap = new Map((products || []).map((p) => [p.id, p]));

  // 6) Batch insert orders + items
  const earliest = { iso: null as string | null };
  const latest = { iso: null as string | null };

  for (const shp of shipments) {
    const externalId = String(shp.shopify_order_id);
    if (opts?.skipExisting !== false && mirroredSet.has(externalId)) {
      result.ordersSkipped++;
      continue;
    }

    const items = itemsBySh.get(shp.id) || [];
    const subtotal = items.reduce((s, i) => s + Number(i.unit_price ?? 0) * Number(i.quantity ?? 0), 0);
    const shippingCost = Number(shp.shipping_cost ?? 0);
    const total = subtotal + shippingCost;
    const placedAt = shp.shipped_at || shp.created_at;
    const itemCount = items.reduce((s, i) => s + Number(i.quantity ?? 0), 0);
    const dppLinked = items.filter((i) => Boolean(i.product_id)).length;
    const dppTotal = items.length;
    const country = shp.shipping_country || null;
    const { lat, lng } = country ? approximateCenter(country) : { lat: null, lng: null };

    // Insert order
    const { data: orderRow, error: orderErr } = await supabase
      .from('commerce_orders')
      .insert({
        tenant_id: tenantId,
        connection_id: result.connection.id,
        platform: 'shopify',
        external_order_id: externalId,
        external_order_number: shp.order_reference || `Shopify ${externalId.slice(-6)}`,
        currency: shp.currency || 'EUR',
        subtotal_amount: subtotal,
        shipping_amount: shippingCost,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: total,
        total_amount_eur: total, // assume EUR; refine when multi-currency lands
        customer_email: shp.recipient_email || null,
        customer_name: shp.recipient_name || null,
        customer_country: country,
        customer_country_name: country ? regionName(country) : null,
        customer_city: shp.shipping_city || null,
        customer_postal_code: shp.shipping_postal_code || null,
        customer_lat: lat,
        customer_lng: lng,
        financial_status: 'paid',
        fulfillment_status: shp.status === 'shipped' || shp.status === 'delivered' ? 'shipped' :
                           shp.status === 'in_transit' ? 'shipped' :
                           shp.status === 'delivered' ? 'delivered' :
                           'unfulfilled',
        order_status: shp.status === 'cancelled' ? 'cancelled' : 'open',
        is_test: false,
        item_count: itemCount,
        dpp_linked_count: dppLinked,
        dpp_total_count: dppTotal,
        placed_at: placedAt,
        paid_at: placedAt,
        fulfilled_at: shp.shipped_at || null,
        synced_at: new Date().toISOString(),
        metadata: { source: 'wh_shipments_bridge', shipmentId: shp.id, shipmentNumber: shp.shipment_number },
      })
      .select('id')
      .single();

    if (orderErr) {
      // Most common error: the shipment was mirrored between our SELECT and INSERT.
      // Treat that as a skip rather than fatal.
      if (orderErr.message?.includes('duplicate key')) {
        result.ordersSkipped++;
        continue;
      }
      console.error('Bridge: order insert failed', shp.id, orderErr.message);
      continue;
    }

    // Insert items
    if (items.length > 0) {
      const itemPayload = items.map((i) => {
        const product = i.product_id ? productMap.get(i.product_id) : null;
        const totalPrice = Number(i.unit_price ?? 0) * Number(i.quantity ?? 0);
        return {
          tenant_id: tenantId,
          order_id: orderRow.id,
          title: product?.name || 'Shopify line item',
          sku: product?.sku || null,
          gtin: product?.gtin || null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: totalPrice,
          product_id: i.product_id || null,
          batch_id: i.batch_id || null,
          match_method: i.product_id ? 'sku' : null,
          match_confidence: i.product_id ? 0.99 : null,
          dpp_url: i.product_id ? `/products/${i.product_id}` : null,
          metadata: { source: 'wh_shipments_bridge' },
        };
      });
      const { error: itemErr2 } = await supabase
        .from('commerce_order_items')
        .insert(itemPayload);
      if (itemErr2) {
        console.error('Bridge: items insert failed', orderRow.id, itemErr2.message);
      } else {
        result.itemsInserted += itemPayload.length;
        result.itemsLinkedToDpp += itemPayload.filter((i) => i.product_id).length;
      }
    }

    // Track date envelope
    if (!earliest.iso || placedAt < earliest.iso) earliest.iso = placedAt;
    if (!latest.iso || placedAt > latest.iso) latest.iso = placedAt;
    result.ordersInserted++;
  }

  result.earliestImportedAt = earliest.iso;
  result.latestImportedAt = latest.iso;

  // 7) Log audit event
  await logSyncEvent({
    connectionId: result.connection.id,
    platform: 'shopify',
    eventType: result.ordersInserted > 0 ? 'sync_completed' : 'sync_completed',
    severity: result.ordersInserted > 0 ? 'success' : 'info',
    title:
      result.ordersInserted > 0
        ? `Bridged ${result.ordersInserted} Shopify orders into Commerce Hub`
        : `Shopify already in sync — ${result.ordersSkipped} orders already mirrored`,
    description: result.ordersInserted > 0
      ? `${result.itemsInserted} line items, ${result.itemsLinkedToDpp} DPP-linked`
      : undefined,
    itemsProcessed: result.ordersInserted + result.ordersSkipped,
    itemsCreated: result.ordersInserted,
    itemsUpdated: 0,
    itemsFailed: 0,
  });

  // 8) Update connection sync timestamp
  await supabase
    .from('commerce_channel_connections')
    .update({
      last_full_sync_at: new Date().toISOString(),
      last_incremental_sync_at: new Date().toISOString(),
      last_error_message: null,
      last_error_at: null,
    })
    .eq('id', result.connection.id);

  return result;
}

/* ============================================
   Helpers
   ============================================ */

// Country → approximate centroid for the Geo Heatmap.
// Sufficient for visualization; not for distance math.
function approximateCenter(code: string): { lat: number | null; lng: number | null } {
  const c = code.toUpperCase();
  const map: Record<string, [number, number]> = {
    DE: [51.1657, 10.4515], AT: [47.5162, 14.5501], CH: [46.8182, 8.2275],
    FR: [46.6034, 1.8883], IT: [41.8719, 12.5674], ES: [40.4637, -3.7492],
    NL: [52.1326, 5.2913], BE: [50.5039, 4.4699], LU: [49.8153, 6.1296],
    PL: [51.9194, 19.1451], CZ: [49.8175, 15.473], DK: [56.2639, 9.5018],
    SE: [60.1282, 18.6435], NO: [60.472, 8.4689], FI: [61.9241, 25.7482],
    GB: [55.3781, -3.436], IE: [53.4129, -8.2439], PT: [39.3999, -8.2245],
    GR: [39.0742, 21.8243], HU: [47.1625, 19.5033], RO: [45.9432, 24.9668],
    BG: [42.7339, 25.4858], HR: [45.1, 15.2], SK: [48.669, 19.699],
    SI: [46.1512, 14.9955], EE: [58.5953, 25.0136], LV: [56.8796, 24.6032],
    LT: [55.1694, 23.8813], CY: [35.1264, 33.4299], MT: [35.9375, 14.3754],
    US: [37.0902, -95.7129], CA: [56.1304, -106.3468], MX: [23.6345, -102.5528],
    AU: [-25.2744, 133.7751], NZ: [-40.9006, 174.886], JP: [36.2048, 138.2529],
    CN: [35.8617, 104.1954], IN: [20.5937, 78.9629], BR: [-14.235, -51.9253],
    AR: [-38.4161, -63.6167], TR: [38.9637, 35.2433], ZA: [-30.5595, 22.9375],
    AE: [23.4241, 53.8478], SA: [23.8859, 45.0792], KR: [35.9078, 127.7669],
    SG: [1.3521, 103.8198], HK: [22.3193, 114.1694], TW: [23.6978, 120.9605],
  };
  const v = map[c];
  return v ? { lat: v[0], lng: v[1] } : { lat: null, lng: null };
}

function regionName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

function mapRow(row: Record<string, unknown>): CommerceChannelConnection {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    platform: 'shopify',
    status: (row.status as CommerceChannelConnection['status']) || 'connected',
    accountLabel: row.account_label as string,
    accountUrl: (row.account_url as string) || undefined,
    accountExternalId: (row.account_external_id as string) || undefined,
    accountCurrency: (row.account_currency as string) || 'EUR',
    accountCountry: (row.account_country as string) || undefined,
    iconColor: (row.icon_color as string) || undefined,
    canReadOrders: row.can_read_orders as boolean,
    canReadProducts: row.can_read_products as boolean,
    canWriteInventory: row.can_write_inventory as boolean,
    canWriteFulfillment: row.can_write_fulfillment as boolean,
    credentialRef: (row.credential_ref as string) || undefined,
    scopes: (row.scopes as string[]) || [],
    webhookSubscriptionIds: (row.webhook_subscription_ids as string[]) || [],
    lastFullSyncAt: (row.last_full_sync_at as string) || undefined,
    lastIncrementalSyncAt: (row.last_incremental_sync_at as string) || undefined,
    lastErrorMessage: (row.last_error_message as string) || undefined,
    lastErrorAt: (row.last_error_at as string) || undefined,
    nextSyncAfter: (row.next_sync_after as string) || undefined,
    syncCursor: (row.sync_cursor as string) || undefined,
    autoSyncEnabled: row.auto_sync_enabled as boolean,
    syncIntervalMinutes: (row.sync_interval_minutes as number) || 15,
    autoMatchByGtin: row.auto_match_by_gtin as boolean,
    autoMatchBySku: row.auto_match_by_sku as boolean,
    autoMatchThreshold: (row.auto_match_threshold as number) || 0.85,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
