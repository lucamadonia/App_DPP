import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, Copy, Check, ExternalLink, Link, Users, LayoutGrid, ShieldCheck, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { FormSections, FormSection, FormGrid, FormField, InputAffix, FormToggleRow, FormActions } from '@/components/ui/form-layout';
import type { ReturnsHubSettings, CustomerPortalSettings } from '@/types/returns-hub';
import { DEFAULT_CUSTOMER_PORTAL_SETTINGS } from '@/services/supabase/rh-settings';
import { PortalDomainSettingsCard } from '@/components/returns/PortalDomainSettingsCard';
import { getPublicBaseUrl } from '@/lib/platform';

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

  const returnsPortalBase = `${getPublicBaseUrl()}/returns/portal/${tenantSlug}`;
  const customerPortalBase = `${getPublicBaseUrl()}/customer/${tenantSlug}`;

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
  const usageColor = usagePercent >= 90 ? 'bg-destructive' : 'bg-primary';

  const urlRow = (label: string, url: string) => (
    <FormField label={label}>
      <div className="flex gap-2">
        <Input readOnly value={url} className="font-mono text-sm pointer-coarse:h-11" />
        <Button
          variant="outline"
          size="icon"
          className="size-11 shrink-0 sm:size-9"
          onClick={() => handleCopy(url)}
          aria-label={t('Copy', { ns: 'common' })}
        >
          {copiedUrl === url ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </FormField>
  );

  const linkList = (links: { href: string; label: string }[]) => (
    <div className="-mt-2 flex flex-wrap gap-x-4">
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-primary hover:underline sm:min-h-8"
        >
          <ExternalLink className="h-3.5 w-3.5" /> {l.label}
        </a>
      ))}
    </div>
  );

  return (
    <FormSections>
      {tenantSlug && (
        <FormSection title={t('Portal Links')} description={t('All portal URLs at a glance')} icon={Link}>
          {urlRow(t('Returns Portal'), returnsPortalBase)}
          {linkList([
            { href: `/returns/portal/${tenantSlug}`, label: t('Returns Portal') },
            { href: `/returns/portal/${tenantSlug}/register`, label: t('Register Return') },
            { href: `/returns/portal/${tenantSlug}/track`, label: t('Track Return') },
          ])}
          {urlRow(t('Customer Portal'), customerPortalBase)}
          {linkList([
            { href: customerPortalBase, label: t('Open Portal') },
            { href: `${customerPortalBase}/login`, label: t('Login Page') },
            { href: `${customerPortalBase}/register`, label: t('Registration Page') },
          ])}
          {customDomainUrl && (
            <>
              {urlRow(t('Custom Domain'), customDomainUrl)}
              {linkList([{ href: customDomainUrl, label: t('Open Portal') }])}
            </>
          )}
        </FormSection>
      )}

      <FormSection
        title={t('Customer Portal Setup')}
        description={t('Configure portal access and registration options')}
        icon={Users}
      >
        <div className="space-y-2">
          <FormToggleRow
            htmlFor="cp-enabled"
            label={t('Enable Customer Portal')}
            description={t('Allow customers to log in, view returns, and create tickets')}
          >
            <Switch id="cp-enabled" checked={portal.enabled} onCheckedChange={(v) => updatePortal({ enabled: v })} />
          </FormToggleRow>
          <FormToggleRow
            htmlFor="cp-self-reg"
            label={t('Allow Self-Registration')}
            description={t('Customers can create their own accounts')}
          >
            <Switch id="cp-self-reg" checked={portal.allowSelfRegistration} onCheckedChange={(v) => updatePortal({ allowSelfRegistration: v })} />
          </FormToggleRow>
          <FormToggleRow htmlFor="cp-verify" label={t('Require Email Verification')}>
            <Switch id="cp-verify" checked={portal.requireEmailVerification} onCheckedChange={(v) => updatePortal({ requireEmailVerification: v })} />
          </FormToggleRow>
          <FormToggleRow htmlFor="cp-magic" label={t('Enable Magic Link Login')}>
            <Switch id="cp-magic" checked={portal.enableMagicLink} onCheckedChange={(v) => updatePortal({ enableMagicLink: v })} />
          </FormToggleRow>
        </div>
      </FormSection>

      <FormSection
        title={t('Feature Access')}
        description={t('Control which features customers can use')}
        icon={LayoutGrid}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {([
            ['createReturns', t('Create Returns')],
            ['viewTickets', t('View Tickets')],
            ['createTickets', t('Create Tickets')],
            ['editProfile', t('Edit Profile')],
            ['viewOrderHistory', t('View Order History')],
            ['downloadLabels', t('Download Labels')],
          ] as const).map(([key, label]) => (
            <FormToggleRow key={key} htmlFor={`cp-feature-${key}`} label={label}>
              <Switch
                id={`cp-feature-${key}`}
                checked={portal.features[key]}
                onCheckedChange={(v) => updatePortal({ features: { ...portal.features, [key]: v } })}
              />
            </FormToggleRow>
          ))}
        </div>
      </FormSection>

      <FormSection
        title={t('Security & Onboarding')}
        description={t('Security settings for customer sessions')}
        icon={ShieldCheck}
      >
        <FormGrid cols={2}>
          <FormField label={t('Session Timeout')}>
            <InputAffix suffix={t('minutes')}>
              <Input
                type="number"
                inputMode="numeric"
                min="5"
                value={portal.security.sessionTimeoutMinutes}
                onChange={(e) => updatePortal({ security: { ...portal.security, sessionTimeoutMinutes: parseInt(e.target.value) || 60 } })}
              />
            </InputAffix>
          </FormField>
          <FormField label={t('Max Login Attempts')}>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              value={portal.security.maxLoginAttempts}
              onChange={(e) => updatePortal({ security: { ...portal.security, maxLoginAttempts: parseInt(e.target.value) || 5 } })}
            />
          </FormField>
        </FormGrid>
        <FormToggleRow
          htmlFor="cp-guide"
          label={t('Getting Started Guide')}
          description={t('Show new customers a getting started guide on first login')}
        >
          <Switch id="cp-guide" checked={portal.showGettingStartedGuide} onCheckedChange={(v) => updatePortal({ showGettingStartedGuide: v })} />
        </FormToggleRow>
      </FormSection>

      <FormActions sticky="page">
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t('Save')}
        </Button>
      </FormActions>

      <FormSection title={t('License & Usage')} description={t('Your current plan and usage')} icon={Gauge}>
        <Badge className="px-3 py-1 text-sm capitalize">{settings.plan}</Badge>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">{t('Returns this month')}</p>
            <p className="text-2xl font-semibold tabular-nums">{settings.usage.returnsThisMonth} <span className="text-sm font-normal text-muted-foreground">{t('of {{max}} included', { max: settings.maxReturnsPerMonth })}</span></p>
            <div className="h-2 overflow-hidden rounded-full bg-muted-foreground/10">
              <div
                className={`h-full ${usageColor} rounded-full transition-[width] duration-200 ease-out`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm text-muted-foreground">{t('Admin users')}</p>
            <p className="text-2xl font-semibold tabular-nums">{settings.maxAdminUsers}</p>
          </div>
        </div>
        <div>
          <h4 className="mb-1 text-sm font-medium">{t('Features')}</h4>
          <ul className="divide-y">
            {Object.entries(settings.features).map(([key, value]) => (
              <li key={key} className="flex items-center justify-between py-2 text-sm">
                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="text-muted-foreground">{typeof value === 'boolean' ? (value ? '✓' : '—') : value}</span>
              </li>
            ))}
          </ul>
        </div>
      </FormSection>

      {/* Card 6: Custom Domain */}
      <PortalDomainSettingsCard
        settings={settings}
        onSettingsChange={setSettings}
      />
    </FormSections>
  );
}
