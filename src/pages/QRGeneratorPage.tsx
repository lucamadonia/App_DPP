import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Settings,
  Palette,
  Link2,
  Globe,
  Save,
  RefreshCw,
  Image,
  FileText,
  Trash2,
  Plus,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Eye,
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

// Produkte aus der "Datenbank"
const products = [
  { id: '1', name: 'Eco Sneaker Pro', gtin: '4012345678901', serial: 'GSP-2024-001234', batch: 'B2024-001', category: 'Textilien' },
  { id: '2', name: 'Solar Powerbank 20000', gtin: '4098765432101', serial: 'ETS-PB-2024-5678', batch: 'B2024-002', category: 'Elektronik' },
  { id: '3', name: 'Bio Cotton T-Shirt', gtin: '4056789012345', serial: 'BCT-2024-9012', batch: 'B2024-003', category: 'Textilien' },
  { id: '4', name: 'LED Smart Bulb E27', gtin: '4023456789012', serial: 'LSB-2024-3456', batch: 'B2024-004', category: 'Beleuchtung' },
  { id: '5', name: 'Bamboo Cutting Board', gtin: '4034567890123', serial: 'BCB-2024-7890', batch: 'B2024-005', category: 'Lebensmittelkontakt' },
];

// Domain-Einstellungen Interface
interface DomainSettings {
  customDomain: string;
  useCustomDomain: boolean;
  useGS1: boolean;
  useHTTPS: boolean;
  pathPrefix: string;
  resolver: 'custom' | 'gs1' | 'id' | 'local';
}

// QR-Code Einstellungen Interface
interface QRSettings {
  size: number;
  errorCorrection: 'L' | 'M' | 'Q' | 'H';
  foregroundColor: string;
  backgroundColor: string;
  margin: number;
  format: 'standard' | 'rounded' | 'dots';
  includeText: boolean;
  textPosition: 'top' | 'bottom';
  logoEnabled: boolean;
  logoUrl: string;
  logoSize: number;
}

// Standardwerte
const defaultDomainSettings: DomainSettings = {
  customDomain: '',
  useCustomDomain: false,
  useGS1: true,
  useHTTPS: true,
  pathPrefix: '',
  resolver: 'gs1',
};

const defaultQRSettings: QRSettings = {
  size: 256,
  errorCorrection: 'M',
  foregroundColor: '#000000',
  backgroundColor: '#FFFFFF',
  margin: 2,
  format: 'standard',
  includeText: false,
  textPosition: 'bottom',
  logoEnabled: false,
  logoUrl: '',
  logoSize: 20,
};

