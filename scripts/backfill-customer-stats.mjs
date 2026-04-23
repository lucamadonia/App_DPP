/**
 * Einmalig ausführen: berechnet für alle rh_customers eines Tenants
 * total_orders, total_spent, first/last_order_at, avg_order_value neu
 * und leitet anschließend RFM-Scores + Segmente ab.
 *
 * Nutzung:
 *   node scripts/backfill-customer-stats.mjs            # alle Tenants mit rh_customers-Daten
 *   node scripts/backfill-customer-stats.mjs <tenant>   # nur ein Tenant
 */
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const tenantArg = process.argv[2];

async function rest(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    ...opts,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status}: ${text.slice(0, 200)}`);
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

console.log('1) Tenants mit rh_customers ermitteln ...');
let tenants = [];
if (tenantArg) {
  tenants = [{ tenant_id: tenantArg }];
} else {
  const rows = await rest('/rh_customers?select=tenant_id&limit=10000');
  const set = new Set(rows.map(r => r.tenant_id));
  tenants = Array.from(set).map(t => ({ tenant_id: t }));
}
console.log(`   → ${tenants.length} Tenant(s)`);

let totalCustomers = 0;
let totalWithOrders = 0;
let segmentsAssigned = 0;

for (const { tenant_id } of tenants) {
  console.log(`\n2) Tenant ${tenant_id}`);
  const customers = await rest(`/rh_customers?select=id&tenant_id=eq.${tenant_id}&limit=10000`);
  console.log(`   Kunden: ${customers.length}`);
  totalCustomers += customers.length;

  let i = 0;
  for (const c of customers) {
    try {
      await rpc('refresh_customer_stats', { p_customer_id: c.id });
    } catch (e) {
      console.warn(`   ! refresh_customer_stats fail für ${c.id}: ${e.message}`);
    }
    i++;
    if (i % 50 === 0) process.stdout.write(`     ${i}/${customers.length}\r`);
  }
  console.log(`   Stats: ${i} refreshed`);

  // mit Bestellungen zählen
  const withOrders = await rest(`/rh_customers?select=id&tenant_id=eq.${tenant_id}&total_orders=gt.0&limit=10000`);
  totalWithOrders += withOrders.length;
  console.log(`   Mit Bestellungen: ${withOrders.length}`);

  // RFM-Scores berechnen
  try {
    const n = await rpc('compute_rfm_scores', { p_tenant_id: tenant_id });
    segmentsAssigned += (typeof n === 'number' ? n : 0);
    console.log(`   RFM-Segmente: ${n} Kunden segmentiert`);
  } catch (e) {
    console.warn(`   ! compute_rfm_scores fail: ${e.message}`);
  }
}

console.log('\n============================================');
console.log(`Fertig. ${totalCustomers} Kunden gesamt, ${totalWithOrders} mit Bestellungen, ${segmentsAssigned} segmentiert.`);
console.log('============================================');
