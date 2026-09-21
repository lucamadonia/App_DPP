/**
 * commerce-etsy-sync Edge Function
 *
 * Pulls Etsy receipts into commerce_orders / commerce_order_items and links
 * each line to a Trackbliss product where SKU or GTIN matches.
 *
 * Modes
 * ──────────────────────────────────────────────────────────────
 *   incremental (default) — receipts created since last_incremental_sync_at
 *   full                  — everything Etsy will hand out, capped by MAX_PAGES
 *
 * Deployed WITH JWT verification: unlike the OAuth callback this is only ever
 * called by the authenticated app, and the caller's tenant must own the
 * connection.
 *
 * Required secrets: ETSY_CLIENT_ID, ETSY_CLIENT_SECRET,
 *                   OAUTH_TOKEN_ENCRYPTION_KEY
 */

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decryptCredentials } from '../_shared/commerce-crypto.ts';
import {
  etsyFetch, resolveShop, money, currencyOf, tsToIso, EtsyReauthRequired,
  type TokenHolder,
} from '../_shared/etsy.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const PAGE_SIZE = 100;          // Etsy's documented maximum for getShopReceipts
const MAX_PAGES = 25;           // 2 500 receipts per run, well inside 5 000/day
const PAGE_DELAY_MS = 250;      // stay under the 5 req/s personal-access ceiling

/** Etsy receipt status → the Commerce Hub's own vocabulary. */
function mapStatuses(receipt: any) {
  const status = String(receipt.status ?? '').toLowerCase();
  const paid = receipt.is_paid ?? receipt.was_paid ?? (status === 'paid' || status === 'completed');
  const shipped = receipt.is_shipped ?? receipt.was_shipped ?? false;

  let financial = paid ? 'paid' : 'pending';
  if (status === 'canceled' || status === 'cancelled') financial = 'voided';
  if (status === 'refunded') financial = 'refunded';
  if (status === 'partially_refunded') financial = 'partially_refunded';

  const orderStatus = status === 'canceled' || status === 'cancelled'
    ? 'cancelled'
    : (status === 'completed' ? 'closed' : 'open');

  return {
    financialStatus: financial,
    fulfillmentStatus: shipped ? 'shipped' : 'unfulfilled',
    orderStatus,
    paid,
    shipped,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData } = await userClient.auth.getUser();
    if (!authData.user) return json({ error: 'Invalid Authorization' }, 401);

    const { data: profile } = await supabase
      .from('profiles').select('tenant_id').eq('id', authData.user.id).single();
    if (!profile?.tenant_id) return json({ error: 'Tenant not found' }, 403);

    const { connectionId, mode = 'incremental' } = await req.json();
    if (!connectionId) return json({ error: 'connectionId is required' }, 400);

    const { data: conn } = await supabase
      .from('commerce_channel_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('tenant_id', profile.tenant_id)
      .single();
    if (!conn) return json({ error: 'Connection does not belong to this tenant' }, 403);
    if (conn.platform !== 'etsy') return json({ error: `Not an Etsy connection: ${conn.platform}` }, 400);

    return json(await runSync(supabase, conn, mode === 'full' ? 'full' : 'incremental'));
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});

