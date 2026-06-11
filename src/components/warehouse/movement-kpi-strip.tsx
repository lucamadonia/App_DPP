/**
 * KPI strip for the warehouse movements page:
 * total outflows, total inflows, net change and the most active category —
 * each with a delta vs. the previous period of equal length.
 */
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowDownToLine, ArrowUpFromLine, MoveDown, MoveUp, Scale, Sparkles,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { gridStagger, gridItem, useMotionVariants } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { CategoryDef, FlowTotals } from './movement-categories';

/* -------------------------------------------------------------------------- */
/*  DeltaBadge — ↑/↓ + % (or absolute) vs. previous period                     */
/* -------------------------------------------------------------------------- */

interface DeltaBadgeProps {
  current: number;
  previous: number | null | undefined;
  /** Invert good/bad coloring (e.g. damage: an increase is bad). */
  invert?: boolean;
  /** 'percent' (default) or 'absolute' (for values that can cross zero). */
  mode?: 'percent' | 'absolute';
  className?: string;
}

export function DeltaBadge({ current, previous, invert = false, mode = 'percent', className }: DeltaBadgeProps) {
  const { t } = useTranslation('warehouse');
  if (previous == null) return null;
  if (mode === 'percent' && previous <= 0) return null;

  const diff = current - previous;
  if (diff === 0) {
    return (
      <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums text-muted-foreground', className)}>
        ±0{mode === 'percent' ? ' %' : ''}
      </span>
    );
  }
  const up = diff > 0;
  const good = invert ? !up : up;
  const text = mode === 'percent'
    ? `${Math.abs(Math.round((diff / previous) * 100))} %`
    : `${Math.abs(diff).toLocaleString()}`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[10px] font-medium tabular-nums',
        good ? 'text-emerald-600' : 'text-red-500',
        className,
      )}
      title={t('vs. Vorperiode')}
    >
      {up ? <MoveUp className="h-2.5 w-2.5" /> : <MoveDown className="h-2.5 w-2.5" />}
      {text}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  KPI strip                                                                  */
/* -------------------------------------------------------------------------- */

interface MovementKpiStripProps {
  loading: boolean;
  /** Whether a previous-period dataset exists (false for 'all time'). */
  hasComparison: boolean;
  totals: FlowTotals;
  prevTotals: FlowTotals | null;
  topCategory: { def: CategoryDef; qty: number; prevQty: number } | null;
}

export function MovementKpiStrip({ loading, hasComparison, totals, prevTotals, topCategory }: MovementKpiStripProps) {
  const { t } = useTranslation('warehouse');
  const container = useMotionVariants(gridStagger);
  const item = useMotionVariants(gridItem);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <GlassCard key={i} className="p-3 sm:p-4">
            <div className="flex items-start gap-3">
              <ShimmerSkeleton className="h-9 w-9 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-2 pt-0.5">
                <ShimmerSkeleton className="h-3 w-2/3" />
                <ShimmerSkeleton className="h-6 w-1/2" />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    );
  }

  const TopIcon = topCategory?.def.icon;
  const netPositive = totals.net > 0;
  const netNegative = totals.net < 0;

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3"
    >
      {/* Σ Abgänge */}
      <motion.div variants={item}>
        <GlassCard className="p-3 sm:p-4 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <ArrowUpFromLine className="h-4 w-4" />
            </div>
            {hasComparison && <DeltaBadge current={totals.out} previous={prevTotals?.out} />}
          </div>
          <div className="mt-2 text-xs text-muted-foreground truncate">{t('Abgänge gesamt')}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <AnimatedCounter value={totals.out} className="text-2xl font-semibold" />
            <span className="text-xs text-muted-foreground">{t('Stück')}</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Σ Zugänge */}
      <motion.div variants={item}>
        <GlassCard className="p-3 sm:p-4 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <ArrowDownToLine className="h-4 w-4" />
            </div>
            {hasComparison && <DeltaBadge current={totals.in} previous={prevTotals?.in} />}
          </div>
          <div className="mt-2 text-xs text-muted-foreground truncate">{t('Zugänge gesamt')}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <AnimatedCounter value={totals.in} className="text-2xl font-semibold" />
            <span className="text-xs text-muted-foreground">{t('Stück')}</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Netto */}
      <motion.div variants={item}>
        <GlassCard className="p-3 sm:p-4 h-full">
          <div className="flex items-start justify-between gap-2">
            <div className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              netPositive ? 'bg-emerald-50 text-emerald-600' : netNegative ? 'bg-red-50 text-red-500' : 'bg-neutral-100 text-neutral-500',
            )}>
              <Scale className="h-4 w-4" />
            </div>
            {hasComparison && (
              <DeltaBadge current={totals.net} previous={prevTotals ? prevTotals.net : null} mode="absolute" />
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground truncate">{t('Netto')}</div>
          <div className="mt-0.5 flex items-baseline gap-1">
            <AnimatedCounter
              value={totals.net}
              prefix={netPositive ? '+' : ''}
              className={cn(
                'text-2xl font-semibold',
                netPositive ? 'text-emerald-600' : netNegative ? 'text-red-500' : '',
              )}
            />
            <span className="text-xs text-muted-foreground">{t('Stück')}</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Aktivste Kategorie */}
      <motion.div variants={item}>
        <GlassCard className="p-3 sm:p-4 h-full">
          <div className="flex items-start justify-between gap-2">
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                topCategory ? topCategory.def.bg : 'bg-neutral-100 text-neutral-400',
              )}
              style={topCategory ? { color: topCategory.def.color } : undefined}
            >
              {TopIcon ? <TopIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </div>
            {hasComparison && topCategory && (
              <DeltaBadge
                current={topCategory.qty}
                previous={topCategory.prevQty}
                invert={topCategory.def.invertDelta}
              />
            )}
          </div>
          <div className="mt-2 text-xs text-muted-foreground truncate">{t('Aktivste Kategorie')}</div>
          {topCategory ? (
            <div className="mt-0.5 flex items-baseline gap-1.5 min-w-0">
              <span className="text-base font-semibold truncate" style={{ color: topCategory.def.color }}>
                {t(topCategory.def.labelKey)}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                <AnimatedCounter value={topCategory.qty} /> {t('Stück')}
              </span>
            </div>
          ) : (
            <div className="mt-0.5 text-base font-semibold text-muted-foreground">—</div>
          )}
        </GlassCard>
      </motion.div>
    </motion.div>
  );
}
