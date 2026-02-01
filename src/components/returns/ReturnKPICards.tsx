import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ArrowDownToLine, Clock, Percent, CreditCard, ShieldCheck, MessageSquare, TrendingUp, TrendingDown } from 'lucide-react';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { sparklinePoints } from '@/lib/animations';
import type { ReturnsHubStats } from '@/types/returns-hub';

interface ReturnKPICardsProps {
  stats: ReturnsHubStats;
}

interface KPIConfig {
  label: string;
  rawValue: number;
  format: (v: number) => string;
  icon: typeof Package;
  color: string;
  bg: string;
  decimals?: number;
  trend?: number;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const points = sparklinePoints(data, 50, 20);

  return (
    <svg width="50" height="20" className="mt-1 opacity-60">
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

function AnimatedKPIValue({ value, format, decimals = 0 }: { value: number; format: (v: number) => string; decimals?: number }) {
  const animated = useAnimatedNumber(value, { duration: 900, decimals });
  return <span className="text-lg font-bold">{format(animated)}</span>;
}

export function ReturnKPICards({ stats }: ReturnKPICardsProps) {
  const { t } = useTranslation('returns');

  const sparkData = stats.dailyReturns.map((d) => d.count);

  const kpis: KPIConfig[] = [
    {
      label: t('Open Returns'),
      rawValue: stats.openReturns,
      format: (v) => String(v),
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: 5,
    },
    {
      label: t('Received Today'),
      rawValue: stats.todayReceived,
      format: (v) => String(v),
      icon: ArrowDownToLine,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: t('Avg. Processing Time'),
      rawValue: stats.avgProcessingDays,
      format: (v) => `${v} ${t('days')}`,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      trend: -2,
    },
    {
      label: t('Return Rate'),
      rawValue: stats.returnRate,
      format: (v) => `${v.toFixed(1)}%`,
      icon: Percent,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      decimals: 1,
    },
    {
      label: t('Refund Volume'),
      rawValue: stats.refundVolume,
      format: (v) => `\u20AC${v.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: CreditCard,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      decimals: 2,
    },
    {
      label: t('SLA Compliance'),
      rawValue: stats.slaCompliance,
      format: (v) => `${v.toFixed(0)}%`,
      icon: ShieldCheck,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      label: t('Open Tickets'),
      rawValue: stats.openTickets,
      format: (v) => String(v),
      icon: MessageSquare,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  const visible = useStaggeredList(kpis.length, { interval: 50 });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {kpis.map((kpi, i) => (
        <Card
          key={kpi.label}
          className={`hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ${
            visible[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
          style={{ transition: 'opacity 0.35s ease-out, transform 0.35s ease-out, box-shadow 0.2s ease' }}
        >
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                <AnimatedKPIValue value={kpi.rawValue} format={kpi.format} decimals={kpi.decimals} />
                {kpi.trend != null && kpi.trend !== 0 && (
                  <div className={`flex items-center gap-0.5 text-[10px] ${kpi.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {kpi.trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{Math.abs(kpi.trend)}%</span>
                  </div>
                )}
              </div>
            </div>
            {i === 0 && sparkData.length >= 2 && (
              <MiniSparkline data={sparkData} color="#3B82F6" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
