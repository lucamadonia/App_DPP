// Simulate exactly what the public widget/wizard does for the user's input
// so we can confirm the RPC matches before blaming code or cache.
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
const ANON = process.env.VITE_SUPABASE_ANON_KEY;

const [, , orderArg, emailArg] = process.argv;
const order = orderArg ?? '#1040';
const email = emailArg ?? 'juliapechoel@gmail.com';

console.log(`Lookup test: order="${order}" email="${email}"`);

// Step 1: lookup_shipment_by_order_email
const lookup = await fetch(`${URL}/rest/v1/rpc/lookup_shipment_by_order_email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: ANON,
    Authorization: `Bearer ${ANON}`,
  },
  body: JSON.stringify({ p_order: order, p_email: email }),
});
console.log(`\nlookup_shipment_by_order_email → ${lookup.status}`);
const lookupRows = await lookup.json();
console.log(JSON.stringify(lookupRows, null, 2));

if (!Array.isArray(lookupRows) || lookupRows.length === 0) {
  console.log('\nNo shipment matched — wizard would block on miss.');
  process.exit(0);
}

const token = lookupRows[0].tracking_token;
if (!token) {
  console.log('\nMatched a row but tracking_token is null — RPC filters those out, so this should not happen.');
  process.exit(0);
}

// Step 2: get_public_shipment_items_by_token
const items = await fetch(`${URL}/rest/v1/rpc/get_public_shipment_items_by_token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: ANON,
    Authorization: `Bearer ${ANON}`,
  },
  body: JSON.stringify({ p_token: token }),
});
console.log(`\nget_public_shipment_items_by_token → ${items.status}`);
const itemRows = await items.json();
console.log(JSON.stringify(itemRows, null, 2));
console.log(`\nWizard would advance: ${Array.isArray(itemRows) && itemRows.length > 0 ? 'YES (order-only picker)' : 'NO (lookup returned 0 items)'}`);