export function QRGeneratorPage() {
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [domainSettings, setDomainSettings] = useState<DomainSettings>(() => {
    const saved = localStorage.getItem('dpp-domain-settings');
    return saved ? JSON.parse(saved) : defaultDomainSettings;
  });
  const [qrSettings, setQRSettings] = useState<QRSettings>(() => {
    const saved = localStorage.getItem('dpp-qr-settings');
    return saved ? JSON.parse(saved) : defaultQRSettings;
  });
  const [activeTab, setActiveTab] = useState('preview');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Speichere Einstellungen in localStorage
  useEffect(() => {
    localStorage.setItem('dpp-domain-settings', JSON.stringify(domainSettings));
  }, [domainSettings]);

  useEffect(() => {
    localStorage.setItem('dpp-qr-settings', JSON.stringify(qrSettings));
  }, [qrSettings]);

  // Generiere die DPP-URL basierend auf den Einstellungen
  const generateDPPUrl = (product: typeof products[0], forCustoms = false) => {
    const protocol = domainSettings.useHTTPS ? 'https' : 'http';
    const customsParam = forCustoms ? '?view=zoll' : '';

    // Lokale öffentliche Seiten
    if (domainSettings.resolver === 'local') {
      return `${window.location.origin}/p/${product.gtin}/${product.serial}${customsParam}`;
    }

    if (domainSettings.resolver === 'gs1') {
      return `https://id.gs1.org/01/${product.gtin}/21/${product.serial}`;
    }

    if (domainSettings.useCustomDomain && domainSettings.customDomain) {
      const domain = domainSettings.customDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const prefix = domainSettings.pathPrefix ? `/${domainSettings.pathPrefix.replace(/^\/|\/$/g, '')}` : '';
      return `${protocol}://${domain}${prefix}/p/${product.gtin}/${product.serial}${customsParam}`;
    }

    return `${window.location.origin}/p/${product.gtin}/${product.serial}${customsParam}`;
  };

  // Generiere URL für Zollansicht
  const generateCustomsUrl = (product: typeof products[0]) => {
    return generateDPPUrl(product, true);
  };

  // Lokale Vorschau-URL
  const localPreviewUrl = `${window.location.origin}/p/${selectedProduct.gtin}/${selectedProduct.serial}`;
  const localCustomsUrl = `${localPreviewUrl}?view=zoll`;

  const dppUrl = generateDPPUrl(selectedProduct);
  const gs1Url = `https://id.gs1.org/01/${selectedProduct.gtin}/21/${selectedProduct.serial}`;

  // Generiere QR-Code
  useEffect(() => {
    const generateQR = async () => {
      try {
        const options = {
          width: qrSettings.size,
          margin: qrSettings.margin,
          color: {
            dark: qrSettings.foregroundColor,
            light: qrSettings.backgroundColor,
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
  }, [dppUrl, qrSettings]);

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
          dark: qrSettings.foregroundColor,
          light: qrSettings.backgroundColor,
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
          dark: qrSettings.foregroundColor,
          light: qrSettings.backgroundColor,
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

  // Einstellungen speichern
  const saveDomainSettings = () => {
    localStorage.setItem('dpp-domain-settings', JSON.stringify(domainSettings));
    alert('Domain-Einstellungen gespeichert!');
  };

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
                    selectedProduct.id === product.id
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
                <CardDescription>{selectedProduct.name}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant={domainSettings.useCustomDomain ? 'default' : 'secondary'}>
                  {domainSettings.useCustomDomain ? (
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
                    style={{ backgroundColor: qrSettings.backgroundColor }}
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
                    {qrSettings.includeText && (
                      <p className="text-center text-xs font-mono mt-2" style={{ color: qrSettings.foregroundColor }}>
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
                            value={qrSettings.foregroundColor}
                            onChange={(e) => setQRSettings({ ...qrSettings, foregroundColor: e.target.value })}
                            className="h-10 w-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={qrSettings.foregroundColor}
                            onChange={(e) => setQRSettings({ ...qrSettings, foregroundColor: e.target.value })}
                            className="font-mono"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-muted-foreground">Hintergrund</Label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={qrSettings.backgroundColor}
                            onChange={(e) => setQRSettings({ ...qrSettings, backgroundColor: e.target.value })}
                            className="h-10 w-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={qrSettings.backgroundColor}
                            onChange={(e) => setQRSettings({ ...qrSettings, backgroundColor: e.target.value })}
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
                          domainSettings.resolver === 'gs1'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resolver"
                          value="gs1"
                          checked={domainSettings.resolver === 'gs1'}
                          onChange={() => setDomainSettings({ ...domainSettings, resolver: 'gs1', useCustomDomain: false })}
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
                          domainSettings.resolver === 'local'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resolver"
                          value="local"
                          checked={domainSettings.resolver === 'local'}
                          onChange={() => setDomainSettings({ ...domainSettings, resolver: 'local', useCustomDomain: false })}
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
                          domainSettings.resolver === 'custom'
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="resolver"
                          value="custom"
                          checked={domainSettings.resolver === 'custom'}
                          onChange={() => setDomainSettings({ ...domainSettings, resolver: 'custom', useCustomDomain: true })}
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
                  {domainSettings.resolver === 'custom' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                      <div className="space-y-2">
                        <Label>Ihre Domain</Label>
                        <Input
                          placeholder="z.B. dpp.ihre-firma.de"
                          value={domainSettings.customDomain}
                          onChange={(e) => setDomainSettings({ ...domainSettings, customDomain: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Pfad-Präfix (optional)</Label>
                        <Input
                          placeholder="z.B. products oder passport"
                          value={domainSettings.pathPrefix}
                          onChange={(e) => setDomainSettings({ ...domainSettings, pathPrefix: e.target.value })}
                        />
                        <p className="text-xs text-muted-foreground">
                          Wird zwischen Domain und GS1-Pfad eingefügt
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="useHttps"
                          checked={domainSettings.useHTTPS}
                          onCheckedChange={(checked: boolean) =>
                            setDomainSettings({ ...domainSettings, useHTTPS: checked })
                          }
                        />
                        <Label htmlFor="useHttps">HTTPS verwenden (empfohlen)</Label>
                      </div>

                      {/* Vorschau */}
                      <div className="p-3 bg-background rounded border">
                        <Label className="text-xs text-muted-foreground">URL-Vorschau:</Label>
                        <p className="font-mono text-sm break-all mt-1">
                          {generateDPPUrl(selectedProduct)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* DNS-Einrichtung Anleitung */}
                  {domainSettings.resolver === 'custom' && domainSettings.customDomain && (
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
                                {domainSettings.customDomain} CNAME your-dpp-server.com
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
                  <Button onClick={saveDomainSettings} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    Domain-Einstellungen speichern
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

      {/* Hidden Canvas für erweiterte QR-Code Generierung */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
