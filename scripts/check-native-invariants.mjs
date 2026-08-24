/**
 * Guards the invariants the native build depends on.
 * Run in CI and before `cap sync`.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'src';
const failures = [];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx|css)$/.test(entry)) out.push(full);
  }
  return out;
}

const FILES = walk(ROOT);

function scan(label, pattern, allow, hint) {
  const hits = [];
  for (const file of FILES) {
    const rel = file.split(path.sep).join('/');
    if (allow.some((a) => rel.includes(a))) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (pattern.test(line)) hits.push(`${rel}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  }
  if (hits.length) {
    failures.push(`\n[${label}] ${hits.length} violation(s) — ${hint}\n  ` + hits.join('\n  '));
  }
  return hits.length;
}

// 1. Absolute URLs must go through the platform layer, or native builds bake
//    `capacitor://localhost` into printed QR codes and customer emails.
scan(
  'location.origin',
  /window\.location\.origin/,
  ['src/lib/platform.ts'],
  'use getPublicBaseUrl() / getAuthOrigin() from @/lib/platform'
);

// 2. 100vh overflows under the iOS URL bar and WebView chrome.
scan(
  '100vh',
  /100vh/,
  ['src/index.css'], // one keyframe legitimately animates translateY(100vh)
  'use 100dvh / h-full inside the shell flex chain'
);

// 3. Only the app chrome may read safe-area insets directly.
// Raw env() is only allowed where the tokens are DEFINED. Everything else
// consumes var(--safe-top/-bottom/-left/-right) so the values stay overridable
// in one place.
scan(
  'env(safe-area)',
  /env\(\s*safe-area-inset/,
  ['src/index.css'],
  'consume var(--safe-bottom) etc., or use .pb-app / PageContainer'
);

if (failures.length) {
  console.error('Native invariant check FAILED' + failures.join('\n'));
  process.exit(1);
}
console.log('Native invariants OK');
