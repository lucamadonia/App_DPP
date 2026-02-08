/**
 * DPP Design Defaults & Presets
 *
 * Default values, theme presets, and CSS mapping constants
 * for the DPP public page customization system.
 */

import type { DPPDesignSettings, DPPCustomLayoutSettings } from '@/types/database';

// ============================================
// DEFAULT DESIGN SETTINGS
// ============================================

export const DEFAULT_CUSTOM_LAYOUT: Required<DPPCustomLayoutSettings> = {
  layoutMode: 'single-column',
  sectionStyle: 'card',
  headerStyle: 'icon-left',
  showSectionDividers: false,
  compactMode: false,
};

export const DEFAULT_DPP_DESIGN: Required<DPPDesignSettings> = {
  colors: {
    secondaryColor: '#10B981',
    accentColor: '#F59E0B',
    pageBackground: '#F9FAFB',
    cardBackground: '#FFFFFF',
    textColor: '#374151',
    headingColor: '#111827',
  },
  typography: {
    fontFamily: 'system',
    headingFontSize: 'medium',
    bodyFontSize: 'medium',
    headingFontWeight: 'bold',
  },
  hero: {
    visible: true,
    style: 'gradient',
    height: 'normal',
    backgroundImage: '',
    overlayOpacity: 60,
  },
  cards: {
    borderRadius: 'large',
    shadowDepth: 'subtle',
    borderStyle: 'thin',
    backgroundOpacity: 100,
  },
  sections: {
    order: ['materials', 'packaging', 'carbonFootprint', 'recycling', 'certifications', 'supplyChain', 'support', 'components'],
    configs: {
      materials: { visible: true, defaultCollapsed: false },
      packaging: { visible: true, defaultCollapsed: false },
      carbonFootprint: { visible: true, defaultCollapsed: false },
      recycling: { visible: true, defaultCollapsed: false },
      certifications: { visible: true, defaultCollapsed: false },
      supplyChain: { visible: true, defaultCollapsed: false },
      support: { visible: true, defaultCollapsed: false },
      components: { visible: true, defaultCollapsed: false },
    },
  },
  footer: {
    legalNoticeUrl: '',
    privacyPolicyUrl: '',
    showPoweredBy: true,
    socialLinks: {
      website: '',
      instagram: '',
      linkedin: '',
      twitter: '',
    },
  },
  preset: 'custom',
  customLayout: DEFAULT_CUSTOM_LAYOUT,
};

// ============================================
// THEME PRESETS
// ============================================

export interface DPPThemePreset {
  name: string;
  description: string;
  preview: { primary: string; secondary: string; accent: string };
  settings: Partial<DPPDesignSettings>;
}

