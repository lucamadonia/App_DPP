import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const jwt = (role = 'anon', ref = 'xbnybrqzsjlbieqlwsas') =>
  `header.${Buffer.from(JSON.stringify({ role, ref })).toString('base64url')}.signature`;
const run = (overrides = {}) => spawnSync(process.execPath, ['scripts/check-ios-build-env.mjs'], {
  env: {
    ...process.env,
    VITE_SUPABASE_URL: 'https://xbnybrqzsjlbieqlwsas.supabase.co',
    VITE_SUPABASE_ANON_KEY: jwt(),
    VITE_E2E_FIRST_RUN: '', CAP_LIVE_RELOAD: '',
    ...overrides,
  }, encoding: 'utf8',
});

test('accepts production anon and publishable keys', () => {
  assert.equal(run().status, 0);
  assert.equal(run({ VITE_SUPABASE_ANON_KEY: 'sb_publishable_example' }).status, 0);
});
for (const [name, overrides] of Object.entries({
  'missing URL': { VITE_SUPABASE_URL: '' },
  'wrong backend': { VITE_SUPABASE_URL: 'https://other.supabase.co' },
  'unencrypted backend': { VITE_SUPABASE_URL: 'http://xbnybrqzsjlbieqlwsas.supabase.co' },
  'missing key': { VITE_SUPABASE_ANON_KEY: '' },
  'placeholder key': { VITE_SUPABASE_ANON_KEY: 'placeholder-anon-key' },
  'service role key': { VITE_SUPABASE_ANON_KEY: jwt('service_role') },
  'wrong project key': { VITE_SUPABASE_ANON_KEY: jwt('anon', 'other') },
  'malformed key': { VITE_SUPABASE_ANON_KEY: 'not-a-key' },
  'test overrides': { VITE_E2E_FIRST_RUN: '1' },
  'live reload': { CAP_LIVE_RELOAD: 'http://localhost:5173' },
})) {
  test(`rejects ${name} without exposing the key`, () => {
    const result = run(overrides);
    assert.equal(result.status, 1);
    const key = overrides.VITE_SUPABASE_ANON_KEY;
    if (key) assert.ok(!(result.stdout + result.stderr).includes(key));
  });
}
