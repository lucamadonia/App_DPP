import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/hooks/use-branding';
import { updateTenantSettings } from '@/services/supabase/tenants';
import type { SupplierPortalSettings } from '@/types/supplier-portal';
import { DEFAULT_SUPPLIER_PORTAL_SETTINGS } from '@/types/supplier-portal';

export function SupplierPortalSettingsTab() {
  const { t } = useTranslation('settings');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { branding } = useBranding();

  // Load current settings from branding context
  const currentSettings = (branding as any)?.supplierPortal || DEFAULT_SUPPLIER_PORTAL_SETTINGS;

  const [settings, setSettings] = useState<SupplierPortalSettings>({
    enabled: currentSettings.enabled ?? DEFAULT_SUPPLIER_PORTAL_SETTINGS.enabled,
    invitationExpiryDays: currentSettings.invitationExpiryDays ?? DEFAULT_SUPPLIER_PORTAL_SETTINGS.invitationExpiryDays,
    welcomeMessage: currentSettings.welcomeMessage ?? DEFAULT_SUPPLIER_PORTAL_SETTINGS.welcomeMessage,
    successMessage: currentSettings.successMessage ?? DEFAULT_SUPPLIER_PORTAL_SETTINGS.successMessage,
  });

  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const changed =
      settings.enabled !== currentSettings.enabled ||
      settings.invitationExpiryDays !== currentSettings.invitationExpiryDays ||
      settings.welcomeMessage !== currentSettings.welcomeMessage ||
      settings.successMessage !== currentSettings.successMessage;
    setHasChanges(changed);
  }, [settings, currentSettings]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return updateTenantSettings({
        supplierPortal: settings,
      });
    },
    onSuccess: () => {
      toast({
        title: t('Settings Saved'),
        description: t('Supplier portal settings have been updated successfully'),
      });
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['tenant'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const handleExpiryDaysChange = (value: string) => {
    const days = parseInt(value, 10);
    if (!isNaN(days) && days >= 1 && days <= 90) {
      setSettings({ ...settings, invitationExpiryDays: days });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('Supplier Portal Settings')}</CardTitle>
          <CardDescription>
            {t('Configure the supplier self-registration portal')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Portal */}
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">{t('Enable Supplier Portal')}</Label>
              <p className="text-sm text-muted-foreground">
                {t('Allow suppliers to register via invitation links')}
              </p>
            </div>
            <Switch
              id="enabled"
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
            />
          </div>

          {/* Invitation Expiry Days */}
          <div className="space-y-2">
            <Label htmlFor="expiryDays">{t('Invitation Expiry (Days)')}</Label>
            <Input
              id="expiryDays"
              type="number"
              min={1}
              max={90}
              value={settings.invitationExpiryDays}
              onChange={(e) => handleExpiryDaysChange(e.target.value)}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              {t('Number of days until an invitation link expires (min: 1, max: 90)')}
            </p>
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label htmlFor="welcomeMessage">{t('Welcome Message')}</Label>
            <Textarea
              id="welcomeMessage"
              placeholder={t('Welcome! Please fill out the registration form to become an approved supplier.')}
              value={settings.welcomeMessage || ''}
              onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              {t('Optional message shown at the top of the registration portal')}
            </p>
          </div>

          {/* Success Message */}
          <div className="space-y-2">
            <Label htmlFor="successMessage">{t('Success Message')}</Label>
            <Textarea
              id="successMessage"
              placeholder={t('Thank you for registering! Your application will be reviewed within 2-3 business days.')}
              value={settings.successMessage || ''}
              onChange={(e) => setSettings({ ...settings, successMessage: e.target.value })}
              rows={3}
            />
            <p className="text-sm text-muted-foreground">
              {t('Optional message shown after successful registration submission')}
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('Saving...')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('Save Settings')}
                </>
              )}
            </Button>
            {hasChanges && (
              <p className="text-sm text-muted-foreground">
                {t('You have unsaved changes')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portal URL Info */}
      {settings.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>{t('Portal Access')}</CardTitle>
            <CardDescription>
              {t('Suppliers will access the registration portal via invitation links')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">{t('Invitation Link Format')}</Label>
                <p className="text-sm font-mono bg-muted p-2 rounded mt-1">
                  {window.location.origin}/suppliers/register/{'<invitation-code>'}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('Each invitation has a unique code. Create invitations in the Supplier Invitations tab.')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
