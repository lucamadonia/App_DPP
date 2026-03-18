import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Save,
  Loader2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Settings2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { getDHLSettings } from '@/services/supabase/dhl-carrier';
import { updateTenantSettings, getCurrentTenant } from '@/services/supabase';
import type { DHLSettingsPublic } from '@/types/dhl';

interface ShippingSettingsTabProps {
  autoGenerateLabel: boolean;
  onAutoGenerateLabelChange: (value: boolean) => void;
  saving: boolean;
  onSave: () => void;
}

export function ShippingSettingsTab({
  autoGenerateLabel,
  onAutoGenerateLabelChange,
  saving,
  onSave,
}: ShippingSettingsTabProps) {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const [dhlSettings, setDhlSettings] = useState<DHLSettingsPublic | null>(null);
  const [dhlLoading, setDhlLoading] = useState(true);

  // DHL Returns API settings
  const [returnsApiEnabled, setReturnsApiEnabled] = useState(false);
  const [returnsReceiverId, setReturnsReceiverId] = useState('');
  const [returnsBillingNumber, setReturnsBillingNumber] = useState('');
  const [savingReturnsApi, setSavingReturnsApi] = useState(false);

  useEffect(() => {
    async function load() {
      setDhlLoading(true);
      try {
        const settings = await getDHLSettings();
        setDhlSettings(settings);

        // Load returns API settings from tenant
        const tenant = await getCurrentTenant();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dhl = (tenant?.settings as any)?.warehouse?.dhl;
        if (dhl?.returnsApi) {
          setReturnsApiEnabled(dhl.returnsApi.enabled ?? false);
          setReturnsReceiverId(dhl.returnsApi.receiverId ?? '');
          setReturnsBillingNumber(dhl.returnsApi.billingNumber ?? '');
        }
      } catch {
        // ignore
      } finally {
        setDhlLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveReturnsApi = async () => {
    setSavingReturnsApi(true);
    try {
      const tenant = await getCurrentTenant();
      if (!tenant) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const currentSettings = (tenant.settings as any) || {};
      const warehouse = currentSettings.warehouse || {};
      const dhl = warehouse.dhl || {};

      await updateTenantSettings({
        ...currentSettings,
        warehouse: {
          ...warehouse,
          dhl: {
            ...dhl,
            returnsApi: {
              enabled: returnsApiEnabled,
              receiverId: returnsReceiverId.trim(),
              billingNumber: returnsBillingNumber.trim() || undefined,
            },
          },
        },
      });
    } catch (err) {
      console.error('Failed to save DHL returns API settings:', err);
    } finally {
      setSavingReturnsApi(false);
    }
  };

  const dhlConfigured = dhlSettings?.hasCredentials && dhlSettings?.enabled;

  return (
    <div className="space-y-4">
      {/* DHL Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-yellow-400 text-[8px] font-extrabold text-red-600 leading-none">
              DHL
            </div>
            {t('DHL Integration Status')}
          </CardTitle>
          <CardDescription>{t('DHL Parcel DE connection for return shipping labels and tracking')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {dhlLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('Loading...')}
            </div>
          ) : dhlConfigured ? (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">{t('DHL Connected')}</p>
                  <p className="text-xs text-muted-foreground">
                    {dhlSettings?.sandbox ? (
                      <Badge variant="outline" className="text-xs">{t('Sandbox Mode')}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">{t('Production')}</Badge>
                    )}
                    {' · '}{t('Billing Number')}: {dhlSettings?.billingNumber || '—'}
                    {' · '}{t('Product')}: {dhlSettings?.defaultProduct || 'V01PAK'}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/warehouse/integrations/dhl')} className="gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                {t('Manage DHL Settings')}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-sm font-medium">{t('DHL not configured')}</p>
                  <p className="text-xs text-muted-foreground">{t('Set up DHL API credentials to enable return label generation')}</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate('/warehouse/integrations/dhl')} className="gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                {t('Set Up DHL')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* DHL Returns API Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            {t('DHL Returns API')}
          </CardTitle>
          <CardDescription>
            {t('Optional: Use the dedicated DHL Parcel DE Returns API for simplified return label creation.')}
            {' '}
            <a
              href="https://developer.dhl.com/api-reference/parcel-de-returns-post-parcel-germany"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-0.5"
            >
              {t('API Documentation')}
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Enable DHL Returns API')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('When disabled, return labels are created via the standard Shipping API with inverted addresses.')}
              </p>
            </div>
            <Switch
              checked={returnsApiEnabled}
              onCheckedChange={setReturnsApiEnabled}
              disabled={!dhlConfigured}
            />
          </div>

          {returnsApiEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Receiver ID')}</Label>
                <Input
                  value={returnsReceiverId}
                  onChange={(e) => setReturnsReceiverId(e.target.value)}
                  placeholder={t('DHL Retoure Receiver ID')}
                  disabled={!dhlConfigured}
                />
                <p className="text-xs text-muted-foreground">{t('Your DHL Retoure receiver ID from the DHL business portal')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('Returns Billing Number')} ({t('optional')})</Label>
                <Input
                  value={returnsBillingNumber}
                  onChange={(e) => setReturnsBillingNumber(e.target.value)}
                  placeholder={t('Leave empty to use main billing number')}
                  disabled={!dhlConfigured}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleSaveReturnsApi} disabled={savingReturnsApi || !dhlConfigured}>
              {savingReturnsApi ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {t('Save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Generate Label on Approval */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Automation')}</CardTitle>
          <CardDescription>{t('Automatic actions for return processing')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Auto-generate return label on approval')}</Label>
              <p className="text-xs text-muted-foreground">
                {t('Automatically create a DHL return label when a return is approved. Requires a customer address on file.')}
              </p>
            </div>
            <Switch
              checked={autoGenerateLabel}
              onCheckedChange={onAutoGenerateLabelChange}
              disabled={!dhlConfigured}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {t('Save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
