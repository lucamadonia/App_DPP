import { useTranslation } from 'react-i18next';
import { Loader2, Save, Plus, Trash2, Palette, Type, LogIn, PanelBottom, Code, AlignCenter, Columns2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FormSections, FormSection, FormGrid, FormField, InputAffix, ChoiceCards, FormToggleRow, FormActions } from '@/components/ui/form-layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ReturnsHubSettings, CustomerPortalSettings, CustomerPortalBrandingOverrides, CustomerPortalFooterLink } from '@/types/returns-hub';
import { DEFAULT_CUSTOMER_PORTAL_SETTINGS } from '@/services/supabase/rh-settings';

interface PortalDesignTabProps {
  settings: ReturnsHubSettings;
  setSettings: (s: ReturnsHubSettings) => void;
  saving: boolean;
  onSave: () => void;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FormField label={label}>
      <InputAffix
        prefix={
          <span
            className="relative block size-6 overflow-hidden rounded border shadow-xs"
            style={{ backgroundColor: value }}
          >
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              tabIndex={-1}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
            />
          </span>
        }
      >
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
      </InputAffix>
    </FormField>
  );
}

export function PortalDesignTab({ settings, setSettings, saving, onSave }: PortalDesignTabProps) {
  const { t } = useTranslation('returns');

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

  const updateBranding = (updates: Partial<CustomerPortalBrandingOverrides>) => {
    updatePortal({ branding: { ...portal.branding, ...updates } });
  };

  const footerLinks = portal.branding.footerLinks || [];

  const addFooterLink = () => {
    updateBranding({ footerLinks: [...footerLinks, { label: '', url: '' }] });
  };

  const removeFooterLink = (index: number) => {
    updateBranding({ footerLinks: footerLinks.filter((_: CustomerPortalFooterLink, i: number) => i !== index) });
  };

  const updateFooterLink = (index: number, updates: Partial<CustomerPortalFooterLink>) => {
    const updated = footerLinks.map((link: CustomerPortalFooterLink, i: number) =>
      i === index ? { ...link, ...updates } : link
    );
    updateBranding({ footerLinks: updated });
  };

  const inherit = portal.branding.inheritFromReturnsHub;

  const welcomeField = (
    <FormField label={t('Welcome Message')} hint={t('Message shown on the dashboard after login')}>
      <Textarea
        value={portal.branding.welcomeMessage}
        onChange={(e) => updateBranding({ welcomeMessage: e.target.value })}
        rows={3}
        placeholder={t('Welcome to our customer portal...')}
      />
    </FormField>
  );

  return (
    <FormSections>
      <FormSection
        title={t('Returns Portal Branding')}
        description={t('Primary color and logo for the public returns portal')}
        icon={Palette}
      >
        <FormGrid cols={2}>
          <ColorField
            label={t('Primary Color')}
            value={settings.branding.primaryColor}
            onChange={(v) => setSettings({
              ...settings,
              branding: { ...settings.branding, primaryColor: v },
            })}
          />
          <FormField label={t('Logo URL')}>
            <Input
              type="url"
              inputMode="url"
              value={settings.branding.logoUrl}
              onChange={(e) => setSettings({
                ...settings,
                branding: { ...settings.branding, logoUrl: e.target.value },
              })}
              placeholder="https://..."
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormSection
        title={t('Corporate Identity')}
        description={t('Logo, typography and visual identity for the customer portal')}
        icon={Type}
      >
        <FormToggleRow
          htmlFor="cp-inherit"
          label={t('Inherit from Returns Hub')}
          description={t('Use the same branding as the Returns Hub portal')}
        >
          <Switch
            id="cp-inherit"
            checked={inherit}
            onCheckedChange={(v) => updateBranding({ inheritFromReturnsHub: v })}
          />
        </FormToggleRow>

        {!inherit && (
          <FormGrid cols={2}>
            <FormField
              label={t('Logo URL')}
              hint={portal.branding.logoUrl ? (
                <span className="inline-flex items-center gap-2">
                  <img src={portal.branding.logoUrl} alt="" className="size-6 rounded object-contain" loading="lazy" />
                  {t('Preview')}
                </span>
              ) : undefined}
            >
              <Input
                type="url"
                inputMode="url"
                value={portal.branding.logoUrl}
                onChange={(e) => updateBranding({ logoUrl: e.target.value })}
                placeholder="https://..."
              />
            </FormField>
            <FormField label={t('Favicon URL')}>
              <Input
                type="url"
                inputMode="url"
                value={portal.branding.faviconUrl}
                onChange={(e) => updateBranding({ faviconUrl: e.target.value })}
                placeholder="https://..."
              />
            </FormField>
            <FormField label={t('Portal Title')} hint={t('Overrides the browser tab title')} span="full">
              <Input
                value={portal.branding.portalTitle}
                onChange={(e) => updateBranding({ portalTitle: e.target.value })}
                placeholder={t('Customer Portal')}
              />
            </FormField>
            <FormField label={t('Font Family')}>
              <Select
                value={portal.branding.fontFamily}
                onValueChange={(v) => updateBranding({ fontFamily: v as CustomerPortalBrandingOverrides['fontFamily'] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System Default</SelectItem>
                  <SelectItem value="Inter" style={{ fontFamily: 'Inter, sans-serif' }}>Inter</SelectItem>
                  <SelectItem value="Roboto" style={{ fontFamily: 'Roboto, sans-serif' }}>Roboto</SelectItem>
                  <SelectItem value="Poppins" style={{ fontFamily: 'Poppins, sans-serif' }}>Poppins</SelectItem>
                  <SelectItem value="Playfair Display" style={{ fontFamily: '"Playfair Display", serif' }}>Playfair Display</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t('Border Radius')}>
              <ChoiceCards
                columns={4}
                value={portal.branding.borderRadius}
                onValueChange={(r) => updateBranding({ borderRadius: r })}
                options={(['none', 'small', 'medium', 'large'] as const).map((r) => ({
                  value: r,
                  label: t(r.charAt(0).toUpperCase() + r.slice(1)),
                }))}
              />
            </FormField>
          </FormGrid>
        )}
      </FormSection>

      {!inherit && (
        <FormSection
          title={t('Color Scheme')}
          description={t('Define the color palette for the customer portal')}
          icon={Palette}
        >
          <div aria-hidden="true" className="flex h-8 overflow-hidden rounded-lg border">
            {[
              portal.branding.primaryColor,
              portal.branding.secondaryColor,
              portal.branding.accentColor,
              portal.branding.headerBackground,
              portal.branding.sidebarBackground,
              portal.branding.pageBackground,
            ].map((c, i) => (
              <div key={i} className="flex-1" style={{ backgroundColor: c }} />
            ))}
          </div>
          <FormGrid cols={3}>
            <ColorField label={t('Primary Color')} value={portal.branding.primaryColor} onChange={(v) => updateBranding({ primaryColor: v })} />
            <ColorField label={t('Secondary Color')} value={portal.branding.secondaryColor} onChange={(v) => updateBranding({ secondaryColor: v })} />
            <ColorField label={t('Accent Color')} value={portal.branding.accentColor} onChange={(v) => updateBranding({ accentColor: v })} />
            <ColorField label={t('Page Background')} value={portal.branding.pageBackground} onChange={(v) => updateBranding({ pageBackground: v })} />
            <ColorField label={t('Card Background')} value={portal.branding.cardBackground} onChange={(v) => updateBranding({ cardBackground: v })} />
            <ColorField label={t('Header Background')} value={portal.branding.headerBackground} onChange={(v) => updateBranding({ headerBackground: v })} />
            <ColorField label={t('Header Text Color')} value={portal.branding.headerTextColor} onChange={(v) => updateBranding({ headerTextColor: v })} />
            <ColorField label={t('Sidebar Background')} value={portal.branding.sidebarBackground} onChange={(v) => updateBranding({ sidebarBackground: v })} />
            <ColorField label={t('Sidebar Text Color')} value={portal.branding.sidebarTextColor} onChange={(v) => updateBranding({ sidebarTextColor: v })} />
          </FormGrid>
        </FormSection>
      )}

      {!inherit && (
        <FormSection
          title={t('Login Page')}
          description={t('Customize the login page appearance')}
          icon={LogIn}
        >
          <FormField label={t('Layout Style')}>
            <ChoiceCards
              value={portal.branding.loginStyle}
              onValueChange={(style) => updateBranding({ loginStyle: style })}
              options={[
                { value: 'centered' as const, label: t('Centered'), description: t('Form centered on page'), icon: AlignCenter },
                { value: 'split' as const, label: t('Split'), description: t('Image left, form right'), icon: Columns2 },
              ]}
            />
          </FormField>
          <FormGrid cols={2}>
            {portal.branding.loginStyle === 'split' && (
              <FormField label={t('Background Image URL')} span="full">
                <Input
                  type="url"
                  inputMode="url"
                  value={portal.branding.loginBackgroundUrl}
                  onChange={(e) => updateBranding({ loginBackgroundUrl: e.target.value })}
                  placeholder="https://..."
                />
              </FormField>
            )}
            <FormField label={t('Welcome Title')}>
              <Input
                value={portal.branding.loginWelcomeTitle}
                onChange={(e) => updateBranding({ loginWelcomeTitle: e.target.value })}
                placeholder={t('Welcome back')}
              />
            </FormField>
            <FormField label={t('Welcome Subtitle')}>
              <Input
                value={portal.branding.loginWelcomeSubtitle}
                onChange={(e) => updateBranding({ loginWelcomeSubtitle: e.target.value })}
                placeholder={t('Sign in to your account')}
              />
            </FormField>
          </FormGrid>
          {welcomeField}
        </FormSection>
      )}

      {inherit && (
        <FormSection
          title={t('Welcome Message')}
          description={t('Message shown on the dashboard after login')}
          icon={LogIn}
        >
          {welcomeField}
        </FormSection>
      )}

      <FormSection
        title={t('Footer')}
        description={t('Configure the portal footer')}
        icon={PanelBottom}
      >
        <FormGrid cols={2}>
          <FormField label={t('Footer Text')}>
            <Input
              value={portal.branding.footerText}
              onChange={(e) => updateBranding({ footerText: e.target.value })}
            />
          </FormField>
          <FormField label={t('Copyright Text')}>
            <Input
              value={portal.branding.copyrightText}
              onChange={(e) => updateBranding({ copyrightText: e.target.value })}
              placeholder={`© ${new Date().getFullYear()} Company Name`}
            />
          </FormField>
        </FormGrid>
        <FormToggleRow
          htmlFor="cp-powered-by"
          label={t('Show "Powered by" badge')}
          description={t('Display "Powered by DPP Manager" in footer')}
        >
          <Switch
            id="cp-powered-by"
            checked={portal.branding.showPoweredBy}
            onCheckedChange={(v) => updateBranding({ showPoweredBy: v })}
          />
        </FormToggleRow>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium">{t('Footer Links')}</h4>
            <Button variant="outline" size="sm" onClick={addFooterLink} className="gap-1.5 pointer-coarse:h-11">
              <Plus className="h-3.5 w-3.5" />
              {t('Add')}
            </Button>
          </div>
          {footerLinks.map((_link: CustomerPortalFooterLink, index: number) => (
            <div key={index} className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <Input
                  value={_link.label}
                  onChange={(e) => updateFooterLink(index, { label: e.target.value })}
                  placeholder={t('Label')}
                  aria-label={t('Label')}
                  className="pointer-coarse:h-11"
                />
                <Input
                  type="url"
                  inputMode="url"
                  value={_link.url}
                  onChange={(e) => updateFooterLink(index, { url: e.target.value })}
                  placeholder="https://..."
                  aria-label="URL"
                  className="pointer-coarse:h-11"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFooterLink(index)}
                className="size-11 shrink-0 text-muted-foreground hover:text-destructive sm:size-9"
                aria-label={t('Delete')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </FormSection>

      {!inherit && (
        <FormSection
          title={t('Custom CSS')}
          description={t('Add custom CSS to override portal styles')}
          icon={Code}
        >
          <FormField
            label={t('Custom CSS')}
            optional
            hint={t('Available CSS variables: --portal-primary, --portal-secondary, --portal-accent, --portal-radius')}
          >
            <Textarea
              value={portal.branding.customCss}
              onChange={(e) => updateBranding({ customCss: e.target.value })}
              rows={6}
              className="font-mono text-xs"
              placeholder={`/* Custom portal styles */\n.customer-portal-header {\n  /* ... */\n}`}
            />
          </FormField>
        </FormSection>
      )}

      <FormActions sticky="page">
        <Button onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {t('Save')}
        </Button>
      </FormActions>
    </FormSections>
  );
}
