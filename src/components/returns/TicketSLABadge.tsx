import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Minus } from 'lucide-react';
import type { RhTicket, SlaStatus } from '@/types/returns-hub';

interface TicketSLABadgeProps {
  ticket: RhTicket;
  className?: string;
}

function computeSlaStatus(ticket: RhTicket): { status: SlaStatus; remaining: number } {
  if (!ticket.slaResolutionAt) return { status: 'none', remaining: 0 };
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    const resolved = ticket.resolvedAt ? new Date(ticket.resolvedAt) : new Date();
    const deadline = new Date(ticket.slaResolutionAt);
    return { status: resolved <= deadline ? 'met' : 'breached', remaining: 0 };
  }

  const now = new Date();
  const deadline = new Date(ticket.slaResolutionAt);
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs < 0) return { status: 'breached', remaining: Math.abs(diffMs) };
  if (diffMs < 2 * 60 * 60 * 1000) return { status: 'at_risk', remaining: diffMs };
  return { status: 'met', remaining: diffMs };
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

const slaConfig: Record<SlaStatus, { icon: React.ElementType; className: string; labelKey: string }> = {
  met: { icon: CheckCircle, className: 'bg-green-100 text-green-700 border-green-200', labelKey: 'SLA Met' },
  at_risk: { icon: Clock, className: 'bg-yellow-100 text-yellow-700 border-yellow-200', labelKey: 'SLA At Risk' },
  breached: { icon: AlertCircle, className: 'bg-red-100 text-red-700 border-red-200', labelKey: 'SLA Breached' },
  none: { icon: Minus, className: 'bg-gray-100 text-gray-500 border-gray-200', labelKey: 'No SLA' },
};

export function TicketSLABadge({ ticket, className }: TicketSLABadgeProps) {
  const { t } = useTranslation('returns');
  const { status, remaining } = computeSlaStatus(ticket);
  const config = slaConfig[status];
  const Icon = config.icon;

  let timeLabel = '';
  if (status === 'at_risk' || (status === 'met' && remaining > 0)) {
    timeLabel = t('{{time}} remaining', { time: formatDuration(remaining) });
  } else if (status === 'breached' && remaining > 0) {
    timeLabel = t('Overdue by {{time}}', { time: formatDuration(remaining) });
  }

  return (
    <Badge variant="outline" className={`${config.className} ${className || ''}`}>
      <Icon className="h-3 w-3 mr-1" />
      {t(config.labelKey)}
      {timeLabel && <span className="ml-1 text-[10px] opacity-80">({timeLabel})</span>}
    </Badge>
  );
}

export { computeSlaStatus, formatDuration };
