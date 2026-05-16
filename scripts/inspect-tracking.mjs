import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadDotenv(p) {
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('=');
    if (i < 0) continue;
    const k = l.slice(0, i).trim();
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotenv(resolve(__dirname, '..', '.env'));

const API = `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`;
async function sql(q) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  return JSON.parse(await r.text());
}

// Show all label_created/shipped/in_transit shipments from the last 7 days
console.log('Recent DHL shipments (last 7 days):');
const recent = await sql(`
  SELECT shipment_number, status, tracking_number,
         tracking_last_status, tracking_last_description, tracking_last_event_at,
         tracking_polled_at, updated_at
  FROM wh_shipments
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
    AND carrier = 'DHL'
    AND tracking_number IS NOT NULL
    AND created_at > NOW() - INTERVAL '14 days'
  ORDER BY created_at DESC`);
console.log(JSON.stringify(recent, null, 2));

// Distinct statusCodes the poller has seen
const codes = await sql(`
  SELECT tracking_last_status, COUNT(*) AS n
  FROM wh_shipments
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
    AND tracking_last_status IS NOT NULL
  GROUP BY tracking_last_status ORDER BY n DESC`);
console.log('\nObserved status codes:', JSON.stringify(codes, null, 2));
