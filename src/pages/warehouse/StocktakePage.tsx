/**
 * Warehouse Stocktake Page
 * Scan-based physical inventory count for a selected location.
 * Loads expected stock → user counts by scanning → review variance → post adjustments.
 *
 * Key safety rules:
 * - A line only participates in the booking once it was actually counted
 *   (`touched`). Untouched lines are NEVER booked to 0 implicitly — only via
 *   explicit opt-in in the review sheet.
 * - Stock is loaded fully (pagination loop) and aggregated per batch across
 *   bins; expected = available + reserved (reserved goods are physically here).
 * - Partial commit failures keep ONLY the failed lines for retry — already
 *   posted lines are removed so nothing is ever double-booked.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  ClipboardCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MapPin,
  ListChecks,
} from 'lucide-react';
import { microInteraction } from '@/lib/motion';
import { parseBarcode } from '@/lib/barcode-parser';
import { playSuccessBeep, playErrorBeep, triggerHaptic } from '@/lib/scan-audio';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { getStockLevelsPaginated } from '@/services/supabase/wh-stock';
import { lookupByGtinSerial, lookupBySerial, lookupByGtin } from '@/services/supabase/wh-scanner';
import { commitStocktake } from '@/services/supabase/wh-stocktake';
import { CameraScannerView } from '@/components/warehouse/scanner/CameraScannerView';
import { StocktakeLocationSheet } from '@/components/warehouse/stocktake/StocktakeLocationSheet';
import { StocktakeCountPanel, type StocktakeCountLine } from '@/components/warehouse/stocktake/StocktakeCountPanel';
import { StocktakeReviewSheet } from '@/components/warehouse/stocktake/StocktakeReviewSheet';
import type { WhLocation, WhStockLevel } from '@/types/warehouse';

type PageState = 'select_location' | 'loading' | 'counting' | 'reviewing' | 'committing' | 'done' | 'error';

const STOCK_PAGE_SIZE = 500;

/** Loading skeleton rows with shimmer (falls back to static blocks for reduced motion) */
function LoadingSkeleton({ reduced }: { reduced: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5 overflow-hidden">
      {[0, 1, 2, 3, 4].map((i) =>
        reduced ? (
          <div key={i} className="p-4 flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 rounded bg-white/10" />
              <div className="h-3 w-1/4 rounded bg-white/5" />
            </div>
            <div className="h-11 w-36 rounded-xl bg-white/5" />
          </div>
        ) : (
          <div key={i} className="p-4 flex items-center gap-3">
            <div className="flex-1 space-y-2">
              <motion.div
                className="h-4 w-2/5 rounded bg-gradient-to-r from-white/5 via-white/15 to-white/5 bg-[length:400%_100%]"
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="h-3 w-1/4 rounded bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:400%_100%]"
                animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: 0.1 }}
              />
            </div>
            <motion.div
              className="h-11 w-36 rounded-xl bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:400%_100%]"
              animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'linear', delay: 0.2 }}
            />
          </div>
        )
      )}
    </div>
  );
}

