/**
 * Circular gauge that visualizes customer health 0–100.
 * Color-coded: red ≤30 · amber ≤60 · emerald ≤100.
 */
import { useMemo } from 'react';

interface HealthGaugeProps {
  score: number | null | undefined;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
}

export function HealthGauge({ score, size = 96, strokeWidth = 10, showLabel = true, className }: HealthGaugeProps) {
  const safe = Math.min(100, Math.max(0, Math.round(score ?? 0)));
  const hasValue = score != null;

  const { tone, label } = useMemo(() => {
    if (!hasValue) return { tone: 'text-muted-foreground', label: '—' };
    if (safe >= 80) return { tone: 'text-emerald-600', label: 'Top' };
    if (safe >= 60) return { tone: 'text-emerald-500', label: 'Gut' };
    if (safe >= 40) return { tone: 'text-amber-500', label: 'OK' };
    if (safe >= 20) return { tone: 'text-orange-500', label: 'Schwach' };
    return { tone: 'text-red-500', label: 'Kritisch' };
  }, [safe, hasValue]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className={`inline-flex flex-col items-center ${className || ''}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/40"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={hasValue ? offset : circumference}
            className={`${tone} transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:duration-0`}
            style={{ transformOrigin: 'center' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold tabular-nums ${tone}`}>
            {hasValue ? safe : '—'}
          </span>
          {showLabel && <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-0.5">{label}</span>}
        </div>
      </div>
    </div>
  );
}
