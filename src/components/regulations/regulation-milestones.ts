import type { EURegulation } from '@/types/database';
import { daysUntil, humanizeKey, parseDeadline, type DeadlinePrecision } from './regulation-dates';

export interface Milestone {
  id: string;
  date: Date;
  precision: DeadlinePrecision;
  raw: string;
  /** What becomes due ("Battery passport EV"); null for a regulation's application date. */
  title: string | null;
  /** The regulation it belongs to. */
  regulation: string;
  kind: 'application' | 'dpp';
  days: number;
}

/**
 * Used only when master data carries no machine-readable DPP deadlines at all,
 * so the timeline never renders empty. The battery passport date is fixed in
 * Regulation (EU) 2023/1542 Art. 77; the ESPR rows are working-plan estimates.
 */
const FALLBACK: Array<{ raw: string; title: string; regulation: string }> = [
  { raw: '2027-02-18', title: 'Battery passport (EV, LMT, industrial > 2 kWh)', regulation: 'EU Battery Regulation 2023/1542' },
  { raw: '2027-12-31', title: 'Textiles', regulation: 'ESPR 2024/1781' },
  { raw: '2028-12-31', title: 'Electronics', regulation: 'ESPR 2024/1781' },
  { raw: '2029-06-30', title: 'Furniture', regulation: 'ESPR 2024/1781' },
];

/**
 * Every dated obligation across the EU regulations, soonest first. Prose
 * deadlines ("Before placing on market") and bare years are skipped: they
 * cannot be placed on a timeline honestly.
 */
export function collectMilestones(regulations: EURegulation[], now: Date = new Date()): Milestone[] {
  const out: Milestone[] = [];

  for (const reg of regulations) {
    const app = parseDeadline(reg.applicationDate);
    if (app.date && app.precision && app.precision !== 'year') {
      out.push({
        id: `${reg.id}:application`,
        date: app.date,
        precision: app.precision,
        raw: app.raw,
        title: null,
        regulation: reg.name,
        kind: 'application',
        days: daysUntil(app.date, now),
      });
    }
    for (const [key, value] of Object.entries(reg.dppDeadlines ?? {})) {
      const parsed = parseDeadline(String(value));
      if (!parsed.date || !parsed.precision || parsed.precision === 'year') continue;
      out.push({
        id: `${reg.id}:${key}`,
        date: parsed.date,
        precision: parsed.precision,
        raw: parsed.raw,
        title: humanizeKey(key),
        regulation: reg.name,
        kind: 'dpp',
        days: daysUntil(parsed.date, now),
      });
    }
  }

  if (!out.some((m) => m.kind === 'dpp')) {
    for (const item of FALLBACK) {
      const parsed = parseDeadline(item.raw);
      if (!parsed.date || !parsed.precision) continue;
      out.push({
        id: `fallback:${item.raw}:${item.title}`,
        date: parsed.date,
        precision: parsed.precision,
        raw: parsed.raw,
        title: item.title,
        regulation: item.regulation,
        kind: 'dpp',
        days: daysUntil(parsed.date, now),
      });
    }
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function nextMilestone(milestones: Milestone[]): Milestone | null {
  return milestones.find((m) => m.days > 0) ?? null;
}
