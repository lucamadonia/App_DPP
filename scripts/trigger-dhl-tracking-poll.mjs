/**
 * Manueller Sofort-Trigger des DHL-Tracking-Polls (statt auf den 8h-Cron zu warten).
 * Ruft die dhl-shipping Edge Function im Cron-Modus auf und iteriert über alle Tenants.
 */
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf8').split(/\r?\n/).filter(l => l && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const r = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/dhl-shipping`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
  },
  body: JSON.stringify({ action: 'poll_all_tenants_cron' }),
});
const body = await r.json();
console.log('Status:', r.status);
console.log(JSON.stringify(body, null, 2));
