import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox, PlayCircle, Clock, AlertTriangle } from 'lucide-react';
import type { TicketStats } from '@/types/returns-hub';

interface TicketKPICardsProps {
  stats: TicketStats;
}

export function TicketKPICards({ stats }: TicketKPICardsProps) {
  const { t } = useTranslation('returns');

  const kpis = [
    {
      label: t('Open Tickets'),
      value: stats.open,
      icon: Inbox,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: t('In Progress Tickets'),
      value: stats.inProgress,
      icon: PlayCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: t('Waiting Tickets'),
      value: stats.waiting,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: t('Overdue Tickets'),
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
