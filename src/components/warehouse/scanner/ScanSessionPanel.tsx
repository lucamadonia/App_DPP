import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, ArrowUpFromLine, Undo2, Trash2, Clock, ShoppingBag, Loader2, CheckCircle2 } from 'lucide-react';
import type { ScanSessionEntry } from '@/hooks/use-scan-session';

interface ScanSessionPanelProps {
  entries: ScanSessionEntry[];
  totalIn: number;
  totalOut: number;
  totalCount: number;
  onUndo: () => void;
  onClear: () => void;
  undoDisabled?: boolean;
  /**
   * When provided AND there are session entries, a "Confirm & Push to Shopify"
   * button is shown next to Undo/Clear. The promise resolves when sync is
   * complete; errors should be surfaced via the returned error string.
   */
  onPushShopify?: () => Promise<{ success: boolean; error?: string }>;
}

export function ScanSessionPanel({
  entries,
  totalIn,
  totalOut,
  totalCount,
  onUndo,
  onClear,
  undoDisabled,
  onPushShopify,
}: ScanSessionPanelProps) {
  const { t } = useTranslation('warehouse');
  const [pushState, setPushState] = useState<'idle' | 'pushing' | 'success' | 'error'>('idle');
  const [pushError, setPushError] = useState<string | null>(null);

  const handlePush = async () => {
    if (!onPushShopify) return;
    setPushState('pushing');
    setPushError(null);
    try {
      const result = await onPushShopify();
      if (result.success) {
        setPushState('success');
        setTimeout(() => setPushState('idle'), 3000);
      } else {
        setPushState('error');
        setPushError(result.error || 'Unknown error');
        setTimeout(() => setPushState('idle'), 5000);
      }
    } catch (err) {
      setPushState('error');
      setPushError(err instanceof Error ? err.message : 'Unknown error');
      setTimeout(() => setPushState('idle'), 5000);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
      {/* Session header with counters */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-white">{t('Session')}</h3>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-mono">
              <ArrowDownToLine className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-bold">{totalIn}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-mono">
              <ArrowUpFromLine className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-blue-400 font-bold">{totalOut}</span>
            </span>
            <span className="text-xs text-slate-500">
              ({totalCount} {t('scans')})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onPushShopify && entries.length > 0 && (
            <button
              type="button"
              onClick={handlePush}
              disabled={pushState === 'pushing'}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${pushState === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : pushState === 'error'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'}
                disabled:opacity-50
              `}
              title={t('Confirm goods receipt and push to Shopify')}
            >
              {pushState === 'pushing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pushState === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
              {(pushState === 'idle' || pushState === 'error') && <ShoppingBag className="h-3.5 w-3.5" />}
              {pushState === 'pushing' && t('Pushing…')}
              {pushState === 'success' && t('Pushed!')}
              {pushState === 'error' && t('Retry push')}
              {pushState === 'idle' && t('Confirm & push')}
            </button>
          )}
          <button
            type="button"
            onClick={onUndo}
            disabled={undoDisabled}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
            title={t('Undo last')}
          >
            <Undo2 className="h-3.5 w-3.5" />
            {t('Undo')}
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={entries.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
            title={t('Clear session')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {pushState === 'error' && pushError && (
        <div className="px-5 py-2 border-b border-red-500/20 bg-red-500/10 text-xs text-red-300">
          {pushError}
        </div>
      )}

      {/* History list */}
      {entries.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-slate-500">{t('No scans yet')}</p>
          <p className="text-xs text-slate-600 mt-1">{t('Scan a barcode to start')}</p>
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
          {entries.slice(0, 50).map((entry, i) => (
            <div
              key={entry.id}
              className={`
                flex items-center gap-3 px-5 py-2.5 transition-all
                ${entry.undone ? 'opacity-30 line-through' : ''}
                ${i === 0 ? 'animate-scan-history-in' : ''}
              `}
            >
              {entry.mode === 'in' ? (
                <ArrowDownToLine className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <ArrowUpFromLine className="h-4 w-4 text-blue-400 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{entry.productName}</p>
                <p className="text-xs text-slate-500 font-mono">{entry.batchSerial}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold font-mono ${entry.mode === 'in' ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {entry.mode === 'in' ? '+' : '-'}{entry.quantity}
                </p>
                <p className="text-xs text-slate-600 flex items-center gap-1 justify-end">
                  <Clock className="h-3 w-3" />
                  {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
