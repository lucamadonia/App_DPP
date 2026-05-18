// One-off: pull featured image URLs from the live Shopify store for Fambliss
// products that are missing an image in our DB, then insert them into
// product_images as the primary gallery entry (does NOT overwrite existing
// primary images — the gallery system can still hold custom uploads).
//
// Matching strategy: lowercase, strip 'fambliss®', strip non-alphanum, then
// fuzzy substring match between our product name and Shopify title.
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
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
async function sb(method, p, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1${p}`, {
    method,
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${p}: ${r.status} ${await r.text()}`);
  return r.json();
}

// Explicit mapping by product UUID → Shopify featured-image URL.
// Done manually because the title fuzzy-match is brittle for German names
// ('Magnetuhr' vs 'Magnetic Clock', 'Magnetwand' vs 'BlissBoard'). Easier
// and safer to hard-code the 6 missing ones once.
const MAPPING = [
  {
    productId: 'ee845d51-a26f-4bcf-9a4c-affc706c69e0', // Affirmationskarten
    name: 'Fambliss® Affirmationskarten',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/Bild_1_-_Komplettes_Set_mit_Original_Box_1.png?v=1778334816',
  },
  {
    productId: '051909c4-0aa4-4164-8fcf-a42841a30be9', // Emotionskarten
    name: 'Fambliss® Emotionskarten',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/FamBliss_Komplett_Set_DJI_Style_Korrigiert_1.png?v=1778330286',
  },
  {
    productId: 'f769a776-5e55-4bc6-98a3-bf6a4a0d6a54', // Gemeinsam Wachsen
    name: 'Fambliss® Gemeinsam Wachsen',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/GEMEINSAM_WACHSEN_Komplett_Set_DJI_2.png?v=1778332468',
  },
  {
    productId: '55129c9f-843d-4ed8-9756-9db06f6ebd81', // Magnetische Routinenkarten
    name: 'Fambliss® Magnetische Routinenkarten',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/FamBliss_Karten_Fliegend_Dynamisch.png?v=1778364154',
  },
  {
    productId: '3514845c-3ad6-4515-b001-a95df1d6534c', // Wochenplaner
    name: 'Fambliss® Wochenplaner',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/Wochenplaner_Mutter_Kind_Deutsch.png?v=1772929556',
  },
  {
    productId: 'e87e65d0-e73a-407f-a050-da9201f875fc', // Magnet Sheets — closest visual is the Magnetwand product
    name: 'Fambliss® Magnet Sheets',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/1778337957358.png?v=1778337988',
  },
];

const TENANT_ID = '522f6254-f73c-4a26-b1e9-662035194bc5';

for (const entry of MAPPING) {
  // Skip if a primary image already exists — don't overwrite user uploads.
  const existing = await sb('GET',
    `/product_images?product_id=eq.${entry.productId}&is_primary=eq.true&select=id,url`);
  if (existing.length > 0) {
    console.log(`SKIP  ${entry.name} — already has primary image`);
    continue;
  }

  const row = {
    tenant_id: TENANT_ID,
    product_id: entry.productId,
    url: entry.url,
    storage_path: null, // external CDN — no Supabase storage path
    caption: null,
    sort_order: 0,
    is_primary: true,
  };
  await sb('POST', '/product_images', row);
  console.log(`OK    ${entry.name} → ${entry.url.slice(0, 80)}…`);
}
console.log('\nDone.');
