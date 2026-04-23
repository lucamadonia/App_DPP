/**
 * Interaktive Anleitung + Verification für Vercel-Auto-Provisioning.
 *
 * Stellt sicher dass VERCEL_API_TOKEN + VERCEL_PROJECT_ID (+ optional
 * VERCEL_TEAM_ID) als Supabase-Secrets gesetzt sind, testet die API
 * und zeigt welche Domains aktuell im Projekt registriert sind.
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
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN in .env');
  process.exit(1);
}

const VERCEL_API_TOKEN = env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = env.VERCEL_TEAM_ID;

console.log('\n=== Vercel-Integration Setup ===\n');

if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
  console.log('Status: ✗ nicht konfiguriert\n');
  console.log('Zum Aktivieren:\n');
  console.log('  1. Vercel-API-Token erstellen:');
  console.log('     https://vercel.com/account/tokens');
  console.log('     Scope: Full Account (oder spezifisches Team)\n');
  console.log('  2. Projekt-ID kopieren:');
  console.log('     Vercel → App_DPP-Projekt → Settings → General → Project ID\n');
  console.log('  3. (Optional) Team-ID kopieren:');
  console.log('     Vercel → Team-Settings → Team ID\n');
  console.log('  4. In .env eintragen:');
  console.log('     VERCEL_API_TOKEN=xxxx');
  console.log('     VERCEL_PROJECT_ID=prj_xxxx');
  console.log('     VERCEL_TEAM_ID=team_xxxx   # optional\n');
  console.log('  5. Secrets für die Edge Function setzen:');
  console.log('     npx supabase secrets set VERCEL_API_TOKEN="dein-token" VERCEL_PROJECT_ID="prj_xxx" VERCEL_TEAM_ID="team_xxx"\n');
  console.log('  6. Script erneut starten um zu verifizieren.\n');
  process.exit(1);
}

console.log('Status: ✓ lokale Env-Vars gesetzt');
console.log(`  VERCEL_API_TOKEN:   ${VERCEL_API_TOKEN.slice(0, 8)}...`);
console.log(`  VERCEL_PROJECT_ID:  ${VERCEL_PROJECT_ID}`);
console.log(`  VERCEL_TEAM_ID:     ${VERCEL_TEAM_ID || '(nicht gesetzt)'}`);

console.log('\n1) Vercel-API testen ...');
const qs = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
const prjRes = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}${qs}`, {
  headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
});
const prj = await prjRes.json();
if (!prjRes.ok) {
  console.error('  ✗ FEHLER:', prj.error?.message || JSON.stringify(prj).slice(0, 200));
  process.exit(1);
}
console.log(`  ✓ Projekt erreichbar: "${prj.name}" (${prj.framework || 'unknown'})`);

console.log('\n2) Aktuell registrierte Domains:');
const domRes = await fetch(`https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains${qs}`, {
  headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
});
const doms = await domRes.json();
if (Array.isArray(doms.domains)) {
  doms.domains.forEach((d, i) => {
    const marker = d.verified ? '✓' : '○';
    console.log(`  ${marker} ${String(i + 1).padStart(2)}. ${d.name}`);
  });
} else {
  console.log('  (keine oder Fehler)');
}

console.log('\n3) Supabase-Secrets-Status prüfen ...');
const secRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`, {
  headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
});
const secrets = await secRes.json();
const needed = ['VERCEL_API_TOKEN', 'VERCEL_PROJECT_ID'];
const optional = ['VERCEL_TEAM_ID'];
for (const n of needed) {
  const s = secrets.find(x => x.name === n);
  console.log(`  ${s ? '✓' : '✗'} ${n}${s ? '' : ' — FEHLT'}`);
}
for (const n of optional) {
  const s = secrets.find(x => x.name === n);
  console.log(`  ${s ? '✓' : '○'} ${n}${s ? '' : ' (optional)'}`);
}

const allSet = needed.every(n => secrets.find(x => x.name === n));
if (!allSet) {
  console.log('\nNächster Schritt: Secrets für die Edge Function setzen');
  const cmd = [
    'npx supabase secrets set',
    `VERCEL_API_TOKEN="${VERCEL_API_TOKEN}"`,
    `VERCEL_PROJECT_ID="${VERCEL_PROJECT_ID}"`,
    VERCEL_TEAM_ID ? `VERCEL_TEAM_ID="${VERCEL_TEAM_ID}"` : '',
  ].filter(Boolean).join(' ');
  console.log('\n  ' + cmd + '\n');
  process.exit(1);
}

console.log('\n✓ Alles sauber. Auto-Provisioning ist aktiv.');
console.log('  → Subdomains und Custom-Domains im Admin werden automatisch in Vercel registriert.\n');
