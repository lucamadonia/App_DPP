import { useTranslation } from 'react-i18next';
import { Zap, X } from 'lucide-react';

interface BulkModeControlsProps {
  bulkMode: boolean;
  accentColor: 'emerald' | 'blue';
  locationName: string;
  quantity: number;
  onToggle: () => void;
  onEdit: () => void;
  onStop: () => void;
}

export function BulkModeControls({
  bulkMode,
  accentColor,
  locationName,
  quantity,
  onToggle,
  onEdit,
  onStop,
}: BulkModeControlsProps) {
  const { t } = useTranslation('warehouse');

  return (
    <>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggle}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all
            ${bulkMode
              ? `bg-${accentColor}-500/20 text-${accentColor}-400 border border-${accentColor}-500/40 shadow-lg shadow-${accentColor}-500/10`
              : 'bg-white/5 text-slate-400 hover:text-slate-300 hover:bg-white/10 border border-white/5'
            }
          `}
        >
          <Zap className={`h-3.5 w-3.5 ${bulkMode ? 'fill-current' : ''}`} />
          {bulkMode ? t('Stop Bulk Mode') : t('Bulk Mode')}
        </button>
      </div>

      {bulkMode && locationName && (
        <div className={`rounded-xl border border-${accentColor}-500/30 bg-${accentColor}-500/10 px-4 py-3 flex items-center gap-3`}>
          <Zap className={`h-4 w-4 text-${accentColor}-400 shrink-0`} />
          <div className="flex-1 min-w-0 text-xs">
            <div className={`font-semibold text-${accentColor}-400 truncate`}>
              {t('Bulk scanning active')}
            </div>
            <div className="text-slate-400 truncate">
              {locationName} · {quantity}/{t('scans')}
            </div>
          </div>
          <button
            type="button"
            onClick={onEdit}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition"
          >
            {t('Edit', { ns: 'common' })}
          </button>
          <button
            type="button"
            onClick={onStop}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            aria-label="stop bulk"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
