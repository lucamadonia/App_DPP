import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { blurIn, useReducedMotion } from '@/lib/motion';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProductsForExport } from '@/services/supabase/products';
import { getCurrentTenant } from '@/services/supabase/tenants';
import { generateProductCSV } from '@/lib/product-csv';
import { useProducts, useDeleteProduct } from '@/hooks/queries';
import { DuplicateProductDialog } from '@/components/product/DuplicateProductDialog';
import { ExportProductsDropdown } from '@/components/product/ExportProductsDropdown';
import { ImportProductsDialog } from '@/components/product/ImportProductsDialog';
import { useBilling } from '@/hooks/use-billing';
import { UpgradePrompt } from '@/components/billing';
import { ProductsSkeleton } from '@/components/skeletons/ProductsSkeleton';
import { ErrorState, EmptyState } from '@/components/ui/state-feedback';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const { entitlements } = useBilling();
  const { data: products = [], isLoading, isError, refetch: refetchProducts } = useProducts();
  const isMobile = useIsMobile();
  const deleteProductMutation = useDeleteProduct();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Duplicate
  const [duplicateTarget, setDuplicateTarget] = useState<{ id: string; name: string } | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  // Export
  const [isExporting, setIsExporting] = useState(false);
  const [includeBatches, setIncludeBatches] = useState(false);

  // Import
  const [importOpen, setImportOpen] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await deleteProductMutation.mutateAsync(deleteTarget.id);
    if (result.success) {
      toast.success(t('Product deleted'), {
        description: deleteTarget.name,
      });
    } else {
      toast.error(t('Error deleting product'), {
        description: result.error,
      });
    }
    setDeleteTarget(null);
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

  const prefersReduced = useReducedMotion();
  const MotionDiv = prefersReduced ? 'div' : motion.div;

  if (isLoading) {
    return <ProductsSkeleton />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetchProducts()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionDiv
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        {...(!prefersReduced && { variants: blurIn, initial: 'initial', animate: 'animate' })}
      >
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
      </MotionDiv>

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
                  <AnimatePresence>
                    {statusFilter && (
                      <motion.span
                        key="filter-badge"
                        initial={prefersReduced ? undefined : { opacity: 0, scale: 0.8 }}
                        animate={prefersReduced ? undefined : { opacity: 1, scale: 1 }}
                        exit={prefersReduced ? undefined : { opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Badge variant="secondary" className="ml-2">
                          {statusConfig[statusFilter as keyof typeof statusConfig]?.label}
                        </Badge>
                      </motion.span>
                    )}
                  </AnimatePresence>
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
            <EmptyState
              icon={Package}
              title={t('No products available')}
              description={t('Create your first product to get started with Trackbliss.')}
              actionLabel={t('Create First Product')}
              onAction={() => window.location.href = '/products/new'}
            />
          ) : isMobile ? (
            /* Mobile Card Layout */
            <div className="divide-y">
              {filteredProducts.map((product, index) => {
                const status = statusConfig[(product.status as keyof typeof statusConfig) || 'draft'];
                return (
                  <div
                    key={product.id}
                    className="p-4 transition-colors hover:bg-muted/50"
                    style={!prefersReduced ? {
                      animation: `fadeSlideIn 0.3s ease-out ${index * 0.04}s both`,
                    } : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/products/${product.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{product.name}</span>
                          {product.productType === 'set' && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              {t('Set')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <code className="font-mono">{product.gtin}</code>
                          <span>·</span>
                          <span>{product.category}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          {status && (
                            <Badge variant={status.variant} className={status.className}>
                              <status.icon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {product.batchCount} {product.batchCount === 1 ? t('Batch') : t('Batches')}
                          </span>
                        </div>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('Delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
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
                {filteredProducts.map((product, index) => {
                  const status = statusConfig[(product.status as keyof typeof statusConfig) || 'draft'];
                  return (
                    <TableRow
                      key={product.id}
                      style={!prefersReduced ? {
                        animation: `fadeSlideIn 0.3s ease-out ${index * 0.04}s both`,
                      } : undefined}
                    >
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
                              onClick={() => setDeleteTarget({ id: product.id, name: product.name })}
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
        onImportComplete={() => refetchProducts()}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Product')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to delete "{{name}}"? All batches will also be deleted. This action cannot be undone.', { name: deleteTarget?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
