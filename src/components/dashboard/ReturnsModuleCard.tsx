import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ModuleCard, MiniStat, MiniStatGrid } from './ModuleCard';
import { MiniTrendChart } from './MiniTrendChart';
import { useReturnsModuleStats } from '@/hooks/queries';
import { formatCurrency } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

export function ReturnsModuleCard({ enabled, className }: { enabled: boolean; className?: string }) {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useReturnsModuleStats(enabled);

  const trend = (data?.returns.dailyReturns ?? []).slice(-14).map((d) => d.count);

  return (
    <ModuleCard
      title={t('Returns & Support')}
      icon={RotateCcw}
      to="/returns"
      accentClassName="text-rose-400"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      className={className}
    >
      {data && (
        <div className="space-y-4">
          <MiniStatGrid>
            <MiniStat label={t('Open returns')} value={data.returns.openReturns} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
                  {data.tickets.open}
                </span>
                {data.tickets.overdue > 0 && (
                  <Badge variant="destructive" className="px-1.5 text-[10px]">
                    {t('{{count}} overdue', { count: data.tickets.overdue })}
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">{t('Open tickets')}</p>
            </div>
            <MiniStat
              label={t('SLA compliance')}
              value={`${Math.round(data.returns.slaCompliance)}%`}
              accentClassName={data.returns.slaCompliance >= 90 ? 'text-success' : 'text-warning'}
            />
            <MiniStat
              label={t('Refund volume')}
              value={formatCurrency(data.returns.refundVolume, 'EUR', locale)}
              animated={false}
            />
          </MiniStatGrid>
          <MiniTrendChart
            data={trend}
            className="text-rose-400"
            caption={t('Returns last 14 days')}
          />
        </div>
      )}
    </ModuleCard>
  );
}
