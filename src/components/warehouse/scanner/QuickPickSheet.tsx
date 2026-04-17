import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpFromLine, MapPin, Check, Loader2, Package } from 'lucide-react';
import { QuantityStepper } from '@/components/warehouse/QuantityStepper';
import type { ScannerProduct, ScannerBatch } from '@/services/supabase/wh-scanner';
import type { WhStockLevel } from '@/types/warehouse';

interface QuickPickSheetProps {
  open: boolean;
  product: ScannerProduct;
  batch: ScannerBatch;
  stockLevels: WhStockLevel[];
  onConfirm: (stockLevelId: string, locationName: string, quantity: number) => Promise<void>;
  onClose: () => void;
}

export function QuickPickSheet({ open, product, batch, stockLevels, onConfirm, onClose }: QuickPickSheetProps) {
  const { t } = useTranslation('warehouse');
  const [selectedStockId, setSelectedStockId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const selectedStock = stockLevels.find(s => s.id === selectedStockId);
  const maxQty = selectedStock?.quantityAvailable ?? 0;

  // Auto-select if only one stock location
  useEffect(() => {
    if (open) {
      setQuantity(1);
      setSubmitting(false);
      if (stockLevels.length === 1) {
        setSelectedStockId(stockLevels[0].id);
      } else {
        setSelectedStockId('');
      }
    }
  }, [open, stockLevels]);

  const handleConfirm = async () => {
    if (!selectedStockId || quantity < 1) return;
    setSubmitting(true);
    try {
      const loc = selectedStock?.locationName || '';
      await onConfirm(selectedStockId, loc, quantity);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const hasStock = stockLevels.some(s => s.quantityAvailable > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg animate-sheet-up rounded-t-3xl sm:rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl p-6 pb-8 sm:pb-6">
        <div className="sm:hidden flex justify-center mb-4">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
            <ArrowUpFromLine className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{t('Quick Pick')}</h3>
            <p className="text-sm text-slate-400">{product.name} — {batch.serialNumber}</p>
          </div>
        </div>

        {!hasStock ? (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 mb-5 flex items-center gap-3">
            <Package className="h-5 w-5 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-400">{t('No stock available for this batch')}</p>
          </div>
        ) : (
          <>
            {/* Stock locations */}
            <div className="mb-5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-400 mb-2">
                <MapPin className="h-4 w-4" />
                {t('Pick from')}
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {stockLevels.filter(s => s.quantityAvailable > 0).map(stock => (
                  <button
                    key={stock.id}
                    type="button"
                    onClick={() => { setSelectedStockId(stock.id); setQuantity(1); }}
                    className={`
                      w-full text-left rounded-xl px-4 py-3 text-sm transition-all border
                      ${selectedStockId === stock.id
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 ring-1 ring-blue-500/20'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/10'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{stock.locationName || stock.locationId}</span>
                      <span className={`font-mono font-bold ${selectedStockId === stock.id ? 'text-blue-400' : 'text-white'}`}>
                        {stock.quantityAvailable}
                      </span>
                    </div>
                    {stock.binLocation && (
                      <p className="text-xs opacity-60 mt-0.5">{t('Bin')}: {stock.binLocation}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            {selectedStockId && (
              <div className="mb-6">
                <label className="text-sm font-medium text-slate-400 mb-2 block">
                  {t('Quantity')} <span className="text-xs opacity-60">({t('max')} {maxQty})</span>
                </label>
                <div className="[&_input]:!bg-white/5 [&_input]:!text-white [&_input]:!border-white/10 [&_button]:!text-blue-400 [&_button]:hover:!bg-blue-500/10">
                  <QuantityStepper value={quantity} onChange={setQuantity} min={1} max={maxQty} variant="default" />
                </div>
              </div>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 bg-white/5 hover:bg-white/10 transition-colors border border-white/5"
          >
            {t('Cancel', { ns: 'common' })}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedStockId || quantity < 1 || submitting || !hasStock}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-600/20"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {t('Confirm Pick')}
          </button>
        </div>
      </div>
    </div>
  );
}
