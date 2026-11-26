/**
 * App styles: per-device visual presets for the whole authenticated app.
 *
 * A style only re-tones the neutral surface tokens (background, cards, muted,
 * borders, sidebar, radius). It never touches --primary / --ring, so tenant
 * branding keeps working on top of every style. Each style ships a light and
 * a dark variant; `app-styles.test.ts` enforces WCAG contrast for every text
 * pair so no combination can end up white-on-white.
 *
 * Sidebars stay dark in every style on purpose: the sidebar logo and the
 * shell's icon colours are designed for a dark sidebar.
 */

export type AppStyleId = 'standard' | 'paper' | 'graphite' | 'sage' | 'midnight';

export interface AppStyleTokens {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  secondary: string;
  secondaryForeground: string;
  border: string;
  sidebar: string;
  sidebarForeground: string;
  sidebarAccent: string;
  sidebarBorder: string;
}

export interface AppStyleDefinition {
  id: AppStyleId;
  /** i18n key (settings namespace) */
  name: string;
  /** i18n key (settings namespace) */
  description: string;
  radius: string;
  light: AppStyleTokens;
  dark: AppStyleTokens;
}

/** Mirrors the base tokens in src/index.css; never emitted as CSS. */
const STANDARD: AppStyleDefinition = {
  id: 'standard',
  name: 'Standard',
  description: 'Cool slate with a deep navy sidebar',
  radius: '0.5rem',
  light: {
    background: '#F8FAFC', foreground: '#0F172A', card: '#FFFFFF', cardForeground: '#0F172A',
    muted: '#F1F5F9', mutedForeground: '#64748B', secondary: '#F1F5F9', secondaryForeground: '#1E293B',
    border: '#E2E8F0', sidebar: '#0F172A', sidebarForeground: '#F8FAFC', sidebarAccent: '#1E293B',
    sidebarBorder: '#1E293B',
  },
  dark: {
    background: '#0F172A', foreground: '#F8FAFC', card: '#1E293B', cardForeground: '#F8FAFC',
    muted: '#334155', mutedForeground: '#94A3B8', secondary: '#334155', secondaryForeground: '#F8FAFC',
    border: '#334155', sidebar: '#020617', sidebarForeground: '#F8FAFC', sidebarAccent: '#1E293B',
    sidebarBorder: '#1E293B',
  },
};

