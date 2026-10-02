#!/usr/bin/env node
/**
 * Deploy a single Supabase Edge Function via the Management API.
 *
 * Avoids the need for the Supabase CLI in CI/local-dev.
 *
 * Usage:
 *   node scripts/deploy-edge-function.mjs <slug>
 *   node scripts/deploy-edge-function.mjs shopify-sync
 *   node scripts/deploy-edge-function.mjs shopify-webhook --no-verify-jwt
 *
 * Reads SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF from .env.
 * The function source is read from supabase/functions/<slug>/.
 *
 * Two behaviours worth knowing about:
 *
 * 1. verify_jwt is taken from supabase/config.toml ([functions.<slug>]), the
 *    reviewed manifest. A missing entry or a --verify-jwt / --no-verify-jwt
 *    flag that contradicts it aborts the deploy. (It used to be hardcoded to
 *    true, later "preserved" from the deployed version; both let the deployed
 *    gateway setting drift from what the code review saw.)
 *
 * 2. If any source file imports from '../_shared/', the upload is re-based to
 *    supabase/functions/ so the shared module travels with the function and the
 *    relative import still resolves. Without this the shared file is never
 *    uploaded and the function fails to boot.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readFunctionsConfig } from './edge-function-manifest.mjs';

function loadDotenv(path) {
  const env = {};
  let raw;
  try { raw = readFileSync(path, 'utf8'); } catch { return env; }
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[m[1]] = val;
  }
  return env;
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listFiles(full, base));
    } else {
      out.push({ path: full, rel: relative(base, full).replace(/\\/g, '/') });
    }
  }
  return out;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node scripts/deploy-edge-function.mjs <slug>');
    process.exit(2);
  }
  // The slug becomes a filesystem path and a URL segment: no traversal, no
  // query injection, no deploying the _shared helper folder on its own.
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(slug)) {
    console.error(`Invalid function slug: ${slug}`);
    process.exit(2);
  }

  const env = { ...process.env, ...loadDotenv('.env') };
  const token = env.SUPABASE_ACCESS_TOKEN;
  const ref = env.SUPABASE_PROJECT_REF;
  if (!token || !ref) {
    console.error('Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF in .env');
    process.exit(2);
  }

  const functionsRoot = join('supabase', 'functions');
  const fnDir = join(functionsRoot, slug);
  let files;
  try {
    files = listFiles(fnDir);
  } catch {
    console.error(`Function source not found at ${fnDir}`);
    process.exit(2);
  }
  if (!files.length) {
    console.error(`No files in ${fnDir}`);
    process.exit(2);
  }

  // If the function imports from ../_shared/, re-base the upload one level up so
  // the shared module is included and the relative import still resolves.
  const usesShared = files.some(f =>
    /\.(ts|js|mjs)$/.test(f.rel) && readFileSync(f.path, 'utf8').includes('../_shared/')
  );
  if (usesShared) {
    files = [
      ...listFiles(fnDir, functionsRoot),
      ...listFiles(join(functionsRoot, '_shared'), functionsRoot),
    ];
    console.log('  (function imports ../_shared/ — including shared modules in the upload)');
  }

  // Find entrypoint — prefer index.ts at the function root
  const entryRel = usesShared ? `${slug}/index.ts` : 'index.ts';
  const entry = files.find(f => f.rel === entryRel) || files[0];

  // verify_jwt comes from the reviewed manifest in supabase/config.toml. A flag
  // that contradicts it is refused, so a one-off deploy cannot quietly open
  // (or close) a function's gateway auth. CI enforces that every function has
  // an entry (scripts/check-edge-jwt-drift.mjs).
  const flag = process.argv.includes('--no-verify-jwt') ? false
    : process.argv.includes('--verify-jwt') ? true
    : undefined;
  let manifest;
  try {
    manifest = readFunctionsConfig().get(slug);
  } catch (err) {
    console.error(`Cannot read supabase/config.toml: ${err.message}`);
    process.exit(2);
  }
  if (manifest?.verifyJwt === undefined) {
    console.error(`supabase/config.toml has no explicit verify_jwt for [functions.${slug}].`);
    console.error('Add the entry (reviewed) before deploying; the deploy no longer guesses.');
    process.exit(2);
  }
  if (flag !== undefined && flag !== manifest.verifyJwt) {
    console.error(`Flag says verify_jwt=${flag} but supabase/config.toml says ${manifest.verifyJwt}.`);
    console.error('Change config.toml in a reviewed commit instead of overriding it here.');
    process.exit(2);
  }
  const verifyJwt = manifest.verifyJwt;
  console.log(`  (verify_jwt=${verifyJwt} from supabase/config.toml)`);

  // Build multipart body manually (Node 18+ has FormData)
  const form = new FormData();
  form.append('metadata', JSON.stringify({
    name: slug,
    verify_jwt: verifyJwt,
    entrypoint_path: entry.rel,
  }));
  for (const f of files) {
    const buf = readFileSync(f.path);
    form.append('file', new Blob([buf], { type: 'application/typescript' }), f.rel);
  }

  const url = `https://api.supabase.com/v1/projects/${ref}/functions/deploy?slug=${slug}`;
  console.log(`Deploying ${slug} → ${ref} (${files.length} file(s), entry=${entry.rel})…`);

  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const text = await r.text();
  if (!r.ok) {
    console.error(`Deploy failed (${r.status}): ${text}`);
    process.exit(1);
  }
  console.log('OK ', text);
}

main().catch(e => { console.error(e); process.exit(1); });
