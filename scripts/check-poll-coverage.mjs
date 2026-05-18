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

console.log('--- Poll coverage by recency ---');
console.log(JSON.stringify(await q(`
  SELECT
    status,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE tracking_polled_at > NOW() - INTERVAL '24 hours') AS polled_24h,
    COUNT(*) FILTER (WHERE tracking_polled_at > NOW() - INTERVAL '48 hours') AS polled_48h,
    COUNT(*) FILTER (WHERE tracking_polled_at IS NULL) AS never_polled,
    MIN(tracking_polled_at) AS oldest_poll,
    MAX(tracking_polled_at) AS newest_poll
  FROM wh_shipments
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
    AND carrier = 'DHL'
    AND tracking_number IS NOT NULL
  GROUP BY status
  ORDER BY total DESC
`), null, 2));

console.log('\n--- Are any in_transit/shipped shipments stale? ---');
console.log(JSON.stringify(await q(`
  SELECT shipment_number, status, tracking_polled_at,
         NOW() - tracking_polled_at AS stale_for
  FROM wh_shipments
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
    AND carrier = 'DHL'
    AND tracking_number IS NOT NULL
    AND status IN ('shipped','label_created','in_transit')
    AND (tracking_polled_at IS NULL OR tracking_polled_at < NOW() - INTERVAL '12 hours')
  ORDER BY tracking_polled_at NULLS FIRST
  LIMIT 30
`), null, 2));
