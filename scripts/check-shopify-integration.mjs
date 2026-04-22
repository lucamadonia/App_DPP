import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf8');
const getEnvVar = (key) => {
  const line = envContent.split(/\r?\n/).find(l => l.startsWith(`${key}=`));
  return line ? line.substring(key.length + 1).trim() : null;
};

const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const SUPABASE_SERVICE_KEY = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const p = (label, v) => console.log(label.padEnd(34), v);

console.log('\n=== 1) FamBliss Tenant ===');
const { data: tenants } = await supabase
  .from('tenants')
  .select('id, name, slug, settings, created_at')
  .or('slug.ilike.%fambliss%,name.ilike.%fambliss%');

if (!tenants || tenants.length === 0) {
  console.log('No FamBliss tenant found.');
  process.exit(0);
}

for (const t of tenants) {
  p('  Tenant ID:', t.id);
  p('  Name:', t.name);
  p('  Slug:', t.slug);
  const si = t.settings?.shopifyIntegration;
  if (!si) {
    p('  shopifyIntegration:', 'NOT CONFIGURED');
    continue;
  }
  p('  shopifyIntegration.enabled:', si.enabled);
  p('  shopDomain:', si.shopDomain);
  p('  shopName:', si.shopName);
  p('  apiVersion:', si.apiVersion);
  p('  accessToken present:', !!si.accessToken);
  p('  connectedAt:', si.connectedAt);
  console.log('  syncConfig:', JSON.stringify(si.syncConfig, null, 2).split('\n').map(l => '    ' + l).join('\n'));

  console.log(`\n=== 2) Product Mappings (tenant ${t.slug}) ===`);
  const { data: pm, count: pmCount } = await supabase
    .from('shopify_product_map')
    .select('shopify_product_title, shopify_variant_title, shopify_sku, shopify_barcode, product_id, batch_id, is_active, sync_direction, last_synced_at', { count: 'exact' })
    .eq('tenant_id', t.id)
    .order('created_at', { ascending: false });
  p('  Count:', pmCount ?? (pm?.length ?? 0));
  (pm || []).slice(0, 20).forEach((m, i) => {
    console.log(`  [${i + 1}] ${m.shopify_product_title} / ${m.shopify_variant_title}  SKU=${m.shopify_sku} barcode=${m.shopify_barcode}  →  product_id=${m.product_id}  batch=${m.batch_id ?? '—'}  dir=${m.sync_direction}  active=${m.is_active}`);
  });

  console.log(`\n=== 3) Location Mappings (tenant ${t.slug}) ===`);
  const { data: lm, count: lmCount } = await supabase
    .from('shopify_location_map')
    .select('shopify_location_id, shopify_location_name, location_id, sync_inventory, sync_orders, is_primary', { count: 'exact' })
    .eq('tenant_id', t.id);
  p('  Count:', lmCount ?? (lm?.length ?? 0));
  (lm || []).forEach((m, i) => {
    console.log(`  [${i + 1}] ${m.shopify_location_name} (${m.shopify_location_id})  →  ${m.location_id}  inv=${m.sync_inventory} orders=${m.sync_orders} primary=${m.is_primary}`);
  });

  console.log(`\n=== 4) Shopify Sync Log — last 15 (tenant ${t.slug}) ===`);
  const { data: sl } = await supabase
    .from('shopify_sync_log')
    .select('sync_type, direction, status, total_count, created_count, updated_count, skipped_count, failed_count, trigger_type, started_at, completed_at, errors')
    .eq('tenant_id', t.id)
    .order('started_at', { ascending: false })
    .limit(15);
  p('  Rows:', sl?.length ?? 0);
  (sl || []).forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.started_at?.slice(0, 19)}  ${r.sync_type}/${r.direction}  ${r.status}  created=${r.created_count} skipped=${r.skipped_count} failed=${r.failed_count}  trigger=${r.trigger_type}`);
    if (r.failed_count > 0 && r.errors) {
      const errs = typeof r.errors === 'string' ? r.errors : JSON.stringify(r.errors);
      console.log('       errors:', errs.slice(0, 240));
    }
  });

  console.log(`\n=== 5) Shipments from Shopify (wh_shipments where order_reference LIKE 'Shopify %') ===`);
  const { data: ships, count: shipCount } = await supabase
    .from('wh_shipments')
    .select('shipment_number, status, order_reference, recipient_name, shipping_country, total_items, created_at', { count: 'exact' })
    .eq('tenant_id', t.id)
    .ilike('order_reference', 'Shopify %')
    .order('created_at', { ascending: false })
    .limit(25);
  p('  Total Shopify shipments:', shipCount ?? 0);
  (ships || []).forEach((s, i) => {
    console.log(`  [${i + 1}] ${s.shipment_number}  ${s.order_reference}  ${s.status}  ${s.recipient_name}  ${s.shipping_country}  items=${s.total_items}  ${s.created_at?.slice(0, 10)}`);
  });

  console.log(`\n=== 6) Warehouse module subscription (for billing gate) ===`);
  const { data: subs } = await supabase
    .from('billing_module_subscriptions')
    .select('module_id, status, current_period_end')
    .eq('tenant_id', t.id);
  (subs || []).forEach(s => console.log(`   ${s.module_id}  ${s.status}  period_end=${s.current_period_end}`));

  console.log(`\n=== 7) Products in DPP (for context) ===`);
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', t.id);
  p('  products count:', productCount);

  const { count: batchCount } = await supabase
    .from('product_batches')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', t.id);
  p('  batches count:', batchCount);
}

console.log('\nDone.\n');
