/**
 * Manual Shopify order sync — emergency backfill.
 *
 * Replicates the bridgeOrderToCommerce logic from
 * supabase/functions/shopify-sync/index.ts so we can recover orders
 * without depending on the broken edge-function cron.
 *
 * What it does:
 *   1) Reads access_token + shopDomain from tenants.settings.shopifyIntegration
 *   2) GET /orders.json?status=any&created_at_min=… from Shopify Admin API
 *   3) Upserts commerce_orders (REAL total_price from Shopify, not item sum)
 *   4) Deletes + re-inserts commerce_order_items linked to the order
 *   5) Looks up shopify_product_map for DPP linkage
 *   6) Reports webhook health
 *
 * Idempotent — uses upsert on (tenant_id, platform, external_order_id).
 */
import { readFileSync } from 'fs';

const raw = readFileSync('.env', 'utf8');
const env = {};
raw.split(/\r?\n/).forEach(line => {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});

const SUPA_URL = env.VITE_SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = {
  apikey: SUPA_KEY,
  Authorization: `Bearer ${SUPA_KEY}`,
  'Content-Type': 'application/json',
};

async function db(method, path, body) {
  const res = await fetch(`${SUPA_URL}${path}`, {
    method,
    headers: { ...headers, Prefer: 'return=representation,resolution=merge-duplicates' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${txt}`);
  }
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

async function dbDelete(path) {
  const res = await fetch(`${SUPA_URL}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
}

const TENANT = '522f6254-f73c-4a26-b1e9-662035194bc5';
const SINCE = '2026-04-01T00:00:00Z';

// 1) Load Shopify creds
const tenantRow = await db('GET', `/rest/v1/tenants?select=settings&id=eq.${TENANT}`);
const integ = tenantRow[0].settings.shopifyIntegration;
const SHOP = integ.shopDomain;
const TOKEN = integ.accessToken;
const API_VERSION = integ.apiVersion || '2024-10';

console.log(`Shop: ${SHOP}, API: ${API_VERSION}`);

async function shopify(endpoint) {
  const res = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/${endpoint}`, {
    headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Shopify ${endpoint}: ${res.status} ${await res.text()}`);
  return res.json();
}

// 2) Webhook health check
console.log('\n=== Live webhooks at Shopify ===');
const wh = await shopify('webhooks.json');
for (const w of wh.webhooks || []) {
  console.log(`  ${w.topic.padEnd(28)} → ${w.address}`);
}
if (!wh.webhooks?.length) console.log('  (none registered)');

// 3) Fetch product map for DPP linkage
const productMap = await db('GET', `/rest/v1/shopify_product_map?select=*&tenant_id=eq.${TENANT}`);
const mapByVariant = new Map(productMap.map(m => [Number(m.shopify_variant_id), m]));
console.log(`\nProduct map: ${productMap.length} variants linked to DPPs`);

// 4) Fetch orders since SINCE
console.log(`\n=== Fetching Shopify orders since ${SINCE} ===`);
const orderResp = await shopify(`orders.json?status=any&created_at_min=${SINCE}&limit=250`);
const orders = orderResp.orders || [];
console.log(`Got ${orders.length} orders from Shopify`);

let bridged = 0;
let bridgedItems = 0;

for (const order of orders) {
  const addr = order.shipping_address || order.billing_address || {};
  const customerName = [addr.first_name, addr.last_name].filter(Boolean).join(' ')
    || [order.customer?.first_name, order.customer?.last_name].filter(Boolean).join(' ')
    || null;

  const itemCount = (order.line_items || []).reduce((s, li) => s + (li.quantity || 0), 0);

  let orderStatus = 'open';
  if (order.cancelled_at) orderStatus = 'cancelled';
  else if (order.closed_at) orderStatus = 'closed';

  const totalAmount = Number(order.total_price ?? order.current_total_price ?? 0);
  const currency = order.currency || 'EUR';

  const orderRow = {
    tenant_id: TENANT,
    platform: 'shopify',
    external_order_id: String(order.id),
    external_order_number: order.name || (order.order_number ? `#${order.order_number}` : null),
    external_customer_id: order.customer?.id ? String(order.customer.id) : null,
    external_url: order.order_status_url || null,
    currency,
    subtotal_amount: Number(order.subtotal_price ?? order.current_subtotal_price ?? 0),
    shipping_amount: Number(order.total_shipping_price_set?.shop_money?.amount ?? 0),
    tax_amount: Number(order.total_tax ?? order.current_total_tax ?? 0),
    discount_amount: Number(order.total_discounts ?? order.current_total_discounts ?? 0),
    total_amount: totalAmount,
    total_amount_eur: currency === 'EUR' ? totalAmount : null,
    customer_email: order.email || order.customer?.email || null,
    customer_name: customerName,
    customer_country: addr.country_code || null,
    customer_country_name: addr.country || null,
    customer_city: addr.city || null,
    customer_postal_code: addr.zip || null,
    financial_status: order.financial_status || null,
    fulfillment_status: order.fulfillment_status || 'unfulfilled',
    order_status: orderStatus,
    is_test: order.test === true,
    item_count: itemCount,
    placed_at: order.created_at || order.processed_at,
    paid_at: (order.financial_status === 'paid' && order.processed_at) ? order.processed_at : null,
    fulfilled_at: order.fulfilled_at || null,
    cancelled_at: order.cancelled_at || null,
    raw_payload: order,
    metadata: { source: 'manual_sync_2026-05-10' },
  };

  // Upsert via on_conflict on (tenant_id, platform, external_order_id)
  const upserted = await db(
    'POST',
    `/rest/v1/commerce_orders?on_conflict=tenant_id,platform,external_order_id`,
    orderRow,
  );
  const orderId = upserted[0].id;

  // Replace items
  await dbDelete(`/rest/v1/commerce_order_items?order_id=eq.${orderId}`);

  const items = [];
  let dppLinked = 0;
  for (const li of (order.line_items || [])) {
    const mapping = mapByVariant.get(Number(li.variant_id));
    const productId = mapping?.product_id || null;
    const batchId = mapping?.batch_id || null;
    if (productId) dppLinked += li.quantity || 0;

    items.push({
      tenant_id: TENANT,
      order_id: orderId,
      external_item_id: li.id ? String(li.id) : null,
      external_product_id: li.product_id ? String(li.product_id) : null,
      external_variant_id: li.variant_id ? String(li.variant_id) : null,
      title: li.title || li.name || 'Item',
      variant_title: li.variant_title || null,
      sku: li.sku || null,
      gtin: null,
      image_url: null,
      quantity: li.quantity || 1,
      unit_price: Number(li.price ?? 0),
      total_price: Number(li.price ?? 0) * (li.quantity || 1),
      product_id: productId,
      batch_id: batchId,
      match_method: mapping ? 'gtin' : null,
      match_confidence: mapping ? 1.0 : null,
    });
  }

  if (items.length > 0) {
    await db('POST', `/rest/v1/commerce_order_items`, items);
    bridgedItems += items.length;
  }

  // Patch DPP linkage
  await db('PATCH', `/rest/v1/commerce_orders?id=eq.${orderId}`, {
    dpp_linked_count: dppLinked,
    dpp_total_count: itemCount,
  });

  bridged++;
  console.log(`  ${order.name} ${order.created_at} ${currency} ${totalAmount.toFixed(2)} → ${dppLinked}/${itemCount} DPP-linked`);
}

console.log(`\n✓ Bridged ${bridged} orders, ${bridgedItems} items`);
console.log(`\nMega Dashboard wird beim nächsten 30s-Refresh aktuelle Zahlen zeigen.`);
