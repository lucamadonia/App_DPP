/**
 * Static mobile-responsiveness audit over every page and component.
 *
 * This is a STATIC scan, not a visual check. It cannot tell you a screen looks
 * good — it tells you which files still contain the patterns that are known to
 * break at 375px in this codebase, so visual review can be aimed at the files
 * that need it instead of at all 145 pages.
 *
 * Usage:
 *   node scripts/audit-mobile.mjs            # ranked summary
 *   node scripts/audit-mobile.mjs --details  # every hit with line numbers
 *   node scripts/audit-mobile.mjs --pages    # pages only, skip components
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const DETAILS = process.argv.includes('--details');
const PAGES_ONLY = process.argv.includes('--pages');

/** Intentionally exempt, with the reason. */
const EXEMPT = [
  ['src/components/layout/mobile-bottom-nav.tsx', 'the tab bar itself'],
  ['src/components/warehouse/CampaignCalendarView.tsx', 'a real 7-day calendar'],
  ['src/components/training-guide/mockups/', 'illustrative mockups, not real UI'],
  ['src/components/ui/', 'primitives define the patterns'],
];

/**
 * Each rule is a known way this codebase breaks on a phone.
 * `high` = will overflow or be unusable at 375px.
 */
const RULES = [
  {
    id: 'raw-table',
    severity: 'high',
    label: 'raw <Table> with no mobile alternative',
    // Whole-file, not per-line. Matching the import alone produced a whole
    // class of false positives: a file may legitimately keep a desktop-only
    // <Table> alongside a hand-built card list, which is BETTER than the
    // generic component, not worse. Only flag a raw table with no mobile
    // branch at all.
    fileTest: (src) =>
      /from ['"]@\/components\/ui\/table['"]/.test(src) &&
      !/isMobile|showCards|hidden md:|md:block|forceMobileCards/.test(src),
  },
  {
    id: 'raw-dialog',
    severity: 'medium',
    label: 'raw <Dialog> (not a bottom sheet on mobile)',
    test: (line) => /from ['"]@\/components\/ui\/dialog['"]/.test(line),
  },
  {
    id: 'unprefixed-grid',
    severity: 'high',
    label: 'grid-cols-3..12 that never changes at a breakpoint',
    // `grid-cols-4 sm:grid-cols-7` is mobile-first and correct — the unprefixed
    // class is the phone case, not a defect. Only flag a column count that is
    // fixed at every width.
    test: (line) =>
      /(?<![a-z0-9:-])grid-cols-(?:[3-9]|1[0-2])\b/.test(line) &&
      !/\b(?:xs|sm|md|lg|xl|2xl):grid-cols-/.test(line),
  },
  {
    id: 'fixed-width',
    severity: 'high',
    label: 'fixed w-[Npx] >= 360px with no responsive prefix',
    test: (line) =>
      [...line.matchAll(/(?<![a-z0-9:-])(?:min-)?w-\[(\d+)px\]/g)].some(
        (m) => Number(m[1]) >= 360
      ),
  },
  {
    id: 'viewport-height',
    severity: 'medium',
    label: '100vh (overflows under mobile browser chrome; use 100dvh)',
    test: (line) => /100vh/.test(line),
  },
  {
    id: 'tiny-text',
    severity: 'low',
    label: 'text below 11px with no larger size at sm+ (illegible on a phone)',
    // `text-[10px] sm:text-xs` is deliberate mobile-first sizing, not a defect —
    // small on a phone, larger on desktop. Only flag sub-11px type that never
    // escalates.
    test: (line) =>
      /text-\[(?:[1-9]|10)px\]/.test(line) && !/\b(?:xs|sm|md|lg):text-/.test(line),
  },
  {
    id: 'no-responsive-tokens',
    severity: 'medium',
    label: 'file has layout classes but zero responsive prefixes',
    // Whole-file rule, evaluated separately below.
    fileTest: (src) =>
      /className="[^"]*\b(?:grid|flex|w-|p-|gap-)/.test(src) &&
      !/(?:xs|sm|md|lg|xl):/.test(src) &&
      src.length > 4000,
  },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

const isExempt = (rel) => EXEMPT.some(([p]) => rel.includes(p));

const roots = PAGES_ONLY ? ['src/pages'] : ['src/pages', 'src/components'];
const files = roots.flatMap((r) => walk(r));

const results = [];
for (const file of files) {
  const rel = file.split(path.sep).join('/');
  if (isExempt(rel)) continue;

  const src = readFileSync(file, 'utf8');
  const hits = [];

  src.split('\n').forEach((line, i) => {
    for (const rule of RULES) {
      if (rule.test?.(line)) hits.push({ rule, line: i + 1, text: line.trim().slice(0, 90) });
    }
  });

  // Whole-file rules: a substantial file with layout classes and not one
  // responsive prefix has almost certainly never been looked at on a phone.
  for (const rule of RULES) {
    if (rule.fileTest?.(src)) {
      hits.push({ rule, line: 1, text: '(entire file — no sm:/md:/lg: anywhere)' });
    }
  }

  if (!hits.length) continue;

  const weight = { high: 3, medium: 2, low: 1 };
  const score = hits.reduce((s, h) => s + weight[h.rule.severity], 0);
  results.push({ rel, hits, score });
}

results.sort((a, b) => b.score - a.score);

const byRule = new Map();
for (const r of results) {
  for (const h of r.hits) byRule.set(h.rule.id, (byRule.get(h.rule.id) ?? 0) + 1);
}

console.log(
  `Scanned ${files.length} files. ${results.length} still contain known mobile-breaking patterns.\n`
);

console.log('By pattern:');
for (const rule of RULES) {
  const n = byRule.get(rule.id) ?? 0;
  console.log(`  ${String(n).padStart(4)}  [${rule.severity.padEnd(6)}] ${rule.label}`);
}

console.log('\nWorst files (review these first):');
for (const r of results.slice(0, DETAILS ? results.length : 25)) {
  console.log(`\n  ${r.rel}  (score ${r.score})`);
  const shown = DETAILS ? r.hits : r.hits.slice(0, 3);
  for (const h of shown) console.log(`      ${String(h.line).padStart(5)}  ${h.rule.id}: ${h.text}`);
  if (!DETAILS && r.hits.length > 3) console.log(`      … ${r.hits.length - 3} more`);
}

console.log(
  `\nThis is a STATIC scan. It narrows visual review to ${results.length} files ` +
    `instead of ${files.length}; it does not replace looking at them.`
);
