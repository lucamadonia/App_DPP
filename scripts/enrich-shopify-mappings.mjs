import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const slug = 'myfambliss_gmbh';

const { data: tenant } = await supabase.from('tenants').select('id, settings').eq('slug', slug).maybeSingle();
if (!tenant) { console.error('Tenant not found'); process.exit(1); }

const shopify = tenant.settings?.shopifyIntegration;
if (!shopify?.shopDomain || !shopify?.accessToken) { console.error('Shopify not configured'); process.exit(1); }

const apiVer = shopify.apiVersion || '2024-10';
const base = `https://${shopify.shopDomain}/admin/api/${apiVer}`;

async function shopifyGet(path) {
  const res = await fetch(`${base}/${path}`, { headers: { 'X-Shopify-Access-Token': shopify.accessToken } });
  if (!res.ok) throw new Error(`Shopify ${res.status} on ${path}: ${await res.text()}`);
  return { body: await res.json(), link: res.headers.get('link') };
}

function nextCursor(linkHeader) {
  if (!linkHeader) return null;
  const m = linkHeader.split(',').map(p => p.trim()).find(p => p.endsWith('rel="next"'));
  if (!m) return null;
  const urlMatch = m.match(/<([^>]+)>/);
  if (!urlMatch) return null;
  const u = new URL(urlMatch[1]);
  return u.searchParams.get('page_info');
}

console.log('Fetching all Shopify variants (paginated)...');
const variants = new Map();
let cursor = null;
let pages = 0;
do {
  const q = cursor ? `products.json?limit=250&page_info=${cursor}` : 'products.json?limit=250';
  const { body, link } = await shopifyGet(q);
  (body.products || []).forEach(p => {
    (p.variants || []).forEach(v => {
      variants.set(v.id, {
        variantId: v.id,
        productId: p.id,
        productTitle: p.title,
        variantTitle: v.title,
        sku: v.sku || null,
        barcode: v.barcode || null,
        inventoryItemId: v.inventory_item_id || null,
      });
    });
  });
  cursor = nextCursor(link);
  pages++;
} while (cursor);
console.log(`  ${variants.size} variants across ${pages} page(s)`);

console.log('\nUpdating shopify_product_map rows...');
const { data: maps } = await supabase
  .from('shopify_product_map')
  .select('id, shopify_variant_id, shopify_product_title, shopify_variant_title, shopify_sku, shopify_barcode, shopify_inventory_item_id')
  .eq('tenant_id', tenant.id);

let updated = 0, skipped = 0, missing = 0;
for (const m of (maps || [])) {
  const v = variants.get(m.shopify_variant_id);
  if (!v) { console.log(`  MISS  variant ${m.shopify_variant_id} (${m.shopify_product_title}) not in shop anymore`); missing++; continue; }
  const patch = {};
  if (v.sku && v.sku !== m.shopify_sku) patch.shopify_sku = v.sku;
  if (v.barcode && v.barcode !== m.shopify_barcode) patch.shopify_barcode = v.barcode;
  if (v.inventoryItemId && v.inventoryItemId !== m.shopify_inventory_item_id) patch.shopify_inventory_item_id = v.inventoryItemId;
  if (Object.keys(patch).length === 0) { skipped++; continue; }
  const { error } = await supabase.from('shopify_product_map').update(patch).eq('id', m.id);
  if (error) { console.log(`  FAIL  ${m.shopify_product_title}: ${error.message}`); continue; }
  console.log(`  OK    ${m.shopify_product_title} / ${m.shopify_variant_title}  sku=${v.sku ?? '-'}  barcode=${v.barcode ?? '-'}  inventory=${v.inventoryItemId ?? '-'}`);
  updated++;
}
console.log(`\n${updated} updated, ${skipped} unchanged, ${missing} variants missing in Shopify.`);
