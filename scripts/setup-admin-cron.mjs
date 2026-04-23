/**
 * Richtet pg_cron-Job ein, der täglich um 03:00 UTC alle
 * Tenant-Health-Scores neu berechnet.
 *
 * Voraussetzung: Supabase Dashboard → Database → Extensions → pg_cron enabled.
 */
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8')
    .split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const PROJECT_REF = env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = env.SUPABASE_ACCESS_TOKEN;
if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN');
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

async function run(sql) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

console.log('1) pg_cron Extension prüfen ...');
const ext = await run(`CREATE EXTENSION IF NOT EXISTS pg_cron;`);
if (!ext.ok) {
  console.error('  FEHLER:', ext.text.slice(0, 400));
  console.error('  Bitte in Supabase Dashboard aktivieren und Script neu starten.');
  process.exit(1);
}
console.log('  OK');

console.log('2) Alten Job dropen (falls vorhanden) ...');
await run(`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='admin-health-refresh') THEN
      PERFORM cron.unschedule('admin-health-refresh');
    END IF;
  END $$;
`);
console.log('  OK');

console.log('3) Neuen Schedule anlegen (täglich 03:00 UTC) ...');
const schedule = await run(`
  SELECT cron.schedule(
    'admin-health-refresh',
    '0 3 * * *',
    $job$ SELECT refresh_all_tenant_health(); $job$
  );
`);
if (!schedule.ok) {
  console.error('  FEHLER:', schedule.text.slice(0, 400));
  process.exit(1);
}
console.log('  OK');

console.log('\n4) Cron-Jobs Status:');
const list = await run(`SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname='admin-health-refresh';`);
console.log('  ', list.text.slice(0, 400));

console.log('\nFertig.');
console.log('  Nächster Lauf: heute/morgen 03:00 UTC');
console.log('  Manueller Sofort-Trigger (SQL): SELECT refresh_all_tenant_health();');
