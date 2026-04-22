/**
 * Seed 5 Standard-Karton-Größen für MYFAMBLISS als Startpunkt.
 * Kann danach im DPP UI unter /warehouse/packaging-types editiert werden.
 *
 * Größen entsprechen üblichen DHL-Paket-Klassen.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const[k,...v]=l.split('=');return[k.trim(),v.join('=').trim()]}));
const s = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth:{persistSession:false}});

const slug = 'myfambliss_gmbh';
const { data: tenant } = await s.from('tenants').select('id').eq('slug', slug).maybeSingle();
if (!tenant) { console.error('Tenant not found'); process.exit(1); }

const types = [
  { name: 'Briefumschlag', description: 'Für einzelne Kartensets', inner_length_cm: 23, inner_width_cm: 16, inner_height_cm: 2, tare_weight_grams: 20, max_load_grams: 500, sort_order: 1, is_default: false },
  { name: 'Karton S', description: '1-3 Kartensets', inner_length_cm: 25, inner_width_cm: 18, inner_height_cm: 8, tare_weight_grams: 80, max_load_grams: 2000, sort_order: 2, is_default: true },
  { name: 'Karton M', description: '1 Wochenplaner oder 1 Magnetuhr', inner_length_cm: 35, inner_width_cm: 25, inner_height_cm: 15, tare_weight_grams: 150, max_load_grams: 5000, sort_order: 3, is_default: false },
  { name: 'Karton L', description: '1 Magnetwand / Routinen-Lichter', inner_length_cm: 45, inner_width_cm: 35, inner_height_cm: 20, tare_weight_grams: 250, max_load_grams: 10000, sort_order: 4, is_default: false },
  { name: 'Karton XL', description: 'Mehrere große Artikel', inner_length_cm: 60, inner_width_cm: 45, inner_height_cm: 30, tare_weight_grams: 400, max_load_grams: 20000, sort_order: 5, is_default: false },
];

// Nur wenn tenant noch keine hat:
const { count } = await s.from('wh_packaging_types').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id);
if (count > 0) {
  console.log(`Tenant hat bereits ${count} Packaging-Typen — skip seed.`);
  process.exit(0);
}

for (const t of types) {
  const { error } = await s.from('wh_packaging_types').insert({ ...t, tenant_id: tenant.id });
  console.log(`  ${error ? 'FAIL' : 'OK'}  ${t.name}  tare=${t.tare_weight_grams}g  ${t.inner_length_cm}×${t.inner_width_cm}×${t.inner_height_cm}cm`);
}
console.log('\nPackaging-Seeds angelegt. Du kannst sie jetzt auf der neuen /warehouse/packaging-types Seite editieren oder im Shipment zuweisen.');
