import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  Building2,
  Palette,
  Users,
  Key,
  Save,
  Upload,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  RefreshCw,
  Check,
  Globe,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  getCurrentTenant,
  updateCurrentTenant,
  getProfiles,
  uploadBrandingAsset,
  getProducts,
  type Profile,
  type ProductListItem,
} from '@/services/supabase';
import { useBranding } from '@/contexts/BrandingContext';
import type { Tenant, BrandingSettings } from '@/types/database';
import { validateDomain, validatePathPrefix, normalizeDomain, buildDomainUrl } from '@/lib/domain-utils';

const apiKeys = [
  { id: '1', name: 'ERP Integration', key: 'dpp_live_sk_...7x9a', created: '2024-06-15', lastUsed: '2026-01-27' },
  { id: '2', name: 'Shopify Connector', key: 'dpp_live_sk_...3b2c', created: '2024-09-01', lastUsed: '2026-01-25' },
];

export function SettingsPage({ tab = 'company' }: { tab?: string }) {
  const { t } = useTranslation('settings');
  const locale = useLocale();
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSaved, setBrandingSaved] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);

  // Domain settings state
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [domainSaved, setDomainSaved] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [pathPrefixError, setPathPrefixError] = useState<string | null>(null);

  // Get branding context
  const { branding, rawBranding, updateBranding, refreshBranding, qrCodeSettings, updateQRCodeSettings } = useBranding();

  // Branding form state
  const [brandingForm, setBrandingForm] = useState<BrandingSettings>({
    appName: '',
    primaryColor: '#3B82F6',
    logo: '',
    favicon: '',
    poweredByText: '',
  });

  // Domain settings form state (synced with context)
  const [domainForm, setDomainForm] = useState({
    customDomain: '',
    useCustomDomain: false,
    useHTTPS: true,
    pathPrefix: '',
    resolver: 'local' as 'custom' | 'gs1' | 'local',
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    country: '',
    eori: '',
    vat: '',
  });

  // Load tenant, users, and products
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);

      const [tenantData, usersData, productsData] = await Promise.all([
        getCurrentTenant(),
        getProfiles(),
        getProducts(),
      ]);

      if (tenantData) {
        setTenant(tenantData);
        setFormData({
          name: tenantData.name || '',
          address: tenantData.address || '',
          country: tenantData.country || '',
          eori: tenantData.eori || '',
          vat: tenantData.vat || '',
        });
      }

      setUsers(usersData);
      setProducts(productsData);
      setIsLoading(false);
    }

    loadData();
  }, []);

  // Sync branding form with context
  useEffect(() => {
    if (rawBranding) {
      setBrandingForm({
        appName: rawBranding.appName || '',
        primaryColor: rawBranding.primaryColor || '#3B82F6',
        logo: rawBranding.logo || '',
        favicon: rawBranding.favicon || '',
        poweredByText: rawBranding.poweredByText || '',
      });
    }
  }, [rawBranding]);

  // Sync domain form with context
  useEffect(() => {
    setDomainForm({
      customDomain: qrCodeSettings.customDomain || '',
      useCustomDomain: qrCodeSettings.resolver === 'custom',
      useHTTPS: qrCodeSettings.useHttps,
      pathPrefix: qrCodeSettings.pathPrefix || '',
      resolver: qrCodeSettings.resolver as 'custom' | 'gs1' | 'local',
    });
  }, [qrCodeSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    const result = await updateCurrentTenant({
      name: formData.name,
      address: formData.address,
      country: formData.country,
      eori: formData.eori,
      vat: formData.vat,
    });

    if (result.success) {
      // Reload tenant data
      const updatedTenant = await getCurrentTenant();
      if (updatedTenant) {
        setTenant(updatedTenant);
      }
    }
    setIsSaving(false);
  };

  // Handle branding save
  const handleSaveBranding = async () => {
    setIsSavingBranding(true);
    setBrandingSaved(false);

    const success = await updateBranding({
      appName: brandingForm.appName || undefined,
      primaryColor: brandingForm.primaryColor || undefined,
      logo: brandingForm.logo || undefined,
      favicon: brandingForm.favicon || undefined,
      poweredByText: brandingForm.poweredByText || undefined,
    });

    if (success) {
      await refreshBranding();
      setBrandingSaved(true);
      setTimeout(() => setBrandingSaved(false), 2000);
    }

    setIsSavingBranding(false);
  };

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    const result = await uploadBrandingAsset(file, 'logo');

    if (result.success && result.url) {
      setBrandingForm((prev) => ({ ...prev, logo: result.url! }));
      await refreshBranding();
    } else {
      console.error('Logo upload failed:', result.error);
      alert(`Logo upload failed: ${result.error || 'Unknown error'}`);
    }

    setIsUploadingLogo(false);
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  // Handle favicon upload
  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingFavicon(true);
    const result = await uploadBrandingAsset(file, 'favicon');

    if (result.success && result.url) {
      setBrandingForm((prev) => ({ ...prev, favicon: result.url! }));
      await refreshBranding();
    } else {
      console.error('Favicon upload failed:', result.error);
      alert(`Favicon upload failed: ${result.error || 'Unknown error'}`);
    }

    setIsUploadingFavicon(false);
    if (faviconInputRef.current) {
      faviconInputRef.current.value = '';
    }
  };

  // Handle removing logo
  const handleRemoveLogo = () => {
    setBrandingForm((prev) => ({ ...prev, logo: '' }));
  };

  // Handle removing favicon
  const handleRemoveFavicon = () => {
    setBrandingForm((prev) => ({ ...prev, favicon: '' }));
  };

  // Handle domain validation on change
  const handleDomainChange = (value: string) => {
    const normalized = normalizeDomain(value);
    setDomainForm((prev) => ({ ...prev, customDomain: normalized }));

    // Only validate if user has entered something
    if (normalized) {
      const validation = validateDomain(normalized);
      setDomainError(validation.isValid ? null : validation.errorMessage || null);
    } else {
      setDomainError(null);
    }
  };

  // Handle path prefix validation on change
  const handlePathPrefixChange = (value: string) => {
    setDomainForm((prev) => ({ ...prev, pathPrefix: value }));

    if (value) {
      const validation = validatePathPrefix(value);
      setPathPrefixError(validation.isValid ? null : validation.errorMessage || null);
    } else {
      setPathPrefixError(null);
    }
  };

  // Save domain settings
  const handleSaveDomain = async () => {
    // Validate before saving
    if (domainForm.resolver === 'custom') {
      const domainValidation = validateDomain(domainForm.customDomain);
      if (!domainValidation.isValid) {
        setDomainError(domainValidation.errorMessage || 'Invalid domain');
        return;
      }

      if (domainForm.pathPrefix) {
        const prefixValidation = validatePathPrefix(domainForm.pathPrefix);
        if (!prefixValidation.isValid) {
          setPathPrefixError(prefixValidation.errorMessage || 'Invalid path');
          return;
        }
      }
    }

    setIsSavingDomain(true);
    setDomainSaved(false);

    const success = await updateQRCodeSettings({
      customDomain: domainForm.customDomain || undefined,
      pathPrefix: domainForm.pathPrefix || undefined,
      useHttps: domainForm.useHTTPS,
      resolver: domainForm.resolver,
    });

    if (success) {
      setDomainSaved(true);
      setTimeout(() => setDomainSaved(false), 2000);
    }

    setIsSavingDomain(false);
  };

  // Generate preview URL
  const getPreviewUrl = () => {
    if (domainForm.resolver === 'gs1') {
      return 'https://id.gs1.org/01/GTIN/21/SERIAL';
    }
    if (domainForm.resolver === 'local') {
      return `${window.location.origin}/p/GTIN/SERIAL`;
    }
    if (domainForm.customDomain) {
      return buildDomainUrl({
        domain: domainForm.customDomain,
        useHttps: domainForm.useHTTPS,
        pathPrefix: domainForm.pathPrefix,
        gtin: 'GTIN',
        serial: 'SERIAL',
      });
    }
    return `${window.location.origin}/p/GTIN/SERIAL`;
  };

  // Get a sample product for preview links
  const sampleProduct = products.length > 0 ? products[0] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t('Settings')}</h1>
        <p className="text-muted-foreground">
          {t('Manage your company profile and system settings')}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={tab}>
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="company" className="flex items-center gap-2 flex-shrink-0">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Company Profile')}</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2 flex-shrink-0">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Branding')}</span>
          </TabsTrigger>
          <TabsTrigger value="domain" className="flex items-center gap-2 flex-shrink-0">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Domain')}</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2 flex-shrink-0">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Users')}</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2 flex-shrink-0">
            <Key className="h-4 w-4" />
            <span className="hidden sm:inline">{t('API Keys')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Company Profile */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('Company Data')}</CardTitle>
              <CardDescription>
                {t('This information will be displayed in your DPPs')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('Company Name')} *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your Company Inc."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('EORI Number')}</label>
                  <Input
                    value={formData.eori}
                    onChange={(e) => setFormData({ ...formData, eori: e.target.value })}
                    placeholder="DE123456789012345"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('Address')}</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street, New York, NY 10001"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('Country')}</label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="United States"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('VAT ID')}</label>
                  <Input
                    value={formData.vat}
                    onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
                    placeholder="DE123456789"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('Plan')}</label>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        tenant?.plan === 'enterprise'
                          ? 'bg-primary'
                          : tenant?.plan === 'pro'
                          ? 'bg-success'
                          : 'bg-muted'
                      }
                    >
                      {tenant?.plan === 'enterprise'
                        ? 'Enterprise'
                        : tenant?.plan === 'pro'
                        ? 'Pro'
                        : 'Free'}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {tenant?.plan === 'free' && '(Upgrade for more features)'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-4">{t('Responsible Person (EU Regulation)')}</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('Name')}</label>
                    <Input placeholder="Dr. Jane Smith" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('Email')}</label>
                    <Input placeholder="compliance@your-company.com" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('Phone')}</label>
                    <Input placeholder="+49 30 123456789" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('Save', { ns: 'common' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('App Name & Logo')}</CardTitle>
              <CardDescription>
                {t('Customize the appearance of your DPP application')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* App-Name */}
                <div className="space-y-2">
                  <Label htmlFor="appName">{t('App Name')}</Label>
                  <Input
                    id="appName"
                    placeholder="DPP Manager"
                    value={brandingForm.appName || ''}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, appName: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('Displayed in the sidebar, breadcrumb, and browser tab')}
                  </p>
                </div>

                {/* Powered By Text */}
                <div className="space-y-2">
                  <Label htmlFor="poweredBy">{t('Footer Text')}</Label>
                  <Input
                    id="poweredBy"
                    placeholder="Powered by DPP Manager"
                    value={brandingForm.poweredByText || ''}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, poweredByText: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('Displayed in the footer of public pages')}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                {/* Logo */}
                <div className="space-y-4">
                  <Label>{t('Company Logo')}</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden">
                      {brandingForm.logo ? (
                        <img
                          src={brandingForm.logo}
                          alt="Logo"
                          className="max-h-18 max-w-18 object-contain"
                        />
                      ) : branding.logo ? (
                        <img
                          src={branding.logo}
                          alt="Logo"
                          className="max-h-18 max-w-18 object-contain"
                        />
                      ) : (
                        <Upload className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {t('Upload')}
                      </Button>
                      {brandingForm.logo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('Remove')}
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">{t('PNG, JPG, SVG up to 2MB')}</p>
                    </div>
                  </div>
                </div>

                {/* Favicon */}
                <div className="space-y-4">
                  <Label>{t('Favicon')}</Label>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted overflow-hidden">
                      {brandingForm.favicon ? (
                        <img
                          src={brandingForm.favicon}
                          alt="Favicon"
                          className="max-h-10 max-w-10 object-contain"
                        />
                      ) : (
                        <Upload className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
                        onChange={handleFaviconUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => faviconInputRef.current?.click()}
                        disabled={isUploadingFavicon}
                      >
                        {isUploadingFavicon ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {t('Upload')}
                      </Button>
                      {brandingForm.favicon && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFavicon}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('Remove')}
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">{t('PNG, SVG, ICO up to 2MB')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Primary Color')}</CardTitle>
              <CardDescription>
                {t('This color is used as the accent color throughout the application')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>{t('Choose Color')}</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandingForm.primaryColor || '#3B82F6'}
                      onChange={(e) =>
                        setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="h-10 w-14 rounded border cursor-pointer"
                    />
                    <Input
                      value={brandingForm.primaryColor || '#3B82F6'}
                      onChange={(e) =>
                        setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="font-mono w-28"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                {/* Preset colors */}
                <div className="space-y-2">
                  <Label>{t('Presets')}</Label>
                  <div className="flex gap-2">
                    {['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'].map(
                      (color) => (
                        <button
                          key={color}
                          onClick={() =>
                            setBrandingForm((prev) => ({ ...prev, primaryColor: color }))
                          }
                          className={`h-8 w-8 rounded border-2 transition-all ${
                            brandingForm.primaryColor === color
                              ? 'border-foreground scale-110'
                              : 'border-transparent hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      )
                    )}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setBrandingForm((prev) => ({ ...prev, primaryColor: '#3B82F6' }))
                }
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('Reset to Default Color')}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Preview')}</CardTitle>
              <CardDescription>{t('This is how your branding appears in the application')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 rounded-lg border bg-card">
                <div className="flex items-center gap-3 mb-4">
                  {brandingForm.logo ? (
                    <img
                      src={brandingForm.logo}
                      alt="Logo"
                      className="h-10 w-10 rounded object-contain"
                    />
                  ) : (
                    <div
                      className="h-10 w-10 rounded flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: brandingForm.primaryColor || '#3B82F6' }}
                    >
                      {(brandingForm.appName || tenant?.name || 'D').charAt(0)}
                    </div>
                  )}
                  <span className="font-semibold">
                    {brandingForm.appName || 'DPP Manager'}
                  </span>
                </div>
                <div className="flex gap-2 mb-4">
                  <Badge style={{ backgroundColor: brandingForm.primaryColor || '#3B82F6' }}>
                    {t('Primary Color')}
                  </Badge>
                  <Badge variant="outline">Secondary</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {brandingForm.poweredByText || 'Powered by DPP Manager'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview links for public pages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                {t('Test Public Pages')}
              </CardTitle>
              <CardDescription>
                {t('See how your branding looks for end consumers')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sampleProduct ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {t('Open a sample product page to see your branding in action:')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <a
                        href={`/p/${sampleProduct.gtin}/${sampleProduct.serial}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('Consumer View')} ({sampleProduct.name})
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={`/p/${sampleProduct.gtin}/${sampleProduct.serial}?view=zoll`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('Customs View')}
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('The product "{{name}}" is used as an example.', { name: sampleProduct.name })}
                  </p>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Info className="mx-auto h-8 w-8 opacity-30 mb-2" />
                  <p>{t('Create a product first to test the public pages.')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSaveBranding} disabled={isSavingBranding}>
              {isSavingBranding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : brandingSaved ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {brandingSaved ? t('Saved!') : t('Save Branding')}
            </Button>
          </div>
        </TabsContent>

        {/* Domain */}
        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('URL Resolver')}</CardTitle>
              <CardDescription>
                {t('Choose how QR code URLs for your products should be resolved')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Info className="h-4 w-4" />
                  {t('Why use a custom domain?')}
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {t('With a custom domain you have full control over your DPP URLs. You can set up your own resolver that redirects QR codes to your product pages.')}
                </p>
              </div>

              <div className="grid gap-3">
                {/* GS1 Option */}
                <label
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    domainForm.resolver === 'gs1'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="resolver-settings"
                    value="gs1"
                    checked={domainForm.resolver === 'gs1'}
                    onChange={() => setDomainForm({ ...domainForm, resolver: 'gs1', useCustomDomain: false })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      {t('GS1 Digital Link Resolver')}
                      <Badge variant="secondary">{t('Recommended')}</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('Uses the official GS1 Resolver (id.gs1.org)')}
                    </p>
                    <p className="text-xs font-mono mt-1 text-muted-foreground">
                      https://id.gs1.org/01/GTIN/21/SERIAL
                    </p>
                  </div>
                </label>

                {/* Local Option */}
                <label
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    domainForm.resolver === 'local'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="resolver-settings"
                    value="local"
                    checked={domainForm.resolver === 'local'}
                    onChange={() => setDomainForm({ ...domainForm, resolver: 'local', useCustomDomain: false })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      {t('Local Product Pages')}
                      <Badge variant="default">{t('Built-in')}</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('Uses the built-in public DPP pages of this application')}
                    </p>
                    <p className="text-xs font-mono mt-1 text-muted-foreground">
                      {window.location.origin}/p/GTIN/SERIAL
                    </p>
                  </div>
                </label>

                {/* Custom Domain Option */}
                <label
                  className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    domainForm.resolver === 'custom'
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="resolver-settings"
                    value="custom"
                    checked={domainForm.resolver === 'custom'}
                    onChange={() => setDomainForm({ ...domainForm, resolver: 'custom', useCustomDomain: true })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="font-medium flex items-center gap-2">
                      {t('Custom Domain')}
                      <Badge variant="outline">{t('Custom')}</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('Use your own domain for DPP URLs')}
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Custom Domain Settings */}
          {domainForm.resolver === 'custom' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Domain Configuration')}</CardTitle>
                <CardDescription>
                  {t('Configure your own domain for DPP URLs')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Domain Input */}
                  <div className="space-y-2">
                    <Label htmlFor="customDomain">{t('Your Domain')} *</Label>
                    <Input
                      id="customDomain"
                      placeholder="e.g. dpp.your-company.com"
                      value={domainForm.customDomain}
                      onChange={(e) => handleDomainChange(e.target.value)}
                      className={domainError ? 'border-destructive' : ''}
                    />
                    {domainError ? (
                      <p className="text-xs text-destructive">{domainError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t('Enter the domain only, without https://')}
                      </p>
                    )}
                  </div>

                  {/* Path Prefix */}
                  <div className="space-y-2">
                    <Label htmlFor="pathPrefix">{t('Path Prefix (optional)')}</Label>
                    <Input
                      id="pathPrefix"
                      placeholder="e.g. products or passport"
                      value={domainForm.pathPrefix}
                      onChange={(e) => handlePathPrefixChange(e.target.value)}
                      className={pathPrefixError ? 'border-destructive' : ''}
                    />
                    {pathPrefixError ? (
                      <p className="text-xs text-destructive">{pathPrefixError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t('Inserted between the domain and product path')}
                      </p>
                    )}
                  </div>
                </div>

                {/* HTTPS Toggle */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useHttps"
                    checked={domainForm.useHTTPS}
                    onCheckedChange={(checked: boolean) =>
                      setDomainForm({ ...domainForm, useHTTPS: checked })
                    }
                  />
                  <Label htmlFor="useHttps">{t('Use HTTPS (recommended)')}</Label>
                </div>

                {/* URL Preview */}
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <Label className="text-sm font-medium">{t('URL Preview')}</Label>
                  <p className="font-mono text-sm break-all mt-2 text-muted-foreground">
                    {getPreviewUrl()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Current Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Current Configuration')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('Resolver')}:</span>
                    <span className="font-medium">
                      {domainForm.resolver === 'gs1' && t('GS1 Digital Link')}
                      {domainForm.resolver === 'local' && t('Local Product Pages')}
                      {domainForm.resolver === 'custom' && t('Custom Domain')}
                    </span>
                  </div>
                  {domainForm.resolver === 'custom' && domainForm.customDomain && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('Domain')}:</span>
                        <span className="font-mono">{domainForm.customDomain}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('Protocol')}:</span>
                        <span>{domainForm.useHTTPS ? 'HTTPS' : 'HTTP'}</span>
                      </div>
                      {domainForm.pathPrefix && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t('Path Prefix')}:</span>
                          <span className="font-mono">/{domainForm.pathPrefix}</span>
                        </div>
                      )}
                    </>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('Example URL')}:</span>
                    <span className="font-mono text-xs break-all">{getPreviewUrl()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveDomain}
              disabled={isSavingDomain || (domainForm.resolver === 'custom' && !!domainError)}
            >
              {isSavingDomain ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : domainSaved ? (
                <Check className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {domainSaved ? t('Saved!') : t('Save Domain Settings')}
            </Button>
          </div>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('Users & Roles')}</CardTitle>
                  <CardDescription>
                    {t('Manage access rights for your team')}
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('Invite User')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>{t('No other users in this tenant')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Name')}</TableHead>
                      <TableHead>{t('Email')}</TableHead>
                      <TableHead>{t('Role')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name || 'Unknown'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            {user.role === 'admin' ? t('Admin') : user.role === 'editor' ? t('Editor') : t('Viewer')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-success">
                            {t('Active')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Roles')}</CardTitle>
              <CardDescription>{t('Defined access rights')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium">{t('Admin')}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('Full access to all features including settings and user management')}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium">{t('Editor')}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('Can create, edit, and publish products and DPPs')}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium">{t('Viewer')}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('Read-only access to products and reports')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API-Keys */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('API-Keys')}</CardTitle>
                  <CardDescription>
                    {t('Manage API keys for integrations (ERP, shop systems)')}
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  {t('New API Key')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Name')}</TableHead>
                    <TableHead>{t('API Key')}</TableHead>
                    <TableHead>{t('Created')}</TableHead>
                    <TableHead>{t('Last Used')}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm">
                            {showApiKey === key.id ? 'dpp_live_sk_a1b2c3d4e5f6g7h8i9j0' : key.key}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => setShowApiKey(showApiKey === key.id ? null : key.id)}
                          >
                            {showApiKey === key.id ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(key.created, locale)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(key.lastUsed, locale)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('Delete')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('API Documentation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted font-mono text-sm">
                <p className="text-muted-foreground"># Base URL</p>
                <p>https://api.dpp-manager.de/v1</p>
                <p className="text-muted-foreground mt-4"># Authentication</p>
                <p>Authorization: Bearer {'<API_KEY>'}</p>
              </div>
              <Button variant="outline" className="mt-4">
                {t('Full Documentation')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
