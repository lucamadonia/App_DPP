/**
 * Commerce Orders Service
 *
 * Aggregations + queries against the unified commerce_orders + commerce_order_items
 * tables. Powers both the Mega Dashboard and per-platform views.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  CommerceOrder,
  CommerceOrderItem,
  CommerceFinancialStatus,
  CommerceFulfillmentStatus,
  CommerceOrderStatus,
  CommercePlatform,
  CommerceMegaDashboardSnapshot,
  CommerceLeaderboardEntry,
  CommerceLiveOrder,
  CommerceGeoPoint,
  CommercePlatformBreakdownEntry,
  CommerceKpiBlock,
  DppMatchMethod,
} from '@/types/commerce-channels';
import { ALL_COMMERCE_PLATFORMS } from '@/types/commerce-channels';

// ============================================
// TRANSFORMS
// ============================================

function transformOrder(row: Record<string, unknown>): CommerceOrder {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    connectionId: (row.connection_id as string) || undefined,
    platform: row.platform as CommercePlatform,
    externalOrderId: row.external_order_id as string,
    externalOrderNumber: (row.external_order_number as string) || undefined,
    externalCustomerId: (row.external_customer_id as string) || undefined,
    externalUrl: (row.external_url as string) || undefined,
    currency: (row.currency as string) || 'EUR',
    subtotalAmount: Number(row.subtotal_amount ?? 0),
    shippingAmount: Number(row.shipping_amount ?? 0),
    taxAmount: Number(row.tax_amount ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    totalAmountEur: row.total_amount_eur != null ? Number(row.total_amount_eur) : undefined,
    customerEmail: (row.customer_email as string) || undefined,
    customerName: (row.customer_name as string) || undefined,
    customerCountry: (row.customer_country as string) || undefined,
    customerCountryName: (row.customer_country_name as string) || undefined,
    customerCity: (row.customer_city as string) || undefined,
    customerPostalCode: (row.customer_postal_code as string) || undefined,
    customerLat: row.customer_lat != null ? Number(row.customer_lat) : undefined,
    customerLng: row.customer_lng != null ? Number(row.customer_lng) : undefined,
    customerIsReturning: Boolean(row.customer_is_returning),
    financialStatus: (row.financial_status as CommerceFinancialStatus) || undefined,
    fulfillmentStatus: (row.fulfillment_status as CommerceFulfillmentStatus) || undefined,
    orderStatus: (row.order_status as CommerceOrderStatus) || undefined,
    isTest: Boolean(row.is_test),
    itemCount: Number(row.item_count ?? 0),
    dppLinkedCount: Number(row.dpp_linked_count ?? 0),
    dppTotalCount: Number(row.dpp_total_count ?? 0),
    carbonFootprintKg: row.carbon_footprint_kg != null ? Number(row.carbon_footprint_kg) : undefined,
    placedAt: row.placed_at as string,
    paidAt: (row.paid_at as string) || undefined,
    fulfilledAt: (row.fulfilled_at as string) || undefined,
    cancelledAt: (row.cancelled_at as string) || undefined,
    syncedAt: (row.synced_at as string) || (row.created_at as string),
    rawPayload: (row.raw_payload as Record<string, unknown>) || undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformItem(row: Record<string, unknown>): CommerceOrderItem {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    orderId: row.order_id as string,
    externalItemId: (row.external_item_id as string) || undefined,
    externalProductId: (row.external_product_id as string) || undefined,
    externalVariantId: (row.external_variant_id as string) || undefined,
    title: row.title as string,
    variantTitle: (row.variant_title as string) || undefined,
    sku: (row.sku as string) || undefined,
    gtin: (row.gtin as string) || undefined,
    imageUrl: (row.image_url as string) || undefined,
    quantity: Number(row.quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    totalPrice: Number(row.total_price ?? 0),
    productId: (row.product_id as string) || undefined,
    batchId: (row.batch_id as string) || undefined,
    matchMethod: (row.match_method as DppMatchMethod) || null,
    matchConfidence: row.match_confidence != null ? Number(row.match_confidence) : undefined,
    dppUrl: (row.dpp_url as string) || undefined,
    dppQrEmittedAt: (row.dpp_qr_emitted_at as string) || undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ============================================
// LIST + DETAIL
// ============================================

export interface ListOrdersFilters {
  platform?: CommercePlatform;
  connectionId?: string;
  fromDate?: string;
  toDate?: string;
  financialStatus?: CommerceFinancialStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function listOrders(filters: ListOrdersFilters = {}): Promise<CommerceOrder[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('commerce_orders')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('placed_at', { ascending: false });

  if (filters.platform) query = query.eq('platform', filters.platform);
  if (filters.connectionId) query = query.eq('connection_id', filters.connectionId);
  if (filters.financialStatus) query = query.eq('financial_status', filters.financialStatus);
  if (filters.fromDate) query = query.gte('placed_at', filters.fromDate);
  if (filters.toDate) query = query.lte('placed_at', filters.toDate);
  if (filters.search) {
    const term = `%${filters.search}%`;
    query = query.or(
      `external_order_number.ilike.${term},customer_email.ilike.${term},customer_name.ilike.${term}`,
    );
  }
  if (filters.limit) query = query.limit(filters.limit);
  if (filters.offset != null) query = query.range(filters.offset, (filters.offset || 0) + (filters.limit || 50) - 1);

  const { data, error } = await query;
  if (error) {
    console.error('Failed to list orders:', error);
    return [];
  }
  return (data || []).map(transformOrder);
}

/**
 * Manually point one order line at a Trackbliss product, or clear the link.
 *
 * Automatic matching only fires on an exact SKU/GTIN hit, which marketplaces
 * frequently cannot deliver — Etsy exposes no GTIN at all.  Without a manual
 * override an unmatched line can never reach the warehouse, since shipment
 * items require a product.
 */
