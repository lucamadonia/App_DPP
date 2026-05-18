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
    method:'POST', headers:{Authorization:`Bearer ${T}`,'Content-Type':'application/json'},
    body:JSON.stringify({query:s})
  });
  return r.json();
}

console.log('--- Fambliss DHL settings ---');
console.log(JSON.stringify(await q(`
  SELECT
    id, name,
    settings->'warehouse'->'dhl'->>'enabled' AS dhl_enabled,
    LENGTH(settings->'warehouse'->'dhl'->>'apiKey') > 0 AS has_api_key,
    LEFT(settings->'warehouse'->'dhl'->>'apiKey', 8) AS apikey_prefix,
    settings->'warehouse'->'dhl'->>'sandbox' AS sandbox
  FROM tenants
  WHERE id = '522f6254-f73c-4a26-b1e9-662035194bc5'
`), null, 2));

console.log('\n--- DHL-eligible shipments (what cron filter would see) ---');
console.log(JSON.stringify(await q(`
  SELECT shipment_number, status, tracking_number, tracking_polled_at
  FROM wh_shipments
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
    AND carrier = 'DHL'
    AND tracking_number IS NOT NULL
    AND status IN ('shipped','label_created','in_transit')
  ORDER BY tracking_polled_at NULLS FIRST
  LIMIT 20
`), null, 2));
