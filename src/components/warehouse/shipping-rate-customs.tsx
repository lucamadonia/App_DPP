/**
 * Shipping Rates — customs section.
 *
 * Rendered only for third-country / special-zone destinations: required
 * forms from the smart-packing rule engine plus destination-zone hints.
 */
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileText, Landmark, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { staggerItem, useMotionVariants } from '@/lib/motion';
import { getCountryZone, requiredCustomsForms } from '@/lib/smart-packing';

export function ShippingRateCustoms({
  origin,
  destination,
  valueEur,
  weightKg,
}: {
  origin: string;
  destination: string;
  valueEur: number;
  weightKg: number;
}) {
  const { t } = useTranslation('warehouse');
  const itemVariants = useMotionVariants(staggerItem);

  const zone = getCountryZone(destination);
  const customs = requiredCustomsForms(origin, destination, valueEur, weightKg);

  if (!zone || (zone.zone !== 'third_country' && zone.zone !== 'special_zone')) return null;
  if (!customs.needed) return null;

  const hints = Array.from(new Set([...customs.hints, ...zone.hints]));

  return (
    <motion.div variants={itemVariants}>
      <GlassCard className="p-4 sm:p-5 space-y-3 border-amber-200/60 dark:border-amber-900/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
            <Landmark className="h-[18px] w-[18px] text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="font-semibold">{t('Customs & forms')}</h2>
            <p className="text-xs text-muted-foreground">{customs.reason}</p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('Required forms')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {customs.forms.map((form) => (
              <Badge
                key={form}
                variant="outline"
                className="gap-1 border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300"
              >
                <FileText className="h-3 w-3" />
                {form}
              </Badge>
            ))}
          </div>
        </div>

        {hints.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('Destination notes')}
            </p>
            <ul className="space-y-1.5">
              {hints.map((hint) => (
                <li key={hint} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                  <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-px text-amber-500" />
                  <span>{hint}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}
