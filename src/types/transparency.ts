export interface TransparencyProductEntry {
  product_id: string;
  enabled: boolean;
}

export type TransparencyThemePreset = 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight' | 'corporate' | 'minimal';
export type TransparencyFontFamily = 'dm-serif' | 'system' | 'inter' | 'poppins' | 'playfair' | 'merriweather';
export type TransparencyHeroStyle = 'gradient' | 'solid' | 'image' | 'minimal';
export type TransparencyCardStyle = 'rounded' | 'sharp' | 'soft';
export type TransparencyColorScheme = 'light' | 'dark' | 'auto';

export interface TransparencyDesignSettings {
  preset: TransparencyThemePreset;
  primaryColor: string | null; // null = use tenant branding color
  colorScheme: TransparencyColorScheme;
  fontFamily: TransparencyFontFamily;
  heroStyle: TransparencyHeroStyle;
  heroOverlayOpacity: number; // 0-100
  cardStyle: TransparencyCardStyle;
  cardShadow: 'none' | 'subtle' | 'medium' | 'strong';
  showPoweredBy: boolean;
  accentColor: string | null;
  pageBackground: string | null;
  cardBackground: string | null;
}

export const DEFAULT_TRANSPARENCY_DESIGN: TransparencyDesignSettings = {
  preset: 'default',
  primaryColor: null,
  colorScheme: 'light',
  fontFamily: 'dm-serif',
  heroStyle: 'gradient',
  heroOverlayOpacity: 30,
  cardStyle: 'rounded',
  cardShadow: 'subtle',
  showPoweredBy: true,
  accentColor: null,
  pageBackground: null,
  cardBackground: null,
};

export const TRANSPARENCY_THEME_PRESETS: Record<TransparencyThemePreset, { label: string; primaryColor: string; accentColor: string; pageBackground: string; cardBackground: string; colorScheme: TransparencyColorScheme }> = {
  default: { label: 'Default', primaryColor: '', accentColor: '', pageBackground: '#fafaf9', cardBackground: '#ffffff', colorScheme: 'light' },
  ocean: { label: 'Ocean', primaryColor: '#0EA5E9', accentColor: '#06B6D4', pageBackground: '#f0f9ff', cardBackground: '#ffffff', colorScheme: 'light' },
  forest: { label: 'Forest', primaryColor: '#10B981', accentColor: '#059669', pageBackground: '#f0fdf4', cardBackground: '#ffffff', colorScheme: 'light' },
  sunset: { label: 'Sunset', primaryColor: '#F97316', accentColor: '#EF4444', pageBackground: '#fffbeb', cardBackground: '#ffffff', colorScheme: 'light' },
  midnight: { label: 'Midnight', primaryColor: '#8B5CF6', accentColor: '#EC4899', pageBackground: '#0f172a', cardBackground: '#1e293b', colorScheme: 'dark' },
  corporate: { label: 'Corporate', primaryColor: '#3B82F6', accentColor: '#0EA5E9', pageBackground: '#f8fafc', cardBackground: '#ffffff', colorScheme: 'light' },
  minimal: { label: 'Minimal', primaryColor: '#6B7280', accentColor: '#9CA3AF', pageBackground: '#ffffff', cardBackground: '#ffffff', colorScheme: 'light' },
};

export interface TransparencyAccessControl {
  enabled: boolean;
  orderPrefix: string; // e.g. "1234" — first N digits of order number
}

export const DEFAULT_TRANSPARENCY_ACCESS_CONTROL: TransparencyAccessControl = {
  enabled: false,
  orderPrefix: '',
};

export interface TransparencyPageConfig {
  id?: string;
  tenantId: string;
  pageTitle: string | null;
  pageDescription: string | null;
  heroImageUrl: string | null;
  products: TransparencyProductEntry[];
  design: TransparencyDesignSettings;
  accessControl: TransparencyAccessControl;
  updatedAt?: string;
}
