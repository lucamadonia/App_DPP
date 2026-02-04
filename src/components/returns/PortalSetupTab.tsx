import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, Copy, Check, ExternalLink, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ReturnsHubSettings, CustomerPortalSettings } from '@/types/returns-hub';
import { DEFAULT_CUSTOMER_PORTAL_SETTINGS } from '@/services/supabase/rh-settings';
import { PortalDomainSettingsCard } from '@/components/returns/PortalDomainSettingsCard';

interface PortalSetupTabProps {
  settings: ReturnsHubSettings;
  setSettings: (s: ReturnsHubSettings) => void;
  tenantSlug: string;
  saving: boolean;
  onSave: () => void;
}

export function PortalSetupTab({ settings, setSettings, tenantSlug, saving, onSave }: PortalSetupTabProps) {
  const { t } = useTranslation('returns');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const portal: CustomerPortalSettings = {
    ...DEFAULT_CUSTOMER_PORTAL_SETTINGS,
    ...settings.customerPortal,
    branding: {
      ...DEFAULT_CUSTOMER_PORTAL_SETTINGS.branding,
      ...settings.customerPortal?.branding,
    },
    features: {
      ...DEFAULT_CUSTOMER_PORTAL_SETTINGS.features,
      ...settings.customerPortal?.features,
    },
    security: {
      ...DEFAULT_CUSTOMER_PORTAL_SETTINGS.security,
      ...settings.customerPortal?.security,
    },
  };

  const updatePortal = (updates: Partial<CustomerPortalSettings>) => {
    setSettings({
      ...settings,
      customerPortal: { ...portal, ...updates },
    });
  };

  const returnsPortalBase = `${window.location.origin}/returns/portal/${tenantSlug}`;
  const customerPortalBase = `${window.location.origin}/customer/${tenantSlug}`;

  const portalDomain = (settings as any).portalDomain;
  const customDomainUrl = portalDomain?.customDomain && portalDomain?.domainStatus === 'verified'
    ? `https://${portalDomain.customDomain}`
    : null;

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  // License usage gauge
  const usagePercent = settings.maxReturnsPerMonth > 0
    ? Math.min((settings.usage.returnsThisMonth / settings.maxReturnsPerMonth) * 100, 100)
    : 0;
  const usageColor = usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-yellow-500' : 'bg-green-500';

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
      {/* Card 1: Portal Links */}
      {tenantSlug && (
        <Card className="animate-fade-in-up">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Link className="h-4 w-4" />
              {t('Portal Links')}
            </CardTitle>
            <CardDescription>{t('All portal URLs at a glance')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Returns Portal URLs */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">{t('Returns Portal')}</h4>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={returnsPortalBase}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleCopy(returnsPortalBase)}
                >
                  {copiedUrl === returnsPortalBase ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={`/returns/portal/${tenantSlug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {t('Returns Portal')}
                </a>
                <a href={`/returns/portal/${tenantSlug}/register`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {t('Register Return')}
                </a>
                <a href={`/returns/portal/${tenantSlug}/track`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {t('Track Return')}
                </a>
              </div>
            </div>

            <div className="border-t" />

            {/* Customer Portal URLs */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">{t('Customer Portal')}</h4>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={customerPortalBase}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => handleCopy(customerPortalBase)}
                >
                  {copiedUrl === customerPortalBase ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <a href={customerPortalBase} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {t('Open Portal')}
                </a>
                <a href={`${customerPortalBase}/login`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {t('Login Page')}
                </a>
                <a href={`${customerPortalBase}/register`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" /> {t('Registration Page')}
                </a>
              </div>
            </div>

            {/* Custom Domain Link */}
            {customDomainUrl && (
              <>
                <div className="border-t" />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">{t('Custom Domain')}</h4>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={customDomainUrl}
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      onClick={() => handleCopy(customDomainUrl)}
                    >
                      {copiedUrl === customDomainUrl ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <a href={customDomainUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> {t('Open Portal')}
                  </a>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card 2: Customer Portal Setup */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base">{t('Customer Portal Setup')}</CardTitle>
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

      {/* Card 5: License & Usage */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base">{t('License & Usage')}</CardTitle>
          <CardDescription>{t('Your current plan and usage')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="text-lg px-3 py-1 capitalize">{settings.plan}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted space-y-2">
              <p className="text-sm text-muted-foreground">{t('Returns this month')}</p>
              <p className="text-2xl font-bold">{settings.usage.returnsThisMonth} <span className="text-sm font-normal text-muted-foreground">{t('of {{max}} included', { max: settings.maxReturnsPerMonth })}</span></p>
              <div className="h-2 bg-muted-foreground/10 rounded-full overflow-hidden">
                <div
                  className={`h-full ${usageColor} rounded-full transition-all duration-700`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm text-muted-foreground">{t('Admin users')}</p>
              <p className="text-2xl font-bold">{settings.maxAdminUsers}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-sm">{t('Features')}</h4>
            {Object.entries(settings.features).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-1 text-sm">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span>{typeof value === 'boolean' ? (value ? '\u2713' : '\u2014') : value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card 6: Custom Domain */}
      <PortalDomainSettingsCard
        settings={settings}
        onSettingsChange={setSettings}
      />
    </>
  );
}
