/**
 * Seed the Shopify Set (bundle) definitions for MYFAMBLISS GmbH.
 *
 * Three "Set" products were created in Shopify on 2026-07-13. They are NOT
 * native Shopify bundles — Shopify sends them as a single line item with no
 * SKU, no barcode and no component information — so Trackbliss had no way to
 * turn them into pickable positions. This script records which Trackbliss
 * products (and which batch) each Set variant consists of, so the order import
 * can explode a Set into its individual, scannable positions.
 *
 * Compositions come from the Shopify product descriptions ("Im Set: …") and were
 * confirmed by the shop owner.
 *
 * Products are resolved by GTIN rather than by hardcoded UUID so the script
 * stays valid if products are recreated. Batch selection matters for the
 * Magnetwand only: it is ONE product with TWO batches (beige / rose) and the
 * correct one depends on the Set variant the customer picked.
 *
 * Usage:
 *   node scripts/seed-shopify-bundles.mjs           # dry run, prints the plan
 *   node scripts/seed-shopify-bundles.mjs --apply   # write to the database
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const APPLY = process.argv.includes('--apply');
const TENANT_SLUG = 'myfambliss_gmbh';

// --- Trackbliss products, keyed by GTIN -------------------------------------
const GTIN = {
  magnetwand:       '4269999010085',
  routinenkarten:   '4269999010061',
  lichter:          '4269999010139',
  wochenplaner:     '4269999010016',
  uhr:              '4269999010146',
  emotionskarten:   '4269999010179',
  affirmations:     '42699990101604',
  gemeinsamWachsen: '4269999010153',
};

// The Magnetwand batch is chosen by the Set's colour variant.
const MAGNETWAND_BATCH_SERIAL = {
  Beige: 'MU-BLISSBOARD-FLT-G1',
  Rosa:  'MU-BLISSBOARD-FLT-G1-ROSE',
};

// --- The three Sets ---------------------------------------------------------
// `magnetwand` is expanded per variant; every other component is colour-neutral.
const ROUTINE_SYSTEM  = ['magnetwand', 'routinenkarten', 'lichter'];
const FAMILIEN_SYSTEM = [...ROUTINE_SYSTEM, 'wochenplaner', 'uhr'];
const RUNDUM_SET      = [...FAMILIEN_SYSTEM, 'emotionskarten', 'affirmations', 'gemeinsamWachsen'];

const SETS = [
  {
    title: 'Das Routine-System — Komplett-Set (Magnetwand + Routinekarten + Lichter)',
    shopifyProductId: 16314077905245,
    components: ROUTINE_SYSTEM,
    variants: { Beige: 65245478420829, Rosa: 65245478453597 },
  },
  {
    title: 'Das Familien-System — Großes Set (Routine-System + Wochenplaner + Magnetuhr)',
    shopifyProductId: 16314078101853,
    components: FAMILIEN_SYSTEM,
    variants: { Beige: 65245478682973, Rosa: 65245478715741 },
  },
  {
    title: 'Das FamBliss Rundum-Set — Alles für Struktur & Gefühle',
    shopifyProductId: 16314078232925,
    components: RUNDUM_SET,
    variants: { Beige: 65245478879581, Rosa: 65245478912349 },
  },
];
// Note: the included FamBliss+ subscription is digital and deliberately NOT a
// position. "Magnet Sheets" belongs to no Set.

// --- Resolve products + batches --------------------------------------------
const { data: tenant } = await supabase
  .from('tenants').select('id, name').eq('slug', TENANT_SLUG).maybeSingle();
if (!tenant) { console.error(`Tenant '${TENANT_SLUG}' not found`); process.exit(1); }
console.log(`Tenant: ${tenant.name} (${tenant.id})\n`);

const { data: products } = await supabase
  .from('products').select('id, name, gtin').eq('tenant_id', tenant.id);
const byGtin = new Map((products || []).map(p => [String(p.gtin), p]));

const missing = Object.entries(GTIN).filter(([, g]) => !byGtin.has(g));
if (missing.length) {
  console.error('Products not found for GTIN(s):', missing.map(([k, g]) => `${k}=${g}`).join(', '));
  process.exit(1);
}

const { data: batches } = await supabase
  .from('product_batches').select('id, product_id, serial_number, status')
  .eq('tenant_id', tenant.id).eq('status', 'live');

/** Single live batch for a product; null when ambiguous (import falls back to FEFO). */
function soleBatch(productId) {
  const hits = (batches || []).filter(b => b.product_id === productId);
  return hits.length === 1 ? hits[0].id : null;
}
function batchBySerial(productId, serial) {
  return (batches || []).find(b => b.product_id === productId && b.serial_number === serial)?.id || null;
}

function resolveComponent(key, variantName) {
  const product = byGtin.get(GTIN[key]);
  const batchId = key === 'magnetwand'
    ? batchBySerial(product.id, MAGNETWAND_BATCH_SERIAL[variantName])
    : soleBatch(product.id);
  return { key, product, batchId };
}

// --- Build + write ----------------------------------------------------------
let bundlesWritten = 0;
let componentsWritten = 0;
let problems = 0;

for (const set of SETS) {
  for (const [variantName, variantId] of Object.entries(set.variants)) {
    const resolved = set.components.map(k => resolveComponent(k, variantName));

    console.log(set.title);
    console.log(`  Variante ${variantName} (${variantId}) — ${resolved.length} Komponenten`);
    for (const r of resolved) {
      const flag = r.batchId ? '' : '  [keine eindeutige Charge -> FEFO beim Import]';
      console.log(`    - ${r.product.name}${flag}`);
      if (!r.batchId) problems++;
    }

    if (!APPLY) { console.log(''); continue; }

    const { data: bundle, error: bErr } = await supabase
      .from('shopify_bundle_map')
      .upsert({
        tenant_id: tenant.id,
        shopify_product_id: set.shopifyProductId,
        shopify_variant_id: variantId,
        shopify_product_title: set.title,
        shopify_variant_title: variantName,
        is_active: true,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,shopify_variant_id' })
      .select('id')
      .single();

    if (bErr) { console.error(`    ! ${bErr.message}`); problems++; continue; }
    bundlesWritten++;

    // Replace the component list wholesale so re-running is idempotent.
    await supabase.from('shopify_bundle_components').delete().eq('bundle_id', bundle.id);

    const rows = resolved.map((r, i) => ({
      tenant_id: tenant.id,
      bundle_id: bundle.id,
      component_product_id: r.product.id,
      component_batch_id: r.batchId,
      quantity: 1,
      auto_batch: true,
      sort_order: i,
    }));
    const { error: cErr } = await supabase.from('shopify_bundle_components').insert(rows);
    if (cErr) { console.error(`    ! ${cErr.message}`); problems++; continue; }
    componentsWritten += rows.length;
    console.log('    -> gespeichert\n');
  }
}

console.log('---');
if (!APPLY) {
  console.log('DRY RUN - nichts geschrieben. Mit --apply ausfuehren.');
} else {
  console.log(`${bundlesWritten} Set-Varianten, ${componentsWritten} Komponentenzeilen geschrieben.`);
}
if (problems) console.log(`${problems} Hinweis(e) - siehe oben.`);
