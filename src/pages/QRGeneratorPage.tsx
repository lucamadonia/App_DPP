import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getProducts, type ProductListItem } from '@/services/supabase';
import { getBatches } from '@/services/supabase/batches';
import type { BatchListItem } from '@/types/product';
import { useBranding } from '@/contexts/BrandingContext';
import { validateDomain, validatePathPrefix, normalizeDomain } from '@/lib/domain-utils';

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

// Helper: load an image element from URL
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Generate composite QR code with optional logo overlay and text
async function generateCompositeQR(
  data: string,
  qrOpts: {
    width: number;
    margin: number;
    errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
    color: { dark: string; light: string };
  },
  logo: { enabled: boolean; url: string; size: number },
  text: { enabled: boolean; content: string; position: 'top' | 'bottom'; color: string }
): Promise<string> {
  const qrCanvas = document.createElement('canvas');
  const ecLevel = logo.enabled ? 'H' : qrOpts.errorCorrectionLevel;
  await QRCode.toCanvas(qrCanvas, data, {
    width: qrOpts.width,
    margin: qrOpts.margin,
    color: qrOpts.color,
    errorCorrectionLevel: ecLevel,
  });

  const qrW = qrCanvas.width;
  const qrH = qrCanvas.height;

  const fontSize = Math.max(11, Math.round(qrW * 0.05));
  const textBlockH = text.enabled && text.content ? fontSize + 12 : 0;

  const canvas = document.createElement('canvas');
  canvas.width = qrW;
  canvas.height = qrH + textBlockH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = qrOpts.color.light;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const qrY = text.enabled && text.position === 'top' ? textBlockH : 0;
  ctx.drawImage(qrCanvas, 0, qrY);

  if (logo.enabled && logo.url) {
    try {
      const img = await loadImage(logo.url);
      const scale = logo.size / 100;
      const logoW = qrW * scale;
      const logoH = (img.naturalHeight / img.naturalWidth) * logoW;
      const logoX = (qrW - logoW) / 2;
      const logoY = qrY + (qrH - logoH) / 2;
      const pad = Math.round(qrW * 0.02);

      ctx.fillStyle = qrOpts.color.light;
      ctx.fillRect(logoX - pad, logoY - pad, logoW + pad * 2, logoH + pad * 2);
      ctx.drawImage(img, logoX, logoY, logoW, logoH);
    } catch {
      // Skip logo on load failure
    }
  }

  if (text.enabled && text.content) {
    ctx.font = `${fontSize}px "SF Mono", Consolas, "Liberation Mono", monospace`;
    ctx.fillStyle = text.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textY = text.position === 'top'
      ? textBlockH / 2
      : qrY + qrH + textBlockH / 2;

    let label = text.content;
    while (ctx.measureText(label).width > canvas.width - 12 && label.length > 3) {
      label = label.slice(0, -4) + '\u2026';
    }
    ctx.fillText(label, canvas.width / 2, textY);
  }

  return canvas.toDataURL('image/png');
}

