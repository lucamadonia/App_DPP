/**
 * Backfillt wh_shipment_items.unit_price wo NULL:
 *   1) Zuerst aus products.retail_price (oder selling_price/price als Fallback)
 *      je nach Schema des Tenants
 *   2) Dann aus shopify_sync_log (falls der Shipment von Shopify kam, die
 *      Order enthält line-item-Preise im metadata.order)
 *
 * Triggert danach refresh_customer_stats + compute_rfm_scores neu, damit
 * CLV + Segmente korrekt werden.
 *
 * Nutzung:
 *   node scripts/backfill-shipment-item-prices.mjs          # dry-run
 *   node scripts/backfill-shipment-item-prices.mjs --apply  # tatsächlich speichern
 */
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');

async function rest(path, opts = {}) {
  const { headers: extra, ...rest } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...rest,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(extra || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  try { return JSON.parse(text); } catch { return text; }
}

async function rpc(fn, args) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${fn} ${res.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return text; }
}

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`);

// 1) Finde Items ohne unit_price (mit product_id)
const items = await rest(`/wh_shipment_items?select=id,shipment_id,product_id,batch_id,quantity,unit_price&unit_price=is.null&product_id=not.is.null&limit=5000`);
console.log(`1) ${items.length} Items ohne unit_price (aber mit product_id)`);

if (items.length === 0) {
  console.log('Nichts zu tun.');
  process.exit(0);
}

const productIds = Array.from(new Set(items.map(i => i.product_id)));
const batchIds = Array.from(new Set(items.map(i => i.batch_id).filter(Boolean)));
console.log(`2) ${productIds.length} Produkte, ${batchIds.length} Batches zum Nachschlagen`);

// 3) Erste Priorität: Batch-spezifischer Preis (product_batches.price_per_unit)
//    Zweite Priorität: ein aktiver Batch desselben Produkts (egal welcher)
const batchPriceById = new Map(); // batch_id → price
const productFallbackPrice = new Map(); // product_id → price (aus irgendeinem Batch)

if (batchIds.length > 0) {
  const chunks = [];
  for (let i = 0; i < batchIds.length; i += 100) chunks.push(batchIds.slice(i, i + 100));
  for (const c of chunks) {
    const rows = await rest(`/product_batches?select=id,product_id,price_per_unit&id=in.(${c.join(',')})`);
    for (const r of rows) {
      if (r.price_per_unit != null) batchPriceById.set(r.id, Number(r.price_per_unit));
    }
  }
  console.log(`   Batches mit Preis: ${batchPriceById.size}/${batchIds.length}`);
}

// Fallback: jedes beliebige Batch des Produkts mit Preis
const pchunks = [];
for (let i = 0; i < productIds.length; i += 100) pchunks.push(productIds.slice(i, i + 100));
for (const c of pchunks) {
  const rows = await rest(`/product_batches?select=product_id,price_per_unit&product_id=in.(${c.join(',')})&price_per_unit=not.is.null&order=created_at.desc`);
  for (const r of rows) {
    if (!productFallbackPrice.has(r.product_id)) productFallbackPrice.set(r.product_id, Number(r.price_per_unit));
  }
}
console.log(`   Produkte mit Batch-Fallback-Preis: ${productFallbackPrice.size}/${productIds.length}`);

// Merge: erstelle Lookup-Funktion pro Item
function resolvePrice(item) {
  if (item.batch_id && batchPriceById.has(item.batch_id)) return batchPriceById.get(item.batch_id);
  if (productFallbackPrice.has(item.product_id)) return productFallbackPrice.get(item.product_id);
  return null;
}

// 4) Patche die Items (und sammle betroffene Shipments für RFM-Refresh)
const affectedShipments = new Set();
const affectedCustomers = new Set();
let patchedCount = 0;
let noPriceCount = 0;

for (const item of items) {
  const price = resolvePrice(item);
  if (price == null || price <= 0) {
    noPriceCount++;
    continue;
  }

  if (APPLY) {
    await rest(`/wh_shipment_items?id=eq.${item.id}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ unit_price: price }),
    });
  }
  affectedShipments.add(item.shipment_id);
  patchedCount++;
}

console.log(`\n4) ${APPLY ? 'PATCHED' : 'WOULD PATCH'}: ${patchedCount} Items, ${noPriceCount} ohne Preis übersprungen`);

// 5) Betroffene Shipments → Customers mappen
if (APPLY && affectedShipments.size > 0) {
  const shipIds = Array.from(affectedShipments);
  const chunks = [];
  for (let i = 0; i < shipIds.length; i += 100) chunks.push(shipIds.slice(i, i + 100));
  for (const c of chunks) {
    const rows = await rest(`/wh_shipments?select=id,customer_id,tenant_id&id=in.(${c.join(',')})`);
    for (const r of rows) if (r.customer_id) affectedCustomers.add(r.customer_id);
  }
  console.log(`5) ${affectedCustomers.size} betroffene Kunden — refresh_customer_stats ...`);

  for (const cid of affectedCustomers) {
    try { await rpc('refresh_customer_stats', { p_customer_id: cid }); }
    catch (e) { console.warn(`   ! refresh ${cid.slice(0, 8)}: ${e.message}`); }
  }

  // Einzigartige Tenants für RFM-Recompute
  const tenantIds = new Set();
  for (const c of chunks) {
    const rows = await rest(`/wh_shipments?select=tenant_id&id=in.(${c.join(',')})`);
    for (const r of rows) tenantIds.add(r.tenant_id);
  }
  for (const tid of tenantIds) {
    try {
      const n = await rpc('compute_rfm_scores', { p_tenant_id: tid });
      console.log(`   Tenant ${tid.slice(0, 8)}: ${n} Kunden segmentiert`);
    } catch (e) { console.warn(`   ! rfm ${tid.slice(0, 8)}: ${e.message}`); }
  }
}

if (!APPLY) {
  console.log('\nDry-Run beendet. Erneut mit --apply ausführen, um zu übernehmen.');
}
