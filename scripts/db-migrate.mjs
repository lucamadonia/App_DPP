/**
 * Supabase Database Migration Runner
 *
 * Executes SQL migration files from supabase/migrations/ via the Supabase Management API.
 * Tracks applied migrations in a _migrations table to avoid re-running.
 *
 * Usage:
 *   node scripts/db-migrate.mjs                # Apply all pending migrations
 *   node scripts/db-migrate.mjs --status       # Show migration status
 *   node scripts/db-migrate.mjs --force        # Re-apply all (ignore tracking)
 *   node scripts/db-migrate.mjs --file <name>  # Apply a specific file from supabase/
 *
 * Requires in .env:
 *   SUPABASE_ACCESS_TOKEN=sbp_...
 *   SUPABASE_PROJECT_REF=xbnybrqzsjlbieqlwsas
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Minimal .env parser (no dependencies) */
function loadDotenv(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf-8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotenv(resolve(__dirname, '..', '.env'));

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!PROJECT_REF || !ACCESS_TOKEN) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN in .env');
  process.exit(1);
}

const API_URL = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
const MIGRATIONS_DIR = join(process.cwd(), 'supabase', 'migrations');

// ── SQL execution ──────────────────────────────────────────────

async function executeSql(sql) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { ok: res.ok, status: res.status, data };
}

// ── Migration tracking table ──────────────────────────────────

async function ensureMigrationsTable() {
  await executeSql(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

async function getAppliedMigrations() {
  const { ok, data } = await executeSql(
    `SELECT name FROM _migrations ORDER BY name`
  );
  if (!ok || !Array.isArray(data)) return new Set();
  return new Set(data.map(r => r.name));
}

async function markApplied(name) {
  await executeSql(
    `INSERT INTO _migrations (name) VALUES ('${name}') ON CONFLICT (name) DO NOTHING`
  );
}

// ── File discovery ────────────────────────────────────────────

function getMigrationFiles() {
  if (!existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
}

// ── Commands ──────────────────────────────────────────────────

async function showStatus() {
  await ensureMigrationsTable();
  const applied = await getAppliedMigrations();
  const files = getMigrationFiles();

  console.log(`\n  Migration Status (${files.length} files)\n`);
  for (const file of files) {
    const status = applied.has(file) ? 'applied' : 'PENDING';
    const icon = applied.has(file) ? 'v' : ' ';
    console.log(`  [${icon}] ${file}  ${status === 'PENDING' ? '<-- pending' : ''}`);
  }
  const pending = files.filter(f => !applied.has(f));
  console.log(`\n  ${applied.size} applied, ${pending.length} pending\n`);
}

async function applyMigrations(force = false) {
  await ensureMigrationsTable();
  const applied = force ? new Set() : await getAppliedMigrations();
  const files = getMigrationFiles();
  const pending = files.filter(f => !applied.has(f));

  if (pending.length === 0) {
    console.log('\n  All migrations are up to date.\n');
    return;
  }

  console.log(`\n  Applying ${pending.length} migration(s)...\n`);

  let ok = 0, fail = 0;
  for (const file of pending) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    const { ok: success, status, data } = await executeSql(sql);

    if (success) {
      await markApplied(file);
      console.log(`  OK   ${file}`);
      ok++;
    } else {
      const msg = typeof data === 'string' ? data : JSON.stringify(data);
      if (msg.includes('already exists') || msg.includes('duplicate')) {
        await markApplied(file);
        console.log(`  SKIP ${file} (already applied)`);
        ok++;
      } else {
        console.log(`  FAIL ${file} (HTTP ${status})`);
        console.log(`       ${msg.slice(0, 300)}`);
        fail++;
      }
    }
  }

  console.log(`\n  Done: ${ok} succeeded, ${fail} failed\n`);
}

async function applyFile(filename) {
  // Look in supabase/ directory (not just migrations/)
  const paths = [
    join(process.cwd(), 'supabase', filename),
    join(MIGRATIONS_DIR, filename),
  ];
  const filePath = paths.find(p => existsSync(p));
  if (!filePath) {
    console.error(`File not found: ${filename}`);
    console.error(`Searched: ${paths.join(', ')}`);
    process.exit(1);
  }

  console.log(`\n  Applying: ${filename}\n`);
  const sql = readFileSync(filePath, 'utf-8');
  const { ok, status, data } = await executeSql(sql);

  if (ok) {
    console.log(`  OK   ${filename}`);
  } else {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    console.log(`  FAIL ${filename} (HTTP ${status})`);
    console.log(`       ${msg.slice(0, 500)}`);
  }
  console.log('');
}

// ── Main ──────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--status')) {
  showStatus();
} else if (args.includes('--force')) {
  applyMigrations(true);
} else if (args.includes('--file')) {
  const idx = args.indexOf('--file');
  const filename = args[idx + 1];
  if (!filename) {
    console.error('Usage: --file <filename.sql>');
    process.exit(1);
  }
  applyFile(filename);
} else {
  applyMigrations(false);
}
