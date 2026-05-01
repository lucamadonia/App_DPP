import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertTriangle, Box, CheckCircle2, ClipboardCheck, Info, Package, Plus, Ruler, Trash2, Warehouse, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { WarehouseStepIndicator } from '@/components/warehouse/WarehouseStepIndicator';
import { WarehouseStepTransition } from '@/components/warehouse/WarehouseStepTransition';
import { WarehouseSuccessAnimation } from '@/components/warehouse/WarehouseSuccessAnimation';
import { QuantityStepper } from '@/components/warehouse/QuantityStepper';
import { getProducts, getProductById } from '@/services/supabase/products';
import { getBatches, getBatchById } from '@/services/supabase/batches';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { createGoodsReceipt, createGoodsReceiptMultiBin, getStockForBatch, getLocationUsedVolumeM3 } from '@/services/supabase/wh-stock';
import { calculateVolume, analyzeCapacity, formatVolumeM3 } from '@/lib/warehouse-volume';
import { ShelfPicker, type ShelfPickerValue } from '@/components/warehouse/ShelfPicker';
import type { Product, ProductBatch } from '@/types/product';
import type { WhLocation, WhStockLevel } from '@/types/warehouse';

const WIZARD_STEPS = [
  { icon: Package, label: 'Select Product & Batch' },
  { icon: Warehouse, label: 'Location & Quantity' },
  { icon: ClipboardCheck, label: 'Confirm Receipt' },
];

