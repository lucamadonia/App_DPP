import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertTriangle, Box, Check, CheckCircle2, Info, Package, Ruler, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getProducts, getProductById } from '@/services/supabase/products';
import { getBatches, getBatchById } from '@/services/supabase/batches';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { createGoodsReceipt, getStockForBatch, getLocationUsedVolumeM3 } from '@/services/supabase/wh-stock';
import { calculateVolume, analyzeCapacity, formatVolumeM3 } from '@/lib/warehouse-volume';
import type { Product, ProductBatch } from '@/types/product';
import type { WhLocation, WhStockLevel } from '@/types/warehouse';

export function GoodsReceiptPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; serial_number: string; quantity: number }[]>([]);
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [loading, setLoading] = useState(false);

  // Batch context state
  const [batchStock, setBatchStock] = useState<WhStockLevel[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);

  // Full product/batch for volume calculation
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedBatchFull, setSelectedBatchFull] = useState<ProductBatch | null>(null);

  // Location capacity state
  const [locationUsedM3, setLocationUsedM3] = useState<number | null>(null);
  const [volumeCoverage, setVolumeCoverage] = useState(1);
  const [loadingCapacity, setLoadingCapacity] = useState(false);

  // Form state
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [quantityDamaged, setQuantityDamaged] = useState(0);
  const [quantityQuarantine, setQuantityQuarantine] = useState(0);
  const [binLocation, setBinLocation] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Computed batch context
  const selectedBatch = useMemo(() => batches.find(b => b.id === batchId), [batches, batchId]);
  const batchTotal = selectedBatch?.quantity ?? 0;
  const alreadyReceived = useMemo(
    () => batchStock.reduce((sum, s) => sum + s.quantityAvailable + s.quantityReserved + s.quantityDamaged + s.quantityQuarantine, 0),
    [batchStock]
  );
  const receiptCount = batchStock.length;
  const remaining = Math.max(0, batchTotal - alreadyReceived);
  const fullyReceived = batchTotal > 0 && remaining === 0;

  // After-receipt preview
  const afterReceived = alreadyReceived + quantity;
  const afterPercent = batchTotal > 0 ? Math.min(100, Math.round((afterReceived / batchTotal) * 100)) : 0;
  const exceedsBatch = batchTotal > 0 && afterReceived > batchTotal;

  useEffect(() => {
    async function load() {
      const [p, l] = await Promise.all([
        getProducts(),
        getActiveLocations(),
      ]);
      setProducts(p.map((pr: { id: string; name: string }) => ({ id: pr.id, name: pr.name })));
      setLocations(l);
    }
    load();
  }, []);

  useEffect(() => {
    if (productId) {
      getBatches(productId).then((b) =>
        setBatches(b.map((batch) => ({
          id: batch.id,
          serial_number: batch.serialNumber,
          quantity: batch.quantity ?? 0,
        })))
      );
      getProductById(productId).then(setSelectedProduct);
    } else {
      setSelectedProduct(null);
    }
  }, [productId]);

  // Load stock data and full batch when batch changes
  useEffect(() => {
    if (batchId) {
      setLoadingStock(true);
      getStockForBatch(batchId)
        .then(setBatchStock)
        .finally(() => setLoadingStock(false));
      getBatchById(batchId).then(setSelectedBatchFull);
    } else {
      setBatchStock([]);
      setSelectedBatchFull(null);
    }
  }, [batchId]);

  // Load used volume when location changes
  useEffect(() => {
    if (locationId) {
      setLoadingCapacity(true);
      getLocationUsedVolumeM3(locationId)
        .then(({ totalM3, coverage }) => {
          setLocationUsedM3(totalM3);
          setVolumeCoverage(coverage);
        })
        .catch(() => {
          setLocationUsedM3(null);
          setVolumeCoverage(1);
        })
        .finally(() => setLoadingCapacity(false));
    } else {
      setLocationUsedM3(null);
      setVolumeCoverage(1);
    }
  }, [locationId]);

  const handleSubmit = async () => {
    if (!productId || !batchId || !locationId || quantity <= 0) return;
    setLoading(true);
    try {
      await createGoodsReceipt({
        locationId,
        productId,
        batchId,
        quantity,
        quantityDamaged: quantityDamaged || 0,
        quantityQuarantine: quantityQuarantine || 0,
        binLocation: binLocation || undefined,
        referenceNumber: referenceNumber || undefined,
        notes: notes || undefined,
      });
      toast.success(t('Goods received successfully'));
      navigate('/warehouse/inventory');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const goodQuantity = quantity - quantityDamaged - quantityQuarantine;

  // Volume calculation
  const receiptVolume = useMemo(() => {
    if (!selectedProduct || quantity <= 0) return null;
    return calculateVolume(selectedProduct, quantity, selectedBatchFull);
  }, [selectedProduct, selectedBatchFull, quantity]);

  const selectedLocation = useMemo(() => locations.find(l => l.id === locationId), [locationId, locations]);

  const capacityAnalysis = useMemo(() => {
    if (!receiptVolume || !locationId) return null;
    return analyzeCapacity(receiptVolume.totalVolumeM3, selectedLocation?.capacityVolumeM3, locationUsedM3);
  }, [receiptVolume, locationId, selectedLocation, locationUsedM3]);

  // Current fill percentage (before this receipt)
  const currentFillPercent = useMemo(() => {
    if (locationUsedM3 == null || !selectedLocation?.capacityVolumeM3) return null;
    return (locationUsedM3 / selectedLocation.capacityVolumeM3) * 100;
  }, [locationUsedM3, selectedLocation]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('Create Goods Receipt')}</h1>
        <p className="text-muted-foreground">{t('Step {{step}} of 3', { step, ns: 'common' }).replace('Step {{step}} of 3', `Step ${step} of 3`)}</p>
      </div>

      {/* Step Indicators */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('Select Product')} & {t('Select Batch')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Product')}</Label>
              <Select value={productId} onValueChange={(v) => { setProductId(v); setBatchId(''); }}>
                <SelectTrigger><SelectValue placeholder={t('Select Product')} /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {productId && (
              <div className="space-y-2">
                <Label>{t('Batch')}</Label>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger><SelectValue placeholder={t('Select Batch')} /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.serial_number} (Qty: {b.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Batch Context Card */}
            {batchId && !loadingStock && batchTotal > 0 && (
              <div className="rounded-lg border bg-card p-4 space-y-3">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t('{{received}} of {{total}} units', { received: alreadyReceived, total: batchTotal })}</span>
                    <span>{Math.round((alreadyReceived / batchTotal) * 100)}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${fullyReceived ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, Math.round((alreadyReceived / batchTotal) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* 3 Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-md bg-muted/50 p-2.5 text-center">
                    <div className="text-xs text-muted-foreground">{t('Batch ordered')}</div>
                    <div className="text-lg font-semibold">{batchTotal}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2.5 text-center">
                    <div className="text-xs text-muted-foreground">{t('Already received')}</div>
                    <div className="text-lg font-semibold">{alreadyReceived}</div>
                  </div>
                  <div className="rounded-md bg-muted/50 p-2.5 text-center">
                    <div className="text-xs text-muted-foreground">{t('Outstanding')}</div>
                    <div className={`text-lg font-semibold ${fullyReceived ? 'text-green-600' : ''}`}>{remaining}</div>
                  </div>
                </div>

                {/* Info text */}
                {fullyReceived ? (
                  <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 p-2.5 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t('All units of this batch have been received')}</span>
                  </div>
                ) : alreadyReceived > 0 ? (
                  <div className="flex items-center gap-2 rounded-md bg-blue-50 dark:bg-blue-950/30 p-2.5 text-sm text-blue-700 dark:text-blue-400">
                    <Package className="h-4 w-4 shrink-0" />
                    <span>{t('{{count}} units of this batch have already been received in {{receipts}} receipt(s)', { count: alreadyReceived, receipts: receiptCount })}</span>
                  </div>
                ) : null}
              </div>
            )}

            <Button onClick={() => setStep(2)} disabled={!productId || !batchId}>
              {t('Continue', { ns: 'common' })}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('Select Warehouse')} & {t('Quantity')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Location')}</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger><SelectValue placeholder={t('Select Warehouse')} /></SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} {l.code ? `(${l.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Quick-Fill button */}
            {remaining > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setQuantity(remaining);
                  setQuantityDamaged(0);
                  setQuantityQuarantine(0);
                }}
              >
                <Zap className="h-3.5 w-3.5" />
                {t('Use remaining quantity')} ({remaining})
              </Button>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('Good Condition')}</Label>
                <p className="text-xs text-muted-foreground">{t('Enter the quantity you are receiving in this delivery')}</p>
                <Input
                  type="number"
                  min={0}
                  value={quantity || ''}
                  placeholder={remaining > 0 ? String(remaining) : '0'}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Damaged')}</Label>
                <Input type="number" min={0} value={quantityDamaged || ''} onChange={(e) => setQuantityDamaged(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>{t('Quarantine')}</Label>
                <Input type="number" min={0} value={quantityQuarantine || ''} onChange={(e) => setQuantityQuarantine(Number(e.target.value))} />
              </div>
            </div>

            {/* Exceeds batch warning */}
            {exceedsBatch && (
              <div className="flex items-center gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 p-2.5 text-sm text-yellow-700 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{t('Total would exceed batch size', { batchSize: batchTotal })}</span>
              </div>
            )}

            {/* After-receipt progress preview */}
            {quantity > 0 && batchTotal > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('{{qty}} units will be received — then {{received}} of {{total}} stocked', { qty: quantity, received: afterReceived, total: batchTotal })}</span>
                  <span>{afterPercent}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${exceedsBatch ? 'bg-yellow-500' : afterPercent >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, afterPercent)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Warehouse Capacity Card */}
            {locationId && selectedLocation?.capacityVolumeM3 && locationUsedM3 != null && !loadingCapacity && (
              <>
                <Separator />
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Box className="h-4 w-4 text-primary" />
                    {t('Warehouse Capacity')}
                  </div>

                  {/* 3 Stat boxes */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-md bg-muted/50 p-2.5 text-center">
                      <div className="text-xs text-muted-foreground">{t('Currently Used')}</div>
                      <div className="text-lg font-semibold">{formatVolumeM3(locationUsedM3)}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5 text-center">
                      <div className="text-xs text-muted-foreground">{t('Available')}</div>
                      <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                        {formatVolumeM3(Math.max(0, selectedLocation.capacityVolumeM3 - locationUsedM3))}
                      </div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5 text-center">
                      <div className="text-xs text-muted-foreground">{t('Total Capacity')}</div>
                      <div className="text-lg font-semibold">{formatVolumeM3(selectedLocation.capacityVolumeM3)}</div>
                    </div>
                  </div>

                  {/* Current fill bar */}
                  {currentFillPercent != null && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('Current utilization')}</span>
                        <span>{currentFillPercent.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            currentFillPercent > 100 ? 'bg-red-500' :
                            currentFillPercent >= 80 ? 'bg-yellow-500' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(100, currentFillPercent)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* This delivery + after bar */}
                  {receiptVolume && capacityAnalysis && capacityAnalysis.status !== 'unknown' && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          <Package className="inline h-3 w-3 mr-1" />
                          {t('This delivery')}: +{formatVolumeM3(receiptVolume.totalVolumeM3)}
                        </span>
                        <span>{capacityAnalysis.fillPercentAfter.toFixed(1)}% {t('after receipt')}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            capacityAnalysis.status === 'over_capacity' ? 'bg-red-500' :
                            capacityAnalysis.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, capacityAnalysis.fillPercentAfter)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Status indicator */}
                  {capacityAnalysis && capacityAnalysis.status === 'ok' && (
                    <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 p-2 text-xs text-green-700 dark:text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span>{t('Enough space available')}</span>
                    </div>
                  )}
                  {capacityAnalysis && capacityAnalysis.status === 'warning' && (
                    <div className="flex items-center gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 p-2 text-xs text-yellow-700 dark:text-yellow-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{t('Location would be over 80% full after this receipt')}</span>
                    </div>
                  )}
                  {capacityAnalysis && capacityAnalysis.status === 'over_capacity' && (
                    <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 p-2 text-xs text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>{t('Not enough space! Exceeds capacity by {{excess}}', { excess: formatVolumeM3(Math.abs(capacityAnalysis.remainingAfterM3)) })}</span>
                    </div>
                  )}

                  {/* Coverage warning */}
                  {volumeCoverage < 1 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {t('{{pct}}% of products have dimensions', { pct: Math.round(volumeCoverage * 100) })}
                        {' — '}{t('Volume is an estimate')}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Loading capacity */}
            {locationId && loadingCapacity && (
              <>
                <Separator />
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Box className="h-4 w-4 animate-pulse" />
                    {t('Loading capacity data...')}
                  </div>
                </div>
              </>
            )}

            {/* Space Requirements (delivery volume details) */}
            {receiptVolume && (
              <>
                <Separator />
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Ruler className="h-4 w-4 text-primary" />
                    {t('Space Requirements')}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <div className="text-xs text-muted-foreground">{t('Volume per unit')}</div>
                      <div className="font-semibold">{formatVolumeM3(receiptVolume.unitVolumeM3)}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2.5">
                      <div className="text-xs text-muted-foreground">{t('Total for {{qty}} units', { qty: quantity })}</div>
                      <div className="font-semibold text-primary">{formatVolumeM3(receiptVolume.totalVolumeM3)}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {receiptVolume.dimensions.heightCm} × {receiptVolume.dimensions.widthCm} × {receiptVolume.dimensions.depthCm} cm
                    {' '}({receiptVolume.source === 'packaging'
                      ? t('Based on packaging dimensions')
                      : t('Based on product dimensions (no packaging dimensions available)')})
                  </div>

                  {/* No capacity configured hint */}
                  {capacityAnalysis && capacityAnalysis.status === 'unknown' && (
                    <div className="text-xs text-muted-foreground italic">
                      {t('No volume capacity configured for this location')}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>{t('Bin Location')}</Label>
              <Input value={binLocation} onChange={(e) => setBinLocation(e.target.value)} placeholder="z.B. A-03-12" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>{t('Back', { ns: 'common' })}</Button>
              <Button onClick={() => setStep(3)} disabled={!locationId || quantity <= 0}>
                {t('Continue', { ns: 'common' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('Receipt Summary')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Product')}:</span>
                <span className="font-medium">{products.find(p => p.id === productId)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Batch')}:</span>
                <span className="font-medium">{batches.find(b => b.id === batchId)?.serial_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Location')}:</span>
                <span className="font-medium">{locations.find(l => l.id === locationId)?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Quantity')}:</span>
                <span className="font-medium">
                  {quantity} ({goodQuantity} {t('Good Condition')}, {quantityDamaged} {t('Damaged')}, {quantityQuarantine} {t('Quarantine')})
                </span>
              </div>
              {receiptVolume && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Space Requirements')}:</span>
                  <span className="font-medium">{formatVolumeM3(receiptVolume.totalVolumeM3)}</span>
                </div>
              )}
              {batchTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Batch')}:</span>
                  <span className="font-medium">{t('{{qty}} of {{total}} units of this batch will now be received', { qty: quantity, total: batchTotal })}</span>
                </div>
              )}
              {binLocation && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Bin Location')}:</span>
                  <span className="font-medium">{binLocation}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t('Delivery Note Number')}</Label>
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>{t('Back', { ns: 'common' })}</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                <Check className="mr-2 h-4 w-4" />
                {t('Confirm Receipt')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
