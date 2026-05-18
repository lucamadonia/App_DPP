/**
 * Reconcile a single shipment with DHL's current truth.
 *   - Fetches latest DHL tracking
 *   - Writes status, delivered_at, tracking_last_*, tracking_history, tracking_polled_at
 *
 * Usage: node scripts/sync-shipment-from-dhl.mjs <tracking-number>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotenv() {
  const p = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  for (const r of fs.readFileSync(p, 'utf8').split('\n')) {
    const l = r.replace(/\r$/, '').trim();
    if (!l || l.startsWith('#')) continue;
    const m = l.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
  }
}
loadDotenv();

const tn = process.argv[2];
if (!tn) { console.error('Usage: node scripts/sync-shipment-from-dhl.mjs <tracking-number>'); process.exit(1); }

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DHL_KEY      = process.env.DHL_API_KEY;
if (!SUPABASE_URL || !SERVICE_KEY || !DHL_KEY) {
  console.error('Missing env (need VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DHL_API_KEY)');
  process.exit(1);
}

async function sb(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// 1. Find ACTIVE (non-cancelled) shipment with this tracking number
const rows = await sb('GET',
  `/wh_shipments?tracking_number=eq.${tn}&status=neq.cancelled&select=id,shipment_number,status`);
if (rows.length === 0) { console.error('No active shipment for this tracking number'); process.exit(1); }
if (rows.length > 1) console.warn(`Warning: ${rows.length} active rows, updating all`);

// 2. Fetch DHL truth
const dhlRes = await fetch(
  `https://api-eu.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(tn)}&service=parcel-de&language=de`,
  { headers: { 'DHL-API-Key': DHL_KEY } },
);
if (!dhlRes.ok) { console.error(`DHL ${dhlRes.status}: ${await dhlRes.text()}`); process.exit(1); }
const dhl = await dhlRes.json();
const ship = dhl?.shipments?.[0];
if (!ship) { console.error('DHL has no record for this tracking number'); process.exit(1); }

const statusCode = ship.status?.statusCode || ship.status?.status;
const events     = ship.events || [];
const latest     = events[0] || ship.status || {};

const patch = {
  tracking_last_status:      statusCode || null,
  tracking_last_description: latest.description || latest.status || null,
  tracking_last_event_at:    latest.timestamp || null,
  tracking_last_location:    latest.location?.address?.addressLocality || null,
  tracking_polled_at:        new Date().toISOString(),
  tracking_history:          events,
};

if (statusCode === 'delivered') {
  patch.status       = 'delivered';
  patch.delivered_at = latest.timestamp || new Date().toISOString();
} else if (statusCode === 'transit' || statusCode === 'in_transit' || statusCode === 'out_for_delivery') {
  // Don't downgrade — only promote label_created/shipped to in_transit
  // (cancelled/draft/delivered are left alone)
}

console.log(`DHL says: ${statusCode}, ${events.length} events, latest @ ${latest.timestamp}`);
console.log(`Patch:`, JSON.stringify(patch, null, 2));

for (const row of rows) {
  console.log(`Updating ${row.shipment_number} (was: ${row.status})...`);
  await sb('PATCH', `/wh_shipments?id=eq.${row.id}`, patch);
}
console.log('Done.');