export function StocktakePage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion() ?? false;

  const [pageState, setPageState] = useState<PageState>('select_location');
  const [location, setLocation] = useState<WhLocation | null>(null);
  const [lines, setLines] = useState<StocktakeCountLine[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [commitError, setCommitError] = useState<string | null>(null);
  const [scanFeedback, setScanFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setScanFeedback({ type, message });
    if (type === 'success') {
      playSuccessBeep();
      triggerHaptic(50);
    } else {
      playErrorBeep();
      triggerHaptic([50, 80, 50]);
    }
    feedbackTimer.current = setTimeout(() => setScanFeedback(null), 1800);
  }, []);

  const handleSelectLocation = useCallback(async (loc: WhLocation) => {
    setLocation(loc);
    setPageState('loading');
    setCommitError(null);
    try {
      // Load ALL stock rows for this location (pagination loop — the default
      // page size would silently truncate large locations).
      const all: WhStockLevel[] = [];
      let page = 1;
      for (;;) {
        const res = await getStockLevelsPaginated({ locationId: loc.id, page, pageSize: STOCK_PAGE_SIZE });
        all.push(...res.data);
        if (res.data.length < STOCK_PAGE_SIZE || all.length >= res.total) break;
        page += 1;
      }

      // Aggregate per batch: one count line per batch, all per-bin stock rows
      // collected in stocks[]. Expected = available + reserved, because
      // reserved goods are physically still on the shelf.
      const byBatch = new Map<string, StocktakeCountLine>();
      for (const s of all) {
        const expectedHere = s.quantityAvailable + s.quantityReserved;
        const existing = byBatch.get(s.batchId);
        if (existing) {
          existing.expected += expectedHere;
          existing.reservedQty += s.quantityReserved;
          existing.stocks.push({ stockId: s.id, available: s.quantityAvailable });
          if (s.binLocation && !existing.bins.includes(s.binLocation)) existing.bins.push(s.binLocation);
        } else {
          byBatch.set(s.batchId, {
            key: s.batchId,
            locationId: s.locationId,
            productId: s.productId,
            batchId: s.batchId,
            productName: s.productName || '—',
            batchSerial: s.batchSerialNumber || '',
            expected: expectedHere,
            counted: 0,
            touched: false,
            isUnexpected: false,
            reservedQty: s.quantityReserved,
            bins: s.binLocation ? [s.binLocation] : [],
            stocks: [{ stockId: s.id, available: s.quantityAvailable }],
          });
        }
      }

      setLines([...byBatch.values()]);
      setPageState('counting');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPageState('error');
    }
  }, []);

  const handleScan = useCallback(async (rawValue: string) => {
    if (pageState !== 'counting' || !location) return;

    try {
      const parsed = parseBarcode(rawValue);

      // Resolve to a batch
      let batchId: string | undefined;
      let productId: string | undefined;
      let productName = '—';
      let batchSerial = '';

      if (parsed.gtin && parsed.serial) {
        const res = await lookupByGtinSerial(parsed.gtin, parsed.serial);
        if (res) {
          batchId = res.batch.id;
          productId = res.product.id;
          productName = res.product.name;
          batchSerial = res.batch.serialNumber;
        }
      } else if (parsed.gtin) {
        const res = await lookupByGtin(parsed.gtin);
        if (res && res.batches.length === 1) {
          batchId = res.batches[0].id;
          productId = res.product.id;
          productName = res.product.name;
          batchSerial = res.batches[0].serialNumber;
        } else if (res && res.batches.length > 1) {
          showFeedback('error', t('Multiple batches — scan serial'));
          return;
        }
      } else if (parsed.type === 'serial_lookup' && parsed.serial) {
        const res = await lookupBySerial(parsed.serial);
        if (res) {
          batchId = res.batch.id;
          productId = res.product.id;
          productName = res.product.name;
          batchSerial = res.batch.serialNumber;
        }
      }

      if (!batchId || !productId) {
        showFeedback('error', t('Product not found'));
        return;
      }

      // Find existing line (aggregated per batch) or create unexpected
      setLines((prev) => {
        const existingIdx = prev.findIndex((l) => l.batchId === batchId);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = { ...copy[existingIdx], counted: copy[existingIdx].counted + 1, touched: true };
          return copy;
        }
        const newLine: StocktakeCountLine = {
          key: `new-${batchId}`,
          locationId: location.id,
          productId: productId!,
          batchId: batchId!,
          productName,
          batchSerial,
          expected: 0,
          counted: 1,
          touched: true,
          isUnexpected: true,
          reservedQty: 0,
          bins: [],
          stocks: [],
        };
        return [newLine, ...prev];
      });
      showFeedback('success', productName);
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : t('Lookup failed'));
    }
  }, [pageState, location, showFeedback, t]);

  const handleAdjust = useCallback((key: string, delta: number) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, counted: Math.max(0, l.counted + delta), touched: true } : l))
    );
  }, []);

  const handleSet = useCallback((key: string, value: number) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, counted: Math.max(0, value), touched: true } : l)));
  }, []);

  const handleConfirm = useCallback((key: string) => {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, counted: l.expected, touched: true } : l)));
  }, []);

  const handleCommit = useCallback(async (reason: string, zeroUncounted: boolean) => {
    setPageState('committing');
    setCommitError(null);

    // Effective lines: counted lines as-is; untouched lines are booked to 0
    // ONLY when the user explicitly opted in via the review sheet.
    const effective: StocktakeCountLine[] = lines.map((l) =>
      l.touched ? l : zeroUncounted ? { ...l, counted: 0, touched: true } : l
    );
    const toCommit = effective.filter((l) => l.touched);

    try {
      const result = await commitStocktake({
        lines: toCommit.map((l) => ({
          locationId: l.locationId,
          productId: l.productId,
          batchId: l.batchId,
          expected: l.expected,
          counted: l.counted,
          stocks: l.stocks,
          productName: l.productName,
          batchSerial: l.batchSerial,
        })),
        reason,
      });

      if (result.failures.length > 0) {
        // Recovery without double-booking: keep ONLY lines that were not
        // successfully posted — failed lines (retry) and lines that were
        // never part of the commit (untouched, no opt-in).
        const failedBatchIds = new Set(result.failures.map((f) => f.line.batchId));
        const remaining = effective.filter((l) => {
          const wasCommitted = l.touched && l.counted !== l.expected;
          if (!wasCommitted) return !l.touched; // keep untouched-uncommitted; matched lines are final
          return failedBatchIds.has(l.batchId);
        });
        setLines(remaining);
        // Translate the known stocktake error; pass unknown messages through
        // raw (they may contain ':' which i18next treats as ns separator).
        const firstError = result.failures[0].error;
        const errorDetail = firstError === 'Could not fully reduce stock (reserved quantities)' ? t(firstError) : firstError;
        setCommitError(
          `${t('{{count}} adjustments failed', { count: result.failures.length })} — ${t('Review failed lines and post again')}. ${errorDetail}`
        );
        setPageState('counting');
      } else {
        setPageState('done');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPageState('error');
    }
  }, [lines, t]);

  const handleCancel = useCallback(() => {
    setLines([]);
    setLocation(null);
    setCommitError(null);
    setPageState('select_location');
  }, []);

  const { inputProps } = useBarcodeScanner({
    onScan: handleScan,
    enabled: pageState === 'counting',
  });

  // KPIs — progress over POSITIONS counted, not raw item totals
  const countedPositions = lines.filter((l) => l.touched).length;
  const totalPositions = lines.length;
  const progressPct = totalPositions > 0 ? Math.round((countedPositions / totalPositions) * 100) : 0;
  const variances = lines.filter((l) => l.touched && l.counted !== l.expected).length;

  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 text-white flex flex-col">
      <input {...inputProps} />

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl shrink-0">
        <button
          type="button"
          onClick={() => {
            if (pageState === 'counting' || pageState === 'reviewing') {
              if (!confirm(t('Cancel Stocktake') + '?')) return;
            }
            navigate('/warehouse');
          }}
          className="flex items-center gap-2 px-3 py-2 min-h-11 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{t('Back')}</span>
        </button>

        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-amber-400" />
          <span className="text-lg font-bold">{t('Stocktake')}</span>
        </div>

        {pageState === 'counting' ? (
          <button
            type="button"
            onClick={() => setCameraOpen(!cameraOpen)}
            className={`flex items-center gap-2 px-3 py-2 min-h-11 rounded-xl text-sm transition-colors ${
              cameraOpen ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">{t('Camera')}</span>
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">
          {/* Location + progress banner */}
          {location && (pageState === 'counting' || pageState === 'loading') && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-amber-400 truncate">{location.name}</div>
                  <div className="text-xs text-amber-400/60">{location.code || t('Stocktake in progress')}</div>
                </div>
                {pageState === 'counting' && (
                  <div className="text-right text-xs shrink-0">
                    <div className="text-white font-bold">
                      {t('{{counted}} of {{total}} positions counted', { counted: countedPositions, total: totalPositions })}
                    </div>
                    <div className="text-slate-500">{progressPct}%</div>
                  </div>
                )}
              </div>
              {pageState === 'counting' && totalPositions > 0 && (
                <div className="mt-2.5 h-1.5 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
                  <motion.div
                    className="h-full rounded-full bg-amber-400"
                    initial={false}
                    animate={{ width: `${progressPct}%` }}
                    transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 25 }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Loading state — shimmer skeleton */}
          {pageState === 'loading' && (
            <>
              <p className="text-sm text-slate-400 text-center">{t('Loading expected stock')}...</p>
              <LoadingSkeleton reduced={reducedMotion} />
            </>
          )}

          {/* Commit partial-failure banner */}
          {pageState === 'counting' && commitError && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-rose-400">{commitError}</p>
            </div>
          )}

          {/* Camera */}
          {pageState === 'counting' && (
            <CameraScannerView enabled={cameraOpen} onScan={handleScan} onClose={() => setCameraOpen(false)} />
          )}

          {/* Scan feedback pulse */}
          {pageState === 'counting' && scanFeedback && (
            <div
              className={`rounded-2xl border p-4 flex items-center gap-3 animate-scan-success ${
                scanFeedback.type === 'success'
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-rose-500/30 bg-rose-500/10'
              }`}
            >
              {scanFeedback.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
              )}
              <p className={`text-sm font-semibold ${scanFeedback.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {scanFeedback.message}
              </p>
            </div>
          )}

          {/* Counting view */}
          {pageState === 'counting' && !cameraOpen && (
            <>
              {lines.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 p-12 text-center">
                  <ListChecks className="h-16 w-16 mx-auto text-amber-500/40 mb-4" />
                  <p className="text-lg font-semibold text-slate-300">{t('Scan items in this location')}</p>
                  <p className="text-sm text-slate-500 mt-1">{t('Scan to count')}</p>
                </div>
              ) : (
                <StocktakeCountPanel lines={lines} onAdjust={handleAdjust} onSet={handleSet} onConfirm={handleConfirm} />
              )}

              <div className="flex gap-3 sticky bottom-0 pb-4 pt-2 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 rounded-xl px-4 py-3 min-h-11 text-sm font-medium text-slate-400 bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
                >
                  {t('Cancel Stocktake')}
                </button>
                <button
                  type="button"
                  onClick={() => setPageState('reviewing')}
                  disabled={lines.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 min-h-11 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-amber-600/20"
                >
                  <ListChecks className="h-4 w-4" />
                  {t('Finish & Review')}
                  {variances > 0 && <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">{variances}</span>}
                </button>
              </div>
            </>
          )}

          {/* Committing */}
          {pageState === 'committing' && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
              <Loader2 className="h-12 w-12 mx-auto text-amber-400 animate-spin mb-4" />
              <p className="text-sm text-slate-400">{t('Committing adjustments')}...</p>
            </div>
          )}

          {/* Done */}
          {pageState === 'done' && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-10 text-center">
              <motion.div
                className="inline-block"
                {...(reducedMotion ? {} : microInteraction.successPulse)}
              >
                <CheckCircle2 className="h-16 w-16 mx-auto text-emerald-400 mb-4" />
              </motion.div>
              <p className="text-lg font-bold text-emerald-400">{t('Stocktake completed')}</p>
              <p className="text-sm text-emerald-400/70 mt-1">{t('All variances posted successfully')}</p>
              <button
                type="button"
                onClick={() => navigate('/warehouse/inventory')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 min-h-11 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                {t('Back')}
              </button>
            </div>
          )}

          {/* Error */}
          {pageState === 'error' && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-rose-400 mb-3" />
              <p className="text-sm font-semibold text-rose-400">{errorMsg || t('Lookup failed')}</p>
              <button
                type="button"
                onClick={handleCancel}
                className="mt-4 rounded-xl px-4 py-2 min-h-11 text-sm text-white bg-white/10 hover:bg-white/15 transition-colors"
              >
                {t('Back')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Location picker */}
      <StocktakeLocationSheet
        open={pageState === 'select_location'}
        onSelect={handleSelectLocation}
        onClose={() => navigate('/warehouse')}
      />

      {/* Review */}
      {location && (
        <StocktakeReviewSheet
          open={pageState === 'reviewing'}
          lines={lines}
          locationName={location.name}
          onCommit={handleCommit}
          onClose={() => setPageState('counting')}
        />
      )}
    </div>
  );
}
