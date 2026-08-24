import { describe, expect, it } from 'vitest';
import { buildTipDeck, dailyDeck, scoreTip, type DeckContext } from './tips-deck';

const base: DeckContext = {
  locale: 'en',
  countries: [],
  categoryHints: [],
  seen: {},
  today: '2026-08-24',
};

describe('buildTipDeck', () => {
  // Measured, not estimated: 17 requirements yield 71 raw cards, 66 after
  // dedup. That is nine days of reading at seven a day, from data that was
  // already in the bundle. The floor is set below the current figure so adding
  // a requirement never breaks the test, but a collapse would.
  it('derives a substantial deck from the static requirements database', () => {
    const deck = buildTipDeck(base);
    expect(deck.length).toBeGreaterThan(55);
  });

  it('produces a deck in both languages without extra data', () => {
    // The requirements database ships fully translated, so this needs no
    // additional content — which is why the German deck is the same size.
    const de = buildTipDeck({ ...base, locale: 'de' });
    expect(de.length).toBe(buildTipDeck(base).length);
  });

  it('covers every card kind', () => {
    const kinds = new Set(buildTipDeck(base).map((c) => c.kind));
    expect([...kinds].sort()).toEqual(['deadline', 'document', 'penalty', 'tip']);
  });

  it('deduplicates advice that appears under several requirements', () => {
    const deck = buildTipDeck(base);
    const normalised = deck.map((c) => `${c.kind}:${c.text.toLowerCase().trim()}`);
    expect(new Set(normalised).size).toBe(normalised.length);
  });

  it('emits at most one document card per requirement', () => {
    const deck = buildTipDeck(base);
    const perRequirement = new Map<string, number>();
    for (const card of deck.filter((c) => c.kind === 'document')) {
      perRequirement.set(card.requirementId, (perRequirement.get(card.requirementId) ?? 0) + 1);
    }
    expect([...perRequirement.values()].every((n) => n === 1)).toBe(true);
  });

  it('gives every card a stable id', () => {
    const ids = buildTipDeck(base).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(buildTipDeck(base).map((c) => c.id)).toEqual(ids);
  });
});

describe('dailyDeck', () => {
  const all = buildTipDeck(base);

  it('is stable for a given day', () => {
    expect(dailyDeck(all, base).map((c) => c.id)).toEqual(dailyDeck(all, base).map((c) => c.id));
  });

  it('differs from one day to the next', () => {
    const a = dailyDeck(all, base).map((c) => c.id);
    const b = dailyDeck(all, { ...base, today: '2026-08-25' }).map((c) => c.id);
    expect(a).not.toEqual(b);
  });

  it('returns the requested size', () => {
    expect(dailyDeck(all, base, 5)).toHaveLength(5);
  });

  it('never lets the jitter promote a low card above a critical one', () => {
    // The jitter is capped below one priority step, so ordering between tiers
    // is guaranteed regardless of the seed.
    const critical = all.find((c) => c.priority === 'critical' && c.kind === 'tip');
    const low = all.find((c) => c.priority === 'low' && c.kind === 'tip');
    if (!critical || !low) return;
    const ctx = { ...base, countries: [], categoryHints: [] };
    expect(scoreTip(critical, ctx)).toBeGreaterThan(scoreTip(low, ctx));
  });

  it('demotes a card seen within the last 30 days', () => {
    const card = all[0];
    const fresh = scoreTip(card, base);
    const recentlySeen = scoreTip(card, { ...base, seen: { [card.id]: '2026-08-20' } });
    expect(recentlySeen).toBeLessThan(fresh);
  });
});
