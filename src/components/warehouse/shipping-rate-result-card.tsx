/**
 * Shipping Rates — single carrier result card.
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  Link2,
  Scale,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { gridItem, useMotionVariants, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { ContentCategory, ContentPolicy } from '@/lib/smart-packing';
import {
  formatRatePrice,
  getRateBrand,
  type BlockReason,
  type RateRow,
} from './shipping-rate-utils';

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------
export function RateBrandAvatar({ carrier, size = 'md' }: { carrier: string; size?: 'md' | 'lg' }) {
  const brand = getRateBrand(carrier);
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl font-extrabold tracking-tight shadow-sm',
        size === 'lg' ? 'h-12 w-12' : 'h-11 w-11',
        brand.initials.length > 2 ? 'text-[11px]' : 'text-sm',
        brand.bg,
        brand.text,
      )}
      aria-hidden="true"
    >
      {brand.initials}
    </div>
  );
}

const BLOCK_REASON_KEY: Record<BlockReason, string> = {
  too_heavy: 'Too heavy',
  too_large: 'Too large',
  girth_exceeded: 'Girth exceeded',
};

const CATEGORY_KEY: Partial<Record<ContentCategory, string>> = {
  cash: 'Cash',
  weapons: 'Weapons',
  drugs: 'Drugs',
  live_animal: 'Live animals',
  lithium_battery: 'Lithium batteries',
  alcohol: 'Alcohol',
};

const POLICY_KEY: Partial<Record<ContentPolicy, string>> = {
  forbidden: 'prohibited',
  special_handling: 'special handling',
  b2b_only: 'B2B only',
};

function StatusChip({ row }: { row: RateRow }) {
  const { t } = useTranslation('warehouse');
  if (row.status === 'blocked') {
    const reasons = row.blockReasons.map((r) => t(BLOCK_REASON_KEY[r])).join(' · ');
    return (
      <Badge
        variant="outline"
        className="gap-1 border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
      >
        <XCircle className="h-3 w-3" />
        {t('Not possible')}
        {reasons ? ` — ${reasons}` : ''}
      </Badge>
    );
  }
  if (row.status === 'tight') {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-400"
      >
        <AlertTriangle className="h-3 w-3" />
        {t('Tight fit')} ({Math.round(row.utilization * 100)}%)
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400"
    >
      <CheckCircle2 className="h-3 w-3" />
      {t('Fits limits')}
    </Badge>
  );
}

function UtilizationBar({ utilization, status }: { utilization: number; status: RateRow['status'] }) {
  const pct = Math.min(100, Math.round(utilization * 100));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500',
          status === 'blocked' ? 'bg-red-500' : status === 'tight' ? 'bg-amber-500' : 'bg-green-500',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function ShippingRateResultCard({ row }: { row: RateRow }) {
  const { t, i18n } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();
  const itemVariants = useMotionVariants(gridItem);
  const { service } = row.match;
  const blocked = row.status === 'blocked';

  const hoverLift = useMemo(
    () => (prefersReduced || blocked ? {} : { whileHover: { y: -3 }, whileTap: { scale: 0.97 } }),
    [prefersReduced, blocked],
  );

  // Volumetric weight is billed when it is the chargeable weight (> real weight)
  const volumetricBilled =
    row.match.volumetricWeightKg != null &&
    row.match.volumetricWeightKg > 0 &&
    row.match.chargeableWeightKg === row.match.volumetricWeightKg;

  return (
    <motion.div variants={itemVariants} {...hoverLift}>
      <GlassCard
        enableGlow={!blocked}
        className={cn('p-4 space-y-3', blocked && 'opacity-60 saturate-50')}
      >
        <div className="flex items-start gap-3">
          <RateBrandAvatar carrier={service.carrier} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="font-semibold leading-tight">{service.carrier}</h3>
              {row.connected && (
                <Link to="/warehouse/integrations" className="inline-flex">
                  <Badge className="gap-1 bg-green-600 text-white hover:bg-green-700 text-[10px]">
                    <Link2 className="h-3 w-3" />
                    {t('Connected')}
                  </Badge>
                </Link>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{service.service}</p>
          </div>
          <div className="text-right shrink-0">
            {row.price != null ? (
              <>
                <p className="text-lg font-bold tabular-nums leading-tight">
                  {row.isListPrice && (
                    <span className="mr-1 text-xs font-medium text-muted-foreground">{t('from')}</span>
                  )}
                  {formatRatePrice(row.price, row.currency, i18n.language)}
                </p>
                {row.transit && (
                  <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground tabular-nums">
                    <Clock className="h-3 w-3" />
                    {row.transit.days} {t('days')}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>

        <UtilizationBar utilization={row.utilization} status={row.status} />

        <div className="flex flex-wrap items-center gap-1.5">
          <StatusChip row={row} />
          {row.match.girthCm != null && service.girth && (
            <Badge variant="outline" className="gap-1 text-[10px] font-normal text-muted-foreground tabular-nums">
              <Scale className="h-3 w-3" />
              {t('Girth')} {Math.round(row.match.girthCm)}/{service.girth.maxCm} cm
            </Badge>
          )}
          {volumetricBilled && row.match.volumetricWeightKg != null && (
            <Badge
              variant="outline"
              className="gap-1 text-[10px] font-normal border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400"
            >
              <Info className="h-3 w-3" />
              {t('Volumetric weight {{kg}} kg applies', {
                kg: row.match.volumetricWeightKg.toFixed(1),
              })}
            </Badge>
          )}
          {row.isListPrice && row.price != null && (
            <Badge variant="outline" className="gap-1 text-[10px] font-normal text-muted-foreground">
              <Info className="h-3 w-3" />
              {t('List price estimate — route not in price table')}
            </Badge>
          )}
          {row.policyChips.map(({ category, policy }) => {
            const catKey = CATEGORY_KEY[category];
            const polKey = POLICY_KEY[policy];
            if (!catKey || !polKey) return null;
            return (
              <Badge
                key={category}
                variant="outline"
                className="gap-1 text-[10px] font-normal border-dashed text-muted-foreground"
              >
                <Info className="h-3 w-3" />
                {t(catKey)}: {t(polKey)}
              </Badge>
            );
          })}
        </div>
      </GlassCard>
    </motion.div>
  );
}
