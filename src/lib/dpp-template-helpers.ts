/**
 * Shared constants and helpers for DPP template components.
 */

import type { SupportResources } from '@/types/database';
import type { Material, Product } from '@/types/product';

// ============================================
// RATING COLOR MAPS
// ============================================

/** Solid background colors (Classic, Compact, Retail, Accessible, Government, etc.) */
export const RATING_BG_COLORS: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-lime-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  E: 'bg-red-500',
};

/** Gradient classes for Modern template */
export const RATING_GRADIENT_COLORS: Record<string, string> = {
  A: 'from-green-400 to-green-600',
  B: 'from-lime-400 to-lime-600',
  C: 'from-yellow-400 to-yellow-600',
  D: 'from-orange-400 to-orange-600',
  E: 'from-red-400 to-red-600',
};

/** Text-only colors for Premium (dark theme) */
export const RATING_TEXT_COLORS: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-lime-400',
  C: 'text-yellow-400',
  D: 'text-orange-400',
  E: 'text-red-400',
};

/** EcoFriendly variant (green-shifted A/B) */
export const RATING_ECO_COLORS: Record<string, string> = {
  A: 'bg-green-600',
  B: 'bg-green-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  E: 'bg-red-500',
};

/** Star count per rating for Retail template */
export const RATING_STARS: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
};

/** Human-readable rating descriptions (i18n keys) */
export const RATING_DESCRIPTIONS: Record<string, string> = {
  A: 'Excellent - well below average',
  B: 'Good - below average',
  C: 'Average',
  D: 'Above average',
  E: 'Well above average',
};

// ============================================
// SUPPORT CONTENT CHECK
// ============================================

// ============================================
// MATERIAL TYPE FILTERS
// ============================================

/** Returns product materials (type === 'product' or no type set for backward compat). */
export function getProductMaterials(product: Product): Material[] {
  return product.materials.filter(m => !m.type || m.type === 'product');
}

/** Returns packaging materials (type === 'packaging'). */
export function getPackagingMaterials(product: Product): Material[] {
  return product.materials.filter(m => m.type === 'packaging');
}

// ============================================
// SUPPORT CONTENT CHECK
// ============================================

/** Returns true if supportResources has any displayable content. */
export function hasSupportContent(sr: SupportResources | undefined): boolean {
  if (!sr) return false;
  return !!(
    sr.instructions ||
    sr.assemblyGuide ||
    (sr.videos && sr.videos.length > 0) ||
    (sr.faq && sr.faq.length > 0) ||
    sr.warranty ||
    sr.repairInfo ||
    (sr.spareParts && sr.spareParts.length > 0)
  );
}
