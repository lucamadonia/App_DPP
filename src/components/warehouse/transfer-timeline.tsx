/**
 * TransferTimeline — transfer history as a vertical timeline.
 *
 * Staggered entrance, compact "From → To" per entry, relative timestamps,
 * ping dot for entries created today, shimmer skeletons while loading,
 * error state with retry, and an empty state with CTA.
 */
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRightLeft, MoveRight, AlertTriangle, Plus, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { relativeTime } from '@/lib/animations';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface TransferEntry {
  id: string;
  transactionNumber: string;
  productName: string;
  batchSerialNumber?: string;
  /** Always positive — number of units moved */
  quantity: number;
  fromName?: string;
  toName?: string;
  notes?: string;
  createdAt: string;
}

interface TransferTimelineProps {
  entries: TransferEntry[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onNewTransfer: () => void;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden rounded-md bg-muted', className)}>
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent dark:via-white/10" />
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="relative space-y-5 pl-7">
      <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="relative" style={{ opacity: 1 - i * 0.18 }}>
          <span className="absolute -left-7 top-1 ml-[3px] h-3 w-3 rounded-full bg-muted" />
          <div className="space-y-2">
            <ShimmerBlock className="h-4 w-40 sm:w-56" />
            <ShimmerBlock className="h-3 w-52 sm:w-72" />
            <ShimmerBlock className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TransferTimeline({
  entries,
  loading,
  error,
  onRetry,
  onNewTransfer,
}: TransferTimelineProps) {
  const { t, i18n } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();

  if (loading) return <TimelineSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="text-sm text-muted-foreground">{t('Failed to load transfers')}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('Retry')}
        </Button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center gap-3 py-14 text-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <ArrowRightLeft className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold">{t('No transfers yet')}</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
            {t('Move stock from one location to another — every movement shows up here.')}
          </p>
        </div>
        <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }}>
          <Button onClick={onNewTransfer} className="mt-1 h-11">
            <Plus className="mr-2 h-4 w-4" />
            {t('Create your first transfer')}
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.ol
      variants={prefersReduced ? undefined : staggerContainer}
      initial={prefersReduced ? undefined : 'initial'}
      animate={prefersReduced ? undefined : 'animate'}
      className="relative space-y-1 pl-7"
    >
      {/* Rail */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />

      {entries.map((entry) => {
        const today = isToday(entry.createdAt);
        return (
          <motion.li
            key={entry.id}
            variants={prefersReduced ? undefined : staggerItem}
            className="group relative rounded-lg px-2 py-2.5 -ml-2 transition-colors hover:bg-muted/50"
          >
            {/* Timeline dot */}
            <span className="absolute -left-5 top-4 ml-[3px] flex h-3 w-3" aria-hidden="true">
              {today && !prefersReduced && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/50" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-3 w-3 rounded-full border-2 border-background',
                  today ? 'bg-primary' : 'bg-muted-foreground/40'
                )}
              />
            </span>

            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
              <div className="min-w-0">
                {/* Product + batch */}
                <p className="truncate text-sm font-medium">
                  {entry.productName}
                  {entry.batchSerialNumber && (
                    <span className="ml-1.5 font-mono text-xs text-muted-foreground">
                      {entry.batchSerialNumber}
                    </span>
                  )}
                </p>
                {/* From → To */}
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="truncate max-w-[8rem] sm:max-w-[12rem]">{entry.fromName || '—'}</span>
                  <MoveRight className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate max-w-[8rem] sm:max-w-[12rem] font-medium text-foreground/80">
                    {entry.toName || '—'}
                  </span>
                </p>
                {entry.notes && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground/80">
                    <StickyNote className="h-3 w-3 shrink-0" />
                    <span className="truncate">{entry.notes}</span>
                  </p>
                )}
              </div>

              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="rounded-md bg-orange-50 px-2 py-0.5 text-xs font-bold tabular-nums text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                  {entry.quantity} {t('units')}
                </span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap" title={new Date(entry.createdAt).toLocaleString()}>
                  {relativeTime(entry.createdAt, i18n.language)}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60 whitespace-nowrap">
                  {entry.transactionNumber}
                </span>
              </div>
            </div>
          </motion.li>
        );
      })}
    </motion.ol>
  );
}
