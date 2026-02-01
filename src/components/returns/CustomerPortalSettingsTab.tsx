import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, Copy, Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ReturnsHubSettings, CustomerPortalSettings } from '@/types/returns-hub';
import { DEFAULT_CUSTOMER_PORTAL_SETTINGS } from '@/services/supabase/rh-settings';

interface CustomerPortalSettingsTabProps {
  settings: ReturnsHubSettings;
  setSettings: (s: ReturnsHubSettings) => void;
  tenantSlug: string;
  saving: boolean;
  onSave: () => void;
}

export function CustomerPortalSettingsTab({ settings, setSettings, tenantSlug, saving, onSave }: CustomerPortalSettingsTabProps) {
  const { t } = useTranslation('returns');
  const [copied, setCopied] = useState(false);

  const portal: CustomerPortalSettings = settings.customerPortal || DEFAULT_CUSTOMER_PORTAL_SETTINGS;

  const updatePortal = (updates: Partial<CustomerPortalSettings>) => {
    setSettings({
      ...settings,
      customerPortal: { ...portal, ...updates },
    });
  };

  const portalBaseUrl = `${window.location.origin}/returns/portal/${tenantSlug}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(`${portalBaseUrl}/customer`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const SaveButton = () => (
    <div className="flex justify-end">
      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        {t('Save')}
      </Button>
    </div>
  );

  return (
    <>
      {/* Card 1: Portal Setup & Registration */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="text-base">{t('Portal Setup & Registration')}</CardTitle>
          <CardDescription>{t('Configure portal access and registration options')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Enable Customer Portal')}</Label>
              <p className="text-xs text-muted-foreground">{t('Allow customers to log in, view returns, and create tickets')}</p>
            </div>
            <Switch checked={portal.enabled} onCheckedChange={(v) => updatePortal({ enabled: v })} />
          </div>

          {tenantSlug && (
            <div className="space-y-3 pt-2 border-t">
              <div className="space-y-2">
                <Label>{t('Customer Portal URL')}</Label>
                <p className="text-xs text-muted-foreground">{t('Share this link so customers can log in')}</p>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={`${portalBaseUrl}/customer`}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={`${portalBaseUrl}/customer`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {t('Open Portal')}
                </a>
                <a href={`${portalBaseUrl}/customer/login`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {t('Login Page')}
                </a>
                <a href={`${portalBaseUrl}/customer/register`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {t('Registration Page')}
                </a>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Allow Self-Registration')}</Label>
              <p className="text-xs text-muted-foreground">{t('Customers can create their own accounts')}</p>
            </div>
            <Switch checked={portal.allowSelfRegistration} onCheckedChange={(v) => updatePortal({ allowSelfRegistration: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Require Email Verification')}</Label>
            </div>
            <Switch checked={portal.requireEmailVerification} onCheckedChange={(v) => updatePortal({ requireEmailVerification: v })} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Enable Magic Link Login')}</Label>
            </div>
            <Switch checked={portal.enableMagicLink} onCheckedChange={(v) => updatePortal({ enableMagicLink: v })} />
          </div>

          <SaveButton />
        </CardContent>
      </Card>

      {/* Card 2: Portal Branding */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base">{t('Portal Branding')}</CardTitle>
          <CardDescription>{t('Customize the portal appearance for customers')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Inherit from Returns Hub')}</Label>
              <p className="text-xs text-muted-foreground">{t('Use the same branding as the Returns Hub portal')}</p>
            </div>
            <Switch
              checked={portal.branding.inheritFromReturnsHub}
              onCheckedChange={(v) => updatePortal({ branding: { ...portal.branding, inheritFromReturnsHub: v } })}
            />
          </div>

          {!portal.branding.inheritFromReturnsHub && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Primary Color')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={portal.branding.primaryColor}
                    onChange={(e) => updatePortal({ branding: { ...portal.branding, primaryColor: e.target.value } })}
                    className="h-9 w-12 rounded border cursor-pointer"
                  />
                  <Input
                    value={portal.branding.primaryColor}
                    onChange={(e) => updatePortal({ branding: { ...portal.branding, primaryColor: e.target.value } })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('Logo URL')}</Label>
                <Input
                  value={portal.branding.logoUrl}
                  onChange={(e) => updatePortal({ branding: { ...portal.branding, logoUrl: e.target.value } })}
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('Welcome Message')}</Label>
            <Textarea
              value={portal.branding.welcomeMessage}
              onChange={(e) => updatePortal({ branding: { ...portal.branding, welcomeMessage: e.target.value } })}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('Footer Text')}</Label>
            <Input
              value={portal.branding.footerText}
              onChange={(e) => updatePortal({ branding: { ...portal.branding, footerText: e.target.value } })}
            />
          </div>

          <SaveButton />
        </CardContent>
      </Card>

      {/* Card 3: Feature Access */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base">{t('Feature Access')}</CardTitle>
          <CardDescription>{t('Control which features customers can use')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {([
            ['createReturns', t('Create Returns')],
            ['viewTickets', t('View Tickets')],
            ['createTickets', t('Create Tickets')],
            ['editProfile', t('Edit Profile')],
            ['viewOrderHistory', t('View Order History')],
            ['downloadLabels', t('Download Labels')],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch
                checked={portal.features[key]}
                onCheckedChange={(v) => updatePortal({ features: { ...portal.features, [key]: v } })}
              />
            </div>
          ))}

          <SaveButton />
        </CardContent>
      </Card>

      {/* Card 4: Security & Onboarding */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base">{t('Security & Onboarding')}</CardTitle>
          <CardDescription>{t('Security settings for customer sessions')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Session Timeout')} ({t('minutes')})</Label>
              <Input
                type="number"
                min="5"
                value={portal.security.sessionTimeoutMinutes}
                onChange={(e) => updatePortal({ security: { ...portal.security, sessionTimeoutMinutes: parseInt(e.target.value) || 60 } })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Max Login Attempts')}</Label>
              <Input
                type="number"
                min="1"
                value={portal.security.maxLoginAttempts}
                onChange={(e) => updatePortal({ security: { ...portal.security, maxLoginAttempts: parseInt(e.target.value) || 5 } })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Getting Started Guide')}</Label>
              <p className="text-xs text-muted-foreground">{t('Show new customers a getting started guide on first login')}</p>
            </div>
            <Switch checked={portal.showGettingStartedGuide} onCheckedChange={(v) => updatePortal({ showGettingStartedGuide: v })} />
          </div>

          <SaveButton />
        </CardContent>
      </Card>
    </>
  );
}
