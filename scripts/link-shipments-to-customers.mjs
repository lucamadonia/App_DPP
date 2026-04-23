/**
 * Diagnose + Backfill: verknüpft wh_shipments.customer_id mit rh_customers.id
 * anhand übereinstimmender E-Mail-Adresse (case-insensitive, getrimmt).
 *
 * Lege fehlende rh_customers-Zeilen NICHT automatisch an — nur existierende
 * Kunden werden verlinkt. So hast du volle Kontrolle.
 *
 * Nutzung:
 *   node scripts/link-shipments-to-customers.mjs            # dry-run
 *   node scripts/link-shipments-to-customers.mjs --apply    # tatsächlich updaten
 *   node scripts/link-shipments-to-customers.mjs --apply --create-missing
 *     (erzeugt rh_customers-Zeile bei E-Mail ohne Match und verknüpft danach)
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
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');
const CREATE_MISSING = process.argv.includes('--create-missing');

async function rest(path, opts = {}) {
  const { headers: extraHeaders, ...rest } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...rest,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(extraHeaders || {}),
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

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}${CREATE_MISSING ? ' + CREATE-MISSING' : ''}`);
console.log('');

// 1) Alle Shipments mit E-Mail aber ohne customer_id holen
const orphans = await rest(`/wh_shipments?select=id,tenant_id,recipient_name,recipient_email,customer_id&customer_id=is.null&recipient_email=not.is.null&limit=10000`);
console.log(`1) ${orphans.length} Shipments ohne customer_id (aber mit E-Mail) gefunden\n`);

if (orphans.length === 0) {
  console.log('Nichts zu tun.');
  process.exit(0);
}

// 2) Gruppiere per tenant_id
const byTenant = new Map();
for (const s of orphans) {
  if (!byTenant.has(s.tenant_id)) byTenant.set(s.tenant_id, []);
  byTenant.get(s.tenant_id).push(s);
}

let linkedCount = 0;
let createdCount = 0;
let noMatchCount = 0;
const affectedCustomerIds = new Set();

for (const [tenantId, ships] of byTenant) {
  console.log(`\n=== Tenant ${tenantId} (${ships.length} Shipments) ===`);

  // 3) Alle rh_customers des Tenants laden
  const customers = await rest(`/rh_customers?select=id,email&tenant_id=eq.${tenantId}&email=not.is.null&limit=10000`);
  const byEmail = new Map();
  for (const c of customers) byEmail.set(c.email.toLowerCase().trim(), c);
  console.log(`   rh_customers (mit E-Mail): ${customers.length}`);

  // 4) Per Shipment: finde match oder erzeuge optional
  for (const s of ships) {
    const email = s.recipient_email.toLowerCase().trim();
    let customer = byEmail.get(email);

    if (!customer && CREATE_MISSING && APPLY) {
      const nameParts = (s.recipient_name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || null;
      const lastName = nameParts.slice(1).join(' ') || null;
      const created = await rest(`/rh_customers`, {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: tenantId,
          email: s.recipient_email.trim(),
          first_name: firstName || null,
          last_name: lastName,
        }),
      });
      customer = Array.isArray(created) ? created[0] : created;
      byEmail.set(email, customer);
      createdCount++;
      console.log(`   CREATED: rh_customer ${customer.id} (${email})`);
    }

    if (!customer) {
      noMatchCount++;
      console.log(`   NO MATCH: shipment ${s.id.slice(0, 8)} · ${email}`);
      continue;
    }

    if (APPLY) {
      await rest(`/wh_shipments?id=eq.${s.id}`, {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ customer_id: customer.id }),
      });
    }
    affectedCustomerIds.add(customer.id);
    linkedCount++;
    console.log(`   ${APPLY ? 'LINKED' : 'WOULD LINK'}: shipment ${s.id.slice(0, 8)} → customer ${customer.id.slice(0, 8)} (${email})`);
  }
}

console.log('\n============================================');
console.log(`Gesamt: ${linkedCount} verlinkt, ${createdCount} angelegt, ${noMatchCount} ohne Match`);
console.log('============================================');

if (APPLY && affectedCustomerIds.size > 0) {
  console.log(`\n5) Stats + RFM für ${affectedCustomerIds.size} betroffene Kunden neu berechnen ...`);
  for (const cid of affectedCustomerIds) {
    try { await rpc('refresh_customer_stats', { p_customer_id: cid }); }
    catch (e) { console.warn(`   refresh ${cid}: ${e.message}`); }
  }
  console.log('   Stats refreshed.');

  // alle Tenants der affected customers
  const affectedTenants = new Set();
  for (const tid of byTenant.keys()) affectedTenants.add(tid);
  for (const tid of affectedTenants) {
    try {
      const n = await rpc('compute_rfm_scores', { p_tenant_id: tid });
      console.log(`   Tenant ${tid.slice(0, 8)}: ${n} Kunden segmentiert`);
    } catch (e) { console.warn(`   rfm ${tid}: ${e.message}`); }
  }
}

if (!APPLY) {
  console.log('\nDry-Run beendet. Erneut mit --apply (optional --create-missing) ausführen, um zu übernehmen.');
}
