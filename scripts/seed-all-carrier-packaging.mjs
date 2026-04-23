/**
 * Ergänzt neben DHL alle gängigen deutschen Versanddienstleister-
 * Standardgrößen: Deutsche Post Briefprodukte, Hermes, DPD, GLS, UPS, FedEx.
 * Wird zusätzlich zu den DHL-Einträgen angelegt.
 *
 * Smart-Suggest wählt beim Shipment den kleinsten passenden Karton
 * unabhängig vom Carrier (basiert auf Volumen und max_load_grams).
 * Der gewählte Carrier im Shipment wird separat gesetzt.
 *
 * Alle Werte April 2026, können je nach Carrier-Update schwanken.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const[k,...v]=l.split('=');return[k.trim(),v.join('=').trim()]}));
const s = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}});

const { data: tenant } = await s.from('tenants').select('id').eq('slug', 'myfambliss_gmbh').maybeSingle();
const tenantId = tenant.id;

// Sort-order Range:
//   1-9: DHL (schon vergeben durch seed-dhl-packaging.mjs)
//  10-19: Deutsche Post Brief-Produkte
//  20-29: Hermes
//  30-39: DPD
//  40-49: GLS
//  50-59: UPS
//  60-69: FedEx
const CARRIERS = [
  // Deutsche Post (Brief- und Warensendungen)
  { name: 'DP Maxibrief', description: 'Deutsche Post Maxibrief bis 1 kg. Max 35,3 × 25 × 5 cm', inner_length_cm: 34, inner_width_cm: 24, inner_height_cm: 4, tare_weight_grams: 30, max_load_grams: 1000, sort_order: 10 },
  { name: 'DP Warensendung 500g', description: 'Deutsche Post Warensendung bis 500g. Max 35,3 × 25 × 5 cm', inner_length_cm: 34, inner_width_cm: 24, inner_height_cm: 4, tare_weight_grams: 25, max_load_grams: 500, sort_order: 11 },
  { name: 'DP Warensendung 1000g', description: 'Deutsche Post Warensendung bis 1 kg. Max 35,3 × 25 × 5 cm', inner_length_cm: 34, inner_width_cm: 24, inner_height_cm: 4, tare_weight_grams: 30, max_load_grams: 1000, sort_order: 12 },

  // Hermes
  { name: 'Hermes XS', description: 'Hermes Päckchen XS bis 1 kg. Max 35 × 25 × 10 cm', inner_length_cm: 34, inner_width_cm: 24, inner_height_cm: 9, tare_weight_grams: 60, max_load_grams: 1000, sort_order: 20 },
  { name: 'Hermes S', description: 'Hermes Paket S bis 2 kg. Max 35 × 25 × 15 cm', inner_length_cm: 34, inner_width_cm: 24, inner_height_cm: 14, tare_weight_grams: 90, max_load_grams: 2000, sort_order: 21 },
  { name: 'Hermes M', description: 'Hermes Paket M bis 5 kg. Max 50 × 30 × 20 cm', inner_length_cm: 49, inner_width_cm: 29, inner_height_cm: 19, tare_weight_grams: 200, max_load_grams: 5000, sort_order: 22 },
  { name: 'Hermes L', description: 'Hermes Paket L bis 10 kg. Max 60 × 50 × 40 cm', inner_length_cm: 59, inner_width_cm: 49, inner_height_cm: 39, tare_weight_grams: 350, max_load_grams: 10000, sort_order: 23 },
  { name: 'Hermes XL', description: 'Hermes Paket XL bis 25 kg. Gurtmaß max 360 cm', inner_length_cm: 118, inner_width_cm: 60, inner_height_cm: 60, tare_weight_grams: 600, max_load_grams: 25000, sort_order: 24 },

  // DPD
  { name: 'DPD Classic S', description: 'DPD Classic S bis 2 kg. Max 35 × 25 × 15 cm', inner_length_cm: 34, inner_width_cm: 24, inner_height_cm: 14, tare_weight_grams: 90, max_load_grams: 2000, sort_order: 30 },
  { name: 'DPD Classic M', description: 'DPD Classic M bis 10 kg. Max 60 × 40 × 25 cm', inner_length_cm: 59, inner_width_cm: 39, inner_height_cm: 24, tare_weight_grams: 260, max_load_grams: 10000, sort_order: 31 },
  { name: 'DPD Classic L', description: 'DPD Classic L bis 20 kg. Max 100 × 50 × 50 cm', inner_length_cm: 99, inner_width_cm: 49, inner_height_cm: 49, tare_weight_grams: 450, max_load_grams: 20000, sort_order: 32 },
  { name: 'DPD Classic XL', description: 'DPD Classic XL bis 31,5 kg. Gurtmaß max 300 cm', inner_length_cm: 118, inner_width_cm: 60, inner_height_cm: 60, tare_weight_grams: 700, max_load_grams: 31500, sort_order: 33 },

  // GLS
  { name: 'GLS Klein', description: 'GLS Parcel bis 2 kg. Max 40 × 30 × 20 cm', inner_length_cm: 39, inner_width_cm: 29, inner_height_cm: 19, tare_weight_grams: 120, max_load_grams: 2000, sort_order: 40 },
  { name: 'GLS Mittel', description: 'GLS Parcel bis 10 kg. Max 60 × 40 × 30 cm', inner_length_cm: 59, inner_width_cm: 39, inner_height_cm: 29, tare_weight_grams: 280, max_load_grams: 10000, sort_order: 41 },
  { name: 'GLS Gross', description: 'GLS Parcel bis 20 kg. Max 100 × 50 × 50 cm', inner_length_cm: 99, inner_width_cm: 49, inner_height_cm: 49, tare_weight_grams: 450, max_load_grams: 20000, sort_order: 42 },
  { name: 'GLS Max', description: 'GLS Parcel bis 31,5 kg. Max 200 × 80 × 80 cm', inner_length_cm: 118, inner_width_cm: 60, inner_height_cm: 60, tare_weight_grams: 650, max_load_grams: 31500, sort_order: 43 },

  // UPS
  { name: 'UPS Letter', description: 'UPS Express Letter bis 500g. Max 35 × 27 × 2,5 cm', inner_length_cm: 34, inner_width_cm: 26, inner_height_cm: 2, tare_weight_grams: 40, max_load_grams: 500, sort_order: 50 },
  { name: 'UPS Tube', description: 'UPS Express Tube für Rollen bis 2 kg. Max 97 × 15 × 15 cm (zylindrisch)', inner_length_cm: 96, inner_width_cm: 14, inner_height_cm: 14, tare_weight_grams: 140, max_load_grams: 2000, sort_order: 51 },
  { name: 'UPS Small Box', description: 'UPS Small Box bis 5 kg. Max 33 × 21 × 6,5 cm', inner_length_cm: 32, inner_width_cm: 20, inner_height_cm: 6, tare_weight_grams: 130, max_load_grams: 5000, sort_order: 52 },
  { name: 'UPS Medium Box', description: 'UPS Medium Box bis 10 kg. Max 42 × 32 × 15 cm', inner_length_cm: 41, inner_width_cm: 31, inner_height_cm: 14, tare_weight_grams: 280, max_load_grams: 10000, sort_order: 53 },
  { name: 'UPS Large Box', description: 'UPS Large Box bis 25 kg. Max 45 × 40 × 40 cm', inner_length_cm: 44, inner_width_cm: 39, inner_height_cm: 39, tare_weight_grams: 450, max_load_grams: 25000, sort_order: 54 },
  { name: 'UPS Standard bis 31,5 kg', description: 'UPS Standard-Paket. Gurtmaß max 419 cm', inner_length_cm: 120, inner_width_cm: 70, inner_height_cm: 70, tare_weight_grams: 700, max_load_grams: 31500, sort_order: 55 },

  // FedEx
  { name: 'FedEx Envelope', description: 'FedEx Express Envelope bis 500g. Max 32 × 25 × 1,5 cm', inner_length_cm: 31, inner_width_cm: 24, inner_height_cm: 1, tare_weight_grams: 35, max_load_grams: 500, sort_order: 60 },
  { name: 'FedEx Pak', description: 'FedEx Pak bis 2,5 kg. Max 38 × 28 × 5 cm', inner_length_cm: 37, inner_width_cm: 27, inner_height_cm: 4, tare_weight_grams: 60, max_load_grams: 2500, sort_order: 61 },
  { name: 'FedEx Small Box', description: 'FedEx Small Box bis 9 kg. Max 34 × 27 × 10 cm', inner_length_cm: 33, inner_width_cm: 26, inner_height_cm: 9, tare_weight_grams: 180, max_load_grams: 9000, sort_order: 62 },
  { name: 'FedEx Medium Box', description: 'FedEx Medium Box bis 9 kg. Max 33 × 28 × 15 cm', inner_length_cm: 32, inner_width_cm: 27, inner_height_cm: 14, tare_weight_grams: 240, max_load_grams: 9000, sort_order: 63 },
  { name: 'FedEx Large Box', description: 'FedEx Large Box bis 13 kg. Max 44 × 33 × 18 cm', inner_length_cm: 43, inner_width_cm: 32, inner_height_cm: 17, tare_weight_grams: 360, max_load_grams: 13000, sort_order: 64 },
  { name: 'FedEx Extra Large', description: 'FedEx Extra Large bis 30 kg. Gurtmaß max 330 cm', inner_length_cm: 118, inner_width_cm: 60, inner_height_cm: 60, tare_weight_grams: 650, max_load_grams: 30000, sort_order: 65 },
];

console.log(`Lege ${CARRIERS.length} zusätzliche Carrier-Standardgrößen an...`);
let created = 0, updated = 0, failed = 0;

for (const p of CARRIERS) {
  const { data: existing } = await s.from('wh_packaging_types')
    .select('id').eq('tenant_id', tenantId).eq('name', p.name).maybeSingle();
  const payload = { ...p, tenant_id: tenantId, is_active: true, is_default: false };
  if (existing) {
    const { error } = await s.from('wh_packaging_types').update(payload).eq('id', existing.id);
    if (error) { console.log(`  FAIL  ${p.name}: ${error.message}`); failed++; }
    else { console.log(`  UPD   ${p.name}`); updated++; }
  } else {
    const { error } = await s.from('wh_packaging_types').insert(payload);
    if (error) { console.log(`  FAIL  ${p.name}: ${error.message}`); failed++; }
    else { console.log(`  NEW   ${p.name.padEnd(30)} max=${p.max_load_grams}g  innen=${p.inner_length_cm}×${p.inner_width_cm}×${p.inner_height_cm}`); created++; }
  }
}

console.log(`\n${created} neu, ${updated} aktualisiert, ${failed} fehlgeschlagen.`);

const { count } = await s.from('wh_packaging_types').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('is_active', true);
console.log(`Aktive Packaging-Typen gesamt: ${count}`);