export const DPP_THEME_PRESETS: Record<string, DPPThemePreset> = {
  ocean: {
    name: 'Ocean',
    description: 'Cool blues and teals',
    preview: { primary: '#0EA5E9', secondary: '#06B6D4', accent: '#14B8A6' },
    settings: {
      colors: {
        secondaryColor: '#06B6D4',
        accentColor: '#14B8A6',
        pageBackground: '#F0F9FF',
        cardBackground: '#FFFFFF',
        textColor: '#334155',
        headingColor: '#0C4A6E',
      },
      cards: { borderRadius: 'large', shadowDepth: 'medium', borderStyle: 'none', backgroundOpacity: 100 },
      hero: { visible: true, style: 'gradient', height: 'normal' },
    },
  },
  forest: {
    name: 'Forest',
    description: 'Natural greens and emeralds',
    preview: { primary: '#10B981', secondary: '#059669', accent: '#D97706' },
    settings: {
      colors: {
        secondaryColor: '#059669',
        accentColor: '#D97706',
        pageBackground: '#F0FDF4',
        cardBackground: '#FFFFFF',
        textColor: '#374151',
        headingColor: '#064E3B',
      },
      cards: { borderRadius: 'medium', shadowDepth: 'subtle', borderStyle: 'thin', backgroundOpacity: 100 },
      hero: { visible: true, style: 'gradient', height: 'normal' },
    },
  },
  sunset: {
    name: 'Sunset',
    description: 'Warm oranges and ambers',
    preview: { primary: '#F97316', secondary: '#EF4444', accent: '#F59E0B' },
    settings: {
      colors: {
        secondaryColor: '#EF4444',
        accentColor: '#F59E0B',
        pageBackground: '#FFFBEB',
        cardBackground: '#FFFFFF',
        textColor: '#44403C',
        headingColor: '#7C2D12',
      },
      cards: { borderRadius: 'large', shadowDepth: 'medium', borderStyle: 'none', backgroundOpacity: 100 },
      hero: { visible: true, style: 'gradient', height: 'tall' },
    },
  },
  midnight: {
    name: 'Midnight',
    description: 'Dark indigos and purples',
    preview: { primary: '#8B5CF6', secondary: '#6366F1', accent: '#EC4899' },
    settings: {
      colors: {
        secondaryColor: '#6366F1',
        accentColor: '#EC4899',
        pageBackground: '#F5F3FF',
        cardBackground: '#FFFFFF',
        textColor: '#374151',
        headingColor: '#312E81',
      },
      cards: { borderRadius: 'large', shadowDepth: 'strong', borderStyle: 'none', backgroundOpacity: 100 },
      hero: { visible: true, style: 'gradient', height: 'tall' },
    },
  },
  corporate: {
    name: 'Corporate',
    description: 'Professional slates and blues',
    preview: { primary: '#3B82F6', secondary: '#64748B', accent: '#0EA5E9' },
    settings: {
      colors: {
        secondaryColor: '#64748B',
        accentColor: '#0EA5E9',
        pageBackground: '#F8FAFC',
        cardBackground: '#FFFFFF',
        textColor: '#475569',
        headingColor: '#1E293B',
      },
      cards: { borderRadius: 'small', shadowDepth: 'subtle', borderStyle: 'thin', backgroundOpacity: 100 },
      hero: { visible: true, style: 'solid', height: 'compact' },
      typography: { headingFontWeight: 'semibold' },
    },
  },
  minimal: {
    name: 'Minimal',
    description: 'Clean grays, no distractions',
    preview: { primary: '#6B7280', secondary: '#9CA3AF', accent: '#6B7280' },
    settings: {
      colors: {
        secondaryColor: '#9CA3AF',
        accentColor: '#6B7280',
        pageBackground: '#FFFFFF',
        cardBackground: '#F9FAFB',
        textColor: '#4B5563',
        headingColor: '#1F2937',
      },
      cards: { borderRadius: 'small', shadowDepth: 'none', borderStyle: 'thin', backgroundOpacity: 100 },
      hero: { visible: true, style: 'minimal', height: 'compact' },
      typography: { headingFontWeight: 'semibold' },
    },
  },
};

// ============================================
// CSS MAPPING CONSTANTS
// ============================================

export const FONT_FAMILY_MAP: Record<string, string> = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  Inter: '"Inter", sans-serif',
  Roboto: '"Roboto", sans-serif',
  Poppins: '"Poppins", sans-serif',
  Merriweather: '"Merriweather", serif',
  'Playfair Display': '"Playfair Display", serif',
};

export const GOOGLE_FONT_URLS: Record<string, string> = {
  Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap',
  Poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
  Merriweather: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700;900&display=swap',
  'Playfair Display': 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap',
};

export const BORDER_RADIUS_MAP: Record<string, string> = {
  none: '0',
  small: '0.375rem',
  medium: '0.75rem',
  large: '1rem',
  full: '1.5rem',
};

export const SHADOW_MAP: Record<string, string> = {
  none: 'none',
  subtle: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  medium: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  strong: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
};

export const HEADING_FONT_SIZE_MAP: Record<string, string> = {
  small: '1.25rem',
  medium: '1.5rem',
  large: '1.875rem',
};

export const BODY_FONT_SIZE_MAP: Record<string, string> = {
  small: '0.8125rem',
  medium: '0.875rem',
  large: '1rem',
};

export const FONT_WEIGHT_MAP: Record<string, string> = {
  normal: '400',
  semibold: '600',
  bold: '700',
  extrabold: '800',
};

export const HERO_HEIGHT_MAP: Record<string, string> = {
  compact: '6rem',
  normal: '10rem',
  tall: '14rem',
};

export const BORDER_STYLE_MAP: Record<string, string> = {
  none: 'none',
  thin: '1px solid rgb(0 0 0 / 0.1)',
  thick: '2px solid rgb(0 0 0 / 0.15)',
};
