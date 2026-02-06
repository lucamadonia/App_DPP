import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  QrCode,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Loader2,
  Layers,
  Copy,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProducts, deleteProduct, getProductsForExport, type ProductListItem } from '@/services/supabase/products';
import { getCurrentTenant } from '@/services/supabase/tenants';
import { generateProductCSV } from '@/lib/product-csv';
import { DuplicateProductDialog } from '@/components/product/DuplicateProductDialog';
import { ExportProductsDropdown } from '@/components/product/ExportProductsDropdown';
import { ImportProductsDialog } from '@/components/product/ImportProductsDialog';
import { useBilling } from '@/hooks/use-billing';
import { UpgradePrompt } from '@/components/billing';

const statusConfig = {
  live: {
    label: 'Live',
    icon: CheckCircle2,
    variant: 'default' as const,
    className: 'bg-success text-success-foreground',
  },
  draft: {
    label: 'Draft',
    icon: Clock,
    variant: 'secondary' as const,
    className: '',
  },
  review: {
    label: 'Review',
    icon: AlertCircle,
    variant: 'outline' as const,
    className: 'border-warning text-warning',
  },
  expired: {
    label: 'Expired',
    icon: AlertCircle,
    variant: 'destructive' as const,
    className: '',
  },
};

export function ProductsPage() {
  const { t } = useTranslation('products');
  const { t: tBilling } = useTranslation('billing');
  const locale = useLocale();
  const location = useLocation();
  const { entitlements } = useBilling();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Duplicate
  const [duplicateTarget, setDuplicateTarget] = useState<{ id: string; name: string } | null>(null);

  // Export
  const [isExporting, setIsExporting] = useState(false);
  const [includeBatches, setIncludeBatches] = useState(false);

  // Import
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [location.key]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? All batches will also be deleted.')) {
      return;
    }
    const result = await deleteProduct(id);
    if (result.success) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      alert('Error deleting: ' + result.error);
    }
  };

  // ------ Export handlers ------

  const getExportIds = () => filteredProducts.map((p) => p.id);

  const getTenantName = async () => {
    try {
      const tenant = await getCurrentTenant();
      return tenant?.name || 'Trackbliss';
    } catch {
      return 'Trackbliss';
    }
  };

  const handleExportCSV = async () => {
    if (filteredProducts.length === 0) return;
    setIsExporting(true);
    try {
      const data = await getProductsForExport(getExportIds(), includeBatches);
      const csv = generateProductCSV(data, includeBatches);
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDFOverview = async () => {
    if (filteredProducts.length === 0) return;
    setIsExporting(true);
    try {
      const [data, tenantName] = await Promise.all([
        getProductsForExport(getExportIds(), includeBatches),
        getTenantName(),
      ]);
      const { generateProductOverviewPDF } = await import(
        '@/components/product/ProductCatalogPDF'
      );
      await generateProductOverviewPDF(data, tenantName, includeBatches);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDFCatalog = async () => {
    if (filteredProducts.length === 0) return;
    setIsExporting(true);
    try {
      const [data, tenantName] = await Promise.all([
        getProductsForExport(getExportIds(), includeBatches),
        getTenantName(),
      ]);
      const { generateProductCatalogPDF } = await import(
        '@/components/product/ProductCatalogPDF'
      );
      await generateProductCatalogPDF(data, tenantName, includeBatches);
    } finally {
      setIsExporting(false);
    }
  };

  // ------ Filtering ------

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.gtin.includes(searchQuery) ||
      product.manufacturer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">{t('Loading products...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Products')}</h1>
          <p className="text-muted-foreground">
            {t('Manage your products and their Digital Product Passports')}
          </p>
        </div>
        {entitlements && products.length >= entitlements.limits.maxProducts && entitlements.limits.maxProducts !== Infinity ? (
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            {t('New Product')}
          </Button>
        ) : (
          <Button asChild>
            <Link to="/products/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('New Product')}
            </Link>
          </Button>
        )}
      </div>

      {entitlements && products.length >= entitlements.limits.maxProducts && entitlements.limits.maxProducts !== Infinity && (
        <UpgradePrompt
          variant="quota"
          message={tBilling('Product limit reached ({{current}}/{{limit}}). Upgrade your plan to add more products.', { current: products.length, limit: entitlements.limits.maxProducts })}
        />
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('Filter & Search')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('Search by name, GTIN or manufacturer...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Status
                  {statusFilter && (
                    <Badge variant="secondary" className="ml-2">
                      {statusConfig[statusFilter as keyof typeof statusConfig]?.label}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  {t('All Statuses')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                    <config.icon className="mr-2 h-4 w-4" />
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <ExportProductsDropdown
              disabled={filteredProducts.length === 0}
              includeBatches={includeBatches}
              onIncludeBatchesChange={setIncludeBatches}
              onExportCSV={handleExportCSV}
              onExportPDFOverview={handleExportPDFOverview}
              onExportPDFCatalog={handleExportPDFCatalog}
              isExporting={isExporting}
            />
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              {t('Import')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table or Empty State */}
      <Card>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">{t('No products available')}</h3>
              <p className="mt-2 text-muted-foreground">
                {t('Create your first product to get started with Trackbliss.')}
              </p>
              <Button className="mt-6" asChild>
                <Link to="/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('Create First Product')}
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Product Name')}</TableHead>
                  <TableHead>{t('GTIN/EAN')}</TableHead>
                  <TableHead>{t('Category')}</TableHead>
                  <TableHead>{t('Batches')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Created')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const status = statusConfig[(product.status as keyof typeof statusConfig) || 'draft'];
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/products/${product.id}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {product.name}
                          </Link>
                          {product.productType === 'set' && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {t('Set')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-sm">{product.gtin}</code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/products/${product.id}?tab=batches`}
                          className="inline-flex items-center gap-1.5 hover:text-primary"
                        >
                          <Layers className="h-3.5 w-3.5" />
                          <span className="text-sm font-medium">
                            {product.batchCount} {product.batchCount === 1 ? t('Batch') : t('Batches')}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {status && (
                          <Badge variant={status.variant} className={status.className}>
                            <status.icon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.createdAt
                          ? formatDate(product.createdAt, locale)
                          : '-'}
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
                              <Link to={`/products/${product.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                {t('View')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/products/${product.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                {t('Edit')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/products/${product.id}/batches/new`}>
                                <Layers className="mr-2 h-4 w-4" />
                                {t('New Batch')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/dpp/qr-generator?product=${product.id}`}>
                                <QrCode className="mr-2 h-4 w-4" />
                                {t('QR-Code')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                setDuplicateTarget({ id: product.id, name: product.name })
                              }
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              {t('Duplicate Product')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(product.id)}
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

          {products.length > 0 && filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">{t('No products found')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      {duplicateTarget && (
        <DuplicateProductDialog
          productId={duplicateTarget.id}
          productName={duplicateTarget.name}
          open={!!duplicateTarget}
          onOpenChange={(open) => {
            if (!open) setDuplicateTarget(null);
          }}
        />
      )}

      <ImportProductsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportComplete={loadProducts}
      />
    </div>
  );
}
