/**
 * Diagnose-Script: checkt ob SMTP-Konfiguration für send-email-Funktion steht.
 *
 * Prüft:
 *   1. Sind die Edge Functions send-email + auth-email-hook deployed?
 *   2. Sind die SMTP_* Secrets in Supabase gesetzt?
 *   3. Gibt es einen Database-Webhook auf rh_notifications → send-email?
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

const H = { Authorization: `Bearer ${ACCESS_TOKEN}` };

console.log('1) Edge Functions prüfen ...');
const fnRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, { headers: H });
if (!fnRes.ok) { console.error('   FEHLER:', fnRes.status, await fnRes.text()); process.exit(1); }
const fns = await fnRes.json();
const sendEmail = fns.find(f => f.slug === 'send-email');
const authHook = fns.find(f => f.slug === 'auth-email-hook');
console.log(`   send-email:      ${sendEmail ? `✓ deployed (v${sendEmail.version}, ${sendEmail.verify_jwt ? 'verify_jwt=true' : 'no-verify-jwt'})` : '✗ NICHT deployed'}`);
console.log(`   auth-email-hook: ${authHook ? `✓ deployed (v${authHook.version}, ${authHook.verify_jwt ? 'verify_jwt=true' : 'no-verify-jwt'})` : '✗ NICHT deployed'}`);

console.log('\n2) SMTP-Secrets prüfen ...');
const secRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, { headers: H });
if (!secRes.ok) { console.error('   FEHLER:', secRes.status, await secRes.text()); process.exit(1); }
const secrets = await secRes.json();
const need = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'];
for (const n of need) {
  const s = secrets.find(x => x.name === n);
  console.log(`   ${n.padEnd(12)} ${s ? '✓ gesetzt' : '✗ FEHLT'}${s?.value ? ` (${s.value.slice(0, 4)}...)` : ''}`);
}

console.log('\n3) Database-Webhook auf rh_notifications prüfen ...');
const hookQuery = `
  SELECT t.tgname AS trigger_name, pg_get_triggerdef(t.oid) AS definition
  FROM pg_trigger t
  WHERE tgrelid = 'public.rh_notifications'::regclass
    AND NOT tgisinternal;
`;
const hookRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: hookQuery }),
});
const hookRows = hookRes.ok ? await hookRes.json() : [];
if (Array.isArray(hookRows) && hookRows.length > 0) {
  console.log('   ✓ Trigger gefunden:');
  hookRows.forEach(r => console.log(`     - ${r.trigger_name}`));
} else {
  console.log('   ✗ Kein Database-Webhook → rh_notifications-Inserts werden NICHT automatisch an send-email gehen.');
  console.log('\n   Fix: Supabase Dashboard → Database → Webhooks → "Create a new hook"');
  console.log('        Name:   rh_notifications_to_send_email');
  console.log('        Table:  public.rh_notifications');
  console.log('        Events: Insert');
  console.log('        URL:    https://' + PROJECT_REF + '.supabase.co/functions/v1/send-email');
  console.log('        Method: POST');
  console.log('        Headers: Content-Type: application/json');
}

console.log('\nZusammenfassung:');
console.log(`  SMTP wird verwendet für noreply@trackbliss.eu (oder was in SMTP_FROM steht)`);
console.log(`  Versand-Flow: INSERT rh_notifications → Database-Webhook → send-email Edge Function → SMTP`);
console.log(`\n  Manueller Test (ohne UI): `);
console.log(`    curl -X POST https://${PROJECT_REF}.supabase.co/functions/v1/send-email \\`);
console.log(`      -H "Content-Type: application/json" \\`);
console.log(`      -d '{"record":{"id":"test-id","channel":"email","status":"pending","recipient_email":"dein@test.de","subject":"Test","content":"Hallo","metadata":{}}}'`);
