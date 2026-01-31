import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import type { ReturnStatus } from '@/types/returns-hub';

const statusConfig: Record<ReturnStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  CREATED: { label: 'Created', variant: 'outline' },
  PENDING_APPROVAL: { label: 'Pending Approval', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  APPROVED: { label: 'Approved', variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  LABEL_GENERATED: { label: 'Label Generated', variant: 'secondary', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  SHIPPED: { label: 'Shipped', variant: 'secondary', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  DELIVERED: { label: 'Delivered', variant: 'secondary', className: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  INSPECTION_IN_PROGRESS: { label: 'Inspection in Progress', variant: 'secondary', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  REFUND_PROCESSING: { label: 'Refund Processing', variant: 'secondary', className: 'bg-amber-100 text-amber-800 border-amber-200' },
  REFUND_COMPLETED: { label: 'Refund Completed', variant: 'default', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  COMPLETED: { label: 'Completed', variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'outline', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

interface ReturnStatusBadgeProps {
  status: ReturnStatus;
  className?: string;
}

export function ReturnStatusBadge({ status, className }: ReturnStatusBadgeProps) {
  const { t } = useTranslation('returns');
  const config = statusConfig[status] || statusConfig.CREATED;

  return (
    <Badge
      variant={config.variant}
      className={`${config.className || ''} ${className || ''}`}
    >
      {t(config.label)}
    </Badge>
  );
}
