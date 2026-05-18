/**
 * One-off debug: dump current tracking state of a shipment + force a fresh
 * DHL tracking poll via the Edge Function.
 *
 * Usage: node scripts/debug-shipment-tracking.mjs <tracking-number>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotenv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.replace(/\r$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      let v = m[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      process.env[m[1]] = v;
    }
  }
}
loadDotenv();

const trackingNumber = process.argv[2];
if (!trackingNumber) {
  console.error('Usage: node scripts/debug-shipment-tracking.mjs <tracking-number>');
  process.exit(1);
}

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ACCESS_TOKEN  = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF   = process.env.SUPABASE_PROJECT_REF;

async function mgmtQuery(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) throw new Error(`mgmt query: ${res.status} ${await res.text()}`);
  return res.json();
}

// 1. Current DB state
const rows = await mgmtQuery(`
  SELECT
    id,
    shipment_number,
    status,
    carrier,
    tracking_number,
    shipped_at,
    delivered_at,
    tracking_polled_at,
    tracking_last_status,
    tracking_last_description,
    tracking_last_event_at,
    tracking_last_location,
    tracking_predicted_arrival_at,
    jsonb_array_length(COALESCE(tracking_history, '[]'::jsonb)) AS history_count
  FROM wh_shipments
  WHERE tracking_number = '${trackingNumber}'
`);
console.log('--- DB state ---');
console.log(JSON.stringify(rows, null, 2));

if (!Array.isArray(rows) || rows.length === 0) {
  console.error('No shipment row found for that tracking number.');
  process.exit(1);
}
const shipment = rows[0];

// 2. Hit the Edge Function in single-shipment mode to force a fresh poll
console.log('\n--- Forcing fresh DHL poll via Edge Function ---');
const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/dhl-shipping`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'track',
    shipmentId: shipment.id,
    trackingNumber,
    language: 'de',
  }),
});
const fnText = await fnRes.text();
console.log(`Status: ${fnRes.status}`);
console.log(fnText.slice(0, 4000));

// 3. Re-query state after poll
const after = await mgmtQuery(`
  SELECT
    status,
    delivered_at,
    tracking_polled_at,
    tracking_last_status,
    tracking_last_description,
    tracking_last_event_at,
    jsonb_array_length(COALESCE(tracking_history, '[]'::jsonb)) AS history_count
  FROM wh_shipments
  WHERE id = '${shipment.id}'
`);
console.log('\n--- DB state AFTER poll ---');
console.log(JSON.stringify(after, null, 2));
