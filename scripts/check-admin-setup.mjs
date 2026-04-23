/**
 * Diagnose-Script: prüft ob das Admin-v2-Setup vollständig ist.
 *
 * Checks:
 *   1. Migration applied (admin_audit_log table exists)
 *   2. Tenant cols present (health_score, status)
 *   3. Helper functions present
 *   4. admin-api Edge Function deployed
 *   5. pg_cron job scheduled
 *   6. Sample Tenant has a health score computed
 */
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const PROJECT_REF = env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!PROJECT_REF || !ACCESS_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing required env vars.');
  process.exit(1);
}

const MGMT = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const REST = `${SUPABASE_URL}/rest/v1`;
const H_MGMT = { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
const H_REST = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

async function runSql(sql) {
  const r = await fetch(`${MGMT}/database/query`, {
    method: 'POST', headers: H_MGMT, body: JSON.stringify({ query: sql }),
  });
  return r.json();
}

let pass = 0, fail = 0;
function check(label, ok, detail = '') {
  if (ok) { console.log(`  ✓ ${label}${detail ? ` (${detail})` : ''}`); pass++; }
  else { console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); fail++; }
}

console.log('\n=== Admin v2 Setup-Check ===\n');

// 1. Migration
console.log('1) Migration 20260424 Tabellen');
const tables = await runSql(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN (
    'admin_audit_log', 'admin_tenant_notes', 'admin_feature_flags', 'tenant_smtp_config'
  );
`);
const tableNames = (tables || []).map(r => r.table_name);
check('admin_audit_log', tableNames.includes('admin_audit_log'));
check('admin_tenant_notes', tableNames.includes('admin_tenant_notes'));
check('admin_feature_flags', tableNames.includes('admin_feature_flags'));
check('tenant_smtp_config', tableNames.includes('tenant_smtp_config'));

// 2. Tenant cols
console.log('\n2) tenants-Spalten');
const cols = await runSql(`
  SELECT column_name FROM information_schema.columns
  WHERE table_name='tenants' AND column_name IN (
    'status', 'health_score', 'subdomain', 'custom_domain', 'whitelabel_config'
  );
`);
const colNames = (cols || []).map(r => r.column_name);
['status','health_score','subdomain','custom_domain','whitelabel_config'].forEach(c =>
  check(`tenants.${c}`, colNames.includes(c))
);

// 3. Functions
console.log('\n3) Helper-Functions');
const funcs = await runSql(`
  SELECT routine_name FROM information_schema.routines
  WHERE routine_schema='public' AND routine_name IN (
    'compute_tenant_health','refresh_all_tenant_health','log_admin_action',
    'is_feature_enabled','resolve_tenant_by_host'
  );
`);
const funcNames = (funcs || []).map(r => r.routine_name);
['compute_tenant_health','refresh_all_tenant_health','log_admin_action','is_feature_enabled','resolve_tenant_by_host'].forEach(f =>
  check(f, funcNames.includes(f))
);

// 4. Edge Functions
console.log('\n4) Edge Functions');
const fnRes = await fetch(`${MGMT}/functions`, { headers: H_MGMT });
const fns = await fnRes.json();
const adminApi = fns.find(f => f.slug === 'admin-api');
check('admin-api deployed', !!adminApi, adminApi ? `v${adminApi.version}` : undefined);
const sendEmail = fns.find(f => f.slug === 'send-email');
check('send-email deployed', !!sendEmail, sendEmail ? `v${sendEmail.version}` : undefined);

// 5. pg_cron Job
console.log('\n5) pg_cron Jobs');
const jobs = await runSql(`
  SELECT jobname, schedule, active FROM cron.job
  WHERE jobname IN ('admin-health-refresh','crm-refresh-rfm','dhl-tracking-poll');
`);
const jobNames = (jobs || []).map(r => r.jobname);
check('admin-health-refresh', jobNames.includes('admin-health-refresh'),
  jobNames.includes('admin-health-refresh') ? 'aktiv' : 'fehlt — node scripts/setup-admin-cron.mjs');

// 6. Sample health
console.log('\n6) Sample Tenant Health');
const r = await fetch(`${REST}/tenants?select=id,name,status,health_score,health_updated_at&limit=3`, { headers: H_REST });
const ts = await r.json();
const withHealth = ts.filter(t => t.health_score != null);
check('mind. 1 Tenant mit health_score', withHealth.length > 0, `${withHealth.length}/${ts.length} berechnet`);

console.log(`\n=== ${pass} OK · ${fail} fehlen ===\n`);
if (fail > 0) {
  console.log('Um fehlende Teile zu beheben:');
  console.log('  - Tabellen fehlen → node scripts/db-migrate.mjs');
  console.log('  - pg_cron Job fehlt → node scripts/setup-admin-cron.mjs');
  console.log('  - Edge Function alt → npx supabase functions deploy admin-api --no-verify-jwt');
  console.log('  - health_score leer → SELECT refresh_all_tenant_health(); im Supabase SQL-Editor');
  process.exit(1);
}
console.log('Alles sauber ✓');
