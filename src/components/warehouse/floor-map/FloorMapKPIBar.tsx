import { useTranslation } from 'react-i18next';
import { Package, LayoutGrid, Activity, AlertTriangle } from 'lucide-react';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import type { WarehouseZone, WhStockLevel } from '@/types/warehouse';
import { getStockByZone, getZoneFillRatio } from './floor-map-utils';
import { CRITICAL_FILL_THRESHOLD } from './floor-map-constants';

interface FloorMapKPIBarProps {
  zones: WarehouseZone[];
  stock: WhStockLevel[];
}

export function FloorMapKPIBar({ zones, stock }: FloorMapKPIBarProps) {
  const { t } = useTranslation('warehouse');
  const stagger = useStaggeredList(4, { interval: 80, initialDelay: 100 });

  const totalUnits = stock.reduce((sum, s) => sum + s.quantityAvailable, 0);
  const activeZones = zones.filter((z) => {
    const { totalUnits: u } = getStockByZone(stock, z.name);
    return u > 0;
  }).length;
  const avgUtil =
    zones.length > 0
      ? Math.round(
          (zones.reduce(
            (sum, z) => sum + getZoneFillRatio(stock, zones, z.name),
            0,
          ) /
            zones.length) *
            100,
        )
      : 0;
  const alerts = zones.filter((z) => {
    const ratio = getZoneFillRatio(stock, zones, z.name);
    const { totalUnits: u } = getStockByZone(stock, z.name);
    return ratio > CRITICAL_FILL_THRESHOLD || u === 0;
  }).length;

  const animUnits = useAnimatedNumber(totalUnits, { duration: 900 });
  const animActive = useAnimatedNumber(activeZones, { duration: 700, delay: 80 });
  const animUtil = useAnimatedNumber(avgUtil, { duration: 800, delay: 160 });
  const animAlerts = useAnimatedNumber(alerts, { duration: 600, delay: 240 });

  const kpis = [
    {
      label: t('Total Units'),
      value: animUnits.toLocaleString(),
      icon: Package,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: t('Active Zones'),
      value: `${animActive} / ${zones.length}`,
      icon: LayoutGrid,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: t('Avg Utilization'),
      value: `${animUtil}%`,
      icon: Activity,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: t('Alerts'),
      value: String(animAlerts),
      icon: AlertTriangle,
      color: alerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
      bg: alerts > 0 ? 'bg-red-500/10' : 'bg-muted/50',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {kpis.map((kpi, i) => (
        <div
          key={kpi.label}
          className="flex items-center gap-3 rounded-xl border bg-card/80 backdrop-blur-sm px-3 py-2.5 shadow-sm transition-all duration-300"
          style={{
            opacity: stagger[i] ? 1 : 0,
            transform: stagger[i] ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${kpi.bg} shrink-0`}>
            <kpi.icon className={`h-4.5 w-4.5 ${kpi.color}`} />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground truncate">{kpi.label}</div>
            <div className="text-sm font-bold tabular-nums tracking-tight">{kpi.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
