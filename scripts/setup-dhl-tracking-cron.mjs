/**
 * Einmalig ausführen: richtet pg_cron ein, das alle 8 Stunden die DHL-Tracking-
 * Polling-Action aufruft. Zugestellte Shipments werden ausgenommen.
 *
 * Voraussetzung: Supabase Dashboard → Database → Extensions → pg_cron + pg_net enabled
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
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!PROJECT_REF || !ACCESS_TOKEN || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars: SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
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

console.log('1) Extensions aktivieren ...');
const ext = await run(`
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;
`);
if (!ext.ok) {
  console.error('  FEHLER:', ext.text.slice(0, 400));
  console.error('\nBitte in Supabase Dashboard → Database → Extensions → pg_cron + pg_net manuell aktivieren und dann Script erneut ausführen.');
  process.exit(1);
}
console.log('  OK');

console.log('2) Alten Job dropen (falls vorhanden) ...');
await run(`
  DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname='dhl-tracking-poll') THEN
      PERFORM cron.unschedule('dhl-tracking-poll');
    END IF;
  END $$;
`);
console.log('  OK');

console.log('3) Neuen Schedule anlegen (alle 8 Stunden: 00:00, 08:00, 16:00 UTC) ...');
const escKey = SERVICE_ROLE_KEY.replace(/'/g, "''");
const schedule = await run(`
  SELECT cron.schedule(
    'dhl-tracking-poll',
    '0 0,8,16 * * *',
    $job$
    SELECT net.http_post(
      url := '${SUPABASE_URL}/functions/v1/dhl-shipping',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ${escKey}'
      ),
      body := '{"action":"poll_all_tenants_cron"}'::jsonb
    ) AS request_id;
    $job$
  );
`);
if (!schedule.ok) {
  console.error('  FEHLER:', schedule.text.slice(0, 400));
  process.exit(1);
}
console.log('  OK');

console.log('\n4) Aktuelle Cron-Jobs:');
const list = await run(`SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname='dhl-tracking-poll';`);
console.log('  ', list.text.slice(0, 400));

console.log('\nFertig. Nächster automatischer Lauf: 00:00, 08:00 oder 16:00 UTC.');
console.log('Manueller Sofort-Trigger (einmalig, für Test): node scripts/trigger-dhl-tracking-poll.mjs');
