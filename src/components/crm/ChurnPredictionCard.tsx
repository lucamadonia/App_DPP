/**
 * Predicts when the customer is expected to re-order, shows overdue warning.
 */
import { Clock, AlertTriangle, TrendingUp, CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { deriveChurnPrediction, type CrmCustomer } from '@/services/supabase/crm-analytics';

interface ChurnPredictionCardProps {
  customer: CrmCustomer;
}

export function ChurnPredictionCard({ customer }: ChurnPredictionCardProps) {
  const churn = deriveChurnPrediction(customer);

  const { tone, icon: Icon, label, hint } = (() => {
    switch (churn.state) {
      case 'overdue':
        return {
          tone: 'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/30',
          icon: AlertTriangle,
          label: 'Überfällig',
          hint: `Diese Kundschaft bestellt normalerweise alle ${Math.round(churn.avgGap || 0)} Tage. Letzte Bestellung ist ${churn.daysSinceLast} Tage her.`,
        };
      case 'due':
        return {
          tone: 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30',
          icon: Clock,
          label: 'Bald fällig',
          hint: `Rund ${churn.avgGap?.toFixed(0)} Tage Rhythmus, aktuell ${churn.daysSinceLast} Tage her. Demnächst freut sie sich über eine Erinnerung.`,
        };
      case 'healthy':
        return {
          tone: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30',
          icon: TrendingUp,
          label: 'Im Rhythmus',
          hint: `Kauft regelmäßig alle ${churn.avgGap?.toFixed(0)} Tage. Nächste Bestellung erwartet in ca. ${churn.daysUntilExpected} Tagen.`,
        };
      default:
        return {
          tone: 'border-muted bg-muted/30',
          icon: CalendarClock,
          label: 'Zu wenig Daten',
          hint: 'Noch kein Bestellmuster erkennbar. Ab der zweiten Bestellung wird hier ein Rhythmus sichtbar.',
        };
    }
  })();

  return (
    <Card className={tone}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4" />
          Bestellrhythmus
          <Badge variant="outline" className="ml-auto text-xs font-normal">
            {label}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {churn.state !== 'unknown' && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Ø Rhythmus" value={churn.avgGap != null ? `${Math.round(churn.avgGap)} T` : '—'} />
            <Metric label="Seit letztem" value={churn.daysSinceLast != null ? `${churn.daysSinceLast} T` : '—'} />
            <Metric
              label={churn.state === 'overdue' ? 'Überfällig seit' : 'Fällig in'}
              value={
                churn.daysUntilExpected != null
                  ? `${Math.abs(churn.daysUntilExpected)} T`
                  : '—'
              }
              tone={churn.state === 'overdue' ? 'text-red-600' : churn.state === 'due' ? 'text-amber-600' : 'text-emerald-600'}
            />
          </div>
        )}
        <p className="text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div className={`text-lg font-bold tabular-nums ${tone || ''}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
