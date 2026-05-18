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

console.log('--- products.image_url coverage (Fambliss) ---');
console.log(JSON.stringify(await q(`
  SELECT
    COUNT(*) AS total,
    COUNT(image_url) AS has_image_url,
    COUNT(*) FILTER (WHERE image_url IS NULL OR image_url = '') AS missing_image_url
  FROM products
  WHERE tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
`), null, 2));

console.log('\n--- product_images table coverage ---');
console.log(JSON.stringify(await q(`
  SELECT
    COUNT(DISTINCT product_id) AS products_with_gallery,
    COUNT(*) AS total_gallery_images,
    COUNT(*) FILTER (WHERE is_primary) AS primary_images
  FROM product_images pi
  JOIN products p ON p.id = pi.product_id
  WHERE p.tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
`), null, 2));

console.log('\n--- Sample Fambliss products with their image sources ---');
console.log(JSON.stringify(await q(`
  SELECT
    p.name,
    p.image_url IS NOT NULL AS has_direct_image,
    LEFT(p.image_url, 60) AS direct_image_preview,
    (SELECT COUNT(*) FROM product_images pi WHERE pi.product_id = p.id) AS gallery_count,
    (SELECT image_url FROM product_images pi WHERE pi.product_id = p.id AND is_primary LIMIT 1) AS primary_gallery_url
  FROM products p
  WHERE p.tenant_id = '522f6254-f73c-4a26-b1e9-662035194bc5'
  LIMIT 5
`), null, 2));
