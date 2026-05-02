#!/usr/bin/env node
/**
 * Deploy a single Supabase Edge Function via the Management API.
 *
 * Avoids the need for the Supabase CLI in CI/local-dev.
 *
 * Usage:
 *   node scripts/deploy-edge-function.mjs <slug>
 *   node scripts/deploy-edge-function.mjs shopify-sync
 *
 * Reads SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF from .env.
 * The function source is read from supabase/functions/<slug>/.
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

  const fnDir = join('supabase', 'functions', slug);
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

  // Find entrypoint — prefer index.ts at the function root
  const entry = files.find(f => f.rel === 'index.ts') || files[0];

  // Build multipart body manually (Node 18+ has FormData)
  const form = new FormData();
  form.append('metadata', JSON.stringify({
    name: slug,
    verify_jwt: true,
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
