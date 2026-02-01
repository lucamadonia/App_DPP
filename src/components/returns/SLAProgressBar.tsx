import { useTranslation } from 'react-i18next';
import type { RhTicket } from '@/types/returns-hub';

interface SLAProgressBarProps {
  ticket: RhTicket;
}

export function SLAProgressBar({ ticket }: SLAProgressBarProps) {
  const { t } = useTranslation('returns');

  if (!ticket.slaResolutionAt) {
    return <span className="text-xs text-muted-foreground">{t('No SLA')}</span>;
  }

  const created = new Date(ticket.createdAt).getTime();
  const deadline = new Date(ticket.slaResolutionAt).getTime();
  const now = Date.now();

  const total = deadline - created;
  const elapsed = now - created;
  const progress = Math.min(Math.max(elapsed / total, 0), 1);
  const remaining = deadline - now;

  const isOverdue = remaining <= 0;
  const isAtRisk = !isOverdue && progress > 0.75;

  const barColor = isOverdue
    ? 'bg-destructive'
    : isAtRisk
    ? 'bg-warning'
    : 'bg-success';

  const formatRemaining = (ms: number) => {
    const abs = Math.abs(ms);
    const hours = Math.floor(abs / (1000 * 60 * 60));
    const mins = Math.floor((abs % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={isOverdue ? 'text-destructive font-medium' : isAtRisk ? 'text-warning font-medium' : 'text-muted-foreground'}>
          {isOverdue
            ? t('Overdue by {{time}}', { time: formatRemaining(remaining) })
            : t('{{time}} remaining', { time: formatRemaining(remaining) })}
        </span>
        <span className="text-muted-foreground">{Math.round(progress * 100)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(progress * 100, 100)}%` }}
        />
      </div>
    </div>
  );
}
