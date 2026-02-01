import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sparklinePoints } from '@/lib/animations';
import type { ReturnStatus, ReturnsHubStats } from '@/types/returns-hub';
import { ReturnStatusBadge } from './ReturnStatusBadge';

interface ReturnChartsProps {
  stats: ReturnsHubStats;
}

const ALL_STATUSES: ReturnStatus[] = [
  'CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED',
  'SHIPPED', 'DELIVERED', 'INSPECTION_IN_PROGRESS', 'REFUND_PROCESSING',
  'REFUND_COMPLETED', 'COMPLETED', 'REJECTED', 'CANCELLED',
];

function StatusBarChart({ stats }: { stats: ReturnsHubStats }) {
  const { t } = useTranslation('returns');
  const maxCount = Math.max(1, ...Object.values(stats.returnsByStatus));

  const entries = ALL_STATUSES
    .map((status) => ({ status, count: stats.returnsByStatus[status] || 0 }))
    .filter((e) => e.count > 0);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t('No data available')}</p>;
  }

  return (
    <div className="space-y-2.5">
      {entries.map((entry, i) => (
        <div key={entry.status} className="flex items-center gap-2">
          <ReturnStatusBadge status={entry.status} className="text-[10px] w-32 justify-center" />
          <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
            <div
              className="h-full bg-primary/60 rounded animate-bar-grow"
              style={{
                width: `${(entry.count / maxCount) * 100}%`,
                animationDelay: `${i * 60}ms`,
              }}
            />
          </div>
          <span className="text-xs font-medium w-8 text-right tabular-nums">{entry.count}</span>
        </div>
      ))}
    </div>
  );
}

function TrendAreaChart({ stats }: { stats: ReturnsHubStats }) {
  const { t } = useTranslation('returns');
  const [hovered, setHovered] = useState<number | null>(null);

  const data = stats.dailyReturns;
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t('No data available')}</p>;
  }

  const width = 320;
  const height = 140;
  const padding = 4;
  const max = Math.max(...data.map((d) => d.count), 1);
  const step = (width - padding * 2) / Math.max(data.length - 1, 1);

  const linePoints = sparklinePoints(data.map((d) => d.count), width, height, padding);

  // Area polygon: line points + bottom-right + bottom-left
  const firstX = padding;
  const lastX = padding + (data.length - 1) * step;
  const areaPoints = `${linePoints} ${lastX},${height - padding} ${firstX},${height - padding}`;

  // Individual dot positions
  const dots = data.map((d, i) => ({
    x: padding + i * step,
    y: height - padding - ((d.count / max) * (height - padding * 2)),
    count: d.count,
    date: d.date,
  }));

  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        <polygon points={areaPoints} fill="url(#trendGradient)" />

        <polyline
          points={linePoints}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-draw-line"
        />

        {dots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r={hovered === i ? 4 : 0}
            fill="var(--primary)"
            className="transition-all duration-150"
          />
        ))}

        {/* Invisible hover targets */}
        {dots.map((dot, i) => (
          <rect
            key={`h-${i}`}
            x={dot.x - step / 2}
            y={0}
            width={step}
            height={height}
            fill="transparent"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hovered !== null && dots[hovered] && (
        <div
          className="absolute -top-8 bg-foreground text-background text-xs px-2 py-1 rounded pointer-events-none z-10"
          style={{ left: `${(dots[hovered].x / width) * 100}%`, transform: 'translateX(-50%)' }}
        >
          {dots[hovered].date.slice(5)}: {dots[hovered].count}
        </div>
      )}

      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
        <span>{data[0]?.date?.slice(5) || ''}</span>
        <span>{data[data.length - 1]?.date?.slice(5) || ''}</span>
      </div>
    </div>
  );
}

function ReasonsChart({ stats }: { stats: ReturnsHubStats }) {
  const { t } = useTranslation('returns');
  const entries = Object.entries(stats.returnsByReason)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const maxCount = Math.max(1, ...entries.map(([, c]) => c));

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">{t('No data available')}</p>;
  }

  return (
    <div className="space-y-2.5">
      {entries.map(([reason, count], i) => {
        const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
        return (
          <div key={reason} className="flex items-center gap-2">
            <span className="text-xs truncate w-24" title={reason}>{reason}</span>
            <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
              <div
                className="h-full bg-orange-400/60 rounded animate-bar-grow"
                style={{
                  width: `${(count / maxCount) * 100}%`,
                  animationDelay: `${i * 60}ms`,
                }}
              />
            </div>
            <span className="text-xs font-medium w-12 text-right tabular-nums">{count} ({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
}

export function ReturnCharts({ stats }: ReturnChartsProps) {
  const { t } = useTranslation('returns');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('Returns by Status')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusBarChart stats={stats} />
        </CardContent>
      </Card>

      <Card className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('Return Trend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <TrendAreaChart stats={stats} />
        </CardContent>
      </Card>

      <Card className="animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'backwards' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('Return Reasons')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReasonsChart stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
}