async function runSync(supabase: any, conn: any, mode: 'full' | 'incremental') {
  const startedAt = Date.now();
  const tenantId = conn.tenant_id as string;

  const { data: credential } = await supabase
    .from('commerce_connection_credentials')
    .select('encrypted_payload').eq('connection_id', conn.id).single();
  if (!credential) {
    await markReauth(supabase, conn.id, 'No stored credentials');
    return { error: 'No credentials found — reconnect the channel', status: 'reauth_required' };
  }

  const holder: TokenHolder = {
    creds: await decryptCredentials(credential.encrypted_payload),
    supabase, connectionId: conn.id, tenantId,
  };

  const counters = { processed: 0, created: 0, updated: 0, failed: 0, linked: 0 };

  try {
    const shop = await resolveShop(holder);

    // Persist shop identity so the connection card stops showing a bare label.
    await supabase.from('commerce_channel_connections').update({
      account_external_id: shop.shopId,
      account_label: shop.shopName || conn.account_label,
      account_currency: shop.currency || conn.account_currency || 'EUR',
    }).eq('id', conn.id);

    // Etsy filters by creation time in unix seconds.  Re-read a day either side
    // of the last run so receipts edited right on the boundary are not skipped.
    const since = mode === 'incremental' && conn.last_incremental_sync_at
      ? Math.floor(new Date(conn.last_incremental_sync_at).getTime() / 1000) - 86_400
      : null;

    for (let page = 0; page < MAX_PAGES; page++) {
      const query: Record<string, string | number> = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      if (since) query.min_created = since;

      const batch = await etsyFetch(holder, `/shops/${shop.shopId}/receipts`, query);
      const receipts: any[] = Array.isArray(batch?.results) ? batch.results : [];
      if (receipts.length === 0) break;

      for (const receipt of receipts) {
        try {
          const outcome = await importReceipt(supabase, conn, tenantId, receipt, shop);
          counters.processed++;
          counters.linked += outcome.linked;
          if (outcome.created) counters.created++; else counters.updated++;
        } catch (e) {
          counters.failed++;
          console.error('receipt import failed', receipt?.receipt_id, e instanceof Error ? e.message : e);
        }
      }

      if (receipts.length < PAGE_SIZE) break;
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }

    const now = new Date().toISOString();
    await supabase.from('commerce_channel_connections').update({
      status: 'connected',
      last_incremental_sync_at: now,
      ...(mode === 'full' ? { last_full_sync_at: now } : {}),
      last_error_message: null,
      last_error_at: null,
    }).eq('id', conn.id);

    await logEvent(supabase, conn, tenantId, {
      event_type: 'sync_completed',
      severity: counters.failed > 0 ? 'warning' : 'success',
      title: `Etsy sync: ${counters.created} new, ${counters.updated} updated`,
      description: `${counters.linked} line items linked to a DPP` +
        (counters.failed ? ` — ${counters.failed} receipts failed` : ''),
      duration_ms: Date.now() - startedAt,
      items_processed: counters.processed,
      items_created: counters.created,
      items_updated: counters.updated,
      items_failed: counters.failed,
    });

    return { ok: true, mode, ...counters };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (err instanceof EtsyReauthRequired) {
      await markReauth(supabase, conn.id, message);
    } else {
      await supabase.from('commerce_channel_connections').update({
        status: 'error', last_error_message: message.slice(0, 500), last_error_at: new Date().toISOString(),
      }).eq('id', conn.id);
    }

    await logEvent(supabase, conn, tenantId, {
      event_type: 'sync_failed',
      severity: 'error',
      title: 'Etsy sync failed',
      description: message.slice(0, 500),
      duration_ms: Date.now() - startedAt,
      items_processed: counters.processed,
      items_created: counters.created,
      items_updated: counters.updated,
      items_failed: counters.failed,
    });

    return { error: message, ...(err instanceof EtsyReauthRequired ? { status: 'reauth_required' } : {}) };
  }
}

