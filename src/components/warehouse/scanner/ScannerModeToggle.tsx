import { useTranslation } from 'react-i18next';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

interface ScannerModeToggleProps {
  mode: 'in' | 'out';
  onChange: (mode: 'in' | 'out') => void;
}

export function ScannerModeToggle({ mode, onChange }: ScannerModeToggleProps) {
  const { t } = useTranslation('warehouse');

  return (
    <div className="flex rounded-2xl bg-white/5 p-1 backdrop-blur-sm border border-white/10">
      <button
        type="button"
        onClick={() => onChange('in')}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300
          ${mode === 'in'
            ? 'bg-emerald-500/20 text-emerald-400 shadow-lg shadow-emerald-500/20 border border-emerald-500/30'
            : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
          }
        `}
      >
        <ArrowDownToLine className={`h-5 w-5 transition-transform duration-300 ${mode === 'in' ? 'scale-110' : ''}`} />
        {t('Scan In')}
      </button>
      <button
        type="button"
        onClick={() => onChange('out')}
        className={`
          flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300
          ${mode === 'out'
            ? 'bg-blue-500/20 text-blue-400 shadow-lg shadow-blue-500/20 border border-blue-500/30'
            : 'text-slate-400 hover:text-slate-300 hover:bg-white/5'
          }
        `}
      >
        <ArrowUpFromLine className={`h-5 w-5 transition-transform duration-300 ${mode === 'out' ? 'scale-110' : ''}`} />
        {t('Scan Out')}
      </button>
    </div>
  );
}
