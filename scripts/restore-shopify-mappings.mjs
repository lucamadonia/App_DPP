import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Restore-Script nach Disconnect/Reinstall:
//   - Alle 10 Product-Mappings neu anlegen (auto_batch=true, is_active=true)
//   - Location-Mapping für "Beim Steinernen Kreuz 19" wiederherstellen
// Voraussetzung: der NEUE shpat_-Token ist bereits in tenants.settings.shopifyIntegration eingetragen

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Bekannte Shopify-Variant-Title → DPP-Product-ID Matrix (aus früherer Einrichtung)
// Key-Format: "<ShopifyProductTitle>::<ShopifyVariantTitle>"
const TITLE_TO_PRODUCT = {
  'Magnetwand::rose':                             '86c396f1-3d9a-4dbc-b33d-bcfc4c09eb57',
  'Magnetwand::beige':                            '86c396f1-3d9a-4dbc-b33d-bcfc4c09eb57',
  'Magnetuhr::black':                             '31ac5b53-9ba6-4317-8c2c-7e88199869f0',
  'Magnetuhr::white':                             '31ac5b53-9ba6-4317-8c2c-7e88199869f0',
  'Magnetischer Wochenplaner::Default Title':     '3514845c-3ad6-4515-b001-a95df1d6534c',
  'Magnetische Routinen-Lichter::Default Title':  'be10f071-7444-4f50-9cd8-f0d63ac2d9a7',
  'Magnetische Routinekarten::Default Title':     '55129c9f-843d-4ed8-9756-9db06f6ebd81',
  'Gemeinsam Wachsen Karten::Default Title':      'f769a776-5e55-4bc6-98a3-bf6a4a0d6a54',
  'Emotionskarten::Default Title':                '051909c4-0aa4-4164-8fcf-a42841a30be9',
  'Affirmationskarten::Default Title':            'ee845d51-a26f-4bcf-9a4c-affc706c69e0',
};

// Bekannte Location-Daten
const LOCATION = {
  shopify_location_id: 120351326557,
  shopify_location_name: 'Beim Steinernen Kreuz 19',
  location_id: '231d4124-155d-404c-8324-33e52c8e62c6',
};

const { data: tenant } = await supabase
  .from('tenants').select('id, settings').eq('slug', 'myfambliss_gmbh').maybeSingle();
if (!tenant) { console.error('Tenant not found'); process.exit(1); }
const tenantId = tenant.id;
const sh = tenant.settings?.shopifyIntegration;
if (!sh?.shopDomain || !sh?.accessToken) { console.error('Shopify not connected — erst im DPP verbinden'); process.exit(1); }
if (!sh.accessToken.startsWith('shpat_')) {
  console.error(`FEHLER: Gespeicherter Token beginnt mit "${sh.accessToken.substring(0, 6)}", erwartet "shpat_".`);
  console.error('Das ist kein gültiger Shopify Admin-API-Access-Token. Bitte im DPP Connection-Tab den richtigen Token neu eintragen.');
  process.exit(1);
}
console.log(`Tenant: ${tenantId}`);
console.log(`Token-Prefix: ${sh.accessToken.substring(0, 12)}...  (OK)\n`);

// Test-Call um Token-Gültigkeit zu prüfen
const testRes = await fetch(`https://${sh.shopDomain}/admin/api/${sh.apiVersion || '2024-10'}/shop.json`,
  { headers: { 'X-Shopify-Access-Token': sh.accessToken } });
if (!testRes.ok) {
  console.error(`Shopify-API-Auth fehlgeschlagen: ${testRes.status} ${await testRes.text()}`);
  process.exit(1);
}
console.log('Shopify-API-Auth: OK\n');

// Variants aus Shopify laden
console.log('Fetching variants from Shopify …');
const prodRes = await fetch(`https://${sh.shopDomain}/admin/api/${sh.apiVersion || '2024-10'}/products.json?limit=250`,
  { headers: { 'X-Shopify-Access-Token': sh.accessToken } });
const { products } = await prodRes.json();
console.log(`  ${products.length} products found\n`);

// Mappings zusammenstellen
const mappings = [];
for (const p of products) {
  for (const v of (p.variants || [])) {
    const key = `${p.title}::${v.title}`;
    const productId = TITLE_TO_PRODUCT[key];
    if (!productId) continue;
    mappings.push({
      tenant_id: tenantId,
      shopify_product_id: p.id,
      shopify_variant_id: v.id,
      shopify_inventory_item_id: v.inventory_item_id,
      shopify_product_title: p.title,
      shopify_variant_title: v.title,
      shopify_sku: v.sku || null,
      shopify_barcode: v.barcode || null,
      product_id: productId,
      batch_id: null,
      auto_batch: true,
      sync_direction: 'both',
      is_active: true,
    });
  }
}

console.log(`Wiederhergestellte Mappings: ${mappings.length}\n`);
mappings.forEach((m, i) => {
  console.log(`  [${i + 1}] ${m.shopify_product_title} / ${m.shopify_variant_title}  → DPP product ${m.product_id.substring(0, 8)}`);
});

if (mappings.length !== Object.keys(TITLE_TO_PRODUCT).length) {
  console.warn(`\nACHTUNG: erwartet ${Object.keys(TITLE_TO_PRODUCT).length} Mappings, fand ${mappings.length}. Differenz prüfen.`);
}

// Insert Product-Mappings
console.log('\nInserting product mappings …');
const { error: pmErr } = await supabase.from('shopify_product_map').insert(mappings);
if (pmErr) { console.error('Product-mapping insert failed:', pmErr.message); process.exit(1); }
console.log(`  ${mappings.length} product mappings inserted.`);

// Insert Location-Mapping
console.log('\nInserting location mapping …');
const { error: lmErr } = await supabase.from('shopify_location_map').insert({
  tenant_id: tenantId,
  shopify_location_id: LOCATION.shopify_location_id,
  shopify_location_name: LOCATION.shopify_location_name,
  location_id: LOCATION.location_id,
  sync_inventory: true,
  sync_orders: true,
  is_primary: true,
});
if (lmErr) { console.error('Location-mapping insert failed:', lmErr.message); process.exit(1); }
console.log('  1 location mapping inserted (primary).');

console.log('\nFertig. Nächster Schritt: DPP UI → Webhook Setup → Register webhooks.');