async function importReceipt(supabase: any, conn: any, tenantId: string, receipt: any, shop: { shopId: string }) {
  const transactions: any[] = Array.isArray(receipt.transactions) ? receipt.transactions : [];
  const currency = currencyOf(receipt.grandtotal ?? receipt.total_price, conn.account_currency || 'EUR');
  const { financialStatus, fulfillmentStatus, orderStatus, paid, shipped } = mapStatuses(receipt);

  const externalOrderId = String(receipt.receipt_id);
  const placedAt = tsToIso(receipt.create_timestamp ?? receipt.created_timestamp) ?? new Date().toISOString();
  const total = money(receipt.grandtotal ?? receipt.total_price);

  const { data: existing } = await supabase
    .from('commerce_orders')
    .select('id, metadata')
    .eq('tenant_id', tenantId).eq('platform', 'etsy').eq('external_order_id', externalOrderId)
    .maybeSingle();

  const orderPayload = {
    tenant_id: tenantId,
    connection_id: conn.id,
    platform: 'etsy',
    external_order_id: externalOrderId,
    external_order_number: externalOrderId,
    external_customer_id: receipt.buyer_user_id ? String(receipt.buyer_user_id) : null,
    external_url: `https://www.etsy.com/your/orders/sold?order_id=${externalOrderId}`,

    currency,
    subtotal_amount: money(receipt.subtotal),
    shipping_amount: money(receipt.total_shipping_cost),
    tax_amount: money(receipt.total_tax_cost) + money(receipt.total_vat_cost),
    discount_amount: money(receipt.discount_amt),
    total_amount: total,
    // Etsy settles in the shop currency; FX conversion is out of scope, so only
    // same-currency orders contribute to the cross-platform EUR aggregate.
    total_amount_eur: currency === 'EUR' ? total : null,

    customer_email: receipt.buyer_email || null,
    customer_name: receipt.name || null,
    customer_country: receipt.country_iso || null,
    customer_city: receipt.city || null,
    customer_postal_code: receipt.zip ? String(receipt.zip) : null,

    financial_status: financialStatus,
    fulfillment_status: fulfillmentStatus,
    order_status: orderStatus,
    is_test: false,
    item_count: transactions.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0),

    placed_at: placedAt,
    paid_at: paid ? (tsToIso(receipt.paid_timestamp) ?? placedAt) : null,
    fulfilled_at: shipped ? tsToIso(receipt.shipped_timestamp) : null,
    synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),

    raw_payload: receipt,
    metadata: { ...(existing?.metadata ?? {}), shopId: shop.shopId, etsyStatus: receipt.status ?? null },
  };

  const { data: order, error: orderError } = existing
    ? await supabase.from('commerce_orders').update(orderPayload).eq('id', existing.id).select('id').single()
    : await supabase.from('commerce_orders').insert(orderPayload).select('id').single();
  if (orderError) throw new Error(`order upsert failed: ${orderError.message}`);

  // Keep stable transaction IDs and manual assignments across every sync.
  const { data: previousItems, error: previousError } = await supabase
    .from('commerce_order_items').select('*').eq('order_id', order.id).eq('tenant_id', tenantId);
  if (previousError) throw new Error(previousError.message);
  const priorRows = (previousItems ?? []) as Array<{
    id: string; external_item_id: string | null; product_id: string | null;
    gtin: string | null; match_method: string | null; metadata: Record<string, unknown> | null;
  }>;
  const previousById = new Map(priorRows.map((i) => [i.external_item_id, i]));

  const skus = transactions.map((t) => t.sku).filter(Boolean).map(String);
  const productMap = await lookupProducts(supabase, tenantId, skus);

  let linked = 0;
  const items = transactions.map((t) => {
    const sku = t.sku ? String(t.sku) : null;
    const previous = previousById.get(String(t.transaction_id));
    const match = previous?.match_method === 'manual' && previous.product_id
      ? { id: previous.product_id, gtin: previous.gtin, matchedBy: 'manual' }
      : sku ? productMap.get(sku.toLowerCase()) : undefined;
    if (match) linked++;
    const unit = money(t.price);
    const qty = Number(t.quantity) || 1;
    return {
      tenant_id: tenantId,
      order_id: order.id,
      external_item_id: t.transaction_id ? String(t.transaction_id) : null,
      external_product_id: t.listing_id ? String(t.listing_id) : null,
      external_variant_id: t.product_id ? String(t.product_id) : null,
      title: t.title || 'Etsy item',
      variant_title: Array.isArray(t.variations) && t.variations.length
        ? t.variations.map((v: any) => v.formatted_value ?? v.value).filter(Boolean).join(' / ')
        : null,
      sku,
      gtin: match?.gtin ?? null,
      image_url: null,
      quantity: qty,
      unit_price: unit,
      total_price: unit * qty,
      product_id: match?.id ?? null,
      match_method: match ? match.matchedBy : null,
      match_confidence: match ? (match.matchedBy === 'manual' ? 1 : 0.99) : null,
      dpp_url: match ? `/products/${match.id}` : null,
      metadata: previous?.metadata ?? {},
    };
  });

  for (const item of items) {
    const previous = previousById.get(item.external_item_id);
    const { error: itemError } = previous
      ? await supabase.from('commerce_order_items').update(item).eq('id', previous.id).eq('tenant_id', tenantId)
      : await supabase.from('commerce_order_items').insert(item);
    if (itemError) throw new Error(`item write failed: ${itemError.message}`);
  }
  // Delete only transactions that Etsy actually removed, after successful writes.
  const currentIds = new Set(items.map((item) => item.external_item_id));
  const staleIds = priorRows.filter((item) => !currentIds.has(item.external_item_id)).map((item) => item.id);
  if (staleIds.length) {
    const { error } = await supabase.from('commerce_order_items').delete().in('id', staleIds).eq('tenant_id', tenantId);
    if (error) throw new Error(error.message);
  }

  await supabase.from('commerce_orders').update({
    dpp_linked_count: linked,
    dpp_total_count: items.length,
  }).eq('id', order.id);

  await createShipmentForOrder(supabase, tenantId, order.id, receipt, items);

  return { created: !existing, linked };
}

