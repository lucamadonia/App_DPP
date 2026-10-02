#!/usr/bin/env node
/**
 * CI gate: every directory under supabase/functions/ must have an explicit
 * [functions.<slug>] verify_jwt entry in supabase/config.toml, and every entry
 * must point to an existing function.
 *
 * Without this, a new function silently inherits whatever the gateway default
 * or the previously deployed version had, and a public webhook or an internal
 * admin function ends up with the wrong JWT setting after a redeploy.
 *
 * Usage: node scripts/check-edge-jwt-drift.mjs
 */
import { findDrift, listFunctionDirs, readFunctionsConfig } from './edge-function-manifest.mjs';

let config;
try {
  config = readFunctionsConfig();
} catch (err) {
  console.error(`check-edge-jwt-drift: cannot read supabase/config.toml: ${err.message}`);
  process.exit(1);
}

const dirs = listFunctionDirs();
const problems = findDrift(dirs, config);

if (problems.length) {
  console.error(`check-edge-jwt-drift: ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('\nAdd an explicit entry per function, e.g.\n\n  [functions.my-function]\n  verify_jwt = true\n');
  process.exit(1);
}

const open = dirs.filter((d) => config.get(d).verifyJwt === false);
console.log(`check-edge-jwt-drift: ${dirs.length} functions in sync with config.toml.`);
console.log(`  verify_jwt=false (must authenticate internally): ${open.join(', ') || 'none'}`);
