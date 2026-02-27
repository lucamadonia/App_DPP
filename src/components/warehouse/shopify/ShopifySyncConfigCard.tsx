import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { updateShopifySyncConfig } from '@/services/supabase/shopify-integration';
import type { ShopifySyncConfig, ShopifyOrderFinancialStatus } from '@/types/shopify';
import { useToast } from '@/hooks/use-toast';

interface Props {
  config: ShopifySyncConfig;
  onRefresh: () => void;
}

const FINANCIAL_STATUSES: ShopifyOrderFinancialStatus[] = [
  'authorized', 'pending', 'paid', 'partially_paid',
  'refunded', 'voided', 'partially_refunded', 'unpaid',
];

export function ShopifySyncConfigCard({ config, onRefresh }: Props) {
  const { t } = useTranslation('warehouse');
  const { toast } = useToast();

  const [local, setLocal] = useState<ShopifySyncConfig>({ ...config });
  const [saving, setSaving] = useState(false);

  function toggle(key: keyof ShopifySyncConfig) {
    setLocal(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleStatus(status: ShopifyOrderFinancialStatus) {
    setLocal(prev => {
      const current = prev.orderStatusFilter || [];
      const next = current.includes(status)
        ? current.filter(s => s !== status)
        : [...current, status];
      return { ...prev, orderStatusFilter: next };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateShopifySyncConfig(local);
      toast({ title: t('Configuration saved') });
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          {t('Sync Configuration')}
        </CardTitle>
        <CardDescription>{t('Connect your Shopify store')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Import settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t('import', { ns: 'warehouse' })}</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('Import Orders')}</Label>
              </div>
              <Switch checked={local.importOrders} onCheckedChange={() => toggle('importOrders')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('Import Customers')}</Label>
              </div>
              <Switch checked={local.importCustomers} onCheckedChange={() => toggle('importCustomers')} />
            </div>
          </div>
        </div>

        {/* Export settings */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">{t('export', { ns: 'warehouse' })}</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('Export Stock Levels')}</Label>
              </div>
              <Switch checked={local.exportStockLevels} onCheckedChange={() => toggle('exportStockLevels')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('Export Fulfillments')}</Label>
              </div>
              <Switch checked={local.exportFulfillments} onCheckedChange={() => toggle('exportFulfillments')} />
            </div>
          </div>
        </div>

        {/* Automation */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Automation</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('Auto-Create Shipments')}</Label>
                <p className="text-xs text-muted-foreground">{t('Auto-Create Shipments Help')}</p>
              </div>
              <Switch checked={local.autoCreateShipments} onCheckedChange={() => toggle('autoCreateShipments')} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('Auto-Export Fulfillment')}</Label>
                <p className="text-xs text-muted-foreground">{t('Auto-Export Fulfillment Help')}</p>
              </div>
              <Switch checked={local.autoExportFulfillment} onCheckedChange={() => toggle('autoExportFulfillment')} />
            </div>
          </div>
        </div>

        {/* Order status filter */}
        <div className="space-y-3">
          <div>
            <Label>{t('Order Status Filter')}</Label>
            <p className="text-xs text-muted-foreground">{t('Order Status Filter Help')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {FINANCIAL_STATUSES.map(status => {
              const active = local.orderStatusFilter.includes(status);
              return (
                <Badge
                  key={status}
                  variant={active ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleStatus(status)}
                >
                  {t(status)}
                </Badge>
              );
            })}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {t('Save', { ns: 'common' })}
        </Button>
      </CardContent>
    </Card>
  );
}