export async function linkOrderItemToProduct(
  itemId: string,
  orderId: string,
  productId: string | null,
): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  let gtin: string | null = null;
  if (productId) {
    const { data: product } = await supabase
      .from('products').select('gtin').eq('id', productId).eq('tenant_id', tenantId).single();
    if (!product) throw new Error('Product not found in this tenant');
    gtin = (product as { gtin?: string }).gtin ?? null;
  }

  const { error } = await supabase
    .from('commerce_order_items')
    .update({
      product_id: productId,
      gtin,
      match_method: productId ? 'manual' : null,
      match_confidence: productId ? 1 : null,
      dpp_url: productId ? `/products/${productId}` : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('tenant_id', tenantId);
  if (error) throw error;

  // Keep the order's roll-up honest; the dashboards read it directly.
  const { data: items } = await supabase
    .from('commerce_order_items').select('product_id').eq('order_id', orderId).eq('tenant_id', tenantId);
  const rows = (items ?? []) as Array<{ product_id: string | null }>;
  await supabase
    .from('commerce_orders')
    .update({
      dpp_linked_count: rows.filter((i) => i.product_id).length,
      dpp_total_count: rows.length,
    })
    .eq('id', orderId)
    .eq('tenant_id', tenantId);
}

/**
 * Turn a marketplace order into a warehouse shipment on demand.
 *
 * The Etsy sync does this automatically, but only for lines that were already
 * assigned when it ran — so after a manual assignment the operator would have
 * to re-sync just to get the shipment.  This lets them trigger it straight
 * from the order, the way Shopify orders are fulfilled.
 *
 * Address fields live in the stored provider payload, since commerce_orders
 * keeps no street column.
 */
export async function createShipmentFromOrder(orderId: string): Promise<{ shipmentNumber: string; itemsCreated: number; itemCount?: number; reused?: boolean }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data: order } = await supabase
    .from('commerce_orders').select('*').eq('id', orderId).eq('tenant_id', tenantId).single();
  if (!order) throw new Error('Order not found');

  if (order.platform === 'etsy') {
    const { data, error } = await supabase.rpc('reconcile_etsy_shipment', {
      p_order_id: orderId, p_tenant_id: tenantId,
    });
    if (error) throw new Error(error.message);
    return data;
  }

  const orderRef = `${order.platform === 'etsy' ? 'Etsy' : order.platform} ${order.external_order_id}`;
  const { data: existing } = await supabase
    .from('wh_shipments').select('shipment_number').eq('tenant_id', tenantId)
    .eq('order_reference', orderRef).maybeSingle();
  if (existing) throw new Error(`Shipment already exists: ${existing.shipment_number}`);

  const raw = (order.raw_payload ?? {}) as Record<string, unknown>;
  const street = [raw.first_line, raw.second_line].filter(Boolean).join(' ').trim();
  const city = (raw.city as string) || order.customer_city;
  const zip = raw.zip ? String(raw.zip) : order.customer_postal_code;
  if (!street || !city || !zip) {
    throw new Error('Order has no complete shipping address — add it on the shipment manually.');
  }

  const { data: items } = await supabase
    .from('commerce_order_items').select('*').eq('order_id', orderId).eq('tenant_id', tenantId);
  const lines = (items ?? []) as Array<Record<string, never> & {
    product_id: string | null; quantity: number; unit_price: number; sku: string | null;
  }>;

  const dateStr = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const { data: shipment, error } = await supabase.from('wh_shipments').insert({
    tenant_id: tenantId,
    shipment_number: `SHP-${dateStr}-${rand}`,
    status: 'draft',
    recipient_type: 'customer',
    recipient_name: (raw.name as string) || order.customer_name || 'Marketplace buyer',
    recipient_email: order.customer_email || null,
    shipping_street: street,
    shipping_city: city,
    shipping_state: (raw.state as string) || null,
    shipping_postal_code: zip,
    shipping_country: order.customer_country || 'DE',
    total_items: lines.reduce((n, l) => n + (l.quantity || 0), 0),
    order_reference: orderRef,
    notes: orderRef,
  }).select('id, shipment_number').single();
  if (error || !shipment) throw error || new Error('Shipment could not be created');

  // Shipment items need product, batch and location — none of which a
  // marketplace supplies. Unassigned lines are skipped, not fatal.
  const { data: location } = await supabase
    .from('wh_locations').select('id').eq('tenant_id', tenantId).order('created_at').limit(1).maybeSingle();

  let itemsCreated = 0;
  if (location) {
    for (const line of lines.filter((l) => l.product_id)) {
      const { data: batch } = await supabase
        .from('product_batches').select('id').eq('product_id', line.product_id!)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!batch) continue;
      const { error: itemError } = await supabase.from('wh_shipment_items').insert({
        tenant_id: tenantId,
        shipment_id: shipment.id,
        product_id: line.product_id,
        batch_id: batch.id,
        location_id: location.id,
        quantity: line.quantity,
        unit_price: line.unit_price,
        currency: order.currency || 'EUR',
        notes: line.sku ? `SKU ${line.sku}` : null,
      });
      if (!itemError) itemsCreated++;
    }
  }

  await supabase.from('commerce_orders')
    .update({ metadata: { ...(order.metadata ?? {}), shipmentId: shipment.id, orderReference: orderRef } })
    .eq('id', orderId);

  return { shipmentNumber: shipment.shipment_number, itemsCreated };
}

