import { sparklinePoints } from '@/lib/animations';
import { cn } from '@/lib/utils';

const W = 120;

interface MiniTrendChartProps {
  data: number[];
  height?: number;
  /** Color via text-* utility — chart strokes use currentColor */
  className?: string;
  caption?: string;
}

/** Small area sparkline for module cards (SVG, currentColor-driven). */
export function MiniTrendChart({ data, height = 36, className, caption }: MiniTrendChartProps) {
  const points = sparklinePoints(data, W, height);
  if (!points || data.length < 2) return null;
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${height}`}
        preserveAspectRatio="none"
        className={cn('h-9 w-full text-primary', className)}
        aria-hidden
      >
        <polygon
          points={`2,${height - 2} ${points} ${W - 2},${height - 2}`}
          fill="currentColor"
          opacity={0.15}
        />
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {caption && (
        <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{caption}</p>
      )}
    </div>
  );
}

interface MiniBarRowSegment {
  value: number;
  className: string;
  label: string;
}

/** Horizontal stacked bar for status / rating distributions. */
export function MiniBarRow({ segments, className }: { segments: MiniBarRowSegment[]; className?: string }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;
  return (
    <div className={cn('flex h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <div
            key={s.label}
            className={s.className}
            style={{ width: `${(s.value / total) * 100}%` }}
            title={`${s.label}: ${s.value}`}
          />
        ))}
    </div>
  );
}
