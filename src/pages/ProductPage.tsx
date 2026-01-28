import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  QrCode,
  Download,
  ExternalLink,
  Package,
  Leaf,
  ShieldCheck,
  FileText,
  History,
  Recycle,
  MapPin,
  Award,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import type { Product } from '@/types/product';

// Demo-Produkt
const demoProducts: Record<string, Product> = {
  '1': {
    id: '1',
    name: 'Eco Sneaker Pro',
    manufacturer: 'GreenStep GmbH',
    gtin: '4012345678901',
    serialNumber: 'GSP-2024-001234',
    productionDate: '2024-06-15',
    category: 'Textil / Schuhe',
    description:
      'Der Eco Sneaker Pro ist ein nachhaltiger Freizeitschuh, hergestellt aus recycelten PET-Flaschen, Bio-Baumwolle und Naturkautschuk. Jedes Paar spart durchschnittlich 12 Plastikflaschen vor der Umweltverschmutzung.',
    materials: [
      { name: 'Recyceltes PET', percentage: 60, recyclable: true, origin: 'Deutschland' },
      { name: 'Bio-Baumwolle', percentage: 25, recyclable: true, origin: 'Portugal' },
      { name: 'Naturkautschuk', percentage: 15, recyclable: true, origin: 'Thailand' },
    ],
    certifications: [
      { name: 'EU Ecolabel', issuedBy: 'European Commission', validUntil: '2026-12-31' },
      { name: 'OEKO-TEX Standard 100', issuedBy: 'OEKO-TEX', validUntil: '2025-06-30' },
      { name: 'Fair Trade', issuedBy: 'Fairtrade International', validUntil: '2025-12-31' },
    ],
    carbonFootprint: {
      totalKgCO2: 8.5,
      productionKgCO2: 5.2,
      transportKgCO2: 3.3,
      rating: 'A',
    },
    recyclability: {
      recyclablePercentage: 85,
      instructions:
        'Die Schuhe können bei teilnehmenden Händlern oder lokalen Textilsammelstellen abgegeben werden.',
      disposalMethods: ['Textilsammlung', 'Herstellerücknahme', 'Secondhand-Abgabe'],
    },
    supplyChain: [
      { step: 1, location: 'Hamburg', country: 'Deutschland', date: '2024-06-01', description: 'Materialanlieferung' },
      { step: 2, location: 'Porto', country: 'Portugal', date: '2024-06-03', description: 'Bio-Baumwolle Verarbeitung' },
      { step: 3, location: 'Berlin', country: 'Deutschland', date: '2024-06-10', description: 'Produktion' },
      { step: 4, location: 'München', country: 'Deutschland', date: '2024-06-15', description: 'Qualitätskontrolle' },
    ],
  },
};

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const product = id ? demoProducts[id] || demoProducts['1'] : demoProducts['1'];

  const complianceScore = 95;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
              <Badge className="bg-success text-success-foreground">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Live
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {product.manufacturer} · {product.category}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <QrCode className="mr-2 h-4 w-4" />
            QR-Code
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
        </div>
      </div>

      {/* Compliance Status Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-success" />
                <span className="font-medium">Konformitäts-Status</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={complianceScore} className="h-2 w-48" />
                <span className="text-sm font-medium text-success">{complianceScore}%</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                12 erfüllt
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-warning" />
                1 ausstehend
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="stammdaten" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="stammdaten" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stammdaten
          </TabsTrigger>
          <TabsTrigger value="nachhaltigkeit" className="flex items-center gap-2">
            <Leaf className="h-4 w-4" />
            Nachhaltigkeit
          </TabsTrigger>
          <TabsTrigger value="konformitaet" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Konformität
          </TabsTrigger>
          <TabsTrigger value="dokumente" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Dokumente
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2">
            <QrCode className="h-4 w-4" />
            QR & Zugriff
          </TabsTrigger>
          <TabsTrigger value="historie" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historie
          </TabsTrigger>
        </TabsList>

        {/* Stammdaten Tab */}
        <TabsContent value="stammdaten" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Produktinformationen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Produktname</p>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hersteller</p>
                    <p className="font-medium">{product.manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GTIN/EAN</p>
                    <code className="font-mono text-sm">{product.gtin}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Seriennummer</p>
                    <code className="font-mono text-sm">{product.serialNumber}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Kategorie</p>
                    <p className="font-medium">{product.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Produktionsdatum</p>
                    <p className="font-medium">
                      {new Date(product.productionDate).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Beschreibung</p>
                  <p className="text-sm">{product.description}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Produktbild</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                  <div className="text-6xl font-bold text-muted-foreground/30">
                    {product.name.charAt(0)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Nachhaltigkeit Tab */}
        <TabsContent value="nachhaltigkeit" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Materialzusammensetzung */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="h-5 w-5 text-success" />
                  Materialzusammensetzung
                </CardTitle>
                <CardDescription>Anteil und Herkunft der verwendeten Materialien</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.materials.map((material, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{material.name}</span>
                      <span className="text-muted-foreground">{material.percentage}%</span>
                    </div>
                    <Progress value={material.percentage} className="h-2" />
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {material.origin && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {material.origin}
                        </span>
                      )}
                      {material.recyclable && (
                        <Badge variant="outline" className="text-success border-success">
                          <Recycle className="mr-1 h-3 w-3" />
                          Recycelbar
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* CO2-Fußabdruck */}
            {product.carbonFootprint && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-success" />
                    CO2-Fußabdruck
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-3">
                      <span className="text-2xl font-bold text-success">
                        {product.carbonFootprint.rating}
                      </span>
                    </div>
                    <div className="text-3xl font-bold">{product.carbonFootprint.totalKgCO2} kg</div>
                    <div className="text-muted-foreground">CO2 gesamt</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                      <span>Produktion</span>
                      <span className="font-medium">{product.carbonFootprint.productionKgCO2} kg</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                      <span>Transport</span>
                      <span className="font-medium">{product.carbonFootprint.transportKgCO2} kg</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recycling */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="h-5 w-5 text-success" />
                  Recycling & Entsorgung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 rounded-lg bg-success/10">
                    <div className="text-3xl font-bold text-success">
                      {product.recyclability.recyclablePercentage}%
                    </div>
                    <div className="text-sm text-muted-foreground">Recycelbar</div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Entsorgungshinweise</p>
                      <p className="text-sm">{product.recyclability.instructions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Entsorgungsmethoden</p>
                      <div className="flex flex-wrap gap-2">
                        {product.recyclability.disposalMethods.map((method, index) => (
                          <Badge key={index} variant="secondary">
                            {method}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Konformität Tab */}
        <TabsContent value="konformitaet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-warning" />
                Zertifizierungen
              </CardTitle>
              <CardDescription>Gültige Zertifikate und Konformitätserklärungen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {product.certifications.map((cert, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                        <Award className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="font-medium">{cert.name}</p>
                        <p className="text-sm text-muted-foreground">{cert.issuedBy}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Gültig bis</p>
                        <p className="font-medium">
                          {new Date(cert.validUntil).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dokumente Tab */}
        <TabsContent value="dokumente">
          <Card>
            <CardHeader>
              <CardTitle>Dokumente & Zertifikate</CardTitle>
              <CardDescription>Alle hochgeladenen Dokumente zu diesem Produkt</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                <div className="text-center">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Dateien hierher ziehen oder klicken zum Hochladen
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR & Zugriff Tab */}
        <TabsContent value="qr" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>QR-Code</CardTitle>
                <CardDescription>Scannen für den öffentlichen DPP</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-square max-w-xs mx-auto rounded-lg bg-white p-8 border">
                  <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                    <QrCode className="h-32 w-32 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 justify-center">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    PNG
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    SVG
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Öffentlicher Link</CardTitle>
                <CardDescription>GS1 Digital Link Format</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted font-mono text-sm break-all">
                  https://id.gs1.org/01/{product.gtin}/21/{product.serialNumber}
                </div>
                <Button className="w-full" variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Öffentliche Ansicht öffnen
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Historie Tab */}
        <TabsContent value="historie">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Lieferkette & Audit-Log
              </CardTitle>
              <CardDescription>Vollständige Nachverfolgbarkeit</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                <div className="space-y-6">
                  {product.supplyChain.map((entry, index) => (
                    <div key={index} className="relative pl-10">
                      <div className="absolute left-2 w-5 h-5 bg-primary rounded-full border-4 border-background" />
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">
                            Schritt {entry.step}: {entry.description}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(entry.date).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {entry.location}, {entry.country}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
