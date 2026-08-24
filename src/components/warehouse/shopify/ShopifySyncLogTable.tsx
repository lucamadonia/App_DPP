import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
} from '@/components/ui/responsive-table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertCircle } from 'lucide-react';
import type { ShopifySyncLog } from '@/types/shopify';

interface Props {
  logs: ShopifySyncLog[];
}

export function ShopifySyncLogTable({ logs }: Props) {
  const { t } = useTranslation('warehouse');

  const countCell = (value: number, positiveClass: string) =>
    (value > 0
      ? <span className={positiveClass}>{value}</span>
      : <span className="text-muted-foreground">0</span>);

  const columns: ResponsiveTableColumn<ShopifySyncLog>[] = [
    {
      id: 'syncType',
      header: t('Sync Type'),
      className: 'font-medium text-xs sm:text-sm',
      mobilePriority: 'title',
      cell: log => t(log.syncType),
    },
    {
      id: 'direction',
      header: t('Direction'),
      hideBelow: 'sm',
      mobilePriority: 'subtitle',
      cell: log => <Badge variant="outline" className="text-xs">{t(log.direction)}</Badge>,
    },
    {
      id: 'status',
      header: t('Status'),
      mobilePriority: 'badge',
      cell: log => <StatusBadge status={log.status} />,
    },
    {
      id: 'total',
      header: t('Total'),
      className: 'text-center',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Total'),
      cell: log => log.totalCount,
    },
    {
      id: 'created',
      header: t('Created'),
      className: 'text-center',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Created'),
      cell: log => countCell(log.createdCount, 'text-green-600'),
    },
    {
      id: 'updated',
      header: t('Updated'),
      className: 'text-center',
      hideBelow: 'lg',
      mobilePriority: 'meta',
      mobileLabel: t('Updated'),
      cell: log => countCell(log.updatedCount, 'text-blue-600'),
    },
    {
      id: 'skipped',
      header: t('Skipped'),
      className: 'text-center',
      hideBelow: 'lg',
      mobilePriority: 'meta',
      mobileLabel: t('Skipped'),
      cell: log => countCell(log.skippedCount, 'text-amber-600'),
    },
    {
      id: 'failed',
      header: t('Failed'),
      className: 'text-center',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Failed'),
      cell: log => (log.failedCount > 0 ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-red-600 flex items-center justify-center gap-1 cursor-help">
                {log.failedCount}
                <AlertCircle className="h-3 w-3" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1">
                {log.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-xs">
                    {typeof err === 'object' && err !== null && 'message' in err
                      ? (err as { message: string }).message
                      : String(err)}
                  </p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className="text-muted-foreground">0</span>
      )),
    },
    {
      id: 'trigger',
      header: t('Trigger'),
      hideBelow: 'lg',
      mobilePriority: 'meta',
      mobileLabel: t('Trigger'),
      cell: log => <Badge variant="outline" className="text-xs">{t(log.triggerType)}</Badge>,
    },
    {
      id: 'started',
      header: t('Started'),
      className: 'text-xs text-muted-foreground whitespace-nowrap',
      mobilePriority: 'meta',
      mobileLabel: t('Started'),
      cell: log => new Date(log.startedAt).toLocaleString(),
    },
  ];

  return (
    <ResponsiveTable
      data={logs}
      columns={columns}
      rowKey={log => log.id}
      emptyState={
        <div className="rounded-lg border border-dashed p-6 sm:p-8 text-center text-xs sm:text-sm text-muted-foreground">
          {t('No sync logs yet')}
        </div>
      }
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('warehouse');

  const variants: Record<string, string> = {
    running: 'bg-blue-500/10 text-blue-600 border-blue-200',
    completed: 'bg-green-500/10 text-green-600 border-green-200',
    partial: 'bg-amber-500/10 text-amber-600 border-amber-200',
    failed: 'bg-red-500/10 text-red-600 border-red-200',
  };

  return (
    <Badge className={`text-xs ${variants[status] || ''}`}>
      {t(status)}
    </Badge>
  );
}
