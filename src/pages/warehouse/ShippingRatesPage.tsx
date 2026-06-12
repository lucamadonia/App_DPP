/**
 * Shipping Rates — international carrier price comparison.
 *
 * Live-reactive comparison of all matching carrier services from the
 * smart-packing rule engine: interpolated route prices, transit times,
 * size/weight/girth limit checks, customs forms and Integrations Hub
 * connection state. Prices are list-price estimates, not contract rates.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowDown01,
  ArrowRight,
  Clock,
  Info,
  PackageSearch,
  Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { blurIn, gridStagger, useMotionVariants, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { listCarrierIntegrations } from '@/services/supabase/carrier-integrations';
import {
  ShippingRateInputCard,
  type RateFormState,
} from '@/components/warehouse/shipping-rate-input-card';
import { ShippingRateResultCard } from '@/components/warehouse/shipping-rate-result-card';
import { ShippingRateHero } from '@/components/warehouse/shipping-rate-hero';
import { ShippingRateCustoms } from '@/components/warehouse/shipping-rate-customs';
import {
  buildRateRows,
  flagEmoji,
  sortRateRows,
  type RateSortMode,
} from '@/components/warehouse/shipping-rate-utils';

const DEFAULT_FORM: RateFormState = {
  lengthCm: 0,
  widthCm: 0,
  heightCm: 0,
  weightKg: 1,
  valueEur: 50,
  origin: 'DE',
  destination: '',
};

export function ShippingRatesPage() {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();
  const headerVariants = useMotionVariants(blurIn);
  const staggerVariants = useMotionVariants(gridStagger);

  const [form, setForm] = useState<RateFormState>(DEFAULT_FORM);
  const [debounced, setDebounced] = useState<RateFormState>(DEFAULT_FORM);
  const [sortMode, setSortMode] = useState<RateSortMode>('price');
  const [showBlocked, setShowBlocked] = useState(false);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());

  // Debounce the live inputs (350 ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(form), 350);
    return () => clearTimeout(timer);
  }, [form]);
  const isPending = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(debounced),
    [form, debounced],
  );

  // Connected carriers from the Integrations Hub
  useEffect(() => {
    listCarrierIntegrations()
      .then((views) =>
        setConnectedIds(
          new Set(
            views.filter((v) => v.status === 'connected').map((v) => v.catalog.carrierId),
          ),
        ),
      )
      .catch(() => setConnectedIds(new Set()));
  }, []);

  const inputsComplete =
    debounced.lengthCm > 0 &&
    debounced.widthCm > 0 &&
    debounced.heightCm > 0 &&
    debounced.weightKg > 0 &&
    !!debounced.destination;

  const rows = useMemo(
    () => buildRateRows(debounced, connectedIds),
    [debounced, connectedIds],
  );

  const passing = useMemo(
    () => sortRateRows(rows.filter((r) => r.status !== 'blocked'), sortMode),
    [rows, sortMode],
  );
  const blocked = useMemo(() => rows.filter((r) => r.status === 'blocked'), [rows]);

  // Best-price hero: cheapest fitting option with a known price
  const heroRow = useMemo(() => {
    const priced = sortRateRows(rows.filter((r) => r.status !== 'blocked' && r.price != null), 'price');
    return priced[0] ?? null;
  }, [rows]);
  const savings = useMemo(() => {
    if (!heroRow || heroRow.price == null) return null;
    const comparable = rows.filter(
      (r) => r.status !== 'blocked' && r.price != null && r.currency === heroRow.currency,
    );
    if (comparable.length < 2) return null;
    const max = Math.max(...comparable.map((r) => r.price as number));
    const diff = max - heroRow.price;
    return diff > 0.01 ? diff : null;
  }, [rows, heroRow]);

  // Re-keying this hash remounts the results → stagger entrance on every recalc
  const resultsKey = `${debounced.lengthCm}x${debounced.widthCm}x${debounced.heightCm}-${debounced.weightKg}-${debounced.valueEur}-${debounced.origin}-${debounced.destination}-${sortMode}`;

  const tapProps = prefersReduced ? {} : { whileTap: { scale: 0.97 } };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div
        variants={headerVariants}
        initial="initial"
        animate="animate"
        className="flex items-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('Shipping Rates')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('Compare estimated prices, transit times and limits across carriers.')}
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)] items-start">
        {/* Input column (sticky on desktop) */}
        <div className="space-y-3 xl:sticky xl:top-4">
          <ShippingRateInputCard form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
          <p className="flex gap-2 px-1 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
            {t('Prices are list-price estimates, not negotiated contract rates. Actual prices vary by account, surcharges and fuel.')}
          </p>
        </div>

        {/* Results column */}
        <div className="space-y-4 min-w-0">
          {/* Mobile sticky route summary */}
          {inputsComplete && (
            <div className="xl:hidden sticky top-2 z-20">
              <div className="rounded-full border bg-background/85 backdrop-blur-xl px-4 py-2 text-xs font-medium tabular-nums shadow-sm flex items-center justify-center gap-1.5">
                <span>
                  {debounced.lengthCm}×{debounced.widthCm}×{debounced.heightCm} cm ·{' '}
                  {debounced.weightKg} kg
                </span>
                <span className="text-muted-foreground">
                  {flagEmoji(debounced.origin)} → {flagEmoji(debounced.destination)}
                </span>
              </div>
            </div>
          )}

          {isPending && <ShimmerSkeleton className="h-1 w-full rounded-full" />}

          {!inputsComplete ? (
            <GlassCard className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <PackageSearch className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground max-w-xs">
                {t('Enter package details to compare prices.')}
              </p>
            </GlassCard>
          ) : rows.length === 0 ? (
            <GlassCard className="flex flex-col items-center justify-center gap-3 p-10 text-center">
              <PackageSearch className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('No carrier services available for this route.')}
              </p>
            </GlassCard>
          ) : (
            <motion.div
              key={resultsKey}
              variants={staggerVariants}
              initial="initial"
              animate="animate"
              className={cn('space-y-4 transition-opacity duration-200', isPending && 'opacity-60')}
            >
              {/* Best price hero */}
              {heroRow && <ShippingRateHero row={heroRow} savings={savings} />}

              {/* Sort toggle */}
              <div className="flex flex-wrap items-center justify-end gap-2">
                <motion.div {...tapProps}>
                  <Button
                    variant={sortMode === 'price' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="min-h-[44px] sm:min-h-9"
                    onClick={() => setSortMode('price')}
                  >
                    <ArrowDown01 className="h-4 w-4 mr-1.5" />
                    {t('Sort by price')}
                  </Button>
                </motion.div>
                <motion.div {...tapProps}>
                  <Button
                    variant={sortMode === 'transit' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="min-h-[44px] sm:min-h-9"
                    onClick={() => setSortMode('transit')}
                  >
                    <Clock className="h-4 w-4 mr-1.5" />
                    {t('Sort by transit time')}
                  </Button>
                </motion.div>
              </div>

              {/* Fitting services */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {passing.map((row) => (
                  <ShippingRateResultCard key={row.match.service.id} row={row} />
                ))}
              </div>

              {/* Customs (third country / special zones only) */}
              <ShippingRateCustoms
                origin={debounced.origin}
                destination={debounced.destination}
                valueEur={debounced.valueEur}
                weightKg={debounced.weightKg}
              />

              {/* Blocked services (collapsible) */}
              {blocked.length > 0 && (
                <div className="space-y-3">
                  <motion.div {...tapProps} className="flex justify-center">
                    <Button
                      variant="ghost"
                      className="min-h-[44px] text-muted-foreground"
                      onClick={() => setShowBlocked((s) => !s)}
                      aria-expanded={showBlocked}
                    >
                      {showBlocked
                        ? t('Hide non-fitting services')
                        : t("Show {{n}} services that don't fit", { n: blocked.length })}
                      <ArrowRight
                        className={cn(
                          'h-4 w-4 ml-1.5 transition-transform',
                          showBlocked ? '-rotate-90' : 'rotate-90',
                        )}
                      />
                    </Button>
                  </motion.div>
                  {showBlocked && (
                    <motion.div
                      variants={staggerVariants}
                      initial="initial"
                      animate="animate"
                      className="grid grid-cols-1 lg:grid-cols-2 gap-3"
                    >
                      {blocked.map((row) => (
                        <ShippingRateResultCard key={row.match.service.id} row={row} />
                      ))}
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