export const APP_STYLES: readonly AppStyleDefinition[] = [
  STANDARD,
  {
    id: 'paper',
    name: 'Paper',
    description: 'Warm, calm and softly rounded',
    radius: '0.75rem',
    light: {
      background: '#FAFAF9', foreground: '#1C1917', card: '#FFFFFF', cardForeground: '#1C1917',
      muted: '#F5F5F4', mutedForeground: '#57534E', secondary: '#F5F5F4', secondaryForeground: '#292524',
      border: '#E7E5E4', sidebar: '#1C1917', sidebarForeground: '#FAFAF9', sidebarAccent: '#292524',
      sidebarBorder: '#292524',
    },
    dark: {
      background: '#0C0A09', foreground: '#FAFAF9', card: '#1C1917', cardForeground: '#FAFAF9',
      muted: '#292524', mutedForeground: '#A8A29E', secondary: '#292524', secondaryForeground: '#FAFAF9',
      border: '#3A3532', sidebar: '#0C0A09', sidebarForeground: '#FAFAF9', sidebarAccent: '#1C1917',
      sidebarBorder: '#1C1917',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Neutral, crisp lines and tight corners',
    radius: '0.375rem',
    light: {
      background: '#F4F4F5', foreground: '#09090B', card: '#FFFFFF', cardForeground: '#09090B',
      muted: '#EDEDEF', mutedForeground: '#52525B', secondary: '#EDEDEF', secondaryForeground: '#18181B',
      border: '#D4D4D8', sidebar: '#18181B', sidebarForeground: '#FAFAFA', sidebarAccent: '#27272A',
      sidebarBorder: '#27272A',
    },
    dark: {
      background: '#09090B', foreground: '#FAFAFA', card: '#18181B', cardForeground: '#FAFAFA',
      muted: '#27272A', mutedForeground: '#A1A1AA', secondary: '#27272A', secondaryForeground: '#FAFAFA',
      border: '#3F3F46', sidebar: '#000000', sidebarForeground: '#FAFAFA', sidebarAccent: '#18181B',
      sidebarBorder: '#18181B',
    },
  },
  {
    id: 'sage',
    name: 'Sage',
    description: 'Natural green tones, gentle and organic',
    radius: '0.875rem',
    light: {
      background: '#F4F6F3', foreground: '#14201A', card: '#FFFFFF', cardForeground: '#14201A',
      muted: '#E9EEE8', mutedForeground: '#4A5A50', secondary: '#E9EEE8', secondaryForeground: '#1E2B24',
      border: '#D8E0D6', sidebar: '#14251C', sidebarForeground: '#F1F5F0', sidebarAccent: '#1F3529',
      sidebarBorder: '#1F3529',
    },
    dark: {
      background: '#0D1611', foreground: '#EEF3EE', card: '#15211A', cardForeground: '#EEF3EE',
      muted: '#1F2E25', mutedForeground: '#9DB0A3', secondary: '#1F2E25', secondaryForeground: '#EEF3EE',
      border: '#2A3B31', sidebar: '#08100B', sidebarForeground: '#EEF3EE', sidebarAccent: '#15211A',
      sidebarBorder: '#15211A',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Deep indigo, elegant and focused',
    radius: '0.625rem',
    light: {
      background: '#F5F6FB', foreground: '#111633', card: '#FFFFFF', cardForeground: '#111633',
      muted: '#ECEEF7', mutedForeground: '#4E557A', secondary: '#ECEEF7', secondaryForeground: '#1B2148',
      border: '#DDE0EE', sidebar: '#161A3A', sidebarForeground: '#F3F4FB', sidebarAccent: '#22285A',
      sidebarBorder: '#22285A',
    },
    dark: {
      background: '#0B0E24', foreground: '#F3F4FB', card: '#141838', cardForeground: '#F3F4FB',
      muted: '#1E2350', mutedForeground: '#A3A8CC', secondary: '#1E2350', secondaryForeground: '#F3F4FB',
      border: '#2B3166', sidebar: '#070918', sidebarForeground: '#F3F4FB', sidebarAccent: '#141838',
      sidebarBorder: '#141838',
    },
  },
];

export const APP_STYLE_KEY = 'app-style';
const STYLE_ELEMENT_ID = 'app-style-tokens';
const CHANGE_EVENT = 'app-style-change';

function hexToRgbTriplet(hex: string): string {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
}

function tokensToCss(t: AppStyleTokens, radius?: string): string {
  return [
    radius ? `--radius: ${radius};` : '',
    `--background: ${t.background};`,
    `--foreground: ${t.foreground};`,
    `--card: ${t.card};`,
    `--card-foreground: ${t.cardForeground};`,
    `--card-rgb: ${hexToRgbTriplet(t.card)};`,
    `--popover: ${t.card};`,
    `--popover-foreground: ${t.cardForeground};`,
    `--muted: ${t.muted};`,
    `--muted-foreground: ${t.mutedForeground};`,
    `--secondary: ${t.secondary};`,
    `--secondary-foreground: ${t.secondaryForeground};`,
    `--accent: ${t.secondary};`,
    `--accent-foreground: ${t.secondaryForeground};`,
    `--border: ${t.border};`,
    `--input: ${t.border};`,
    `--sidebar: ${t.sidebar};`,
    `--sidebar-foreground: ${t.sidebarForeground};`,
    `--sidebar-accent: ${t.sidebarAccent};`,
    `--sidebar-accent-foreground: ${t.sidebarForeground};`,
    `--sidebar-border: ${t.sidebarBorder};`,
  ].join('');
}

/**
 * CSS for every non-standard style. `:root[data-app-style=x]` (0,2,0) beats the
 * base `:root`/`.dark` blocks; inline branding on <html> (--primary) still wins.
 */
export function buildAppStyleCss(): string {
  return APP_STYLES.filter((s) => s.id !== 'standard')
    .map(
      (s) =>
        `:root[data-app-style="${s.id}"]{${tokensToCss(s.light, s.radius)}}` +
        `:root[data-app-style="${s.id}"].dark{${tokensToCss(s.dark)}}`
    )
    .join('\n');
}

export function isAppStyleId(value: unknown): value is AppStyleId {
  return typeof value === 'string' && APP_STYLES.some((s) => s.id === value);
}

export function getStoredAppStyle(): AppStyleId {
  try {
    const stored = localStorage.getItem(APP_STYLE_KEY);
    return isAppStyleId(stored) ? stored : 'standard';
  } catch {
    return 'standard';
  }
}

function ensureStyleSheet() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ELEMENT_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ELEMENT_ID;
  el.textContent = buildAppStyleCss();
  document.head.appendChild(el);
}

export function applyAppStyle(id: AppStyleId) {
  if (typeof document === 'undefined') return;
  ensureStyleSheet();
  const root = document.documentElement;
  if (id === 'standard') delete root.dataset.appStyle;
  else root.dataset.appStyle = id;
  // Keep the browser/OS chrome colour in step with the page background.
  const def = APP_STYLES.find((s) => s.id === id) ?? STANDARD;
  const dark = root.classList.contains('dark');
  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', (dark ? def.dark : def.light).background));
}

export function setAppStyle(id: AppStyleId) {
  try {
    localStorage.setItem(APP_STYLE_KEY, id);
  } catch {
    /* private mode: style still applies for this session */
  }
  applyAppStyle(id);
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: id }));
}

export function subscribeAppStyle(listener: (id: AppStyleId) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<AppStyleId>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
