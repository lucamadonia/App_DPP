import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package, Truck, Warehouse, AlertTriangle, ArrowRight,
  TrendingUp, ArrowRightLeft, ClipboardList, MapPin, Clock, Box,
  Camera, RotateCcw, Megaphone,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { WarehouseKPICard } from '@/components/warehouse/WarehouseKPICard';
import { StockMovementChart, StockByLocationChart } from '@/components/warehouse/WarehouseCharts';
import { getWarehouseStats, getRecentTransactions, getPendingActions, getStockMovementTrend } from '@/services/supabase/wh-stock';
import { getShipmentStats } from '@/services/supabase/wh-shipments';
import { getLocationCapacitySummaries } from '@/services/supabase/wh-locations';
import { getSampleDashboardStats } from '@/services/supabase/wh-samples';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { relativeTime } from '@/lib/animations';
import { formatVolumeM3 } from '@/lib/warehouse-volume';
import type { WhStockTransaction, LocationCapacitySummary, PendingAction } from '@/types/warehouse';

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
  const [sampleStats, setSampleStats] = useState({ samplesOut: 0, awaitingContent: 0, returnsPending: 0, overdue: 0, contentReceived: 0, totalCampaigns: 0 });
  const [locations, setLocations] = useState<LocationCapacitySummary[]>([]);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [transactions, setTransactions] = useState<WhStockTransaction[]>([]);
  const [movementData, setMovementData] = useState<{ date: string; receipts: number; shipments: number; adjustments: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [s, ss, loc, act, tx, samples, movement] = await Promise.all([
          getWarehouseStats(),
          getShipmentStats(),
          getLocationCapacitySummaries(),
          getPendingActions(),
          getRecentTransactions(8),
          getSampleDashboardStats(),
          getStockMovementTrend(7),
        ]);
        if (cancelled) return;
        setStats(s);
        setShipmentStats(ss as { openShipments: number; shippedToday: number });
        setSampleStats(samples);
        setLocations(loc);
        setActions(act);
        setTransactions(tx);
        setMovementData(movement);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const movementSparkData = movementData.map(d => d.receipts + d.shipments + d.adjustments);

  /* ---- KPI definitions -------------------------------------------------- */

  const kpis = [
    {
      label: t('Total Stock'),
      value: stats.totalStock,
      icon: Package,
      color: 'text-blue-600',
      gradient: 'from-blue-500/20 to-blue-600/10',
      sparkData: movementSparkData,
      sparkColor: '#3B82F6',
    },
    {
      label: t('Total Locations'),
      value: stats.totalLocations,
      icon: Warehouse,
      color: 'text-green-600',
      gradient: 'from-green-500/20 to-green-600/10',
    },
    {
      label: t('Open Shipments'),
      value: shipmentStats.openShipments,
      icon: Truck,
      color: 'text-orange-600',
      gradient: 'from-orange-500/20 to-orange-600/10',
    },
    {
      label: t('Shipped Today'),
      value: shipmentStats.shippedToday,
      icon: TrendingUp,
      color: 'text-purple-600',
      gradient: 'from-purple-500/20 to-purple-600/10',
    },
    {
      label: t('Low Stock Alerts'),
      value: stats.lowStockAlerts,
      icon: AlertTriangle,
      color: stats.lowStockAlerts > 0 ? 'text-red-600' : 'text-muted-foreground',
      gradient: stats.lowStockAlerts > 0
        ? 'from-red-500/20 to-red-600/10'
        : 'from-muted/50 to-muted/30',
    },
  ];

  const kpiVisible = useStaggeredList(kpis.length, { interval: 80, initialDelay: 100 });

  /* ---- Quick action definitions ----------------------------------------- */

  const quickActions = [
    { label: t('Goods Receipt'), to: '/warehouse/goods-receipt', icon: Package, gradient: 'from-blue-500 to-blue-600' },
    { label: t('Create Shipment'), to: '/warehouse/shipments/new', icon: Truck, gradient: 'from-purple-500 to-purple-600' },
    { label: t('Transfer'), to: '/warehouse/transfers', icon: ArrowRightLeft, gradient: 'from-orange-500 to-orange-600' },
    { label: t('Inventory'), to: '/warehouse/inventory', icon: ClipboardList, gradient: 'from-emerald-500 to-emerald-600' },
    { label: t('Warehouses'), to: '/warehouse/locations', icon: MapPin, gradient: 'from-cyan-500 to-cyan-600' },
    { label: t('Low Stock Alerts'), to: '/warehouse/inventory?lowStock=true', icon: AlertTriangle, gradient: 'from-red-500 to-red-600' },
  ];

  /* ---- Stock by location data for chart --------------------------------- */

  const stockByLocation = locations.map(l => ({
    locationName: l.locationName + (l.locationCode ? ` (${l.locationCode})` : ''),
    totalUnits: l.totalUnits,
  })).filter(l => l.totalUnits > 0);

  /* ---- Timeline stagger ------------------------------------------------- */
  const txVisible = useStaggeredList(transactions.length, { interval: 60, initialDelay: 200 });

  /* ---- Render ----------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-4 sm:px-6 sm:py-5 text-white">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('Warehouse & Fulfillment')}</h1>
        <p className="text-white/70 text-xs sm:text-sm mt-0.5">{t('Dashboard Overview')}</p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi, i) => (
          <div
            key={kpi.label}
            className={`transition-all duration-300 ${kpiVisible[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          >
            <WarehouseKPICard {...kpi} loading={loading} />
          </div>
        ))}
      </div>

      {/* Sample Tracking KPIs */}
      {(sampleStats.samplesOut > 0 || sampleStats.totalCampaigns > 0) && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <WarehouseKPICard label={t('Samples Out')} value={sampleStats.samplesOut} icon={Package} color="text-pink-600" gradient="from-pink-500/20 to-pink-600/10" loading={loading} />
          <WarehouseKPICard label={t('Returns Pending')} value={sampleStats.returnsPending} icon={RotateCcw} color="text-orange-600" gradient="from-orange-500/20 to-orange-600/10" loading={loading} />
          <WarehouseKPICard label={t('Content Awaiting')} value={sampleStats.awaitingContent} icon={Camera} color="text-amber-600" gradient="from-amber-500/20 to-amber-600/10" loading={loading} />
          <WarehouseKPICard label={t('Active Campaigns')} value={sampleStats.totalCampaigns} icon={Megaphone} color="text-violet-600" gradient="from-violet-500/20 to-violet-600/10" loading={loading} />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        <StockMovementChart data={movementData} />
        <StockByLocationChart data={stockByLocation} />
      </div>

      {/* Top row: Capacity + Pending Actions */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-0.5 sm:gap-2 text-sm">
                        <span className="font-medium flex items-center gap-1.5">
                          <Box className="h-3.5 w-3.5 text-primary" />
                          {t('Total Utilization')}
                        </span>
                        <span className="text-[10px] sm:text-xs text-muted-foreground tabular-nums">
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
                      {capacityUnits > 0 && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-[10px] text-muted-foreground w-8 sm:w-10 shrink-0">{t('Units')}</span>
                          <Progress
                            value={Math.min(fillUnits, 100)}
                            className={`h-1.5 flex-1 ${capacityColor(fillUnits)}`}
                          />
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-auto sm:w-24 text-right">
                            {loc.totalUnits.toLocaleString()}<span className="hidden sm:inline"> / {capacityUnits.toLocaleString()}</span>
                          </span>
                        </div>
                      )}
                      {!capacityUnits && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-[10px] text-muted-foreground w-8 sm:w-10 shrink-0">{t('Units')}</span>
                          <span className="text-[10px] text-muted-foreground tabular-nums">
                            {loc.totalUnits.toLocaleString()} {t('units')}
                          </span>
                        </div>
                      )}
                      {hasVolume && (
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-[10px] text-muted-foreground w-8 sm:w-10 shrink-0">{t('Volume')}</span>
                          <Progress
                            value={Math.min(fillVol, 100)}
                            className={`h-1.5 flex-1 ${capacityColor(fillVol)}`}
                          />
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 w-auto sm:w-24 text-right">
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

      {/* Bottom row: Recent Activity Timeline + Quick Actions */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Activity — Timeline */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3 gap-2">
            <CardTitle className="text-sm sm:text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{t('Recent Activity')}</span>
            </CardTitle>
            <Button variant="ghost" size="sm" className="shrink-0 text-xs sm:text-sm" asChild>
              <Link to="/warehouse/transfers">
                <span className="hidden sm:inline">{t('View All')}</span>
                <ArrowRight className="sm:ml-1 h-3 w-3" />
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
              <div className="relative pl-6">
                {/* Vertical timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                <div className="space-y-1">
                  {transactions.map((tx, i) => {
                    const TxIcon = txIcon(tx.type);
                    const isPositive = tx.quantity > 0;
                    return (
                      <div
                        key={tx.id}
                        className={`relative flex items-center gap-3 rounded-md p-2 -ml-6 pl-6 hover:bg-muted/50 transition-all duration-200 ${
                          txVisible[i] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                        }`}
                        style={{ transition: 'opacity 0.35s ease-out, transform 0.35s ease-out' }}
                      >
                        {/* Timeline dot */}
                        <div className="absolute left-[7px] top-1/2 -translate-y-1/2 flex h-[9px] w-[9px] items-center justify-center rounded-full bg-background border-2 border-primary z-10" />
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions — 3D Cards */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {t('Quick Actions')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="landing-3d-card rounded-xl border bg-card p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-2.5 text-center group"
                >
                  <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br ${action.gradient} text-white transition-transform group-hover:scale-110`}>
                    <action.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-medium leading-tight">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
