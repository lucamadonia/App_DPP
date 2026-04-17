import { useTranslation } from 'react-i18next';
import { Minus, Plus, PackageCheck, AlertTriangle, CircleHelp } from 'lucide-react';

export interface StocktakeCountLine {
  key: string;
  stockId?: string;
  locationId: string;
  productId: string;
  batchId: string;
  productName: string;
  batchSerial: string;
  expected: number;
  counted: number;
  isUnexpected: boolean;
}

interface StocktakeCountPanelProps {
  lines: StocktakeCountLine[];
  onAdjust: (key: string, delta: number) => void;
  onSet: (key: string, value: number) => void;
}

function variance(line: StocktakeCountLine): number {
  return line.counted - line.expected;
}

function varianceClass(line: StocktakeCountLine): string {
  if (line.isUnexpected) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  const v = variance(line);
  if (v === 0 && line.counted > 0) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (v === 0) return 'text-slate-500 bg-white/5 border-white/5';
  if (v < 0) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
}

export function StocktakeCountPanel({ lines, onAdjust, onSet }: StocktakeCountPanelProps) {
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
          <div key={line.key} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                {line.isUnexpected && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                {!line.isUnexpected && line.counted === line.expected && line.counted > 0 && (
                  <PackageCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                )}
                {!line.isUnexpected && line.counted !== line.expected && (
                  <CircleHelp className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                )}
                <div className="font-semibold text-sm text-white truncate">{line.productName}</div>
              </div>
              <div className="text-xs text-slate-500 font-mono mt-0.5 truncate">{line.batchSerial}</div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-slate-500">{t('Expected')}:</span>
                <span className="font-semibold text-slate-300">{line.isUnexpected ? '—' : line.expected}</span>
                <span className="text-slate-600">·</span>
                <span className={`px-1.5 py-0.5 rounded border font-semibold ${varianceClass(line)}`}>
                  {line.isUnexpected ? t('Not expected') : v === 0 ? t('Match') : (v > 0 ? `+${v}` : v)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onAdjust(line.key, -1)}
                disabled={line.counted <= 0}
                className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
                aria-label="decrement"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input
                type="number"
                value={line.counted}
                onChange={(e) => onSet(line.key, Math.max(0, parseInt(e.target.value) || 0))}
                className="w-12 h-8 rounded-lg bg-white/5 border border-white/10 text-center text-sm font-bold text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={0}
              />
              <button
                type="button"
                onClick={() => onAdjust(line.key, 1)}
                className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 flex items-center justify-center transition"
                aria-label="increment"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
