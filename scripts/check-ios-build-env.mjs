// Fail before compiling an IPA that cannot start or targets the wrong backend.
const expectedHost = 'xbnybrqzsjlbieqlwsas.supabase.co';
const url = process.env.VITE_SUPABASE_URL?.trim();
const key = process.env.VITE_SUPABASE_ANON_KEY?.trim();
const fail = (message) => { console.error(message); process.exit(1); };
let parsed;
try { parsed = new URL(url); } catch { fail('VITE_SUPABASE_URL is missing or invalid.'); }
if (parsed.protocol !== 'https:' || parsed.host !== expectedHost) {
  fail('iOS release must use the Trackbliss production Supabase project.');
}
if (!key || key.includes('placeholder')) fail('A real public Supabase key is required.');
if (!key.startsWith('sb_publishable_')) {
  let payload;
  try { payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()); }
  catch { fail('Supabase key must be a publishable key or anon JWT.'); }
  if (payload.role !== 'anon' || payload.ref !== expectedHost.split('.')[0]) {
    fail('Only the Trackbliss anon key may be embedded in the iOS app.');
  }
}
if (process.env.VITE_E2E_FIRST_RUN || process.env.CAP_LIVE_RELOAD) {
  fail('Test and live-reload overrides must not be enabled for an iOS release.');
}
console.log('iOS production backend configuration OK (public key only).');
