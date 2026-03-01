import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SOCIAL_PLATFORM_CONFIG } from '@/lib/warehouse-constants';
import type { PlatformBreakdown } from '@/types/warehouse';
import { PieChart } from 'lucide-react';

interface PlatformDonutChartProps {
  data: PlatformBreakdown[];
  className?: string;
}

const PLATFORM_FILL_COLORS: Record<string, string> = {
  instagram: '#EC4899',
  tiktok: '#111827',
  youtube: '#EF4444',
  twitter: '#0EA5E9',
  pinterest: '#DC2626',
  other: '#6B7280',
};

export function PlatformDonutChart({ data, className }: PlatformDonutChartProps) {
  const { t, i18n } = useTranslation('warehouse');
  const isDE = i18n.language.startsWith('de');

  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (data.length === 0 || total === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('Platform Distribution')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <PieChart className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">{t('No data available')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate arcs
  const R = 70;
  const CX = 100;
  const CY = 100;
  const CIRCUMFERENCE = 2 * Math.PI * R;

  let accumulatedOffset = 0;
  const segments = data.map((d) => {
    const fraction = d.count / total;
    const dashArray = fraction * CIRCUMFERENCE;
    const dashOffset = -accumulatedOffset;
    accumulatedOffset += dashArray;
    return {
      platform: d.platform,
      count: d.count,
      dashArray,
      dashOffset,
      color: PLATFORM_FILL_COLORS[d.platform] || '#6B7280',
    };
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('Platform Distribution')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <svg viewBox="0 0 200 200" className="w-40 h-40">
            {segments.map((seg) => (
              <circle
                key={seg.platform}
                cx={CX}
                cy={CY}
                r={R}
                fill="none"
                stroke={seg.color}
                strokeWidth="30"
                strokeDasharray={`${seg.dashArray} ${CIRCUMFERENCE - seg.dashArray}`}
                strokeDashoffset={seg.dashOffset}
                className="transition-all duration-500"
                transform={`rotate(-90 ${CX} ${CY})`}
              />
            ))}
            <text
              x={CX}
              y={CY - 4}
              textAnchor="middle"
              className="fill-foreground text-2xl font-bold"
              fontSize="24"
            >
              {total}
            </text>
            <text
              x={CX}
              y={CY + 14}
              textAnchor="middle"
              className="fill-muted-foreground text-xs"
              fontSize="11"
            >
              {t('Posts')}
            </text>
          </svg>

          {/* Legend */}
          <div className="mt-4 space-y-1.5 w-full">
            {segments.map((seg) => {
              const cfg = SOCIAL_PLATFORM_CONFIG[seg.platform];
              const label = isDE ? cfg?.labelDe : cfg?.labelEn;
              return (
                <div key={seg.platform} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="text-muted-foreground">{label || seg.platform}</span>
                  </div>
                  <span className="font-medium">{seg.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
