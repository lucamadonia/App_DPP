import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { DeadlineItem } from '@/types/warehouse';
import { CalendarClock } from 'lucide-react';

interface DeadlinesListProps {
  deadlines: DeadlineItem[];
  className?: string;
}

function urgencyColor(daysRemaining: number): string {
  if (daysRemaining < 0) return 'bg-red-500';
  if (daysRemaining < 3) return 'bg-orange-500';
  if (daysRemaining < 7) return 'bg-amber-400';
  return 'bg-gray-300 dark:bg-gray-600';
}

function badgeVariant(daysRemaining: number): 'destructive' | 'secondary' | 'outline' {
  if (daysRemaining < 0) return 'destructive';
  if (daysRemaining < 3) return 'secondary';
  return 'outline';
}

export function DeadlinesList({ deadlines, className }: DeadlinesListProps) {
  const { t } = useTranslation('warehouse');

  if (deadlines.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="px-3 sm:px-6 pb-2">
          <CardTitle className="text-sm sm:text-base">{t('Upcoming Deadlines')}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-muted-foreground">
            <CalendarClock className="h-8 w-8 sm:h-10 sm:w-10 mb-2 opacity-40" />
            <p className="text-sm">{t('No upcoming deadlines')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="px-3 sm:px-6 pb-2">
        <CardTitle className="text-sm sm:text-base">{t('Upcoming Deadlines')}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="max-h-80 overflow-y-auto space-y-2.5 sm:space-y-3 pr-1">
          {deadlines.map((dl) => (
            <div key={dl.id} className="flex items-center gap-2 sm:gap-3">
              <span className={`h-2 w-2 rounded-full shrink-0 ${urgencyColor(dl.daysRemaining)}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium truncate">{t(dl.label)}</p>
                {dl.campaignName && (
                  <p className="text-xs text-muted-foreground truncate">{dl.campaignName}</p>
                )}
              </div>
              <Badge variant={badgeVariant(dl.daysRemaining)} className="text-xs shrink-0">
                {dl.daysRemaining < 0
                  ? `${Math.abs(dl.daysRemaining)}d ${t('overdue')}`
                  : dl.daysRemaining === 0
                    ? t('Today')
                    : `${dl.daysRemaining}d`
                }
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
