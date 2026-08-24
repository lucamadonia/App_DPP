import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * en and de must stay key-for-key identical.
 *
 * There was no parity check anywhere before this. A missing German key does not
 * throw — i18next silently falls back to English — so drift is invisible until
 * a user reports a half-translated screen. This makes it a build failure
 * instead, and it runs in CI already via `npm run test:run`.
 *
 * `el` is deliberately excluded: it covers 14 of 20 namespaces on purpose, and
 * with fallbackLng 'en' a Greek user gets complete, coherent English. A
 * PARTIAL Greek file would be strictly worse, because i18next falls back per
 * key — you would get a Greek headline over English body text over a Greek
 * button, which reads as broken rather than as "not localised yet".
 */
const localesDir = path.join(process.cwd(), 'public', 'locales');

function flatten(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k)
  );
}

function load(lng: string, ns: string): unknown {
  return JSON.parse(readFileSync(path.join(localesDir, lng, ns), 'utf8'));
}

const namespaces = readdirSync(path.join(localesDir, 'en')).filter((f) => f.endsWith('.json'));

describe('i18n en/de parity', () => {
  it.each(namespaces)('%s has the same keys in en and de', (ns) => {
    const en = flatten(load('en', ns)).sort();
    const de = flatten(load('de', ns)).sort();

    const missingInDe = en.filter((k) => !de.includes(k));
    const missingInEn = de.filter((k) => !en.includes(k));

    expect({ missingInDe, missingInEn }).toEqual({ missingInDe: [], missingInEn: [] });
  });

  it.each(namespaces)('%s has no empty values in either language', (ns) => {
    const empties: string[] = [];
    for (const lng of ['en', 'de']) {
      const data = load(lng, ns) as Record<string, unknown>;
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && value.trim() === '') empties.push(`${lng}/${ns}:${key}`);
      }
    }
    expect(empties).toEqual([]);
  });
});
