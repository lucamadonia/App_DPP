import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadDotenv(p) {
  if (!existsSync(p)) return;
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotenv(resolve(__dirname, '..', '.env'));

const SHP = process.argv[2] || 'SHP-20260511-25007E';
const API = `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/database/query`;

async function sql(q) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q }),
  });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return t; }
}

const rows = await sql(`
  SELECT id, tenant_id, shipment_number, status, carrier, service_level,
         tracking_number, label_url, total_weight_grams, total_items,
         recipient_name, recipient_email, recipient_company,
         shipping_street, shipping_city, shipping_postal_code, shipping_country,
         carrier_label_data, created_at, updated_at
  FROM wh_shipments WHERE shipment_number = '${SHP}'`);
console.log('SHIPMENT:', JSON.stringify(rows, null, 2));

if (Array.isArray(rows) && rows[0]) {
  const tid = rows[0].tenant_id;
  const dhl = await sql(`
    SELECT id, name, settings->'warehouse'->'dhl' AS dhl_settings,
           settings->'warehouse'->'dhl'->>'enabled' AS dhl_enabled,
           settings->'warehouse'->'dhl'->>'sandbox' AS sandbox,
           settings->'warehouse'->'dhl'->>'billingNumber' AS billing_number,
           settings->'warehouse'->'dhl'->>'defaultProduct' AS default_product,
           (settings->'warehouse'->'dhl'->>'apiKey' IS NOT NULL AND settings->'warehouse'->'dhl'->>'apiKey' <> '') AS has_api_key,
           (settings->'warehouse'->'dhl'->>'username' IS NOT NULL AND settings->'warehouse'->'dhl'->>'username' <> '') AS has_username,
           (settings->'warehouse'->'dhl'->>'password' IS NOT NULL AND settings->'warehouse'->'dhl'->>'password' <> '') AS has_password,
           settings->'warehouse'->'dhl'->'shipper' AS shipper
    FROM tenants WHERE id = '${tid}'`);
  console.log('\nDHL CONFIG:', JSON.stringify(dhl, null, 2));

  const mods = await sql(`
    SELECT module_id, status, current_period_end
    FROM billing_module_subscriptions WHERE tenant_id = '${tid}' ORDER BY module_id`);
  console.log('\nMODULES:', JSON.stringify(mods, null, 2));

  const colInfo = await sql(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'wh_shipment_items' AND table_schema = 'public'`);
  console.log('\nITEM COLUMNS:', JSON.stringify(colInfo, null, 2));
}
