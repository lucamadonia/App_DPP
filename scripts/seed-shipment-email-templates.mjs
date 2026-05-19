// Seed the 7 premium hand-coded shipment lifecycle + engagement HTML
// templates into rh_email_templates for the Fambliss tenant. Files live
// under supabase/functions/send-email/templates/shipment/ and stay the
// source-of-truth — re-run this script to refresh after edits.
//
// The Edge Function send-email picks html_template over design_config when
// both are present, so flipping these on activates them immediately.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadDotenv() {
  const p = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(p)) return;
  for (const r of fs.readFileSync(p, 'utf8').split('\n')) {
    const l = r.replace(/\r$/, '').trim();
    if (!l || l.startsWith('#')) continue;
    const m = l.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
  }
}
loadDotenv();
const URL = process.env.VITE_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TENANT_ID = '522f6254-f73c-4a26-b1e9-662035194bc5';
const TEMPLATES_DIR = path.resolve(__dirname, '..', 'supabase/functions/send-email/templates/shipment');

const TEMPLATES = [
  { file: 'shipment-packed.html',     event: 'shipment_packed',     name: 'Sendung wird verpackt',     subject: 'Wir packen deine Bestellung {{shipmentNumber}}',           sort: 100, requiresPhotos: false },
  { file: 'shipment-shipped.html',    event: 'shipment_shipped',    name: 'Sendung versendet',         subject: 'Dein Paket ist unterwegs',                                  sort: 110 },
  { file: 'shipment-delivered.html',  event: 'shipment_delivered',  name: 'Sendung zugestellt',        subject: 'Dein Paket ist da, {{customerName}}',                       sort: 120 },
  { file: 'engagement-day-1.html',    event: 'engagement_day_1',    name: 'Engagement Tag 1',          subject: 'Erste kleine Schritte mit euren Fambliss-Produkten',        sort: 130 },
  { file: 'engagement-day-7.html',    event: 'engagement_day_7',    name: 'Engagement Tag 7',          subject: 'Eine Woche mit Fambliss, wie ist es?',                      sort: 140 },
  { file: 'engagement-day-14.html',   event: 'engagement_day_14',   name: 'Engagement Tag 14',         subject: 'Würdest du uns mit ein paar Worten helfen?',                sort: 150 },
  { file: 'engagement-day-30.html',   event: 'engagement_day_30',   name: 'Engagement Tag 30',         subject: 'Was würdest du an Fambliss verbessern?',                    sort: 160 },
];

async function sb(method, p, body) {
  const r = await fetch(`${URL}/rest/v1${p}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      apikey: KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${p}: ${r.status} ${await r.text()}`);
  return r.json();
}

for (const tpl of TEMPLATES) {
  const html = fs.readFileSync(path.join(TEMPLATES_DIR, tpl.file), 'utf8');

  // Check if a template already exists for this tenant+event
  const existing = await sb(
    'GET',
    `/rh_email_templates?tenant_id=eq.${TENANT_ID}&event_type=eq.${tpl.event}&select=id`,
  );

  const row = {
    tenant_id: TENANT_ID,
    event_type: tpl.event,
    enabled: true,
    category: 'shipment',
    name: tpl.name,
    description: `Premium hand-coded template (Fambliss CD). Source: supabase/functions/send-email/templates/shipment/${tpl.file}`,
    subject_template: tpl.subject,
    body_template: '', // legacy plain-text fallback, unused when html_template is set
    html_template: html,
    sort_order: tpl.sort,
    updated_at: new Date().toISOString(),
  };

  if (existing.length > 0) {
    await sb('PATCH', `/rh_email_templates?id=eq.${existing[0].id}`, row);
    console.log(`UPDATE ${tpl.event.padEnd(22)} ${html.length} bytes`);
  } else {
    await sb('POST', '/rh_email_templates', row);
    console.log(`INSERT ${tpl.event.padEnd(22)} ${html.length} bytes`);
  }
}
console.log('\nDone — 7 templates synced.');
