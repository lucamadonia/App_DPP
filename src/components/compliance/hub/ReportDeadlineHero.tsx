import { useTranslation } from 'react-i18next';
import { AlarmClock, CalendarCheck2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { cn } from '@/lib/utils';
import type { ComplianceMonthlyReport } from '@/types/compliance';
import { ScoreRing, ToneChip } from './hub-primitives';
import { dateLocaleFor, formatMonth, type HubTone } from './compliance-ui';

interface Props {
  daysUntil: number;
  previousMonth: string;
  ear?: ComplianceMonthlyReport;
  lucid?: ComplianceMonthlyReport;
}

const DONE = new Set(['submitted', 'confirmed']);

/**
 * The single most important fact on the reports page: how long until the
 * 15th, and whether last month's two reports are out the door. Urgency
 * escalates the tone (calm → warning → danger) but never the layout.
 */
export function ReportDeadlineHero({ daysUntil, previousMonth, ear, lucid }: Props) {
  const { t, i18n } = useTranslation('compliance');
  const dateLocale = dateLocaleFor(i18n.language);

  const submitted = [ear, lucid].filter((r) => r && DONE.has(r.status)).length;
  const allDone = submitted === 2;
  const overdue = daysUntil < 0;

  const tone: HubTone = allDone
    ? 'success'
    : overdue || daysUntil === 0
      ? 'danger'
      : daysUntil <= 7
        ? 'warning'
        : 'primary';

  // Countdown ring: fraction of the ~30 day cycle that has elapsed.
  const elapsed = Math.round(Math.max(0, Math.min(1, 1 - Math.max(0, daysUntil) / 30)) * 100);

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + Math.max(0, daysUntil));
  const deadlineLabel = deadline.toLocaleDateString(dateLocale, { weekday: 'short', day: 'numeric', month: 'long' });

  const headline = allDone
    ? t('All reports for {{month}} are submitted', { month: formatMonth(previousMonth, dateLocale) })
    : overdue
      ? t('Report overdue')
      : daysUntil === 0
        ? t('Reporting deadline is today')
        : daysUntil === 1
          ? t('1 day remaining until the 15th')
          : t('{{days}} days remaining until the 15th', { days: daysUntil });

  const sub = allDone
    ? t('Nothing to do until next month. Confirmations from the registers can be recorded in each report.')
    : overdue
      ? t('Fines up to €200,000 possible. Please submit immediately.')
      : t('EAR + LUCID for {{month}} are due by the 15th.', { month: formatMonth(previousMonth, dateLocale) });

  const Icon = allDone ? CheckCircle2 : overdue || daysUntil === 0 ? ShieldAlert : daysUntil <= 7 ? AlarmClock : CalendarCheck2;

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-0',
        tone === 'danger' && 'border-destructive/40',
        tone === 'warning' && 'border-warning/40',
        tone === 'success' && 'border-success/40',
      )}
      role={tone === 'danger' ? 'alert' : undefined}
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 opacity-70',
          tone === 'danger' && 'bg-[radial-gradient(110%_90%_at_100%_0%,color-mix(in_oklab,var(--destructive)_14%,transparent),transparent_60%)]',
          tone === 'warning' && 'bg-[radial-gradient(110%_90%_at_100%_0%,color-mix(in_oklab,var(--warning)_16%,transparent),transparent_60%)]',
          tone === 'success' && 'bg-[radial-gradient(110%_90%_at_100%_0%,color-mix(in_oklab,var(--success)_14%,transparent),transparent_60%)]',
          tone === 'primary' && 'bg-[radial-gradient(110%_90%_at_100%_0%,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_60%)]',
        )}
      />
      <div className="relative flex min-w-0 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <ScoreRing
          value={allDone ? 100 : elapsed}
          tone={tone}
          size={104}
          stroke={9}
          label={headline}
        >
          {allDone ? (
            <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
          ) : (
            <>
              <span className="text-3xl font-bold leading-none tabular-nums">{Math.max(0, daysUntil)}</span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {daysUntil === 1 ? t('day') : t('days')}
              </span>
            </>
          )}
        </ScoreRing>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <IconTile icon={Icon} tone={tone === 'danger' ? 'danger' : tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : 'primary'} size="sm" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t('Reporting deadline:')} {deadlineLabel}
            </span>
          </div>
          <p className="text-lg font-semibold leading-snug text-balance sm:text-xl">{headline}</p>
          <p className="text-sm text-muted-foreground">{sub}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <ToneChip tone={submitted === 2 ? 'success' : submitted === 1 ? 'warning' : 'muted'}>
              {t('{{done}} of {{total}} submitted', { done: submitted, total: 2 })}
            </ToneChip>
            <ToneChip tone="muted">{formatMonth(previousMonth, dateLocale)}</ToneChip>
          </div>
        </div>
      </div>
    </Card>
  );
}
