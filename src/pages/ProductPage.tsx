import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeIn, useReducedMotion } from '@/lib/motion';
import { formatDate, formatCurrency } from '@/lib/format';
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
  Headphones,
  BrainCircuit,
  DollarSign,
  Hash,
  BarChart3,
  Tag,
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
import { getProductImages, getProductComponents, getProductsContaining } from '@/services/supabase';
import { useProduct, useProducts, useProductSuppliers, useBatches, useBatchCosts, useDeleteBatch } from '@/hooks/queries';
import type { ProductComponent } from '@/types/product';
import type { ProductImage } from '@/types/database';
import { ProductImagesGallery } from '@/components/product/ProductImagesGallery';
import { ProductDocumentsTab } from '@/components/product/ProductDocumentsTab';
import { ProductSupportTab } from '@/components/product/ProductSupportTab';
import { ProductComplianceTab } from '@/components/product/ProductComplianceTab';
import { AIComplianceCheckTab } from '@/components/compliance-check/AIComplianceCheckTab';
import { MasterLabelTab } from '@/components/product/MasterLabelTab';
import { CreateDataRequestDialog } from '@/components/suppliers/CreateDataRequestDialog';
import { SupplierDataRequestsTable } from '@/components/suppliers/SupplierDataRequestsTable';
import { getSupplierDataRequests } from '@/services/supabase/supplier-data-portal';
import type { SupplierDataRequest } from '@/types/supplier-data-portal';

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

  // Core data via TanStack Query
  const { data: product, isLoading, error: productError } = useProduct(id);
  const { data: productSuppliers = [] } = useProductSuppliers(id);
  const { data: batches = [], isLoading: batchesLoading } = useBatches(id);
  const { data: supplierCosts = [] } = useBatchCosts(id);
  const deleteBatchMutation = useDeleteBatch(id || '');

  const queryClient = useQueryClient();
  const [showCreateDataRequest, setShowCreateDataRequest] = useState(false);

  // Ancillary data loaded via inline useQuery
  const { data: allProducts = [] } = useProducts();
  const allProductsList = allProducts.map(p => ({ id: p.id, name: p.name }));

  // Load images
  const { data: productImages = [] } = useQuery<ProductImage[]>({
    queryKey: ['product-images', id],
    queryFn: () => getProductImages(id!),
    enabled: !!id,
  });

  // Load components (sets only)
  const { data: components = [] } = useQuery<ProductComponent[]>({
    queryKey: ['product-components', id],
    queryFn: () => getProductComponents(id!),
    enabled: !!id && product?.productType === 'set',
  });

  // Load "used in sets" (single products only)
  const { data: usedInSets = [] } = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ['product-used-in-sets', id],
    queryFn: () => getProductsContaining(id!),
    enabled: !!id && !!product && product.productType !== 'set',
  });

  // Load supplier data requests
  const { data: dataRequests = [] } = useQuery<SupplierDataRequest[]>({
    queryKey: ['supplier-data-requests', id],
    queryFn: () => getSupplierDataRequests(id!),
    enabled: !!id,
  });

  const prefersReduced = useReducedMotion();
  const MotionDiv = prefersReduced ? 'div' : motion.div;

  const error = productError ? 'Product not found' : (!id ? 'No product ID provided' : null);

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm('Are you sure you want to delete this batch?')) return;
    const result = await deleteBatchMutation.mutateAsync(batchId);
    if (!result.success) {
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
      <MotionDiv
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        {...(!prefersReduced && { variants: fadeIn, initial: 'initial', animate: 'animate' })}
      >
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
              {product.productType === 'set' && (
                <Badge variant="outline" className="border-primary text-primary">
                  <Layers className="mr-1 h-3 w-3" />
                  {t('Set')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {product.manufacturer} · {product.category}
              {usedInSets.length > 0 && (
                <span className="ml-2 text-xs">
                  · {t('Used as component in {{count}} sets', { count: usedInSets.length })}
                </span>
              )}
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
      </MotionDiv>

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
          {product.productType === 'set' && (
            <TabsTrigger value="components" className="flex items-center gap-2 flex-shrink-0">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">{t('Components')}</span>
              {components.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{components.length}</Badge>
              )}
            </TabsTrigger>
          )}
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
          <TabsTrigger value="support" className="flex items-center gap-2 flex-shrink-0">
            <Headphones className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Support')}</span>
          </TabsTrigger>
          <TabsTrigger value="lieferanten" className="flex items-center gap-2 flex-shrink-0">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Suppliers')}</span>
          </TabsTrigger>
          <TabsTrigger value="qr" className="flex items-center gap-2 flex-shrink-0">
            <QrCode className="h-4 w-4" />
            <span className="hidden sm:inline">{t('QR & Access')}</span>
          </TabsTrigger>
          <TabsTrigger value="master-label" className="flex items-center gap-2 flex-shrink-0">
            <Tag className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Master Label')}</span>
          </TabsTrigger>
          <TabsTrigger value="historie" className="flex items-center gap-2 flex-shrink-0">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('History')}</span>
          </TabsTrigger>
          <TabsTrigger value="ai-check" className="flex items-center gap-2 flex-shrink-0">
            <BrainCircuit className="h-4 w-4" />
            <span className="hidden sm:inline">{t('AI Check', { ns: 'compliance' })}</span>
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
                {(productImages.length > 0 ? productImages.find(i => i.isPrimary)?.url || productImages[0]?.url : product.imageUrl) ? (
                  <img
                    src={productImages.length > 0 ? (productImages.find(i => i.isPrimary)?.url || productImages[0]?.url) : product.imageUrl}
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

          {/* Images Gallery */}
          <ProductImagesGallery
            productId={product.id}
            images={productImages}
            onImagesChange={(_imgs: ProductImage[]) => queryClient.invalidateQueries({ queryKey: ['product-images', id] })}
          />
        </TabsContent>

        {/* Batches Tab */}
        <TabsContent value="batches" className="space-y-6">
          {/* KPI Cards */}
          {batches.length > 0 && (() => {
            const totalQty = batches.reduce((s, b) => s + (b.quantity || 0), 0);
            const totalValue = batches.reduce((s, b) => s + ((b.pricePerUnit || 0) * (b.quantity || 0)), 0);
            const batchesWithPrice = batches.filter(b => b.pricePerUnit != null && b.quantity);
            const avgPrice = batchesWithPrice.length > 0
              ? batchesWithPrice.reduce((s, b) => s + (b.pricePerUnit || 0), 0) / batchesWithPrice.length
              : 0;
            return (
              <MotionDiv
                className="grid gap-4 grid-cols-2 lg:grid-cols-4"
                {...(!prefersReduced && { variants: staggerContainer, initial: 'initial', animate: 'animate' })}
              >
                {[
                  { icon: Hash, label: t('Total Batches'), value: String(batches.length) },
                  { icon: Layers, label: t('Total Quantity'), value: totalQty.toLocaleString() },
                  { icon: DollarSign, label: t('Total Value'), value: totalValue > 0 ? formatCurrency(totalValue, 'EUR', locale) : '—' },
                  { icon: BarChart3, label: t('Avg. Price/Unit'), value: avgPrice > 0 ? formatCurrency(avgPrice, 'EUR', locale) : '—' },
                ].map(({ icon: Icon, label, value }) => (
                  <MotionDiv key={label} {...(!prefersReduced && { variants: staggerItem })}>
                    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-2xl font-bold">{value}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </MotionDiv>
                ))}
              </MotionDiv>
            );
          })()}

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
                      <TableHead>{t('Supplier')}</TableHead>
                      <TableHead>{t('Price/Unit')}</TableHead>
                      <TableHead>{t('Total Price')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead>{t('Overrides')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.map((batch, index) => {
                      const status = batchStatusConfig[batch.status];
                      const batchTotal = (batch.pricePerUnit || 0) * (batch.quantity || 0);
                      return (
                        <TableRow
                          key={batch.id}
                          style={!prefersReduced ? {
                            animation: `fadeSlideIn 0.3s ease-out ${index * 0.03}s both`,
                          } : undefined}
                        >
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
                          <TableCell className="text-muted-foreground">
                            {batch.supplierName || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {batch.pricePerUnit != null
                              ? formatCurrency(batch.pricePerUnit, batch.currency || 'EUR', locale)
                              : '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {batchTotal > 0
                              ? formatCurrency(batchTotal, batch.currency || 'EUR', locale)
                              : '-'}
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
          <ProductComplianceTab product={product} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="dokumente">
          <ProductDocumentsTab productId={product.id} />
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6">
          <ProductSupportTab
            supportResources={product.supportResources || {}}
            onChange={() => {}}
            readOnly
          />
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
                  {productSuppliers.map((sp) => {
                    const cost = supplierCosts.find(c => c.supplierId === sp.supplier_id);
                    return (
                      <div key={sp.id}>
                        <div className="flex items-center justify-between p-4 rounded-lg border">
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
                                  {formatCurrency(sp.price_per_unit, sp.currency || 'EUR', locale)}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        {cost && (
                          <div className="ml-14 mt-1 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                            <div>
                              <p className="text-xs text-muted-foreground">{t('Total Batches')}</p>
                              <p className="font-medium">{cost.totalBatches}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t('Total Quantity')}</p>
                              <p className="font-medium">{cost.totalQuantity.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t('Total Cost')}</p>
                              <p className="font-medium">{formatCurrency(cost.totalCost, cost.currency, locale)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">{t('Avg. Price/Unit')}</p>
                              <p className="font-medium">{formatCurrency(cost.avgPricePerUnit, cost.currency, locale)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="mx-auto h-12 w-12 opacity-30 mb-2" />
                  <p>{t('No suppliers assigned')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supplier Data Requests */}
          <Card className="mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ExternalLink className="h-5 w-5 text-primary" />
                    {t('Supplier Data Requests', { ns: 'supplier-data-portal' })}
                  </CardTitle>
                  <CardDescription>{t('Suppliers can fill in product and batch data via a secure link', { ns: 'supplier-data-portal' })}</CardDescription>
                </div>
                <Button size="sm" onClick={() => setShowCreateDataRequest(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t('Create Data Request', { ns: 'supplier-data-portal' })}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <SupplierDataRequestsTable
                requests={dataRequests}
                onRefresh={() => {
                  queryClient.invalidateQueries({ queryKey: ['supplier-data-requests', id] });
                }}
              />
            </CardContent>
          </Card>

          {product && (
            <CreateDataRequestDialog
              open={showCreateDataRequest}
              onOpenChange={setShowCreateDataRequest}
              initialProducts={[{ id: product.id, name: product.name }]}
              allProducts={allProductsList}
              suppliers={productSuppliers.map(sp => ({ id: sp.supplier_id, name: sp.supplier_name }))}
              onCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['supplier-data-requests', id] });
              }}
            />
          )}
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

        {/* Master Label Tab */}
        <TabsContent value="master-label" className="space-y-6">
          <MasterLabelTab product={product} batches={batches} productSuppliers={productSuppliers} />
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

        {/* Components Tab (Sets only) */}
        {product.productType === 'set' && (
          <TabsContent value="components" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {t('Components')}
                  <Badge variant="secondary">{components.length}</Badge>
                </CardTitle>
                <CardDescription>{t('Products included in this set')}</CardDescription>
              </CardHeader>
              <CardContent>
                {components.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">{t('No components added yet')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('Product')}</TableHead>
                        <TableHead>{t('GTIN')}</TableHead>
                        <TableHead>{t('Category')}</TableHead>
                        <TableHead className="text-center">{t('Quantity')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {components.map(comp => {
                        const cp = comp.componentProduct;
                        return (
                          <TableRow key={comp.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {cp?.imageUrl ? (
                                  <img src={cp.imageUrl} alt={cp.name} className="h-8 w-8 rounded object-cover" loading="lazy" />
                                ) : (
                                  <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <Link to={`/products/${comp.componentProductId}`} className="font-medium hover:underline">
                                  {cp?.name || comp.componentProductId}
                                </Link>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{cp?.gtin || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">{cp?.category || '-'}</TableCell>
                            <TableCell className="text-center">{comp.quantity}×</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* AI Compliance Check Tab */}
        <TabsContent value="ai-check" className="space-y-6">
          <AIComplianceCheckTab product={product} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
