import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
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
 * Features: animated counter, delta indicator, type-aware formatter.
 */
export function MegaKpi({ block, hero, accent, className }: MegaKpiProps) {
  const reduceMotion = useReducedMotion();
  const animated = useAnimatedValue(block.value, reduceMotion);
  const formatted = formatValue(animated, block);
  const deltaColor = block.deltaPct == null
    ? 'text-white/40'
    : block.deltaPct > 0
      ? 'text-emerald-400'
      : block.deltaPct < 0
        ? 'text-rose-400'
        : 'text-white/40';
  const DeltaIcon = block.deltaPct == null
    ? Minus
    : block.deltaPct > 0
      ? ArrowUpRight
      : block.deltaPct < 0
        ? ArrowDownRight
        : Minus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={[
        'relative overflow-hidden rounded-2xl',
        'border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]',
        'backdrop-blur-xl',
        hero ? 'p-7 md:p-8' : 'p-5 md:p-6',
        className || '',
      ].join(' ')}
      style={accent ? { boxShadow: `inset 0 1px 0 0 ${accent}33, 0 0 1px ${accent}40` } : undefined}
    >
      {/* Top label */}
      <div className="flex items-center justify-between">
        <span className={[
          'uppercase tracking-[0.18em]',
          hero ? 'text-xs md:text-sm text-white/60' : 'text-[10px] md:text-xs text-white/55',
        ].join(' ')}>
          {block.label}
        </span>
        {block.deltaPct != null && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${deltaColor} bg-white/5`}>
            <DeltaIcon className="h-3.5 w-3.5" />
            {block.deltaPct > 0 ? '+' : ''}{block.deltaPct}%
          </span>
        )}
      </div>

      {/* Main value */}
      <div className={[
        'mt-3 font-display tabular-nums tracking-tight text-white',
        hero ? 'text-5xl md:text-6xl xl:text-7xl' : 'text-3xl md:text-4xl',
      ].join(' ')}>
        {formatted}
      </div>

      {/* Background sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl opacity-30"
        style={{ background: accent ? `radial-gradient(closest-side, ${accent}, transparent)` : 'radial-gradient(closest-side, rgba(99,102,241,0.45), transparent)' }}
      />
    </motion.div>
  );
}

/* ============================================
   helpers
   ============================================ */

function formatValue(value: number, block: CommerceKpiBlock): string {
  switch (block.kind) {
    case 'currency':
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: block.currency || 'EUR',
        maximumFractionDigits: value >= 10000 ? 0 : 2,
      }).format(value);
    case 'percent':
      return `${(Math.round(value * 10) / 10).toFixed(1)}%`;
    case 'mass_kg':
      return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 }).format(value)} kg`;
    case 'duration_minutes':
      return `${Math.round(value)} min`;
    case 'count':
    default:
      return new Intl.NumberFormat('de-DE').format(Math.round(value));
  }
}

function useAnimatedValue(target: number, skip: boolean | null) {
  const [val, setVal] = useState(skip ? target : 0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (skip) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const initial = startedRef.current ? val : 0;
    const duration = 1100;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = initial + (target - initial) * eased;
      setVal(current);
      if (t < 1) raf = requestAnimationFrame(step);
      else startedRef.current = true;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, skip]);

  return val;
}
