// Dump all Trackbliss rh_email_templates for Fambliss tenant so the
// Phase-C migration script knows what to import into Family-Joy.
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
async function q(s){const r=await fetch(`https://api.supabase.com/v1/projects/${R}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${T}`,'Content-Type':'application/json'},body:JSON.stringify({query:s})});return r.json();}

const rows = await q(`
  SELECT
    event_type,
    category,
    name,
    subject_template,
    preview_text,
    LENGTH(COALESCE(html_template, '')) AS html_bytes,
    LENGTH(COALESCE(body_template, '')) AS body_bytes,
    enabled,
    sort_order
  FROM rh_email_templates
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
  ORDER BY sort_order, event_type
`);
console.log(JSON.stringify(rows, null, 2));
