#!/usr/bin/env node
/**
 * Post-build gate: scans the built client bundle (dist/ by default) for
 * server-side secrets that must never ship to the browser.
 *
 * Vite inlines every VITE_* variable it sees, so a single
 * `import.meta.env.VITE_SOMETHING_SECRET` reference publishes that secret to
 * every visitor. This check fails the build if one slips in.
 *
 * Usage: node scripts/check-bundle-secrets.mjs [dir ...]
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEXT_EXT = new Set(['.js', '.mjs', '.cjs', '.css', '.html', '.json', '.map', '.txt', '.webmanifest', '.svg', '.xml']);

export const SECRET_PATTERNS = [
  { name: 'Stripe secret key', re: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { name: 'Stripe restricted key', re: /\brk_(?:live|test)_[A-Za-z0-9]{16,}/g },
  { name: 'Stripe webhook secret', re: /\bwhsec_[A-Za-z0-9+/=]{16,}/g },
  { name: 'OpenRouter API key', re: /\bsk-or-(?:v1-)?[A-Za-z0-9]{24,}/g },
  { name: 'Supabase access token', re: /\bsbp_[a-f0-9]{32,}/g },
  { name: 'Supabase secret key', re: /\bsb_secret_[A-Za-z0-9_-]{16,}/g },
  { name: 'Private key block', re: /-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/g },
];

const JWT_RE = /\beyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{16,}/g;

/** Returns the JWT role claim, or null if the payload is not decodable JSON. */
function jwtRole(payloadB64) {
  try {
    return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')).role ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {string} text
 * @returns {{ name: string, sample: string }[]}
 */
export function findSecrets(text) {
  const hits = [];
  for (const { name, re } of SECRET_PATTERNS) {
    for (const m of text.matchAll(re)) hits.push({ name, sample: redact(m[0]) });
  }
  for (const m of text.matchAll(JWT_RE)) {
    if (jwtRole(m[1]) === 'service_role') hits.push({ name: 'Supabase service_role JWT', sample: redact(m[0]) });
  }
  return hits;
}

function redact(value) {
  return value.length <= 12 ? '***' : `${value.slice(0, 8)}…(${value.length} chars)`;
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (TEXT_EXT.has(extname(entry).toLowerCase())) yield full;
  }
}

function main() {
  const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['dist'];
  let scanned = 0;
  const findings = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      console.error(`check-bundle-secrets: ${dir}/ does not exist; run the build first.`);
      process.exit(1);
    }
    for (const file of walk(dir)) {
      scanned++;
      for (const hit of findSecrets(readFileSync(file, 'utf8'))) findings.push({ file, ...hit });
    }
  }
  if (findings.length) {
    console.error(`check-bundle-secrets: ${findings.length} secret(s) found in the client bundle:`);
    for (const f of findings) console.error(`  - ${f.file}: ${f.name} ${f.sample}`);
    console.error('\nRemove the VITE_* reference and move the secret behind an Edge Function. Then rotate it: it may already be public.');
    process.exit(1);
  }
  console.log(`check-bundle-secrets: ${scanned} file(s) in ${dirs.join(', ')} clean.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
