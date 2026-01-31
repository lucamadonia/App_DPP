import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ArrowDownToLine, Clock, Percent, CreditCard, ShieldCheck, MessageSquare } from 'lucide-react';
import type { ReturnsHubStats } from '@/types/returns-hub';

interface ReturnKPICardsProps {
  stats: ReturnsHubStats;
}

export function ReturnKPICards({ stats }: ReturnKPICardsProps) {
  const { t } = useTranslation('returns');

  const kpis = [
    {
      label: t('Open Returns'),
      value: stats.openReturns,
      icon: Package,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: t('Received Today'),
      value: stats.todayReceived,
      icon: ArrowDownToLine,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: t('Avg. Processing Time'),
      value: `${stats.avgProcessingDays} ${t('days')}`,
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: t('Return Rate'),
      value: `${stats.returnRate.toFixed(1)}%`,
      icon: Percent,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: t('Refund Volume'),
      value: `€${stats.refundVolume.toLocaleString('de-DE', { minimumFractionDigits: 2 })}`,
      icon: CreditCard,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: t('SLA Compliance'),
      value: `${stats.slaCompliance.toFixed(0)}%`,
      icon: ShieldCheck,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
    },
    {
      label: t('Open Tickets'),
      value: stats.openTickets,
      icon: MessageSquare,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-lg font-bold">{kpi.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
