import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Inbox, PlayCircle, Clock, AlertTriangle } from 'lucide-react';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import type { TicketStats } from '@/types/returns-hub';

interface TicketKPICardsProps {
  stats: TicketStats;
}

export function TicketKPICards({ stats }: TicketKPICardsProps) {
  const { t } = useTranslation('returns');

  const animOpen = useAnimatedNumber(stats.open, { duration: 700 });
  const animInProgress = useAnimatedNumber(stats.inProgress, { duration: 700, delay: 50 });
  const animWaiting = useAnimatedNumber(stats.waiting, { duration: 700, delay: 100 });
  const animOverdue = useAnimatedNumber(stats.overdue, { duration: 700, delay: 150 });

  const kpis = [
    {
      label: t('Open Tickets'),
      value: animOpen,
      icon: Inbox,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: t('In Progress Tickets'),
      value: animInProgress,
      icon: PlayCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      label: t('Waiting Tickets'),
      value: animWaiting,
      icon: Clock,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: t('Overdue Tickets'),
      value: animOverdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  const cardVisibility = useStaggeredList(kpis.length, { interval: 60, initialDelay: 50 });

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi, i) => (
        <Card
          key={kpi.label}
          className={`hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ${
            cardVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
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
                <p className="text-lg font-bold">{kpi.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
