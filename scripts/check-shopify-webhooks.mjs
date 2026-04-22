import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const slug = process.argv[2] || 'myfambliss_gmbh';

const { data: tenant } = await supabase.from('tenants').select('id, name, settings').eq('slug', slug).maybeSingle();
if (!tenant) { console.error('Tenant not found'); process.exit(1); }

const sh = tenant.settings?.shopifyIntegration;
if (!sh?.shopDomain || !sh?.accessToken) { console.error('Shopify not configured'); process.exit(1); }

const apiVer = sh.apiVersion || '2024-10';
const base = `https://${sh.shopDomain}/admin/api/${apiVer}`;

async function shopifyGet(path) {
  const res = await fetch(`${base}/${path}`, { headers: { 'X-Shopify-Access-Token': sh.accessToken } });
  if (!res.ok) throw new Error(`Shopify ${res.status} on ${path}: ${await res.text()}`);
  return res.json();
}

const DESIRED_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'orders/fulfilled',
  'orders/paid',
  'fulfillments/create',
  'fulfillments/update',
  'refunds/create',
  'customers/create',
  'customers/update',
  'inventory_levels/update',
  'app/uninstalled',
];

console.log(`Tenant: ${tenant.name}`);
console.log(`Shop:   ${sh.shopDomain}`);

const { webhooks } = await shopifyGet('webhooks.json?limit=250');
console.log(`\nRegistered webhooks: ${webhooks.length}`);
webhooks.forEach(w => {
  console.log(`  id=${w.id}  topic=${w.topic.padEnd(28)} address=${w.address}  created=${w.created_at}`);
});

const present = new Set(webhooks.map(w => w.topic));
console.log('\nDesired topics status:');
DESIRED_TOPICS.forEach(t => {
  console.log(`  ${present.has(t) ? 'OK  ' : 'MISS'} ${t}`);
});

const supabaseHost = new URL(env.VITE_SUPABASE_URL).host;
const expectedAddress = `https://${supabaseHost}/functions/v1/shopify-webhook`;
console.log(`\nExpected webhook address: ${expectedAddress}`);

const wrongAddress = webhooks.filter(w => DESIRED_TOPICS.includes(w.topic) && w.address !== expectedAddress);
if (wrongAddress.length > 0) {
  console.log('\nWebhooks pointing to WRONG address:');
  wrongAddress.forEach(w => console.log(`  ${w.topic} -> ${w.address}`));
}
