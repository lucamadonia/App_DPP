import { useState } from 'react';
import {
  QrCode,
  Download,
  Copy,
  Check,
  Settings,
  Palette,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const products = [
  { id: '1', name: 'Eco Sneaker Pro', gtin: '4012345678901', serial: 'GSP-2024-001234' },
  { id: '2', name: 'Solar Powerbank 20000', gtin: '4098765432101', serial: 'ETS-PB-2024-5678' },
  { id: '3', name: 'Bio Cotton T-Shirt', gtin: '4056789012345', serial: 'BCT-2024-9012' },
];

export function QRGeneratorPage() {
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [qrSize, setQrSize] = useState(256);
  const [copied, setCopied] = useState(false);

  const dppUrl = `https://dpp.example.com/01/${selectedProduct.gtin}/21/${selectedProduct.serial}`;
  const gs1Url = `https://id.gs1.org/01/${selectedProduct.gtin}/21/${selectedProduct.serial}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">QR-Code Generator</h1>
        <p className="text-muted-foreground">
          Erstellen Sie QR-Codes für Ihre Digital Product Passports
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Produkt-Auswahl */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Produkt auswählen</CardTitle>
            <CardDescription>Wählen Sie ein Produkt für den QR-Code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Produkt suchen..." />
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProduct.id === product.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    GTIN: {product.gtin}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* QR-Code Vorschau */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>QR-Code</CardTitle>
                <CardDescription>{selectedProduct.name}</CardDescription>
              </div>
              <Badge variant="secondary">
                <Link2 className="mr-1 h-3 w-3" />
                GS1 Digital Link
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="preview">
              <TabsList className="mb-4">
                <TabsTrigger value="preview">Vorschau</TabsTrigger>
                <TabsTrigger value="settings">Einstellungen</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="space-y-6">
                <div className="flex justify-center">
                  <div
                    className="bg-white p-6 rounded-lg border shadow-sm"
                    style={{ width: qrSize + 48, height: qrSize + 48 }}
                  >
                    <div
                      className="w-full h-full bg-muted rounded flex items-center justify-center"
                      style={{ width: qrSize, height: qrSize }}
                    >
                      <QrCode className="text-muted-foreground" style={{ width: qrSize * 0.6, height: qrSize * 0.6 }} />
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    PNG
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    SVG
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    EPS
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">DPP URL</label>
                    <div className="flex gap-2">
                      <Input value={dppUrl} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="icon" onClick={() => handleCopy(dppUrl)}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">GS1 Digital Link</label>
                    <div className="flex gap-2">
                      <Input value={gs1Url} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="icon" onClick={() => handleCopy(gs1Url)}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Größe
                    </h3>
                    <div className="grid grid-cols-4 gap-2">
                      {[128, 256, 512, 1024].map((size) => (
                        <Button
                          key={size}
                          variant={qrSize === size ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setQrSize(size)}
                        >
                          {size}px
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Farben
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Vordergrund</label>
                        <div className="flex gap-2">
                          <div className="h-10 w-10 rounded border bg-black" />
                          <Input defaultValue="#000000" className="font-mono" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">Hintergrund</label>
                        <div className="flex gap-2">
                          <div className="h-10 w-10 rounded border bg-white" />
                          <Input defaultValue="#FFFFFF" className="font-mono" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Format</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <input type="radio" name="format" defaultChecked className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Standard QR-Code</p>
                        <p className="text-sm text-muted-foreground">Klassisches Format</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-muted/50">
                      <input type="radio" name="format" className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Mit Logo</p>
                        <p className="text-sm text-muted-foreground">Firmenlogo im Zentrum</p>
                      </div>
                    </label>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Batch Export */}
      <Card>
        <CardHeader>
          <CardTitle>Batch-Export</CardTitle>
          <CardDescription>
            Exportieren Sie QR-Codes für mehrere Produkte gleichzeitig
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button variant="outline">
              Alle Produkte auswählen
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Batch-Download (ZIP)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
