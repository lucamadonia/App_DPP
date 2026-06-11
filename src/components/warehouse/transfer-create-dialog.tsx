/**
 * TransferCreateDialog — "From → To journey" stock transfer creation.
 *
 * Product + batch selection, visual location journey (TransferJourney),
 * 44px touch stepper with live availability validation, sticky submit on
 * mobile, and an animated success phase with traveling dot + check pulse.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight, ArrowRightLeft, Loader2, AlertTriangle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QuantityStepper } from '@/components/warehouse/QuantityStepper';
import { TransferJourney } from '@/components/warehouse/transfer-journey';
import { createStockTransfer, getStockLevels } from '@/services/supabase/wh-stock';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { getProducts } from '@/services/supabase/products';
import { getBatches } from '@/services/supabase/batches';
import { microInteraction } from '@/lib/motion';
import type { WhLocation } from '@/types/warehouse';

interface TransferCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called immediately after a transfer is created so the parent can refresh */
  onCreated: () => void;
}

interface Option {
  id: string;
  name: string;
}

type Phase = 'form' | 'success';

export function TransferCreateDialog({ open, onOpenChange, onCreated }: TransferCreateDialogProps) {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();

  // Reference data
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [batches, setBatches] = useState<Option[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [refsError, setRefsError] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Form state
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Availability
  const [available, setAvailable] = useState<number | null>(null);
  const [checkingStock, setCheckingStock] = useState(false);
  const [stockTick, setStockTick] = useState(0);

  // Submission / success
  const [saving, setSaving] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [pulseKey, setPulseKey] = useState(0);
  const [lastTransfer, setLastTransfer] = useState<{
    productName: string;
    batchName: string;
    fromName: string;
    toName: string;
    quantity: number;
  } | null>(null);

  const resetForm = useCallback(() => {
    setProductId('');
    setBatchId('');
    setBatches([]);
    setFromLocationId('');
    setToLocationId('');
    setQuantity(1);
    setNotes('');
    setAvailable(null);
    setPhase('form');
  }, []);

  // Load reference data when the dialog opens
  const loadRefs = useCallback(async () => {
    setLoadingRefs(true);
    setRefsError(false);
    try {
      const [l, p] = await Promise.all([getActiveLocations(), getProducts()]);
      setLocations(l);
      setProducts(p.map((pr: { id: string; name: string }) => ({ id: pr.id, name: pr.name })));
    } catch {
      setRefsError(true);
    } finally {
      setLoadingRefs(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
      setPulseKey(0);
      loadRefs();
    }
  }, [open, loadRefs, resetForm]);

  // Load batches when the product changes
  useEffect(() => {
    if (!productId) {
      setBatches([]);
      return;
    }
    let cancelled = false;
    setLoadingBatches(true);
    getBatches(productId)
      .then((b) => {
        if (cancelled) return;
        setBatches(b.map((batch: { id: string; serialNumber: string }) => ({
          id: batch.id,
          name: batch.serialNumber,
        })));
      })
      .catch(() => {
        if (!cancelled) toast.error(t('Failed to load locations or products'));
      })
      .finally(() => {
        if (!cancelled) setLoadingBatches(false);
      });
    return () => { cancelled = true; };
  }, [productId, t]);

  // Look up available stock when source location + batch are selected.
  // Sums across bin rows — a batch can be split over multiple shelves.
  useEffect(() => {
    if (!fromLocationId || !batchId) {
      setAvailable(null);
      return;
    }
    let cancelled = false;
    setCheckingStock(true);
    getStockLevels({ locationId: fromLocationId, batchId })
      .then((stock) => {
        if (cancelled) return;
        const total = stock.reduce((sum, s) => sum + (s.quantityAvailable || 0), 0);
        setAvailable(total);
        setQuantity((q) => (total > 0 ? Math.min(Math.max(q, 1), total) : 1));
      })
      .catch(() => {
        if (!cancelled) setAvailable(null);
      })
      .finally(() => {
        if (!cancelled) setCheckingStock(false);
      });
    return () => { cancelled = true; };
  }, [fromLocationId, batchId, stockTick]);

  const handleSwap = () => {
    setFromLocationId(toLocationId);
    setToLocationId(fromLocationId);
  };

  const exceedsAvailable = available != null && quantity > available;
  const noStock = available === 0;
  const canSubmit =
    !saving &&
    !checkingStock &&
    Boolean(fromLocationId && toLocationId && productId && batchId) &&
    fromLocationId !== toLocationId &&
    quantity > 0 &&
    available != null &&
    available > 0 &&
    quantity <= available;

  const handleTransfer = async () => {
    if (!canSubmit) return;
    if (fromLocationId === toLocationId) {
      toast.error(t('Source and destination must differ'));
      return;
    }
    setSaving(true);
    try {
      await createStockTransfer({
        fromLocationId,
        toLocationId,
        productId,
        batchId,
        quantity,
        notes: notes.trim() || undefined,
      });
      setLastTransfer({
        productName: products.find((p) => p.id === productId)?.name || '',
        batchName: batches.find((b) => b.id === batchId)?.name || '',
        fromName: locations.find((l) => l.id === fromLocationId)?.name || '',
        toName: locations.find((l) => l.id === toLocationId)?.name || '',
        quantity,
      });
      setPulseKey((k) => k + 1);
      setStockTick((k) => k + 1); // refresh availability for the next transfer
      onCreated();
      toast.success(t('Transfer completed'));
      setPhase('success');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Error', { ns: 'common' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90dvh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            {t('New Transfer')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t('Move stock between locations')}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait" initial={false}>
          {phase === 'success' && lastTransfer ? (
            <motion.div
              key="success"
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 sm:px-6 pb-5 text-center"
            >
              {/* Check pulse */}
              <motion.div
                {...(prefersReduced ? {} : microInteraction.successPulse)}
                className="relative mx-auto mb-4 mt-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-950"
              >
                {!prefersReduced && (
                  <span className="absolute inset-0 rounded-full bg-green-200/60 dark:bg-green-900/40 animate-pulse-ring" />
                )}
                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path className={prefersReduced ? '' : 'animate-check-draw'} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>

              <h3 className="text-base font-bold">{t('Transfer completed')}</h3>
              <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                {lastTransfer.quantity} × {lastTransfer.productName}
                {lastTransfer.batchName ? ` · ${lastTransfer.batchName}` : ''}
              </p>

              {/* Mini journey with traveling dot */}
              <div className="relative mx-auto mt-4 flex max-w-sm items-center gap-2 rounded-xl border bg-muted/40 px-3 py-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-right">{lastTransfer.fromName}</span>
                <span className="relative flex w-14 shrink-0 items-center justify-center">
                  <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" y1="50%" x2="100%" y2="50%" strokeWidth="2" strokeDasharray="4 4" className="stroke-primary/50" />
                  </svg>
                  {!prefersReduced && (
                    <motion.span
                      key={`success-dot-${pulseKey}`}
                      className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary"
                      initial={{ left: '0%', opacity: 0 }}
                      animate={{ left: ['0%', '85%'], opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 1, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.6 }}
                    />
                  )}
                  <ArrowRight className="relative z-10 h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-left">{lastTransfer.toName}</span>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }}>
                  <Button variant="outline" className="w-full h-11" onClick={resetForm}>
                    {t('New Transfer')}
                  </Button>
                </motion.div>
                <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }}>
                  <Button className="w-full h-11" onClick={() => onOpenChange(false)}>
                    {t('Done')}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {loadingRefs ? (
                <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('Loading...', { ns: 'common' })}
                </div>
              ) : refsError ? (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                  <AlertTriangle className="h-6 w-6 text-amber-500" />
                  <p className="text-sm text-muted-foreground">{t('Failed to load locations or products')}</p>
                  <Button variant="outline" size="sm" onClick={loadRefs}>
                    {t('Retry')}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4 px-4 sm:px-6 pb-4">
                    {/* Product + batch */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('Product')}
                        </Label>
                        <Select
                          value={productId}
                          onValueChange={(v) => { setProductId(v); setBatchId(''); }}
                        >
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue placeholder={t('Select Product')} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('Batch')}
                        </Label>
                        <Select value={batchId} onValueChange={setBatchId} disabled={!productId || loadingBatches}>
                          <SelectTrigger className="h-11 w-full">
                            <SelectValue
                              placeholder={
                                !productId
                                  ? t('Select a product first')
                                  : loadingBatches
                                    ? t('Loading...', { ns: 'common' })
                                    : t('Select Batch')
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {batches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* From → To journey */}
                    <TransferJourney
                      locations={locations}
                      fromLocationId={fromLocationId}
                      toLocationId={toLocationId}
                      onFromChange={setFromLocationId}
                      onToChange={setToLocationId}
                      onSwap={handleSwap}
                      available={available}
                      checkingStock={checkingStock}
                      stockReady={Boolean(batchId)}
                      pulseKey={pulseKey}
                      disabled={saving}
                    />

                    {/* Quantity */}
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t('Quantity')}
                        </Label>
                        {available != null && available > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {t('max')}: {available}
                          </span>
                        )}
                      </div>
                      <div className="max-w-[14rem]">
                        <QuantityStepper
                          value={quantity}
                          onChange={setQuantity}
                          min={1}
                          max={available != null && available > 0 ? available : undefined}
                          variant="orange"
                        />
                      </div>
                      <AnimatePresence>
                        {(exceedsAvailable || (noStock && Boolean(fromLocationId && batchId))) && (
                          <motion.p
                            initial={prefersReduced ? false : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {noStock
                              ? t('No stock at this location')
                              : t('Only {{n}} available', { n: available ?? 0 })}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('Notes')}
                      </Label>
                      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                    </div>
                  </div>

                  {/* Sticky submit bar */}
                  <div className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t bg-background/95 backdrop-blur px-4 sm:px-6 py-3">
                    <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }}>
                      <Button variant="outline" className="w-full sm:w-auto h-11" onClick={() => onOpenChange(false)} disabled={saving}>
                        {t('Cancel', { ns: 'common' })}
                      </Button>
                    </motion.div>
                    <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }}>
                      <Button className="w-full sm:w-auto h-11" onClick={handleTransfer} disabled={!canSubmit}>
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Package className="mr-2 h-4 w-4" />
                        )}
                        {t('Transfer')}
                        {quantity > 0 && available != null && available > 0 && (
                          <span className="ml-1.5 rounded-md bg-primary-foreground/20 px-1.5 py-0.5 text-xs font-bold tabular-nums">
                            {quantity}
                          </span>
                        )}
                      </Button>
                    </motion.div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
