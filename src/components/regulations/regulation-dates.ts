/**
 * Date helpers for the regulations knowledge base.
 *
 * Master data stores deadlines as free text: ISO dates ("2027-02-18"),
 * quarters ("2027-Q3"), bare years ("2027 onwards …") or pure prose
 * ("Before placing on market"). Everything here degrades gracefully so a
 * prose value is shown verbatim instead of turning into "NaN days".
 */

export type DeadlinePrecision = 'day' | 'quarter' | 'year';

export interface ParsedDeadline {
  date: Date | null;
  precision: DeadlinePrecision | null;
  raw: string;
}

/** How urgent a deadline is, relative to today. */
export type DeadlineState = 'inForce' | 'imminent' | 'soon' | 'upcoming' | 'ongoing';

const DAY_MS = 1000 * 60 * 60 * 24;

export function parseDeadline(raw: string | null | undefined): ParsedDeadline {
  const text = (raw ?? '').trim();
  if (!text) return { date: null, precision: null, raw: text };

  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(date.getTime())) return { date, precision: 'day', raw: text };
  }

  const quarter = text.match(/(\d{4})-?Q([1-4])/i);
  if (quarter) {
    const date = new Date(Number(quarter[1]), (Number(quarter[2]) - 1) * 3, 1);
    return { date, precision: 'quarter', raw: text };
  }

  const year = text.match(/\b(19|20)(\d{2})\b/);
  if (year) {
    return { date: new Date(Number(`${year[1]}${year[2]}`), 0, 1), precision: 'year', raw: text };
  }

  return { date: null, precision: null, raw: text };
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.round((startOfDay(date) - startOfDay(now)) / DAY_MS);
}

export function deadlineState(days: number | null): DeadlineState {
  if (days === null) return 'ongoing';
  if (days <= 0) return 'inForce';
  if (days <= 180) return 'imminent';
  if (days <= 365) return 'soon';
  return 'upcoming';
}

/** Short, locale-aware label for a parsed deadline ("18.02.2027", "Q3 2027", "2027"). */
export function formatDeadline(parsed: ParsedDeadline, locale: string): string {
  if (!parsed.date || !parsed.precision) return parsed.raw;
  const d = parsed.date;
  if (parsed.precision === 'quarter') return `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  if (parsed.precision === 'year') return String(d.getFullYear());
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const ACRONYMS = new Set([
  'ev', 'lmt', 'sme', 'pcn', 'ac', 'sf6', 'hfc', 'svhc', 'scip', 'eprel', 'dpp', 'ce', 'eu',
  'weee', 'rohs', 'reach', 'gpsr', 'espr', 'ppwr', 'clp', 'eudr', 'epr', 'ict', 'co2',
]);

/** "battery_passport_ev" -> "Battery passport EV"; free-text keys pass through. */
export function humanizeKey(key: string): string {
  if (/\s/.test(key) || /[A-Z]/.test(key)) return key;
  const words = key.split(/[_-]+/).filter(Boolean).map((w) => (ACRONYMS.has(w) ? w.toUpperCase() : w));
  const sentence = words.join(' ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

/** Share of the way from `start` to `end` that today represents (0–100). */
export function progressBetween(start: Date | null, end: Date | null, now: Date = new Date()): number | null {
  if (!start || !end) return null;
  const span = end.getTime() - start.getTime();
  if (span <= 0) return now >= end ? 100 : 0;
  return Math.min(100, Math.max(0, ((now.getTime() - start.getTime()) / span) * 100));
}
