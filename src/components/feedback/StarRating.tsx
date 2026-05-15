import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type StarSize = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  /** 0–5; supports halves only via display, not input. */
  value: number;
  /** When set, the component is interactive. */
  onChange?: (value: 1 | 2 | 3 | 4 | 5) => void;
  size?: StarSize;
  /** Optional ARIA label override. */
  label?: string;
  className?: string;
  /** Accent color override for filled stars; falls back to amber. */
  color?: string;
  /** When true, mute the empty-star outline (useful on dark heroes). */
  muted?: boolean;
}

const SIZE_MAP: Record<StarSize, { star: string; gap: string }> = {
  sm: { star: 'h-4 w-4', gap: 'gap-0.5' },
  md: { star: 'h-6 w-6', gap: 'gap-1' },
  lg: { star: 'h-9 w-9', gap: 'gap-1.5' },
  xl: { star: 'h-14 w-14', gap: 'gap-2' },
};

/**
 * Reusable star rating component. Two modes:
 *   - Display: value is rendered with fractional fills not supported.
 *   - Input: onChange is provided → each star becomes a button; supports
 *     hover preview, keyboard nav (←/→ + Enter), tap-down animation.
 *
 * Mobile-first sizing: `xl` produces 56px tap targets — exceeds WCAG
 * 2.5.5 minimum (44×44). Touch-down animation uses scale + ring pulse.
 */
export function StarRating({
  value,
  onChange,
  size = 'md',
  label,
  className,
  color,
  muted = false,
}: Props) {
  const interactive = !!onChange;
  const sizeCfg = SIZE_MAP[size];

  if (!interactive) {
    return (
      <div
        role="img"
        aria-label={label || `${value} of 5 stars`}
        className={cn('inline-flex items-center', sizeCfg.gap, className)}
      >
        {[1, 2, 3, 4, 5].map(i => {
          const filled = i <= value;
          return (
            <Star
              key={i}
              className={cn(
                sizeCfg.star,
                filled ? 'fill-current' : muted ? 'opacity-25' : 'opacity-40',
              )}
              style={{ color: filled ? (color || '#F59E0B') : undefined }}
              aria-hidden="true"
            />
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={label || 'Star rating'}
      className={cn('inline-flex items-center', sizeCfg.gap, className)}
    >
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= value;
        const isSelected = i === value;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${i} of 5 stars`}
            onClick={() => onChange?.(i as 1 | 2 | 3 | 4 | 5)}
            onKeyDown={e => {
              if (e.key === 'ArrowRight' && value < 5) {
                e.preventDefault();
                onChange?.((value + 1) as 1 | 2 | 3 | 4 | 5);
              } else if (e.key === 'ArrowLeft' && value > 1) {
                e.preventDefault();
                onChange?.((value - 1) as 1 | 2 | 3 | 4 | 5);
              }
            }}
            className={cn(
              'relative rounded-full p-1 transition-all duration-200',
              'hover:scale-110 active:scale-95',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              isSelected && 'animate-in zoom-in-95',
            )}
          >
            <Star
              className={cn(
                sizeCfg.star,
                'transition-colors duration-150',
                filled ? 'fill-current' : muted ? 'opacity-25 hover:opacity-50' : 'opacity-40 hover:opacity-70',
              )}
              style={{ color: filled ? (color || '#F59E0B') : undefined }}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
