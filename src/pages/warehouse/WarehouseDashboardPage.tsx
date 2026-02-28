import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package, Truck, Warehouse, AlertTriangle, ArrowRight,
  TrendingUp, ArrowRightLeft, ClipboardList, MapPin, Clock, Box,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { getWarehouseStats, getRecentTransactions, getPendingActions } from '@/services/supabase/wh-stock';
import { getShipmentStats } from '@/services/supabase/wh-shipments';
import { getLocationCapacitySummaries } from '@/services/supabase/wh-locations';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { relativeTime } from '@/lib/animations';
import { formatVolumeM3 } from '@/lib/warehouse-volume';
import type { WhStockTransaction, LocationCapacitySummary, PendingAction } from '@/types/warehouse';

/* -------------------------------------------------------------------------- */
/*  Animated KPI card                                                         */
/* -------------------------------------------------------------------------- */

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  bgColor,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loading: boolean;
}) {
  const animated = useAnimatedNumber(loading ? 0 : value);

  return (
    <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2.5 ${bgColor}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0">
            {loading ? (
              <Skeleton className="h-7 w-16 mb-1" />
            ) : (
              <p className="text-2xl font-bold tabular-nums leading-none">
                {animated.toLocaleString()}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/*  Transaction type icon helper                                              */
/* -------------------------------------------------------------------------- */

const TX_ICON_MAP: Record<string, React.ElementType> = {
  goods_receipt: Package,
  shipment: Truck,
  transfer_out: ArrowRightLeft,
  transfer_in: ArrowRightLeft,
  adjustment: ClipboardList,
  return_receipt: Package,
  reservation: Clock,
  release: Clock,
  damage: AlertTriangle,
  write_off: AlertTriangle,
};

function txIcon(type: string): React.ElementType {
  return TX_ICON_MAP[type] ?? Package;
}

/* -------------------------------------------------------------------------- */
/*  Severity dot color                                                        */
/* -------------------------------------------------------------------------- */

function severityDotClass(severity: PendingAction['severity']): string {
  switch (severity) {
    case 'critical': return 'bg-red-500';
    case 'warning': return 'bg-orange-500';
    default: return 'bg-blue-500';
  }
}

/* -------------------------------------------------------------------------- */
/*  Capacity bar color                                                        */
/* -------------------------------------------------------------------------- */

function capacityColor(pct: number): string {
  if (pct > 90) return '[--progress-foreground:theme(--color-red-500)]';
  if (pct > 70) return '[--progress-foreground:theme(--color-yellow-500)]';
  return '[--progress-foreground:theme(--color-green-500)]';
}

/* -------------------------------------------------------------------------- */
/*  Main page                                                                 */
/* -------------------------------------------------------------------------- */

export function WarehouseDashboardPage() {
  const { t, i18n } = useTranslation('warehouse');
  const locale = i18n.language;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalStock: 0, totalLocations: 0, lowStockAlerts: 0 });
  const [shipmentStats, setShipmentStats] = useState({ openShipments: 0, shippedToday: 0 });
  const [locations, setLocations] = useState<LocationCapacitySummary[]>([]);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [transactions, setTransactions] = useState<WhStockTransaction[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, ss, loc, act, tx] = await Promise.all([
          getWarehouseStats(),
          getShipmentStats(),
          getLocationCapacitySummaries(),
          getPendingActions(),
          getRecentTransactions(8),
        ]);
        if (cancelled) return;
        setStats(s);
        setShipmentStats(ss as { openShipments: number; shippedToday: number });
        setLocations(loc);
        setActions(act);
        setTransactions(tx);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /* ---- KPI definitions -------------------------------------------------- */

  const kpis = [
    {
      label: t('Total Stock'),
      value: stats.totalStock,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-950',
    },
    {
      label: t('Total Locations'),
      value: stats.totalLocations,
      icon: Warehouse,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-950',
    },
    {
      label: t('Open Shipments'),
      value: shipmentStats.openShipments,
      icon: Truck,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-950',
    },
    {
      label: t('Shipped Today'),
      value: shipmentStats.shippedToday,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-950',
    },
    {
      label: t('Low Stock Alerts'),
      value: stats.lowStockAlerts,
      icon: AlertTriangle,
      color: stats.lowStockAlerts > 0 ? 'text-red-600' : 'text-muted-foreground',
      bgColor: stats.lowStockAlerts > 0
        ? 'bg-red-100 dark:bg-red-950'
        : 'bg-muted',
    },
  ];

  /* ---- Quick action definitions ----------------------------------------- */

  const quickActions = [
    { label: t('Goods Receipt'), to: '/warehouse/goods-receipt', icon: Package },
    { label: t('Create Shipment'), to: '/warehouse/shipments/new', icon: Truck },
    { label: t('Transfer'), to: '/warehouse/transfers', icon: ArrowRightLeft },
    { label: t('Inventory'), to: '/warehouse/inventory', icon: ClipboardList },
    { label: t('Warehouses'), to: '/warehouse/locations', icon: MapPin },
    { label: t('Low Stock Alerts'), to: '/warehouse/inventory?lowStock=true', icon: AlertTriangle },
  ];

  /* ---- Render ----------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t('Warehouse & Fulfillment')}</h1>
        <p className="text-muted-foreground">{t('Dashboard')}</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <KPICard key={kpi.label} {...kpi} loading={loading} />
        ))}
      </div>

      {/* Top row: Capacity + Pending Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Warehouse Capacity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Warehouse className="h-4 w-4 text-muted-foreground" />
              {t('Warehouse Capacity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
            ) : locations.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('No locations configured')}
              </p>
            ) : (
              <div className="space-y-4">
                {/* Total Volume Utilization */}
                {(() => {
                  const totalCap = locations.reduce((s, l) => s + (l.capacityVolumeM3 ?? 0), 0);
                  const totalUsed = locations.reduce((s, l) => s + (l.usedVolumeM3 ?? 0), 0);
                  const totalFill = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;
                  if (totalCap <= 0) return null;
                  return (
                    <div className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium flex items-center gap-1.5">
                          <Box className="h-3.5 w-3.5 text-primary" />
                          {t('Total Utilization')}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatVolumeM3(totalUsed)} / {formatVolumeM3(totalCap)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(totalFill, 100)}
                          className={`h-2.5 flex-1 ${capacityColor(totalFill)}`}
                        />
                        <span className="text-xs font-medium tabular-nums w-8 text-right">{totalFill}%</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Per-location rows */}
                {locations.map((loc) => {
                  const fillUnits = loc.fillPercentUnits ?? 0;
                  const capacityUnits = loc.capacityUnits ?? 0;
                  const fillVol = loc.fillPercentVolume ?? 0;
                  const hasVolume = loc.capacityVolumeM3 != null && loc.capacityVolumeM3 > 0;
                  const maxFill = Math.max(fillUnits, fillVol);

                  return (
                    <div key={loc.locationId} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <Link
                          to={`/warehouse/locations/${loc.locationId}`}
                          className="font-medium hover:underline truncate transition-colors"
                        >
                          {loc.locationName}
                          {loc.locationCode ? ` (${loc.locationCode})` : ''}
                        </Link>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {maxFill > 90 && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              {t('Almost full')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Units bar */}
                      {capacityUnits > 0 && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-10 shrink-0">{t('Units')}</span>
                          <Progress
                            value={Math.min(fillUnits, 100)}
                            className={`h-1.5 flex-1 ${capacityColor(fillUnits)}`}
                          />
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-24 text-right">
                            {loc.totalUnits.toLocaleString()} / {capacityUnits.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {!capacityUnits && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-10 shrink-0">{t('Units')}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {loc.totalUnits.toLocaleString()} {t('units')}
                          </span>
                        </div>
                      )}
                      {/* Volume bar */}
                      {hasVolume && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground w-10 shrink-0">{t('Volume')}</span>
                          <Progress
                            value={Math.min(fillVol, 100)}
                            className={`h-1.5 flex-1 ${capacityColor(fillVol)}`}
                          />
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-24 text-right">
                            {formatVolumeM3(loc.usedVolumeM3 ?? 0)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t('Pending Actions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : actions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('No pending actions')}
              </p>
            ) : (
              <div className="space-y-3">
                {actions.map((action, i) => (
                  <Link
                    key={i}
                    to={action.linkTo}
                    className="flex items-start gap-3 rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors"
                  >
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${severityDotClass(action.severity)}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">{action.title}</p>
                      {action.subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5">{action.subtitle}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Recent Activity + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {t('Recent Activity')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/warehouse/transfers">
                {t('View All')} <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-md shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                    <Skeleton className="h-4 w-12 shrink-0" />
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {t('No recent activity')}
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const TxIcon = txIcon(tx.type);
                  const isPositive = tx.quantity > 0;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center gap-3 rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors duration-150"
                    >
                      <div className="rounded-md bg-muted p-1.5 shrink-0">
                        <TxIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {tx.productName || tx.productId}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.locationName ?? t(tx.type)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p
                          className={`text-sm font-semibold tabular-nums ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isPositive ? '+' : ''}{tx.quantity.toLocaleString()}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {relativeTime(tx.createdAt, locale)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {t('Quick Actions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.to}
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:shadow-md hover:border-primary/50 transition-all duration-200"
                  asChild
                >
                  <Link to={action.to}>
                    <action.icon className="h-5 w-5" />
                    <span className="text-xs text-center leading-tight">{action.label}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
