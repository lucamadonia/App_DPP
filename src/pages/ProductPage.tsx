import { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { getProductById, getProductSuppliersWithDetails } from '@/services/supabase';
import type { Product } from '@/types/product';
import type { SupplierProduct } from '@/types/database';

const SUPPLIER_ROLE_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  importeur: 'Importer',
  component: 'Component Supplier',
  raw_material: 'Raw Material Supplier',
  packaging: 'Packaging',
  logistics: 'Logistics',
};

export function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productSuppliers, setProductSuppliers] = useState<Array<SupplierProduct & { supplier_name: string; supplier_country: string }>>([]);

  useEffect(() => {
    async function loadProduct() {
      if (!id) {
        setError('No product ID provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const [data, suppliersData] = await Promise.all([
        getProductById(id),
        getProductSuppliersWithDetails(id),
      ]);
      if (data) {
        setProduct(data);
      } else {
        setError('Product not found');
      }
      setProductSuppliers(suppliersData);
      setIsLoading(false);
    }

    loadProduct();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
            <p className="text-muted-foreground">{error || 'The product does not exist or you do not have access.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const complianceScore = 95;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
          <Button variant="outline" asChild>
            <Link to="/dpp/qr-generator">
              <QrCode className="mr-2 h-4 w-4" />
              QR Code
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild>
            <Link to={`/products/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
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
                <span className="font-medium">Compliance Status</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={complianceScore} className="h-2 w-48" />
                <span className="text-sm font-medium text-success">{complianceScore}%</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                12 fulfilled
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-warning" />
                1 pending
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="stammdaten" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="stammdaten" className="flex items-center gap-2 flex-shrink-0">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Master Data</span>
          </TabsTrigger>
          <TabsTrigger value="nachhaltigkeit" className="flex items-center gap-2 flex-shrink-0">
            <Leaf className="h-4 w-4" />
            <span className="hidden sm:inline">Sustainability</span>
          </TabsTrigger>
          <TabsTrigger value="konformitaet" className="flex items-center gap-2 flex-shrink-0">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Compliance</span>
          </TabsTrigger>
          <TabsTrigger value="dokumente" className="flex items-center gap-2 flex-shrink-0">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="lieferanten" className="flex items-center gap-2 flex-shrink-0">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Suppliers</span>
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2 flex-shrink-0">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">QR & Access</span>
          </TabsTrigger>
          <TabsTrigger value="historie" className="flex items-center gap-2 flex-shrink-0">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Master Data Tab */}
        <TabsContent value="stammdaten" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product Name</p>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Manufacturer</p>
                    <p className="font-medium">{product.manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GTIN/EAN</p>
                    <code className="font-mono text-sm">{product.gtin}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Serial Number</p>
                    <code className="font-mono text-sm">{product.serialNumber}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{product.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Production Date</p>
                    <p className="font-medium">
                      {new Date(product.productionDate).toLocaleDateString('en-US')}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Description</p>
                  <p className="text-sm">{product.description || 'No description available'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Product Image</CardTitle>
              </CardHeader>
              <CardContent>
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="aspect-square rounded-lg object-cover"
                  />
                ) : (
                  <div className="aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <div className="text-6xl font-bold text-muted-foreground/30">
                      {product.name.charAt(0)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sustainability Tab */}
        <TabsContent value="nachhaltigkeit" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Material Composition */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="h-5 w-5 text-success" />
                  Material Composition
                </CardTitle>
                <CardDescription>Share and origin of used materials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.materials && product.materials.length > 0 ? (
                  product.materials.map((material, index) => (
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
                            Recyclable
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No materials recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Carbon Footprint */}
            {product.carbonFootprint && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-success" />
                    Carbon Footprint
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
                    <div className="text-muted-foreground">CO2 Total</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                      <span>Production</span>
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
                  Recycling & Disposal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 rounded-lg bg-success/10">
                    <div className="text-3xl font-bold text-success">
                      {product.recyclability?.recyclablePercentage || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Recyclable</div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Disposal Notes</p>
                      <p className="text-sm">{product.recyclability?.instructions || 'No notes recorded'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Disposal Methods</p>
                      <div className="flex flex-wrap gap-2">
                        {product.recyclability?.disposalMethods && product.recyclability.disposalMethods.length > 0 ? (
                          product.recyclability.disposalMethods.map((method, index) => (
                            <Badge key={index} variant="secondary">
                              {method}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No methods recorded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="konformitaet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-warning" />
                Certifications
              </CardTitle>
              <CardDescription>Valid certificates and declarations of conformity</CardDescription>
            </CardHeader>
            <CardContent>
              {product.certifications && product.certifications.length > 0 ? (
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
                          <p className="text-sm text-muted-foreground">Valid until</p>
                          <p className="font-medium">
                            {new Date(cert.validUntil).toLocaleDateString('en-US')}
                          </p>
                        </div>
                        {cert.certificateUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={cert.certificateUrl} target="_blank" rel="noopener noreferrer">
                              <Download className="mr-2 h-4 w-4" />
                              PDF
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>No certifications recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="dokumente">
          <Card>
            <CardHeader>
              <CardTitle>Documents & Certificates</CardTitle>
              <CardDescription>All uploaded documents for this product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                <div className="text-center">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Drag files here or click to upload
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="lieferanten">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Assigned Suppliers
              </CardTitle>
              <CardDescription>Economic operators and suppliers for this product</CardDescription>
            </CardHeader>
            <CardContent>
              {productSuppliers.length > 0 ? (
                <div className="space-y-4">
                  {productSuppliers.map((sp) => (
                    <div key={sp.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{sp.supplier_name}</p>
                            {sp.is_primary && (
                              <Badge variant="secondary">Primary Supplier</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {sp.supplier_country} · {SUPPLIER_ROLE_LABELS[sp.role] || sp.role}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        {sp.lead_time_days != null && (
                          <div className="text-right">
                            <p className="text-muted-foreground">Lead Time</p>
                            <p className="font-medium">{sp.lead_time_days} days</p>
                          </div>
                        )}
                        {sp.price_per_unit != null && (
                          <div className="text-right">
                            <p className="text-muted-foreground">Price/Unit</p>
                            <p className="font-medium">
                              {sp.price_per_unit} {sp.currency || 'EUR'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>No suppliers assigned</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QR & Access Tab */}
        <TabsContent value="qr" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>Scan for the public DPP</CardDescription>
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
                <CardTitle>Public Link</CardTitle>
                <CardDescription>GS1 Digital Link Format</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted font-mono text-sm break-all">
                  https://id.gs1.org/01/{product.gtin}/21/{product.serialNumber}
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" variant="outline" asChild>
                    <a
                      href={`/p/${product.gtin}/${product.serialNumber}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Customer View
                    </a>
                  </Button>
                  <Button className="flex-1" variant="outline" asChild>
                    <a
                      href={`/p/${product.gtin}/${product.serialNumber}/customs`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Customs View
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="historie">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Supply Chain & Audit Log
              </CardTitle>
              <CardDescription>Complete traceability</CardDescription>
            </CardHeader>
            <CardContent>
              {product.supplyChain && product.supplyChain.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-6">
                    {product.supplyChain.map((entry, index) => (
                      <div key={index} className="relative pl-10">
                        <div className="absolute left-2 w-5 h-5 bg-primary rounded-full border-4 border-background" />
                        <div className="p-4 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              Step {entry.step}: {entry.description}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString('en-US')}
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
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>No supply chain data recorded</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
