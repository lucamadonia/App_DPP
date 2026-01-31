import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, Package, Truck, Search, CreditCard, XCircle, Ban } from 'lucide-react';
import type { RhReturnTimeline } from '@/types/returns-hub';
import { ReturnStatusBadge } from './ReturnStatusBadge';
import type { ReturnStatus } from '@/types/returns-hub';

const statusIcons: Record<string, React.ElementType> = {
  CREATED: Clock,
  PENDING_APPROVAL: Clock,
  APPROVED: CheckCircle2,
  LABEL_GENERATED: Package,
  SHIPPED: Truck,
  DELIVERED: Package,
  INSPECTION_IN_PROGRESS: Search,
  REFUND_PROCESSING: CreditCard,
  REFUND_COMPLETED: CreditCard,
  COMPLETED: CheckCircle2,
  REJECTED: XCircle,
  CANCELLED: Ban,
};

interface ReturnTimelineProps {
  entries: RhReturnTimeline[];
}

export function ReturnTimeline({ entries }: ReturnTimelineProps) {
  const { t } = useTranslation('returns');

  if (!entries.length) {
    return (
      <p className="text-sm text-muted-foreground py-4">{t('No data available')}</p>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const Icon = statusIcons[entry.status] || Clock;
        const isLast = index === entries.length - 1;

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isLast ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                <Icon className="h-4 w-4" />
              </div>
              {index < entries.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <ReturnStatusBadge status={entry.status as ReturnStatus} />
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </div>
              {entry.comment && (
                <p className="mt-1 text-sm text-muted-foreground">{entry.comment}</p>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {entry.actorType === 'system' ? t('System') : entry.actorType === 'agent' ? t('Agent') : t('Customer')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
