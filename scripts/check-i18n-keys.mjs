#!/usr/bin/env node
/**
 * check-i18n-keys.mjs — static code→locale consistency check.
 *
 * Scans src/** for literal translation calls (t('...') / t("...")), resolves the
 * namespace from the nearest preceding `useTranslation(...)` declaration (first
 * entry of an array form, default `common`), an inline `{ ns: 'x' }` option or an
 * explicit `ns:key` prefix, and checks every key against public/locales/{en,de}
 * using a real i18next instance configured like src/i18n.ts (default key and
 * namespace separators), so the result matches runtime lookup behaviour.
 *
 * Template-literal keys (t(`ml.field.${x}`)) cannot be resolved statically; they are
 * counted and listed with --dynamic but never fail the check.
 *
 * Usage:
 *   node scripts/check-i18n-keys.mjs            # summary + missing keys, exit 1 if any
 *   node scripts/check-i18n-keys.mjs --json     # machine-readable report on stdout
 *   node scripts/check-i18n-keys.mjs --dynamic  # also list dynamic (template) keys
 *   node scripts/check-i18n-keys.mjs --include-defaults  # also fail on keys that pass defaultValue
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const i18nextMod = require('i18next');
const i18next = i18nextMod.default || i18nextMod;

const LANGS = ['en', 'de'];
const args = new Set(process.argv.slice(2));
const asJson = args.has('--json');
const showDynamic = args.has('--dynamic');
const includeDefaults = args.has('--include-defaults');

const locDir = path.join(ROOT, 'public', 'locales');
const nsList = fs
  .readdirSync(path.join(locDir, 'en'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.slice(0, -5));

const resources = {};
for (const lng of LANGS) {
  resources[lng] = {};
  for (const ns of nsList) {
    const p = path.join(locDir, lng, `${ns}.json`);
    if (fs.existsSync(p)) resources[lng][ns] = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
}

const inst = i18next.createInstance();
await inst.init({
  resources,
  lng: 'en',
  fallbackLng: false,
  defaultNS: 'common',
  ns: nsList,
  interpolation: { escapeValue: false },
});

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '__tests__') continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && !e.name.endsWith('.d.ts')) {
      out.push(p);
    }
  }
  return out;
}

function unescapeJs(s) {
  return s.replace(/\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|.)/g, (_, c) => {
    if (c === 'n') return '\n';
    if (c === 't') return '\t';
    if (c.startsWith('u{')) return String.fromCodePoint(parseInt(c.slice(2, -1), 16));
    if (c.startsWith('u') && c.length === 5) return String.fromCharCode(parseInt(c.slice(1), 16));
    return c;
  });
}

function keyExists(key, ns, lng) {
  const o = { ns, lng };
  return (
    inst.exists(key, o) ||
    inst.exists(`${key}_one`, o) ||
    inst.exists(`${key}_other`, o)
  );
}

const STR = `(?:'((?:[^'\\\\\\n]|\\\\.)*)'|"((?:[^"\\\\\\n]|\\\\.)*)"|\`((?:[^\`\\\\]|\\\\.)*)\`)`;
const files = walk(path.join(ROOT, 'src'));
const missing = Object.fromEntries(LANGS.map((l) => [l, []]));
const dynamic = [];
const unknownNs = [];
let total = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!src.includes('useTranslation')) continue;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');

  // Collect useTranslation declarations: position, namespace, local alias.
  const decls = [];
  const dRe = /const\s*\{([^}]*)\}\s*=\s*useTranslation\(\s*(\[[^\]]*\]|'[^']*'|"[^"]*")?/g;
  let m;
  while ((m = dRe.exec(src))) {
    let ns = 'common';
    if (m[2]) {
      const s = m[2].match(/['"]([^'"]+)['"]/);
      if (s) ns = s[1];
    }
    const am = m[1].match(/\bt\s*:\s*(\w+)/);
    let alias;
    if (am) alias = am[1];
    else if (/(^|[\s,])t(\s*[,}]|\s*$)/.test(m[1])) alias = 't';
    else continue;
    decls.push({ pos: m.index, ns, alias });
  }
  const aliases = [...new Set(decls.map((d) => d.alias))];

  for (const alias of aliases) {
    const cRe = new RegExp(`(?<![\\w.$])${alias}\\(\\s*${STR}\\s*(,\\s*\\{([^)]*?)\\})?`, 'g');
    while ((m = cRe.exec(src))) {
      const line = src.slice(0, m.index).split('\n').length;
      const where = `${rel}:${line}`;
      const decl =
        decls.filter((d) => d.alias === alias && d.pos < m.index).pop() ||
        decls.find((d) => d.alias === alias);
      let ns = decl.ns;
      const opt = m[5] || '';
      const nsm = opt.match(/\bns\s*:\s*['"]([^'"]+)['"]/);
      if (nsm) ns = nsm[1];

      if (m[3] !== undefined) {
        if (m[3].includes('${')) {
          dynamic.push({ where, ns, key: m[3] });
          continue;
        }
      }
      let key = unescapeJs(m[1] ?? m[2] ?? m[3]);
      if (!key) continue;
      const pre = key.match(/^([a-z-]+):(.+)$/s);
      if (pre && nsList.includes(pre[1])) {
        ns = pre[1];
        key = pre[2];
      }
      if (!nsList.includes(ns)) {
        unknownNs.push({ where, ns, key });
        continue;
      }
      total++;
      const hasDefault = /defaultValue\s*:/.test(opt);
      for (const lng of LANGS) {
        if (!keyExists(key, ns, lng)) missing[lng].push({ where, ns, key, hasDefault });
      }
    }
  }
}

const failing = Object.fromEntries(
  LANGS.map((l) => [l, missing[l].filter((x) => includeDefaults || !x.hasDefault)]),
);

if (asJson) {
  console.log(JSON.stringify({ total, missing: failing, unknownNs, dynamic }, null, 2));
} else {
  console.log(`Scanned ${files.length} files, ${total} literal translation calls.`);
  for (const lng of LANGS) {
    const list = failing[lng];
    const withDefault = missing[lng].length - list.length;
    console.log(`\n[${lng}] missing: ${list.length}${withDefault && !includeDefaults ? ` (+${withDefault} with defaultValue, ignored)` : ''}`);
    const seen = new Set();
    for (const x of list) {
      const id = `${x.ns}\u0000${x.key}`;
      if (seen.has(id)) continue;
      seen.add(id);
      console.log(`  ${x.ns}: ${JSON.stringify(x.key)}  (${x.where})`);
    }
  }
  if (unknownNs.length) {
    console.log(`\nUnknown namespaces: ${unknownNs.length}`);
    for (const x of unknownNs) console.log(`  ${x.ns}: ${JSON.stringify(x.key)}  (${x.where})`);
  }
  console.log(`\nDynamic (template-literal) keys not checked: ${dynamic.length}${showDynamic ? '' : ' (use --dynamic to list)'}`);
  if (showDynamic) for (const x of dynamic) console.log(`  ${x.ns}: \`${x.key}\`  (${x.where})`);
}

const failed = LANGS.some((l) => failing[l].length > 0) || unknownNs.length > 0;
process.exit(failed ? 1 : 0);
