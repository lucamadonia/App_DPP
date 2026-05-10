import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PlatformIcon } from './PlatformIcon';
import { cn } from '@/lib/utils';
import {
  type CommercePlatformBreakdownEntry,
  getPlatformDescriptor,
} from '@/types/commerce-channels';

interface PlatformBreakdownProps {
  entries: CommercePlatformBreakdownEntry[];
}

/**
 * Shows order count + revenue per platform with a 7-day sparkline.
 *
 * Desktop: single row per platform — `[icon+label | sparkline | revenue+share-bar]`.
 * Mobile (<sm): wraps to two rows — line 1 has icon/label/revenue, line 2 has
 * the full-width sparkline and share bar. Removes the previous `min-w-[140px]`
 * and `min-w-[120px]` that caused horizontal overflow under 375 px.
 */
export function PlatformBreakdown({ entries }: PlatformBreakdownProps) {
  const { t } = useTranslation('commerce');
  const totalRevenue = entries.reduce((s, e) => s + e.revenue, 0) || 1;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5 sm:py-4">
        <h3 className="text-sm font-medium tracking-wider uppercase text-white/80">
          {t('Channel Mix — 7 days')}
        </h3>
        <span className="hidden sm:inline text-[10px] uppercase tracking-widest text-white/40">
          {t('share')} · 7 {t('day-sparkline')}
        </span>
      </div>

      <ul className="divide-y divide-white/5">
        {entries.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-white/40">{t('No channel activity yet')}</li>
        )}
        {entries.map((e, i) => {
          const desc = getPlatformDescriptor(e.platform);
          const share = (e.revenue / totalRevenue) * 100;
          return (
            <motion.li
              key={e.platform}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={`/commerce?platform=${e.platform}`}
                className={cn(
                  'flex flex-col gap-3 px-4 py-3.5 sm:grid sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4 sm:px-5',
                  'transition-colors hover:bg-white/[0.03] active:bg-white/[0.04]',
                )}
              >
                {/* Row 1 on mobile: icon + label + revenue side by side */}
                <div className="flex items-center justify-between gap-3 sm:contents">
                  <div className="flex items-center gap-3 min-w-0">
                    <PlatformIcon platform={e.platform} size={16} badge />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{desc.label}</div>
                      <div className="text-[11px] text-white/45">
                        {new Intl.NumberFormat('de-DE').format(e.orders)} {t('orders')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right sm:hidden">
                    <div className="font-display tabular-nums text-base text-white">
                      {new Intl.NumberFormat('de-DE', {
                        style: 'currency',
                        currency: 'EUR',
                        maximumFractionDigits: 0,
                      }).format(e.revenue)}
                    </div>
                  </div>
                </div>

                {/* Sparkline — full width on mobile (row 2), bounded on desktop */}
                <Sparkline values={e.sparkline} color={desc.brandColor} />

                {/* Revenue + share bar (desktop column 3 only — mobile shows revenue inline above) */}
                <div className="hidden sm:block text-right">
                  <div className="font-display tabular-nums text-base text-white">
                    {new Intl.NumberFormat('de-DE', {
                      style: 'currency',
                      currency: 'EUR',
                      maximumFractionDigits: 0,
                    }).format(e.revenue)}
                  </div>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${share}%`, background: desc.brandColor, opacity: 0.85 }}
                    />
                  </div>
                </div>

                {/* Mobile-only share bar — full width below sparkline */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-white/5 sm:hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${share}%`, background: desc.brandColor, opacity: 0.85 }}
                  />
                </div>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

interface SparklineProps {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}

function Sparkline({ values, color, width = 220, height = 36 }: SparklineProps) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * width;
      const y = height - (v / max) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-9 w-full sm:max-w-xs">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.7" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        fill={`url(#spark-grad-${color.replace('#', '')})`}
        points={`0,${height} ${points} ${width},${height}`}
      />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}
