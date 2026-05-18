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

// pg_net stores responses in net._http_response
console.log('--- last 10 net.http_response rows (recent edge function calls) ---');
console.log(JSON.stringify(await q(`
  SELECT id, status_code, content_type, LEFT(content, 600) AS content, error_msg, created
  FROM net._http_response
  WHERE created > NOW() - INTERVAL '24 hours'
  ORDER BY created DESC
  LIMIT 10
`), null, 2));
