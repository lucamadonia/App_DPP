import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  variant?: 'green' | 'orange' | 'red' | 'default';
}

const VARIANT_STYLES = {
  green: {
    ring: 'focus-within:ring-green-500/30',
    button: 'hover:bg-green-50 active:bg-green-100 text-green-700',
    badge: 'bg-green-50 text-green-700',
  },
  orange: {
    ring: 'focus-within:ring-orange-500/30',
    button: 'hover:bg-orange-50 active:bg-orange-100 text-orange-700',
    badge: 'bg-orange-50 text-orange-700',
  },
  red: {
    ring: 'focus-within:ring-red-500/30',
    button: 'hover:bg-red-50 active:bg-red-100 text-red-700',
    badge: 'bg-red-50 text-red-700',
  },
  default: {
    ring: 'focus-within:ring-primary/30',
    button: 'hover:bg-muted active:bg-muted/80 text-foreground',
    badge: 'bg-muted text-foreground',
  },
};

export function QuantityStepper({
  value,
  onChange,
  min = 0,
  max,
  label,
  variant = 'default',
}: QuantityStepperProps) {
  const [pressing, setPressing] = useState<'minus' | 'plus' | null>(null);
  const styles = VARIANT_STYLES[variant];

  const decrement = () => {
    const next = Math.max(min, value - 1);
    onChange(next);
    setPressing('minus');
    setTimeout(() => setPressing(null), 150);
  };

  const increment = () => {
    const next = max != null ? Math.min(max, value + 1) : value + 1;
    onChange(next);
    setPressing('plus');
    setTimeout(() => setPressing(null), 150);
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className={`text-xs font-medium px-2 py-0.5 rounded-md inline-block ${styles.badge}`}>
          {label}
        </div>
      )}
      <div className={`flex items-center gap-0 rounded-xl border ${styles.ring} focus-within:ring-2 transition-all`}>
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className={`flex h-11 w-11 items-center justify-center rounded-l-xl transition-colors disabled:opacity-30 ${styles.button} ${pressing === 'minus' ? 'animate-stepper-press' : ''}`}
        >
          <Minus className="h-4 w-4" />
        </button>
        <Input
          type="number"
          min={min}
          max={max}
          value={value || ''}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            if (isNaN(v)) { onChange(0); return; }
            const clamped = Math.max(min, max != null ? Math.min(max, v) : v);
            onChange(clamped);
          }}
          className="h-11 border-0 text-center text-lg font-bold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={increment}
          disabled={max != null && value >= max}
          className={`flex h-11 w-11 items-center justify-center rounded-r-xl transition-colors disabled:opacity-30 ${styles.button} ${pressing === 'plus' ? 'animate-stepper-press' : ''}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
