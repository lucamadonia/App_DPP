import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, PackageCheck, AlertTriangle, CircleDashed, Check } from 'lucide-react';

export interface StocktakeCountLine {
  key: string;
  locationId: string;
  productId: string;
  batchId: string;
  productName: string;
  batchSerial: string;
  /** Expected physical quantity = Σ (available + reserved) across all bins */
  expected: number;
  counted: number;
  /** True once the user counted this line (scan, stepper, input, or confirm) */
  touched: boolean;
  isUnexpected: boolean;
  /** Reserved portion of `expected` (informational hint) */
  reservedQty: number;
  /** Bin labels this batch is stored in (display only) */
  bins: string[];
  /** Underlying per-bin stock rows (empty for unexpected batches) */
  stocks: Array<{ stockId: string; available: number }>;
}

interface StocktakeCountPanelProps {
  lines: StocktakeCountLine[];
  onAdjust: (key: string, delta: number) => void;
  onSet: (key: string, value: number) => void;
  onConfirm: (key: string) => void;
}

function variance(line: StocktakeCountLine): number {
  return line.counted - line.expected;
}

/**
 * State color semantics:
 * - neutral/slate  → not counted yet
 * - emerald        → counted, matches expected
 * - rose           → counted, shortage
 * - sky            → counted, surplus
 * - amber          → unexpected batch (not in expected list)
 */
function varianceClass(line: StocktakeCountLine): string {
  if (line.isUnexpected) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  if (!line.touched) return 'text-slate-400 bg-white/5 border-white/10';
  const v = variance(line);
  if (v === 0) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (v < 0) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
}

/**
 * Count input with local string state: the field can be emptied while
 * typing (no jump back to 0); the value is committed on blur or Enter.
 */
function CountInput({
  line,
  onSet,
}: {
  line: StocktakeCountLine;
  onSet: (key: string, value: number) => void;
}) {
  const externalValue = line.touched ? String(line.counted) : '';
  const [text, setText] = useState<string>(externalValue);
  const [focused, setFocused] = useState(false);
  const [lastExternal, setLastExternal] = useState<string>(externalValue);

  // Sync external changes (scan / stepper / confirm) while not editing —
  // render-time state adjustment instead of an effect (no cascading renders).
  if (externalValue !== lastExternal) {
    setLastExternal(externalValue);
    if (!focused) setText(externalValue);
  }

  const commit = () => {
    if (text.trim() === '') {
      // Empty field on blur → restore current value, do not force 0
      setText(line.touched ? String(line.counted) : '');
      return;
    }
    const parsed = parseInt(text, 10);
    if (Number.isNaN(parsed)) {
      setText(line.touched ? String(line.counted) : '');
      return;
    }
    onSet(line.key, Math.max(0, parsed));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      placeholder="0"
      onFocus={(e) => {
        setFocused(true);
        e.target.select();
      }}
      onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="w-16 h-11 rounded-xl bg-white/5 border border-white/10 text-center text-base font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      aria-label="counted quantity"
    />
  );
}

export function StocktakeCountPanel({ lines, onAdjust, onSet, onConfirm }: StocktakeCountPanelProps) {
  const { t } = useTranslation('warehouse');

  const sortedLines = [...lines].sort((a, b) => {
    if (a.isUnexpected !== b.isUnexpected) return a.isUnexpected ? -1 : 1;
    return a.productName.localeCompare(b.productName);
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5 overflow-hidden">
      {sortedLines.length === 0 && (
        <div className="p-6 text-center text-sm text-slate-500">{t('No scans yet')}</div>
      )}
      {sortedLines.map((line) => {
        const v = variance(line);
        return (
          <div key={line.key} className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  {line.isUnexpected && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                  {!line.isUnexpected && line.touched && v === 0 && (
                    <PackageCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  )}
                  {!line.isUnexpected && (!line.touched || v !== 0) && (
                    <CircleDashed className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                  )}
                  <div className="font-semibold text-sm text-white truncate">{line.productName}</div>
                </div>
                <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">{line.batchSerial}</div>
                {(line.bins.length > 0 || line.reservedQty > 0) && (
                  <div className="text-xs text-slate-500 mt-0.5 truncate">
                    {line.bins.length > 0 && (
                      <span>{t('Bins')}: {line.bins.join(', ')}</span>
                    )}
                    {line.bins.length > 0 && line.reservedQty > 0 && <span> · </span>}
                    {line.reservedQty > 0 && (
                      <span className="text-sky-400/70">{t('Including {{count}} reserved', { count: line.reservedQty })}</span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-slate-500">{t('Expected')}:</span>
                  <span className="font-semibold text-slate-300">{line.isUnexpected ? '—' : line.expected}</span>
                  <span className="text-slate-600">·</span>
                  <span className={`px-1.5 py-0.5 rounded border font-semibold ${varianceClass(line)}`}>
                    {line.isUnexpected
                      ? t('Not expected')
                      : !line.touched
                        ? t('Not counted')
                        : v === 0
                          ? t('Match')
                          : (v > 0 ? `+${v}` : v)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onAdjust(line.key, -1)}
                  disabled={line.counted <= 0}
                  className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                  aria-label="decrement"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <CountInput line={line} onSet={onSet} />
                <button
                  type="button"
                  onClick={() => onAdjust(line.key, 1)}
                  className="h-11 w-11 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 active:scale-95 flex items-center justify-center transition"
                  aria-label="increment"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Quick-confirm: mark untouched line as "counted = expected" in one tap */}
            {!line.touched && !line.isUnexpected && (
              <button
                type="button"
                onClick={() => onConfirm(line.key)}
                className="mt-2 w-full h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-[0.99] transition"
              >
                <Check className="h-4 w-4" />
                {t('Confirm expected')} ({line.expected})
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
