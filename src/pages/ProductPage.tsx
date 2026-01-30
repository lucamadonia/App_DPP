import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
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
  Layers,
  Plus,
  MoreHorizontal,
  Eye,
  Trash2,
  Copy,
  Clock,
  Archive,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getProductById, getProductSuppliersWithDetails } from '@/services/supabase';
import { getBatches, deleteBatch } from '@/services/supabase/batches';
import type { Product } from '@/types/product';
import type { BatchListItem } from '@/types/product';
import type { SupplierProduct } from '@/types/database';

const SUPPLIER_ROLE_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  importeur: 'Importer',
  component: 'Component Supplier',
  raw_material: 'Raw Material Supplier',
  packaging: 'Packaging',
  logistics: 'Logistics',
};

const batchStatusConfig = {
  live: { label: 'Live', icon: CheckCircle2, className: 'bg-success text-success-foreground' },
  draft: { label: 'Draft', icon: Clock, className: '' },
  archived: { label: 'Archived', icon: Archive, className: 'bg-muted text-muted-foreground' },
};

export function ProductPage() {
  const { t } = useTranslation('products');
  const locale = useLocale();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'stammdaten';
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productSuppliers, setProductSuppliers] = useState<Array<SupplierProduct & { supplier_name: string; supplier_country: string }>>([]);
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

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

      // Load batches
      setBatchesLoading(true);
      const batchData = await getBatches(id);
      setBatches(batchData);
      setBatchesLoading(false);
    }

    loadProduct();
  }, [id]);

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    const result = await deleteBatch(batchId);
    if (result.success) {
      setBatches(batches.filter(b => b.id !== batchId));
    } else {
      alert('Error deleting batch: ' + result.error);
    }
  };

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
            <h1 className="text-2xl font-bold text-foreground">{t('Product not found')}</h1>
            <p className="text-muted-foreground">{error || t('The product does not exist or you do not have access.')}</p>
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
            <Link to={`/products/${id}/batches/new`}>
              <Plus className="mr-2 h-4 w-4" />
              {t('New Batch')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/dpp/qr-generator">
              <QrCode className="mr-2 h-4 w-4" />
              {t('QR Code')}
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t('Export')}
          </Button>
          <Button asChild>
            <Link to={`/products/${id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              {t('Edit')}
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
                <span className="font-medium">{t('Compliance Status')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress value={complianceScore} className="h-2 w-48" />
                <span className="text-sm font-medium text-success">{complianceScore}%</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {t('{{count}} fulfilled', { count: 12 })}
              </span>
              <span className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-warning" />
                {t('{{count}} pending', { count: 1 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto">
          <TabsTrigger value="stammdaten" className="flex items-center gap-2 flex-shrink-0">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Master Data')}</span>
          </TabsTrigger>
          <TabsTrigger value="batches" className="flex items-center gap-2 flex-shrink-0">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Batches')}</span>
            {batches.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{batches.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="nachhaltigkeit" className="flex items-center gap-2 flex-shrink-0">
            <Leaf className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Sustainability')}</span>
          </TabsTrigger>
          <TabsTrigger value="konformitaet" className="flex items-center gap-2 flex-shrink-0">
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Compliance')}</span>
          </TabsTrigger>
          <TabsTrigger value="dokumente" className="flex items-center gap-2 flex-shrink-0">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Documents')}</span>
          </TabsTrigger>
          <TabsTrigger value="lieferanten" className="flex items-center gap-2 flex-shrink-0">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Suppliers')}</span>
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2 flex-shrink-0">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">{t('QR & Access')}</span>
          </TabsTrigger>
          <TabsTrigger value="historie" className="flex items-center gap-2 flex-shrink-0">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('History')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Master Data Tab */}
        <TabsContent value="stammdaten" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t('Product Information')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('Product Name')}</p>
                    <p className="font-medium">{product.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('Manufacturer')}</p>
                    <p className="font-medium">{product.manufacturer}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('GTIN/EAN')}</p>
                    <code className="font-mono text-sm">{product.gtin}</code>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('Category')}</p>
                    <p className="font-medium">{product.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('Batches')}</p>
                    <p className="font-medium">{batches.length} {t('Batches').toLowerCase()}</p>
                  </div>
                  {product.countryOfOrigin && (
                    <div>
                      <p className="text-sm text-muted-foreground">{t('Country of Origin')}</p>
                      <p className="font-medium">{product.countryOfOrigin}</p>
                    </div>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{t('Description')}</p>
                  <p className="text-sm">{product.description || t('No description available')}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Product Image')}</CardTitle>
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

        {/* Batches Tab */}
        <TabsContent value="batches" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="h-5 w-5 text-primary" />
                    {t('Batches')}
                  </CardTitle>
                  <CardDescription>{t('All batches/lots for this product. Each batch has its own DPP.')}</CardDescription>
                </div>
                <Button asChild>
                  <Link to={`/products/${id}/batches/new`}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('New Batch')}
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {batchesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : batches.length === 0 ? (
                <div className="text-center py-12">
                  <Layers className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
                  <h3 className="text-lg font-medium">{t('No batches yet')}</h3>
                  <p className="text-muted-foreground mt-1 mb-4">
                    {t('Create the first batch for this product to start issuing DPPs.')}
                  </p>
                  <Button asChild>
                    <Link to={`/products/${id}/batches/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('Create First Batch')}
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Serial Number')}</TableHead>
                      <TableHead>{t('Batch Number')}</TableHead>
                      <TableHead>{t('Production Date')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead>{t('Overrides')}</TableHead>
                      <TableHead>{t('Created')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch) => {
                      const status = batchStatusConfig[batch.status];
                      return (
                        <TableRow key={batch.id}>
                          <TableCell>
                            <Link
                              to={`/products/${id}/batches/${batch.id}`}
                              className="font-mono text-sm font-medium hover:text-primary hover:underline"
                            >
                              {batch.serialNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {batch.batchNumber || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(batch.productionDate, locale)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={status.className}>
                              <status.icon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {batch.hasOverrides ? (
                              <Badge variant="outline" className="border-primary text-primary">
                                <Settings2 className="mr-1 h-3 w-3" />
                                Overrides
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">{t('Inherited')}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(batch.createdAt, locale)}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link to={`/products/${id}/batches/${batch.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    {t('View')}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/products/${id}/batches/${batch.id}/edit`}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    {t('Edit')}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a
                                    href={`/p/${product.gtin}/${batch.serialNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    {t('Public DPP')}
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/dpp/qr-generator?product=${id}`}>
                                    <QrCode className="mr-2 h-4 w-4" />
                                    {t('QR Code')}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/products/${id}/batches/new?duplicate=${batch.id}`}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    {t('Duplicate')}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteBatch(batch.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('Delete')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sustainability Tab */}
        <TabsContent value="nachhaltigkeit" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Material Composition */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="h-5 w-5 text-success" />
                  {t('Material Composition')}
                </CardTitle>
                <CardDescription>{t('Share and origin of used materials')}</CardDescription>
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
                            {t('Recyclable')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">{t('No materials recorded')}</p>
                )}
              </CardContent>
            </Card>

            {/* Carbon Footprint */}
            {product.carbonFootprint && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Leaf className="h-5 w-5 text-success" />
                    {t('Carbon Footprint')}
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
                      <span>{t('Production')}</span>
                      <span className="font-medium">{product.carbonFootprint.productionKgCO2} kg</span>
                    </div>
                    <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
                      <span>{t('Transport')}</span>
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
                  {t('Recycling & Disposal')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center p-4 rounded-lg bg-success/10">
                    <div className="text-3xl font-bold text-success">
                      {product.recyclability?.recyclablePercentage || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">{t('Recyclable')}</div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">{t('Disposal Notes')}</p>
                      <p className="text-sm">{product.recyclability?.instructions || t('No notes recorded')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">{t('Disposal Methods')}</p>
                      <div className="flex flex-wrap gap-2">
                        {product.recyclability?.disposalMethods && product.recyclability.disposalMethods.length > 0 ? (
                          product.recyclability.disposalMethods.map((method, index) => (
                            <Badge key={index} variant="secondary">
                              {method}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">{t('No methods recorded')}</span>
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
                {t('Certifications')}
              </CardTitle>
              <CardDescription>{t('Valid certificates and declarations of conformity')}</CardDescription>
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
                          <p className="text-sm text-muted-foreground">{t('Valid until')}</p>
                          <p className="font-medium">
                            {formatDate(cert.validUntil, locale)}
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
                  <p>{t('No certifications recorded')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="dokumente">
          <Card>
            <CardHeader>
              <CardTitle>{t('Documents & Certificates')}</CardTitle>
              <CardDescription>{t('All uploaded documents for this product')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                <div className="text-center">
                  <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t('Drag files here or click to upload')}
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
                {t('Assigned Suppliers')}
              </CardTitle>
              <CardDescription>{t('Economic operators and suppliers for this product')}</CardDescription>
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
                              <Badge variant="secondary">{t('Primary Supplier')}</Badge>
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
                            <p className="text-muted-foreground">{t('Lead Time')}</p>
                            <p className="font-medium">{sp.lead_time_days} {t('days')}</p>
                          </div>
                        )}
                        {sp.price_per_unit != null && (
                          <div className="text-right">
                            <p className="text-muted-foreground">{t('Price/Unit')}</p>
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
                  <p>{t('No suppliers assigned')}</p>
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
                <CardTitle>{t('QR Code')}</CardTitle>
                <CardDescription>{t('Select a batch to generate QR codes for individual DPPs')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-square max-w-xs mx-auto rounded-lg bg-white p-8 border">
                  <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                    <QrCode className="h-32 w-32 text-muted-foreground" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 justify-center">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/dpp/qr-generator?product=${id}`}>
                      <QrCode className="mr-2 h-4 w-4" />
                      {t('Open QR Generator')}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('Public Links')}</CardTitle>
                <CardDescription>{t('Links per batch (select a batch to see its DPP link)')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {batches.length > 0 ? (
                  batches.slice(0, 5).map((batch) => (
                    <div key={batch.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{batch.serialNumber}</span>
                        <Badge variant="secondary" className={batchStatusConfig[batch.status].className}>
                          {batchStatusConfig[batch.status].label}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a
                            href={`/p/${product.gtin}/${batch.serialNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-3 w-3" />
                            {t('Customer')}
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" asChild>
                          <a
                            href={`/p/${product.gtin}/${batch.serialNumber}/customs`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-3 w-3" />
                            {t('Customs')}
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">{t('No batches available. Create a batch first.')}</p>
                )}
                {batches.length > 5 && (
                  <p className="text-sm text-muted-foreground text-center">
                    {t('... and {{count}} more batches', { count: batches.length - 5 })}
                  </p>
                )}
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
                {t('Supply Chain & Audit Log')}
              </CardTitle>
              <CardDescription>{t('Complete traceability')}</CardDescription>
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
                              {formatDate(entry.date, locale)}
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
                  <p>{t('No supply chain data recorded')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
