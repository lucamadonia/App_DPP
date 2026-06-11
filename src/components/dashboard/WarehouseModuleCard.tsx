import { useTranslation } from 'react-i18next';
import { Warehouse } from 'lucide-react';
import { ModuleCard, MiniStat, MiniStatGrid } from './ModuleCard';
import { MiniTrendChart } from './MiniTrendChart';
import { useWarehouseModuleStats } from '@/hooks/queries';

export function WarehouseModuleCard({ enabled, className }: { enabled: boolean; className?: string }) {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, isError, refetch } = useWarehouseModuleStats(enabled);

  const trend = (data?.trend ?? []).map((d) => d.receipts + d.shipments + d.adjustments);

  return (
    <ModuleCard
      title={t('Warehouse & Shipping')}
      icon={Warehouse}
      to="/warehouse"
      accentClassName="text-amber-400"
      isLoading={isLoading}
      isError={isError}
      onRetry={() => refetch()}
      className={className}
    >
      {data && (
        <div className="space-y-4">
          <MiniStatGrid>
            <MiniStat label={t('Total stock')} value={data.stock.totalStock} />
            <MiniStat
              label={t('Low stock alerts')}
              value={data.stock.lowStockAlerts}
              accentClassName={data.stock.lowStockAlerts > 0 ? 'text-warning' : undefined}
            />
            <MiniStat label={t('Open shipments')} value={data.shipments.openShipments ?? 0} />
            <MiniStat label={t('Shipped today')} value={data.shipments.shippedToday ?? 0} />
          </MiniStatGrid>
          <MiniTrendChart
            data={trend}
            className="text-amber-400"
            caption={t('Movements last 7 days')}
          />
        </div>
      )}
    </ModuleCard>
  );
}
