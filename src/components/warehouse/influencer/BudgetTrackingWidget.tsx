import { useTranslation } from 'react-i18next';
import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BudgetTrackingWidgetProps {
  budget?: number;
  budgetSpent?: number;
  currency?: string;
  className?: string;
}

export function BudgetTrackingWidget({
  budget,
  budgetSpent = 0,
  currency = 'EUR',
  className = '',
}: BudgetTrackingWidgetProps) {
  const { t } = useTranslation('warehouse');

  if (!budget) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            {t('Budget Progress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('No budget set')}</p>
        </CardContent>
      </Card>
    );
  }

  const percent = Math.min(Math.round((budgetSpent / budget) * 100), 100);

  const barColor =
    percent >= 80
      ? 'from-red-500 to-red-600'
      : percent >= 60
        ? 'from-amber-400 to-amber-500'
        : 'from-green-400 to-green-500';

  const sym = currency === 'EUR' ? '\u20AC' : currency === 'USD' ? '$' : `${currency} `;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          {t('Budget Progress')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Large numbers */}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">
            {sym}{budgetSpent.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm">
            / {sym}{budget.toLocaleString()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Percentage label */}
        <p className="text-xs text-muted-foreground">
          {t('{{percent}}% of budget used', { percent })}
        </p>
      </CardContent>
    </Card>
  );
}
