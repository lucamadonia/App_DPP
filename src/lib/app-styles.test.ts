import { describe, it, expect } from 'vitest';
import { APP_STYLES, buildAppStyleCss, type AppStyleTokens } from './app-styles';

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Flatten `fg` at `alpha` over `bg` (e.g. text-sidebar-foreground/60). */
function blend(fg: string, bg: string, alpha: number): string {
  const p = (hex: string) => [0, 2, 4].map((i) => parseInt(hex.replace('#', '').slice(i, i + 2), 16));
  const [f, b] = [p(fg), p(bg)];
  return '#' + f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('');
}

const TEXT_PAIRS: Array<[keyof AppStyleTokens, keyof AppStyleTokens]> = [
  ['foreground', 'background'],
  ['foreground', 'muted'],
  ['cardForeground', 'card'],
  ['mutedForeground', 'background'],
  ['mutedForeground', 'card'],
  ['mutedForeground', 'muted'],
  ['secondaryForeground', 'secondary'],
  ['sidebarForeground', 'sidebar'],
  ['sidebarForeground', 'sidebarAccent'],
];

const customStyles = APP_STYLES.filter((s) => s.id !== 'standard');

describe('app styles', () => {
  it('ships four selectable styles besides the standard look', () => {
    expect(customStyles).toHaveLength(4);
    expect(new Set(APP_STYLES.map((s) => s.id)).size).toBe(APP_STYLES.length);
  });

  for (const style of customStyles) {
    for (const mode of ['light', 'dark'] as const) {
      const t = style[mode];

      it(`${style.id}/${mode}: every text pair meets WCAG AA (4.5:1)`, () => {
        for (const [fg, bg] of TEXT_PAIRS) {
          const ratio = contrast(t[fg], t[bg]);
          expect(ratio, `${fg} on ${bg} = ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(4.5);
        }
      });

      it(`${style.id}/${mode}: dimmed sidebar text (60%) stays readable`, () => {
        const dimmed = blend(t.sidebarForeground, t.sidebar, 0.6);
        expect(contrast(dimmed, t.sidebar)).toBeGreaterThanOrEqual(4.5);
      });

      it(`${style.id}/${mode}: cards and borders stay distinguishable`, () => {
        expect(contrast(t.border, t.card)).toBeGreaterThan(1.1);
        expect(t.card).not.toBe(t.foreground);
      });

      it(`${style.id}/${mode}: the default brand blue stays visible on the page`, () => {
        expect(contrast('#3B82F6', t.background)).toBeGreaterThanOrEqual(3);
        expect(contrast('#3B82F6', t.card)).toBeGreaterThanOrEqual(3);
      });
    }
  }

  it('keeps the polarity: light variants are light, dark variants are dark', () => {
    for (const style of APP_STYLES) {
      expect(luminance(style.light.background)).toBeGreaterThan(0.8);
      expect(luminance(style.dark.background)).toBeLessThan(0.05);
      // Sidebars stay dark everywhere (logo and shell icons expect it).
      expect(luminance(style.light.sidebar)).toBeLessThan(0.05);
    }
  });

  it('never overrides the tenant brand colour', () => {
    const css = buildAppStyleCss();
    expect(css).not.toMatch(/--primary\s*:/);
    expect(css).not.toMatch(/--ring\s*:/);
    expect(css).toContain(':root[data-app-style="sage"].dark{');
  });
});
