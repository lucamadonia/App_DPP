/**
 * Einmalig ausführen: richtet pg_cron ein, das täglich um 02:00 UTC
 * für alle Tenants mit rh_customers-Daten die RFM-Scores neu berechnet.
 *
 * Voraussetzung: Supabase Dashboard → Database → Extensions → pg_cron enabled
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
  console.error('Missing env vars: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN');
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

console.log('1) pg_cron Extension aktivieren ...');
const ext = await run(`CREATE EXTENSION IF NOT EXISTS pg_cron;`);
if (!ext.ok) {
  console.error('  FEHLER:', ext.text.slice(0, 400));
  console.error('\nBitte in Supabase Dashboard → Database → Extensions → pg_cron manuell aktivieren und dann Script erneut ausführen.');
  process.exit(1);
}
console.log('  OK');

console.log('2) Wrapper-Function anlegen ...');
const wrap = await run(`
  CREATE OR REPLACE FUNCTION crm_refresh_all_tenants() RETURNS INTEGER AS $fn$
  DECLARE
    t_id UUID;
    total INTEGER := 0;
    cnt INTEGER;
  BEGIN
    FOR t_id IN SELECT DISTINCT tenant_id FROM rh_customers LOOP
      BEGIN
        cnt := compute_rfm_scores(t_id);
        total := total + COALESCE(cnt, 0);
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'compute_rfm_scores failed for tenant %: %', t_id, SQLERRM;
      END;
    END LOOP;
    RETURN total;
  END;
  $fn$ LANGUAGE plpgsql;
`);
if (!wrap.ok) {
  console.error('  FEHLER:', wrap.text.slice(0, 400));
  process.exit(1);
}
console.log('  OK');

console.log('3) Alten Job dropen (falls vorhanden) ...');
await run(`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='crm-refresh-rfm') THEN
      PERFORM cron.unschedule('crm-refresh-rfm');
    END IF;
  END $$;
`);
console.log('  OK');

console.log('4) Neuen Schedule anlegen (täglich 02:00 UTC) ...');
const schedule = await run(`
  SELECT cron.schedule(
    'crm-refresh-rfm',
    '0 2 * * *',
    $job$ SELECT crm_refresh_all_tenants(); $job$
  );
`);
if (!schedule.ok) {
  console.error('  FEHLER:', schedule.text.slice(0, 400));
  process.exit(1);
}
console.log('  OK');

console.log('\n5) Aktuelle Cron-Jobs:');
const list = await run(`SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname='crm-refresh-rfm';`);
console.log('  ', list.text.slice(0, 400));

console.log('\nFertig. Nächster automatischer Lauf: heute/morgen 02:00 UTC.');
console.log('Manueller Sofort-Trigger: SELECT crm_refresh_all_tenants();');
