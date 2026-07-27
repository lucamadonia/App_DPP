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
 * 1. verify_jwt is PRESERVED from the already-deployed function unless you pass
 *    --verify-jwt / --no-verify-jwt. It used to be hardcoded to true, which
 *    silently broke public functions on redeploy — shopify-webhook, send-email,
 *    stripe-webhook and auth-email-hook all run with verify_jwt=false and do
 *    their own signature verification.
 *
 * 2. If any source file imports from '../_shared/', the upload is re-based to
 *    supabase/functions/ so the shared module travels with the function and the
 *    relative import still resolves. Without this the shared file is never
 *    uploaded and the function fails to boot.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

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

  // Preserve verify_jwt from the deployed function unless explicitly overridden.
  // Hardcoding true here silently breaks every public function on redeploy.
  let verifyJwt;
  if (process.argv.includes('--no-verify-jwt')) verifyJwt = false;
  else if (process.argv.includes('--verify-jwt')) verifyJwt = true;
  else {
    try {
      const cur = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/functions/${slug}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (cur.ok) verifyJwt = (await cur.json()).verify_jwt;
    } catch { /* fall through to the default below */ }
    if (verifyJwt === undefined) {
      verifyJwt = true;
      console.log('  (no deployed version found — defaulting to verify_jwt=true)');
    } else {
      console.log(`  (preserving verify_jwt=${verifyJwt} from the deployed version)`);
    }
  }

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
