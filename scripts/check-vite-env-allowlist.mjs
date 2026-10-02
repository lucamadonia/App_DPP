#!/usr/bin/env node
/**
 * Source-level gate: only allowlisted VITE_* variables may reach the client.
 *
 * Vite inlines every `import.meta.env.VITE_*` it sees into the public bundle.
 * The post-build scan (check-bundle-secrets.mjs) cannot catch a secret that
 * only exists in the Vercel env, because CI never has it, and it cannot
 * recognise opaque values such as a hex HMAC key (VITE_MAIL_HUB_SECRET was
 * exactly that). So this check works on the source instead: any VITE_* name
 * outside the allowlist fails, whatever its value is.
 *
 * Also fails on:
 *  - dynamic or whole-object access (`import.meta.env[x]`, `{ ...import.meta.env }`,
 *    `const { VITE_X } = import.meta.env`), which would bypass the name check;
 *  - `envPrefix` in vite.config.ts, which widens what Vite exposes;
 *  - a `define:` block in vite.config.ts that reads process.env or loadEnv().
 *
 * Adding a name to ALLOWED_VITE_ENV is a security decision: the value becomes
 * public. Only add values that are public by design.
 *
 * Usage: node scripts/check-vite-env-allowlist.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ALLOWED_VITE_ENV = new Set([
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_PUBLIC_BASE_URL',
  'VITE_E2E_FIRST_RUN',
]);

/** Built-in Vite env values; they carry no secrets. */
const BUILTIN_ENV = new Set(['DEV', 'PROD', 'MODE', 'BASE_URL', 'SSR']);

const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts']);

/**
 * Blanks out comments so prose mentioning import.meta.env is not flagged.
 * Keeps newlines (line numbers stay right). Heuristic, not a parser: a `//`
 * right after `:` or a quote is left alone so URLs in strings survive.
 */
export function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/gm, (_c, pre) => pre);
}

/**
 * Checks one source file's text.
 * @param {string} source
 * @returns {string[]} problems, each prefixed with the 1-based line number
 */
export function findEnvViolations(source) {
  const text = stripComments(source);
  const problems = [];
  const re = /import\.meta\.env\b(\s*(?:\?\.|\.)\s*([A-Za-z_$][\w$]*))?/g;
  for (const m of text.matchAll(re)) {
    const line = text.slice(0, m.index).split('\n').length;
    const name = m[2];
    if (!name) {
      problems.push(`${line}: dynamic or whole-object import.meta.env access; reference each variable by name`);
    } else if (name.startsWith('VITE_')) {
      if (!ALLOWED_VITE_ENV.has(name)) {
        problems.push(`${line}: ${name} is not on the client env allowlist (it would be inlined into the public bundle)`);
      }
    } else if (!BUILTIN_ENV.has(name)) {
      problems.push(`${line}: import.meta.env.${name} is not a known Vite built-in`);
    }
  }
  return problems;
}

/** Returns the text of every `define: { ... }` object literal (balanced braces). */
function defineBlocks(text) {
  const blocks = [];
  for (const m of text.matchAll(/\bdefine\s*:\s*\{/g)) {
    let depth = 0;
    let i = m.index + m[0].length - 1;
    const start = i;
    for (; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}' && --depth === 0) break;
    }
    blocks.push(text.slice(start, i + 1));
  }
  return blocks;
}

/**
 * Checks vite.config.* for settings that widen what reaches the client.
 * @param {string} text
 * @returns {string[]}
 */
export function findViteConfigViolations(text) {
  const problems = [];
  if (/\benvPrefix\s*:/.test(text)) {
    problems.push('envPrefix is set; it widens which env variables Vite exposes to the client');
  }
  for (const block of defineBlocks(text)) {
    if (/process\.env|\bloadEnv\s*\(|import\.meta\.env/.test(block)) {
      problems.push('a define: block reads process.env / loadEnv(); that inlines server env values into the bundle');
    }
  }
  return problems;
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (SOURCE_EXT.has(extname(entry).toLowerCase())) yield full;
  }
}

function main() {
  const root = process.cwd();
  const findings = [];
  let scanned = 0;
  if (!existsSync(join(root, 'src'))) {
    console.error('check-vite-env-allowlist: src/ not found; run from the repo root.');
    process.exit(1);
  }
  for (const file of walk(join(root, 'src'))) {
    scanned++;
    for (const p of findEnvViolations(readFileSync(file, 'utf8'))) findings.push(`${relative(root, file)}:${p}`);
  }
  for (const name of ['vite.config.ts', 'vite.config.mts', 'vite.config.js', 'vite.config.mjs']) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    scanned++;
    const text = readFileSync(file, 'utf8');
    for (const p of findEnvViolations(text)) findings.push(`${name}:${p}`);
    for (const p of findViteConfigViolations(text)) findings.push(`${name}: ${p}`);
  }
  if (findings.length) {
    console.error(`check-vite-env-allowlist: ${findings.length} problem(s):`);
    for (const f of findings) console.error(`  - ${f}`);
    console.error(
      `\nAllowed client env: ${[...ALLOWED_VITE_ENV].join(', ')}.` +
        '\nSecrets belong behind an Edge Function. If a new value is public by design, add it to ALLOWED_VITE_ENV in this script.',
    );
    process.exit(1);
  }
  console.log(`check-vite-env-allowlist: ${scanned} file(s) clean.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