export function QRGeneratorPage() {
  const { t } = useTranslation('dpp');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
      const productsData = await getProducts();
      setProducts(productsData);
      if (productsData.length > 0) {
        setSelectedProduct(productsData[0]);
      }
      setIsLoading(false);
    }
    loadProducts();
  }, []);

  // Load batches when a product is selected
  useEffect(() => {
    if (!selectedProduct) {
      setBatches([]);
      setSelectedBatch(null);
      return;
    }
    async function loadBatches() {
      setBatchesLoading(true);
      const batchData = await getBatches(selectedProduct!.id);
      setBatches(batchData);
      setSelectedBatch(batchData.length > 0 ? batchData[0] : null);
      setBatchesLoading(false);
    }
    loadBatches();
  }, [selectedProduct]);

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
      return `${window.location.origin}/p/${gtin}/${serial}${customsSuffix}`;
    }

    if (localDomainSettings.resolver === 'gs1') {
      return `https://id.gs1.org/01/${gtin}/21/${serial}`;
    }

    if (localDomainSettings.useCustomDomain && localDomainSettings.customDomain) {
      const domain = localDomainSettings.customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const prefix = localDomainSettings.pathPrefix ? `/${localDomainSettings.pathPrefix.replace(/^\/|\/$/g, '')}` : '';
      return `${protocol}://${domain}${prefix}/p/${gtin}/${serial}${customsSuffix}`;
    }

    return `${window.location.origin}/p/${gtin}/${serial}${customsSuffix}`;
  };

  // Resolved serial number from selected batch (or fallback to product.serial for legacy)
  const activeSerial = selectedBatch?.serialNumber || selectedProduct?.serial || '';
  const activeGtin = selectedProduct?.gtin || '';

  // Local preview URLs
  const localPreviewUrl = (activeGtin && activeSerial) ? `${window.location.origin}/p/${activeGtin}/${activeSerial}` : '';
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
      const dataUrl = await generateCompositeQR(targetUrl, qrOpts, logoOpts, textOpts);
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } else if (format === 'svg') {
      const ecLevel = qrSettings.logoEnabled ? 'H' : qrSettings.errorCorrection;
      let svgString = await QRCode.toString(targetUrl, {
        type: 'svg',
        width: qrSettings.size,
        margin: qrSettings.margin,
        color: qrOpts.color,
        errorCorrectionLevel: ecLevel,
      });

      // Enhance SVG with logo and/or text
      if ((logoOpts.enabled && logoOpts.url) || (textOpts.enabled && textOpts.content)) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgString, 'image/svg+xml');
        const svg = doc.documentElement;
        const svgW = parseFloat(svg.getAttribute('width') || String(qrSettings.size));
        const svgH = parseFloat(svg.getAttribute('height') || String(qrSettings.size));

        const fontSize = Math.max(11, Math.round(svgW * 0.05));
        const textBlockH = textOpts.enabled && textOpts.content ? fontSize + 12 : 0;

        if (textBlockH > 0) {
          const newH = svgH + textBlockH;
          svg.setAttribute('height', String(newH));
          const vb = svg.getAttribute('viewBox');
          if (vb) {
            const parts = vb.split(' ');
            parts[3] = String(parseFloat(parts[3]) + textBlockH);
            svg.setAttribute('viewBox', parts.join(' '));
          }

          const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
          bgRect.setAttribute('x', '0');
          bgRect.setAttribute('y', String(svgH));
          bgRect.setAttribute('width', String(svgW));
          bgRect.setAttribute('height', String(textBlockH));
          bgRect.setAttribute('fill', qrOpts.color.light);
          svg.appendChild(bgRect);

          const textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
          textEl.setAttribute('x', String(svgW / 2));
          textEl.setAttribute('y', String(svgH + textBlockH / 2));
          textEl.setAttribute('text-anchor', 'middle');
          textEl.setAttribute('dominant-baseline', 'central');
          textEl.setAttribute('font-family', 'monospace');
          textEl.setAttribute('font-size', String(fontSize));
          textEl.setAttribute('fill', qrOpts.color.dark);
          textEl.textContent = textOpts.content;
          svg.appendChild(textEl);
        }

        if (logoOpts.enabled && logoOpts.url) {
          try {
            let logoDataUrl = logoOpts.url;
            if (!logoOpts.url.startsWith('data:')) {
              const img = await loadImage(logoOpts.url);
              const tmpCanvas = document.createElement('canvas');
              tmpCanvas.width = img.naturalWidth;
              tmpCanvas.height = img.naturalHeight;
              tmpCanvas.getContext('2d')!.drawImage(img, 0, 0);
              logoDataUrl = tmpCanvas.toDataURL('image/png');
            }

            const scale = logoOpts.size / 100;
            const logoW = svgW * scale;
            const logoH = logoW;
            const logoX = (svgW - logoW) / 2;
            const logoY = (svgH - logoH) / 2;
            const pad = Math.round(svgW * 0.02);

            const logoBg = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
            logoBg.setAttribute('x', String(logoX - pad));
            logoBg.setAttribute('y', String(logoY - pad));
            logoBg.setAttribute('width', String(logoW + pad * 2));
            logoBg.setAttribute('height', String(logoH + pad * 2));
            logoBg.setAttribute('rx', String(Math.round(pad)));
            logoBg.setAttribute('fill', qrOpts.color.light);
            svg.appendChild(logoBg);

            const imgEl = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
            imgEl.setAttribute('x', String(logoX));
            imgEl.setAttribute('y', String(logoY));
            imgEl.setAttribute('width', String(logoW));
            imgEl.setAttribute('height', String(logoH));
            imgEl.setAttribute('href', logoDataUrl);
            imgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.appendChild(imgEl);
          } catch {
            // Skip logo on failure
          }
        }

        svgString = new XMLSerializer().serializeToString(doc);
      }

      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
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
      alert('Logo file must be under 500 KB');
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
      alert('Error saving settings');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('QR Code Generator')}</h1>
          <p className="text-muted-foreground">
            {t('Create QR codes for your Digital Product Passports with your own domain')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('domain')}>
            <Globe className="mr-2 h-4 w-4" />
            {t('Domain Settings')}
          </Button>
        </div>
      </div>

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
      <div className="grid gap-6 lg:grid-cols-3">
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
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        GTIN: {product.gtin}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.batchCount} {product.batchCount === 1 ? 'Batch' : 'Batches'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{product.category}</Badge>
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
                          <div className="flex items-center justify-between">
                            <div>
                              <code className="font-mono font-medium">{batch.serialNumber}</code>
                              {batch.batchNumber && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  Batch {batch.batchNumber}
                                </span>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-xs">
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('QR Code Generator')}</CardTitle>
                <CardDescription>
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
                        <img
                          src={qrDataUrl}
                          alt="Customer QR Code"
                          className="w-full max-w-[256px] h-auto"
                        />
                      ) : (
                        <div className="flex items-center justify-center bg-muted rounded w-[200px] h-[200px]">
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
                        <img
                          src={qrCustomsDataUrl}
                          alt="Customs QR Code"
                          className="w-full max-w-[256px] h-auto"
                        />
                      ) : (
                        <div className="flex items-center justify-center bg-muted rounded w-[200px] h-[200px]">
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
              <TabsContent value="settings" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Size */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      {t('Size')}
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {[128, 256, 512, 1024].map((size) => (
                        <Button
                          key={size}
                          variant={qrSettings.size === size ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setQRSettings({ ...qrSettings, size })}
                        >
                          {size}px
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={qrSettings.size}
                        onChange={(e) => setQRSettings({ ...qrSettings, size: parseInt(e.target.value) || 256 })}
                        className="w-24"
                        min={64}
                        max={2048}
                      />
                      <span className="text-sm text-muted-foreground">px (custom)</span>
                    </div>
                  </div>

                  {/* Error Correction */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      {t('Error Correction')}
                    </h3>
                    <Select
                      value={qrSettings.errorCorrection}
                      onValueChange={(value: 'L' | 'M' | 'Q' | 'H') =>
                        setQRSettings({ ...qrSettings, errorCorrection: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">{t('L - Low (7%)')}</SelectItem>
                        <SelectItem value="M">{t('M - Medium (15%)')}</SelectItem>
                        <SelectItem value="Q">{t('Q - Quartile (25%)')}</SelectItem>
                        <SelectItem value="H">{t('H - High (30%)')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('Higher correction = larger QR code, but better readability when damaged')}
                    </p>
                  </div>

                  {/* Colors */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      {t('Colors')}
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">{t('Foreground')}</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={localDomainSettings.foregroundColor || '#000000'}
                            onChange={(e) => setLocalDomainSettings({ ...localDomainSettings, foregroundColor: e.target.value })}
                            className="h-10 w-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={localDomainSettings.foregroundColor || '#000000'}
                            onChange={(e) => setLocalDomainSettings({ ...localDomainSettings, foregroundColor: e.target.value })}
                            className="font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">{t('Background')}</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={localDomainSettings.backgroundColor || '#FFFFFF'}
                            onChange={(e) => setLocalDomainSettings({ ...localDomainSettings, backgroundColor: e.target.value })}
                            className="h-10 w-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={localDomainSettings.backgroundColor || '#FFFFFF'}
                            onChange={(e) => setLocalDomainSettings({ ...localDomainSettings, backgroundColor: e.target.value })}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Margin */}
                  <div className="space-y-4">
                    <h3 className="font-medium">{t('Margin (Quiet Zone)')}</h3>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={qrSettings.margin}
                        onChange={(e) => setQRSettings({ ...qrSettings, margin: parseInt(e.target.value) || 0 })}
                        className="w-24"
                        min={0}
                        max={10}
                      />
                      <span className="text-sm text-muted-foreground">{t('Modules')}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t('At least 2 modules are recommended for optimal readability')}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Advanced Options */}
                <div className="space-y-4">
                  <h3 className="font-medium">{t('Advanced Options')}</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeText"
                      checked={qrSettings.includeText}
                      onCheckedChange={(checked: boolean) =>
                        setQRSettings({ ...qrSettings, includeText: checked })
                      }
                    />
                    <Label htmlFor="includeText">{t('Show text below QR code')}</Label>
                  </div>
                  {qrSettings.includeText && (
                    <div className="space-y-2">
                      <Label htmlFor="customText">{t('Text below QR code')}</Label>
                      <Input
                        id="customText"
                        placeholder={selectedProduct?.gtin || 'e.g. product name or GTIN'}
                        value={qrSettings.customText}
                        onChange={(e) => setQRSettings({ ...qrSettings, customText: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('Leave empty for automatic GTIN display')}
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Logo overlay */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="logoEnabled"
                      checked={qrSettings.logoEnabled}
                      onCheckedChange={(checked: boolean) =>
                        setQRSettings({ ...qrSettings, logoEnabled: checked })
                      }
                    />
                    <Label htmlFor="logoEnabled">{t('Embed logo in QR code')}</Label>
                  </div>

                  {qrSettings.logoEnabled && (
                    <div className="space-y-4 pl-4 border-l-2 border-muted">
                      {/* Branding logo hint */}
                      {branding.logo && !qrSettings.logoUrl && (
                        <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
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
                        <Label>{t('Custom logo (optional)')}</Label>
                        <input
                          type="file"
                          ref={logoUploadRef}
                          accept="image/png,image/jpeg,image/svg+xml"
                          onChange={handleLogoFileUpload}
                          className="hidden"
                        />
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => logoUploadRef.current?.click()}>
                            <Upload className="mr-2 h-4 w-4" />
                            {t('Upload custom logo')}
                          </Button>
                          {qrSettings.logoUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setQRSettings({ ...qrSettings, logoUrl: '' })}
                              className="text-destructive"
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
                        <Label>{t('Logo size')}: {qrSettings.logoSize}%</Label>
                        <input
                          type="range"
                          min={10}
                          max={30}
                          value={qrSettings.logoSize}
                          onChange={(e) => setQRSettings({ ...qrSettings, logoSize: parseInt(e.target.value) })}
                          className="w-full accent-primary"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>10%</span>
                          <span>20%</span>
                          <span>30%</span>
                        </div>
                      </div>

                      {/* Info: error correction */}
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <p className="text-xs text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                          {t('Error correction is automatically set to H (30%) when a logo is embedded to ensure scannability.')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Presets */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setQRSettings(defaultQRSettings)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('Reset', { ns: 'common' })}
                  </Button>
                </div>
              </TabsContent>

              {/* Domain Settings Tab */}
              <TabsContent value="domain" className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Info className="h-4 w-4" />
                    {t('Why use your own domain?')}
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {t('With your own domain you have full control over your DPP URLs. You can set up your own resolver that redirects QR codes to your product pages.')}
                  </p>
                </div>

                <div className="space-y-6">
                  {/* URL Resolver Selection */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">{t('URL Resolver')}</Label>
                    <div className="grid gap-3">
                      <label
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          localDomainSettings.resolver === 'gs1'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resolver"
                          value="gs1"
                          checked={localDomainSettings.resolver === 'gs1'}
                          onChange={() => setLocalDomainSettings({ ...localDomainSettings, resolver: 'gs1', useCustomDomain: false })}
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

                      <label
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          localDomainSettings.resolver === 'local'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resolver"
                          value="local"
                          checked={localDomainSettings.resolver === 'local'}
                          onChange={() => setLocalDomainSettings({ ...localDomainSettings, resolver: 'local', useCustomDomain: false })}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-medium flex items-center gap-2">
                            {t('Local Product Pages')}
                            <Badge variant="default">{t('New')}</Badge>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('Uses the built-in public DPP pages of this application')}
                          </p>
                          <p className="text-xs font-mono mt-1 text-muted-foreground">
                            {window.location.origin}/p/GTIN/SERIAL
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                          localDomainSettings.resolver === 'custom'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resolver"
                          value="custom"
                          checked={localDomainSettings.resolver === 'custom'}
                          onChange={() => setLocalDomainSettings({ ...localDomainSettings, resolver: 'custom', useCustomDomain: true })}
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
                  </div>

                  {/* Custom Domain Settings */}
                  {localDomainSettings.resolver === 'custom' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label>{t('Your Domain')} *</Label>
                        <Input
                          placeholder="e.g. dpp.your-company.com"
                          value={localDomainSettings.customDomain}
                          onChange={(e) => handleDomainChange(e.target.value)}
                          className={domainError ? 'border-destructive' : ''}
                        />
                        {domainError ? (
                          <p className="text-xs text-destructive">{domainError}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {t('Enter domain only without https://')}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>{t('Path Prefix (optional)')}</Label>
                        <Input
                          placeholder="e.g. products or passport"
                          value={localDomainSettings.pathPrefix}
                          onChange={(e) => handlePathPrefixChange(e.target.value)}
                          className={pathPrefixError ? 'border-destructive' : ''}
                        />
                        {pathPrefixError ? (
                          <p className="text-xs text-destructive">{pathPrefixError}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {t('Inserted between domain and GS1 path')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useHttps"
                          checked={localDomainSettings.useHTTPS}
                          onCheckedChange={(checked: boolean) =>
                            setLocalDomainSettings({ ...localDomainSettings, useHTTPS: checked })
                          }
                        />
                        <Label htmlFor="useHttps">{t('Use HTTPS (recommended)')}</Label>
                      </div>

                      {/* Preview */}
                      {selectedProduct && (
                        <div className="p-3 bg-background rounded border">
                          <Label className="text-xs text-muted-foreground">{t('URL Preview')}:</Label>
                          <p className="font-mono text-sm break-all mt-1">
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
                              <code className="block mt-1 p-2 bg-muted rounded text-xs whitespace-pre">
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

                  {/* DPP Template Selection */}
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base font-medium flex items-center gap-2">
                        <LayoutTemplate className="h-4 w-4" />
                        {t('DPP Page Template')}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('Choose the design template for your public product pages')}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* Modern */}
                      <div
                        onClick={() => setLocalDomainSettings({ ...localDomainSettings, dppTemplate: 'modern' })}
                        className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                          localDomainSettings.dppTemplate === 'modern'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'hover:bg-muted/50 hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="flex flex-col items-center text-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{t('Modern')}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('Hero header, glassmorphism cards, animations')}
                            </p>
                          </div>
                          {localDomainSettings.dppTemplate === 'modern' && (
                            <Badge variant="default" className="text-xs">{t('Active')}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Classic */}
                      <div
                        onClick={() => setLocalDomainSettings({ ...localDomainSettings, dppTemplate: 'classic' })}
                        className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                          localDomainSettings.dppTemplate === 'classic'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'hover:bg-muted/50 hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="flex flex-col items-center text-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-foreground/70" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{t('Classic')}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('Clean cards, structured sections, professional')}
                            </p>
                          </div>
                          {localDomainSettings.dppTemplate === 'classic' && (
                            <Badge variant="default" className="text-xs">{t('Active')}</Badge>
                          )}
                        </div>
                      </div>

                      {/* Compact */}
                      <div
                        onClick={() => setLocalDomainSettings({ ...localDomainSettings, dppTemplate: 'compact' })}
                        className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                          localDomainSettings.dppTemplate === 'compact'
                            ? 'border-primary bg-primary/5 ring-2 ring-primary'
                            : 'hover:bg-muted/50 hover:border-muted-foreground/30'
                        }`}
                      >
                        <div className="flex flex-col items-center text-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                            <Smartphone className="h-5 w-5 text-foreground/70" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{t('Compact')}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('Tab layout, mobile-first, minimal whitespace')}
                            </p>
                          </div>
                          {localDomainSettings.dppTemplate === 'compact' && (
                            <Badge variant="default" className="text-xs">{t('Active')}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={saveDomainSettings}
                    className="w-full"
                    disabled={isSavingDomain || (localDomainSettings.resolver === 'custom' && !!domainError)}
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
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() => toggleProductSelection(product.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-3 ${
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
  );
}
