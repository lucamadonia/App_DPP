import { useTranslation } from 'react-i18next';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border cursor-pointer shrink-0"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
    </div>
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
      {/* Card 1: Returns Portal Branding */}
      <Card className="animate-fade-in-up">
        <CardHeader>
          <CardTitle className="text-base">{t('Returns Portal Branding')}</CardTitle>
          <CardDescription>{t('Primary color and logo for the public returns portal')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Primary Color')}</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={settings.branding.primaryColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    branding: { ...settings.branding, primaryColor: e.target.value },
                  })}
                  className="h-9 w-12 rounded border cursor-pointer"
                />
                <Input
                  value={settings.branding.primaryColor}
                  onChange={(e) => setSettings({
                    ...settings,
                    branding: { ...settings.branding, primaryColor: e.target.value },
                  })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Logo URL')}</Label>
              <Input
                value={settings.branding.logoUrl}
                onChange={(e) => setSettings({
                  ...settings,
                  branding: { ...settings.branding, logoUrl: e.target.value },
                })}
                placeholder="https://..."
              />
            </div>
          </div>

          <SaveButton />
        </CardContent>
      </Card>

      {/* Card 2: Corporate Identity */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '50ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base">{t('Corporate Identity')}</CardTitle>
          <CardDescription>{t('Logo, typography and visual identity for the customer portal')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Inherit from Returns Hub')}</Label>
              <p className="text-xs text-muted-foreground">{t('Use the same branding as the Returns Hub portal')}</p>
            </div>
            <Switch
              checked={portal.branding.inheritFromReturnsHub}
              onCheckedChange={(v) => updateBranding({ inheritFromReturnsHub: v })}
            />
          </div>

          {!portal.branding.inheritFromReturnsHub && (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Logo URL')}</Label>
                  <Input
                    value={portal.branding.logoUrl}
                    onChange={(e) => updateBranding({ logoUrl: e.target.value })}
                    placeholder="https://..."
                  />
                  {portal.branding.logoUrl && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                      <img src={portal.branding.logoUrl} alt="Logo" className="h-8 w-8 object-contain rounded" />
                      <span className="text-xs text-muted-foreground">{t('Preview')}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('Favicon URL')}</Label>
                  <Input
                    value={portal.branding.faviconUrl}
                    onChange={(e) => updateBranding({ faviconUrl: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('Portal Title')}</Label>
                <Input
                  value={portal.branding.portalTitle}
                  onChange={(e) => updateBranding({ portalTitle: e.target.value })}
                  placeholder={t('Customer Portal')}
                />
                <p className="text-xs text-muted-foreground">{t('Overrides the browser tab title')}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Font Family')}</Label>
                  <Select
                    value={portal.branding.fontFamily}
                    onValueChange={(v) => updateBranding({ fontFamily: v as CustomerPortalBrandingOverrides['fontFamily'] })}
                  >
                    <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label>{t('Border Radius')}</Label>
                  <div className="flex gap-1">
                    {(['none', 'small', 'medium', 'large'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => updateBranding({ borderRadius: r })}
                        className={`flex-1 h-9 border text-xs font-medium transition-colors ${
                          portal.branding.borderRadius === r
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background hover:bg-muted'
                        }`}
                        style={{
                          borderRadius: r === 'none' ? 0 : r === 'small' ? 4 : r === 'medium' ? 8 : 14,
                        }}
                      >
                        {t(r.charAt(0).toUpperCase() + r.slice(1))}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <SaveButton />
        </CardContent>
      </Card>

      {/* Card 3: Color Scheme */}
      {!portal.branding.inheritFromReturnsHub && (
        <Card className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
          <CardHeader>
            <CardTitle className="text-base">{t('Color Scheme')}</CardTitle>
            <CardDescription>{t('Define the color palette for the customer portal')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Preview strip */}
            <div className="flex gap-1.5 h-8 rounded-lg overflow-hidden border">
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ColorField label={t('Primary Color')} value={portal.branding.primaryColor} onChange={(v) => updateBranding({ primaryColor: v })} />
              <ColorField label={t('Secondary Color')} value={portal.branding.secondaryColor} onChange={(v) => updateBranding({ secondaryColor: v })} />
              <ColorField label={t('Accent Color')} value={portal.branding.accentColor} onChange={(v) => updateBranding({ accentColor: v })} />
              <ColorField label={t('Page Background')} value={portal.branding.pageBackground} onChange={(v) => updateBranding({ pageBackground: v })} />
              <ColorField label={t('Card Background')} value={portal.branding.cardBackground} onChange={(v) => updateBranding({ cardBackground: v })} />
              <ColorField label={t('Header Background')} value={portal.branding.headerBackground} onChange={(v) => updateBranding({ headerBackground: v })} />
              <ColorField label={t('Header Text Color')} value={portal.branding.headerTextColor} onChange={(v) => updateBranding({ headerTextColor: v })} />
              <ColorField label={t('Sidebar Background')} value={portal.branding.sidebarBackground} onChange={(v) => updateBranding({ sidebarBackground: v })} />
              <ColorField label={t('Sidebar Text Color')} value={portal.branding.sidebarTextColor} onChange={(v) => updateBranding({ sidebarTextColor: v })} />
            </div>

            <SaveButton />
          </CardContent>
        </Card>
      )}

      {/* Card 4: Login Page */}
      {!portal.branding.inheritFromReturnsHub && (
        <Card className="animate-fade-in-up" style={{ animationDelay: '150ms', animationFillMode: 'backwards' }}>
          <CardHeader>
            <CardTitle className="text-base">{t('Login Page')}</CardTitle>
            <CardDescription>{t('Customize the login page appearance')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Layout Style')}</Label>
              <div className="grid grid-cols-2 gap-3">
                {(['centered', 'split'] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => updateBranding({ loginStyle: style })}
                    className={`relative p-3 border-2 rounded-lg text-left transition-all ${
                      portal.branding.loginStyle === style
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/30'
                    }`}
                  >
                    {/* Mini preview */}
                    <div className="flex gap-1 h-12 mb-2 rounded bg-muted/50 overflow-hidden">
                      {style === 'centered' ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="w-8 h-6 bg-primary/20 rounded" />
                        </div>
                      ) : (
                        <>
                          <div className="w-1/2 bg-primary/10" />
                          <div className="w-1/2 flex items-center justify-center">
                            <div className="w-6 h-5 bg-primary/20 rounded" />
                          </div>
                        </>
                      )}
                    </div>
                    <p className="text-sm font-medium">{t(style === 'centered' ? 'Centered' : 'Split')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(style === 'centered' ? 'Form centered on page' : 'Image left, form right')}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {portal.branding.loginStyle === 'split' && (
              <div className="space-y-2">
                <Label>{t('Background Image URL')}</Label>
                <Input
                  value={portal.branding.loginBackgroundUrl}
                  onChange={(e) => updateBranding({ loginBackgroundUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('Welcome Title')}</Label>
              <Input
                value={portal.branding.loginWelcomeTitle}
                onChange={(e) => updateBranding({ loginWelcomeTitle: e.target.value })}
                placeholder={t('Welcome back')}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Welcome Subtitle')}</Label>
              <Input
                value={portal.branding.loginWelcomeSubtitle}
                onChange={(e) => updateBranding({ loginWelcomeSubtitle: e.target.value })}
                placeholder={t('Sign in to your account')}
              />
            </div>

            <SaveButton />
          </CardContent>
        </Card>
      )}

      {/* Card 5: Footer */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base">{t('Footer')}</CardTitle>
          <CardDescription>{t('Configure the portal footer')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t('Footer Text')}</Label>
            <Input
              value={portal.branding.footerText}
              onChange={(e) => updateBranding({ footerText: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('Copyright Text')}</Label>
            <Input
              value={portal.branding.copyrightText}
              onChange={(e) => updateBranding({ copyrightText: e.target.value })}
              placeholder={`\u00A9 ${new Date().getFullYear()} Company Name`}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('Show "Powered by" badge')}</Label>
              <p className="text-xs text-muted-foreground">{t('Display "Powered by DPP Manager" in footer')}</p>
            </div>
            <Switch
              checked={portal.branding.showPoweredBy}
              onCheckedChange={(v) => updateBranding({ showPoweredBy: v })}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('Footer Links')}</Label>
              <Button variant="outline" size="sm" onClick={addFooterLink} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {t('Add')}
              </Button>
            </div>
            {footerLinks.map((_link: CustomerPortalFooterLink, index: number) => (
              <div key={index} className="flex gap-2 items-start">
                <Input
                  value={_link.label}
                  onChange={(e) => updateFooterLink(index, { label: e.target.value })}
                  placeholder={t('Label')}
                  className="flex-1"
                />
                <Input
                  value={_link.url}
                  onChange={(e) => updateFooterLink(index, { url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1"
                />
                <Button variant="ghost" size="icon" onClick={() => removeFooterLink(index)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <SaveButton />
        </CardContent>
      </Card>

      {/* Card 6: Welcome Message */}
      <Card className="animate-fade-in-up" style={{ animationDelay: '250ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base">{t('Welcome Message')}</CardTitle>
          <CardDescription>{t('Message shown on the dashboard after login')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={portal.branding.welcomeMessage}
              onChange={(e) => updateBranding({ welcomeMessage: e.target.value })}
              rows={3}
              placeholder={t('Welcome to our customer portal...')}
            />
          </div>
          <SaveButton />
        </CardContent>
      </Card>

      {/* Card 7: Custom CSS */}
      {!portal.branding.inheritFromReturnsHub && (
        <Card className="animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
          <CardHeader>
            <CardTitle className="text-base">{t('Custom CSS')}</CardTitle>
            <CardDescription>{t('Add custom CSS to override portal styles')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={portal.branding.customCss}
              onChange={(e) => updateBranding({ customCss: e.target.value })}
              rows={6}
              className="font-mono text-xs"
              placeholder={`/* Custom portal styles */\n.customer-portal-header {\n  /* ... */\n}`}
            />
            <p className="text-xs text-muted-foreground">
              {t('Available CSS variables: --portal-primary, --portal-secondary, --portal-accent, --portal-radius')}
            </p>
            <SaveButton />
          </CardContent>
        </Card>
      )}
    </>
  );
}
