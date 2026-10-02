import { describe, expect, it } from 'vitest';
import { formatEur } from './landing-format';

// Intl may use a narrow no-break space before the euro sign; normalise it.
const norm = (s: string) => s.replace(/\u00a0|\u202f/g, ' ');

describe('formatEur', () => {
  it('formats whole German prices without cents and with the euro sign after', () => {
    expect(norm(formatEur(49, 'de'))).toBe('49 €');
  });

  it('formats per-credit prices with a decimal comma in German', () => {
    expect(norm(formatEur(0.18, 'de'))).toBe('0,18 €');
    expect(norm(formatEur(0.145, 'de'))).toBe('0,145 €');
  });

  it('formats English prices with the euro sign first', () => {
    expect(norm(formatEur(49, 'en'))).toBe('€49');
    expect(norm(formatEur(0.18, 'en-GB'))).toBe('€0.18');
  });
});
