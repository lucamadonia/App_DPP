import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, AlertCircle, Check, Loader2 } from 'lucide-react';
import type { StocktakeCountLine } from './StocktakeCountPanel';

interface StocktakeReviewSheetProps {
  open: boolean;
  lines: StocktakeCountLine[];
  locationName: string;
  onCommit: (reason: string) => Promise<void>;
  onClose: () => void;
}

export function StocktakeReviewSheet({ open, lines, locationName, onCommit, onClose }: StocktakeReviewSheetProps) {
  const { t } = useTranslation('warehouse');
  const [reason, setReason] = useState(t('Annual inventory count'));
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const variantLines = lines.filter((l) => l.counted !== l.expected);
  const matches = lines.filter((l) => !l.isUnexpected && l.counted === l.expected && l.expected > 0);

  const handleCommit = async () => {
    if (variantLines.length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await onCommit(reason.trim() || t('Annual inventory count'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col animate-sheet-up rounded-t-3xl sm:rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-xl">
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center gap-3 p-6 pb-4 shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
            <ClipboardCheck className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white truncate">{t('Review & Commit')}</h3>
            <p className="text-sm text-slate-400 truncate">{locationName}</p>
          </div>
        </div>

        <div className="px-6 grid grid-cols-3 gap-3 mb-4 shrink-0">
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-center">
            <div className="text-2xl font-bold text-emerald-400">{matches.length}</div>
            <div className="text-xs text-emerald-400/70">{t('Match')}</div>
          </div>
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-center">
            <div className="text-2xl font-bold text-amber-400">{variantLines.length}</div>
            <div className="text-xs text-amber-400/70">{t('batches with variance')}</div>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-center">
            <div className="text-2xl font-bold text-white">{lines.reduce((s, l) => s + l.counted, 0)}</div>
            <div className="text-xs text-slate-400">{t('Items counted')}</div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
          {variantLines.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
              <Check className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-emerald-400">{t('No variances')}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5">
              {variantLines.map((line) => {
                const v = line.counted - line.expected;
                return (
                  <div key={line.key} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-white truncate">{line.productName}</div>
                      <div className="text-xs text-slate-500 font-mono truncate">{line.batchSerial}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="text-slate-500">{line.isUnexpected ? '—' : line.expected}</span>
                      <span className="text-slate-600">→</span>
                      <span className="font-bold text-white">{line.counted}</span>
                      <span className={`ml-1 px-2 py-0.5 rounded-md font-bold ${line.isUnexpected ? 'bg-amber-500/20 text-amber-400' : v > 0 ? 'bg-sky-500/20 text-sky-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {line.isUnexpected ? t('New', { ns: 'common' }) : v > 0 ? `+${v}` : v}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {variantLines.length > 0 && (
          <div className="px-6 pb-2 shrink-0">
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">{t('Stocktake Reason')}</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50"
              placeholder={t('Annual inventory count')}
            />
          </div>
        )}

        <div className="flex gap-3 p-6 pt-4 shrink-0 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 bg-white/5 hover:bg-white/10 transition-colors border border-white/5 disabled:opacity-40"
          >
            {t('Cancel', { ns: 'common' })}
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-amber-600/20"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : variantLines.length === 0 ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {variantLines.length === 0 ? t('Close') : t('Post Adjustments')}
          </button>
        </div>
      </div>
    </div>
  );
}
