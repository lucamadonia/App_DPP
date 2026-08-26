import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The single visual fitting for every icon that stands next to a label —
 * category pickers, status chips, list rows. Codifies the tinted-square
 * pattern that already ran hand-rolled through the DPP templates
 * (`p-2 rounded-xl bg-primary/10`) so it can no longer drift per page.
 *
 * The icon inherits `currentColor` from the tone, which is what keeps these
 * on-brand in light mode, dark mode and under a tenant's primary colour —
 * the reason we render Lucide vectors here rather than emoji or raster art.
 */

const SIZES = {
  sm: { box: 'h-8 w-8 rounded-lg', icon: 'h-4 w-4' },
  md: { box: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5' },
  lg: { box: 'h-12 w-12 rounded-xl', icon: 'h-6 w-6' },
} as const;

const TONES = {
  primary: 'bg-primary/10 text-primary ring-primary/15',
  muted: 'bg-muted text-muted-foreground ring-border',
  success: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
  danger: 'bg-destructive/10 text-destructive ring-destructive/20',
} as const;

export type IconTileSize = keyof typeof SIZES;
export type IconTileTone = keyof typeof TONES;

interface IconTileProps {
  icon: LucideIcon;
  size?: IconTileSize;
  tone?: IconTileTone;
  className?: string;
}

export function IconTile({ icon: Icon, size = 'md', tone = 'primary', className }: IconTileProps) {
  const s = SIZES[size];

  return (
    <span
      // Decorative: every tile sits beside its own text label, so announcing
      // the icon would just duplicate that label for screen readers.
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center ring-1',
        s.box,
        TONES[tone],
        className,
      )}
    >
      <Icon className={s.icon} />
    </span>
  );
}

const MONOGRAM_TEXT: Record<IconTileSize, string> = {
  sm: 'text-[11px]',
  md: 'text-sm',
  lg: 'text-lg',
};

interface MonogramTileProps {
  /** Kept short — one or two characters. Longer strings will crowd the tile. */
  text: string;
  size?: IconTileSize;
  tone?: IconTileTone;
  className?: string;
}

/**
 * Same fitting as IconTile, but lettering instead of a glyph — for things a
 * vector icon would misrepresent: the CE marking (which *is* two letters) and
 * third-party brands we hold no logo for. Deliberately not an approximated
 * brand mark: a wrong logo is worse than an honest initial.
 */
export function MonogramTile({ text, size = 'md', tone = 'primary', className }: MonogramTileProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center ring-1 font-bold tracking-tight',
        SIZES[size].box,
        MONOGRAM_TEXT[size],
        TONES[tone],
        className,
      )}
    >
      {text}
    </span>
  );
}
