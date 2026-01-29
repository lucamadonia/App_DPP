import { useState, useEffect, useRef } from 'react';
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
      alert(`Logo-Upload fehlgeschlagen: ${result.error || 'Unbekannter Fehler'}`);
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
      alert(`Favicon-Upload fehlgeschlagen: ${result.error || 'Unbekannter Fehler'}`);
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
        setDomainError(domainValidation.errorMessage || 'Ungültige Domain');
        return;
      }

      if (domainForm.pathPrefix) {
        const prefixValidation = validatePathPrefix(domainForm.pathPrefix);
        if (!prefixValidation.isValid) {
          setPathPrefixError(prefixValidation.errorMessage || 'Ungültiger Pfad');
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
        <h1 className="text-2xl font-bold text-foreground">Einstellungen</h1>
        <p className="text-muted-foreground">
          Verwalten Sie Ihr Firmenprofil und Systemeinstellungen
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={tab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Firmenprofil
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="domain" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Domain
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Benutzer
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API-Keys
          </TabsTrigger>
        </TabsList>

        {/* Firmenprofil */}
        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Unternehmensdaten</CardTitle>
              <CardDescription>
                Diese Informationen werden in Ihren DPPs angezeigt
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Firmenname *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ihre Firma GmbH"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">EORI-Nummer</label>
                  <Input
                    value={formData.eori}
                    onChange={(e) => setFormData({ ...formData, eori: e.target.value })}
                    placeholder="DE123456789012345"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Adresse</label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Musterstraße 123, 10115 Berlin"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Land</label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Deutschland"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">USt-IdNr.</label>
                  <Input
                    value={formData.vat}
                    onChange={(e) => setFormData({ ...formData, vat: e.target.value })}
                    placeholder="DE123456789"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan</label>
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
                      {tenant?.plan === 'free' && '(Upgrade für mehr Funktionen)'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-medium mb-4">Verantwortliche Person (EU-Verordnung)</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input placeholder="Dr. Anna Musterfrau" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">E-Mail</label>
                    <Input placeholder="compliance@ihre-firma.de" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefon</label>
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
                  Speichern
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>App-Name & Logo</CardTitle>
              <CardDescription>
                Passen Sie das Erscheinungsbild Ihrer DPP-Anwendung an
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* App-Name */}
                <div className="space-y-2">
                  <Label htmlFor="appName">App-Name</Label>
                  <Input
                    id="appName"
                    placeholder="DPP Manager"
                    value={brandingForm.appName || ''}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, appName: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Wird in der Sidebar, im Breadcrumb und im Browser-Tab angezeigt
                  </p>
                </div>

                {/* Powered By Text */}
                <div className="space-y-2">
                  <Label htmlFor="poweredBy">Footer-Text</Label>
                  <Input
                    id="poweredBy"
                    placeholder="Powered by DPP Manager"
                    value={brandingForm.poweredByText || ''}
                    onChange={(e) =>
                      setBrandingForm((prev) => ({ ...prev, poweredByText: e.target.value }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Wird im Footer der öffentlichen Seiten angezeigt
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                {/* Logo */}
                <div className="space-y-4">
                  <Label>Firmenlogo</Label>
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
                        Hochladen
                      </Button>
                      {brandingForm.logo && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveLogo}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Entfernen
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">PNG, JPG, SVG bis 2MB</p>
                    </div>
                  </div>
                </div>

                {/* Favicon */}
                <div className="space-y-4">
                  <Label>Favicon</Label>
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
                        Hochladen
                      </Button>
                      {brandingForm.favicon && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveFavicon}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Entfernen
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">PNG, SVG, ICO bis 2MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Primärfarbe</CardTitle>
              <CardDescription>
                Diese Farbe wird als Akzentfarbe in der gesamten Anwendung verwendet
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Farbe auswählen</Label>
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
                  <Label>Vorlagen</Label>
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
                Standardfarbe wiederherstellen
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vorschau</CardTitle>
              <CardDescription>So erscheint Ihr Branding in der Anwendung</CardDescription>
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
                    Primärfarbe
                  </Badge>
                  <Badge variant="outline">Sekundär</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {brandingForm.poweredByText || 'Powered by DPP Manager'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview-Links für öffentliche Seiten */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Öffentliche Seiten testen
              </CardTitle>
              <CardDescription>
                Sehen Sie wie Ihr Branding für Endverbraucher aussieht
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {sampleProduct ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    Öffnen Sie eine Beispiel-Produktseite, um Ihr Branding in Aktion zu sehen:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" asChild>
                      <a
                        href={`/p/${sampleProduct.gtin}/${sampleProduct.serial}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Verbraucheransicht ({sampleProduct.name})
                      </a>
                    </Button>
                    <Button variant="outline" asChild>
                      <a
                        href={`/p/${sampleProduct.gtin}/${sampleProduct.serial}?view=zoll`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Zollansicht
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Das Produkt "{sampleProduct.name}" wird als Beispiel verwendet.
                  </p>
                </>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <Info className="mx-auto h-8 w-8 opacity-30 mb-2" />
                  <p>Erstellen Sie zuerst ein Produkt, um die öffentlichen Seiten zu testen.</p>
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
              {brandingSaved ? 'Gespeichert!' : 'Branding speichern'}
            </Button>
          </div>
        </TabsContent>

        {/* Domain */}
        <TabsContent value="domain" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>URL-Resolver</CardTitle>
              <CardDescription>
                Wählen Sie wie QR-Code-URLs für Ihre Produkte aufgelöst werden sollen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <Info className="h-4 w-4" />
                  Warum eine eigene Domain verwenden?
                </h4>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Mit einer eigenen Domain haben Sie volle Kontrolle über Ihre DPP-URLs.
                  Sie können einen eigenen Resolver einrichten, der die QR-Codes zu Ihren Produktseiten weiterleitet.
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
                      GS1 Digital Link Resolver
                      <Badge variant="secondary">Empfohlen</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Nutzt den offiziellen GS1 Resolver (id.gs1.org)
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
                      Lokale Produktseiten
                      <Badge variant="default">Integriert</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Nutzt die integrierten öffentlichen DPP-Seiten dieser Anwendung
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
                      Eigene Domain
                      <Badge variant="outline">Custom</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Verwenden Sie Ihre eigene Domain für DPP-URLs
                    </p>
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Custom Domain Einstellungen */}
          {domainForm.resolver === 'custom' && (
            <Card>
              <CardHeader>
                <CardTitle>Domain-Konfiguration</CardTitle>
                <CardDescription>
                  Konfigurieren Sie Ihre eigene Domain für DPP-URLs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Domain Input */}
                  <div className="space-y-2">
                    <Label htmlFor="customDomain">Ihre Domain *</Label>
                    <Input
                      id="customDomain"
                      placeholder="z.B. dpp.ihre-firma.de"
                      value={domainForm.customDomain}
                      onChange={(e) => handleDomainChange(e.target.value)}
                      className={domainError ? 'border-destructive' : ''}
                    />
                    {domainError ? (
                      <p className="text-xs text-destructive">{domainError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nur die Domain ohne https:// eingeben
                      </p>
                    )}
                  </div>

                  {/* Path Prefix */}
                  <div className="space-y-2">
                    <Label htmlFor="pathPrefix">Pfad-Präfix (optional)</Label>
                    <Input
                      id="pathPrefix"
                      placeholder="z.B. products oder passport"
                      value={domainForm.pathPrefix}
                      onChange={(e) => handlePathPrefixChange(e.target.value)}
                      className={pathPrefixError ? 'border-destructive' : ''}
                    />
                    {pathPrefixError ? (
                      <p className="text-xs text-destructive">{pathPrefixError}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Wird zwischen Domain und Produkt-Pfad eingefügt
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
                  <Label htmlFor="useHttps">HTTPS verwenden (empfohlen)</Label>
                </div>

                {/* URL Preview */}
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <Label className="text-sm font-medium">URL-Vorschau</Label>
                  <p className="font-mono text-sm break-all mt-2 text-muted-foreground">
                    {getPreviewUrl()}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Aktuelle Einstellung */}
          <Card>
            <CardHeader>
              <CardTitle>Aktuelle Konfiguration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/30 rounded-lg border">
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Resolver:</span>
                    <span className="font-medium">
                      {domainForm.resolver === 'gs1' && 'GS1 Digital Link'}
                      {domainForm.resolver === 'local' && 'Lokale Produktseiten'}
                      {domainForm.resolver === 'custom' && 'Eigene Domain'}
                    </span>
                  </div>
                  {domainForm.resolver === 'custom' && domainForm.customDomain && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Domain:</span>
                        <span className="font-mono">{domainForm.customDomain}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Protokoll:</span>
                        <span>{domainForm.useHTTPS ? 'HTTPS' : 'HTTP'}</span>
                      </div>
                      {domainForm.pathPrefix && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pfad-Präfix:</span>
                          <span className="font-mono">/{domainForm.pathPrefix}</span>
                        </div>
                      )}
                    </>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Beispiel-URL:</span>
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
              {domainSaved ? 'Gespeichert!' : 'Domain-Einstellungen speichern'}
            </Button>
          </div>
        </TabsContent>

        {/* Benutzer */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Benutzer & Rollen</CardTitle>
                  <CardDescription>
                    Verwalten Sie Zugriffsrechte für Ihr Team
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Benutzer einladen
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>Keine weiteren Benutzer in diesem Mandanten</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>E-Mail</TableHead>
                      <TableHead>Rolle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name || 'Unbekannt'}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            {user.role === 'admin' ? 'Admin' : user.role === 'editor' ? 'Editor' : 'Viewer'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-success">
                            Aktiv
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
              <CardTitle>Rollen</CardTitle>
              <CardDescription>Definierte Zugriffsrechte</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium">Admin</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vollzugriff auf alle Funktionen inkl. Einstellungen und Benutzerverwaltung
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium">Editor</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Kann Produkte und DPPs erstellen, bearbeiten und veröffentlichen
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium">Viewer</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nur Lesezugriff auf Produkte und Berichte
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
                  <CardTitle>API-Keys</CardTitle>
                  <CardDescription>
                    Verwalten Sie API-Schlüssel für Integrationen (ERP, Shop-Systeme)
                  </CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Neuer API-Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>API-Key</TableHead>
                    <TableHead>Erstellt</TableHead>
                    <TableHead>Zuletzt verwendet</TableHead>
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
                        {new Date(key.created).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(key.lastUsed).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Löschen
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
              <CardTitle>API-Dokumentation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-muted font-mono text-sm">
                <p className="text-muted-foreground"># Basis-URL</p>
                <p>https://api.dpp-manager.de/v1</p>
                <p className="text-muted-foreground mt-4"># Authentifizierung</p>
                <p>Authorization: Bearer {'<API_KEY>'}</p>
              </div>
              <Button variant="outline" className="mt-4">
                Vollständige Dokumentation
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
