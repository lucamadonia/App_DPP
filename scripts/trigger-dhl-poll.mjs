// Trigger the DHL bulk poll right now (don't wait for next 00/08/16 UTC).
// Re-runs the exact pg_cron command (which uses service_role JWT from vault).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadDotenv() {
  const p = path.resolve(__dirname, '..', '.env');
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
async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${R}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${T}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  return r.json();
}

const result = await q(`
  SELECT net.http_post(
    url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/dhl-shipping',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets
        WHERE name = 'service_role_jwt' LIMIT 1
      )
    ),
    body := '{"action":"poll_all_tenants_cron"}'::jsonb
  ) AS request_id
`);
console.log('Dispatched:', JSON.stringify(result, null, 2));
console.log('Polling for HTTP response (up to 60s)...');

const requestId = result?.[0]?.request_id;
if (!requestId) { console.error('No request id returned'); process.exit(1); }

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 2000));
  const rows = await q(`
    SELECT id, status_code, error_msg, LEFT(content::text, 1500) AS content, created
    FROM net._http_response
    WHERE id = ${requestId}
  `);
  if (Array.isArray(rows) && rows.length > 0) {
    console.log(`\n--- Response (after ${(i + 1) * 2}s) ---`);
    console.log(JSON.stringify(rows[0], null, 2));
    break;
  }
  process.stdout.write('.');
}
