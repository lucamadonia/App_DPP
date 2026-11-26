/**
 * Deadline helpers shared by the knowledge pages (checklists, market entry,
 * requirements calculator, news).
 *
 * Deadlines arrive in two shapes: ISO dates (news `effectiveDate`) and
 * free-form text from the curated datasets ("Gilt seit 13.12.2024 für alle
 * Verbraucherprodukte", "18.02.2027", "Before first placing on the market").
 * We pull the first recognisable calendar date out of the text so the UI can
 * show "in force" / "in N days" emphasis without changing the data.
 */

export type DeadlineTone = 'past' | 'imminent' | 'soon' | 'upcoming';

const DAY_MS = 86_400_000;

/** Whole days from now until the given date (negative = in the past). */
export function getDaysUntil(date: Date | string, now: Date = new Date()): number {
  const target = typeof date === 'string' ? new Date(date) : date;
  return Math.ceil((target.getTime() - now.getTime()) / DAY_MS);
}

/**
 * Extract the first calendar date from free text. Supports ISO (2027-02-18),
 * German (18.02.2027 / 1.4.2026) and slash (18/02/2027) notation. Returns
 * null when no unambiguous date is present.
 */
export function parseDeadlineDate(text: string | null | undefined): Date | null {
  if (!text) return null;

  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = text.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(Number(dmy[3]), month - 1, day);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

export function getDeadlineTone(days: number): DeadlineTone {
  if (days <= 0) return 'past';
  if (days < 30) return 'imminent';
  if (days < 90) return 'soon';
  return 'upcoming';
}

/** Tailwind classes per tone — tokens only, so every app style and theme works. */
export const DEADLINE_TONE_CLASSES: Record<DeadlineTone, string> = {
  past: 'border-success/25 bg-success/10 text-success',
  imminent: 'border-destructive/30 bg-destructive/10 text-destructive',
  soon: 'border-warning/30 bg-warning/10 text-warning',
  upcoming: 'border-primary/25 bg-primary/10 text-primary',
};
