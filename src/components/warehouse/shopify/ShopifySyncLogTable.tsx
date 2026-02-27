import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {t('No sync logs yet')}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('Sync Type')}</TableHead>
            <TableHead>{t('Direction')}</TableHead>
            <TableHead>{t('Status')}</TableHead>
            <TableHead className="text-center">{t('Total')}</TableHead>
            <TableHead className="text-center">{t('Created')}</TableHead>
            <TableHead className="text-center">{t('Updated')}</TableHead>
            <TableHead className="text-center">{t('Skipped')}</TableHead>
            <TableHead className="text-center">{t('Failed')}</TableHead>
            <TableHead>{t('Trigger')}</TableHead>
            <TableHead>{t('Started')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">{t(log.syncType)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{t(log.direction)}</Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={log.status} />
              </TableCell>
              <TableCell className="text-center">{log.totalCount}</TableCell>
              <TableCell className="text-center">
                {log.createdCount > 0 && <span className="text-green-600">{log.createdCount}</span>}
                {log.createdCount === 0 && <span className="text-muted-foreground">0</span>}
              </TableCell>
              <TableCell className="text-center">
                {log.updatedCount > 0 && <span className="text-blue-600">{log.updatedCount}</span>}
                {log.updatedCount === 0 && <span className="text-muted-foreground">0</span>}
              </TableCell>
              <TableCell className="text-center">
                {log.skippedCount > 0 && <span className="text-amber-600">{log.skippedCount}</span>}
                {log.skippedCount === 0 && <span className="text-muted-foreground">0</span>}
              </TableCell>
              <TableCell className="text-center">
                {log.failedCount > 0 ? (
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
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{t(log.triggerType)}</Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(log.startedAt).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
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
