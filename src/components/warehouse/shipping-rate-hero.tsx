/**
 * Shipping Rates — best price hero card.
 *
 * Highlights the cheapest fitting option with an animated gradient border,
 * AnimatedCounter on the price and the savings vs. the most expensive
 * fitting option.
 */
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Clock, Trophy } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Badge } from '@/components/ui/badge';
import { blurIn, useMotionVariants, useReducedMotion } from '@/lib/motion';
import {
  CURRENCY_SYMBOL,
  formatRatePrice,
  type RateRow,
} from './shipping-rate-utils';
import { RateBrandAvatar } from './shipping-rate-result-card';

export function ShippingRateHero({
  row,
  savings,
}: {
  row: RateRow;
  /** Savings vs. most expensive fitting option (same currency), null = n/a */
  savings: number | null;
}) {
  const { t, i18n } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();
  const heroVariants = useMotionVariants(blurIn);
  const { service } = row.match;
  const symbol = CURRENCY_SYMBOL[row.currency] ?? row.currency;

  return (
    <motion.div
      variants={heroVariants}
      initial="initial"
      animate="animate"
      className={prefersReduced ? 'rounded-xl border-2 border-primary/40' : 'gradient-border-animated'}
    >
      <div className="relative rounded-xl bg-card p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <RateBrandAvatar carrier={service.carrier} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Trophy className="h-3 w-3" />
                {t('Best price')}
              </Badge>
              {row.transit && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <Clock className="h-3 w-3" />
                  {row.transit.days} {t('days')}
                </span>
              )}
            </div>
            <h3 className="mt-1 font-semibold leading-tight">
              {service.carrier}
              <span className="text-muted-foreground font-normal"> · {service.service}</span>
            </h3>
            {savings != null && savings > 0 && (
              <p className="mt-0.5 text-xs text-green-600 dark:text-green-400 font-medium">
                {t('Save {{amount}} vs. the most expensive option', {
                  amount: formatRatePrice(savings, row.currency, i18n.language),
                })}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-bold tabular-nums tracking-tight">
              {row.isListPrice && (
                <span className="mr-1 text-sm font-medium text-muted-foreground align-middle">
                  {t('from')}
                </span>
              )}
              <AnimatedCounter
                value={row.price ?? 0}
                decimals={2}
                suffix={` ${symbol}`}
              />
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
