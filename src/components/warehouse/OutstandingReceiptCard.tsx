/**
 * OutstandingReceiptCard
 *
 * Mobile card for one outstanding goods receipt (batch where
 * ordered > received). Shows product/batch identity, a color-coded
 * age pill, received-vs-ordered progress and a thumb-reachable
 * full-width "Stock In" CTA that deep-links into the goods
 * receipt wizard.
 */

import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, ArrowDownToLine } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OutstandingBatch } from '@/services/supabase/batches';

// ---------------------------------------------------------------------------
// Age tier helpers (shared with the desktop table on OutstandingReceiptsPage)
// ---------------------------------------------------------------------------

export type AgeTier = 'fresh' | 'aging' | 'overdue';

// eslint-disable-next-line react-refresh/only-export-components -- shared age-tier helper, also used by the desktop table on OutstandingReceiptsPage
export const getAgeTier = (days: number): AgeTier => {
  if (days > 30) return 'overdue';
  if (days > 14) return 'aging';
  return 'fresh';
};

const AGE_PILL_STYLES: Record<AgeTier, string> = {
  fresh: 'bg-muted text-muted-foreground',
  aging: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
};

/** Color-coded "n days open" pill: neutral < 14d, amber 14-30d, red > 30d. */
export function AgePill({ days, className }: { days: number; className?: string }) {
  const { t } = useTranslation('warehouse');
  const tier = getAgeTier(days);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        AGE_PILL_STYLES[tier],
        className
      )}
    >
      {tier === 'overdue' && <AlertTriangle className="h-3 w-3" aria-hidden />}
      {tier !== 'fresh' && (
        <>
          <span className="font-semibold">{t(tier === 'aging' ? 'Aging' : 'Overdue')}</span>
          <span aria-hidden>&middot;</span>
        </>
      )}
      {t('{{count}} days open', { count: days })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface OutstandingReceiptCardProps {
  row: OutstandingBatch;
  locale: string;
}

export function OutstandingReceiptCard({ row, locale }: OutstandingReceiptCardProps) {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4 space-y-3">
        {/* Head: product + age pill */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Link
              to={`/products/${row.productId}`}
              className="block font-semibold text-sm truncate hover:underline"
            >
              {row.productName}
            </Link>
            <div className="text-xs text-muted-foreground font-mono truncate">
              {row.productGtin}
            </div>
          </div>
          <AgePill days={row.daysOutstanding} className="shrink-0" />
        </div>

        {/* Batch row */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Link
            to={`/products/${row.productId}/batches/${row.batchId}`}
            className="font-mono text-foreground hover:underline"
          >
            {row.batchSerial}
          </Link>
          <span>{formatDate(row.productionDate, locale)}</span>
          {row.status !== 'live' && (
            <Badge variant="outline" className="text-[10px]">
              {row.status}
            </Badge>
          )}
        </div>

        {/* Quantities + mini progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="tabular-nums text-muted-foreground">
              {row.received.toLocaleString()} / {row.ordered.toLocaleString()} {t('received')}
            </span>
            <span className="tabular-nums">
              <span className="text-xs text-muted-foreground mr-1.5">{t('Outstanding')}</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {row.outstanding.toLocaleString()}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={row.receivedPercent} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
              {row.receivedPercent}%
            </span>
          </div>
        </div>

        {/* Meta: supplier + last receipt */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {row.supplierName && <span className="truncate">{row.supplierName}</span>}
          <span>
            {t('Last receipt')}:{' '}
            {row.lastReceiptAt ? (
              formatDate(row.lastReceiptAt, locale)
            ) : (
              <span className="italic">{t('Never')}</span>
            )}
          </span>
        </div>

        {/* CTA: thumb-reachable, >=44px */}
        <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }}>
          <Button asChild className="w-full h-11">
            <Link to={`/warehouse/goods-receipt?productId=${row.productId}&batchId=${row.batchId}`}>
              <ArrowDownToLine className="h-4 w-4" />
              {t('Stock In')}
            </Link>
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  );
}
