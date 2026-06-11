/**
 * Hero KPI strip for the shipment reports dashboard:
 * six GlassCards with animated counters and a delta badge vs. the
 * previous period of equal length.
 */
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Clock, Euro, Globe, Package, Truck, Weight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { gridStagger, gridItem, useMotionVariants } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { DeltaBadge } from './movement-kpi-strip';
import { pct, type KpiTotals } from './report-analytics';

interface ReportKpiStripProps {
  loading: boolean;
  hasComparison: boolean;
  totals: KpiTotals;
  prev: KpiTotals | null;
}

interface KpiCardProps {
  icon: React.ReactNode;
  tileClass: string;
  label: string;
  delta?: React.ReactNode;
  children: React.ReactNode;
}

function KpiCard({ icon, tileClass, label, delta, children }: KpiCardProps) {
  return (
    <GlassCard enableGlow className="p-3 sm:p-4 h-full">
      <div className="flex items-start justify-between gap-2">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', tileClass)}>
          {icon}
        </div>
        {delta}
      </div>
      <div className="mt-2 text-xs text-muted-foreground truncate">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1 min-w-0">{children}</div>
    </GlassCard>
  );
}

export function ReportKpiStrip({ loading, hasComparison, totals, prev }: ReportKpiStripProps) {
  const { t } = useTranslation('warehouse');
  const container = useMotionVariants(gridStagger);
  const item = useMotionVariants(gridItem);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
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

  const weightKg = totals.totalWeightGrams >= 1000;
  const valueClass = 'text-xl sm:text-2xl font-semibold';

  return (
    <motion.div
      variants={container}
      initial="initial"
      animate="animate"
      className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3"
    >
      {/* Total shipments */}
      <motion.div variants={item}>
        <KpiCard
          icon={<Package className="h-4 w-4" />}
          tileClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
          label={t('Total Shipments')}
          delta={hasComparison ? <DeltaBadge current={totals.total} previous={prev?.total} /> : undefined}
        >
          <AnimatedCounter value={totals.total} className={valueClass} />
        </KpiCard>
      </motion.div>

      {/* Shipped */}
      <motion.div variants={item}>
        <KpiCard
          icon={<Truck className="h-4 w-4" />}
          tileClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
          label={t('Shipped')}
          delta={hasComparison ? <DeltaBadge current={totals.shippedCount} previous={prev?.shippedCount} /> : undefined}
        >
          <AnimatedCounter value={totals.shippedCount} className={valueClass} />
        </KpiCard>
      </motion.div>

      {/* Avg lead time */}
      <motion.div variants={item}>
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          tileClass="bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
          label={t('Avg. lead time')}
          delta={
            hasComparison && totals.avgLeadDays != null && prev?.avgLeadDays != null ? (
              <DeltaBadge current={totals.avgLeadDays} previous={prev.avgLeadDays} invert />
            ) : undefined
          }
        >
          {totals.avgLeadDays != null ? (
            <>
              <AnimatedCounter value={totals.avgLeadDays} decimals={1} className={valueClass} />
              <span className="text-xs text-muted-foreground">{t('days')}</span>
            </>
          ) : (
            <span className={cn(valueClass, 'text-muted-foreground')}>—</span>
          )}
        </KpiCard>
      </motion.div>

      {/* International */}
      <motion.div variants={item}>
        <KpiCard
          icon={<Globe className="h-4 w-4" />}
          tileClass="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
          label={t('International')}
          delta={hasComparison ? <DeltaBadge current={totals.intlCount} previous={prev?.intlCount} /> : undefined}
        >
          <AnimatedCounter value={totals.intlCount} className={valueClass} />
          <span className="text-xs text-muted-foreground tabular-nums">
            {pct(totals.intlCount, totals.total)}%
          </span>
        </KpiCard>
      </motion.div>

      {/* Shipping cost */}
      <motion.div variants={item}>
        <KpiCard
          icon={<Euro className="h-4 w-4" />}
          tileClass="bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
          label={t('Shipping cost')}
          delta={hasComparison ? <DeltaBadge current={totals.totalCost} previous={prev?.totalCost} invert /> : undefined}
        >
          <AnimatedCounter value={totals.totalCost} decimals={2} suffix=" €" className={valueClass} />
        </KpiCard>
      </motion.div>

      {/* Total weight */}
      <motion.div variants={item}>
        <KpiCard
          icon={<Weight className="h-4 w-4" />}
          tileClass="bg-cyan-50 text-cyan-600 dark:bg-cyan-500/15 dark:text-cyan-400"
          label={t('Total weight')}
          delta={hasComparison ? <DeltaBadge current={totals.totalWeightGrams} previous={prev?.totalWeightGrams} /> : undefined}
        >
          <AnimatedCounter
            value={weightKg ? totals.totalWeightGrams / 1000 : totals.totalWeightGrams}
            decimals={weightKg ? 1 : 0}
            className={valueClass}
          />
          <span className="text-xs text-muted-foreground">{weightKg ? 'kg' : 'g'}</span>
        </KpiCard>
      </motion.div>
    </motion.div>
  );
}
