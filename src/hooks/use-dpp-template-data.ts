/**
 * Shared hook for DPP template components.
 *
 * Centralises visibility checks, section ordering (respecting DPP Design Settings),
 * design resolution, computed styles, and i18n — eliminating duplication across
 * all 11 template files.
 */

import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { isFieldVisibleForView, type VisibilityConfigV2 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings, DPPSectionId } from '@/types/database';
import { getTranslatedProduct } from '@/hooks/use-public-product';
import {
  resolveDesign,
  getCardStyle,
  getHeadingStyle,
  getHeroStyle,
  getSectionOrder,
  isSectionVisible,
  isSectionCollapsed,
  type ResolvedDPPDesign,
} from '@/lib/dpp-design-utils';
import { hasSupportContent } from '@/lib/dpp-template-helpers';

// ============================================
// TYPES
// ============================================

export interface RenderableSection {
  id: DPPSectionId;
  defaultCollapsed: boolean;
}

export interface DPPTemplateStyles {
  card: CSSProperties;
  heading: CSSProperties;
  hero: { style: CSSProperties; overlayStyle?: CSSProperties } | null;
}

export interface DPPTemplateData {
  /** Field-level visibility check. Returns true when a field should be shown. */
  isFieldVisible: (field: string) => boolean;

  /**
   * Consumer sections that should be rendered, in order.
   * Already filtered by: design section visibility, field visibility, and data existence.
   * Only applies to consumer view; customs view renders its own sections directly.
   */
  consumerSections: RenderableSection[];

  /** Whether the support resources have any displayable content. */
  supportHasContent: boolean;

  /** Fully resolved DPP Design (all fields present with defaults). */
  design: ResolvedDPPDesign;

  /** Pre-computed CSS styles from design settings. */
  styles: DPPTemplateStyles;

  /** i18n translation function (`dpp` namespace). */
  t: (key: string, options?: Record<string, unknown>) => string;

  /** Current locale string (e.g. 'en', 'de'). */
  locale: string;

  /** The product being rendered (pass-through convenience). */
  product: Product;

  /** The active view mode (pass-through convenience). */
  view: 'consumer' | 'customs';
}

// ============================================
// SECTION CHECKS (single source of truth)
// ============================================

/**
 * For each DPP section, defines the visibility field key to check and a
 * data-existence predicate. If either check fails the section is excluded.
 */
const SECTION_CHECKS: Record<
  DPPSectionId,
  {
    field: string;
    hasData: (product: Product, supportHasContent: boolean) => boolean;
  }
> = {
  materials: {
    field: 'materials',
    hasData: (p) => p.materials.some(m => !m.type || m.type === 'product'),
  },
  packaging: {
    field: 'packagingMaterials',
    hasData: (p) => p.materials.some(m => m.type === 'packaging'),
  },
  carbonFootprint: {
    field: 'carbonFootprint',
    hasData: (p) => !!p.carbonFootprint,
  },
  recycling: {
    field: 'recyclability',
    hasData: () => true, // recyclability always present on Product
  },
  certifications: {
    field: 'certifications',
    hasData: (p) => p.certifications.length > 0,
  },
  supplyChain: {
    field: 'supplyChainSimple',
    hasData: (p) => p.supplyChain.length > 0,
  },
  support: {
    field: 'supportResources',
    hasData: (_p, sh) => sh,
  },
  components: {
    field: 'setComponents',
    hasData: (p) => p.productType === 'set' && (p.components?.length ?? 0) > 0,
  },
};

// ============================================
// HOOK
// ============================================

export function useDPPTemplateData(
  product: Product,
  visibilityV2: VisibilityConfigV2 | null,
  view: 'consumer' | 'customs',
  dppDesign?: DPPDesignSettings | null,
  primaryColor?: string,
): DPPTemplateData {
  const { t } = useTranslation('dpp');
  const locale = useLocale();

  // 0. Apply translations for current locale
  const translatedProduct = getTranslatedProduct(product, locale);

  // 1. Resolve design (merge with defaults)
  const design = resolveDesign(dppDesign);

  // 2. Build isFieldVisible closure
  const isFieldVisible = (field: string): boolean => {
    if (!visibilityV2) return true;
    return isFieldVisibleForView(visibilityV2, field, view);
  };

  // 3. Pre-compute support content flag
  const supportHasContent = hasSupportContent(translatedProduct.supportResources);

  // 4. Build ordered, filtered consumer sections
  const consumerSections: RenderableSection[] = getSectionOrder(design)
    .filter((id) => {
      const check = SECTION_CHECKS[id];
      return (
        isSectionVisible(design, id) &&
        isFieldVisible(check.field) &&
        check.hasData(translatedProduct, supportHasContent)
      );
    })
    .map((id) => ({
      id,
      defaultCollapsed: isSectionCollapsed(design, id),
    }));

  // 5. Compute styles
  const pc = primaryColor || '#3B82F6';
  const styles: DPPTemplateStyles = {
    card: getCardStyle(design.cards),
    heading: getHeadingStyle(design.typography, design.colors),
    hero: design.hero.visible
      ? getHeroStyle(design.hero, pc, design.colors.secondaryColor)
      : null,
  };

  return {
    isFieldVisible,
    consumerSections,
    supportHasContent,
    design,
    styles,
    t,
    locale,
    product: translatedProduct,
    view,
  };
}
