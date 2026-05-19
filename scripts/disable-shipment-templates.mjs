// Disable the 7 shipment lifecycle / engagement templates we seeded in
// Phase 1 — they stay in the DB but stop firing until Family-Joy becomes
// the central mail hub. Re-enable later by flipping enabled=true.
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

const events = [
  'shipment_packed', 'shipment_shipped', 'shipment_delivered',
  'engagement_day_1', 'engagement_day_7', 'engagement_day_14', 'engagement_day_30',
];
const inList = events.map(e => `'${e}'`).join(', ');
const result = await q(`
  UPDATE rh_email_templates
  SET enabled = false, updated_at = NOW()
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
    AND event_type IN (${inList})
  RETURNING event_type, enabled
`);
console.log('Disabled:', JSON.stringify(result, null, 2));
