import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Package,
  Leaf,
  Recycle,
  Award,
  Truck,
  MapPin,
  Download,
  Info,
  Building2,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { type Product } from '@/types/product';
import { type VisibilityConfigV2, isFieldVisibleForView, defaultVisibilityConfigV2 } from '@/types/visibility';
import { getProductByGtinSerial, getVisibilitySettings } from '@/services/api';

// Demo-Produktdaten (in Produktion aus API laden)
const demoProducts: Record<string, Product> = {
  '4012345678901-GSP-2024-001234': {
    id: '1',
    name: 'Eco Sneaker Pro',
    manufacturer: 'GreenStep Footwear GmbH',
    gtin: '4012345678901',
    serialNumber: 'GSP-2024-001234',
    productionDate: '2024-01-15',
    category: 'Textilien',
    description:
      'Nachhaltig produzierter Sneaker aus recycelten Materialien. Der Eco Sneaker Pro vereint Style mit Umweltbewusstsein - mit einer Sohle aus recyceltem Gummi und einem Obermaterial aus upgecycelten Plastikflaschen.',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    materials: [
      { name: 'Recyceltes Polyester', percentage: 45, recyclable: true, origin: 'Deutschland' },
      { name: 'Bio-Baumwolle', percentage: 30, recyclable: true, origin: 'Türkei' },
      { name: 'Recycelter Gummi', percentage: 20, recyclable: true, origin: 'Portugal' },
      { name: 'Naturkautschuk', percentage: 5, recyclable: true, origin: 'Vietnam' },
    ],
    certifications: [
      {
        name: 'OEKO-TEX Standard 100',
        issuedBy: 'OEKO-TEX Association',
        validUntil: '2025-12-31',
        certificateUrl: '/certificates/oeko-tex.pdf',
      },
      {
        name: 'EU Ecolabel',
        issuedBy: 'European Commission',
        validUntil: '2025-06-30',
        certificateUrl: '/certificates/eu-ecolabel.pdf',
      },
      {
        name: 'Fair Trade Certified',
        issuedBy: 'Fairtrade International',
        validUntil: '2025-09-15',
        certificateUrl: '/certificates/fairtrade.pdf',
      },
    ],
    carbonFootprint: {
      totalKgCO2: 8.5,
      productionKgCO2: 5.2,
      transportKgCO2: 3.3,
      rating: 'B',
    },
    recyclability: {
      recyclablePercentage: 85,
      instructions:
        'Trennen Sie Sohle und Obermaterial für optimales Recycling. Die Sohle kann im Gummirecycling entsorgt werden, das Obermaterial im Textilrecycling.',
      disposalMethods: ['Textilrecycling', 'Schuh-Rücknahmeprogramm', 'Gummirecycling'],
    },
    supplyChain: [
      {
        step: 1,
        location: 'Hamburg',
        country: 'Deutschland',
        date: '2024-01-10',
        description: 'Materialanlieferung',
      },
      {
        step: 2,
        location: 'Porto',
        country: 'Portugal',
        date: '2024-01-12',
        description: 'Fertigung',
      },
      {
        step: 3,
        location: 'München',
        country: 'Deutschland',
        date: '2024-01-15',
        description: 'Qualitätskontrolle',
      },
      {
        step: 4,
        location: 'Berlin',
        country: 'Deutschland',
        date: '2024-01-18',
        description: 'Distribution',
      },
    ],
    // Zollrelevante Felder
    hsCode: '6404.11.00',
    batchNumber: 'B2024-001',
    countryOfOrigin: 'Portugal',
    netWeight: 340,
    grossWeight: 520,
    manufacturerAddress: 'Industriestraße 42, 80339 München, Deutschland',
    manufacturerEORI: 'DE123456789012345',
    manufacturerVAT: 'DE123456789',
  },
  '4098765432101-ETS-PB-2024-5678': {
    id: '2',
    name: 'Solar Powerbank 20000',
    manufacturer: 'EcoTech Solutions AG',
    gtin: '4098765432101',
    serialNumber: 'ETS-PB-2024-5678',
    productionDate: '2024-02-20',
    category: 'Elektronik',
    description:
      'Leistungsstarke Powerbank mit integriertem Solarpanel. 20000mAh Kapazität für mehrfaches Aufladen Ihrer Geräte - auch unterwegs mit Sonnenenergie.',
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600',
    materials: [
      { name: 'Lithium-Ionen-Zellen', percentage: 50, recyclable: true, origin: 'Südkorea' },
      { name: 'Recyceltes Aluminium', percentage: 25, recyclable: true, origin: 'Deutschland' },
      { name: 'Solarzellen', percentage: 15, recyclable: true, origin: 'China' },
      { name: 'ABS-Kunststoff', percentage: 10, recyclable: true, origin: 'Deutschland' },
    ],
    certifications: [
      {
        name: 'CE-Kennzeichnung',
        issuedBy: 'EU Conformity',
        validUntil: '2026-12-31',
        certificateUrl: '/certificates/ce.pdf',
      },
      {
        name: 'RoHS Compliant',
        issuedBy: 'SGS',
        validUntil: '2025-08-15',
        certificateUrl: '/certificates/rohs.pdf',
      },
    ],
    carbonFootprint: {
      totalKgCO2: 12.3,
      productionKgCO2: 9.8,
      transportKgCO2: 2.5,
      rating: 'C',
    },
    recyclability: {
      recyclablePercentage: 78,
      instructions:
        'Bitte als Elektroschrott entsorgen. Die Lithium-Batterien müssen separat bei einer Sammelstelle abgegeben werden.',
      disposalMethods: ['Elektroschrott', 'Batteriesammelstelle'],
    },
    supplyChain: [
      {
        step: 1,
        location: 'Seoul',
        country: 'Südkorea',
        date: '2024-02-05',
        description: 'Batteriezellen-Fertigung',
      },
      {
        step: 2,
        location: 'Shenzhen',
        country: 'China',
        date: '2024-02-10',
        description: 'Montage',
      },
      {
        step: 3,
        location: 'Stuttgart',
        country: 'Deutschland',
        date: '2024-02-18',
        description: 'Qualitätsprüfung',
      },
    ],
    hsCode: '8507.60.00',
    batchNumber: 'B2024-002',
    countryOfOrigin: 'China',
    netWeight: 285,
    grossWeight: 380,
    manufacturerAddress: 'Technikweg 15, 70173 Stuttgart, Deutschland',
    manufacturerEORI: 'DE987654321098765',
    manufacturerVAT: 'DE987654321',
  },
};

