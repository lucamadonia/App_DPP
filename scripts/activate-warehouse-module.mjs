import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const url = env.VITE_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env'); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false } });

const slug = 'myfambliss_gmbh';
const modules = ['warehouse_professional'];

const { data: tenant, error: tErr } = await supabase
  .from('tenants')
  .select('id, name, slug')
  .eq('slug', slug)
  .maybeSingle();

if (tErr || !tenant) {
  console.error(`Tenant '${slug}' not found:`, tErr?.message);
  process.exit(1);
}
console.log(`Tenant: ${tenant.name} (${tenant.id})`);

for (const moduleId of modules) {
  const { data, error } = await supabase
    .from('billing_module_subscriptions')
    .upsert(
      { tenant_id: tenant.id, module_id: moduleId, status: 'active', canceled_at: null },
      { onConflict: 'tenant_id,module_id' }
    )
    .select()
    .single();
  if (error) {
    console.error(`  FAIL  ${moduleId}: ${error.message}`);
  } else {
    console.log(`  OK    ${moduleId}  status=${data.status}  activated_at=${data.activated_at}`);
  }
}

const { data: subs } = await supabase
  .from('billing_module_subscriptions')
  .select('module_id, status, activated_at')
  .eq('tenant_id', tenant.id);

console.log('\nCurrent modules:');
(subs || []).forEach(s => console.log(`  ${s.module_id.padEnd(30)} ${s.status}  ${s.activated_at}`));
