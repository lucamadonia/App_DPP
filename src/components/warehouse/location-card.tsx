/**
 * LocationCard — smart warehouse location card with animated capacity ring.
 * Used on /warehouse/locations. Radial SVG gauge (ComplianceGauge pattern),
 * gradient stroke by utilization tier, breathe effect when almost full.
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Warehouse,
  Building2,
  Truck,
  Handshake,
  Undo2,
  MapPin,
  Layers,
  Grid3x3,
  AlertTriangle,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { gridItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { WhLocation, LocationStats, WarehouseLocationType } from '@/types/warehouse';

const TYPE_ICONS: Record<WarehouseLocationType, LucideIcon> = {
  main: Warehouse,
  external: Building2,
  dropship: Truck,
  consignment: Handshake,
  returns: Undo2,
};

const TYPE_TILE_CLASSES: Record<WarehouseLocationType, string> = {
  main: 'from-blue-500/15 to-cyan-500/15 text-blue-600 dark:text-blue-400',
  external: 'from-violet-500/15 to-purple-500/15 text-violet-600 dark:text-violet-400',
  dropship: 'from-amber-500/15 to-orange-500/15 text-amber-600 dark:text-amber-400',
  consignment: 'from-teal-500/15 to-emerald-500/15 text-teal-600 dark:text-teal-400',
  returns: 'from-rose-500/15 to-pink-500/15 text-rose-600 dark:text-rose-400',
};

interface GradientStops {
  from: string;
  to: string;
  text: string;
}

function capacityGradient(percent: number): GradientStops {
  if (percent > 90) return { from: '#ef4444', to: '#f43f5e', text: 'text-red-600 dark:text-red-400' };
  if (percent >= 70) return { from: '#f59e0b', to: '#fb923c', text: 'text-amber-600 dark:text-amber-400' };
  return { from: '#10b981', to: '#34d399', text: 'text-emerald-600 dark:text-emerald-400' };
}

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

interface CapacityRingProps {
  /** Utilization percent, undefined when no capacity is configured */
  percent?: number;
  gradientId: string;
}

function CapacityRing({ percent, gradientId }: CapacityRingProps) {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();

  if (percent == null) {
    return (
      <div className="relative h-20 w-20 shrink-0" aria-label={t('No capacity set')}>
        <svg viewBox="0 0 72 72" className="h-full w-full">
          <circle
            cx="36" cy="36" r={RING_R}
            fill="none" strokeWidth="6.5" strokeDasharray="3 6" strokeLinecap="round"
            className="stroke-muted-foreground/30"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-muted-foreground/60">
          &mdash;
        </span>
      </div>
    );
  }

  const clamped = Math.min(Math.max(percent, 0), 100);
  const offset = RING_C * (1 - clamped / 100);
  const grad = capacityGradient(percent);

  return (
    <div className="relative h-20 w-20 shrink-0" role="img" aria-label={`${t('Capacity')}: ${Math.round(percent)}%`}>
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={grad.from} />
            <stop offset="100%" stopColor={grad.to} />
          </linearGradient>
        </defs>
        <circle
          cx="36" cy="36" r={RING_R}
          fill="none" strokeWidth="6.5"
          className="stroke-muted"
        />
        <motion.circle
          cx="36" cy="36" r={RING_R}
          fill="none" strokeWidth="6.5" strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={RING_C}
          initial={prefersReduced ? { strokeDashoffset: offset } : { strokeDashoffset: RING_C }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
        />
      </svg>
      <span className={cn('absolute inset-0 flex items-center justify-center text-base font-bold tabular-nums', grad.text)}>
        {Math.round(percent)}%
      </span>
    </div>
  );
}

interface LocationCardProps {
  location: WhLocation;
  stats: LocationStats;
}

export function LocationCard({ location, stats }: LocationCardProps) {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();

  const percent = stats.capacityUsedPercent;
  const almostFull = percent != null && percent > 90;
  const TypeIcon = TYPE_ICONS[location.type] || Warehouse;
  const place = [location.city, location.country].filter(Boolean).join(', ');

  return (
    <motion.div
      variants={prefersReduced ? undefined : gridItem}
      whileHover={prefersReduced ? undefined : { y: -4 }}
      whileTap={prefersReduced ? undefined : { scale: 0.97 }}
      className="h-full"
    >
      <Link
        to={`/warehouse/locations/${location.id}`}
        className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${location.name} — ${t('View')}`}
      >
        <Card
          className={cn(
            'relative block h-full gap-0 overflow-hidden p-4 sm:p-5 transition-shadow duration-300 group-hover:shadow-lg',
            almostFull && !prefersReduced && 'animate-card-breathe',
            almostFull && 'border-red-500/40',
            !location.isActive && 'opacity-60',
          )}
        >
          {/* Header: type tile + name + badges */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br', TYPE_TILE_CLASSES[location.type])}>
                <TypeIcon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold leading-tight">{location.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {location.code && <span className="font-mono">{location.code}</span>}
                  {location.code && place && <span className="mx-1">&middot;</span>}
                  {place && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {place}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Badge variant="secondary" className="text-[10px]">{t(location.type)}</Badge>
              {!location.isActive && <Badge variant="outline" className="text-[10px]">{t('Inactive')}</Badge>}
            </div>
          </div>

          {/* Body: capacity ring + numbers */}
          <div className="mt-4 flex items-center gap-4">
            <CapacityRing percent={percent} gradientId={`loc-ring-${location.id}`} />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div>
                <AnimatedCounter value={stats.totalItems} className="text-2xl font-bold leading-none" />
                <p className="mt-0.5 text-xs text-muted-foreground">{t('Units')}</p>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  <span className="tabular-nums font-medium text-foreground">{stats.zoneCount}</span> {t('Zones')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Grid3x3 className="h-3 w-3" />
                  <span className="tabular-nums font-medium text-foreground">{stats.binLocationCount}</span> {t('Bins')}
                </span>
              </div>
            </div>
          </div>

          {/* Footer: warnings + arrow */}
          <div className="mt-4 flex min-h-6 items-center justify-between gap-2 border-t pt-3">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {almostFull && (
                <Badge variant="destructive" className="gap-1 text-[10px]">
                  <span className="relative flex h-1.5 w-1.5">
                    {!prefersReduced && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />}
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  {t('Almost full')}
                </Badge>
              )}
              {stats.lowStockCount > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {stats.lowStockCount} {t('Low stock')}
                </span>
              )}
              {!almostFull && stats.lowStockCount === 0 && (
                <span className="text-xs text-muted-foreground">
                  {percent != null ? t('Capacity') : t('No capacity set')}
                </span>
              )}
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}
