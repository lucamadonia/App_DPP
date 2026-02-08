/**
 * DPP Design Utilities
 *
 * Functions to resolve design settings with defaults,
 * generate CSS styles, and manage section ordering.
 */

import type { CSSProperties } from 'react';
import type {
  DPPDesignSettings,
  DPPSectionId,
  DPPColorSettings,
  DPPTypographySettings,
  DPPHeroSettings,
  DPPCardSettings,
  DPPSectionSettings,
  DPPFooterSettings,
  DPPCustomLayoutSettings,
} from '@/types/database';
import {
  DEFAULT_DPP_DESIGN,
  DEFAULT_CUSTOM_LAYOUT,
  FONT_FAMILY_MAP,
  BORDER_RADIUS_MAP,
  SHADOW_MAP,
  HEADING_FONT_SIZE_MAP,
  BODY_FONT_SIZE_MAP,
  FONT_WEIGHT_MAP,
  HERO_HEIGHT_MAP,
  BORDER_STYLE_MAP,
} from '@/lib/dpp-design-defaults';

// ============================================
// RESOLVED TYPES (all fields required)
// ============================================

export interface ResolvedDPPDesign {
  colors: Required<DPPColorSettings>;
  typography: Required<DPPTypographySettings>;
  hero: Required<DPPHeroSettings>;
  cards: Required<DPPCardSettings>;
  sections: Required<DPPSectionSettings>;
  footer: Required<DPPFooterSettings>;
  preset: string;
  customLayout: Required<DPPCustomLayoutSettings>;
}

// ============================================
// RESOLVE DESIGN (merge with defaults)
// ============================================

export function resolveDesign(design?: DPPDesignSettings | null): ResolvedDPPDesign {
  const d = design || {};
  // Cast defaults to resolved type - all fields are guaranteed present
  const dc = DEFAULT_DPP_DESIGN.colors as Required<typeof DEFAULT_DPP_DESIGN.colors>;
  const dt = DEFAULT_DPP_DESIGN.typography as Required<typeof DEFAULT_DPP_DESIGN.typography>;
  const dh = DEFAULT_DPP_DESIGN.hero as Required<typeof DEFAULT_DPP_DESIGN.hero>;
  const dk = DEFAULT_DPP_DESIGN.cards as Required<typeof DEFAULT_DPP_DESIGN.cards>;
  const ds = DEFAULT_DPP_DESIGN.sections;
  const df = DEFAULT_DPP_DESIGN.footer as Required<typeof DEFAULT_DPP_DESIGN.footer>;
  const dsl = df.socialLinks as Required<NonNullable<typeof df.socialLinks>>;
  const dsc = ds.configs as Required<NonNullable<typeof ds.configs>>;

  return {
    colors: {
      secondaryColor: d.colors?.secondaryColor || dc.secondaryColor,
      accentColor: d.colors?.accentColor || dc.accentColor,
      pageBackground: d.colors?.pageBackground || dc.pageBackground,
      cardBackground: d.colors?.cardBackground || dc.cardBackground,
      textColor: d.colors?.textColor || dc.textColor,
      headingColor: d.colors?.headingColor || dc.headingColor,
    },
    typography: {
      fontFamily: d.typography?.fontFamily || dt.fontFamily,
      headingFontSize: d.typography?.headingFontSize || dt.headingFontSize,
      bodyFontSize: d.typography?.bodyFontSize || dt.bodyFontSize,
      headingFontWeight: d.typography?.headingFontWeight || dt.headingFontWeight,
    },
    hero: {
      visible: d.hero?.visible ?? dh.visible,
      style: d.hero?.style || dh.style,
      height: d.hero?.height || dh.height,
      backgroundImage: d.hero?.backgroundImage || dh.backgroundImage,
      overlayOpacity: d.hero?.overlayOpacity ?? dh.overlayOpacity,
    },
    cards: {
      borderRadius: d.cards?.borderRadius || dk.borderRadius,
      shadowDepth: d.cards?.shadowDepth || dk.shadowDepth,
      borderStyle: d.cards?.borderStyle || dk.borderStyle,
      backgroundOpacity: d.cards?.backgroundOpacity ?? dk.backgroundOpacity,
    },
    sections: {
      order: d.sections?.order || ds.order as DPPSectionId[],
      configs: {
        materials: { ...dsc.materials, ...d.sections?.configs?.materials },
        carbonFootprint: { ...dsc.carbonFootprint, ...d.sections?.configs?.carbonFootprint },
        recycling: { ...dsc.recycling, ...d.sections?.configs?.recycling },
        certifications: { ...dsc.certifications, ...d.sections?.configs?.certifications },
        supplyChain: { ...dsc.supplyChain, ...d.sections?.configs?.supplyChain },
        support: { ...dsc.support, ...d.sections?.configs?.support },
      },
    },
    footer: {
      legalNoticeUrl: d.footer?.legalNoticeUrl || df.legalNoticeUrl,
      privacyPolicyUrl: d.footer?.privacyPolicyUrl || df.privacyPolicyUrl,
      showPoweredBy: d.footer?.showPoweredBy ?? df.showPoweredBy,
      socialLinks: {
        website: d.footer?.socialLinks?.website || dsl.website,
        instagram: d.footer?.socialLinks?.instagram || dsl.instagram,
        linkedin: d.footer?.socialLinks?.linkedin || dsl.linkedin,
        twitter: d.footer?.socialLinks?.twitter || dsl.twitter,
      },
    },
    preset: d.preset || DEFAULT_DPP_DESIGN.preset,
    customLayout: {
      layoutMode: d.customLayout?.layoutMode || DEFAULT_CUSTOM_LAYOUT.layoutMode,
      sectionStyle: d.customLayout?.sectionStyle || DEFAULT_CUSTOM_LAYOUT.sectionStyle,
      headerStyle: d.customLayout?.headerStyle || DEFAULT_CUSTOM_LAYOUT.headerStyle,
      showSectionDividers: d.customLayout?.showSectionDividers ?? DEFAULT_CUSTOM_LAYOUT.showSectionDividers,
      compactMode: d.customLayout?.compactMode ?? DEFAULT_CUSTOM_LAYOUT.compactMode,
    },
  };
}

