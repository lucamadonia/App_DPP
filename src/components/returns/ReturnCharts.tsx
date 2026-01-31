import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReturnStatus, ReturnsHubStats } from '@/types/returns-hub';
import { ReturnStatusBadge } from './ReturnStatusBadge';

interface ReturnChartsProps {
  stats: ReturnsHubStats;
}

const ALL_STATUSES: ReturnStatus[] = [
  'CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED',
  'SHIPPED', 'DELIVERED', 'INSPECTION_IN_PROGRESS', 'REFUND_PROCESSING',
  'REFUND_COMPLETED', 'COMPLETED', 'REJECTED', 'CANCELLED',
];

export function ReturnCharts({ stats }: ReturnChartsProps) {
  const { t } = useTranslation('returns');

  const maxStatusCount = Math.max(1, ...Object.values(stats.returnsByStatus));
  const maxReasonCount = Math.max(1, ...Object.values(stats.returnsByReason));
  const maxDailyCount = Math.max(1, ...stats.dailyReturns.map(d => d.count));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Returns by Status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('Returns by Status')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ALL_STATUSES.map((status) => {
            const count = stats.returnsByStatus[status] || 0;
            if (count === 0) return null;
            return (
              <div key={status} className="flex items-center gap-2">
                <ReturnStatusBadge status={status} className="text-[10px] w-32 justify-center" />
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-primary/60 rounded"
                    style={{ width: `${(count / maxStatusCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-8 text-right">{count}</span>
              </div>
            );
          })}
          {Object.keys(stats.returnsByStatus).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('No data available')}</p>
          )}
        </CardContent>
      </Card>

      {/* Return Trend (last 30 days) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('Return Trend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-px h-32">
            {stats.dailyReturns.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${day.date}: ${day.count}`}>
                <div
                  className="w-full bg-primary/60 rounded-t min-h-[2px]"
                  style={{ height: `${Math.max(2, (day.count / maxDailyCount) * 100)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>{stats.dailyReturns[0]?.date?.slice(5) || ''}</span>
            <span>{stats.dailyReturns[stats.dailyReturns.length - 1]?.date?.slice(5) || ''}</span>
          </div>
          {stats.dailyReturns.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('No data available')}</p>
          )}
        </CardContent>
      </Card>

      {/* Return Reasons */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t('Return Reasons')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {Object.entries(stats.returnsByReason)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 8)
            .map(([reason, count]) => (
              <div key={reason} className="flex items-center gap-2">
                <span className="text-xs truncate w-28">{reason}</span>
                <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-orange-400/60 rounded"
                    style={{ width: `${(count / maxReasonCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-8 text-right">{count}</span>
              </div>
            ))}
          {Object.keys(stats.returnsByReason).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('No data available')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