export async function getOrderWithItems(
  id: string,
): Promise<{ order: CommerceOrder; items: CommerceOrderItem[] } | null> {
  const [orderRes, itemsRes] = await Promise.all([
    supabase.from('commerce_orders').select('*').eq('id', id).single(),
    supabase.from('commerce_order_items').select('*').eq('order_id', id).order('created_at'),
  ]);

  if (orderRes.error || !orderRes.data) return null;

  return {
    order: transformOrder(orderRes.data),
    items: (itemsRes.data || []).map(transformItem),
  };
}

// ============================================
// MEGA DASHBOARD AGGREGATIONS
// ============================================

const ISO_DATE = (d: Date) => d.toISOString();
const dayStart = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const dayEnd = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

function delta(current: number, prev: number): number | undefined {
  if (prev === 0) return undefined;
  return Math.round(((current - prev) / prev) * 1000) / 10;
}

/**
 * Build the full snapshot used by the MegaDashboard.
 *
 * @param range  Inclusive date range — `from` start-of-day to `to` end-of-day —
 *   defining the "primary" window for hero KPIs, live feed, geo, and footer
 *   KPIs. Defaults to `[today, today]`. Single-day filters use `from === to`.
 *
 *   The delta-comparison ("yesterday") window is the period of the same
 *   length immediately preceding `from`, so a 5-day range compares against
 *   the previous 5 days.
 *
 *   Rolling windows (7-day platform breakdown, 30-day top products) anchor
 *   their end at `to.endOfDay`, so they always cap at the displayed slice.
 */
