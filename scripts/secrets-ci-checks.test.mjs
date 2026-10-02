// Run with: node --test scripts/secrets-ci-checks.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDrift, parseFunctionsConfig } from './edge-function-manifest.mjs';
import { findSecrets } from './check-bundle-secrets.mjs';
import { findEnvViolations, findViteConfigViolations } from './check-vite-env-allowlist.mjs';

const jwt = (payload) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.abcdefghijklmnopqrstuvwxyz012345`;

test('parses function entries, ignoring comments and other tables', () => {
  const cfg = parseFunctionsConfig([
    'project_id = "x"',
    '[api]',
    'verify_jwt = false',
    '# comment',
    '[functions.a]',
    'verify_jwt = true # inline',
    '[functions.b]',
    'verify_jwt = false',
    '[functions.c]',
    'import_map = "./x.json"',
  ].join('\n'));
  assert.deepEqual([...cfg.keys()], ['a', 'b', 'c']);
  assert.equal(cfg.get('a').verifyJwt, true);
  assert.equal(cfg.get('b').verifyJwt, false);
  assert.equal(cfg.get('c').verifyJwt, undefined);
});

test('rejects non-boolean verify_jwt and duplicate tables', () => {
  assert.throws(() => parseFunctionsConfig('[functions.a]\nverify_jwt = "true"'));
  assert.throws(() => parseFunctionsConfig('[functions.a]\n[functions.a]'));
});

test('reports missing, implicit and stale entries', () => {
  const cfg = parseFunctionsConfig('[functions.a]\nverify_jwt = true\n[functions.c]\n[functions.gone]\nverify_jwt = true');
  const problems = findDrift(['a', 'b', 'c'], cfg);
  assert.equal(problems.length, 3);
  assert.match(problems.join('\n'), /b: no \[functions\.b\]/);
  assert.match(problems.join('\n'), /c: .*no explicit verify_jwt/);
  assert.match(problems.join('\n'), /gone: .*stale/);
  assert.deepEqual(findDrift(['a'], parseFunctionsConfig('[functions.a]\nverify_jwt = false')), []);
});

test('flags server secrets in bundle text', () => {
  for (const s of [
    'sk_live_' + 'a'.repeat(24),
    'sk_test_' + 'B1'.repeat(12),
    'whsec_' + 'c'.repeat(32),
    'sk-or-v1-' + 'd'.repeat(64),
    'sbp_' + 'e'.repeat(40),
    jwt({ role: 'service_role', ref: 'x' }),
  ]) {
    assert.equal(findSecrets(`const k="${s}";`).length, 1, s.slice(0, 10));
  }
});

test('ignores the public anon key and documentation placeholders', () => {
  assert.deepEqual(findSecrets(`const k="${jwt({ role: 'anon', ref: 'x' })}";`), []);
  assert.deepEqual(findSecrets('OPENROUTER_API_KEY=sk-or-v1-... sk_live_xxx whsec_...'), []);
});

test('client env allowlist: allowed names and built-ins pass', () => {
  assert.deepEqual(findEnvViolations([
    'const u = import.meta.env.VITE_SUPABASE_URL;',
    'const k = import.meta.env.VITE_SUPABASE_ANON_KEY;',
    'if (import.meta.env.DEV || import.meta.env?.PROD) {}',
    "const b = import.meta.env.VITE_PUBLIC_BASE_URL ?? '';",
  ].join('\n')), []);
});

test('client env allowlist: unknown VITE_ names and dynamic access fail', () => {
  const problems = findEnvViolations([
    'const s = import.meta.env.VITE_MAIL_HUB_SECRET;',
    'const x = import.meta.env[name];',
    'const { VITE_OPENROUTER_API_KEY } = import.meta.env;',
    'const all = { ...import.meta.env };',
  ].join('\n'));
  assert.equal(problems.length, 4);
  assert.match(problems[0], /^1: VITE_MAIL_HUB_SECRET is not on the client env allowlist/);
  assert.match(problems.slice(1).join('\n'), /dynamic or whole-object/);
});

test('vite config: define reading process.env and envPrefix fail', () => {
  assert.deepEqual(findViteConfigViolations(
    "const cap = process.env.CAPACITOR_BUILD === '1';\nexport default defineConfig({ define: { __V__: JSON.stringify('1') } });",
  ), []);
  assert.equal(findViteConfigViolations(
    "export default defineConfig({ define: { 'x': JSON.stringify(process.env.STRIPE_SECRET_KEY) } });",
  ).length, 1);
  assert.equal(findViteConfigViolations("export default defineConfig({ envPrefix: ['VITE_', 'APP_'] });").length, 1);
});

test('client env allowlist: comments are ignored, code after them is not', () => {
  assert.deepEqual(findEnvViolations('/* read import.meta.env directly */\n// import.meta.env[x]\nconst u = "https://x.co";'), []);
  assert.match(findEnvViolations('/* c */\nconst s = import.meta.env.VITE_X_SECRET; // note')[0], /^2: VITE_X_SECRET/);
});
