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

console.log('--- product_images columns ---');
console.log(JSON.stringify(await q(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'product_images'
  ORDER BY ordinal_position
`), null, 2));

console.log('\n--- Sample product_images for Fambliss ---');
console.log(JSON.stringify(await q(`
  SELECT pi.*
  FROM product_images pi
  JOIN products p ON p.id = pi.product_id
  WHERE p.tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
  LIMIT 3
`), null, 2));
