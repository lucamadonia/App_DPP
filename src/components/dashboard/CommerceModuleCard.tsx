import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useInView } from 'framer-motion';
import { ShoppingCart, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ModuleCard } from './ModuleCard';
import { useCommerceHealth, useCommerceSnapshot } from '@/hooks/queries';
import { formatCurrency, formatNumber } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { relativeTime } from '@/lib/animations';
import type { CommerceKpiBlock } from '@/types/commerce-channels';
import { cn } from '@/lib/utils';

function DeltaBadge({ deltaPct }: { deltaPct?: number }) {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return null;
  const up = deltaPct >= 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        up ? 'text-success' : 'text-destructive',
      )}
    >
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? '+' : ''}{deltaPct.toFixed(1)}%
    </span>
  );
}

function HeroKpi({ label, block, format }: { label: string; block: CommerceKpiBlock; format: (v: number) => string }) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
          {format(block.value)}
        </span>
        <DeltaBadge deltaPct={block.deltaPct} />
      </div>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export function CommerceModuleCard({ enabled, className }: { enabled: boolean; className?: string }) {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '200px' });

  const health = useCommerceHealth(enabled);
  // The mega snapshot fires 7+ queries — only fetch once the card scrolls into view.
  const snapshot = useCommerceSnapshot(enabled && inView);

  const liveDot = (
    <span className="relative ml-1 flex h-2 w-2" aria-hidden>
      <span className="absolute inline-flex h-full w-full animate-status-ping rounded-full bg-success opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
    </span>
  );

  return (
    <div ref={ref} className={cn('h-full', className)}>
      <ModuleCard
        title={t('Commerce Hub')}
        icon={ShoppingCart}
        to="/commerce/mega"
        accentClassName="text-violet-400"
        headerExtra={health.data && health.data.connected > 0 ? liveDot : undefined}
        isLoading={health.isLoading}
        isError={health.isError}
        onRetry={() => health.refetch()}
        className="h-full"
      >
        <div className="space-y-4">
          {/* Channel health — cheap query, renders immediately */}
          {health.data && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" className="text-[11px]">
                {t('{{count}} connected', { count: health.data.connected })}
              </Badge>
              {health.data.errors > 0 && (
                <Badge variant="destructive" className="text-[11px]">
                  {t('{{count}} errors', { count: health.data.errors })}
                </Badge>
              )}
              {health.data.awaitingReauth > 0 && (
                <Badge variant="outline" className="border-warning text-[11px] text-warning">
                  {t('Re-auth required')}
                </Badge>
              )}
              {health.data.lastSyncAt && (
                <span className="text-muted-foreground">
                  {t('Last sync')}: {relativeTime(health.data.lastSyncAt, locale)}
                </span>
              )}
            </div>
          )}

          {/* Revenue KPIs — expensive snapshot with its own inline skeleton */}
          {snapshot.data ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <HeroKpi
                label={t('Revenue today')}
                block={snapshot.data.hero.revenueToday}
                format={(v) => formatCurrency(v, 'EUR', locale)}
              />
              <HeroKpi
                label={t('Orders today')}
                block={snapshot.data.hero.ordersToday}
                format={(v) => formatNumber(v, locale)}
              />
              <HeroKpi
                label={t('Avg. order value')}
                block={snapshot.data.hero.averageOrderValue}
                format={(v) => formatCurrency(v, 'EUR', locale)}
              />
            </div>
          ) : snapshot.isError ? (
            <p className="text-sm text-muted-foreground">{t('Failed to load data')}</p>
          ) : (
            <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="h-12 rounded-lg bg-muted" />
              <div className="h-12 rounded-lg bg-muted" />
              <div className="h-12 rounded-lg bg-muted" />
            </div>
          )}
        </div>
      </ModuleCard>
    </div>
  );
}
