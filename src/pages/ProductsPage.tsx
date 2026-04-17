import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  staggerContainer,
  staggerItem,
  blurIn,
  gridStagger,
  gridItem,
  useReducedMotion,
} from '@/lib/motion';
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
  X,
  Archive,
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
import { Card, CardContent } from '@/components/ui/card';
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
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Status config
// ---------------------------------------------------------------------------
const statusConfig = {
  live: {
    label: 'Live',
    icon: CheckCircle2,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800',
  },
  draft: {
    label: 'Draft',
    icon: Clock,
    className: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700',
  },
  review: {
    label: 'Review',
    icon: AlertCircle,
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800',
  },
  expired: {
    label: 'Expired',
    icon: Archive,
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-800',
  },
};

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------
function KPICard({
  label,
  value,
  icon: Icon,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: typeof Package;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200',
        'hover:shadow-sm cursor-pointer',
        active
          ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border bg-card hover:border-border/80',
      )}
    >
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold leading-none tracking-tight">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground truncate">{label}</p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Product thumbnail
// ---------------------------------------------------------------------------
function ProductThumb({ src, name }: { src?: string; name: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="h-9 w-9 rounded-lg object-cover border border-border/50"
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <Package className="h-4 w-4" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function ProductsPage() {
  const { t } = useTranslation('products');
  const { t: tCommon } = useTranslation('common');
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

  const prefersReduced = useReducedMotion();

  // ------ KPI stats ------
  const stats = useMemo(() => {
    const live = products.filter((p) => p.status === 'live').length;
    const draft = products.filter((p) => !p.status || p.status === 'draft').length;
    const review = products.filter((p) => (p.status as string) === 'review').length;
    return { total: products.length, live, draft, review };
  }, [products]);

  // ------ Filtering ------
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.gtin.includes(searchQuery) ||
        product.manufacturer.toLowerCase().includes(q);
      const matchesStatus = !statusFilter || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [products, searchQuery, statusFilter]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const result = await deleteProductMutation.mutateAsync(deleteTarget.id);
    if (result.success) {
      toast.success(t('Product deleted'), { description: deleteTarget.name });
    } else {
      toast.error(t('Error deleting product'), { description: result.error });
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

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter(null);
  };

  const hasActiveFilters = searchQuery || statusFilter;

  // ------ Motion wrappers ------
  const MotionDiv = prefersReduced ? 'div' : motion.div;
  const motionProps = (variants: Variants) =>
    prefersReduced ? {} : { variants, initial: 'initial', animate: 'animate' };

  if (isLoading) {
    return <ProductsSkeleton />;
  }

  if (isError) {
    return <ErrorState onRetry={() => refetchProducts()} />;
  }

  const quotaReached =
    entitlements &&
    products.length >= entitlements.limits.maxProducts &&
    entitlements.limits.maxProducts !== Infinity;

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <MotionDiv
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        {...motionProps(blurIn)}
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t('Products')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('Manage your products and their Digital Product Passports')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)} size="sm">
            <Upload className="mr-1.5 h-4 w-4" />
            {t('Import')}
          </Button>
          {quotaReached ? (
            <Button disabled size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              {t('New Product')}
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/products/new">
                <Plus className="mr-1.5 h-4 w-4" />
                {t('New Product')}
              </Link>
            </Button>
          )}
        </div>
      </MotionDiv>

      {quotaReached && (
        <UpgradePrompt
          variant="quota"
          message={tBilling(
            'Product limit reached ({{current}}/{{limit}}). Upgrade your plan to add more products.',
            { current: products.length, limit: entitlements!.limits.maxProducts },
          )}
        />
      )}

      {/* ---- KPI Summary ---- */}
      {products.length > 0 && (
        <MotionDiv
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          {...motionProps(gridStagger)}
        >
          {([
            {
              label: t('Total Products', { ns: 'products' }),
              value: stats.total,
              icon: Package,
              color: 'bg-primary/10 text-primary',
              filter: null,
            },
            {
              label: 'Live',
              value: stats.live,
              icon: CheckCircle2,
              color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400',
              filter: 'live',
            },
            {
              label: 'Draft',
              value: stats.draft,
              icon: Clock,
              color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
              filter: 'draft',
            },
            {
              label: 'Review',
              value: stats.review,
              icon: AlertCircle,
              color: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
              filter: 'review',
            },
          ] as const).map((kpi) => {
            const Wrapper = prefersReduced ? 'div' : motion.div;
            return (
              <Wrapper key={kpi.label} {...motionProps(gridItem)}>
                <KPICard
                  label={kpi.label}
                  value={kpi.value}
                  icon={kpi.icon}
                  color={kpi.color}
                  active={statusFilter === kpi.filter && kpi.filter !== null}
                  onClick={() =>
                    setStatusFilter(statusFilter === kpi.filter ? null : kpi.filter)
                  }
                />
              </Wrapper>
            );
          })}
        </MotionDiv>
      )}

      {/* ---- Search & Filter Bar ---- */}
      <MotionDiv
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
        {...motionProps(blurIn)}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('Search by name, GTIN or manufacturer...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-1.5 h-4 w-4" />
                Status
                {statusFilter && (
                  <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
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

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="mr-1 h-3.5 w-3.5" />
              {tCommon('Reset')}
            </Button>
          )}
        </div>
      </MotionDiv>

      {/* ---- Result count ---- */}
      {products.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {hasActiveFilters
              ? t('{{count}} of {{total}} products', {
                  count: filteredProducts.length,
                  total: products.length,
                })
              : t('{{count}} products', { count: products.length })}
          </p>
        </div>
      )}

      {/* ---- Products Table / Cards ---- */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Package}
              title={t('No products available')}
              description={t('Create your first product to get started with Trackbliss.')}
              actionLabel={t('Create First Product')}
              onAction={() => (window.location.href = '/products/new')}
            />
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={Search}
              title={t('No products found')}
              description={t('Try adjusting your search or filters.')}
              actionLabel={tCommon('Reset')}
              onAction={clearFilters}
            />
          </CardContent>
        </Card>
      ) : isMobile ? (
        /* ---- Mobile Card Layout ---- */
        <MotionDiv className="space-y-2" {...motionProps(staggerContainer)}>
          {filteredProducts.map((product) => {
            const status =
              statusConfig[(product.status as keyof typeof statusConfig) || 'draft'];
            const Wrapper = prefersReduced ? 'div' : motion.div;
            return (
              <Wrapper key={product.id} {...motionProps(staggerItem)}>
                <Card className="overflow-hidden transition-colors hover:bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Link to={`/products/${product.id}`} className="shrink-0">
                        <ProductThumb src={product.imageUrl} name={product.name} />
                      </Link>
                      <Link
                        to={`/products/${product.id}`}
                        className="flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-medium text-sm truncate">
                            {product.name}
                          </span>
                          {product.productType === 'set' && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 shrink-0"
                            >
                              {t('Set')}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <code className="font-mono">{product.gtin}</code>
                          <span className="truncate">{product.manufacturer}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {status && (
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] px-1.5 py-0', status.className)}
                            >
                              <status.icon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {product.batchCount}{' '}
                            {product.batchCount === 1 ? t('Batch') : t('Batches')}
                          </span>
                        </div>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 cursor-pointer"
                          >
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
                            onClick={() =>
                              setDeleteTarget({ id: product.id, name: product.name })
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t('Delete')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              </Wrapper>
            );
          })}
        </MotionDiv>
      ) : (
        /* ---- Desktop Table ---- */
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px]">{t('Product Name')}</TableHead>
                  <TableHead>{t('GTIN/EAN')}</TableHead>
                  <TableHead>{t('Manufacturer')}</TableHead>
                  <TableHead className="text-center">{t('Batches')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Created')}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="popLayout">
                  {filteredProducts.map((product, index) => {
                    const status =
                      statusConfig[
                        (product.status as keyof typeof statusConfig) || 'draft'
                      ];
                    return (
                      <TableRow
                        key={product.id}
                        className="group"
                        style={
                          !prefersReduced
                            ? {
                                animation: `fadeSlideIn 0.3s ease-out ${index * 0.03}s both`,
                              }
                            : undefined
                        }
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <ProductThumb
                              src={product.imageUrl}
                              name={product.name}
                            />
                            <div className="min-w-0">
                              <Link
                                to={`/products/${product.id}`}
                                className="font-medium text-sm hover:text-primary transition-colors truncate block"
                              >
                                {product.name}
                              </Link>
                              {product.productType === 'set' && (
                                <Badge
                                  variant="outline"
                                  className="mt-0.5 text-[10px] px-1.5 py-0"
                                >
                                  {t('Set')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                            {product.gtin}
                          </code>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                          {product.manufacturer}
                        </TableCell>
                        <TableCell className="text-center">
                          <Link
                            to={`/products/${product.id}?tab=batches`}
                            className="inline-flex items-center gap-1 text-sm hover:text-primary transition-colors cursor-pointer"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            <span className="font-medium">{product.batchCount}</span>
                          </Link>
                        </TableCell>
                        <TableCell>
                          {status && (
                            <Badge
                              variant="outline"
                              className={cn('text-xs', status.className)}
                            >
                              <status.icon className="mr-1 h-3 w-3" />
                              {status.label}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {product.createdAt
                            ? formatDate(product.createdAt, locale)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
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
                                <Link
                                  to={`/dpp/qr-generator?product=${product.id}`}
                                >
                                  <QrCode className="mr-2 h-4 w-4" />
                                  {t('QR-Code')}
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setDuplicateTarget({
                                    id: product.id,
                                    name: product.name,
                                  })
                                }
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                {t('Duplicate Product')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setDeleteTarget({
                                    id: product.id,
                                    name: product.name,
                                  })
                                }
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
                </AnimatePresence>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ---- Dialogs ---- */}
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Product')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'Are you sure you want to delete "{{name}}"? All batches will also be deleted. This action cannot be undone.',
                { name: deleteTarget?.name },
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('Cancel')}</AlertDialogCancel>
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
