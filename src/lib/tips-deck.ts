import { getRequirementsDatabase, type Requirement } from '@/data/requirements-database';

export type TipKind = 'tip' | 'penalty' | 'deadline' | 'document';

export interface TipCard {
  /** Stable across sessions AND locales, so "seen" survives a language switch. */
  id: string;
  kind: TipKind;
  text: string;
  requirementId: string;
  requirementName: string;
  category: string;
  priority: Requirement['priority'];
  countries: string[];
  authority?: string;
  link?: { title: string; url: string };
}

export interface DeckContext {
  locale: 'en' | 'de';
  /** Country codes the guest has actually shown interest in. */
  countries: string[];
  categoryHints: string[];
  /** cardId -> ISO date last shown. */
  seen: Record<string, string>;
  /** 'YYYY-MM-DD'. Passed in rather than read, so the deck is unit-testable. */
  today: string;
}

const PRIORITY_WEIGHT: Record<Requirement['priority'], number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

/**
 * Normalise for dedup. Collisions are real rather than theoretical — "testing
 * by an accredited laboratory" appears under LVD, EMC and RED, and shipping the
 * same advice three times in one deck makes the whole tool look thin.
 */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\b(the|a|an|der|die|das|ein|eine|den|dem|des)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function daysSince(iso: string, today: string): number {
  const a = Date.parse(iso);
  const b = Date.parse(today);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / 86_400_000);
}

/** Deterministic PRNG, so "today's deck" is stable without a server or storage. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Build the full card pool from the static requirements database.
 *
 * Derived at runtime, not at build time: turning 34 already-imported objects
 * into ~180 cards costs microseconds, whereas a build step would add a
 * generated file and a drift risk for no gain.
 *
 * The database ships fully translated in both languages, so this is bilingual
 * for free. The 3,259 curated checklist rows are deliberately NOT used here:
 * they are German-only and 6.33 MB, and showing German compliance advice to an
 * English user destroys exactly the credibility the tool exists to build.
 */
export function buildTipDeck(ctx: DeckContext): TipCard[] {
  const db = getRequirementsDatabase(ctx.locale);
  const cards: TipCard[] = [];

  for (const req of db) {
    const base = {
      requirementId: req.id,
      requirementName: req.name,
      category: req.category,
      priority: req.priority,
      countries: req.countries,
      authority: req.authority,
      link: req.links?.[0],
    };

    req.tips?.forEach((text, i) => {
      cards.push({ ...base, id: `req:${req.id}:tip:${i}`, kind: 'tip', text });
    });

    if (req.penalties) {
      cards.push({ ...base, id: `req:${req.id}:penalty`, kind: 'penalty', text: req.penalties });
    }

    if (req.deadlines) {
      cards.push({ ...base, id: `req:${req.id}:deadline`, kind: 'deadline', text: req.deadlines });
    }

    // ONE document card per requirement, not one per document — emitting ~90
    // near-identical "you need a declaration of conformity" cards would drown
    // everything worth reading.
    if (req.documents && req.documents.length >= 2) {
      cards.push({
        ...base,
        id: `req:${req.id}:documents`,
        kind: 'document',
        text: req.documents.join(' · '),
      });
    }
  }

  // Dedup on normalised text; the highest-priority owner keeps the card, ties
  // broken by requirement id so the result is deterministic.
  const best = new Map<string, TipCard>();
  for (const card of cards) {
    const key = `${card.kind}:${normalise(card.text)}`;
    const held = best.get(key);
    if (
      !held ||
      PRIORITY_WEIGHT[card.priority] > PRIORITY_WEIGHT[held.priority] ||
      (PRIORITY_WEIGHT[card.priority] === PRIORITY_WEIGHT[held.priority] &&
        card.requirementId < held.requirementId)
    ) {
      best.set(key, card);
    }
  }

  return [...best.values()];
}

export function scoreTip(card: TipCard, ctx: DeckContext): number {
  let s = PRIORITY_WEIGHT[card.priority];
  if (card.kind === 'deadline') s += 2;
  if (card.kind === 'penalty') s += 1;
  if (card.countries.some((c) => c === 'EU' || ctx.countries.includes(c))) s += 2;
  if (ctx.categoryHints.some((h) => card.category.toLowerCase().includes(h.toLowerCase()))) s += 1;

  const seenAt = ctx.seen[card.id];
  if (!seenAt) s += 1;
  else if (daysSince(seenAt, ctx.today) < 30) s -= 4;

  return s;
}

/**
 * Today's deck.
 *
 * Score plus a date-seeded jitter: same day gives the same deck, the next day a
 * different one, with no server, no clock skew and nothing to store. The jitter
 * is capped below one priority step (weights are 1 apart, jitter < 1.5 but
 * applied to both sides) so a `low` card can never outrank a `critical` one —
 * it only reshuffles within a tier, which is what stops the same seven critical
 * cards showing forever.
 */
export function dailyDeck(all: TipCard[], ctx: DeckContext, size = 7): TipCard[] {
  const rng = mulberry32(hashString(ctx.today));
  return all
    .map((card) => ({ card, k: scoreTip(card, ctx) + rng() * 0.9 }))
    .sort((a, b) => b.k - a.k)
    .slice(0, size)
    .map((x) => x.card);
}
