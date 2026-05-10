import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CommerceKpiBlock } from '@/types/commerce-channels';

interface MegaKpiProps {
  block: CommerceKpiBlock;
  /** True for the hero strip — uses huge tabular numbers */
  hero?: boolean;
  /** Optional override for accent color */
  accent?: string;
  className?: string;
}

/**
 * MegaKpi — large animated KPI card for the wall display.
 *
 * On mobile, taps the card to open a bottom sheet showing the delta context
 * (current vs previous, vs yesterday). Hero strip uses display-size numbers
 * with compact notation for values ≥ 10 000 so they never truncate at 360px.
 *
 * Animated counter runs once on first mount; subsequent value updates from
 * the 30 s auto-refresh snap to the new number instead of re-tweening, which
 * felt busy on a wall display sitting idle.
 */
export function MegaKpi({ block, hero, accent, className }: MegaKpiProps) {
  const reduceMotion = useReducedMotion();
  const animated = useAnimatedValue(block.value, reduceMotion);
  const formatted = formatValue(animated, block);
  const previousFormatted = block.prevValue != null ? formatValue(block.prevValue, block) : null;

  const deltaColor =
    block.deltaPct == null
      ? 'text-white/40'
      : block.deltaPct > 0
        ? 'text-emerald-400'
        : block.deltaPct < 0
          ? 'text-rose-400'
          : 'text-white/40';
  const DeltaIcon =
    block.deltaPct == null
      ? Minus
      : block.deltaPct > 0
        ? ArrowUpRight
        : block.deltaPct < 0
          ? ArrowDownRight
          : Minus;

  const card = (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'relative overflow-hidden rounded-[20px] md:rounded-2xl',
        'border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]',
        'backdrop-blur-xl',
        'cursor-pointer select-none active:bg-white/[0.02] touch-target',
        'transition-colors',
        hero ? 'p-4 xs:p-5 md:p-7 xl:p-8' : 'p-3.5 xs:p-4 md:p-5 xl:p-6',
        className,
      )}
      style={accent ? { boxShadow: `inset 0 1px 0 0 ${accent}33, 0 0 1px ${accent}40` } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'uppercase tracking-[0.12em] sm:tracking-[0.18em] truncate',
            hero
              ? 'text-[10px] xs:text-xs md:text-sm text-white/60'
              : 'text-[10px] md:text-xs text-white/55',
          )}
        >
          {block.label}
        </span>
        {block.deltaPct != null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] sm:text-xs font-semibold bg-white/5 shrink-0',
              deltaColor,
            )}
          >
            <DeltaIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {block.deltaPct > 0 ? '+' : ''}
            {block.deltaPct}%
          </span>
        )}
      </div>

      <div
        className={cn(
          'mt-2 sm:mt-3 font-display tabular-nums text-white',
          hero
            ? 'text-[40px] leading-[0.95] tracking-[-0.02em] sm:text-5xl md:text-6xl xl:text-7xl 2xl:text-[88px]'
            : 'text-2xl sm:text-3xl md:text-4xl tracking-tight',
        )}
      >
        {formatted}
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl opacity-30"
        style={{
          background: accent
            ? `radial-gradient(closest-side, ${accent}, transparent)`
            : 'radial-gradient(closest-side, rgba(99,102,241,0.45), transparent)',
        }}
      />
    </motion.div>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{card}</DialogTrigger>
      <DialogContent
        className={cn(
          'bg-[#0c0a14]/95 backdrop-blur-2xl border-white/10 text-white',
          // Bottom-sheet override: pin to bottom on phones, normal modal on sm+
          'rounded-t-2xl rounded-b-none p-6',
          'top-auto bottom-0 left-0 translate-x-0 translate-y-0',
          'max-w-full w-full',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          'sm:top-[50%] sm:bottom-auto sm:left-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%]',
          'sm:rounded-lg sm:max-w-md',
          'sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=open]:slide-in-from-left-1/2',
        )}
        showCloseButton={false}
      >
        <span aria-hidden className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/15 sm:hidden" />
        <DialogHeader className="mt-2 sm:mt-0">
          <DialogTitle className="text-xs font-medium uppercase tracking-[0.18em] text-white/55">
            {block.label}
          </DialogTitle>
          <DialogDescription className="sr-only">Detailansicht für {block.label}</DialogDescription>
        </DialogHeader>
        <div className="font-display tabular-nums text-5xl tracking-tight text-white">
          {formatValue(block.value, block)}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50">vs. Vortag</div>
            <div className={cn('mt-1 inline-flex items-center gap-1 text-base font-semibold', deltaColor)}>
              {block.deltaPct != null ? (
                <>
                  <DeltaIcon className="h-4 w-4" />
                  {block.deltaPct > 0 ? '+' : ''}
                  {block.deltaPct}%
                </>
              ) : (
                <span className="text-white/40">—</span>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50">Vortagswert</div>
            <div className="mt-1 font-display tabular-nums text-base text-white/80">
              {previousFormatted ?? <span className="text-white/40">—</span>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================
   helpers
   ============================================ */

function formatValue(value: number, block: CommerceKpiBlock): string {
  switch (block.kind) {
    case 'currency':
      // Compact notation kicks in at 10 000 so a 40 px hero number never wraps on a 360 px phone.
      if (value >= 10_000) {
        return new Intl.NumberFormat('de-DE', {
          notation: 'compact',
          maximumFractionDigits: 1,
          style: 'currency',
          currency: block.currency || 'EUR',
        }).format(value);
      }
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: block.currency || 'EUR',
        maximumFractionDigits: 2,
      }).format(value);
    case 'percent':
      return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
    case 'mass_kg':
      if (value >= 10_000) {
        return `${new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} kg`;
      }
      return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)} kg`;
    case 'duration_minutes':
      return `${Math.round(value)} min`;
    case 'count':
    default:
      if (value >= 10_000) {
        return new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
      }
      return new Intl.NumberFormat('de-DE').format(Math.round(value));
  }
}

/**
 * Counter that tweens 0 → target on first render, then snaps for subsequent
 * `target` changes. Keeps the wall-display "settling in" feel on initial load
 * but doesn't re-animate every 30-second refresh, which read as fidgety.
 *
 * Returns `tweenVal` while the first-mount animation is running; thereafter
 * the rendered value tracks `target` directly so we never `setState` inside
 * an effect after the initial tween completes.
 */
function useAnimatedValue(target: number, skip: boolean | null) {
  const [tweenVal, setTweenVal] = useState<number | null>(null);
  const animatedOnceRef = useRef(false);

  useEffect(() => {
    if (skip || animatedOnceRef.current) {
      // No animation needed — render returns `target` directly via the
      // memoised fallback below.
      return;
    }
    let raf = 0;
    const start = performance.now();
    const initial = 0;
    const duration = 1100;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = initial + (target - initial) * eased;
      if (t < 1) {
        setTweenVal(current);
        raf = requestAnimationFrame(step);
      } else {
        animatedOnceRef.current = true;
        setTweenVal(null);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, skip]);

  return tweenVal ?? target;
}
