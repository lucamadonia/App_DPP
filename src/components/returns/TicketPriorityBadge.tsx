import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { ReturnPriority } from '@/types/returns-hub';

const priorityConfig: Record<ReturnPriority, { label: string; className: string }> = {
  low: { label: 'Low', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  normal: { label: 'Normal', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700 border-red-200' },
};

interface TicketPriorityBadgeProps {
  priority: ReturnPriority;
  className?: string;
}

export function TicketPriorityBadge({ priority, className }: TicketPriorityBadgeProps) {
  const { t } = useTranslation('returns');
  const config = priorityConfig[priority] || priorityConfig.normal;

  return (
    <Badge variant="outline" className={`${config.className} ${className || ''}`}>
      {t(config.label)}
    </Badge>
  );
}
