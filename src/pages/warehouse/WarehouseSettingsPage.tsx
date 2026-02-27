import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Settings, CreditCard, Warehouse, Package, Truck, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/hooks/use-billing';
import { WAREHOUSE_MODULES, getActiveWarehouseTier, type ModuleId } from '@/types/billing';

export function WarehouseSettingsPage() {
  const { t } = useTranslation('warehouse');
  const billing = useBilling();

  const modules: Set<ModuleId> = billing.entitlements?.modules || new Set();
  const warehouseModule = WAREHOUSE_MODULES.find(m => modules.has(m));
  const tier = warehouseModule ? getActiveWarehouseTier(modules) : null;

  const limits = billing.entitlements?.limits;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Warehouse Settings')}</h1>
          <p className="text-muted-foreground">{t('Manage your warehouse module configuration')}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/settings/billing">
            <CreditCard className="mr-2 h-4 w-4" />
            {t('Manage Plan', { ns: 'billing' })}
          </Link>
        </Button>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            {t('Current Module')}
          </CardTitle>
          <CardDescription>
            {tier
              ? t('Active tier: {{tier}}', { tier: tier.charAt(0).toUpperCase() + tier.slice(1) })
              : t('No warehouse module active')}
          </CardDescription>
        </CardHeader>
        {limits && (
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Warehouse className="h-4 w-4" />
                  {t('Warehouse Locations')}
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {limits.maxWarehouseLocations === Infinity ? t('Unlimited') : (limits.maxWarehouseLocations ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  {t('Shipments / Month')}
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {limits.maxShipmentsPerMonth === Infinity ? t('Unlimited') : (limits.maxShipmentsPerMonth ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="h-4 w-4" />
                  {t('Stock Transactions / Month')}
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {limits.maxStockTransactionsPerMonth === Infinity ? t('Unlimited') : (limits.maxStockTransactionsPerMonth ?? 0)}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {t('Carrier Integrations')}
                </div>
                <p className="mt-1 text-lg font-semibold">
                  {limits.warehouseCarrierIntegrations === Infinity ? t('Unlimited') : (limits.warehouseCarrierIntegrations ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Features')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {([
              { key: 'warehouseTransfersEnabled' as const, label: t('Multi-Location Transfers') },
              { key: 'warehouseLabelsEnabled' as const, label: t('Shipping Labels') },
              { key: 'warehouseBarcodeScanEnabled' as const, label: t('Barcode Scanning') },
              { key: 'warehouseCsvEnabled' as const, label: t('CSV Import/Export') },
              { key: 'warehouseStockAlerts' as const, label: t('Stock Alerts') },
              { key: 'warehouseApiAccess' as const, label: t('API Access') },
              { key: 'warehouseWebhooksEnabled' as const, label: t('Webhooks') },
            ] as const).map((feature) => {
              const val = limits ? limits[feature.key] : false;
              const enabled = val === true || (typeof val === 'string' && val !== 'none');
              return (
                <div key={feature.key} className="flex items-center justify-between py-1">
                  <span className="text-sm">{feature.label}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${enabled ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {enabled ? t('Enabled') : t('Upgrade required')}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Quick Links')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/warehouse/locations">
                <Warehouse className="mr-2 h-4 w-4" />
                {t('Manage Locations')}
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/warehouse/contacts">
                <Users className="mr-2 h-4 w-4" />
                {t('Manage Contacts')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!warehouseModule && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Warehouse className="h-10 w-10 mb-3 text-muted-foreground opacity-50" />
            <p className="font-medium">{t('Activate Warehouse Module')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('Start managing your inventory and shipments')}</p>
            <Button className="mt-4" asChild>
              <Link to="/settings/billing">{t('View Plans', { ns: 'billing' })}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
