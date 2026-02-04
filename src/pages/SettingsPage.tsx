import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { UsersTab } from '@/components/settings/UsersTab';
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
  Loader2,
  RefreshCw,
  Check,
  Globe,
  ExternalLink,
  Info,
  Camera,
  X,
  LayoutDashboard,
  Package,
  FileText,
  Settings,
  Paintbrush,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  uploadBrandingAsset,
  getProducts,
  type ProductListItem,
} from '@/services/supabase';
import { updateTenantSettings } from '@/services/supabase/tenants';
import { LANGUAGE_OPTIONS } from '@/components/product/LanguageSwitcher';
import { useBranding } from '@/contexts/BrandingContext';
import type { Tenant, BrandingSettings } from '@/types/database';
import { validateDomain, validatePathPrefix, normalizeDomain, buildDomainUrl } from '@/lib/domain-utils';
import { DPPDesignTab } from '@/components/settings/DPPDesignTab';
import { CustomDomainWizard } from '@/components/settings/CustomDomainWizard';

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
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingFavicon, setIsUploadingFavicon] = useState(false);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const [faviconDragOver, setFaviconDragOver] = useState(false);
  const [logoUploadSuccess, setLogoUploadSuccess] = useState(false);
  const [faviconUploadSuccess, setFaviconUploadSuccess] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [faviconUploadError, setFaviconUploadError] = useState<string | null>(null);

  // Domain settings state
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [domainSaved, setDomainSaved] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [pathPrefixError, setPathPrefixError] = useState<string | null>(null);
  const [domainWizardOpen, setDomainWizardOpen] = useState(false);

  // Get branding context
  const { rawBranding, updateBranding, refreshBranding, qrCodeSettings, updateQRCodeSettings } = useBranding();

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

      const [tenantData, productsData] = await Promise.all([
        getCurrentTenant(),
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

  // Handle file upload (shared logic)
  const processUpload = useCallback(async (file: File, type: 'logo' | 'favicon') => {
    const setUploading = type === 'logo' ? setIsUploadingLogo : setIsUploadingFavicon;
    const setSuccess = type === 'logo' ? setLogoUploadSuccess : setFaviconUploadSuccess;
    const setError = type === 'logo' ? setLogoUploadError : setFaviconUploadError;
    const inputRef = type === 'logo' ? logoInputRef : faviconInputRef;

    setUploading(true);
    setError(null);
    setSuccess(false);

    const result = await uploadBrandingAsset(file, type);

    if (result.success && result.url) {
      setBrandingForm((prev) => ({ ...prev, [type]: result.url! }));
      await refreshBranding();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } else {
      console.error(`${type} upload failed:`, result.error);
      setError(result.error || 'Unknown error');
      setTimeout(() => setError(null), 4000);
    }

    setUploading(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [refreshBranding]);

  // Handle logo upload via file input
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processUpload(file, 'logo');
  };

  // Handle favicon upload via file input
  const handleFaviconUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await processUpload(file, 'favicon');
  };

  // Handle drag & drop for logo
  const handleLogoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setLogoDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processUpload(file, 'logo');
    }
  }, [processUpload]);

  // Handle drag & drop for favicon
  const handleFaviconDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setFaviconDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processUpload(file, 'favicon');
    }
  }, [processUpload]);

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
            <span className="hidden sm:inline">{t('App Branding')}</span>
          </TabsTrigger>
          <TabsTrigger value="dpp-design" className="flex items-center gap-2 flex-shrink-0">
            <Paintbrush className="h-4 w-4" />
            <span className="hidden sm:inline">{t('DPP Design')}</span>
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

              <Separator />

              <div>
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  {t('Product Languages')}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('Configure which languages are available for product content')}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(tenant?.settings?.productLanguages || ['en', 'de']).map((lang) => {
                    const langInfo = LANGUAGE_OPTIONS[lang];
                    return (
                      <Badge key={lang} variant="secondary" className="gap-1.5">
                        <span className="uppercase text-xs font-bold">{lang}</span>
                        {langInfo?.label || lang}
                        <button
                          type="button"
                          className="ml-1 hover:text-destructive"
                          onClick={async () => {
                            const current = tenant?.settings?.productLanguages || ['en', 'de'];
                            if (current.length <= 1) return;
                            const updated = current.filter((l: string) => l !== lang);
                            await updateTenantSettings({ productLanguages: updated });
                            const refreshed = await getCurrentTenant();
                            if (refreshed) setTenant(refreshed);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
                <Select
                  value=""
                  onValueChange={async (lang) => {
                    if (!lang) return;
                    const current = tenant?.settings?.productLanguages || ['en', 'de'];
                    if (current.includes(lang)) return;
                    await updateTenantSettings({ productLanguages: [...current, lang] });
                    const refreshed = await getCurrentTenant();
                    if (refreshed) setTenant(refreshed);
                  }}
                >
                  <SelectTrigger className="w-60">
                    <SelectValue placeholder={t('Add Language')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LANGUAGE_OPTIONS)
                      .filter(([code]) => !(tenant?.settings?.productLanguages || ['en', 'de']).includes(code))
                      .map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          <span className="uppercase text-xs font-bold mr-2">{code}</span>
                          {info.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
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
          {/* Card 1: Brand Identity */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Brand Identity')}</CardTitle>
              <CardDescription>
                {t('Customize the appearance of your DPP application')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Logo Drag & Drop Zone */}
                <div className="space-y-3">
                  <Label>{t('Company Logo')}</Label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div
                    className={`relative h-52 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                      logoDragOver
                        ? 'border-primary bg-primary/5'
                        : brandingForm.logo
                        ? 'border-muted hover:border-primary/50'
                        : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/30'
                    }`}
                    onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setLogoDragOver(true); }}
                    onDragLeave={() => setLogoDragOver(false)}
                    onDrop={handleLogoDrop}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : brandingForm.logo ? (
                      <>
                        <img
                          src={brandingForm.logo}
                          alt="Logo"
                          className="max-h-36 max-w-full object-contain"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <Camera className="h-6 w-6 text-white" />
                          <span className="text-white text-sm font-medium">{t('Change logo')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground text-center px-4">
                          {t('Drag & drop your logo here or click to upload')}
                        </p>
                      </>
                    )}
                    {/* Success overlay */}
                    {logoUploadSuccess && (
                      <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                        <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                          <Check className="h-4 w-4" />
                          {t('Uploaded!')}
                        </div>
                      </div>
                    )}
                  </div>
                  {logoUploadError && (
                    <p className="text-xs text-destructive">{t('Upload failed')}: {logoUploadError}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{t('PNG, JPG, SVG up to 2MB')}</p>
                    {brandingForm.logo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleRemoveLogo(); }}
                        className="text-destructive h-8"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {t('Remove')}
                      </Button>
                    )}
                  </div>
                </div>

                {/* App Name + Footer Text */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="appName">{t('App Name')}</Label>
                    <Input
                      id="appName"
                      placeholder="Trackbliss"
                      value={brandingForm.appName || ''}
                      onChange={(e) =>
                        setBrandingForm((prev) => ({ ...prev, appName: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('Displayed in the sidebar, breadcrumb, and browser tab')}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="poweredBy">{t('Footer Text')}</Label>
                    <Input
                      id="poweredBy"
                      placeholder="Powered by Trackbliss"
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
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Favicon */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Favicon')}</CardTitle>
              <CardDescription>
                {t('The small icon displayed in browser tabs')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Favicon Drag & Drop Zone */}
                <div className="space-y-3">
                  <input
                    ref={faviconInputRef}
                    type="file"
                    accept="image/png,image/svg+xml,image/x-icon,image/vnd.microsoft.icon"
                    onChange={handleFaviconUpload}
                    className="hidden"
                  />
                  <div
                    className={`relative h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
                      faviconDragOver
                        ? 'border-primary bg-primary/5'
                        : brandingForm.favicon
                        ? 'border-muted hover:border-primary/50'
                        : 'border-muted-foreground/25 hover:border-primary/50 bg-muted/30'
                    }`}
                    onClick={() => !isUploadingFavicon && faviconInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setFaviconDragOver(true); }}
                    onDragLeave={() => setFaviconDragOver(false)}
                    onDrop={handleFaviconDrop}
                  >
                    {isUploadingFavicon ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : brandingForm.favicon ? (
                      <>
                        <img
                          src={brandingForm.favicon}
                          alt="Favicon"
                          className="max-h-16 max-w-16 object-contain"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                          <Camera className="h-5 w-5 text-white" />
                          <span className="text-white text-xs font-medium">{t('Change favicon')}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <p className="text-xs text-muted-foreground text-center px-4">
                          {t('Drag & drop your favicon here or click to upload')}
                        </p>
                      </>
                    )}
                    {faviconUploadSuccess && (
                      <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center">
                        <div className="flex items-center gap-2 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                          <Check className="h-4 w-4" />
                          {t('Uploaded!')}
                        </div>
                      </div>
                    )}
                  </div>
                  {faviconUploadError && (
                    <p className="text-xs text-destructive">{t('Upload failed')}: {faviconUploadError}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{t('PNG, SVG, ICO up to 2MB')}</p>
                    {brandingForm.favicon && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFavicon(); }}
                        className="text-destructive h-8"
                      >
                        <Trash2 className="mr-1 h-3 w-3" />
                        {t('Remove')}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Browser Tab Mockup */}
                <div className="space-y-2">
                  <Label>{t('Browser Tab Preview')}</Label>
                  <div className="rounded-lg border bg-muted/30 overflow-hidden">
                    {/* Tab bar */}
                    <div className="bg-muted/60 border-b px-2 pt-2">
                      <div className="flex items-center">
                        <div className="flex items-center gap-1.5 bg-background rounded-t-lg border border-b-0 px-3 py-1.5 max-w-[200px]">
                          {brandingForm.favicon ? (
                            <img src={brandingForm.favicon} alt="" className="h-4 w-4 object-contain flex-shrink-0" />
                          ) : (
                            <Globe className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          )}
                          <span className="text-xs truncate">
                            {brandingForm.appName || 'Trackbliss'}
                          </span>
                          <X className="h-3 w-3 text-muted-foreground flex-shrink-0 ml-1" />
                        </div>
                      </div>
                    </div>
                    {/* URL bar */}
                    <div className="px-3 py-2 border-b bg-background">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                        </div>
                        <div className="flex-1 bg-muted/50 rounded px-2 py-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {window.location.origin}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Page content hint */}
                    <div className="p-4 flex items-center gap-2">
                      {brandingForm.favicon ? (
                        <img src={brandingForm.favicon} alt="" className="h-5 w-5 object-contain" />
                      ) : (
                        <div
                          className="h-5 w-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: brandingForm.primaryColor || '#3B82F6' }}
                        >
                          {(brandingForm.appName || 'D').charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-medium">{brandingForm.appName || 'Trackbliss'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Theme Color */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Theme Color')}</CardTitle>
              <CardDescription>
                {t('Pick a color or choose from presets')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>{t('Choose Color')}</Label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={brandingForm.primaryColor || '#3B82F6'}
                      onChange={(e) =>
                        setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="h-12 w-16 rounded border cursor-pointer"
                    />
                    <Input
                      value={brandingForm.primaryColor || '#3B82F6'}
                      onChange={(e) =>
                        setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="font-mono w-28 h-12"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setBrandingForm((prev) => ({ ...prev, primaryColor: '#3B82F6' }))
                  }
                  className="h-9"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('Reset to Default Color')}
                </Button>
              </div>

              {/* 12 Preset colors in 2 rows */}
              <div className="space-y-2">
                <Label>{t('Presets')}</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { color: '#3B82F6', name: 'Blue' },
                    { color: '#10B981', name: 'Emerald' },
                    { color: '#8B5CF6', name: 'Violet' },
                    { color: '#F59E0B', name: 'Amber' },
                    { color: '#F43F5E', name: 'Rose' },
                    { color: '#6366F1', name: 'Indigo' },
                    { color: '#06B6D4', name: 'Cyan' },
                    { color: '#84CC16', name: 'Lime' },
                    { color: '#D946EF', name: 'Fuchsia' },
                    { color: '#F97316', name: 'Orange' },
                    { color: '#64748B', name: 'Slate' },
                    { color: '#14B8A6', name: 'Teal' },
                  ].map(({ color, name }) => (
                    <button
                      key={color}
                      onClick={() =>
                        setBrandingForm((prev) => ({ ...prev, primaryColor: color }))
                      }
                      className={`relative h-9 w-9 min-w-[36px] rounded-lg transition-all ${
                        brandingForm.primaryColor === color
                          ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={name}
                    >
                      {brandingForm.primaryColor === color && (
                        <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Live Preview')}</CardTitle>
              <CardDescription>{t('This is how your branding appears across the app')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Sidebar Mockup */}
                <div className="rounded-lg border overflow-hidden bg-slate-900 text-white">
                  <div className="p-4 space-y-4">
                    {/* Logo + App Name */}
                    <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                      {brandingForm.logo ? (
                        <img src={brandingForm.logo} alt="Logo" className="h-8 w-8 rounded object-contain" />
                      ) : (
                        <div
                          className="h-8 w-8 rounded flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: brandingForm.primaryColor || '#3B82F6' }}
                        >
                          {(brandingForm.appName || 'D').charAt(0)}
                        </div>
                      )}
                      <span className="font-semibold text-sm truncate">
                        {brandingForm.appName || 'Trackbliss'}
                      </span>
                    </div>
                    {/* Nav Items */}
                    <nav className="space-y-1">
                      {[
                        { icon: LayoutDashboard, label: 'Dashboard', active: true },
                        { icon: Package, label: 'Products', active: false },
                        { icon: FileText, label: 'DPP', active: false },
                        { icon: Settings, label: 'Settings', active: false },
                      ].map(({ icon: Icon, label, active }) => (
                        <div
                          key={label}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm ${
                            active ? 'text-white font-medium' : 'text-white/60'
                          }`}
                          style={active ? { backgroundColor: brandingForm.primaryColor || '#3B82F6' } : undefined}
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          <span>{label}</span>
                        </div>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* Public Page Mockup */}
                <div className="rounded-lg border overflow-hidden bg-background">
                  {/* Mini header */}
                  <div className="border-b px-4 py-3 flex items-center gap-2">
                    {brandingForm.logo ? (
                      <img src={brandingForm.logo} alt="Logo" className="h-6 w-6 rounded object-contain" />
                    ) : (
                      <div
                        className="h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: brandingForm.primaryColor || '#3B82F6' }}
                      >
                        {(brandingForm.appName || 'D').charAt(0)}
                      </div>
                    )}
                    <span className="font-medium text-sm">{brandingForm.appName || 'Trackbliss'}</span>
                  </div>
                  {/* Content */}
                  <div className="p-4 space-y-3">
                    <Badge
                      className="text-white"
                      style={{ backgroundColor: brandingForm.primaryColor || '#3B82F6' }}
                    >
                      Digital Product Passport
                    </Badge>
                    <div className="space-y-2">
                      <div className="h-2 bg-muted rounded w-3/4" />
                      <div className="h-2 bg-muted rounded w-1/2" />
                    </div>
                    {/* UI Elements */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button
                        size="sm"
                        className="h-8 text-white"
                        style={{ backgroundColor: brandingForm.primaryColor || '#3B82F6' }}
                      >
                        {t('Primary Color')}
                      </Button>
                      <Button variant="outline" size="sm" className="h-8">
                        {t('Secondary', { ns: 'settings' })}
                      </Button>
                    </div>
                    <a
                      href="#"
                      className="text-sm underline"
                      style={{ color: brandingForm.primaryColor || '#3B82F6' }}
                      onClick={(e) => e.preventDefault()}
                    >
                      {t('Link example')}
                    </a>
                  </div>
                  {/* Footer */}
                  <div className="border-t px-4 py-2">
                    <p className="text-xs text-muted-foreground">
                      {brandingForm.poweredByText || 'Powered by Trackbliss'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Test Public Pages */}
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

        {/* DPP Design */}
        <TabsContent value="dpp-design" className="space-y-6">
          <DPPDesignTab />
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

          {/* Connect Custom Domain Wizard */}
          {domainForm.resolver === 'custom' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t('CNAME Setup Wizard')}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t('Step-by-step guide to connect your domain via CNAME record')}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setDomainWizardOpen(true)}>
                    <Globe className="mr-2 h-4 w-4" />
                    {t('Connect Custom Domain')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <CustomDomainWizard
            open={domainWizardOpen}
            onOpenChange={setDomainWizardOpen}
            currentDomain={domainForm.customDomain}
            onDomainVerified={(domain) => {
              setDomainForm(prev => ({ ...prev, customDomain: domain }));
              setDomainWizardOpen(false);
            }}
          />

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
          <UsersTab />
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
