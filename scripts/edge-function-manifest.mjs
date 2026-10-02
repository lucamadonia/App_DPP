/**
 * Edge-function deploy manifest.
 *
 * supabase/config.toml is the single source of truth for every function's
 * verify_jwt setting. Both the CI drift check (check-edge-jwt-drift.mjs) and
 * the deploy script (deploy-edge-function.mjs) read it through this module, so
 * a function cannot be deployed with a gateway setting nobody reviewed.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const CONFIG_PATH = join('supabase', 'config.toml');
export const FUNCTIONS_ROOT = join('supabase', 'functions');

/**
 * Parses the [functions.<slug>] tables of a config.toml.
 * Only the subset we need: section headers and `verify_jwt = true|false`.
 *
 * @param {string} toml
 * @returns {Map<string, { verifyJwt: boolean | undefined, line: number }>}
 */
export function parseFunctionsConfig(toml) {
  const entries = new Map();
  let current = null;
  const lines = toml.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/#.*$/, '').trim();
    if (!line) continue;
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) {
      const fn = header[1].trim().match(/^functions\.("?)([A-Za-z0-9_-]+)\1$/);
      current = fn ? fn[2] : null;
      if (current) {
        if (entries.has(current)) throw new Error(`Duplicate [functions.${current}] at line ${i + 1}`);
        entries.set(current, { verifyJwt: undefined, line: i + 1 });
      }
      continue;
    }
    if (!current) continue;
    const kv = line.match(/^verify_jwt\s*=\s*(\S+)$/);
    if (kv) {
      if (kv[1] !== 'true' && kv[1] !== 'false') {
        throw new Error(`[functions.${current}] verify_jwt must be true or false (line ${i + 1})`);
      }
      entries.get(current).verifyJwt = kv[1] === 'true';
    }
  }
  return entries;
}

/** Deployable function directories (skips _shared and other "_" helpers). */
export function listFunctionDirs(root = FUNCTIONS_ROOT) {
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
    .filter((name) => statSync(join(root, name)).isDirectory())
    .sort();
}

export function readFunctionsConfig(path = CONFIG_PATH) {
  return parseFunctionsConfig(readFileSync(path, 'utf8'));
}

/**
 * Compares function directories with config entries.
 * @returns {string[]} human-readable problems; empty when in sync
 */
export function findDrift(functionDirs, config) {
  const problems = [];
  for (const slug of functionDirs) {
    const entry = config.get(slug);
    if (!entry) {
      problems.push(`${slug}: no [functions.${slug}] entry in supabase/config.toml`);
    } else if (entry.verifyJwt === undefined) {
      problems.push(`${slug}: [functions.${slug}] has no explicit verify_jwt (line ${entry.line})`);
    }
  }
  const dirs = new Set(functionDirs);
  for (const slug of config.keys()) {
    if (!dirs.has(slug)) {
      problems.push(`${slug}: config.toml entry without supabase/functions/${slug}/ (stale, remove it)`);
    }
  }
  return problems;
}