// CO2-Rating Farben
const ratingColors: Record<string, string> = {
  A: 'bg-green-500',
  B: 'bg-lime-500',
  C: 'bg-yellow-500',
  D: 'bg-orange-500',
  E: 'bg-red-500',
};

const ratingDescriptions: Record<string, string> = {
  A: 'Sehr gut - deutlich unter Durchschnitt',
  B: 'Gut - unter Durchschnitt',
  C: 'Durchschnitt',
  D: 'Über Durchschnitt',
  E: 'Deutlich über Durchschnitt',
};

export function PublicProductPage() {
  const { gtin, serial } = useParams();
  const [searchParams] = useSearchParams();
  const isCustomsView = searchParams.get('view') === 'zoll';
  const [activeTab, setActiveTab] = useState(isCustomsView ? 'zoll' : 'verbraucher');
  const [visibilityV2, setVisibilityV2] = useState<VisibilityConfigV2 | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Lade Produkt und Sichtbarkeitseinstellungen von API
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Sichtbarkeit laden
      try {
        const visibility = await getVisibilitySettings();
        setVisibilityV2(visibility);
      } catch {
        setVisibilityV2(defaultVisibilityConfigV2);
      }

      // Produkt laden
      if (gtin && serial) {
        try {
          const apiProduct = await getProductByGtinSerial(gtin, serial);
          if (apiProduct) {
            setProduct(apiProduct);
          } else {
            // Fallback auf Demo-Daten
            const productKey = `${gtin}-${serial}`;
            setProduct(demoProducts[productKey] || null);
          }
        } catch {
          // Fallback auf Demo-Daten
          const productKey = `${gtin}-${serial}`;
          setProduct(demoProducts[productKey] || null);
        }
      }

      setLoading(false);
    }

    loadData();
  }, [gtin, serial]);

  // Tab-Änderung bei URL-Parameter
  useEffect(() => {
    if (isCustomsView) {
      setActiveTab('zoll');
    }
  }, [isCustomsView]);

  // Ladeanzeige
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h1 className="text-xl font-bold">Produktdaten werden geladen...</h1>
              <p className="text-muted-foreground">Bitte warten Sie einen Moment.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-destructive" />
              </div>
              <h1 className="text-xl font-bold">Produkt nicht gefunden</h1>
              <p className="text-muted-foreground">
                Das Produkt mit der GTIN <code className="font-mono bg-muted px-1 rounded">{gtin}</code> und
                Seriennummer <code className="font-mono bg-muted px-1 rounded">{serial}</code> wurde nicht gefunden.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prüfe ob ein Feld sichtbar ist basierend auf V2-Konfiguration
  const isFieldVisible = (field: string) => {
    if (!visibilityV2) return true; // Fallback: alles anzeigen
    const currentView = activeTab === 'zoll' ? 'customs' : 'consumer';
    return isFieldVisibleForView(visibilityV2, field, currentView);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Tab-Auswahl */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="verbraucher" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Verbraucher
          </TabsTrigger>
          <TabsTrigger value="zoll" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Zoll
          </TabsTrigger>
        </TabsList>

        {/* Verbraucheransicht */}
        <TabsContent value="verbraucher" className="space-y-6">
          {/* Produkt-Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {isFieldVisible('image') && product.imageUrl && (
                  <div className="w-full md:w-1/3">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  {isFieldVisible('name') && (
                    <h1 className="text-3xl font-bold">{product.name}</h1>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {isFieldVisible('category') && (
                      <Badge variant="secondary">{product.category}</Badge>
                    )}
                    {isFieldVisible('carbonRating') && product.carbonFootprint && (
                      <Badge className={`${ratingColors[product.carbonFootprint.rating]} text-white`}>
                        CO2-Rating: {product.carbonFootprint.rating}
                      </Badge>
                    )}
                  </div>
                  {isFieldVisible('manufacturer') && (
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {product.manufacturer}
                    </p>
                  )}
                  {isFieldVisible('description') && (
                    <p className="text-foreground">{product.description}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materialien */}
          {isFieldVisible('materials') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Materialzusammensetzung
                </CardTitle>
                <CardDescription>
                  Verwendete Materialien und deren Herkunft
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.materials.map((material, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{material.name}</span>
                        {material.recyclable && (
                          <Badge variant="outline" className="text-xs">
                            <Recycle className="h-3 w-3 mr-1" />
                            Recycelbar
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold">{material.percentage}%</span>
                    </div>
                    <Progress value={material.percentage} className="h-2" />
                    {isFieldVisible('materialOrigins') && material.origin && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Herkunft: {material.origin}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* CO2-Fußabdruck */}
          {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5" />
                  CO2-Fußabdruck
                </CardTitle>
                <CardDescription>
                  Klimaauswirkungen über den Produktlebenszyklus
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Rating */}
                <div className="flex items-center justify-center gap-4">
                  <div
                    className={`w-20 h-20 rounded-full ${ratingColors[product.carbonFootprint.rating]} text-white flex items-center justify-center text-4xl font-bold`}
                  >
                    {product.carbonFootprint.rating}
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {product.carbonFootprint.totalKgCO2} kg CO2
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {ratingDescriptions[product.carbonFootprint.rating]}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Aufschlüsselung */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{product.carbonFootprint.productionKgCO2} kg</p>
                    <p className="text-sm text-muted-foreground">Produktion</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{product.carbonFootprint.transportKgCO2} kg</p>
                    <p className="text-sm text-muted-foreground">Transport</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recycling */}
          {isFieldVisible('recyclability') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="h-5 w-5" />
                  Recycling & Entsorgung
                </CardTitle>
                <CardDescription>
                  Anleitung zur umweltgerechten Entsorgung
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600">
                      {product.recyclability.recyclablePercentage}%
                    </div>
                    <p className="text-sm text-muted-foreground">Recycelbar</p>
                  </div>
                  <Progress value={product.recyclability.recyclablePercentage} className="flex-1 h-4" />
                </div>

                {isFieldVisible('recyclingInstructions') && (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Recycling-Anleitung
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {product.recyclability.instructions}
                    </p>
                  </div>
                )}

                {isFieldVisible('disposalMethods') && (
                  <div>
                    <h4 className="font-medium mb-2">Entsorgungsmethoden</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.recyclability.disposalMethods.map((method, index) => (
                        <Badge key={index} variant="outline">
                          {method}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Zertifizierungen */}
          {isFieldVisible('certifications') && product.certifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Zertifizierungen
                </CardTitle>
                <CardDescription>
                  Geprüfte Qualitäts- und Nachhaltigkeitsstandards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {product.certifications.map((cert, index) => (
                    <div
                      key={index}
                      className="p-4 border rounded-lg bg-muted/30 flex flex-col justify-between"
                    >
                      <div>
                        <p className="font-semibold">{cert.name}</p>
                        <p className="text-sm text-muted-foreground">{cert.issuedBy}</p>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          Gültig bis: {new Date(cert.validUntil).toLocaleDateString('de-DE')}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          <ShieldCheck className="h-3 w-3 mr-1" />
                          Gültig
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vereinfachte Lieferkette */}
          {isFieldVisible('supplyChainSimple') && product.supplyChain.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Lieferkette
                </CardTitle>
                <CardDescription>
                  Der Weg Ihres Produkts vom Rohstoff bis zu Ihnen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {product.supplyChain.map((entry, index) => (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                          {entry.step}
                        </div>
                        {index < product.supplyChain.length - 1 && (
                          <div className="w-0.5 h-8 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium">{entry.description}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {entry.location}, {entry.country}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Zollansicht */}
        <TabsContent value="zoll" className="space-y-6">
          {/* Produkt-Header mit allen Identifikatoren */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                {isFieldVisible('image') && product.imageUrl && (
                  <div className="w-full md:w-1/3">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex-1 space-y-4">
                  {isFieldVisible('name') && (
                    <h1 className="text-3xl font-bold">{product.name}</h1>
                  )}
                  {isFieldVisible('manufacturer') && (
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {product.manufacturer}
                    </p>
                  )}

                  {/* Identifikatoren */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    {isFieldVisible('gtin') && (
                      <div>
                        <p className="text-xs text-muted-foreground">GTIN</p>
                        <p className="font-mono font-semibold">{product.gtin}</p>
                      </div>
                    )}
                    {isFieldVisible('serialNumber') && (
                      <div>
                        <p className="text-xs text-muted-foreground">Seriennummer</p>
                        <p className="font-mono font-semibold">{product.serialNumber}</p>
                      </div>
                    )}
                    {isFieldVisible('batchNumber') && product.batchNumber && (
                      <div>
                        <p className="text-xs text-muted-foreground">Chargennummer</p>
                        <p className="font-mono font-semibold">{product.batchNumber}</p>
                      </div>
                    )}
                    {isFieldVisible('hsCode') && product.hsCode && (
                      <div>
                        <p className="text-xs text-muted-foreground">HS-Code</p>
                        <p className="font-mono font-semibold">{product.hsCode}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Zollrelevante Daten */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Zollrelevante Daten
              </CardTitle>
              <CardDescription>
                Informationen für Zollabfertigung und Import/Export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                {/* Herkunft & Gewicht */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Produktdaten
                  </h4>
                  <div className="space-y-2">
                    {isFieldVisible('countryOfOrigin') && product.countryOfOrigin && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Herkunftsland</span>
                        <span className="font-medium">{product.countryOfOrigin}</span>
                      </div>
                    )}
                    {isFieldVisible('netWeight') && product.netWeight && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Nettogewicht</span>
                        <span className="font-medium">{product.netWeight} g</span>
                      </div>
                    )}
                    {isFieldVisible('grossWeight') && product.grossWeight && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Bruttogewicht</span>
                        <span className="font-medium">{product.grossWeight} g</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Produktionsdatum</span>
                      <span className="font-medium">
                        {new Date(product.productionDate).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hersteller-Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Herstellerdaten
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Firma</span>
                      <span className="font-medium">{product.manufacturer}</span>
                    </div>
                    {isFieldVisible('manufacturerAddress') && product.manufacturerAddress && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">Adresse</span>
                        <span className="font-medium text-right text-sm">
                          {product.manufacturerAddress}
                        </span>
                      </div>
                    )}
                    {isFieldVisible('manufacturerEORI') && product.manufacturerEORI && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">EORI-Nummer</span>
                        <span className="font-mono font-medium">{product.manufacturerEORI}</span>
                      </div>
                    )}
                    {isFieldVisible('manufacturerVAT') && product.manufacturerVAT && (
                      <div className="flex justify-between py-2 border-b">
                        <span className="text-muted-foreground">USt-IdNr.</span>
                        <span className="font-mono font-medium">{product.manufacturerVAT}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Materialien (detailliert) */}
          {isFieldVisible('materials') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Materialzusammensetzung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Material</th>
                        <th className="text-right py-2">Anteil</th>
                        <th className="text-center py-2">Recycelbar</th>
                        <th className="text-left py-2">Herkunft</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.materials.map((material, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 font-medium">{material.name}</td>
                          <td className="py-2 text-right">{material.percentage}%</td>
                          <td className="py-2 text-center">
                            {material.recyclable ? (
                              <Badge variant="secondary" className="text-xs">Ja</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Nein</Badge>
                            )}
                          </td>
                          <td className="py-2">{material.origin || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Zertifikate mit Download */}
          {isFieldVisible('certifications') && product.certifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Zertifizierungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {product.certifications.map((cert, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-semibold">{cert.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {cert.issuedBy} | Gültig bis:{' '}
                          {new Date(cert.validUntil).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      {isFieldVisible('certificateDownloads') && cert.certificateUrl && (
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Vollständige Lieferkette */}
          {isFieldVisible('supplyChainFull') && product.supplyChain.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Vollständige Lieferkette
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Schritt</th>
                        <th className="text-left py-2">Beschreibung</th>
                        <th className="text-left py-2">Standort</th>
                        <th className="text-left py-2">Land</th>
                        <th className="text-left py-2">Datum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.supplyChain.map((entry, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2">
                            <Badge variant="outline">{entry.step}</Badge>
                          </td>
                          <td className="py-2 font-medium">{entry.description}</td>
                          <td className="py-2">{entry.location}</td>
                          <td className="py-2">{entry.country}</td>
                          <td className="py-2">
                            {new Date(entry.date).toLocaleDateString('de-DE')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* CO2-Fußabdruck */}
          {isFieldVisible('carbonFootprint') && product.carbonFootprint && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Leaf className="h-5 w-5" />
                  CO2-Fußabdruck
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{product.carbonFootprint.totalKgCO2}</p>
                    <p className="text-sm text-muted-foreground">kg CO2 Gesamt</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{product.carbonFootprint.productionKgCO2}</p>
                    <p className="text-sm text-muted-foreground">kg CO2 Produktion</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold">{product.carbonFootprint.transportKgCO2}</p>
                    <p className="text-sm text-muted-foreground">kg CO2 Transport</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
