import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const slug = 'myfambliss_gmbh';

const { data: tenant } = await supabase.from('tenants').select('id, name, settings').eq('slug', slug).maybeSingle();
if (!tenant) { console.error('Tenant not found'); process.exit(1); }

const settings = tenant.settings || {};
const shopify = settings.shopifyIntegration || {};
const sync = shopify.syncConfig || {};

const updated = {
  ...settings,
  shopifyIntegration: {
    ...shopify,
    syncConfig: {
      ...sync,
      importInventory: true,   // Webhook inventory_levels/update schreibt nach wh_stock_levels
      exportStockLevels: true, // Manuelle + auto-export-Pfade schreiben nach Shopify
    },
  },
};

const { error } = await supabase.from('tenants').update({ settings: updated }).eq('id', tenant.id);
if (error) { console.error('FAIL:', error.message); process.exit(1); }

console.log(`Tenant: ${tenant.name}`);
console.log('\nSync-Config nach Update:');
console.log(JSON.stringify(updated.shopifyIntegration.syncConfig, null, 2));
console.log('\nWirkung:');
console.log('  - Shopify inventory_levels/update Webhook schreibt jetzt in wh_stock_levels');
console.log('  - DPP-seitige Stock-Export-Aktionen sind erlaubt');
console.log('  - Source-of-Truth für laufenden Verkauf: Shopify (dekrementiert automatisch)');
console.log('  - DPP pusht bei manuellen Adjustments / Wareneingängen');
