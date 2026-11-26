import type { CSSProperties } from 'react';
import {
  FlaskConical,
  Flame,
  Package,
  Recycle,
  Shapes,
  ShieldCheck,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Category styling — each category gets a hue + icon for visual distinction.
// Tinted backgrounds always pair with a same-hue foreground that has a dark
// variant, so a chip is never white text on a pale tint (or the reverse).
// ---------------------------------------------------------------------------
export interface CategoryConfig {
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  custom:     { icon: Shapes,       color: 'text-muted-foreground',                    bg: 'bg-muted' },
  compliance: { icon: ShieldCheck,  color: 'text-blue-600 dark:text-blue-400',         bg: 'bg-blue-500/10' },
  recycling:  { icon: Recycle,      color: 'text-emerald-600 dark:text-emerald-400',   bg: 'bg-emerald-500/10' },
  safety:     { icon: Flame,        color: 'text-amber-600 dark:text-amber-400',       bg: 'bg-amber-500/10' },
  chemicals:  { icon: FlaskConical, color: 'text-purple-600 dark:text-purple-400',     bg: 'bg-purple-500/10' },
  energy:     { icon: Zap,          color: 'text-yellow-700 dark:text-yellow-400',     bg: 'bg-yellow-500/10' },
  packaging:  { icon: Package,      color: 'text-orange-600 dark:text-orange-400',     bg: 'bg-orange-500/10' },
  transport:  { icon: Truck,        color: 'text-cyan-700 dark:text-cyan-400',         bg: 'bg-cyan-500/10' },
};

export const CATEGORY_OPTIONS = Object.keys(CATEGORY_CONFIG);

export function getCategoryConfig(category: string): CategoryConfig {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.custom;
}

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = ['svg', 'png', 'jpg', 'jpeg'];

/** null when the file is acceptable, otherwise the reason it is not. */
export function validatePictogramFile(file: File): 'format' | 'size' | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXT.includes(ext)) return 'format';
  if (file.size > MAX_FILE_BYTES) return 'size';
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

/**
 * Transparency checkerboard. Tokens are hex values, so the old
 * `hsl(var(--muted)/0.5)` silently resolved to nothing; `color-mix` works
 * with any token format and follows dark mode and every app style.
 */
export function checkerboard(cell = 16): CSSProperties {
  const c = 'color-mix(in oklab, var(--muted) 70%, transparent)';
  const h = cell / 2;
  return {
    backgroundImage: `linear-gradient(45deg, ${c} 25%, transparent 25%), linear-gradient(-45deg, ${c} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${c} 75%), linear-gradient(-45deg, transparent 75%, ${c} 75%)`,
    backgroundSize: `${cell}px ${cell}px`,
    backgroundPosition: `0 0, 0 ${h}px, ${h}px -${h}px, -${h}px 0px`,
  };
}

export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}
