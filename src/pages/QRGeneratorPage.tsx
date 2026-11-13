import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  renderQrPng,
  renderQrSvg,
  type QrErrorCorrection,
  type QrLogoOptions,
  type QrTextOptions,
} from '@/lib/qr-generator';
import { saveOrShare } from '@/lib/download-file';
import { isNative } from '@/lib/platform';
import { scaleIn, useReducedMotion } from '@/lib/motion';
import {
  Download,
  Copy,
  Check,
  Settings,
  Palette,
  Link2,
  Globe,
  Save,
  RefreshCw,
  FileText,
  Trash2,
  ExternalLink,
  Info,
  CheckCircle2,
  Layers,
  Eye,
  Loader2,
  Package,
  LayoutTemplate,
  Sparkles,
  BookOpen,
  Smartphone,
  Upload,
  Trash2 as TrashIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { FormSections, FormSection, FormGrid, FormField, InputAffix, ChoiceCards, FormToggleRow, FormActions } from '@/components/ui/form-layout';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getProducts, type ProductListItem } from '@/services/supabase';
import { getBatches } from '@/services/supabase/batches';
import { ErrorState } from '@/components/ui/state-feedback';
import type { BatchListItem } from '@/types/product';
import { useBranding } from '@/contexts/BrandingContext';
import { validateDomain, validatePathPrefix, normalizeDomain } from '@/lib/domain-utils';
import { getPublicBaseUrl } from '@/lib/platform';
import { PageContainer } from '@/components/layout/page-container';

// QR Code Settings Interface (local state only for visual settings)
interface QRSettings {
  size: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  format: 'standard' | 'rounded' | 'dots';
  includeText: boolean;
  customText: string;
  textPosition: 'top' | 'bottom';
  logoEnabled: boolean;
  logoUrl: string;
  logoSize: number;
  foregroundColor: string;
  backgroundColor: string;
}

const defaultQRSettings: QRSettings = {
  size: 256,
  errorCorrection: 'M',
  margin: 2,
  format: 'standard',
  includeText: false,
  customText: '',
  textPosition: 'bottom',
  logoEnabled: false,
  logoUrl: '',
  logoSize: 20,
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
};

/**
 * Adapter over the shared renderer.
 *
 * Kept with the original argument shape so the six call sites below did not
 * have to change when the composition moved to src/lib/qr-generator.ts.
 */
function generateCompositeQR(
  data: string,
  qrOpts: {
    width: number;
    margin: number;
    errorCorrectionLevel: QrErrorCorrection;
    color: { dark: string; light: string };
  },
  logo: QrLogoOptions,
  text: QrTextOptions
): Promise<string> {
  return renderQrPng({ data, ...qrOpts }, logo, text);
}

