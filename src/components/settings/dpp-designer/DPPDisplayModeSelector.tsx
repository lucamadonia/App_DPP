/**
 * Reusable visual option selector with mini-preview cards.
 */
import type { ReactNode } from 'react';

interface Option {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  preview?: ReactNode;
}

interface Props {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  columns?: 2 | 3 | 4 | 5;
}

export function DPPDisplayModeSelector({ options, value, onChange, columns = 3 }: Props) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
  }[columns];

  return (
    <div className={`grid ${gridCols} gap-2`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`p-2.5 rounded-lg border text-left text-sm transition-all ${
            value === opt.value
              ? 'border-primary bg-primary/5 ring-1 ring-primary/20 scale-[1.02]'
              : 'border-muted hover:border-muted-foreground/30'
          }`}
        >
          {opt.preview && (
            <div className="mb-2 flex justify-center">{opt.preview}</div>
          )}
          {opt.icon && !opt.preview && (
            <div className="mb-1.5 flex justify-center text-muted-foreground">{opt.icon}</div>
          )}
          <p className="font-medium text-xs">{opt.label}</p>
          {opt.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{opt.description}</p>
          )}
        </button>
      ))}
    </div>
  );
}
