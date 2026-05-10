import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PlatformIcon } from './PlatformIcon';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { CommerceLiveOrder } from '@/types/commerce-channels';

interface LiveOrderFeedProps {
  orders: CommerceLiveOrder[];
  /** Display order count limit. Older orders animate out. */
  limit?: number;
}

/**
 * Streaming live order feed for the wall display.
 *
 * Desktop: fills its grid cell (`lg:h-full`), shows up to `limit` orders.
 * Mobile: caps height at 60vh so it never blows out the page, shows 5 rows,
 * and renders a "Alle Live-Bestellungen →" drill-down link below.
 */
export function LiveOrderFeed({ orders, limit = 8 }: LiveOrderFeedProps) {
  const { t } = useTranslation('commerce');
  const isMobile = useIsMobile();
  const effectiveLimit = isMobile ? Math.min(limit, 5) : limit;
  const visible = orders.slice(0, effectiveLimit);
  const staggerStep = isMobile ? 0.04 : 0.08;

  return (
    <div className="relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl lg:min-h-0">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <h3 className="text-sm font-medium tracking-wider uppercase text-white/80">
            {t('Live Orders')}
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-white/40 tabular-nums">
          {visible.length} / {effectiveLimit}
        </span>
      </div>

      <ul className="relative flex-1 overflow-y-auto px-2 py-2 sm:px-3 max-h-[60vh] lg:max-h-none">
        <AnimatePresence initial={false}>
          {visible.map((o, i) => (
            <motion.li
              key={o.id}
              layout
              initial={{ opacity: 0, y: -16, filter: 'blur(8px)' }}
              animate={{
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                transition: { delay: i < 5 ? i * staggerStep : 0 },
              }}
              exit={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className={cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-3.5',
                'transition-colors',
                'hover:bg-white/[0.03] active:bg-white/[0.05] active:translate-x-[2px]',
              )}
            >
              <PlatformIcon platform={o.platform} size={20} badge />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-white/90">
                    {o.externalOrderNumber || `#${o.id.slice(0, 8)}`}
                  </span>
                  <span className="font-display tabular-nums text-sm text-white">
                    {formatCurrency(o.totalAmount, o.currency)}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50 flex-wrap">
                  <span className="truncate">{o.customerCountryName || o.customerCountry || '—'}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {o.itemCount} {t('items')}
                  </span>
                  <span aria-hidden>·</span>
                  <span className="tabular-nums">{relTime(o.placedAt)}</span>
                  {o.dppLinked && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                        <ShieldCheck className="h-3 w-3" />
                        DPP
                      </span>
                    </>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
        {visible.length === 0 && (
          <li className="flex h-32 items-center justify-center px-3 text-center text-sm text-white/40">
            {t('No orders yet today — connect a channel to start streaming')}
          </li>
        )}
      </ul>

      {/* Mobile-only drill-down to full order list */}
      <Link
        to="/commerce"
        className={cn(
          'flex items-center justify-center gap-1 border-t border-white/5 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-white/60',
          'active:bg-white/5 transition-colors lg:hidden',
        )}
      >
        {t('Alle Bestellungen')}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>

      {/* Top edge fade */}
      <div className="pointer-events-none absolute left-0 right-0 top-12 sm:top-14 h-6 bg-gradient-to-b from-black/60 to-transparent" />
      {/* Bottom edge fade above the drill-down link */}
      <div className="pointer-events-none absolute bottom-12 left-0 right-0 h-10 bg-gradient-to-t from-black/40 to-transparent lg:bottom-0" />
    </div>
  );
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
