// Refresh ALL Fambliss product images from shop.fambliss.de.
// Overwrites the primary product_images row with the current Shopify
// featured-image URL. If no primary exists yet, inserts one.
//
// Use this when the Shopify product photography is updated and we want
// the trackbliss tracking page / app UI to reflect the new shot.
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
const TENANT_ID    = '522f6254-f73c-4a26-b1e9-662035194bc5';

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

// Resolved manually from a shop.fambliss.de search — these are the current
// "featured" images you'd see on the storefront. Update the URLs here when
// the shop photography changes and re-run.
const MAPPING = [
  // Affirmationskarten
  { productId: 'ee845d51-a26f-4bcf-9a4c-affc706c69e0',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/Bild_1_-_Komplettes_Set_mit_Original_Box_1.png?v=1778334816' },
  // BlissBoard / Magnetwand
  { productId: '86c396f1-3d9a-4dbc-b33d-bcfc4c09eb57',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/1778337957358.png?v=1778337988' },
  // Emotionskarten
  { productId: '051909c4-0aa4-4164-8fcf-a42841a30be9',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/FamBliss_Komplett_Set_DJI_Style_Korrigiert_1.png?v=1778330286' },
  // Gemeinsam Wachsen
  { productId: 'f769a776-5e55-4bc6-98a3-bf6a4a0d6a54',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/GEMEINSAM_WACHSEN_Komplett_Set_DJI_2.png?v=1778332468' },
  // Magnet Sheets (use Magnetwand visual)
  { productId: 'e87e65d0-e73a-407f-a050-da9201f875fc',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/1778337957358.png?v=1778337988' },
  // Magnetic Clock / Magnetuhr
  { productId: '31ac5b53-9ba6-4317-8c2c-7e88199869f0',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/Hero_Shot_Weiss_1.png?v=1778363743' },
  // Magnetische Routinenkarten
  { productId: '55129c9f-843d-4ed8-9756-9db06f6ebd81',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/FamBliss_Karten_Fliegend_Dynamisch.png?v=1778364154' },
  // Routinen Lichter — switched from 10_FloatingPucks to the cleaner product shot
  { productId: 'be10f071-7444-4f50-9cd8-f0d63ac2d9a7',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/Routine_Lichter_Deutsch.png?v=1772929555' },
  // Wochenplaner
  { productId: '3514845c-3ad6-4515-b001-a95df1d6534c',
    url: 'https://cdn.shopify.com/s/files/1/1053/4653/1677/files/Wochenplaner_Mutter_Kind_Deutsch.png?v=1772929556' },
];

for (const entry of MAPPING) {
  const existing = await sb('GET',
    `/product_images?product_id=eq.${entry.productId}&is_primary=eq.true&select=id,url`);

  if (existing.length === 0) {
    await sb('POST', '/product_images', {
      tenant_id: TENANT_ID,
      product_id: entry.productId,
      url: entry.url,
      storage_path: null,
      caption: null,
      sort_order: 0,
      is_primary: true,
    });
    console.log(`INSERT ${entry.productId.slice(0, 8)}… → ${entry.url.split('/').pop()?.slice(0, 60)}`);
  } else {
    // Always overwrite so the user can refresh visuals on demand.
    await sb('PATCH',
      `/product_images?id=eq.${existing[0].id}`,
      { url: entry.url, storage_path: null });
    console.log(`UPDATE ${entry.productId.slice(0, 8)}… → ${entry.url.split('/').pop()?.slice(0, 60)}`);
  }
}
console.log('\nDone — all Fambliss product images refreshed from Shopify.');
