import { useTranslation } from 'react-i18next';
import { Package, Hash, Layers, MapPin } from 'lucide-react';
import type { ScannerProduct, ScannerBatch } from '@/services/supabase/wh-scanner';
import type { WhStockLevel } from '@/types/warehouse';

interface ScanResultCardProps {
  product: ScannerProduct;
  batch?: ScannerBatch;
  batches?: ScannerBatch[];
  stockLevels?: WhStockLevel[];
  mode: 'in' | 'out';
  onSelectBatch?: (batch: ScannerBatch) => void;
  className?: string;
}

export function ScanResultCard({
  product,
  batch,
  batches,
  stockLevels,
  mode,
  onSelectBatch,
  className = '',
}: ScanResultCardProps) {
  const { t } = useTranslation('warehouse');
  const accentColor = mode === 'in' ? 'emerald' : 'blue';
  const totalStock = stockLevels?.reduce((sum, s) => sum + s.quantityAvailable, 0) ?? 0;

  return (
    <div className={`animate-scan-result-in rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 ${className}`}>
      {/* Product header */}
      <div className="flex items-start gap-4">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`h-16 w-16 rounded-xl object-cover ring-2 ring-${accentColor}-500/30`}
          />
        ) : (
          <div className={`flex h-16 w-16 items-center justify-center rounded-xl bg-${accentColor}-500/10 ring-2 ring-${accentColor}-500/30`}>
            <Package className={`h-8 w-8 text-${accentColor}-400`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{product.name}</h3>
          {product.manufacturer && (
            <p className="text-sm text-slate-400">{product.manufacturer}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <Hash className="h-3.5 w-3.5" />
              {product.gtin}
            </span>
            {product.category && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                <Layers className="h-3.5 w-3.5" />
                {product.category}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Selected batch info */}
      {batch && (
        <div className={`mt-4 rounded-xl bg-${accentColor}-500/5 border border-${accentColor}-500/20 p-3`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">{t('Batch')}</p>
              <p className={`text-sm font-mono font-bold text-${accentColor}-400`}>{batch.serialNumber}</p>
            </div>
            {batch.quantity != null && (
              <div className="text-right">
                <p className="text-xs text-slate-500 uppercase tracking-wider">{t('Batch Qty')}</p>
                <p className="text-sm font-bold text-white">{batch.quantity}</p>
              </div>
            )}
          </div>
          {stockLevels && stockLevels.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-slate-400">
                {t('In stock')}: <strong className="text-white">{totalStock}</strong> {t('across')} {stockLevels.length} {t('locations')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Batch selector (when GTIN-only scan found multiple batches) */}
      {!batch && batches && batches.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider">
            {t('Select Batch')} ({batches.length})
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {batches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onSelectBatch?.(b)}
                className={`
                  w-full text-left rounded-xl px-4 py-3 transition-all
                  bg-white/5 hover:bg-${accentColor}-500/10 border border-white/5 hover:border-${accentColor}-500/30
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-mono font-semibold text-white">{b.serialNumber}</span>
                  {b.quantity != null && (
                    <span className="text-xs text-slate-400">{b.quantity} {t('units')}</span>
                  )}
                </div>
                {b.batchNumber && (
                  <p className="text-xs text-slate-500 mt-0.5">{t('Lot')}: {b.batchNumber}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No batches found */}
      {!batch && batches && batches.length === 0 && (
        <div className="mt-4 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-sm text-amber-400">{t('No active batches found for this product')}</p>
        </div>
      )}
    </div>
  );
}
