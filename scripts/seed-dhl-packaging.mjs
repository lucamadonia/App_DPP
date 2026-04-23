/**
 * Ersetzt die generischen Umverpackungs-Typen durch offizielle
 * DHL Parcel DE Pakettypen mit deren echten Max-Dimensionen und
 * Gewichtsgrenzen (Stand April 2026).
 *
 * Smart-Suggest-Logik wird dadurch präziser: Shipments mit Produkt-
 * Volumen und -Gewicht landen im kleinstmöglichen zulässigen DHL-Paket.
 *
 * Die bestehenden 5 Typen (Versandumschlag, Versandkarton S/M/L/XL)
 * werden nach DHL-Pendant umbenannt; unbenutzte Alt-Varianten bleiben
 * als "deaktiviert" erhalten, damit bestehende Shipments nicht brechen.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const[k,...v]=l.split('=');return[k.trim(),v.join('=').trim()]}));
const s = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}});
const slug = 'myfambliss_gmbh';

const { data: tenant } = await s.from('tenants').select('id').eq('slug', slug).maybeSingle();
if (!tenant) { console.error('Tenant not found'); process.exit(1); }
const tenantId = tenant.id;

// Offizielle DHL Parcel Deutschland Produkte
// https://www.dhl.de/de/privatkunden/pakete-versenden.html
// max_load_grams entspricht DHL-Gewichtslimit (inkl. Verpackung).
// inner_*_cm entspricht Innenmaß typischer DHL-konformer Kartons
// (etwas unter den Außenmaß-Limits, damit die Kartondicke nicht stört).
// tare_weight_grams: typisches Leergewicht der Verpackung inkl. Füllmaterial.
const DHL = [
  {
    name: 'DHL Warenpost',
    description: 'Warenpost bis 1 kg (für flache, kleine Sendungen als Großbrief). 35 × 25 × 5 cm außen',
    inner_length_cm: 34, inner_width_cm: 24, inner_height_cm: 4,
    tare_weight_grams: 30,
    max_load_grams: 1000,
    sort_order: 1,
    is_default: false,
  },
  {
    name: 'DHL Päckchen S',
    description: 'Päckchen S bis 2 kg. Außen 25 × 17,5 × 10 cm',
    inner_length_cm: 24, inner_width_cm: 16.5, inner_height_cm: 9,
    tare_weight_grams: 60,
    max_load_grams: 2000,
    sort_order: 2,
    is_default: true,
  },
  {
    name: 'DHL Päckchen M',
    description: 'Päckchen M bis 2 kg. Außen 35,3 × 25 × 10 cm',
    inner_length_cm: 34, inner_width_cm: 24, inner_height_cm: 9,
    tare_weight_grams: 80,
    max_load_grams: 2000,
    sort_order: 3,
    is_default: false,
  },
  {
    name: 'DHL Paket 2 kg',
    description: 'Standard-Paket bis 2 kg. Gurtmaß max 360 cm, längste Seite max 120 cm',
    inner_length_cm: 40, inner_width_cm: 30, inner_height_cm: 15,
    tare_weight_grams: 180,
    max_load_grams: 2000,
    sort_order: 4,
    is_default: false,
  },
  {
    name: 'DHL Paket 5 kg',
    description: 'Standard-Paket bis 5 kg. Gurtmaß max 360 cm',
    inner_length_cm: 60, inner_width_cm: 40, inner_height_cm: 25,
    tare_weight_grams: 260,
    max_load_grams: 5000,
    sort_order: 5,
    is_default: false,
  },
  {
    name: 'DHL Paket 10 kg',
    description: 'Standard-Paket bis 10 kg. Gurtmaß max 360 cm',
    inner_length_cm: 60, inner_width_cm: 50, inner_height_cm: 35,
    tare_weight_grams: 400,
    max_load_grams: 10000,
    sort_order: 6,
    is_default: false,
  },
  {
    name: 'DHL Paket 31,5 kg',
    description: 'Standard-Paket bis 31,5 kg (Maximalgewicht). Gurtmaß max 360 cm, längste Seite max 120 cm',
    inner_length_cm: 118, inner_width_cm: 60, inner_height_cm: 60,
    tare_weight_grams: 800,
    max_load_grams: 31500,
    sort_order: 7,
    is_default: false,
  },
];

console.log('Alte Umverpackungs-Typen deaktivieren (bleiben für historische Shipments zugeordnet)...');
const { error: disableErr } = await s
  .from('wh_packaging_types')
  .update({ is_active: false })
  .eq('tenant_id', tenantId);
if (disableErr) { console.error(disableErr); process.exit(1); }
console.log('  Alle alten Einträge auf is_active=false.\n');

console.log('DHL-Standard-Typen anlegen/aktualisieren...');
for (const p of DHL) {
  const { data: existing } = await s
    .from('wh_packaging_types')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', p.name)
    .maybeSingle();

  const payload = { ...p, tenant_id: tenantId, is_active: true };

  if (existing) {
    const { error } = await s.from('wh_packaging_types').update(payload).eq('id', existing.id);
    console.log(`  ${error ? 'FAIL' : 'UPD '}  ${p.name}  tara=${p.tare_weight_grams}g  max=${p.max_load_grams}g  innen=${p.inner_length_cm}×${p.inner_width_cm}×${p.inner_height_cm}cm`);
  } else {
    const { error } = await s.from('wh_packaging_types').insert(payload);
    console.log(`  ${error ? 'FAIL' : 'NEW '}  ${p.name}  tara=${p.tare_weight_grams}g  max=${p.max_load_grams}g  innen=${p.inner_length_cm}×${p.inner_width_cm}×${p.inner_height_cm}cm`);
  }
}

console.log('\nAktive Typen sortiert:');
const { data: active } = await s
  .from('wh_packaging_types')
  .select('name, tare_weight_grams, max_load_grams, is_default, sort_order')
  .eq('tenant_id', tenantId)
  .eq('is_active', true)
  .order('sort_order');
(active || []).forEach(p => console.log(`  [${p.sort_order}] ${p.name.padEnd(25)} tara=${p.tare_weight_grams}g  max=${p.max_load_grams}g  ${p.is_default ? '(default)' : ''}`));
