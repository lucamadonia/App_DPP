import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import {
  ArrowLeft,
  Edit,
  QrCode,
  ExternalLink,
  Loader2,
  Layers,
  Package,
  CheckCircle2,
  Clock,
  Archive,
  Settings2,
  Copy,
  Trash2,
  BrainCircuit,
  DollarSign,
  Truck,
  Tag,
  Ruler,
  Star,
  AlertTriangle,
  Check,
  X,
  PackageOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getProductById } from '@/services/supabase';
import { getBatchById, deleteBatch } from '@/services/supabase/batches';
import { formatCurrency } from '@/lib/format';
import { formatVolumeM3 } from '@/lib/warehouse-volume';
import { calculateBatchSpace, CONTAINERS, EURO_PALLET, type ContainerType } from '@/lib/warehouse-logistics';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Product, ProductBatch } from '@/types/product';

const statusConfig = {
  live: { label: 'Live', icon: CheckCircle2, className: 'bg-success text-success-foreground' },
  draft: { label: 'Draft', icon: Clock, className: '' },
  archived: { label: 'Archived', icon: Archive, className: 'bg-muted text-muted-foreground' },
};

export function BatchDetailPage() {
  const { t } = useTranslation('products');
  const { t: tW } = useTranslation('warehouse');
  const locale = useLocale();
  const { id: productId, batchId } = useParams<{ id: string; batchId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [batch, setBatch] = useState<ProductBatch | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!productId || !batchId) return;
      setIsLoading(true);

      const [productData, batchData] = await Promise.all([
        getProductById(productId),
        getBatchById(batchId),
      ]);

      setProduct(productData);
      setBatch(batchData);
      setIsLoading(false);
    }

    loadData();
  }, [productId, batchId]);

  const handleDelete = async () => {
    if (!batchId || !confirm('Are you sure you want to delete this batch?')) return;
    const result = await deleteBatch(batchId);
    if (result.success) {
      window.location.href = `/products/${productId}?tab=batches`;
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

  if (!product || !batch) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/products/${productId}?tab=batches`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Batch not found</h1>
            <p className="text-muted-foreground">The batch does not exist or you do not have access.</p>
          </div>
        </div>
      </div>
    );
  }

  const status = statusConfig[batch.status];
  const hasOverrides = !!(
    batch.materialsOverride ||
    batch.certificationsOverride ||
    batch.carbonFootprintOverride ||
    batch.recyclabilityOverride ||
    batch.descriptionOverride
  );

  // Space & logistics calculation
  const spaceInfo = calculateBatchSpace(product, batch, batch.quantity ?? 0);

  // Merged values for display
  const displayDescription = batch.descriptionOverride || product.description;
  const displayMaterials = batch.materialsOverride || product.materials;
  const displayCertifications = batch.certificationsOverride || product.certifications;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/products/${productId}?tab=batches`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground font-mono">{batch.serialNumber}</h1>
              <Badge variant="secondary" className={status.className}>
                <status.icon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
              {hasOverrides && (
                <Badge variant="outline" className="border-primary text-primary">
                  <Settings2 className="mr-1 h-3 w-3" />
                  Overrides
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {product.name} · {product.gtin}
              {batch.batchNumber && ` · Batch ${batch.batchNumber}`}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to={`/products/${productId}?tab=ai-check&batchId=${batchId}`}>
              <BrainCircuit className="mr-2 h-4 w-4" />
              AI Check
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/products/${productId}?tab=master-label&batchId=${batchId}`}>
              <Tag className="mr-2 h-4 w-4" />
              {t('Master Label')}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/products/${productId}/batches/new?duplicate=${batchId}`}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <a
              href={`/p/${product.gtin}/${batch.serialNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Public DPP
            </a>
          </Button>
          <Button asChild>
            <Link to={`/products/${productId}/batches/${batchId}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Product Reference */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <Package className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-6 text-sm">
              <Link to={`/products/${productId}`} className="font-medium hover:text-primary hover:underline">
                {product.name}
              </Link>
              <code className="font-mono text-muted-foreground">{product.gtin}</code>
              <span className="text-muted-foreground">{product.category}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Batch Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Batch Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Serial Number</p>
                <code className="font-mono font-medium">{batch.serialNumber}</code>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Batch Number</p>
                <p className="font-medium">{batch.batchNumber || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Production Date</p>
                <p className="font-medium">{new Date(batch.productionDate).toLocaleDateString('en-US')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiration Date</p>
                <p className="font-medium">
                  {batch.expirationDate ? new Date(batch.expirationDate).toLocaleDateString('en-US') : '-'}
                </p>
              </div>
              {batch.netWeight != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Net Weight</p>
                  <p className="font-medium">{batch.netWeight} g</p>
                </div>
              )}
              {batch.grossWeight != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Gross Weight</p>
                  <p className="font-medium">{batch.grossWeight} g</p>
                </div>
              )}
              {batch.quantity != null && (
                <div>
                  <p className="text-sm text-muted-foreground">Quantity</p>
                  <p className="font-medium">{batch.quantity} pcs</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="secondary" className={status.className}>
                  <status.icon className="mr-1 h-3 w-3" />
                  {status.label}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(batch.createdAt).toLocaleDateString('en-US')}</p>
              </div>
            </div>
            {batch.notes && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{batch.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pricing & Supplier */}
        {(batch.pricePerUnit != null || batch.supplierName) && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {t('Pricing & Supplier')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {batch.pricePerUnit != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('Price per Unit')}</p>
                    <p className="font-medium">{formatCurrency(batch.pricePerUnit, batch.currency || 'EUR', locale)}</p>
                  </div>
                )}
                {batch.pricePerUnit != null && batch.quantity != null && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('Total Price')}</p>
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(batch.pricePerUnit * batch.quantity, batch.currency || 'EUR', locale)}
                    </p>
                  </div>
                )}
                {batch.supplierName && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">{t('Supplier')}</p>
                    <p className="font-medium flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      {batch.supplierName}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Space & Logistics */}
        {spaceInfo ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-primary" />
                {tW('Space & Logistics')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Volume & Weight row */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{tW('Volume')}</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{tW('Per Unit')}</p>
                      <p className="text-sm font-semibold tabular-nums">{formatVolumeM3(spaceInfo.volume.unitVolumeM3)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{tW('Total')}</p>
                      <p className="text-sm font-semibold tabular-nums text-primary">{formatVolumeM3(spaceInfo.volume.totalVolumeM3)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {spaceInfo.dimensions.heightCm}×{spaceInfo.dimensions.widthCm}×{spaceInfo.dimensions.depthCm} cm
                    {' '}({spaceInfo.dimensionSource === 'packaging'
                      ? tW('Based on packaging dimensions')
                      : tW('Based on product dimensions (no packaging dimensions available)')})
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">{tW('Weight')}</h4>
                  {spaceInfo.unitWeightGrams ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{tW('Per Unit')}</p>
                        <p className="text-sm font-semibold tabular-nums">
                          {spaceInfo.unitWeightGrams >= 1000
                            ? `${(spaceInfo.unitWeightGrams / 1000).toFixed(2)} kg`
                            : `${spaceInfo.unitWeightGrams} g`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{tW('Total Weight')}</p>
                        <p className="text-sm font-semibold tabular-nums text-primary">
                          {spaceInfo.totalWeightKg != null
                            ? `${spaceInfo.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`
                            : '-'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">{tW('No weight data')}</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Euro-Pallets */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{tW('Euro-Pallets')} (EUR 1)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{tW('Units per pallet')}</p>
                    <p className="text-sm font-semibold tabular-nums">
                      {spaceInfo.pallet.unitsPerPallet}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        ({spaceInfo.pallet.layoutDesc})
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{tW('Pallets needed')}</p>
                    <p className="text-sm font-semibold tabular-nums">{spaceInfo.pallet.palletsNeeded}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs text-muted-foreground mb-1">{tW('Last pallet')}</p>
                    <div className="flex items-center gap-2">
                      <Progress
                        value={Math.min(spaceInfo.pallet.lastPalletFillPct, 100)}
                        className="h-2 flex-1"
                      />
                      <span className="text-xs font-medium tabular-nums w-10 text-right">
                        {Math.round(spaceInfo.pallet.lastPalletFillPct)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {spaceInfo.pallet.lastPalletUnits}/{spaceInfo.pallet.unitsPerPallet} {tW('units')}
                    </p>
                  </div>
                </div>
                {spaceInfo.pallet.weightLimited && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 flex items-center gap-1">
                    <span>&#9888;</span> {tW('Weight-limited')} ({EURO_PALLET.maxWeightKg.toLocaleString()} kg max)
                  </p>
                )}
              </div>

              <Separator />

              {/* Shipping Cartons */}
              {spaceInfo.cartons.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <PackageOpen className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-medium text-muted-foreground">{tW('Shipping Cartons')}</h4>
                  </div>
                  {(() => {
                    // Show top 3 carton options
                    const top3 = spaceInfo.cartons.slice(0, 3);
                    // The first one that has DHL compliance is recommended
                    const recommended = spaceInfo.cartons.find(c =>
                      c.carrierCompliance.some(cc => cc.carrierId === 'dhl' && cc.fits)
                    ) ?? top3[0];

                    return (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {tW('Recommended')}: <span className="font-semibold text-foreground">{recommended.carton.label} cm</span>
                          {recommended.carton.palletModule !== '—' && (
                            <span className="ml-1">({tW('pallet module')} {recommended.carton.palletModule})</span>
                          )}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {top3.map((fit) => {
                            const isRecommended = fit.carton.id === recommended.carton.id;
                            return (
                              <div
                                key={fit.carton.id}
                                className={`rounded-lg border p-3 space-y-2.5 ${isRecommended ? 'border-primary bg-primary/5' : ''}`}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold">{fit.carton.label} cm</p>
                                  {isRecommended && <Star className="h-3.5 w-3.5 text-primary fill-primary" />}
                                </div>

                                <div className="space-y-1">
                                  <p className="text-sm tabular-nums">
                                    <span className="font-bold">{fit.unitsPerCarton}</span>{' '}
                                    <span className="text-muted-foreground">{tW('per carton')}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground">({fit.layoutDesc})</p>
                                </div>

                                <div className="space-y-1">
                                  <p className="text-sm tabular-nums">
                                    <span className="font-bold">{fit.cartonsNeeded}</span>{' '}
                                    <span className="text-muted-foreground">
                                      {fit.cartonsNeeded === 1 ? tW('Carton') : tW('Cartons')}
                                    </span>
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <Progress
                                      value={Math.min(fit.lastCartonFillPct, 100)}
                                      className="h-1.5 flex-1"
                                    />
                                    <span className="text-[10px] tabular-nums w-8 text-right">
                                      {Math.round(fit.lastCartonFillPct)}%
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-muted-foreground">
                                    {tW('Last carton')}: {fit.lastCartonUnits}/{fit.unitsPerCarton}
                                  </p>
                                </div>

                                {fit.cartonWeightKg != null && (
                                  <p className="text-xs text-muted-foreground">
                                    ~{fit.cartonWeightKg.toFixed(1)} kg/{tW('Carton')}
                                  </p>
                                )}

                                <TooltipProvider delayDuration={200}>
                                  <div className="flex flex-wrap gap-1.5 pt-1 border-t">
                                    {fit.carrierCompliance.map((cc) => (
                                      <Tooltip key={cc.carrierId}>
                                        <TooltipTrigger asChild>
                                          <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${
                                            cc.fits
                                              ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
                                              : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400'
                                          }`}>
                                            {cc.fits
                                              ? <Check className="h-2.5 w-2.5" />
                                              : <X className="h-2.5 w-2.5" />}
                                            {cc.carrierLabel}
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">
                                          {cc.fits ? tW('fits') : cc.reason}
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                  </div>
                                </TooltipProvider>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : batch.quantity && batch.quantity > 0 && spaceInfo ? (
                <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{tW('No standard carton fits')} — {tW('Single item shipping required')}</span>
                </div>
              ) : null}

              <Separator />

              {/* Container Fit */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">{tW('Container Fit')}</h4>
                <div className="grid grid-cols-3 gap-3">
                  {(Object.keys(CONTAINERS) as ContainerType[]).map((type) => {
                    const c = spaceInfo.containers[type];
                    return (
                      <div key={type} className="rounded-lg border p-3 space-y-2">
                        <p className="text-xs font-medium">{c.containerLabel}</p>
                        <p className="text-lg font-bold tabular-nums">
                          {c.containersNeeded}
                          <span className="text-xs font-normal text-muted-foreground ml-1">
                            {c.containersNeeded === 1 ? tW('container') : tW('containers')}
                          </span>
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Progress
                              value={Math.min(c.fillPercentVolume, 100)}
                              className="h-1.5 flex-1"
                            />
                            <span className="text-[10px] tabular-nums w-8 text-right">
                              {Math.round(c.fillPercentVolume)}%
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{tW('Volume fill')}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Warnings */}
              {spaceInfo.warnings.length > 0 && !spaceInfo.pallet.weightLimited && (
                <div className="text-xs text-muted-foreground italic space-y-0.5">
                  {spaceInfo.warnings.map((w, i) => (
                    <p key={i}>&#9888; {tW(w)} — {tW('Weight limit not checked')}</p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : batch.quantity && batch.quantity > 0 ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-primary" />
                {tW('Space & Logistics')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {tW('No dimensions available')} —{' '}
                <Link to={`/products/${productId}/edit`} className="text-primary hover:underline">
                  {tW('Add product dimensions')}
                </Link>
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Public Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Public DPP Links
            </CardTitle>
            <CardDescription>Links to the public Digital Product Passport for this batch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Customer View</p>
              <div className="p-3 rounded-lg bg-muted font-mono text-sm break-all">
                /p/{product.gtin}/{batch.serialNumber}
              </div>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a
                  href={`/p/${product.gtin}/${batch.serialNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Open Customer View
                </a>
              </Button>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Customs View</p>
              <div className="p-3 rounded-lg bg-muted font-mono text-sm break-all">
                /p/{product.gtin}/{batch.serialNumber}/customs
              </div>
              <Button variant="outline" size="sm" className="mt-2" asChild>
                <a
                  href={`/p/${product.gtin}/${batch.serialNumber}/customs`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-3 w-3" />
                  Open Customs View
                </a>
              </Button>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">GS1 Digital Link</p>
              <div className="p-3 rounded-lg bg-muted font-mono text-sm break-all">
                /01/{product.gtin}/21/{batch.serialNumber}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description (merged) */}
      {displayDescription && (
        <Card>
          <CardHeader>
            <CardTitle>
              Description
              {batch.descriptionOverride && (
                <Badge variant="outline" className="ml-2 border-primary text-primary">Override</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{displayDescription}</p>
          </CardContent>
        </Card>
      )}

      {/* Materials (merged) */}
      {displayMaterials && displayMaterials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Materials
              {batch.materialsOverride && (
                <Badge variant="outline" className="ml-2 border-primary text-primary">Override</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayMaterials.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">{m.name}</span>
                    {m.origin && <span className="text-sm text-muted-foreground">{m.origin}</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{m.percentage}%</span>
                    {m.recyclable && (
                      <Badge variant="outline" className="text-success border-success">Recyclable</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certifications (merged) */}
      {displayCertifications && displayCertifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              Certifications
              {batch.certificationsOverride && (
                <Badge variant="outline" className="ml-2 border-primary text-primary">Override</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {displayCertifications.map((cert, i) => (
                <Badge key={i} variant="secondary">{cert.name}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Delete this batch</p>
              <p className="text-sm text-muted-foreground">This action cannot be undone. The product itself will not be affected.</p>
            </div>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Batch
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
