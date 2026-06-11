import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import { ModuleCard, MiniStat, MiniStatGrid } from './ModuleCard';
import { useCrmModuleStats } from '@/hooks/queries';
import { formatCurrency } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

export function CrmModuleCard({ enabled, className }: { enabled: boolean; className?: string }) {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const { data, isLoading, isError, refetch } = useCrmModuleStats(enabled);

  return (
    <ModuleCard
      title={t('CRM')}
      icon={Users}
      to="/crm"
      accentClassName="text-sky-400"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      className={className}
    >
      {data && (
        <MiniStatGrid>
          <MiniStat label={t('Customers')} value={data.totalCustomers} />
          <MiniStat label={t('New (30 days)')} value={data.newLast30d} />
          <MiniStat
            label={t('Avg. CLV')}
            value={formatCurrency(data.avgCLV, 'EUR', locale)}
            animated={false}
          />
          <div className="min-w-0">
            <div className="flex items-baseline gap-1 text-xl font-bold tabular-nums tracking-tight sm:text-2xl">
              <span className="text-success">{data.vipCount}</span>
              <span className="text-muted-foreground/50">/</span>
              <span className={data.atRiskCount > 0 ? 'text-warning' : undefined}>{data.atRiskCount}</span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {t('VIP')} / {t('At risk')}
            </p>
          </div>
        </MiniStatGrid>
      )}
    </ModuleCard>
  );
}
