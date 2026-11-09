import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TenantWhitelabelSelfService } from '@/components/settings/TenantWhitelabelSelfService';
import { blurIn, useReducedMotion } from '@/lib/motion';
import { UsersTab } from '@/components/settings/UsersTab';
import { DeleteAccountCard } from '@/components/account/DeleteAccountCard';
import {
  Building2,
  Palette,
  Users,
  Key,
  Save,
  Upload,
  Trash2,
  Eye,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSections, FormSection, FormGrid, FormField, FormActions, FormSectionNav, FormToggleRow, ChoiceCards } from '@/components/ui/form-layout';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { CustomDomainWizard } from '@/components/settings/CustomDomainWizard';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getPublicBaseUrl } from '@/lib/platform';

export function SettingsPage({ tab = 'company' }: { tab?: string }) {
  const { t } = useTranslation('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSection, setBrandingSection] = useState('identity');
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
    slug: '',
    address: '',
    country: '',
    eori: '',
    vat: '',
  });
  const [slugError, setSlugError] = useState<string | null>(null);

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
          slug: tenantData.slug || '',
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
    // Validate slug
    const cleanSlug = formData.slug.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanSlug) {
      setSlugError(t('Slug cannot be empty'));
      setIsSaving(false);
      return;
    }
    setSlugError(null);

    const result = await updateCurrentTenant({
      name: formData.name,
      slug: cleanSlug,
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
        setFormData(prev => ({ ...prev, slug: updatedTenant.slug }));
      }
    } else if (result.error?.includes('duplicate') || result.error?.includes('unique')) {
      setSlugError(t('This slug is already taken'));
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
      return `${getPublicBaseUrl()}/p/GTIN/SERIAL`;
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
    return `${getPublicBaseUrl()}/p/GTIN/SERIAL`;
  };

  const prefersReduced = useReducedMotion();
  const MotionDiv = prefersReduced ? 'div' : motion.div;

  // Get a sample product for preview links
  const sampleProduct = products.length > 0 ? products[0] : null;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <ShimmerSkeleton className="h-8 w-32" />
          <ShimmerSkeleton className="h-4 w-64" />
        </div>
        <ShimmerSkeleton className="h-10 w-full max-w-lg rounded-lg" />
        <Card>
          <CardContent className="pt-6 space-y-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="grid gap-4 md:grid-cols-2">
                <ShimmerSkeleton className="h-10 rounded" />
                <ShimmerSkeleton className="h-10 rounded" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionDiv
        {...(!prefersReduced && { variants: blurIn, initial: 'initial', animate: 'animate' })}
      >
        <h1 className="text-2xl font-bold text-foreground">{t('Settings')}</h1>
        <p className="text-muted-foreground">
          {t('Manage your company profile and system settings')}
        </p>
      </MotionDiv>

      {/* Tabs */}
      <Tabs defaultValue={tab}>
        <ScrollableTabs>
          <TabsList className="flex w-full">
            <TabsTrigger value="company" className="flex items-center gap-2 flex-shrink-0">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('Company Profile')}</span>
            </TabsTrigger>
            <TabsTrigger value="branding" className="flex items-center gap-2 flex-shrink-0">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">{t('App Branding')}</span>
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
        </ScrollableTabs>

        {/* Company Profile */}
        <TabsContent value="company" className="space-y-6 animate-in fade-in-0 slide-in-from-right-2 duration-300">
          <FormSections>
            <FormSection
              title={t('Company Data')}
              description={t('This information will be displayed in your DPPs')}
              icon={Building2}
            >
              <FormGrid cols={2}>
                <FormField label={t('Company Name')} htmlFor="company-name" required>
                  <Input
                    id="company-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Your Company Inc."
                    autoComplete="organization"
                  />
                </FormField>
                <FormField
                  label={t('Portal Slug')}
                  htmlFor="company-slug"
                  error={slugError}
                  hint={
                    <>
                      {t('Used in portal URLs')}: /returns/portal/<span className="font-medium text-foreground">{formData.slug || '...'}</span>
                    </>
                  }
                >
                  <Input
                    id="company-slug"
                    value={formData.slug}
                    onChange={(e) => {
                      const v = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                      setFormData({ ...formData, slug: v });
                      setSlugError(null);
                    }}
                    placeholder="my_company"
                    className="font-mono"
                    autoCapitalize="none"
                    spellCheck={false}
                  />
                </FormField>
                <FormField label={t('Address')} htmlFor="company-address" span="full">
                  <Input
                    id="company-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street, New York, NY 10001"
                    autoComplete="street-address"
                  />
                </FormField>
                <FormField label={t('Country')} htmlFor="company-country">
                  <Input
                    id="company-country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="United States"
                    autoComplete="country-name"
                  />
                </FormField>
                <div className="min-w-0">
                  <p className="mb-2 text-sm font-medium leading-5">{t('Plan')}</p>
                  <div className="flex h-9 items-center pointer-coarse:h-11">
                    <Badge
                      className={
                        tenant?.plan === 'enterprise'
                          ? 'bg-primary'
                          : tenant?.plan === 'pro'
                          ? 'bg-success'
                          : 'bg-muted text-muted-foreground'
                      }
                    >
                      {tenant?.plan === 'enterprise'
                        ? 'Enterprise'
                        : tenant?.plan === 'pro'
                        ? 'Pro'
                        : 'Free'}
                    </Badge>
                  </div>
                </div>
              </FormGrid>
            </FormSection>

            <FormSection
              title={t('Legal & customs IDs')}
              description={t('Used on customs documents and the customs view of your DPPs.')}
            >
              <FormGrid cols={2}>
                <FormField label={t('EORI Number')} htmlFor="company-eori" optional>
                  <Input
                    id="company-eori"
                    value={formData.eori}
                    onChange={(e) => setFormData({ ...formData, eori: e.target.value })}
                    placeholder="DE123456789012345"
                    className="font-mono"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </FormField>
                <FormField label={t('VAT ID')} htmlFor="company-vat" optional>
                  <Input
                    id="company-vat"
                    value={formData.vat}
                    onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
                    placeholder="DE123456789"
                    className="font-mono"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection
              title={t('Responsible Person (EU Regulation)')}
              description={t('Contact for market surveillance authorities.')}
            >
              <FormGrid cols={2}>
                <FormField label={t('Name')} htmlFor="responsible-name" span="full">
                  <Input id="responsible-name" placeholder="Dr. Jane Smith" autoComplete="name" />
                </FormField>
                <FormField label={t('Email')} htmlFor="responsible-email">
                  <Input id="responsible-email" type="email" inputMode="email" placeholder="compliance@your-company.com" autoComplete="email" />
                </FormField>
                <FormField label={t('Phone')} htmlFor="responsible-phone">
                  <Input id="responsible-phone" type="tel" inputMode="tel" placeholder="+49 30 123456789" autoComplete="tel" />
                </FormField>
              </FormGrid>
            </FormSection>

            <FormSection
              title={t('Product Languages')}
              description={t('Configure which languages are available for product content')}
              icon={Globe}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(tenant?.settings?.productLanguages || ['en', 'de']).map((lang) => {
                    const langInfo = LANGUAGE_OPTIONS[lang];
                    return (
                      <Badge key={lang} variant="secondary" className="h-9 gap-1.5 pl-3 pr-1 pointer-coarse:h-11 pointer-coarse:pr-0">
                        <span className="uppercase text-xs font-semibold">{lang}</span>
                        {langInfo?.label || lang}
                        <button
                          type="button"
                          aria-label={t('Remove', { ns: 'common' })}
                          className="ml-0.5 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors duration-150 ease-out hover:bg-background hover:text-destructive pointer-coarse:size-11"
                          onClick={async () => {
                            const current = tenant?.settings?.productLanguages || ['en', 'de'];
                            if (current.length <= 1) return;
                            const updated = current.filter((l: string) => l !== lang);
                            await updateTenantSettings({ productLanguages: updated });
                            const refreshed = await getCurrentTenant();
                            if (refreshed) setTenant(refreshed);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
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
                  <SelectTrigger className="w-full sm:w-60" aria-label={t('Add Language')}>
                    <SelectValue placeholder={t('Add Language')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LANGUAGE_OPTIONS)
                      .filter(([code]) => !(tenant?.settings?.productLanguages || ['en', 'de']).includes(code))
                      .map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          <span className="uppercase text-xs font-semibold mr-2">{code}</span>
                          {info.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </FormSection>
          </FormSections>

          <FormActions sticky="page">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t('Save', { ns: 'common' })}
            </Button>
          </FormActions>

          {/* Danger Zone — in-app account deletion (App Store guideline 5.1.1(v)) */}
          <DeleteAccountCard redirectTo="/login" />
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6 animate-in fade-in-0 slide-in-from-right-2 duration-300">
          <FormSectionNav
            label={t('App Branding')}
            value={brandingSection}
            onValueChange={setBrandingSection}
            sections={[
              { id: 'identity', label: t('Brand Identity'), icon: Palette },
              { id: 'favicon', label: t('Favicon'), icon: Globe },
              { id: 'color', label: t('Theme Color'), icon: Palette },
              { id: 'preview', label: t('Live Preview'), icon: Eye },
              { id: 'whitelabel', label: t('Whitelabel'), icon: Building2 },
            ]}
          >
          {brandingSection === 'whitelabel' && (
            /* Self-Service Whitelabel (subdomain, custom domain info, brand, SMTP) — saves on its own */
            <TenantWhitelabelSelfService />
          )}

          {brandingSection !== 'whitelabel' && (
          <FormSections>
          {/* Section 1: Brand Identity */}
          {brandingSection === 'identity' && (
          <FormSection
            layout="stacked"
            title={t('Brand Identity')}
            description={t('Customize the appearance of your DPP application')}
            icon={Palette}
          >
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
                    className={`relative h-52 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-[background-color,border-color] overflow-hidden ${
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
                      <div className="absolute inset-0 bg-success/10 flex items-center justify-center">
                        <div className="flex items-center gap-2 bg-success text-success-foreground px-3 py-1.5 rounded-full text-sm font-medium">
                          <Check className="h-4 w-4" />
                          {t('Uploaded!')}
                        </div>
                      </div>
                    )}
                  </div>
                  {logoUploadError && (
                    <p className="text-xs text-destructive">{t('Upload failed')}: {logoUploadError}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
          </FormSection>
          )}

          {/* Section 2: Favicon */}
          {brandingSection === 'favicon' && (
          <FormSection
            layout="stacked"
            title={t('Favicon')}
            description={t('The small icon displayed in browser tabs')}
          >
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
                    className={`relative h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-[background-color,border-color] overflow-hidden ${
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
                      <div className="absolute inset-0 bg-success/10 flex items-center justify-center">
                        <div className="flex items-center gap-2 bg-success text-success-foreground px-3 py-1.5 rounded-full text-sm font-medium">
                          <Check className="h-4 w-4" />
                          {t('Uploaded!')}
                        </div>
                      </div>
                    )}
                  </div>
                  {faviconUploadError && (
                    <p className="text-xs text-destructive">{t('Upload failed')}: {faviconUploadError}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                            <img src={brandingForm.favicon} alt="" className="h-4 w-4 object-contain flex-shrink-0" loading="lazy" />
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
                            {getPublicBaseUrl()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Page content hint */}
                    <div className="p-4 flex items-center gap-2">
                      {brandingForm.favicon ? (
                        <img src={brandingForm.favicon} alt="" className="h-5 w-5 object-contain" loading="lazy" />
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
          </FormSection>
          )}

          {/* Section 3: Theme Color */}
          {brandingSection === 'color' && (
          <FormSection
            layout="stacked"
            title={t('Theme Color')}
            description={t('Pick a color or choose from presets')}
          >
            <div className="space-y-6">
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
                      aria-label={t('Choose Color')}
                      className="h-11 w-14 rounded-md border bg-background p-1 cursor-pointer"
                    />
                    <Input
                      value={brandingForm.primaryColor || '#3B82F6'}
                      onChange={(e) =>
                        setBrandingForm((prev) => ({ ...prev, primaryColor: e.target.value }))
                      }
                      className="font-mono w-28 h-11"
                      aria-label={t('Choose Color')}
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
                  className="h-11"
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
                      type="button"
                      aria-label={name}
                      aria-pressed={brandingForm.primaryColor === color}
                      className={`relative h-11 w-11 rounded-lg transition-[scale,box-shadow] duration-150 ease-out ${
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
            </div>
          </FormSection>
          )}

          {/* Section 4: Live Preview (+ public page test links) */}
          {brandingSection === 'preview' && (
          <>
          <FormSection
            title={t('Live Preview')}
            description={t('This is how your branding appears across the app')}
            layout="stacked"
          >
              <div className="grid gap-4 md:grid-cols-2">
                {/* Sidebar Mockup */}
                <div className="rounded-lg border overflow-hidden bg-slate-900 text-white">
                  <div className="p-4 space-y-4">
                    {/* Logo + App Name */}
                    <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                      {brandingForm.logo ? (
                        <img src={brandingForm.logo} alt="Logo" className="h-8 w-8 rounded object-contain" loading="lazy" />
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
                      <img src={brandingForm.logo} alt="Logo" className="h-6 w-6 rounded object-contain" loading="lazy" />
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
          </FormSection>

          {/* Section 5: Test Public Pages */}
          <FormSection
            layout="stacked"
            title={t('Test Public Pages')}
            description={t('See how your branding looks for end consumers')}
            icon={Eye}
          >
            <div className="space-y-4">
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
                  <p className="text-sm">{t('Create a product first to test the public pages.')}</p>
                </div>
              )}
            </div>
          </FormSection>
          </>
          )}
          </FormSections>
          )}
          </FormSectionNav>

          {brandingSection !== 'whitelabel' && (
          <FormActions sticky="page">
            <Button onClick={handleSaveBranding} disabled={isSavingBranding}>
              {isSavingBranding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : brandingSaved ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {brandingSaved ? t('Saved!') : t('Save Branding')}
            </Button>
          </FormActions>
          )}
        </TabsContent>

        {/* Domain */}
        <TabsContent value="domain" className="space-y-6 animate-in fade-in-0 slide-in-from-right-2 duration-300">
          <FormSections>
            <FormSection
              title={t('URL Resolver')}
              description={t('Choose how QR code URLs for your products should be resolved')}
              icon={Globe}
            >
              <div className="space-y-5">
                <ChoiceCards
                  aria-label={t('URL Resolver')}
                  name="resolver-settings"
                  columns={1}
                  value={domainForm.resolver}
                  onValueChange={(v) =>
                    setDomainForm({ ...domainForm, resolver: v, useCustomDomain: v === 'custom' })
                  }
                  options={[
                    {
                      value: 'gs1' as const,
                      label: (
                        <span className="flex flex-wrap items-center gap-2">
                          {t('GS1 Digital Link Resolver')}
                          <Badge variant="secondary">{t('Recommended')}</Badge>
                        </span>
                      ),
                      description: (
                        <>
                          {t('Uses the official GS1 Resolver (id.gs1.org)')}
                          <span className="mt-1 block font-mono text-xs break-all">https://id.gs1.org/01/GTIN/21/SERIAL</span>
                        </>
                      ),
                    },
                    {
                      value: 'local' as const,
                      label: (
                        <span className="flex flex-wrap items-center gap-2">
                          {t('Local Product Pages')}
                          <Badge variant="secondary">{t('Built-in')}</Badge>
                        </span>
                      ),
                      description: (
                        <>
                          {t('Uses the built-in public DPP pages of this application')}
                          <span className="mt-1 block font-mono text-xs break-all">{getPublicBaseUrl()}/p/GTIN/SERIAL</span>
                        </>
                      ),
                    },
                    {
                      value: 'custom' as const,
                      label: (
                        <span className="flex flex-wrap items-center gap-2">
                          {t('Custom Domain')}
                          <Badge variant="outline">{t('Custom')}</Badge>
                        </span>
                      ),
                      description: t('Use your own domain for DPP URLs'),
                    },
                  ]}
                />

                <div className="flex gap-3 rounded-lg border bg-muted/40 p-3 sm:p-4">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{t('Why use a custom domain?')}</p>
                    <p className="mt-1 text-xs text-pretty text-muted-foreground">
                      {t('With a custom domain you have full control over your DPP URLs. You can set up your own resolver that redirects QR codes to your product pages.')}
                    </p>
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Custom Domain Settings */}
            {domainForm.resolver === 'custom' && (
              <FormSection
                title={t('Domain Configuration')}
                description={t('Configure your own domain for DPP URLs')}
              >
                <div className="space-y-5">
                  <FormGrid cols={2}>
                    <FormField
                      label={t('Your Domain')}
                      htmlFor="customDomain"
                      required
                      error={domainError}
                      hint={t('Enter the domain only, without https://')}
                    >
                      <Input
                        id="customDomain"
                        placeholder="e.g. dpp.your-company.com"
                        value={domainForm.customDomain}
                        onChange={(e) => handleDomainChange(e.target.value)}
                        inputMode="url"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                    </FormField>
                    <FormField
                      label={t('Path Prefix')}
                      htmlFor="pathPrefix"
                      optional
                      error={pathPrefixError}
                      hint={t('Inserted between the domain and product path')}
                    >
                      <Input
                        id="pathPrefix"
                        placeholder="e.g. products or passport"
                        value={domainForm.pathPrefix}
                        onChange={(e) => handlePathPrefixChange(e.target.value)}
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                    </FormField>
                  </FormGrid>

                  <FormToggleRow htmlFor="useHttps" label={t('Use HTTPS (recommended)')} controlPosition="start">
                    <Checkbox
                      id="useHttps"
                      checked={domainForm.useHTTPS}
                      onCheckedChange={(checked: boolean) =>
                        setDomainForm({ ...domainForm, useHTTPS: checked })
                      }
                    />
                  </FormToggleRow>

                  <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <p className="text-sm text-muted-foreground text-pretty">
                      {t('Step-by-step guide to connect your domain via CNAME record')}
                    </p>
                    <Button variant="outline" className="shrink-0" onClick={() => setDomainWizardOpen(true)}>
                      <Globe className="mr-2 h-4 w-4" />
                      {t('CNAME Setup Wizard')}
                    </Button>
                  </div>
                </div>
              </FormSection>
            )}

            {/* Current Configuration */}
            <FormSection title={t('Current Configuration')} description={t('URL Preview')}>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t('Resolver')}</dt>
                  <dd className="font-medium text-right">
                    {domainForm.resolver === 'gs1' && t('GS1 Digital Link')}
                    {domainForm.resolver === 'local' && t('Local Product Pages')}
                    {domainForm.resolver === 'custom' && t('Custom Domain')}
                  </dd>
                </div>
                {domainForm.resolver === 'custom' && domainForm.customDomain && (
                  <>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{t('Domain')}</dt>
                      <dd className="font-mono text-right break-all">{domainForm.customDomain}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{t('Protocol')}</dt>
                      <dd>{domainForm.useHTTPS ? 'HTTPS' : 'HTTP'}</dd>
                    </div>
                    {domainForm.pathPrefix && (
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">{t('Path Prefix')}</dt>
                        <dd className="font-mono">/{domainForm.pathPrefix}</dd>
                      </div>
                    )}
                  </>
                )}
                <Separator className="my-2" />
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">{t('Example URL')}</dt>
                  <dd className="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs break-all">{getPreviewUrl()}</dd>
                </div>
              </dl>
            </FormSection>
          </FormSections>

          <CustomDomainWizard
            open={domainWizardOpen}
            onOpenChange={setDomainWizardOpen}
            currentDomain={domainForm.customDomain}
            onDomainVerified={(domain) => {
              setDomainForm(prev => ({ ...prev, customDomain: domain }));
              setDomainWizardOpen(false);
            }}
          />

          <FormActions sticky="page">
            <Button
              onClick={handleSaveDomain}
              disabled={isSavingDomain || (domainForm.resolver === 'custom' && !!domainError)}
            >
              {isSavingDomain ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : domainSaved ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {domainSaved ? t('Saved!') : t('Save Domain Settings')}
            </Button>
          </FormActions>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="space-y-6 animate-in fade-in-0 slide-in-from-right-2 duration-300">
          <UsersTab />
        </TabsContent>

        {/* Never present fabricated API credentials or inactive actions as live features. */}
        <TabsContent value="api" className="space-y-6">
          <FormSection
            title={t('API-Keys')}
            description={t('API access is not available in this version.')}
            icon={Key}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">{t('Manage your connected shops in the Commerce Hub.')}</p>
              <Button variant="outline" asChild>
                <Link to="/commerce">{t('Open Commerce Hub')}</Link>
              </Button>
            </div>
          </FormSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
