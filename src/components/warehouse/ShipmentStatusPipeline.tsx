import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SHIPMENT_STATUS_ICONS, SHIPMENT_STATUS_GRADIENTS } from '@/lib/warehouse-constants';
import type { ShipmentStatus } from '@/types/warehouse';
import { SHIPMENT_STATUS_ORDER } from '@/types/warehouse';

interface ShipmentStatusPipelineProps {
  current: ShipmentStatus;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

/**
 * Polished, responsive lifecycle pipeline for warehouse shipments.
 * Horizontal on ≥ sm, vertical timeline on phones. Per-status gradients + icons,
 * animated glow halo on the active node (skipped under prefers-reduced-motion).
 */
export function ShipmentStatusPipeline({
  current,
  createdAt,
  shippedAt,
  deliveredAt,
}: ShipmentStatusPipelineProps) {
  const { t } = useTranslation('warehouse');
  const reducedMotion = useReducedMotion();
  const isCancelled = current === 'cancelled';
  const currentIdx = SHIPMENT_STATUS_ORDER.indexOf(current);
  const steps = SHIPMENT_STATUS_ORDER;
  const progressPct = isCancelled ? 0 : (currentIdx / (steps.length - 1)) * 100;
  const activeGradient = isCancelled
    ? SHIPMENT_STATUS_GRADIENTS.cancelled
    : SHIPMENT_STATUS_GRADIENTS[current];

  const dateMap: Record<string, string | undefined> = {
    draft: createdAt,
    shipped: shippedAt,
    delivered: deliveredAt,
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' });

  return (
    <div className="w-full">
      {/* ── Desktop / tablet: horizontal pipeline ─────────────── */}
      <div className="hidden sm:block">
        <div className="relative px-4 pt-2 pb-1">
          {/* Connector track (behind nodes) */}
          <div className="pointer-events-none absolute left-8 right-8 top-7 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${activeGradient}`}
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>

          {/* Nodes */}
          <div className="relative flex items-start justify-between">
            {steps.map((status, idx) => {
              const Icon = SHIPMENT_STATUS_ICONS[status];
              const isPast = !isCancelled && currentIdx > idx;
              const isCurrent = !isCancelled && status === current;
              const isFuture = isCancelled || currentIdx < idx;
              const gradient = SHIPMENT_STATUS_GRADIENTS[status];
              const date = dateMap[status];

              return (
                <div
                  key={status}
                  className="flex flex-col items-center flex-1 min-w-0"
                >
                  <div className="relative flex h-14 w-14 items-center justify-center">
                    {/* Animated glow halo on current node */}
                    {isCurrent && !reducedMotion && (
                      <motion.span
                        aria-hidden
                        className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} opacity-40 blur-md`}
                        animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0.15, 0.4] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}

                    {/* Node circle */}
                    <div
                      className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                        isCurrent
                          ? `h-12 w-12 bg-gradient-to-br ${gradient} text-white shadow-lg shadow-slate-900/15 scale-105 ring-2 ring-white dark:ring-slate-900`
                          : isPast
                            ? `h-10 w-10 bg-gradient-to-br ${gradient} text-white shadow-md`
                            : 'h-10 w-10 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400'
                      }`}
                    >
                      <Icon className={isCurrent ? 'h-5 w-5' : 'h-4 w-4'} strokeWidth={isCurrent ? 2.25 : 2} />

                      {/* Check overlay on past nodes */}
                      {isPast && (
                        <span className="absolute -bottom-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 text-white">
                          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Label */}
                  <span
                    className={`mt-2 text-[11px] sm:text-xs text-center leading-tight whitespace-nowrap ${
                      isCurrent
                        ? 'font-semibold text-slate-900 dark:text-white'
                        : isPast
                          ? 'text-slate-600 dark:text-slate-300'
                          : isFuture && !isCancelled
                            ? 'text-slate-400 dark:text-slate-500'
                            : 'text-slate-400 dark:text-slate-600'
                    }`}
                  >
                    {t(status)}
                  </span>

                  {/* Date chip */}
                  {date && (isPast || isCurrent) && (
                    <span className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                      {fmtDate(date)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Mobile: vertical timeline ─────────────────────────── */}
      <ol className="sm:hidden relative pl-3">
        {steps.map((status, idx) => {
          const Icon = SHIPMENT_STATUS_ICONS[status];
          const isPast = !isCancelled && currentIdx > idx;
          const isCurrent = !isCancelled && status === current;
          const gradient = SHIPMENT_STATUS_GRADIENTS[status];
          const date = dateMap[status];
          const isLast = idx === steps.length - 1;

          return (
            <li key={status} className="relative flex items-start gap-3 pb-5 last:pb-0">
              {/* Vertical connector */}
              {!isLast && (
                <span
                  aria-hidden
                  className={`absolute left-[15px] top-9 bottom-0 w-0.5 rounded-full ${
                    isPast ? 'bg-gradient-to-b from-emerald-500 to-emerald-400' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}

              {/* Node */}
              <div className="relative flex h-8 w-8 items-center justify-center flex-shrink-0">
                {isCurrent && !reducedMotion && (
                  <motion.span
                    aria-hidden
                    className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient} opacity-40 blur-md`}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.15, 0.4] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <div
                  className={`relative flex items-center justify-center rounded-full transition-all duration-300 ${
                    isCurrent
                      ? `h-8 w-8 bg-gradient-to-br ${gradient} text-white shadow-md ring-2 ring-white dark:ring-slate-900`
                      : isPast
                        ? `h-7 w-7 bg-gradient-to-br ${gradient} text-white`
                        : 'h-7 w-7 border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400'
                  }`}
                >
                  <Icon className={isCurrent ? 'h-4 w-4' : 'h-3.5 w-3.5'} strokeWidth={isCurrent ? 2.25 : 2} />
                  {isPast && (
                    <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 text-white">
                      <Check className="h-2 w-2" strokeWidth={4} />
                    </span>
                  )}
                </div>
              </div>

              {/* Label + date */}
              <div className="flex-1 min-w-0 pt-0.5">
                <div
                  className={`text-sm leading-tight ${
                    isCurrent
                      ? 'font-semibold text-slate-900 dark:text-white'
                      : isPast
                        ? 'text-slate-700 dark:text-slate-200'
                        : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {t(status)}
                </div>
                {date && (isPast || isCurrent) && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {fmtDate(date)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Cancelled banner */}
      {isCancelled && (
        <div className="flex items-center justify-center mt-4 gap-2">
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('cancelled')}
          </Badge>
        </div>
      )}
    </div>
  );
}
