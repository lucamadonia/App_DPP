import { useState, useEffect, useRef } from 'react';
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
import { useBranding } from '@/contexts/BrandingContext';
import { validateDomain, validatePathPrefix, normalizeDomain } from '@/lib/domain-utils';

// QR-Code Einstellungen Interface (local state only for visual settings)
interface QRSettings {
  size: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  format: 'standard' | 'rounded' | 'dots';
  includeText: boolean;
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
  textPosition: 'bottom',
  logoEnabled: false,
  logoUrl: '',
  logoSize: 20,
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
};

export function QRGeneratorPage() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<ProductListItem | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [domainSaved, setDomainSaved] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [pathPrefixError, setPathPrefixError] = useState<string | null>(null);

  // Get branding context for QR code domain settings
  const { qrCodeSettings, updateQRCodeSettings } = useBranding();

  // Local domain settings state (synced with context)
  const [localDomainSettings, setLocalDomainSettings] = useState({
    customDomain: qrCodeSettings.customDomain || '',
    useCustomDomain: qrCodeSettings.resolver === 'custom',
    useHTTPS: qrCodeSettings.useHttps,
    pathPrefix: qrCodeSettings.pathPrefix,
    resolver: qrCodeSettings.resolver as 'custom' | 'gs1' | 'local',
    foregroundColor: qrCodeSettings.foregroundColor,
    backgroundColor: qrCodeSettings.backgroundColor,
  });

  // QR visual settings (local state)
  const [qrSettings, setQRSettings] = useState<QRSettings>(() => {
    const saved = localStorage.getItem('dpp-qr-settings');
    return saved ? JSON.parse(saved) : defaultQRSettings;
  });
  const [activeTab, setActiveTab] = useState('preview');
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // Save QR visual settings to localStorage
  useEffect(() => {
    localStorage.setItem('dpp-qr-settings', JSON.stringify(qrSettings));
  }, [qrSettings]);

  // Generiere die DPP-URL basierend auf den Einstellungen
  const generateDPPUrl = (product: ProductListItem, forCustoms = false) => {
    const protocol = localDomainSettings.useHTTPS ? 'https' : 'http';
    const customsParam = forCustoms ? '?view=zoll' : '';

    // Lokale öffentliche Seiten
    if (localDomainSettings.resolver === 'local') {
      return `${window.location.origin}/p/${product.gtin}/${product.serial}${customsParam}`;
    }

    if (localDomainSettings.resolver === 'gs1') {
      return `https://id.gs1.org/01/${product.gtin}/21/${product.serial}`;
    }

    if (localDomainSettings.useCustomDomain && localDomainSettings.customDomain) {
      const domain = localDomainSettings.customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const prefix = localDomainSettings.pathPrefix ? `/${localDomainSettings.pathPrefix.replace(/^\/|\/$/g, '')}` : '';
      return `${protocol}://${domain}${prefix}/p/${product.gtin}/${product.serial}${customsParam}`;
    }

    return `${window.location.origin}/p/${product.gtin}/${product.serial}${customsParam}`;
  };

  // Lokale Vorschau-URL
  const localPreviewUrl = selectedProduct ? `${window.location.origin}/p/${selectedProduct.gtin}/${selectedProduct.serial}` : '';
  const localCustomsUrl = selectedProduct ? `${localPreviewUrl}?view=zoll` : '';

  const dppUrl = selectedProduct ? generateDPPUrl(selectedProduct) : '';
  const gs1Url = selectedProduct ? `https://id.gs1.org/01/${selectedProduct.gtin}/21/${selectedProduct.serial}` : '';

  // Generiere QR-Code
  useEffect(() => {
    if (!dppUrl) return;

    const generateQR = async () => {
      try {
        const options = {
          width: qrSettings.size,
          margin: qrSettings.margin,
          color: {
            dark: localDomainSettings.foregroundColor || '#000000',
            light: localDomainSettings.backgroundColor || '#FFFFFF',
          },
          errorCorrectionLevel: qrSettings.errorCorrection,
        };

        const url = await QRCode.toDataURL(dppUrl, options);
        setQrDataUrl(url);

        // Auch auf Canvas zeichnen für erweiterte Funktionen
        if (canvasRef.current) {
          await QRCode.toCanvas(canvasRef.current, dppUrl, options);
        }
      } catch (err) {
        console.error('QR Code generation failed:', err);
      }
    };

    generateQR();
  }, [dppUrl, qrSettings, localDomainSettings.foregroundColor, localDomainSettings.backgroundColor]);

  // Kopieren-Funktion
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setCopiedField(field);
    setTimeout(() => {
      setCopied(false);
      setCopiedField('');
    }, 2000);
  };

  // Download-Funktionen
  const downloadQR = async (format: 'png' | 'svg' | 'pdf') => {
    if (!selectedProduct) return;
    const filename = `qr-${selectedProduct.gtin}-${selectedProduct.serial}`;

    if (format === 'png') {
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = qrDataUrl;
      link.click();
    } else if (format === 'svg') {
      const svgString = await QRCode.toString(dppUrl, {
        type: 'svg',
        width: qrSettings.size,
        margin: qrSettings.margin,
        color: {
          dark: localDomainSettings.foregroundColor || '#000000',
          light: localDomainSettings.backgroundColor || '#FFFFFF',
        },
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${filename}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  // Batch-Download
  const downloadBatch = async () => {
    const productsToExport = selectedProducts.length > 0
      ? products.filter(p => selectedProducts.includes(p.id))
      : products;

    for (const product of productsToExport) {
      const url = generateDPPUrl(product);
      const dataUrl = await QRCode.toDataURL(url, {
        width: qrSettings.size,
        margin: qrSettings.margin,
        color: {
          dark: localDomainSettings.foregroundColor || '#000000',
          light: localDomainSettings.backgroundColor || '#FFFFFF',
        },
      });

      const link = document.createElement('a');
      link.download = `qr-${product.gtin}-${product.serial}.png`;
      link.href = dataUrl;
      link.click();

      // Kleine Verzögerung zwischen Downloads
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  // Produkte filtern
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.gtin.includes(searchTerm) ||
    p.serial.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle Produkt-Auswahl für Batch
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
    setLocalDomainSettings({ ...localDomainSettings, pathPrefix: value });

    if (value) {
      const validation = validatePathPrefix(value);
      setPathPrefixError(validation.isValid ? null : validation.errorMessage || null);
    } else {
      setPathPrefixError(null);
    }
  };

  // Einstellungen in Datenbank speichern
  const saveDomainSettings = async () => {
    // Validate before saving
    if (localDomainSettings.resolver === 'custom') {
      const domainValidation = validateDomain(localDomainSettings.customDomain);
      if (!domainValidation.isValid) {
        setDomainError(domainValidation.errorMessage || 'Ungültige Domain');
        return;
      }

      if (localDomainSettings.pathPrefix) {
        const prefixValidation = validatePathPrefix(localDomainSettings.pathPrefix);
        if (!prefixValidation.isValid) {
          setPathPrefixError(prefixValidation.errorMessage || 'Ungültiger Pfad');
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
    });

    if (success) {
      setDomainSaved(true);
      setTimeout(() => setDomainSaved(false), 2000);
    } else {
      alert('Fehler beim Speichern der Einstellungen');
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">QR-Code Generator</h1>
          <p className="text-muted-foreground">
            Erstellen Sie QR-Codes für Ihre Digital Product Passports mit Ihrer eigenen Domain
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActiveTab('domain')}>
            <Globe className="mr-2 h-4 w-4" />
            Domain-Einstellungen
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Keine Produkte vorhanden</h3>
            <p className="text-muted-foreground mt-1">
              Erstellen Sie zuerst Produkte, um QR-Codes zu generieren.
            </p>
          </CardContent>
        </Card>
      ) : (
      <>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Produkt-Auswahl */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Produkt auswählen</span>
              <Badge variant="secondary">{filteredProducts.length}</Badge>
            </CardTitle>
            <CardDescription>Wählen Sie ein Produkt für den QR-Code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Produkt, GTIN oder Seriennummer suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
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
                      <p className="text-xs font-mono text-muted-foreground">
                        S/N: {product.serial}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{product.category}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* QR-Code Vorschau & Einstellungen */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>QR-Code Generator</CardTitle>
                <CardDescription>{selectedProduct?.name || 'Kein Produkt ausgewählt'}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={localDomainSettings.useCustomDomain ? 'default' : 'secondary'}>
                  {localDomainSettings.useCustomDomain ? (
                    <>
                      <Globe className="mr-1 h-3 w-3" />
                      Custom Domain
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-1 h-3 w-3" />
                      GS1 Digital Link
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
                  Vorschau
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <Settings className="mr-2 h-4 w-4" />
                  QR-Einstellungen
                </TabsTrigger>
                <TabsTrigger value="domain">
                  <Globe className="mr-2 h-4 w-4" />
                  Domain
                </TabsTrigger>
              </TabsList>

              {/* Vorschau Tab */}
              <TabsContent value="preview" className="space-y-6">
                <div className="flex justify-center">
                  <div
                    className="bg-white p-6 rounded-lg border-2 shadow-lg"
                    style={{ backgroundColor: localDomainSettings.backgroundColor }}
                  >
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Code"
                        style={{ width: qrSettings.size, height: qrSettings.size }}
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center bg-muted rounded"
                        style={{ width: qrSettings.size, height: qrSettings.size }}
                      >
                        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    {qrSettings.includeText && selectedProduct && (
                      <p className="text-center text-xs font-mono mt-2" style={{ color: localDomainSettings.foregroundColor }}>
                        {selectedProduct.gtin}
                      </p>
                    )}
                  </div>
                </div>

                {/* Download Buttons */}
                <div className="flex justify-center gap-2">
                  <Button variant="outline" onClick={() => downloadQR('png')}>
                    <Download className="mr-2 h-4 w-4" />
                    PNG
                  </Button>
                  <Button variant="outline" onClick={() => downloadQR('svg')}>
                    <Download className="mr-2 h-4 w-4" />
                    SVG
                  </Button>
                  <Button variant="outline" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button variant="outline" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    EPS
                  </Button>
                </div>

                <Separator />

                {/* URL-Anzeige */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      DPP URL (wird im QR-Code verwendet)
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
                      GS1 Digital Link (Standard)
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

                  {/* Vorschau-Links für lokale Seiten */}
                  {selectedProduct && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-green-800 dark:text-green-200">
                        <Eye className="h-4 w-4" />
                        Öffentliche Seiten testen
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <a href={localPreviewUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Verbraucheransicht
                          </a>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={localCustomsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Zollansicht
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* GS1 Digital Link Struktur */}
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      GS1 Digital Link Struktur
                    </h4>
                    <div className="font-mono text-xs space-y-1">
                      <p><span className="text-blue-500">01</span> = GTIN (Global Trade Item Number)</p>
                      <p><span className="text-green-500">21</span> = Seriennummer</p>
                      <p><span className="text-orange-500">10</span> = Batch/Lot (optional)</p>
                      <p><span className="text-purple-500">17</span> = Verfallsdatum (optional)</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* QR-Einstellungen Tab */}
              <TabsContent value="settings" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Größe */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Größe
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
                      <span className="text-sm text-muted-foreground">px (benutzerdefiniert)</span>
                    </div>
                  </div>

                  {/* Fehlerkorrektur */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Fehlerkorrektur
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
                        <SelectItem value="L">L - Low (7%)</SelectItem>
                        <SelectItem value="M">M - Medium (15%)</SelectItem>
                        <SelectItem value="Q">Q - Quartile (25%)</SelectItem>
                        <SelectItem value="H">H - High (30%)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Höhere Korrektur = größerer QR-Code, aber bessere Lesbarkeit bei Beschädigung
                    </p>
                  </div>

                  {/* Farben */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Farben
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Vordergrund</Label>
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
                        <Label className="text-sm text-muted-foreground">Hintergrund</Label>
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

                  {/* Rand */}
                  <div className="space-y-4">
                    <h3 className="font-medium">Rand (Quiet Zone)</h3>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={qrSettings.margin}
                        onChange={(e) => setQRSettings({ ...qrSettings, margin: parseInt(e.target.value) || 0 })}
                        className="w-24"
                        min={0}
                        max={10}
                      />
                      <span className="text-sm text-muted-foreground">Module</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mindestens 2 Module werden für optimale Lesbarkeit empfohlen
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Erweiterte Optionen */}
                <div className="space-y-4">
                  <h3 className="font-medium">Erweiterte Optionen</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeText"
                      checked={qrSettings.includeText}
                      onCheckedChange={(checked: boolean) =>
                        setQRSettings({ ...qrSettings, includeText: checked })
                      }
                    />
                    <Label htmlFor="includeText">GTIN unter QR-Code anzeigen</Label>
                  </div>
                </div>

                {/* Voreinstellungen */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setQRSettings(defaultQRSettings)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Zurücksetzen
                  </Button>
                </div>
              </TabsContent>

              {/* Domain-Einstellungen Tab */}
              <TabsContent value="domain" className="space-y-6">
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

                <div className="space-y-6">
                  {/* URL-Resolver Auswahl */}
                  <div className="space-y-4">
                    <Label className="text-base font-medium">URL-Resolver</Label>
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
                            Lokale Produktseiten
                            <Badge variant="default">Neu</Badge>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Nutzt die integrierten öffentlichen DPP-Seiten dieser Anwendung
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
                            Eigene Domain
                            <Badge variant="outline">Custom</Badge>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Verwenden Sie Ihre eigene Domain für DPP-URLs
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Custom Domain Einstellungen */}
                  {localDomainSettings.resolver === 'custom' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label>Ihre Domain *</Label>
                        <Input
                          placeholder="z.B. dpp.ihre-firma.de"
                          value={localDomainSettings.customDomain}
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

                      <div className="space-y-2">
                        <Label>Pfad-Präfix (optional)</Label>
                        <Input
                          placeholder="z.B. products oder passport"
                          value={localDomainSettings.pathPrefix}
                          onChange={(e) => handlePathPrefixChange(e.target.value)}
                          className={pathPrefixError ? 'border-destructive' : ''}
                        />
                        {pathPrefixError ? (
                          <p className="text-xs text-destructive">{pathPrefixError}</p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Wird zwischen Domain und GS1-Pfad eingefügt
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
                        <Label htmlFor="useHttps">HTTPS verwenden (empfohlen)</Label>
                      </div>

                      {/* Vorschau */}
                      {selectedProduct && (
                        <div className="p-3 bg-background rounded border">
                          <Label className="text-xs text-muted-foreground">URL-Vorschau:</Label>
                          <p className="font-mono text-sm break-all mt-1">
                            {generateDPPUrl(selectedProduct)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* DNS-Einrichtung Anleitung */}
                  {localDomainSettings.resolver === 'custom' && localDomainSettings.customDomain && (
                    <Accordion type="single" collapsible>
                      <AccordionItem value="setup">
                        <AccordionTrigger>
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Einrichtungsanleitung
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 text-sm">
                            <div>
                              <h5 className="font-medium mb-2">1. DNS-Eintrag erstellen</h5>
                              <p className="text-muted-foreground">
                                Erstellen Sie einen CNAME oder A-Record für Ihre Subdomain:
                              </p>
                              <code className="block mt-1 p-2 bg-muted rounded text-xs">
                                {localDomainSettings.customDomain} CNAME your-dpp-server.com
                              </code>
                            </div>

                            <div>
                              <h5 className="font-medium mb-2">2. SSL-Zertifikat</h5>
                              <p className="text-muted-foreground">
                                Stellen Sie sicher, dass ein gültiges SSL-Zertifikat für HTTPS vorhanden ist
                                (z.B. über Let's Encrypt).
                              </p>
                            </div>

                            <div>
                              <h5 className="font-medium mb-2">3. Resolver einrichten</h5>
                              <p className="text-muted-foreground">
                                Ihr Server muss GS1 Digital Link URLs parsen und zur entsprechenden
                                Produktseite weiterleiten.
                              </p>
                              <code className="block mt-1 p-2 bg-muted rounded text-xs whitespace-pre">
{`// Beispiel Express.js Route
app.get('/01/:gtin/21/:serial', (req, res) => {
  const { gtin, serial } = req.params;
  // Produkt suchen und DPP anzeigen
  res.redirect(\`/product/\${gtin}?serial=\${serial}\`);
});`}
                              </code>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}

                  {/* Speichern Button */}
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
                    {domainSaved ? 'Gespeichert!' : 'Domain-Einstellungen speichern'}
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
              Batch-Export
            </span>
            {selectedProducts.length > 0 && (
              <Badge>{selectedProducts.length} ausgewählt</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Exportieren Sie QR-Codes für mehrere Produkte gleichzeitig
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
                  Auswahl aufheben
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Alle auswählen
                </>
              )}
            </Button>
            <Button onClick={downloadBatch} disabled={selectedProducts.length === 0 && products.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              {selectedProducts.length > 0
                ? `${selectedProducts.length} QR-Codes herunterladen`
                : 'Alle QR-Codes herunterladen'}
            </Button>
          </div>

          {/* Produkt-Auswahl für Batch */}
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

      {/* Hidden Canvas für erweiterte QR-Code Generierung */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
