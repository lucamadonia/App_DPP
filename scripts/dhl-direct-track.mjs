/**
 * Hit DHL Shipment Tracking API directly to see what they currently report.
 * Bypasses our Edge Function — we just want to know whether DHL has the
 * package as delivered.
 */
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

const tn = process.argv[2];
if (!tn) { console.error('Usage: node scripts/dhl-direct-track.mjs <tracking-number>'); process.exit(1); }

const key = process.env.DHL_API_KEY;
if (!key) { console.error('DHL_API_KEY missing'); process.exit(1); }

const url = `https://api-eu.dhl.com/track/shipments?trackingNumber=${encodeURIComponent(tn)}&service=parcel-de&language=de`;
const res = await fetch(url, { headers: { 'DHL-API-Key': key, Accept: 'application/json' } });
console.log(`HTTP ${res.status}`);
const json = await res.json().catch(() => null);
console.log(JSON.stringify(json, null, 2));