// ============================================
// STYLE GENERATORS
// ============================================

export function getCardStyle(cards: ResolvedDPPDesign['cards']): CSSProperties {
  const opacity = cards.backgroundOpacity / 100;
  return {
    borderRadius: BORDER_RADIUS_MAP[cards.borderRadius],
    boxShadow: SHADOW_MAP[cards.shadowDepth],
    border: BORDER_STYLE_MAP[cards.borderStyle],
    backgroundColor: opacity < 1
      ? `rgba(255, 255, 255, ${opacity})`
      : undefined,
  };
}

export function getHeroStyle(
  hero: ResolvedDPPDesign['hero'],
  primaryColor: string,
  secondaryColor: string,
): { style: CSSProperties; overlayStyle?: CSSProperties } {
  const heightValue = HERO_HEIGHT_MAP[hero.height];

  const baseStyle: CSSProperties = {
    minHeight: heightValue,
  };

  switch (hero.style) {
    case 'gradient':
      return {
        style: {
          ...baseStyle,
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
          color: '#FFFFFF',
        },
      };
    case 'solid':
      return {
        style: {
          ...baseStyle,
          backgroundColor: primaryColor,
          color: '#FFFFFF',
        },
      };
    case 'image':
      return {
        style: {
          ...baseStyle,
          backgroundImage: hero.backgroundImage ? `url(${hero.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        },
        overlayStyle: {
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(0, 0, 0, ${hero.overlayOpacity / 100})`,
        },
      };
    case 'minimal':
      return {
        style: {
          ...baseStyle,
          backgroundColor: 'transparent',
          minHeight: HERO_HEIGHT_MAP.compact,
        },
      };
    default:
      return { style: baseStyle };
  }
}

export function getTextStyle(
  typo: ResolvedDPPDesign['typography'],
  colors: ResolvedDPPDesign['colors'],
): CSSProperties {
  return {
    fontFamily: FONT_FAMILY_MAP[typo.fontFamily],
    fontSize: BODY_FONT_SIZE_MAP[typo.bodyFontSize],
    color: colors.textColor,
  };
}

export function getHeadingStyle(
  typo: ResolvedDPPDesign['typography'],
  colors: ResolvedDPPDesign['colors'],
): CSSProperties {
  return {
    fontFamily: FONT_FAMILY_MAP[typo.fontFamily],
    fontSize: HEADING_FONT_SIZE_MAP[typo.headingFontSize],
    fontWeight: FONT_WEIGHT_MAP[typo.headingFontWeight],
    color: colors.headingColor,
  };
}

export function getPageStyle(
  design: ResolvedDPPDesign,
): CSSProperties {
  return {
    fontFamily: FONT_FAMILY_MAP[design.typography.fontFamily],
    backgroundColor: design.colors.pageBackground,
    color: design.colors.textColor,
  };
}

// ============================================
// SECTION HELPERS
// ============================================

export function getSectionOrder(design: ResolvedDPPDesign): DPPSectionId[] {
  return design.sections.order;
}

export function isSectionVisible(design: ResolvedDPPDesign, id: DPPSectionId): boolean {
  return design.sections.configs[id]?.visible ?? true;
}

export function isSectionCollapsed(design: ResolvedDPPDesign, id: DPPSectionId): boolean {
  return design.sections.configs[id]?.defaultCollapsed ?? false;
}
