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
// DHL responses: have 'delivered' / 'inTransit' / 'noChange' counters.
// Shopify has 'pagesCompleted', 'unmappedVariants'.
// Errors have content=null + error_msg set.
// Bind to cron history: only HTTP responses tied to jobid=5 (DHL cron).
// cron.job_run_details.start_time matches net._http_response.created within ~1s.
const rows = await q(`
  SELECT
    r.id,
    r.status_code,
    r.error_msg,
    LEFT(r.content::text, 700) AS content,
    r.created
  FROM net._http_response r
  WHERE r.created > NOW() - INTERVAL '5 days'
    AND EXTRACT(HOUR FROM r.created) IN (0, 8, 16)
    AND EXTRACT(MINUTE FROM r.created) < 5
  ORDER BY r.created DESC
`);
console.log(JSON.stringify(rows, null, 2));
