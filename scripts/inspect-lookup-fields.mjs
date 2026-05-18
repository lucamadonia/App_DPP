// Show the columns the lookup_shipment_by_order_email RPC matches against
// for the Fambliss tenant so we can see why a customer test isn't finding
// their shipment (missing email, wrong order_reference format, etc.).
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
const T = process.env.SUPABASE_ACCESS_TOKEN, R = process.env.SUPABASE_PROJECT_REF;
async function q(s) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${R}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: s }),
  });
  return r.json();
}

console.log('--- Last 8 Fambliss shipments: lookup-relevant fields ---');
console.log(JSON.stringify(await q(`
  SELECT
    shipment_number,
    order_reference,
    shopify_order_id,
    status,
    LEFT(recipient_email, 40) AS email_preview,
    recipient_email IS NULL AS email_missing,
    tracking_token IS NOT NULL AS has_token,
    created_at
  FROM wh_shipments
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
  ORDER BY created_at DESC
  LIMIT 8
`), null, 2));

console.log('\n--- Aggregate sanity ---');
console.log(JSON.stringify(await q(`
  SELECT
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE recipient_email IS NULL OR recipient_email = '') AS no_email,
    COUNT(*) FILTER (WHERE tracking_token IS NULL) AS no_token,
    COUNT(*) FILTER (WHERE order_reference IS NULL) AS no_order_ref
  FROM wh_shipments
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
`), null, 2));
