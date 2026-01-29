/**
 * Dynamic Theme Utilities
 *
 * Functions for dynamically applying branding settings like primary color,
 * favicon, and document title.
 */

/**
 * Convert hex color to HSL values
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Parse hex
  let r: number, g: number, b: number;
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
  } else {
    return null;
  }

  // Normalize to 0-1
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Apply primary color to CSS variables
 * Updates --primary and related CSS custom properties
 */
export function applyPrimaryColor(hexColor: string): boolean {
  if (!hexColor || !hexColor.match(/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)) {
    console.warn('Invalid hex color:', hexColor);
    return false;
  }

  // Ensure # prefix
  const normalizedHex = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;

  // Convert to HSL for better theming support
  const hsl = hexToHsl(normalizedHex);
  if (!hsl) {
    console.warn('Could not convert color to HSL:', hexColor);
    return false;
  }

  const root = document.documentElement;

  // Set the primary color directly as hex
  root.style.setProperty('--primary', normalizedHex);

  // Also set chart colors and ring to match
  root.style.setProperty('--chart-1', normalizedHex);
  root.style.setProperty('--ring', normalizedHex);

  // Sidebar colors
  root.style.setProperty('--sidebar-primary', normalizedHex);
  root.style.setProperty('--sidebar-ring', normalizedHex);

  return true;
}

/**
 * Reset primary color to default
 */
export function resetPrimaryColor(): void {
  const root = document.documentElement;
  const defaultPrimary = '#3B82F6';

  root.style.setProperty('--primary', defaultPrimary);
  root.style.setProperty('--chart-1', defaultPrimary);
  root.style.setProperty('--ring', defaultPrimary);
  root.style.setProperty('--sidebar-primary', defaultPrimary);
  root.style.setProperty('--sidebar-ring', defaultPrimary);
}

/**
 * Apply a custom favicon
 */
export function applyFavicon(url: string): boolean {
  if (!url) {
    console.warn('No favicon URL provided');
    return false;
  }

  try {
    // Find existing favicon links
    const existingIcons = document.querySelectorAll('link[rel*="icon"]');
    existingIcons.forEach((icon) => icon.remove());

    // Create new favicon link
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = url.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon';
    link.href = url;

    document.head.appendChild(link);

    // Also add apple-touch-icon for iOS
    const appleLink = document.createElement('link');
    appleLink.rel = 'apple-touch-icon';
    appleLink.href = url;
    document.head.appendChild(appleLink);

    return true;
  } catch (error) {
    console.error('Failed to apply favicon:', error);
    return false;
  }
}

/**
 * Reset favicon to default
 */
export function resetFavicon(): void {
  applyFavicon('/vite.svg');
}

/**
 * Apply document title
 */
export function applyDocumentTitle(title: string): void {
  if (title) {
    document.title = title;
  }
}

/**
 * Reset document title to default
 */
export function resetDocumentTitle(): void {
  document.title = 'DPP Manager';
}

/**
 * Apply all branding settings at once
 */
export function applyBranding(settings: {
  appName?: string;
  primaryColor?: string;
  favicon?: string;
}): void {
  if (settings.appName) {
    applyDocumentTitle(settings.appName);
  }
  if (settings.primaryColor) {
    applyPrimaryColor(settings.primaryColor);
  }
  if (settings.favicon) {
    applyFavicon(settings.favicon);
  }
}

/**
 * Reset all branding to defaults
 */
export function resetBranding(): void {
  resetPrimaryColor();
  resetFavicon();
  resetDocumentTitle();
}

/**
 * Default branding values
 */
export const DEFAULT_BRANDING = {
  appName: 'DPP Manager',
  primaryColor: '#3B82F6',
  favicon: '/vite.svg',
  poweredByText: 'Powered by DPP Manager',
} as const;
