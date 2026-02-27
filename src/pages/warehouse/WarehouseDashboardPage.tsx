import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package, Truck, Warehouse, AlertTriangle, ArrowRight,
  TrendingUp, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getWarehouseStats } from '@/services/supabase/wh-stock';
import { getShipmentStats } from '@/services/supabase/wh-shipments';
import { getLowStockAlerts } from '@/services/supabase/wh-stock';
import type { WhStockLevel } from '@/types/warehouse';

export function WarehouseDashboardPage() {
  const { t } = useTranslation('warehouse');
  const [stats, setStats] = useState({ totalStock: 0, totalLocations: 0, lowStockAlerts: 0 });
  const [shipmentStats, setShipmentStats] = useState({ openShipments: 0, shippedToday: 0 });
  const [alerts, setAlerts] = useState<WhStockLevel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, ss, a] = await Promise.all([
          getWarehouseStats(),
          getShipmentStats(),
          getLowStockAlerts(),
        ]);
        setStats(s);
        setShipmentStats(ss as { openShipments: number; shippedToday: number });
        setAlerts(a.slice(0, 5));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const kpis = [
    { label: t('Total Stock'), value: stats.totalStock, icon: Package, color: 'text-blue-600' },
    { label: t('Total Locations'), value: stats.totalLocations, icon: Warehouse, color: 'text-green-600' },
    { label: t('Open Shipments'), value: shipmentStats.openShipments, icon: Truck, color: 'text-orange-600' },
    { label: t('Shipped Today'), value: shipmentStats.shippedToday, icon: TrendingUp, color: 'text-purple-600' },
    { label: t('Low Stock Alerts'), value: stats.lowStockAlerts, icon: AlertTriangle, color: stats.lowStockAlerts > 0 ? 'text-red-600' : 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Warehouse & Fulfillment')}</h1>
          <p className="text-muted-foreground">{t('Dashboard')}</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/warehouse/goods-receipt">{t('Create Goods Receipt')}</Link>
          </Button>
          <Button asChild>
            <Link to="/warehouse/shipments/new">{t('Create Shipment')}</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 bg-muted ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">
                    {loading ? '—' : kpi.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t('Low Stock Alerts')}
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/warehouse/inventory?lowStock=true">
                {t('View All', { ns: 'common' })} <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {stats.lowStockAlerts === 0 ? t('No stock data') : t('No results found')}
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{alert.productName || alert.productId}</p>
                      <p className="text-xs text-muted-foreground">
                        {alert.locationName} {alert.binLocation ? `· ${alert.binLocation}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={alert.quantityAvailable === 0 ? 'destructive' : 'secondary'}>
                        {alert.quantityAvailable} / {alert.reorderPoint}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/warehouse/goods-receipt">
                  <Package className="h-5 w-5" />
                  <span className="text-xs">{t('Goods Receipt')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/warehouse/shipments/new">
                  <Truck className="h-5 w-5" />
                  <span className="text-xs">{t('Create Shipment')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/warehouse/inventory">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-xs">{t('Inventory')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
                <Link to="/warehouse/locations">
                  <Warehouse className="h-5 w-5" />
                  <span className="text-xs">{t('Warehouses')}</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
