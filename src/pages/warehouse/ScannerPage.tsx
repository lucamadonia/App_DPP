/**
 * Warehouse Scanner Page
 * Rapid barcode scanning for goods receipt (in) and picking (out)
 * Supports USB/Bluetooth hardware scanners + camera fallback
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  ScanBarcode,
  Zap,
  AlertCircle,
  CheckCircle2,
  Loader2,
  PackagePlus,
  X as XIcon,
} from 'lucide-react';
import { parseBarcode } from '@/lib/barcode-parser';
import { playSuccessBeep, playErrorBeep, triggerHaptic } from '@/lib/scan-audio';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { useScanSession } from '@/hooks/use-scan-session';
import {
  lookupByGtin,
  lookupByGtinSerial,
  lookupBySerial,
  quickStockPick,
} from '@/services/supabase/wh-scanner';
import { createGoodsReceipt } from '@/services/supabase/wh-stock';
import { createStockAdjustment } from '@/services/supabase/wh-stock';
import { ScannerModeToggle } from '@/components/warehouse/scanner/ScannerModeToggle';
import { ScanResultCard } from '@/components/warehouse/scanner/ScanResultCard';
import { CameraScannerView } from '@/components/warehouse/scanner/CameraScannerView';
import { QuickReceiptSheet } from '@/components/warehouse/scanner/QuickReceiptSheet';
import { QuickPickSheet } from '@/components/warehouse/scanner/QuickPickSheet';
import { ScanSessionPanel } from '@/components/warehouse/scanner/ScanSessionPanel';
import { BulkSetupSheet } from '@/components/warehouse/scanner/BulkSetupSheet';
import { BulkModeControls } from '@/components/warehouse/scanner/BulkModeControls';
import type { ScannerProduct, ScannerBatch, GtinLookupResult, GtinSerialLookupResult } from '@/services/supabase/wh-scanner';
import type { WhStockLevel } from '@/types/warehouse';

type ScanState = 'idle' | 'looking_up' | 'result' | 'action' | 'processing' | 'success' | 'error';

export function ScannerPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  // Core state
  const [mode, setMode] = useState<'in' | 'out'>('in');
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [unknownGtin, setUnknownGtin] = useState<string | null>(null);

  // Lookup results
  const [product, setProduct] = useState<ScannerProduct | null>(null);
  const [batch, setBatch] = useState<ScannerBatch | null>(null);
  const [batches, setBatches] = useState<ScannerBatch[]>([]);
  const [stockLevels, setStockLevels] = useState<WhStockLevel[]>([]);

  // Action sheet
  const [sheetOpen, setSheetOpen] = useState(false);

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSetupOpen, setBulkSetupOpen] = useState(false);
  const [bulkLocationId, setBulkLocationId] = useState('');
  const [bulkLocationName, setBulkLocationName] = useState('');
  const [bulkQuantity, setBulkQuantity] = useState(1);

  // Session
  const session = useScanSession();

  // Auto-reset timer
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const resetToIdle = useCallback(() => {
    setScanState('idle');
    setProduct(null);
    setBatch(null);
    setBatches([]);
    setStockLevels([]);
    setErrorMessage('');
    setSheetOpen(false);
    setUnknownGtin(null);
  }, []);

  const showError = useCallback((msg: string) => {
    setScanState('error');
    setErrorMessage(msg);
    playErrorBeep();
    triggerHaptic([50, 100, 50]);
    resetTimerRef.current = setTimeout(resetToIdle, 3000);
  }, [resetToIdle]);

  const showSuccess = useCallback(() => {
    setScanState('success');
    playSuccessBeep();
    triggerHaptic(100);
    resetTimerRef.current = setTimeout(resetToIdle, 1500);
  }, [resetToIdle]);

  // Bulk auto-commit — bypasses action sheet with preset location + quantity
  const bulkCommit = useCallback(async (
    prod: ScannerProduct,
    bat: ScannerBatch,
    levels: WhStockLevel[],
  ) => {
    if (!bulkLocationId) return;
    setScanState('processing');
    try {
      if (mode === 'in') {
        await createGoodsReceipt({
          locationId: bulkLocationId,
          productId: prod.id,
          batchId: bat.id,
          quantity: bulkQuantity,
        });
        session.addEntry({
          mode: 'in',
          productName: prod.name,
          batchSerial: bat.serialNumber,
          quantity: bulkQuantity,
          locationName: bulkLocationName,
        });
      } else {
        const stockLevel = levels.find((s) => s.locationId === bulkLocationId);
        if (!stockLevel) {
          showError(t('No stock available for this batch'));
          return;
        }
        await quickStockPick({ stockLevelId: stockLevel.id, quantity: bulkQuantity });
        session.addEntry({
          mode: 'out',
          productName: prod.name,
          batchSerial: bat.serialNumber,
          quantity: bulkQuantity,
          locationName: bulkLocationName,
          stockLevelId: stockLevel.id,
        });
      }
      showSuccess();
    } catch (err) {
      showError(err instanceof Error ? err.message : t(mode === 'in' ? 'Receipt failed' : 'Pick failed'));
    }
  }, [mode, bulkLocationId, bulkLocationName, bulkQuantity, session, showSuccess, showError, t]);

  // Main scan handler
  const handleScan = useCallback(async (rawValue: string) => {
    if (scanState === 'looking_up' || scanState === 'processing') return;
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

    setScanState('looking_up');
    setErrorMessage('');

    try {
      const parsed = parseBarcode(rawValue);

      let result: GtinLookupResult | GtinSerialLookupResult | null = null;

      if (parsed.gtin && parsed.serial) {
        // QR code / GS1 Digital Link — exact match
        result = await lookupByGtinSerial(parsed.gtin, parsed.serial);
        if (result && 'batch' in result) {
          setProduct(result.product);
          setBatch(result.batch);
          setStockLevels(result.stockLevels);
          setBatches([]);
          setScanState('result');
          playSuccessBeep();
          triggerHaptic(50);
          if (bulkMode && bulkLocationId) {
            await bulkCommit(result.product, result.batch, result.stockLevels);
          } else {
            setTimeout(() => setSheetOpen(true), 300);
          }
          return;
        }
      }

      if (parsed.gtin) {
        // EAN-13 — product lookup, may need batch selection
        result = await lookupByGtin(parsed.gtin);
        if (result && 'batches' in result) {
          setProduct(result.product);
          setBatches(result.batches);
          setBatch(null);
          setStockLevels([]);

          if (result.batches.length === 1) {
            // Auto-select single batch
            setBatch(result.batches[0]);
            // Load stock levels for this batch
            const fullResult = await lookupByGtinSerial(parsed.gtin, result.batches[0].serialNumber);
            const levels = fullResult && 'stockLevels' in fullResult ? fullResult.stockLevels : [];
            if (levels.length > 0) setStockLevels(levels);
            setScanState('result');
            playSuccessBeep();
            triggerHaptic(50);
            if (bulkMode && bulkLocationId) {
              await bulkCommit(result.product, result.batches[0], levels);
            } else {
              setTimeout(() => setSheetOpen(true), 300);
            }
          } else if (result.batches.length > 1) {
            setScanState('result');
            playSuccessBeep();
            triggerHaptic(50);
          } else {
            showError(t('No active batches found for this product'));
          }
          return;
        }
      }

      // GTIN was parsed but no product in DB → offer create-new dialog
      if (parsed.gtin && (parsed.type === 'ean13' || parsed.type === 'ean8')) {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        setUnknownGtin(parsed.gtin);
        setScanState('idle');
        playErrorBeep();
        triggerHaptic([30, 60, 30]);
        return;
      }

      if (parsed.type === 'serial_lookup' && parsed.serial) {
        // Direct serial lookup
        const serialResult = await lookupBySerial(parsed.serial);
        if (serialResult) {
          setProduct(serialResult.product);
          setBatch(serialResult.batch);
          setStockLevels(serialResult.stockLevels);
          setBatches([]);
          setScanState('result');
          playSuccessBeep();
          triggerHaptic(50);
          if (bulkMode && bulkLocationId) {
            await bulkCommit(serialResult.product, serialResult.batch, serialResult.stockLevels);
          } else {
            setTimeout(() => setSheetOpen(true), 300);
          }
          return;
        }
      }

      showError(t('Product not found'));
    } catch (err) {
      showError(err instanceof Error ? err.message : t('Lookup failed'));
    }
  }, [scanState, showError, showSuccess, t, bulkMode, bulkLocationId, bulkCommit]);

  // Batch selection (when GTIN-only scan returned multiple)
  const handleSelectBatch = useCallback(async (selectedBatch: ScannerBatch) => {
    setBatch(selectedBatch);
    if (product) {
      const fullResult = await lookupByGtinSerial(product.gtin, selectedBatch.serialNumber);
      if (fullResult && 'stockLevels' in fullResult) {
        setStockLevels(fullResult.stockLevels);
      }
    }
    setTimeout(() => setSheetOpen(true), 200);
  }, [product]);

  // Goods receipt confirmation
  const handleReceiptConfirm = useCallback(async (locationId: string, locationName: string, quantity: number) => {
    if (!product || !batch) return;
    setScanState('processing');
    try {
      await createGoodsReceipt({
        locationId,
        productId: product.id,
        batchId: batch.id,
        quantity,
      });
      session.addEntry({
        mode: 'in',
        productName: product.name,
        batchSerial: batch.serialNumber,
        quantity,
        locationName,
      });
      setSheetOpen(false);
      showSuccess();
    } catch (err) {
      showError(err instanceof Error ? err.message : t('Receipt failed'));
    }
  }, [product, batch, session, showSuccess, showError, t]);

  // Pick confirmation
  const handlePickConfirm = useCallback(async (stockLevelId: string, locationName: string, quantity: number) => {
    if (!product || !batch) return;
    setScanState('processing');
    try {
      await quickStockPick({ stockLevelId, quantity });
      session.addEntry({
        mode: 'out',
        productName: product.name,
        batchSerial: batch.serialNumber,
        quantity,
        locationName,
        stockLevelId,
      });
      setSheetOpen(false);
      showSuccess();
    } catch (err) {
      showError(err instanceof Error ? err.message : t('Pick failed'));
    }
  }, [product, batch, session, showSuccess, showError, t]);

  // Undo last session entry
  const handleUndo = useCallback(async () => {
    await session.undoLast(async (entry) => {
      if (entry.mode === 'in' && entry.stockLevelId) {
        // Reverse a goods receipt → negative adjustment
        await createStockAdjustment({
          stockId: entry.stockLevelId,
          quantityChange: -entry.quantity,
          reason: 'Scanner undo',
        });
      } else if (entry.mode === 'out' && entry.stockLevelId) {
        // Reverse a pick → positive adjustment
        await createStockAdjustment({
          stockId: entry.stockLevelId,
          quantityChange: entry.quantity,
          reason: 'Scanner undo',
        });
      }
    });
  }, [session]);

  // Hardware scanner hook
  const { inputProps } = useBarcodeScanner({
    onScan: handleScan,
    enabled: scanState === 'idle' || scanState === 'result' || scanState === 'error' || scanState === 'success',
  });

  const accentColor = mode === 'in' ? 'emerald' : 'blue';

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 text-white flex flex-col">
      {/* Hidden scanner input */}
      <input {...inputProps} />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl shrink-0">
        <button
          type="button"
          onClick={() => navigate('/warehouse')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t('Back')}</span>
        </button>

        <div className="flex items-center gap-2">
          <ScanBarcode className={`h-5 w-5 text-${accentColor}-400`} />
          <span className="text-lg font-bold">{t('Scanner')}</span>
        </div>

        <button
          type="button"
          onClick={() => setCameraOpen(!cameraOpen)}
          className={`
            flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors
            ${cameraOpen
              ? `bg-${accentColor}-500/20 text-${accentColor}-400`
              : 'text-slate-400 hover:text-white hover:bg-white/10'
            }
          `}
        >
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">{t('Camera')}</span>
        </button>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
          {/* Mode toggle */}
          <div className="flex justify-center">
            <ScannerModeToggle mode={mode} onChange={setMode} />
          </div>

          {/* Bulk mode controls */}
          <BulkModeControls
            bulkMode={bulkMode}
            accentColor={accentColor}
            locationName={bulkLocationId ? bulkLocationName : ''}
            quantity={bulkQuantity}
            onToggle={() => (bulkMode ? setBulkMode(false) : setBulkSetupOpen(true))}
            onEdit={() => setBulkSetupOpen(true)}
            onStop={() => setBulkMode(false)}
          />

          {/* Camera view */}
          <CameraScannerView
            enabled={cameraOpen}
            onScan={handleScan}
            onClose={() => setCameraOpen(false)}
          />

          {/* Scan area indicator — tappable: opens camera on click */}
          {!cameraOpen && scanState === 'idle' && (
            <button
              type="button"
              onClick={() => setCameraOpen(true)}
              className={`
                w-full relative rounded-2xl border-2 border-dashed border-${accentColor}-500/30
                bg-${accentColor}-500/5 p-12 text-center transition-all duration-500
                hover:border-${accentColor}-500/60 hover:bg-${accentColor}-500/10
                active:scale-[0.99] cursor-pointer
              `}
            >
              <div className={`absolute inset-0 rounded-2xl animate-pulse-ring border-2 border-${accentColor}-500/10 pointer-events-none`} />
              <ScanBarcode className={`h-16 w-16 mx-auto text-${accentColor}-500/60 mb-4`} />
              <p className="text-lg font-semibold text-slate-200">{t('Scan a barcode')}</p>
              <p className="text-sm text-slate-400 mt-1">
                {t('Tap to open camera or use hardware scanner')}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Zap className="h-3.5 w-3.5" />
                {t('EAN-13, QR Code, GS1 Digital Link')}
              </div>
            </button>
          )}

          {/* Looking up state */}
          {scanState === 'looking_up' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <Loader2 className={`h-12 w-12 mx-auto text-${accentColor}-400 animate-spin mb-4`} />
              <p className="text-sm text-slate-400">{t('Looking up product')}...</p>
            </div>
          )}

          {/* Error state */}
          {scanState === 'error' && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center animate-scan-error">
              <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-3" />
              <p className="text-sm text-red-400 font-semibold">{errorMessage}</p>
            </div>
          )}

          {/* Unknown GTIN — offer to create a new product */}
          {unknownGtin && scanState === 'idle' && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 sm:p-8 animate-scan-error">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                    <PackagePlus className="h-5 w-5 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-200">
                      {t('Product not found for this barcode')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      GTIN {unknownGtin}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setUnknownGtin(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={t('Dismiss')}
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-slate-300 mb-4">
                {t('Would you like to create a new product with this barcode?')}
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/products/new?gtin=${encodeURIComponent(unknownGtin)}`)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-sm font-semibold text-white shadow-lg shadow-amber-500/20 transition-all"
                >
                  <PackagePlus className="h-4 w-4" />
                  {t('Create product with this GTIN')}
                </button>
                <button
                  type="button"
                  onClick={() => setUnknownGtin(null)}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-sm text-slate-300 transition-colors"
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Success state */}
          {scanState === 'success' && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center animate-scan-success">
              <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-400 mb-3" />
              <p className="text-sm text-emerald-400 font-semibold">
                {mode === 'in' ? t('Receipt confirmed') : t('Pick confirmed')}
              </p>
            </div>
          )}

          {/* Processing state */}
          {scanState === 'processing' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
              <Loader2 className={`h-12 w-12 mx-auto text-${accentColor}-400 animate-spin mb-3`} />
              <p className="text-sm text-slate-400">{t('Processing')}...</p>
            </div>
          )}

          {/* Scan result */}
          {scanState === 'result' && product && (
            <ScanResultCard
              product={product}
              batch={batch ?? undefined}
              batches={batch ? undefined : batches}
              stockLevels={stockLevels.length > 0 ? stockLevels : undefined}
              mode={mode}
              onSelectBatch={handleSelectBatch}
            />
          )}

          {/* Session panel */}
          <ScanSessionPanel
            entries={session.entries}
            totalIn={session.totalIn}
            totalOut={session.totalOut}
            totalCount={session.totalCount}
            onUndo={handleUndo}
            onClear={session.clearSession}
            undoDisabled={session.activeEntries.length === 0}
          />
        </div>
      </div>

      {/* Action sheets */}
      {product && batch && mode === 'in' && (
        <QuickReceiptSheet
          open={sheetOpen}
          product={product}
          batch={batch}
          onConfirm={handleReceiptConfirm}
          onClose={() => setSheetOpen(false)}
        />
      )}
      {product && batch && mode === 'out' && (
        <QuickPickSheet
          open={sheetOpen}
          product={product}
          batch={batch}
          stockLevels={stockLevels}
          onConfirm={handlePickConfirm}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {/* Bulk setup */}
      <BulkSetupSheet
        open={bulkSetupOpen}
        mode={mode}
        onConfirm={(locId, locName, qty) => {
          setBulkLocationId(locId);
          setBulkLocationName(locName);
          setBulkQuantity(qty);
          setBulkMode(true);
          setBulkSetupOpen(false);
        }}
        onClose={() => setBulkSetupOpen(false)}
      />
    </div>
  );
}