export function GoodsReceiptPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Prefilled from "Outstanding Goods Receipts" page (?productId=...&batchId=...)
  const prefillProductId = searchParams.get('productId') || '';
  const prefillBatchId = searchParams.get('batchId') || '';

  const [step, setStep] = useState(0);
  const prevStepRef = useRef(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [showSuccess, setShowSuccess] = useState(false);
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

  // Form state — initial values may come from URL prefill
  const [productId, setProductId] = useState(prefillProductId);
  const [batchId, setBatchId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [quantityDamaged, setQuantityDamaged] = useState(0);
  const [quantityQuarantine, setQuantityQuarantine] = useState(0);
  const [binLocation, setBinLocation] = useState('');
  const [binDisplayLabel, setBinDisplayLabel] = useState('');
  const [zone, setZone] = useState('');

  // Additional bins — each splits a chunk of the GOOD quantity to its own shelf.
  // Damaged/Quarantine always stay on the primary (first) bin.
  interface AdditionalBin {
    id: string;
    binLocation: string;
    binDisplayLabel: string;
    zone: string;
    quantity: number;
  }
  const [additionalBins, setAdditionalBins] = useState<AdditionalBin[]>([]);

  const addExtraBin = () => {
    setAdditionalBins(prev => [
      ...prev,
      { id: crypto.randomUUID(), binLocation: '', binDisplayLabel: '', zone: '', quantity: 0 },
    ]);
  };
  const updateExtraBin = (id: string, patch: Partial<AdditionalBin>) => {
    setAdditionalBins(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
  };
  const removeExtraBin = (id: string) => {
    setAdditionalBins(prev => prev.filter(b => b.id !== id));
  };

  // Sum of good quantities across primary + additional bins
  const totalGoodAcrossBins = (quantity - quantityDamaged - quantityQuarantine)
    + additionalBins.reduce((s, b) => s + (b.quantity || 0), 0);
  const totalReceived = totalGoodAcrossBins + quantityDamaged + quantityQuarantine;
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Step navigation with direction tracking
  const goToStep = (next: number) => {
    setDirection(next > step ? 'forward' : 'backward');
    prevStepRef.current = step;
    setStep(next);
  };

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
      const [p, l] = await Promise.all([getProducts(), getActiveLocations()]);
      setProducts(p.map((pr: { id: string; name: string }) => ({ id: pr.id, name: pr.name })));
      setLocations(l);
    }
    load();
  }, []);

  useEffect(() => {
    if (productId) {
      getBatches(productId).then((b) => {
        const list = b.map((batch) => ({ id: batch.id, serial_number: batch.serialNumber, quantity: batch.quantity ?? 0 }));
        setBatches(list);
        // If prefill batchId is in the list and we're still on step 0, auto-select it.
        // Don't auto-advance — let the user review the batch context first.
        if (prefillBatchId && !batchId && list.some((row) => row.id === prefillBatchId)) {
          setBatchId(prefillBatchId);
        }
      });
      getProductById(productId).then(setSelectedProduct);
    } else {
      setSelectedProduct(null);
    }
    // batchId intentionally omitted — we only want this to fire on productId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, prefillBatchId]);

  useEffect(() => {
    if (batchId) {
      setLoadingStock(true);
      getStockForBatch(batchId).then(setBatchStock).finally(() => setLoadingStock(false));
      getBatchById(batchId).then(setSelectedBatchFull);
    } else {
      setBatchStock([]);
      setSelectedBatchFull(null);
    }
  }, [batchId]);

  useEffect(() => {
    if (locationId) {
      setLoadingCapacity(true);
      getLocationUsedVolumeM3(locationId)
        .then(({ totalM3, coverage }) => { setLocationUsedM3(totalM3); setVolumeCoverage(coverage); })
        .catch(() => { setLocationUsedM3(null); setVolumeCoverage(1); })
        .finally(() => setLoadingCapacity(false));
    } else {
      setLocationUsedM3(null);
      setVolumeCoverage(1);
    }
  }, [locationId]);

  const handleSubmit = async () => {
    if (!productId || !batchId || !locationId || quantity <= 0) return;

    // Validate that every extra bin row has a shelf and positive qty
    const extras = additionalBins.filter(b => b.quantity > 0);
    if (extras.some(b => !b.binLocation)) {
      toast.error(t('Each extra shelf must have a storage location selected'));
      return;
    }
    if (extras.some(b => b.quantity <= 0)) {
      toast.error(t('Each extra shelf must have a quantity greater than zero'));
      return;
    }

    setLoading(true);
    try {
      if (extras.length === 0) {
        // Single-bin path — keep the existing behaviour exactly
        await createGoodsReceipt({
          locationId, productId, batchId, quantity,
          quantityDamaged: quantityDamaged || 0,
          quantityQuarantine: quantityQuarantine || 0,
          binLocation: binLocation || undefined,
          zone: zone || undefined,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
        });
      } else {
        // Multi-bin path — primary bin keeps damaged + quarantine
        if (!binLocation) {
          toast.error(t('Primary shelf is required when distributing across multiple shelves'));
          setLoading(false);
          return;
        }
        const primaryGoodQty = quantity - (quantityDamaged || 0) - (quantityQuarantine || 0);
        const distributions = [
          {
            binLocation,
            // Total includes damaged + quarantine on primary bin
            quantity: primaryGoodQty + (quantityDamaged || 0) + (quantityQuarantine || 0),
            quantityDamaged: quantityDamaged || 0,
            quantityQuarantine: quantityQuarantine || 0,
          },
          ...extras.map(b => ({
            binLocation: b.binLocation,
            quantity: b.quantity,
          })),
        ];
        const totalQty = distributions.reduce((s, d) => s + d.quantity, 0);
        await createGoodsReceiptMultiBin({
          locationId, productId, batchId,
          totalQuantity: totalQty,
          totalDamaged: quantityDamaged || 0,
          totalQuarantine: quantityQuarantine || 0,
          zone: zone || undefined,
          referenceNumber: referenceNumber || undefined,
          notes: notes || undefined,
          distributions,
        });
      }
      setShowSuccess(true);
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

  const currentFillPercent = useMemo(() => {
    if (locationUsedM3 == null || !selectedLocation?.capacityVolumeM3) return null;
    return (locationUsedM3 / selectedLocation.capacityVolumeM3) * 100;
  }, [locationUsedM3, selectedLocation]);

  /* ---- Success Screen ---- */
  if (showSuccess) {
    return (
      <WarehouseSuccessAnimation
        title={t('Goods Received!')}
        subtitle={t('Your goods receipt has been recorded successfully.')}
        summaryItems={[
          { label: t('Product'), value: products.find(p => p.id === productId)?.name ?? '' },
          { label: t('Batch'), value: batches.find(b => b.id === batchId)?.serial_number ?? '' },
          { label: t('Quantity'), value: `${quantity} (${goodQuantity} ${t('Good Condition')})` },
          { label: t('Location'), value: locations.find(l => l.id === locationId)?.name ?? '' },
        ]}
        steps={[
          { icon: Package, title: t('Stock will be updated in the inventory'), description: t('Batch progress has been recorded') },
          { icon: ClipboardCheck, title: t('View in inventory to verify stock levels'), description: '' },
        ]}
        primaryAction={{ label: t('View Inventory'), onClick: () => navigate('/warehouse/inventory') }}
        secondaryAction={{ label: t('New Goods Receipt'), onClick: () => window.location.reload() }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('Create Goods Receipt')}</h1>
      </div>

      {/* Step Indicator */}
      <WarehouseStepIndicator steps={WIZARD_STEPS} currentStep={step} />

      {/* Step 0: Select Product & Batch */}
      {step === 0 && (
        <WarehouseStepTransition direction={direction} stepKey={step}>
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('Select Product & Batch')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="space-y-2">
                <Label>{t('Product')}</Label>
                <Select value={productId} onValueChange={(v) => { setProductId(v); setBatchId(''); }}>
                  <SelectTrigger><SelectValue placeholder={t('Select Product')} /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Product preview card */}
              {productId && selectedProduct && (
                <div className="rounded-lg border bg-muted/30 p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 animate-scale-in">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{selectedProduct.name}</p>
                    {selectedProduct.gtin && (
                      <p className="text-xs text-muted-foreground font-mono">{selectedProduct.gtin}</p>
                    )}
                  </div>
                </div>
              )}

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
                <div className="rounded-lg border bg-card p-3 sm:p-4 space-y-2 sm:space-y-3 animate-fade-in-up">
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
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-md bg-muted/50 p-2 sm:p-2.5 text-center">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">{t('Batch ordered')}</div>
                      <div className="text-base sm:text-lg font-semibold">{batchTotal}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2 sm:p-2.5 text-center">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">{t('Already received')}</div>
                      <div className="text-base sm:text-lg font-semibold">{alreadyReceived}</div>
                    </div>
                    <div className="rounded-md bg-muted/50 p-2 sm:p-2.5 text-center">
                      <div className="text-[10px] sm:text-xs text-muted-foreground">{t('Outstanding')}</div>
                      <div className={`text-base sm:text-lg font-semibold ${fullyReceived ? 'text-green-600' : ''}`}>{remaining}</div>
                    </div>
                  </div>
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

              <Button onClick={() => goToStep(1)} disabled={!productId || !batchId}>
                {t('Continue', { ns: 'common' })}
              </Button>
            </CardContent>
          </Card>
        </WarehouseStepTransition>
      )}

      {/* Step 1: Location & Quantity */}
      {step === 1 && (
        <WarehouseStepTransition direction={direction} stepKey={step}>
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Warehouse className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('Location & Quantity')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
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

              {remaining > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => { setQuantity(remaining); setQuantityDamaged(0); setQuantityQuarantine(0); }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  {t('Use remaining quantity')} ({remaining})
                </Button>
              )}

              {/* Quantity Steppers */}
              <div className="grid gap-3 sm:gap-4 grid-cols-3">
                <QuantityStepper
                  label={t('Good Condition')}
                  value={quantity}
                  onChange={setQuantity}
                  min={0}
                  variant="green"
                />
                <QuantityStepper
                  label={t('Damaged')}
                  value={quantityDamaged}
                  onChange={setQuantityDamaged}
                  min={0}
                  variant="orange"
                />
                <QuantityStepper
                  label={t('Quarantine')}
                  value={quantityQuarantine}
                  onChange={setQuantityQuarantine}
                  min={0}
                  variant="red"
                />
              </div>

              {exceedsBatch && (
                <div className="flex items-center gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 p-2.5 text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{t('Total would exceed batch size', { batchSize: batchTotal })}</span>
                </div>
              )}

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
                  <div className="rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                      <Box className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                      {t('Warehouse Capacity')}
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div className="rounded-md bg-muted/50 p-2 sm:p-2.5 text-center">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{t('Currently Used')}</div>
                        <div className="text-sm sm:text-lg font-semibold">{formatVolumeM3(locationUsedM3)}</div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 sm:p-2.5 text-center">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{t('Available')}</div>
                        <div className="text-sm sm:text-lg font-semibold text-green-600 dark:text-green-400">
                          {formatVolumeM3(Math.max(0, selectedLocation.capacityVolumeM3 - locationUsedM3))}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 sm:p-2.5 text-center">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{t('Total Capacity')}</div>
                        <div className="text-sm sm:text-lg font-semibold">{formatVolumeM3(selectedLocation.capacityVolumeM3)}</div>
                      </div>
                    </div>
                    {currentFillPercent != null && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{t('Current utilization')}</span>
                          <span>{currentFillPercent.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              currentFillPercent > 100 ? 'bg-red-500' : currentFillPercent >= 80 ? 'bg-yellow-500' : 'bg-primary'
                            }`}
                            style={{ width: `${Math.min(100, currentFillPercent)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {receiptVolume && capacityAnalysis && capacityAnalysis.status !== 'unknown' && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span><Package className="inline h-3 w-3 mr-1" />{t('This delivery')}: +{formatVolumeM3(receiptVolume.totalVolumeM3)}</span>
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
                    {capacityAnalysis && capacityAnalysis.status === 'ok' && (
                      <div className="flex items-center gap-2 rounded-md bg-green-50 dark:bg-green-950/30 p-2 text-xs text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /><span>{t('Enough space available')}</span>
                      </div>
                    )}
                    {capacityAnalysis && capacityAnalysis.status === 'warning' && (
                      <div className="flex items-center gap-2 rounded-md bg-yellow-50 dark:bg-yellow-950/30 p-2 text-xs text-yellow-700 dark:text-yellow-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /><span>{t('Location would be over 80% full after this receipt')}</span>
                      </div>
                    )}
                    {capacityAnalysis && capacityAnalysis.status === 'over_capacity' && (
                      <div className="flex items-center gap-2 rounded-md bg-red-50 dark:bg-red-950/30 p-2 text-xs text-red-700 dark:text-red-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" /><span>{t('Not enough space! Exceeds capacity by {{excess}}', { excess: formatVolumeM3(Math.abs(capacityAnalysis.remainingAfterM3)) })}</span>
                      </div>
                    )}
                    {volumeCoverage < 1 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Info className="h-3.5 w-3.5 shrink-0" />
                        <span>{t('{{pct}}% of products have dimensions', { pct: Math.round(volumeCoverage * 100) })} — {t('Volume is an estimate')}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
              {locationId && loadingCapacity && (
                <>
                  <Separator />
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Box className="h-4 w-4 animate-pulse" />{t('Loading capacity data...')}
                    </div>
                  </div>
                </>
              )}
              {receiptVolume && (
                <>
                  <Separator />
                  <div className="rounded-lg border p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                      <Ruler className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />{t('Space Requirements')}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <div className="rounded-md bg-muted/50 p-2 sm:p-2.5">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{t('Volume per unit')}</div>
                        <div className="text-sm sm:text-base font-semibold">{formatVolumeM3(receiptVolume.unitVolumeM3)}</div>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2 sm:p-2.5">
                        <div className="text-[10px] sm:text-xs text-muted-foreground">{t('Total for {{qty}} units', { qty: quantity })}</div>
                        <div className="text-sm sm:text-base font-semibold text-primary">{formatVolumeM3(receiptVolume.totalVolumeM3)}</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {receiptVolume.dimensions.heightCm} × {receiptVolume.dimensions.widthCm} × {receiptVolume.dimensions.depthCm} cm
                      {' '}({receiptVolume.source === 'packaging' ? t('Based on packaging dimensions') : t('Based on product dimensions (no packaging dimensions available)')})
                    </div>
                    {capacityAnalysis && capacityAnalysis.status === 'unknown' && (
                      <div className="text-xs text-muted-foreground italic">{t('No volume capacity configured for this location')}</div>
                    )}
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>
                  {t('Storage Location')}
                  {additionalBins.length > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({t('Primary shelf — receives damaged + quarantine')})
                    </span>
                  )}
                </Label>
                {selectedLocation ? (
                  <ShelfPicker
                    location={selectedLocation}
                    value={binLocation || undefined}
                    zone={zone || undefined}
                    onSelect={(val: ShelfPickerValue) => {
                      setBinLocation(val.binLocation);
                      setBinDisplayLabel(val.displayLabel);
                      if (val.zone) setZone(val.zone);
                    }}
                    onClear={() => {
                      setBinLocation('');
                      setBinDisplayLabel('');
                      setZone('');
                    }}
                  />
                ) : (
                  <Input value={binLocation} onChange={(e) => setBinLocation(e.target.value)} placeholder="z.B. A-03-12" />
                )}
              </div>

              {/* Additional bins for splitting the receipt across multiple shelves */}
              {selectedLocation && (
                <div className="space-y-2">
                  {additionalBins.length > 0 && (
                    <div className="rounded-md bg-muted/30 p-2 text-xs text-muted-foreground">
                      {t('Distributed total')}: <span className="font-medium text-foreground">{totalReceived}</span>
                      {' '}({(quantity - quantityDamaged - quantityQuarantine)} {t('on primary')} +{' '}
                      {additionalBins.reduce((s, b) => s + (b.quantity || 0), 0)} {t('on extra shelves')}
                      {(quantityDamaged + quantityQuarantine) > 0 && ` + ${quantityDamaged + quantityQuarantine} ${t('damaged/quarantine')}`})
                    </div>
                  )}

                  {additionalBins.map((extra, idx) => (
                    <div key={extra.id} className="rounded-lg border bg-card p-2 sm:p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">
                          {t('Extra Shelf {{num}}', { num: idx + 2 })}
                        </Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeExtraBin(extra.id)}
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          title={t('Remove this shelf')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <ShelfPicker
                        location={selectedLocation}
                        value={extra.binLocation || undefined}
                        zone={extra.zone || undefined}
                        onSelect={(val) => updateExtraBin(extra.id, {
                          binLocation: val.binLocation,
                          binDisplayLabel: val.displayLabel,
                          zone: val.zone || '',
                        })}
                        onClear={() => updateExtraBin(extra.id, {
                          binLocation: '',
                          binDisplayLabel: '',
                          zone: '',
                        })}
                      />
                      <QuantityStepper
                        label={t('Quantity on this shelf')}
                        value={extra.quantity}
                        onChange={(v) => updateExtraBin(extra.id, { quantity: v })}
                        min={0}
                        variant="green"
                      />
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addExtraBin}
                    className="gap-1.5 w-full"
                    disabled={!binLocation}
                    title={!binLocation ? t('Pick the primary shelf first') : undefined}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('Add another shelf')}
                  </Button>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => goToStep(0)}>{t('Back', { ns: 'common' })}</Button>
                <Button onClick={() => goToStep(2)} disabled={!locationId || quantity <= 0}>{t('Continue', { ns: 'common' })}</Button>
              </div>
            </CardContent>
          </Card>
        </WarehouseStepTransition>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && (
        <WarehouseStepTransition direction={direction} stepKey={step}>
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                {t('Receipt Summary')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
              {/* Visual receipt card */}
              <div className="rounded-xl border-2 border-dashed bg-muted/30 p-3 sm:p-5 space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{products.find(p => p.id === productId)?.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{batches.find(b => b.id === batchId)?.serial_number}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                  <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-1.5 sm:p-2">
                    <div className="text-base sm:text-lg font-bold text-green-600">{goodQuantity}</div>
                    <div className="text-[9px] sm:text-[10px] text-green-700/70">{t('Good Condition')}</div>
                  </div>
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-1.5 sm:p-2">
                    <div className="text-base sm:text-lg font-bold text-orange-600">{quantityDamaged}</div>
                    <div className="text-[9px] sm:text-[10px] text-orange-700/70">{t('Damaged')}</div>
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-1.5 sm:p-2">
                    <div className="text-base sm:text-lg font-bold text-red-600">{quantityQuarantine}</div>
                    <div className="text-[9px] sm:text-[10px] text-red-700/70">{t('Quarantine')}</div>
                  </div>
                </div>
                {batchTotal > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{t('Batch')}:</span>
                      <span>{afterReceived} / {batchTotal} ({afterPercent}%)</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${afterPercent >= 100 ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${Math.min(100, afterPercent)}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="text-sm space-y-1 pt-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t('Location')}:</span><span className="font-medium">{locations.find(l => l.id === locationId)?.name}</span></div>
                  {receiptVolume && (
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('Space Requirements')}:</span><span className="font-medium">{formatVolumeM3(receiptVolume.totalVolumeM3)}</span></div>
                  )}
                  {binLocation && additionalBins.filter(b => b.quantity > 0).length === 0 && (
                    <div className="flex justify-between"><span className="text-muted-foreground">{t('Storage Location')}:</span><span className="font-medium">{binDisplayLabel || binLocation}</span></div>
                  )}
                </div>

                {/* Multi-bin breakdown */}
                {additionalBins.filter(b => b.quantity > 0).length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground mb-1">{t('Storage distribution')}</div>
                    <div className="rounded-md bg-muted/40 p-2 text-sm flex justify-between">
                      <span>{binDisplayLabel || binLocation}</span>
                      <span className="font-mono font-medium">{quantity}</span>
                    </div>
                    {additionalBins.filter(b => b.quantity > 0).map(b => (
                      <div key={b.id} className="rounded-md bg-muted/40 p-2 text-sm flex justify-between">
                        <span>{b.binDisplayLabel || b.binLocation}</span>
                        <span className="font-mono font-medium">{b.quantity}</span>
                      </div>
                    ))}
                    <div className="rounded-md bg-primary/10 p-2 text-sm flex justify-between font-semibold">
                      <span>{t('Total')}</span>
                      <span className="font-mono">{totalReceived}</span>
                    </div>
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
                <Button variant="outline" onClick={() => goToStep(1)}>{t('Back', { ns: 'common' })}</Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('Confirm Receipt')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </WarehouseStepTransition>
      )}
    </div>
  );
}
