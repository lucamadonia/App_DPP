/**
 * Shared presentation helpers for the compliance hub pages
 * (/compliance, /compliance/reports, /compliance/settings, /compliance/audit).
 *
 * Tones map to the theme tokens (success / warning / destructive / primary),
 * so every chip and tile follows light/dark mode and the five app styles
 * without hard-coded palette colours.
 */

export type HubTone = 'success' | 'warning' | 'danger' | 'primary' | 'muted';

/** Tinted surface + readable foreground, both from tokens. */
export const TONE_SURFACE: Record<HubTone, string> = {
  success: 'bg-success/10 text-success ring-1 ring-success/25',
  warning: 'bg-warning/10 text-warning ring-1 ring-warning/30',
  danger: 'bg-destructive/10 text-destructive ring-1 ring-destructive/25',
  primary: 'bg-primary/10 text-primary ring-1 ring-primary/20',
  muted: 'bg-muted text-muted-foreground ring-1 ring-border',
};

/** Solid fill for bars / dots. */
export const TONE_FILL: Record<HubTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  primary: 'bg-primary',
  muted: 'bg-muted-foreground/40',
};

/** Stroke colour for SVG rings (uses currentColor on a token text class). */
export const TONE_TEXT: Record<HubTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  primary: 'text-primary',
  muted: 'text-muted-foreground',
};

export type ScoreStatus = 'compliant' | 'pending' | 'non-compliant';

export function scoreStatus(score: number): ScoreStatus {
  if (score >= 80) return 'compliant';
  if (score >= 50) return 'pending';
  return 'non-compliant';
}

export function scoreTone(score: number): HubTone {
  const s = scoreStatus(score);
  return s === 'compliant' ? 'success' : s === 'pending' ? 'warning' : 'danger';
}

/** Whole days from today (local midnight) to the given date. Negative = past. */
export function daysFromToday(date: string | Date, today: Date = new Date()): number {
  const d = typeof date === 'string' ? new Date(date) : date;
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function dateLocaleFor(language: string): string {
  return language.startsWith('de') ? 'de-DE' : 'en-US';
}

/** "2026-04-01" -> "April 2026" in the UI language. */
export function formatMonth(iso: string, dateLocale: string): string {
  const d = new Date(iso.length <= 7 ? `${iso}-01T00:00:00` : `${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
}

/** Day key (YYYY-MM-DD, local) for grouping timelines. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function groupByDay<T extends { createdAt: string }>(items: T[]): Array<{ day: string; items: T[] }> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = dayKey(item.createdAt);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return Array.from(map, ([day, list]) => ({ day, items: list }));
}
