/**
 * Map a variant title (typically a Shopify variant title like "rose", "beige",
 * "white", or a richer string like "Rose Gold Matte") to a hex color so the UI
 * can render a swatch dot next to it. Recognizes common German and English
 * color names. Returns null for unrecognized variants so callers can fall back
 * to a plain text badge.
 */

const VARIANT_COLOR_HEX: Record<string, string> = {
  rose: '#F472B6',
  rosé: '#F472B6',
  rosa: '#F472B6',
  pink: '#EC4899',
  magenta: '#D946EF',
  beige: '#D6B98C',
  sand: '#D6B98C',
  creme: '#F5E8D0',
  cream: '#F5E8D0',
  white: '#FFFFFF',
  weiß: '#FFFFFF',
  weiss: '#FFFFFF',
  black: '#1F2937',
  schwarz: '#1F2937',
  gray: '#9CA3AF',
  grey: '#9CA3AF',
  grau: '#9CA3AF',
  silver: '#C0C0C0',
  blue: '#3B82F6',
  blau: '#3B82F6',
  navy: '#1E3A8A',
  red: '#EF4444',
  rot: '#EF4444',
  green: '#10B981',
  grün: '#10B981',
  gruen: '#10B981',
  yellow: '#FBBF24',
  gelb: '#FBBF24',
  orange: '#F97316',
  purple: '#A855F7',
  lila: '#A855F7',
  violett: '#8B5CF6',
  violet: '#8B5CF6',
  brown: '#92400E',
  braun: '#92400E',
  gold: '#D4AF37',
  copper: '#B87333',
  bronze: '#CD7F32',
  natur: '#C4A484',
  natural: '#C4A484',
};

export function getVariantColorHex(variantTitle?: string | null): string | null {
  if (!variantTitle) return null;
  const v = variantTitle.toLowerCase().trim();
  if (VARIANT_COLOR_HEX[v]) return VARIANT_COLOR_HEX[v];
  // Substring match for longer titles like "Rose Gold" or "200g - Beige".
  for (const key of Object.keys(VARIANT_COLOR_HEX)) {
    if (v.includes(key)) return VARIANT_COLOR_HEX[key];
  }
  return null;
}