/** Fill missing positions on draft shipments using the same transaction as the UI. */
async function createShipmentForOrder(
  supabase: any, tenantId: string, orderId: string, receipt: any, items: any[],
) {
  const { financialStatus, shipped } = mapStatuses(receipt);
  if (financialStatus !== 'paid' || shipped || !items.length || items.some((i) => !i.product_id)) return;
  const { data: existing, error: lookupError } = await supabase.from('wh_shipments').select('id, status')
    .eq('tenant_id', tenantId).eq('order_reference', `Etsy ${receipt.receipt_id}`).maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existing && existing.status !== 'draft') {
    if (existing.status !== 'picking') return;
    const { count, error: countError } = await supabase.from('wh_shipment_items')
      .select('id', { count: 'exact', head: true }).eq('shipment_id', existing.id).eq('tenant_id', tenantId);
    if (countError) throw new Error(countError.message);
    if (count) return;
  }
  const { error } = await supabase.rpc('reconcile_etsy_shipment', { p_order_id: orderId, p_tenant_id: tenantId });
  if (error) throw new Error(`shipment reconciliation failed: ${error.message}`);
}

/**
 * Resolve Etsy's SKU string against a Trackbliss product.
 *
 * Etsy sends no GTIN on a transaction, and `products` carries no SKU column —
 * the only identifiers available are gtin and serial_number.  So whatever the
 * seller typed into Etsy's SKU field is matched against both; anything else
 * has to be assigned by hand in the Commerce Hub.
 */
async function lookupProducts(supabase: any, tenantId: string, skus: string[]) {
  const map = new Map<string, { id: string; gtin: string | null; matchedBy: 'gtin' | 'sku' }>();
  const unique = Array.from(new Set(skus.filter(Boolean)));
  if (unique.length === 0) return map;

  // Quote each value and drop embedded quotes — PostgREST `in.()` lists are
  // comma-separated and would otherwise break on a value containing , or ".
  const list = unique.map((s) => `"${s.replaceAll('"', '')}"`).join(',');
  const { data, error } = await supabase
    .from('products')
    .select('id, gtin, serial_number')
    .eq('tenant_id', tenantId)
    .or(`gtin.in.(${list}),serial_number.in.(${list})`);

  // A schema drift here used to fail silently and look like "no matches".
  if (error) throw new Error(`product lookup failed: ${error.message}`);

  for (const p of (data ?? []) as Array<{ id: string; gtin?: string; serial_number?: string }>) {
    if (p.gtin) map.set(p.gtin.toLowerCase(), { id: p.id, gtin: p.gtin, matchedBy: 'gtin' });
    if (p.serial_number && !map.has(p.serial_number.toLowerCase())) {
      map.set(p.serial_number.toLowerCase(), { id: p.id, gtin: p.gtin ?? null, matchedBy: 'sku' });
    }
  }
  return map;
}

async function markReauth(supabase: any, connectionId: string, message: string) {
  await supabase.from('commerce_channel_connections').update({
    status: 'reauth_required',
    last_error_message: message.slice(0, 500),
    last_error_at: new Date().toISOString(),
  }).eq('id', connectionId);
}

async function logEvent(supabase: any, conn: any, tenantId: string, event: Record<string, unknown>) {
  await supabase.from('commerce_sync_events').insert({
    tenant_id: tenantId, connection_id: conn.id, platform: 'etsy', ...event,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}
