import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { sparklinePoints } from '@/lib/animations';

interface WarehouseKPICardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;      // e.g. 'text-blue-600'
  gradient: string;    // e.g. 'from-blue-500/20 to-blue-600/10'
  loading?: boolean;
  trend?: number;      // percentage, positive = up
  sparkData?: number[];
  sparkColor?: string; // hex color for sparkline stroke
  format?: (v: number) => string;
  decimals?: number;
  onClick?: () => void;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const points = sparklinePoints(data, 60, 24);
  return (
    <svg width="60" height="24" className="mt-1.5 opacity-60">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WarehouseKPICard({
  label,
  value,
  icon: Icon,
  color,
  gradient,
  loading = false,
  trend,
  sparkData,
  sparkColor = '#3B82F6',
  format,
  decimals = 0,
  onClick,
}: WarehouseKPICardProps) {
  const animated = useAnimatedNumber(loading ? 0 : value, { duration: 900, decimals });
  const displayValue = format ? format(animated) : animated.toLocaleString();

  return (
    <Card
      className={`hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4 px-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-0.5" />
            ) : (
              <p className="text-xl font-bold tabular-nums leading-tight mt-0.5">
                {displayValue}
              </p>
            )}
            <div className="flex items-center gap-2">
              {trend != null && trend !== 0 && !loading && (
                <div className={`flex items-center gap-0.5 text-[10px] font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{Math.abs(trend)}%</span>
                </div>
              )}
              {sparkData && sparkData.length >= 2 && !loading && (
                <MiniSparkline data={sparkData} color={sparkColor} />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
