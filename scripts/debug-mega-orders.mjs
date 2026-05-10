/**
 * Debug helper — inspect Shopify integration + webhook state for a tenant.
 *
 * Diagnoses the most common failure modes the Mega Dashboard surfaces when
 * orders aren't flowing in:
 *  1. Is the access token still valid? (calls /shop.json)
 *  2. What webhooks does Shopify think it should deliver?
 *  3. Does our local cache of registered webhooks match?
 *  4. Have any webhooks been arriving lately, and did they pass HMAC?
 *
 * Reads tenant credentials from `tenants.settings.shopifyIntegration` via the
 * service role key in `.env`. Edit `TENANT_ID` below to point at the tenant
 * you want to inspect. Output is plain text — pipe to `more` on Windows or
 * `less` on macOS/Linux for long results.
 */
import { readFileSync } from 'fs';

const raw = readFileSync('.env', 'utf8');
const env = {};
raw.split(/\r?\n/).forEach((line) => {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
});

// Edit this when debugging a different tenant.
const TENANT_ID = process.env.TENANT_ID || '522f6254-f73c-4a26-b1e9-662035194bc5';

const SUPA_URL = env.VITE_SUPABASE_URL;
const SUPA_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` };

async function db(path) {
  const res = await fetch(`${SUPA_URL}${path}`, { headers });
  return res.json();
}

const tenant = await db(`/rest/v1/tenants?select=name,settings&id=eq.${TENANT_ID}`);
if (!tenant?.[0]) {
  console.log(`No tenant found for id ${TENANT_ID}`);
  process.exit(1);
}
const integ = tenant[0].settings?.shopifyIntegration;
if (!integ?.accessToken) {
  console.log(`Tenant ${tenant[0].name}: no Shopify integration configured`);
  process.exit(0);
}

console.log(`Tenant: ${tenant[0].name}`);
console.log(`  shopDomain:       ${integ.shopDomain}`);
console.log(`  myshopifyDomain:  ${integ.myshopifyDomain || '(not stored — needed for webhook tenant resolution)'}`);
console.log(`  apiVersion:       ${integ.apiVersion}`);
console.log(`  tokenPrefix:      ${integ.accessToken.slice(0, 6)}…`);
console.log(`  cached webhooks:  ${integ.registeredWebhooks?.length || 0}`);

// 1) Live webhook subscriptions from Shopify
const wh = await fetch(`https://${integ.shopDomain}/admin/api/${integ.apiVersion}/webhooks.json?limit=250`, {
  headers: { 'X-Shopify-Access-Token': integ.accessToken },
});
const whData = await wh.json();
console.log('\n=== Webhook subscriptions at Shopify ===');
for (const w of whData.webhooks || []) {
  console.log(`  ${w.topic.padEnd(28)} → ${w.address}`);
}

// 2) Last 10 webhook events landed in our DB
console.log('\n=== shopify_webhook_events (last 10) ===');
const events = await db(
  `/rest/v1/shopify_webhook_events?select=topic,status,hmac_valid,last_error,received_at,shop_domain&tenant_id=eq.${TENANT_ID}&order=received_at.desc&limit=10`,
);
if (!Array.isArray(events)) {
  console.log('  (query failed — RLS or schema mismatch)');
} else {
  for (const e of events) {
    const flag = e.hmac_valid ? '✓hmac' : '✗hmac';
    console.log(
      `  ${e.received_at}  ${flag}  ${e.status.padEnd(10)}  shop=${(e.shop_domain || '?').padEnd(30)}  ${e.topic || '?'}  ${e.last_error || ''}`,
    );
  }
}

// 3) commerce_orders summary
console.log('\n=== commerce_orders (last 10) ===');
const orders = await db(
  `/rest/v1/commerce_orders?select=external_order_number,total_amount,currency,placed_at,metadata->>source&tenant_id=eq.${TENANT_ID}&order=placed_at.desc&limit=10`,
);
for (const o of orders || []) {
  console.log(
    `  ${o.placed_at}  ${(o.external_order_number || '?').padEnd(15)}  ${o.currency} ${Number(o.total_amount).toFixed(2).padStart(10)}  source=${o.source}`,
  );
}

// 4) Auto-sync state
console.log('\n=== commerce_channel_connections (shopify) ===');
const conn = await db(
  `/rest/v1/commerce_channel_connections?select=auto_sync_enabled,sync_interval_minutes,last_full_sync_at,last_incremental_sync_at,next_sync_after,last_error_message&tenant_id=eq.${TENANT_ID}&platform=eq.shopify`,
);
console.log(JSON.stringify(conn, null, 2));
