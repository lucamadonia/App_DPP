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

const { data: tenant } = await supabase.from('tenants').select('id, name').eq('slug', slug).maybeSingle();
if (!tenant) { console.error('Tenant not found'); process.exit(1); }
console.log(`Tenant: ${tenant.name} (${tenant.id})\n`);

// Check which mappings still have batch_id=null
const { data: mappings } = await supabase
  .from('shopify_product_map')
  .select('id, shopify_product_title, shopify_variant_title, product_id, batch_id, auto_batch')
  .eq('tenant_id', tenant.id)
  .is('batch_id', null);

console.log(`Mappings without explicit batch_id: ${mappings?.length ?? 0}`);

// For each product, check if an active batch exists
const { data: productIds } = await supabase
  .from('shopify_product_map')
  .select('product_id')
  .eq('tenant_id', tenant.id);
const uniqueProducts = [...new Set((productIds || []).map(p => p.product_id))];

console.log(`\nActive-Batch-Verfügbarkeit pro Produkt:`);
const batchAvailability = new Map();
for (const pid of uniqueProducts) {
  const { data: batches } = await supabase
    .from('product_batches')
    .select('id, batch_number, status, expiry_date')
    .eq('tenant_id', tenant.id)
    .eq('product_id', pid)
    .eq('status', 'active');
  const { data: prod } = await supabase.from('products').select('name').eq('id', pid).maybeSingle();
  batchAvailability.set(pid, batches || []);
  const tag = (batches || []).length > 0 ? 'OK  ' : 'WARN';
  console.log(`  ${tag} ${prod?.name?.slice(0, 60).padEnd(60)}  active batches: ${(batches || []).length}`);
}

console.log(`\nAktiviere auto_batch=true für alle Mappings ohne batch_id …`);
const { data: updated, error } = await supabase
  .from('shopify_product_map')
  .update({ auto_batch: true })
  .eq('tenant_id', tenant.id)
  .is('batch_id', null)
  .select('id, shopify_product_title, shopify_variant_title, auto_batch');

if (error) { console.error('FAIL:', error.message); process.exit(1); }

console.log(`\nUpdated: ${updated?.length ?? 0} mappings`);
(updated || []).forEach((m, i) => {
  console.log(`  [${i + 1}] ${m.shopify_product_title} / ${m.shopify_variant_title}  auto_batch=${m.auto_batch}`);
});

const missing = uniqueProducts.filter(p => (batchAvailability.get(p) || []).length === 0);
if (missing.length > 0) {
  console.log(`\nWARNUNG: ${missing.length} Produkt(e) haben keine aktive Batch. Order-Import wird für die Shipments anlegen, aber ohne Stock-Reservation.`);
  for (const pid of missing) {
    const { data: prod } = await supabase.from('products').select('name').eq('id', pid).maybeSingle();
    console.log(`  - ${prod?.name}`);
  }
  console.log(`\n  Um das zu beheben: im DPP unter /warehouse/batches Batches für diese Produkte anlegen + Anfangsbestand buchen.`);
}
