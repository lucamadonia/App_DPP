import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { sparklinePoints } from '@/lib/animations';

interface StockMovementData {
  date: string;
  receipts: number;
  shipments: number;
  adjustments: number;
}

interface StockByLocationData {
  locationName: string;
  totalUnits: number;
}

/* ─── Stock Movement Area Chart ─── */

export function StockMovementChart({ data }: { data: StockMovementData[] }) {
  const { t } = useTranslation('warehouse');
  const [hovered, setHovered] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <Card className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('Stock Movement')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">{t('No data available')}</p>
        </CardContent>
      </Card>
    );
  }

  const totals = data.map(d => d.receipts + d.shipments + d.adjustments);
  const width = 320;
  const height = 140;
  const padding = 4;
  const max = Math.max(...totals, 1);
  const step = (width - padding * 2) / Math.max(data.length - 1, 1);

  const linePoints = sparklinePoints(totals, width, height, padding);
  const firstX = padding;
  const lastX = padding + (data.length - 1) * step;
  const areaPoints = `${linePoints} ${lastX},${height - padding} ${firstX},${height - padding}`;

  const dots = data.map((d, i) => ({
    x: padding + i * step,
    y: height - padding - (((d.receipts + d.shipments + d.adjustments) / max) * (height - padding * 2)),
    total: d.receipts + d.shipments + d.adjustments,
    date: d.date,
    receipts: d.receipts,
    shipments: d.shipments,
    adjustments: d.adjustments,
  }));

  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: '100ms', animationFillMode: 'backwards' }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{t('Stock Movement')}</CardTitle>
          <span className="text-[10px] text-muted-foreground">{t('Last 7 days')}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <defs>
              <linearGradient id="whTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polygon points={areaPoints} fill="url(#whTrendGradient)" />
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
          {hovered !== null && dots[hovered] && (
            <div
              className="absolute -top-10 bg-foreground text-background text-xs px-2 py-1 rounded pointer-events-none z-10"
              style={{ left: `${(dots[hovered].x / width) * 100}%`, transform: 'translateX(-50%)' }}
            >
              <div>{dots[hovered].date.slice(5)}: {dots[hovered].total}</div>
            </div>
          )}
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{data[0]?.date?.slice(5) || ''}</span>
            <span>{data[data.length - 1]?.date?.slice(5) || ''}</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 sm:gap-4 mt-2 sm:mt-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{t('receipts')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />{t('shipments')}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" />{t('adjustments')}</span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Stock by Location Bar Chart ─── */

export function StockByLocationChart({ data }: { data: StockByLocationData[] }) {
  const { t } = useTranslation('warehouse');

  if (data.length === 0) {
    return (
      <Card className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('Stock by Location')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">{t('No data available')}</p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(1, ...data.map(d => d.totalUnits));

  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{t('Stock by Location')}</CardTitle>
          <span className="text-[10px] text-muted-foreground">{t('Stock Distribution')}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {data.map((entry, i) => (
            <div key={entry.locationName} className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs truncate w-16 sm:w-24 shrink-0" title={entry.locationName}>{entry.locationName}</span>
              <div className="flex-1 h-5 sm:h-6 bg-muted rounded overflow-hidden">
                <div
                  className="h-full bg-primary/60 rounded animate-bar-grow"
                  style={{
                    width: `${(entry.totalUnits / maxCount) * 100}%`,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              </div>
              <span className="text-[10px] sm:text-xs font-medium w-10 sm:w-12 text-right tabular-nums shrink-0">{entry.totalUnits.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
