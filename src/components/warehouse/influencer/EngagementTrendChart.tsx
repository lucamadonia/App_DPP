import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EngagementTrendChartProps {
  className?: string;
}

function generateMockData(count: number, base: number, variance: number): number[] {
  const data: number[] = [];
  let current = base;
  for (let i = 0; i < count; i++) {
    current += (Math.random() - 0.4) * variance;
    current = Math.max(base * 0.3, current);
    data.push(Math.round(current));
  }
  return data;
}

function dataToPath(
  data: number[],
  width: number,
  height: number,
  padding: number,
  max: number,
): { line: string; area: string } {
  const step = (width - padding * 2) / Math.max(data.length - 1, 1);
  const points = data.map((val, i) => {
    const x = padding + i * step;
    const y = height - padding - ((val / max) * (height - padding * 2));
    return { x, y };
  });

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const area = `${line} L${last.x},${height - padding} L${first.x},${height - padding} Z`;

  return { line, area };
}

export function EngagementTrendChart({ className }: EngagementTrendChartProps) {
  const { t } = useTranslation('warehouse');

  const { viewsData, likesData, commentsData, max } = useMemo(() => {
    const v = generateMockData(14, 1200, 400);
    const l = generateMockData(14, 350, 120);
    const c = generateMockData(14, 80, 30);
    const m = Math.max(...v, ...l, ...c, 1);
    return { viewsData: v, likesData: l, commentsData: c, max: m };
  }, []);

  const W = 600;
  const H = 200;
  const PAD = 20;

  const views = dataToPath(viewsData, W, H, PAD, max);
  const likes = dataToPath(likesData, W, H, PAD, max);
  const comments = dataToPath(commentsData, W, H, PAD, max);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('Engagement Trend')}</CardTitle>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto animate-fade-in"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="likesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EC4899" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#EC4899" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="commentsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Area fills */}
          <path d={views.area} fill="url(#viewsGrad)" />
          <path d={likes.area} fill="url(#likesGrad)" />
          <path d={comments.area} fill="url(#commentsGrad)" />

          {/* Stroke lines */}
          <path d={views.line} fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={likes.line} fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={comments.line} fill="none" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            {t('Views')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
            {t('Likes')}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            {t('Comments')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