export async function getMegaDashboardSnapshot(
  range?: { from: Date; to: Date },
): Promise<CommerceMegaDashboardSnapshot> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return emptySnapshot();

  const wallClock = new Date();
  const from = range?.from ?? wallClock;
  const to = range?.to ?? wallClock;
  // Normalise: from must not be after to.
  const [lo, hi] = from <= to ? [from, to] : [to, from];

  const todayStart = dayStart(lo);
  const todayEnd = dayEnd(hi);
  // Compare against the immediately-preceding window of the same length.
  const rangeDays = Math.max(1, Math.round((todayEnd.getTime() - todayStart.getTime()) / 86_400_000));
  const yEnd = new Date(todayStart.getTime() - 1);
  const yStart = new Date(yEnd.getTime() - (rangeDays * 86_400_000 - 1));
  // Used downstream for the 7-day and 30-day rolling windows.
  const now = hi;

  // 1) Today's orders + yesterday's orders for delta
  const [todayRes, yesterdayRes] = await Promise.all([
    supabase
      .from('commerce_orders')
      .select(
        'id, platform, external_order_number, total_amount, total_amount_eur, currency, item_count, customer_country, customer_country_name, customer_lat, customer_lng, dpp_linked_count, dpp_total_count, carbon_footprint_kg, placed_at, financial_status',
      )
      .eq('tenant_id', tenantId)
      .gte('placed_at', ISO_DATE(todayStart))
      .lte('placed_at', ISO_DATE(todayEnd))
      .order('placed_at', { ascending: false }),
    supabase
      .from('commerce_orders')
      .select('total_amount_eur, total_amount, dpp_linked_count')
      .eq('tenant_id', tenantId)
      .gte('placed_at', ISO_DATE(yStart))
      .lte('placed_at', ISO_DATE(yEnd)),
  ]);

  const today = (todayRes.data || []) as Array<{
    id: string; platform: CommercePlatform;
    external_order_number?: string;
    total_amount: number; total_amount_eur?: number;
    currency: string; item_count: number;
    customer_country?: string; customer_country_name?: string;
    customer_lat?: number; customer_lng?: number;
    dpp_linked_count: number; dpp_total_count: number;
    carbon_footprint_kg?: number; placed_at: string;
    financial_status?: string;
  }>;
  const yest = (yesterdayRes.data || []) as Array<{ total_amount_eur?: number; total_amount: number; dpp_linked_count: number }>;

  // KPI HERO
  const revenueToday = today.reduce((s, o) => s + (o.total_amount_eur ?? Number(o.total_amount ?? 0)), 0);
  const revenueYesterday = yest.reduce((s, o) => s + (o.total_amount_eur ?? Number(o.total_amount ?? 0)), 0);
  const ordersToday = today.length;
  const ordersYesterday = yest.length;
  const aov = ordersToday > 0 ? revenueToday / ordersToday : 0;
  const aovYest = ordersYesterday > 0 ? revenueYesterday / ordersYesterday : 0;

  // Conversion estimate placeholder: orders today / max(1, orders today + 100)
  // Real conversion needs sessions / pageviews from analytics — wire later.
  const conversionEstimate = ordersToday === 0 ? 0 : Math.min(100, (ordersToday / (ordersToday + 100)) * 100);
  const conversionYesterday = ordersYesterday === 0 ? 0 : Math.min(100, (ordersYesterday / (ordersYesterday + 100)) * 100);

  // KPI FOOTER
  const dppToday = today.reduce((s, o) => s + (o.dpp_linked_count || 0), 0);
  const dppYesterday = yest.reduce((s, o) => s + (o.dpp_linked_count || 0), 0);
  const carbonDelivered = today.reduce((s, o) => s + (o.carbon_footprint_kg || 0), 0);

  // Returns rate today (placeholder: count rh_returns vs total today)
  let returnsRatePct = 0;
  try {
    const { count: returnsCount } = await supabase
      .from('rh_returns')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', ISO_DATE(todayStart))
      .lte('created_at', ISO_DATE(todayEnd));
    returnsRatePct = ordersToday > 0 ? Math.round(((returnsCount || 0) / ordersToday) * 1000) / 10 : 0;
  } catch {
    /* ignore — table may not have row visibility on free tier */
  }

  // Average compliance score (placeholder: derived from latest ai_compliance_checks scores)
  let avgComplianceScore = 0;
  try {
    const { data: scores } = await supabase
      .from('ai_compliance_checks')
      .select('score')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);
    const arr = (scores || []).map((r) => Number(r.score)).filter((n) => !Number.isNaN(n));
    avgComplianceScore = arr.length > 0 ? Math.round((arr.reduce((s, n) => s + n, 0) / arr.length) * 10) / 10 : 0;
  } catch {
    /* ignore */
  }

  // 2) Live feed = last 12 today
  const liveFeed: CommerceLiveOrder[] = today.slice(0, 12).map((o) => ({
    id: o.id,
    platform: o.platform,
    externalOrderNumber: o.external_order_number,
    totalAmount: Number(o.total_amount),
    currency: o.currency,
    customerCountry: o.customer_country,
    customerCountryName: o.customer_country_name,
    itemCount: Number(o.item_count),
    dppLinked: (o.dpp_linked_count || 0) > 0,
    placedAt: o.placed_at,
  }));

  // 3) Geo points — group by country today
  const geoMap = new Map<string, CommerceGeoPoint>();
  for (const o of today) {
    if (!o.customer_country || o.customer_lat == null || o.customer_lng == null) continue;
    const k = o.customer_country;
    const existing = geoMap.get(k);
    if (existing) {
      existing.orders += 1;
      existing.revenue += Number(o.total_amount_eur ?? o.total_amount ?? 0);
    } else {
      geoMap.set(k, {
        country: k,
        countryName: o.customer_country_name || k,
        lat: Number(o.customer_lat),
        lng: Number(o.customer_lng),
        orders: 1,
        revenue: Number(o.total_amount_eur ?? o.total_amount ?? 0),
      });
    }
  }
  const geoPoints = Array.from(geoMap.values()).sort((a, b) => b.orders - a.orders);

  // 4) Platform breakdown — 7 days ending on the reference date
  const since = new Date(now);
  since.setDate(since.getDate() - 7);
  const { data: weekRows } = await supabase
    .from('commerce_orders')
    .select('platform, total_amount_eur, total_amount, placed_at')
    .eq('tenant_id', tenantId)
    .gte('placed_at', ISO_DATE(since))
    .lte('placed_at', ISO_DATE(todayEnd));

  const platformMap = new Map<CommercePlatform, CommercePlatformBreakdownEntry>();
  for (const p of ALL_COMMERCE_PLATFORMS) {
    platformMap.set(p, { platform: p, orders: 0, revenue: 0, sparkline: Array(7).fill(0) });
  }
  const referenceMs = now.getTime();
  for (const row of (weekRows || []) as Array<{ platform: CommercePlatform; total_amount_eur?: number; total_amount: number; placed_at: string }>) {
    const entry = platformMap.get(row.platform);
    if (!entry) continue;
    const amt = Number(row.total_amount_eur ?? row.total_amount ?? 0);
    entry.orders += 1;
    entry.revenue += amt;
    // Bucket index: day 6 is the reference date, day 0 is six days before it.
    const dayIdx = Math.max(0, 6 - Math.floor((referenceMs - new Date(row.placed_at).getTime()) / 86400000));
    entry.sparkline[dayIdx] += amt;
  }
  const platformBreakdown = Array.from(platformMap.values())
    .filter((e) => e.orders > 0 || e.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // 5) Top products — 30 days ending on the reference date
  const since30 = new Date(now);
  since30.setDate(since30.getDate() - 30);
  const { data: itemRows } = await supabase
    .from('commerce_order_items')
    .select(`
      product_id, gtin, sku, title, image_url, quantity, total_price,
      orders:commerce_orders!inner(tenant_id, placed_at, carbon_footprint_kg)
    `)
    .eq('tenant_id', tenantId)
    .gte('orders.placed_at', ISO_DATE(since30))
    .lte('orders.placed_at', ISO_DATE(todayEnd));

  const productMap = new Map<string, CommerceLeaderboardEntry>();
  for (const row of (itemRows || []) as Array<{
    product_id?: string; gtin?: string; sku?: string;
    title: string; image_url?: string;
    quantity: number; total_price: number;
  }>) {
    const key = row.product_id || row.gtin || row.sku || row.title;
    const existing = productMap.get(key);
    const revenue = Number(row.total_price ?? 0);
    const units = Number(row.quantity ?? 0);
    if (existing) {
      existing.unitsSold += units;
      existing.revenue += revenue;
    } else {
      productMap.set(key, {
        productId: row.product_id,
        title: row.title,
        imageUrl: row.image_url,
        unitsSold: units,
        revenue,
        hasDpp: Boolean(row.product_id),
        dppUrl: row.product_id ? `/products/${row.product_id}` : undefined,
      });
    }
  }
  const topProducts = Array.from(productMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return {
    generatedAt: now.toISOString(),
    hero: {
      revenueToday: kpi('Revenue Today', revenueToday, revenueYesterday, 'currency', 'EUR'),
      ordersToday: kpi('Orders Today', ordersToday, ordersYesterday, 'count'),
      averageOrderValue: kpi('Avg Order Value', aov, aovYest, 'currency', 'EUR'),
      conversionEstimate: kpi('Conversion (est.)', conversionEstimate, conversionYesterday, 'percent'),
    },
    footer: {
      dppActivationsToday: kpi('DPP Linked Today', dppToday, dppYesterday, 'count'),
      carbonDeliveredKg: kpi('Carbon Delivered', carbonDelivered, undefined, 'mass_kg'),
      returnsRatePct: kpi('Returns Rate', returnsRatePct, undefined, 'percent'),
      avgComplianceScore: kpi('Compliance Score', avgComplianceScore, undefined, 'percent'),
    },
    liveFeed,
    geoPoints,
    platformBreakdown,
    topProducts,
  };
}

function kpi(
  label: string,
  value: number,
  prev: number | undefined,
  kind: CommerceKpiBlock['kind'],
  currency?: string,
): CommerceKpiBlock {
  return {
    label,
    value: Math.round(value * 100) / 100,
    prevValue: prev,
    deltaPct: prev != null ? delta(value, prev) : undefined,
    currency,
    kind,
  };
}

function emptySnapshot(): CommerceMegaDashboardSnapshot {
  return {
    generatedAt: new Date().toISOString(),
    hero: {
      revenueToday: kpi('Revenue Today', 0, 0, 'currency', 'EUR'),
      ordersToday: kpi('Orders Today', 0, 0, 'count'),
      averageOrderValue: kpi('Avg Order Value', 0, 0, 'currency', 'EUR'),
      conversionEstimate: kpi('Conversion (est.)', 0, 0, 'percent'),
    },
    footer: {
      dppActivationsToday: kpi('DPP Linked Today', 0, 0, 'count'),
      carbonDeliveredKg: kpi('Carbon Delivered', 0, undefined, 'mass_kg'),
      returnsRatePct: kpi('Returns Rate', 0, undefined, 'percent'),
      avgComplianceScore: kpi('Compliance Score', 0, undefined, 'percent'),
    },
    liveFeed: [],
    geoPoints: [],
    platformBreakdown: [],
    topProducts: [],
  };
}

// ============================================
// SAMPLE DATA — for demo/empty-state seeding
// ============================================

/**
 * Generates believable sample orders so customers can preview the Mega Dashboard
 * before connecting any real channel. Inserts directly into commerce_orders and
 * commerce_order_items. Marks isTest=true so they can be filtered later.
 */
export async function seedSampleOrders(): Promise<{ insertedOrders: number; insertedItems: number }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const platforms: CommercePlatform[] = ['shopify', 'etsy', 'pinterest', 'amazon', 'ebay', 'woocommerce'];
  const cities: Array<[string, string, number, number]> = [
    ['DE', 'Germany', 51.1657, 10.4515],
    ['FR', 'France', 46.6034, 1.8883],
    ['ES', 'Spain', 40.4637, -3.7492],
    ['IT', 'Italy', 41.8719, 12.5674],
    ['NL', 'Netherlands', 52.1326, 5.2913],
    ['SE', 'Sweden', 60.1282, 18.6435],
    ['US', 'United States', 37.0902, -95.7129],
    ['GB', 'United Kingdom', 55.3781, -3.436],
    ['CH', 'Switzerland', 46.8182, 8.2275],
    ['AT', 'Austria', 47.5162, 14.5501],
  ];
  const sampleProducts = [
    { title: 'Eco Cotton Tee', sku: 'TEE-ECO-001', gtin: '4006381333931', image: null, price: 39.9, carbon: 4.2 },
    { title: 'Recycled Wool Beanie', sku: 'BEN-WOOL-007', gtin: '4006381333948', image: null, price: 24.5, carbon: 2.1 },
    { title: 'Hemp Cargo Trousers', sku: 'TRS-HMP-014', gtin: '4006381333955', image: null, price: 89.0, carbon: 7.4 },
    { title: 'Bamboo Hoodie Oat', sku: 'HOD-BAM-022', gtin: '4006381333962', image: null, price: 119.0, carbon: 9.1 },
    { title: 'Linen Shirt Sand', sku: 'SHT-LIN-031', gtin: '4006381333979', image: null, price: 79.0, carbon: 5.3 },
    { title: 'Organic Tote Bag', sku: 'TOT-ORG-040', gtin: '4006381333986', image: null, price: 19.0, carbon: 1.4 },
  ];

  const orders: Record<string, unknown>[] = [];
  const itemsPerOrder: Array<{ orderTempId: string; data: Record<string, unknown> }> = [];

  // Generate 30 orders spread over today + last 6 days
  for (let i = 0; i < 30; i++) {
    const dayOffset = Math.floor(Math.random() * 7);
    const placed = new Date();
    placed.setDate(placed.getDate() - dayOffset);
    placed.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const [country, countryName, lat, lng] = cities[Math.floor(Math.random() * cities.length)];
    const orderItems = Math.floor(Math.random() * 3) + 1;
    const tempId = `tmp-${i}`;

    let subtotal = 0;
    let totalCarbon = 0;
    const linkedDpp = Math.random() > 0.3 ? 1 : 0;
    for (let j = 0; j < orderItems; j++) {
      const p = sampleProducts[Math.floor(Math.random() * sampleProducts.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      const totalPrice = p.price * qty;
      subtotal += totalPrice;
      totalCarbon += p.carbon * qty;
      itemsPerOrder.push({
        orderTempId: tempId,
        data: {
          tenant_id: tenantId,
          title: p.title,
          sku: p.sku,
          gtin: p.gtin,
          quantity: qty,
          unit_price: p.price,
          total_price: totalPrice,
          match_method: linkedDpp ? 'gtin' : null,
          match_confidence: linkedDpp ? 0.99 : null,
          metadata: { sample: true },
        },
      });
    }
    const shipping = 4.95;
    const tax = subtotal * 0.19;

    orders.push({
      tenant_id: tenantId,
      platform,
      external_order_id: `SAMPLE-${platform}-${i}-${Date.now()}`,
      external_order_number: `#${1000 + i}`,
      currency: 'EUR',
      subtotal_amount: subtotal,
      shipping_amount: shipping,
      tax_amount: tax,
      discount_amount: 0,
      total_amount: subtotal + shipping + tax,
      total_amount_eur: subtotal + shipping + tax,
      customer_country: country,
      customer_country_name: countryName,
      customer_lat: lat + (Math.random() - 0.5) * 4,
      customer_lng: lng + (Math.random() - 0.5) * 4,
      financial_status: 'paid',
      fulfillment_status: ['unfulfilled', 'shipped', 'delivered'][Math.floor(Math.random() * 3)],
      order_status: 'open',
      is_test: true,
      item_count: orderItems,
      dpp_linked_count: linkedDpp,
      dpp_total_count: orderItems,
      carbon_footprint_kg: totalCarbon,
      placed_at: placed.toISOString(),
      paid_at: placed.toISOString(),
      synced_at: new Date().toISOString(),
      metadata: { sample: true, tempId },
    });
  }

  const { data: inserted, error } = await supabase
    .from('commerce_orders')
    .insert(orders)
    .select('id, metadata');

  if (error) throw new Error(`Failed to seed orders: ${error.message}`);

  // Map tempId → real id
  const idByTempId = new Map<string, string>();
  for (const row of inserted || []) {
    const meta = row.metadata as { tempId?: string };
    if (meta?.tempId) idByTempId.set(meta.tempId, row.id);
  }

  const itemRows = itemsPerOrder
    .map((it) => ({ ...it.data, order_id: idByTempId.get(it.orderTempId) }))
    .filter((it) => it.order_id);

  const { error: itemErr } = await supabase.from('commerce_order_items').insert(itemRows);
  if (itemErr) throw new Error(`Failed to seed items: ${itemErr.message}`);

  return { insertedOrders: orders.length, insertedItems: itemRows.length };
}

/** Removes all sample/test orders from the tenant so the dashboard reflects real data only. */
export async function clearSampleOrders(): Promise<{ removed: number }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { removed: 0 };

  const { count } = await supabase
    .from('commerce_orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_test', true);

  await supabase
    .from('commerce_orders')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('is_test', true);

  return { removed: count || 0 };
}