export function QRGeneratorPage() {
  const { t } = useTranslation('dpp');
  const prefersReduced = useReducedMotion();
  const MotionDiv = prefersReduced ? 'div' as const : motion.div;
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchListItem | null>(null);
  const [batchesLoading, setBatchesLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrCustomsDataUrl, setQrCustomsDataUrl] = useState('');
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [domainSaved, setDomainSaved] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [pathPrefixError, setPathPrefixError] = useState<string | null>(null);

  // Get branding context for QR code domain settings
  const { branding, qrCodeSettings, updateQRCodeSettings } = useBranding();

  // Local domain settings state (synced with context)
  const [localDomainSettings, setLocalDomainSettings] = useState({
    customDomain: qrCodeSettings.customDomain || '',
    useCustomDomain: qrCodeSettings.resolver === 'custom',
    useHTTPS: qrCodeSettings.useHttps,
    pathPrefix: qrCodeSettings.pathPrefix,
    resolver: qrCodeSettings.resolver as 'custom' | 'gs1' | 'local',
    foregroundColor: qrCodeSettings.foregroundColor,
    backgroundColor: qrCodeSettings.backgroundColor,
    dppTemplate: qrCodeSettings.dppTemplate as 'modern' | 'classic' | 'compact',
  });

  // QR visual settings (local state)
  const [qrSettings, setQRSettings] = useState<QRSettings>(() => {
    const saved = localStorage.getItem('dpp-qr-settings');
    return saved ? JSON.parse(saved) : defaultQRSettings;
  });
  const [activeTab, setActiveTab] = useState('preview');
  const logoUploadRef = useRef<HTMLInputElement>(null);

  // Sync local domain settings with context
  useEffect(() => {
    setLocalDomainSettings({
      customDomain: qrCodeSettings.customDomain || '',
      useCustomDomain: qrCodeSettings.resolver === 'custom',
      useHTTPS: qrCodeSettings.useHttps,
      pathPrefix: qrCodeSettings.pathPrefix,
      resolver: qrCodeSettings.resolver as 'custom' | 'gs1' | 'local',
      foregroundColor: qrCodeSettings.foregroundColor,
      backgroundColor: qrCodeSettings.backgroundColor,
      dppTemplate: qrCodeSettings.dppTemplate as 'modern' | 'classic' | 'compact',
    });
  }, [qrCodeSettings]);

  // Load products from database
  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      setLoadError(false);
      try {
        const productsData = await getProducts();
        setProducts(productsData);
        if (productsData.length > 0) {
          setSelectedProduct(productsData[0]);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
        setLoadError(true);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, [reloadKey]);

  // Load batches when a product is selected
  useEffect(() => {
    if (!selectedProduct) {
      setBatches([]);
      setSelectedBatch(null);
      return;
    }
    async function loadBatches() {
      setBatchesLoading(true);
      try {
        const batchData = await getBatches(selectedProduct!.id);
        setBatches(batchData);
        setSelectedBatch(batchData.length > 0 ? batchData[0] : null);
      } catch (error) {
        console.error('Failed to load batches:', error);
        toast.error(t('Failed to load batches'));
      } finally {
        setBatchesLoading(false);
      }
    }
    loadBatches();
  }, [selectedProduct, t]);

  // Save QR visual settings to localStorage
  useEffect(() => {
    localStorage.setItem('dpp-qr-settings', JSON.stringify(qrSettings));
  }, [qrSettings]);

  // Generate the DPP URL based on settings
  const generateDPPUrl = (gtin: string, serial: string, forCustoms = false) => {
    const protocol = localDomainSettings.useHTTPS ? 'https' : 'http';
    const customsSuffix = forCustoms ? '/customs' : '';

    // Local public pages
    if (localDomainSettings.resolver === 'local') {
      return `${getPublicBaseUrl()}/p/${gtin}/${serial}${customsSuffix}`;
    }

    if (localDomainSettings.resolver === 'gs1') {
      return `https://id.gs1.org/01/${gtin}/21/${serial}`;
    }

    if (localDomainSettings.useCustomDomain && localDomainSettings.customDomain) {
      const domain = localDomainSettings.customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const prefix = localDomainSettings.pathPrefix ? `/${localDomainSettings.pathPrefix.replace(/^\/|\/$/g, '')}` : '';
      return `${protocol}://${domain}${prefix}/p/${gtin}/${serial}${customsSuffix}`;
    }

    return `${getPublicBaseUrl()}/p/${gtin}/${serial}${customsSuffix}`;
  };

  // Resolved serial number from selected batch (or fallback to product.serial for legacy)
  const activeSerial = selectedBatch?.serialNumber || selectedProduct?.serial || '';
  const activeGtin = selectedProduct?.gtin || '';

  // Local preview URLs
  const localPreviewUrl = (activeGtin && activeSerial) ? `${getPublicBaseUrl()}/p/${activeGtin}/${activeSerial}` : '';
  const localCustomsUrl = localPreviewUrl ? `${localPreviewUrl}/customs` : '';

  const dppUrl = (activeGtin && activeSerial) ? generateDPPUrl(activeGtin, activeSerial) : '';
  const dppCustomsUrl = (activeGtin && activeSerial) ? generateDPPUrl(activeGtin, activeSerial, true) : '';
  const gs1Url = (activeGtin && activeSerial) ? `https://id.gs1.org/01/${activeGtin}/21/${activeSerial}` : '';

  // Resolve effective logo URL (custom upload > branding logo)
  const effectiveLogoUrl = qrSettings.logoEnabled
    ? (qrSettings.logoUrl || branding.logo || '')
    : '';

  // Generate QR Codes (customer + customs) with composite rendering
  useEffect(() => {
    if (!dppUrl) return;

    const generateQR = async () => {
      try {
        const qrOpts = {
          width: qrSettings.size,
          margin: qrSettings.margin,
          color: {
            dark: localDomainSettings.foregroundColor || '#000000',
            light: localDomainSettings.backgroundColor || '#FFFFFF',
          },
          errorCorrectionLevel: qrSettings.errorCorrection,
        };

        const logoOpts = {
          enabled: qrSettings.logoEnabled && !!effectiveLogoUrl,
          url: effectiveLogoUrl,
          size: qrSettings.logoSize,
        };

        const customerTextContent = qrSettings.includeText
          ? (qrSettings.customText || selectedProduct?.gtin || '')
          : '';
        const customsTextContent = qrSettings.includeText
          ? (qrSettings.customText || `${selectedProduct?.gtin || ''} (Customs)`)
          : '';

        const makeTextOpts = (content: string) => ({
          enabled: qrSettings.includeText,
          content,
          position: qrSettings.textPosition,
          color: localDomainSettings.foregroundColor || '#000000',
        });

        const url = await generateCompositeQR(dppUrl, qrOpts, logoOpts, makeTextOpts(customerTextContent));
        setQrDataUrl(url);

        const customsUrl = await generateCompositeQR(dppCustomsUrl, qrOpts, logoOpts, makeTextOpts(customsTextContent));
        setQrCustomsDataUrl(customsUrl);
      } catch (err) {
        console.error('QR Code generation failed:', err);
      }
    };

    generateQR();
  }, [dppUrl, dppCustomsUrl, qrSettings, localDomainSettings.foregroundColor, localDomainSettings.backgroundColor, effectiveLogoUrl, selectedProduct?.gtin]);

  // Copy function
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setCopiedField(field);
    setTimeout(() => {
      setCopied(false);
      setCopiedField('');
    }, 2000);
  };

  // Download functions
  const downloadQR = async (format: 'png' | 'svg' | 'pdf', forCustoms = false) => {
    if (!selectedProduct || !activeSerial) return;
    const suffix = forCustoms ? '-customs' : '-customer';
    const filename = `qr-${activeGtin}-${activeSerial}${suffix}`;
    const targetUrl = forCustoms ? dppCustomsUrl : dppUrl;

    const qrOpts = {
      width: qrSettings.size,
      margin: qrSettings.margin,
      color: {
        dark: localDomainSettings.foregroundColor || '#000000',
        light: localDomainSettings.backgroundColor || '#FFFFFF',
      },
      errorCorrectionLevel: qrSettings.errorCorrection,
    };

    const logoOpts = {
      enabled: qrSettings.logoEnabled && !!effectiveLogoUrl,
      url: effectiveLogoUrl,
      size: qrSettings.logoSize,
    };

    const textContent = qrSettings.includeText
      ? (qrSettings.customText || (forCustoms ? `${selectedProduct.gtin} (Customs)` : selectedProduct.gtin))
      : '';
    const textOpts = {
      enabled: qrSettings.includeText,
      content: textContent,
      position: qrSettings.textPosition,
      color: localDomainSettings.foregroundColor || '#000000',
    };

    if (format === 'png') {
      const dataUrl = await renderQrPng({ data: targetUrl, ...qrOpts }, logoOpts, textOpts);
      await saveOrShare({
        content: dataUrl,
        mime: 'image/png',
        filename: `${filename}.png`,
      });
    } else if (format === 'svg') {
      const svgString = await renderQrSvg({ data: targetUrl, ...qrOpts }, logoOpts, textOpts);
      await saveOrShare({
        content: svgString,
        mime: 'image/svg+xml',
        filename: `${filename}.svg`,
      });
    }
  };

  // Batch download (both customer + customs per product batch)
  const downloadBatch = async () => {
    const productsToExport = selectedProducts.length > 0
      ? products.filter(p => selectedProducts.includes(p.id))
      : products;

    const qrOpts = {
      width: qrSettings.size,
      margin: qrSettings.margin,
      color: {
        dark: localDomainSettings.foregroundColor || '#000000',
        light: localDomainSettings.backgroundColor || '#FFFFFF',
      },
      errorCorrectionLevel: qrSettings.errorCorrection,
    };

    const logoOpts = {
      enabled: qrSettings.logoEnabled && !!effectiveLogoUrl,
      url: effectiveLogoUrl,
      size: qrSettings.logoSize,
    };

    // Web only, deliberately. This fires two downloads per batch with a 200 ms
    // gap, which browsers handle but a WebView does not: `<a download>` is inert
    // there, and routing each file through the share sheet instead would put a
    // hundred sequential system dialogs in front of the user. Exporting a whole
    // catalogue of labels is a desk job anyway.
    if (isNative()) {
      toast.error(t('Batch export is available in the browser version'));
      return;
    }

    for (const product of productsToExport) {
      const productBatches = await getBatches(product.id);
      if (productBatches.length === 0) continue;

      for (const batch of productBatches) {
        const customerUrl = generateDPPUrl(product.gtin, batch.serialNumber);
        const customerText = qrSettings.includeText ? (qrSettings.customText || product.gtin) : '';
        const customerDataUrl = await generateCompositeQR(
          customerUrl, qrOpts, logoOpts,
          { enabled: qrSettings.includeText, content: customerText, position: qrSettings.textPosition, color: qrOpts.color.dark }
        );
        const link1 = document.createElement('a');
        link1.download = `qr-${product.gtin}-${batch.serialNumber}-customer.png`;
        link1.href = customerDataUrl;
        link1.click();

        await new Promise(resolve => setTimeout(resolve, 200));

        const customsUrl = generateDPPUrl(product.gtin, batch.serialNumber, true);
        const customsText = qrSettings.includeText ? (qrSettings.customText || `${product.gtin} (Customs)`) : '';
        const customsDataUrl = await generateCompositeQR(
          customsUrl, qrOpts, logoOpts,
          { enabled: qrSettings.includeText, content: customsText, position: qrSettings.textPosition, color: qrOpts.color.dark }
        );
        const link2 = document.createElement('a');
        link2.download = `qr-${product.gtin}-${batch.serialNumber}-customs.png`;
        link2.href = customsDataUrl;
        link2.click();

        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  };

  // Filter products
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.gtin.includes(searchTerm)
  );

  // Toggle product selection for batch
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // Handle domain validation on change
  const handleDomainChange = (value: string) => {
    const normalized = normalizeDomain(value);
    setLocalDomainSettings({ ...localDomainSettings, customDomain: normalized });

    if (normalized) {
      const validation = validateDomain(normalized);
      setDomainError(validation.isValid ? null : validation.errorMessage || null);
    } else {
      setDomainError(null);
    }
  };

  // Handle path prefix validation on change
  const handlePathPrefixChange = (value: string) => {
    setLocalDomainSettings({ ...localDomainSettings, pathPrefix: value });

    if (value) {
      const validation = validatePathPrefix(value);
      setPathPrefixError(validation.isValid ? null : validation.errorMessage || null);
    } else {
      setPathPrefixError(null);
    }
  };

  // Handle custom logo file upload (convert to data URL)
  const handleLogoFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast.error(t('Logo file must be under 500 KB'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setQRSettings(prev => ({ ...prev, logoUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
    if (logoUploadRef.current) {
      logoUploadRef.current.value = '';
    }
  };

  // Save settings to database
  const saveDomainSettings = async () => {
    if (localDomainSettings.resolver === 'custom') {
      const domainValidation = validateDomain(localDomainSettings.customDomain);
      if (!domainValidation.isValid) {
        setDomainError(domainValidation.errorMessage || 'Invalid domain');
        return;
      }

      if (localDomainSettings.pathPrefix) {
        const prefixValidation = validatePathPrefix(localDomainSettings.pathPrefix);
        if (!prefixValidation.isValid) {
          setPathPrefixError(prefixValidation.errorMessage || 'Invalid path');
          return;
        }
      }
    }

    setIsSavingDomain(true);
    setDomainSaved(false);

    const success = await updateQRCodeSettings({
      customDomain: localDomainSettings.customDomain || undefined,
      pathPrefix: localDomainSettings.pathPrefix || undefined,
      useHttps: localDomainSettings.useHTTPS,
      resolver: localDomainSettings.resolver,
      foregroundColor: localDomainSettings.foregroundColor,
      backgroundColor: localDomainSettings.backgroundColor,
      dppTemplate: localDomainSettings.dppTemplate,
    });

    if (success) {
      setDomainSaved(true);
      setTimeout(() => setDomainSaved(false), 2000);
    } else {
      toast.error(t('Error saving settings'));
    }

    setIsSavingDomain(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError) {
    return (
      <ErrorState
        title={t('Failed to load products')}
        onRetry={() => setReloadKey((k) => k + 1)}
      />
    );
  }

  return (
    <PageContainer
      size="full"
      padding={false}
      title={t('QR Code Generator')}
      description={t('Create QR codes for your Digital Product Passports with your own domain')}
      actions={
        <Button variant="outline" onClick={() => setActiveTab('domain')}>
          <Globe className="mr-2 h-4 w-4" />
          {t('Domain Settings')}
        </Button>
      }
    >
      <div className="space-y-6">
      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">{t('No products available')}</h3>
            <p className="text-muted-foreground mt-1">
              {t('Create products first to generate QR codes.')}
            </p>
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="grid grid-cols-1 min-w-0 gap-6 lg:grid-cols-3">
        {/* Product Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('Select Product')}</span>
              <Badge variant="secondary">{filteredProducts.length}</Badge>
            </CardTitle>
            <CardDescription>{t('Choose a product, then select a batch')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder={t('Search product or GTIN...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProduct?.id === product.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium break-words">{product.name}</p>
                      <p className="text-xs font-mono text-muted-foreground break-all">
                        GTIN: {product.gtin}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.batchCount} {product.batchCount === 1 ? t('Batch') : t('Batches')}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0 max-w-[40%] truncate">{product.category}</Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Batch Selection */}
            {selectedProduct && (
              <>
                <Separator />
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {t('Select Batch')}
                  </Label>
                  {batchesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : batches.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      {t('No batches for this product.')}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[150px] overflow-y-auto">
                      {batches.map((batch) => (
                        <div
                          key={batch.id}
                          onClick={() => setSelectedBatch(batch)}
                          className={`p-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                            selectedBatch?.id === batch.id
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <code className="font-mono font-medium break-all">{batch.serialNumber}</code>
                              {batch.batchNumber && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  {t('Batch')} {batch.batchNumber}
                                </span>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              {batch.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* QR Code Preview & Settings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle>{t('QR Code Generator')}</CardTitle>
                <CardDescription className="break-words">
                  {selectedProduct
                    ? `${selectedProduct.name}${selectedBatch ? ` · ${selectedBatch.serialNumber}` : ''}`
                    : t('No product selected')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={localDomainSettings.useCustomDomain ? 'default' : 'secondary'}>
                  {localDomainSettings.useCustomDomain ? (
                    <>
                      <Globe className="mr-1 h-3 w-3" />
                      {t('Custom Domain')}
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-1 h-3 w-3" />
                      {t('GS1 Digital Link')}
                    </>
                  )}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="preview">
                  <Eye className="mr-2 h-4 w-4" />
                  {t('Preview')}
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="mr-2 h-4 w-4" />
                  {t('QR Settings')}
                </TabsTrigger>
                <TabsTrigger value="domain">
                  <Globe className="mr-2 h-4 w-4" />
                  {t('Domain')}
                </TabsTrigger>
              </TabsList>

              {/* Preview Tab */}
              <TabsContent value="preview" className="space-y-6">
                {/* Two QR codes side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer QR */}
                  <div className="text-center space-y-3">
                    <h4 className="font-medium text-sm">{t('Customer')}</h4>
                    <div
                      className="bg-white p-4 sm:p-6 rounded-lg border-2 shadow-lg inline-block"
                      style={{ backgroundColor: localDomainSettings.backgroundColor }}
                    >
                      {qrDataUrl ? (
                        <MotionDiv
                          {...(!prefersReduced && { variants: scaleIn, initial: 'initial', animate: 'animate' })}
                          key={qrDataUrl}
                        >
                          <img
                            src={qrDataUrl}
                            alt="Customer QR Code"
                            className="w-full max-w-[256px] h-auto"
                          />
                        </MotionDiv>
                      ) : (
                        <div className="flex items-center justify-center bg-muted rounded w-full max-w-[200px] aspect-square">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => downloadQR('png', false)}>
                        <Download className="mr-1 h-3 w-3" />
                        PNG
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadQR('svg', false)}>
                        <Download className="mr-1 h-3 w-3" />
                        SVG
                      </Button>
                    </div>
                  </div>

                  {/* Customs QR */}
                  <div className="text-center space-y-3">
                    <h4 className="font-medium text-sm">{t('Customs')}</h4>
                    <div
                      className="bg-white p-4 sm:p-6 rounded-lg border-2 shadow-lg inline-block"
                      style={{ backgroundColor: localDomainSettings.backgroundColor }}
                    >
                      {qrCustomsDataUrl ? (
                        <MotionDiv
                          {...(!prefersReduced && { variants: scaleIn, initial: 'initial', animate: 'animate' })}
                          key={qrCustomsDataUrl}
                        >
                          <img
                            src={qrCustomsDataUrl}
                            alt="Customs QR Code"
                            className="w-full max-w-[256px] h-auto"
                          />
                        </MotionDiv>
                      ) : (
                        <div className="flex items-center justify-center bg-muted rounded w-full max-w-[200px] aspect-square">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => downloadQR('png', true)}>
                        <Download className="mr-1 h-3 w-3" />
                        PNG
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadQR('svg', true)}>
                        <Download className="mr-1 h-3 w-3" />
                        SVG
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* URL Display */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t('Customer DPP URL (used in QR code)')}
                    </Label>
                    <div className="flex gap-2">
                      <Input value={dppUrl} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(dppUrl, 'dpp')}
                      >
                        {copied && copiedField === 'dpp' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <a href={dppUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t('Customs DPP URL')}
                    </Label>
                    <div className="flex gap-2">
                      <Input value={dppCustomsUrl} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(dppCustomsUrl, 'customs')}
                      >
                        {copied && copiedField === 'customs' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button variant="outline" size="icon" asChild>
                        <a href={dppCustomsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {t('GS1 Digital Link (Standard)')}
                    </Label>
                    <div className="flex gap-2">
                      <Input value={gs1Url} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(gs1Url, 'gs1')}
                      >
                        {copied && copiedField === 'gs1' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Preview links for local pages */}
                  {selectedProduct && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-green-800 dark:text-green-200">
                        <Eye className="h-4 w-4" />
                        {t('Test Public Pages')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={localPreviewUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {t('Customer View')}
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={localCustomsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {t('Customs View')}
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* GS1 Digital Link Structure */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      {t('GS1 Digital Link Structure')}
                    </h4>
                    <div className="font-mono text-xs space-y-1">
                      <p><span className="text-blue-500">01</span> = GTIN (Global Trade Item Number)</p>
                      <p><span className="text-green-500">21</span> = Serial Number</p>
                      <p><span className="text-orange-500">10</span> = Batch/Lot (optional)</p>
                      <p><span className="text-purple-500">17</span> = Expiry Date (optional)</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* QR Settings Tab */}
              <TabsContent value="settings">
                <FormSections divided>
                  <FormSection title={t('Size')} icon={Settings} variant="plain">
                    <ChoiceCards
                      value={String(qrSettings.size)}
                      onValueChange={(v) => setQRSettings({ ...qrSettings, size: parseInt(v) })}
                      columns={4}
                      aria-label={t('Size')}
                      options={[128, 256, 512, 1024].map((size) => ({ value: String(size), label: <span className="tabular-nums">{size} px</span> }))}
                    />
                    <FormGrid cols={2}>
                    <FormField label={t('Custom size')} htmlFor="qr-size">
                      <InputAffix suffix="px">
                        <Input
                          id="qr-size"
                          type="number"
                          inputMode="numeric"
                          className="tabular-nums"
                          value={qrSettings.size}
                          onChange={(e) => setQRSettings({ ...qrSettings, size: parseInt(e.target.value) || 256 })}
                          min={64}
                          max={2048}
                        />
                      </InputAffix>
                    </FormField>
                    <FormField
                      label={t('Margin (Quiet Zone)')}
                      htmlFor="qr-margin"
                      hint={t('At least 2 modules are recommended for optimal readability')}
                      
                    >
                      <InputAffix suffix={t('Modules')}>
                        <Input
                          id="qr-margin"
                          type="number"
                          inputMode="numeric"
                          className="tabular-nums"
                          value={qrSettings.margin}
                          onChange={(e) => setQRSettings({ ...qrSettings, margin: parseInt(e.target.value) || 0 })}
                          min={0}
                          max={10}
                        />
                      </InputAffix>
                    </FormField>
                    </FormGrid>
                  </FormSection>

                  <FormSection
                    title={t('Error Correction')}
                    description={t('Higher correction = larger QR code, but better readability when damaged')}
                    icon={Layers}
                    variant="plain"
                  >
                    <ChoiceCards<'L' | 'M' | 'Q' | 'H'>
                      value={qrSettings.errorCorrection}
                      onValueChange={(value) => setQRSettings({ ...qrSettings, errorCorrection: value })}
                      columns={2}
                      aria-label={t('Error Correction')}
                      options={[
                        { value: 'L', label: t('L - Low (7%)') },
                        { value: 'M', label: t('M - Medium (15%)') },
                        { value: 'Q', label: t('Q - Quartile (25%)') },
                        { value: 'H', label: t('H - High (30%)') },
                      ]}
                    />
                  </FormSection>

                  <FormSection title={t('Colors')} icon={Palette} variant="plain">
                    <FormGrid cols={2}>
                      <FormField label={t('Foreground')} htmlFor="qr-fg">
                        <InputAffix
                          variant="addon"
                          prefix={
                            <input
                              type="color"
                              aria-label={t('Foreground')}
                              value={localDomainSettings.foregroundColor || '#000000'}
                              onChange={(e) => setLocalDomainSettings({ ...localDomainSettings, foregroundColor: e.target.value })}
                              className="size-7 cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border [&::-webkit-color-swatch-wrapper]:p-0"
                            />
                          }
                        >
                          <Input
                            id="qr-fg"
                            value={localDomainSettings.foregroundColor || '#000000'}
                            onChange={(e) => setLocalDomainSettings({ ...localDomainSettings, foregroundColor: e.target.value })}
                            className="font-mono uppercase"
                            spellCheck={false}
                          />
                        </InputAffix>
                      </FormField>
                      <FormField label={t('Background')} htmlFor="qr-bg">
                        <InputAffix
                          variant="addon"
                          prefix={
                            <input
                              type="color"
                              aria-label={t('Background')}
                              value={localDomainSettings.backgroundColor || '#FFFFFF'}
                              onChange={(e) => setLocalDomainSettings({ ...localDomainSettings, backgroundColor: e.target.value })}
                              className="size-7 cursor-pointer appearance-none rounded-sm border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border [&::-webkit-color-swatch-wrapper]:p-0"
                            />
                          }
                        >
                          <Input
                            id="qr-bg"
                            value={localDomainSettings.backgroundColor || '#FFFFFF'}
                            onChange={(e) => setLocalDomainSettings({ ...localDomainSettings, backgroundColor: e.target.value })}
                            className="font-mono uppercase"
                            spellCheck={false}
                          />
                        </InputAffix>
                      </FormField>
                    </FormGrid>
                  </FormSection>


                  <FormSection title={t('Advanced Options')} icon={SlidersHorizontal} variant="plain">
                    <FormToggleRow label={t('Show text below QR code')} htmlFor="includeText">
                      <Switch
                        id="includeText"
                        checked={qrSettings.includeText}
                        onCheckedChange={(checked: boolean) =>
                          setQRSettings({ ...qrSettings, includeText: checked })
                        }
                      />
                    </FormToggleRow>
                    {qrSettings.includeText && (
                      <FormField label={t('Text below QR code')} htmlFor="customText" hint={t('Leave empty for automatic GTIN display')}>
                        <Input
                          id="customText"
                          placeholder={selectedProduct?.gtin || 'e.g. product name or GTIN'}
                          value={qrSettings.customText}
                          onChange={(e) => setQRSettings({ ...qrSettings, customText: e.target.value })}
                        />
                      </FormField>
                    )}

                    <FormToggleRow label={t('Embed logo in QR code')} htmlFor="logoEnabled">
                      <Switch
                        id="logoEnabled"
                        checked={qrSettings.logoEnabled}
                        onCheckedChange={(checked: boolean) =>
                          setQRSettings({ ...qrSettings, logoEnabled: checked })
                        }
                      />
                    </FormToggleRow>

                    {qrSettings.logoEnabled && (
                      <div className="space-y-5 rounded-lg border bg-muted/30 p-4">
                        {/* Branding logo hint */}
                        {branding.logo && !qrSettings.logoUrl && (
                          <div className="flex items-center gap-3 rounded-lg border bg-background p-3">
                            <img src={branding.logo} alt="Company logo" className="h-8 w-8 object-contain rounded" loading="lazy" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{t('Company logo')}</p>
                              <p className="text-xs text-muted-foreground">{t('From branding settings')}</p>
                            </div>
                            <Badge variant="secondary">{t('Active')}</Badge>
                          </div>
                        )}

                        {/* Custom logo upload */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium">{t('Custom logo (optional)')}</p>
                          <input
                            type="file"
                            ref={logoUploadRef}
                            accept="image/png,image/jpeg,image/svg+xml"
                            onChange={handleLogoFileUpload}
                            className="hidden"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" className="pointer-coarse:min-h-11" onClick={() => logoUploadRef.current?.click()}>
                              <Upload className="mr-2 h-4 w-4" />
                              {t('Upload custom logo')}
                            </Button>
                            {qrSettings.logoUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setQRSettings({ ...qrSettings, logoUrl: '' })}
                                className="text-destructive pointer-coarse:min-h-11"
                              >
                                <TrashIcon className="mr-1 h-3 w-3" />
                                {t('Remove', { ns: 'common' })}
                              </Button>
                            )}
                          </div>
                          {qrSettings.logoUrl && (
                            <div className="flex items-center gap-2">
                              <img src={qrSettings.logoUrl} alt="Custom logo" className="h-8 w-8 object-contain rounded border" loading="lazy" />
                              <Badge>{t('Custom logo active')}</Badge>
                            </div>
                          )}
                          {!branding.logo && !qrSettings.logoUrl && (
                            <p className="text-xs text-muted-foreground">
                              {t('Upload a logo or set one in branding settings')}
                            </p>
                          )}
                        </div>

                        {/* Logo size slider */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <label htmlFor="qr-logo-size" className="font-medium">{t('Logo size')}</label>
                            <span className="tabular-nums text-muted-foreground">{qrSettings.logoSize}%</span>
                          </div>
                          <input
                            id="qr-logo-size"
                            type="range"
                            min={10}
                            max={30}
                            value={qrSettings.logoSize}
                            onChange={(e) => setQRSettings({ ...qrSettings, logoSize: parseInt(e.target.value) })}
                            className="h-11 w-full accent-primary"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
                            <span>10%</span>
                            <span>20%</span>
                            <span>30%</span>
                          </div>
                        </div>

                        {/* Info: error correction */}
                        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
                          {t('Error correction is automatically set to H (30%) when a logo is embedded to ensure scannability.')}
                        </p>
                      </div>
                    )}
                  </FormSection>
                </FormSections>

                <FormActions className="mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setQRSettings(defaultQRSettings)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('Reset', { ns: 'common' })}
                  </Button>
                </FormActions>
              </TabsContent>

              {/* Domain Settings Tab */}
              <TabsContent value="domain">
                <div className="mb-6 flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                  <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <div>
                    <h4 className="text-sm font-medium">{t('Why use your own domain?')}</h4>
                    <p className="mt-1 text-sm text-pretty text-muted-foreground">
                      {t('With your own domain you have full control over your DPP URLs. You can set up your own resolver that redirects QR codes to your product pages.')}
                    </p>
                  </div>
                </div>

                <FormSections divided>
                  {/* URL Resolver Selection */}
                  <FormSection title={t('URL Resolver')} icon={Globe} variant="plain">
                    <ChoiceCards<'gs1' | 'local' | 'custom'>
                      value={localDomainSettings.resolver}
                      onValueChange={(v) => setLocalDomainSettings({ ...localDomainSettings, resolver: v, useCustomDomain: v === 'custom' })}
                      columns={1}
                      aria-label={t('URL Resolver')}
                      options={[
                        {
                          value: 'gs1',
                          label: <span className="flex flex-wrap items-center gap-2">{t('GS1 Digital Link Resolver')}<Badge variant="secondary">{t('Recommended')}</Badge></span>,
                          description: <>{t('Uses the official GS1 Resolver (id.gs1.org)')}<span className="mt-1 block font-mono [overflow-wrap:anywhere]">https://id.gs1.org/01/GTIN/21/SERIAL</span></>,
                        },
                        {
                          value: 'local',
                          label: <span className="flex flex-wrap items-center gap-2">{t('Local Product Pages')}<Badge variant="outline">{t('New')}</Badge></span>,
                          description: <>{t('Uses the built-in public DPP pages of this application')}<span className="mt-1 block font-mono [overflow-wrap:anywhere]">{getPublicBaseUrl()}/p/GTIN/SERIAL</span></>,
                        },
                        {
                          value: 'custom',
                          label: t('Custom Domain'),
                          description: t('Use your own domain for DPP URLs'),
                        },
                      ]}
                    />

                    {/* Custom Domain Settings */}
                    {localDomainSettings.resolver === 'custom' && (
                      <div className="space-y-5 rounded-lg border bg-muted/30 p-4">
                        <FormField
                          label={t('Your Domain')}
                          htmlFor="qr-domain"
                          required
                          error={domainError || undefined}
                          hint={t('Enter domain only without https://')}
                        >
                          <InputAffix prefix={localDomainSettings.useHTTPS ? 'https://' : 'http://'} variant="addon">
                            <Input
                              id="qr-domain"
                              inputMode="url"
                              autoCapitalize="none"
                              spellCheck={false}
                              placeholder="dpp.your-company.com"
                              value={localDomainSettings.customDomain}
                              onChange={(e) => handleDomainChange(e.target.value)}
                            />
                          </InputAffix>
                        </FormField>

                        <FormField
                          label={t('Path Prefix')}
                          htmlFor="qr-path-prefix"
                          optional
                          error={pathPrefixError || undefined}
                          hint={t('Inserted between domain and GS1 path')}
                        >
                          <InputAffix prefix="/" variant="addon">
                            <Input
                              id="qr-path-prefix"
                              autoCapitalize="none"
                              spellCheck={false}
                              placeholder="products"
                              value={localDomainSettings.pathPrefix}
                              onChange={(e) => handlePathPrefixChange(e.target.value)}
                            />
                          </InputAffix>
                        </FormField>

                        <FormToggleRow label={t('Use HTTPS (recommended)')} htmlFor="useHttps">
                          <Switch
                            id="useHttps"
                            checked={localDomainSettings.useHTTPS}
                            onCheckedChange={(checked: boolean) =>
                              setLocalDomainSettings({ ...localDomainSettings, useHTTPS: checked })
                            }
                          />
                        </FormToggleRow>

                        {/* Preview */}
                        {selectedProduct && (
                          <div className="rounded-md border bg-background p-3">
                            <p className="text-xs text-muted-foreground">{t('URL Preview')}:</p>
                            <p className="mt-1 break-all font-mono text-sm">
                              {generateDPPUrl(activeGtin, activeSerial)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* DNS Setup Guide */}
                    {localDomainSettings.resolver === 'custom' && localDomainSettings.customDomain && (
                      <Accordion type="single" collapsible>
                        <AccordionItem value="setup">
                          <AccordionTrigger>
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              {t('Setup Guide')}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-4 text-sm">
                              <div>
                                <h5 className="font-medium mb-2">{t('1. Create DNS Record')}</h5>
                                <p className="text-muted-foreground">
                                  {t('Create a CNAME or A record for your subdomain:')}
                                </p>
                                <code className="block mt-1 p-2 bg-muted rounded text-xs">
                                  {localDomainSettings.customDomain} CNAME your-dpp-server.com
                                </code>
                              </div>

                              <div>
                                <h5 className="font-medium mb-2">{t('2. SSL Certificate')}</h5>
                                <p className="text-muted-foreground">
                                  {t("Make sure a valid SSL certificate for HTTPS is available (e.g. via Let's Encrypt).")}
                                </p>
                              </div>

                              <div>
                                <h5 className="font-medium mb-2">{t('3. Set up Resolver')}</h5>
                                <p className="text-muted-foreground">
                                  {t('Your server must parse GS1 Digital Link URLs and redirect to the corresponding product page.')}
                                </p>
                                <code className="block mt-1 p-2 bg-muted rounded text-xs whitespace-pre overflow-x-auto">
{`// Example Express.js Route
app.get('/01/:gtin/21/:serial', (req, res) => {
  const { gtin, serial } = req.params;
  // Find product and display DPP
  res.redirect(\`/product/\${gtin}?serial=\${serial}\`);
});`}
                                </code>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )}
                  </FormSection>

                  {/* DPP Template Selection */}
                  <FormSection
                    title={t('DPP Page Template')}
                    description={t('Choose the design template for your public product pages')}
                    icon={LayoutTemplate}
                    variant="plain"
                  >
                    <ChoiceCards
                      value={localDomainSettings.dppTemplate}
                      onValueChange={(v) => setLocalDomainSettings({ ...localDomainSettings, dppTemplate: v as typeof localDomainSettings.dppTemplate })}
                      columns={3}
                      aria-label={t('DPP Page Template')}
                      options={[
                        { value: 'modern', label: t('Modern'), description: t('Hero header, glassmorphism cards, animations'), icon: Sparkles },
                        { value: 'classic', label: t('Classic'), description: t('Clean cards, structured sections, professional'), icon: BookOpen },
                        { value: 'compact', label: t('Compact'), description: t('Tab layout, mobile-first, minimal whitespace'), icon: Smartphone },
                      ]}
                    />
                  </FormSection>
                </FormSections>

                <FormActions className="mt-6">
                  <Button
                    onClick={saveDomainSettings}
                    disabled={isSavingDomain || (localDomainSettings.resolver === 'custom' && !!domainError)}
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
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Batch Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {t('Batch Export')}
            </span>
            {selectedProducts.length > 0 && (
              <Badge>{selectedProducts.length} {t('selected')}</Badge>
            )}
          </CardTitle>
          <CardDescription>
            {t('Export QR codes for multiple products at once (customer + customs per product)')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedProducts.length === products.length) {
                  setSelectedProducts([]);
                } else {
                  setSelectedProducts(products.map(p => p.id));
                }
              }}
            >
              {selectedProducts.length === products.length ? (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('Deselect All')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('Select All')}
                </>
              )}
            </Button>
            <Button onClick={downloadBatch} disabled={selectedProducts.length === 0 && products.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              {selectedProducts.length > 0
                ? t('Download {{count}} QR codes', { count: selectedProducts.length })
                : t('Download all QR codes')}
            </Button>
          </div>

          {/* Product Selection for Batch */}
          <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => toggleProductSelection(product.id)}
                className={`min-w-0 p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-3 ${
                  selectedProducts.includes(product.id)
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={selectedProducts.includes(product.id)}
                  onCheckedChange={() => toggleProductSelection(product.id)}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {product.gtin}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      </>
      )}
      </div>
    </PageContainer>
  );
}
