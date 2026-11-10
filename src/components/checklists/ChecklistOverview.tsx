import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, ListChecks, ShieldAlert, XCircle } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ProgressRing } from '@/components/knowledge/ProgressRing';
import { cn } from '@/lib/utils';
import type { ChecklistItem } from './checklist-meta';

interface ChecklistOverviewProps {
  progress: number;
  completedMandatory: number;
  totalMandatory: number;
  totalItems: number;
  completedItems: number;
  criticalOpen: ChecklistItem[];
  countryLabel: string;
  categoryLabel: string;
}

/** Progress ring + headline numbers + the open critical items, side by side. */
export function ChecklistOverview({
  progress,
  completedMandatory,
  totalMandatory,
  totalItems,
  completedItems,
  criticalOpen,
  countryLabel,
  categoryLabel,
}: ChecklistOverviewProps) {
  const { t } = useTranslation('compliance');
  const complete = progress === 100;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* Progress */}
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 shadow-sm xs:flex-row xs:items-center sm:p-5">
        <ProgressRing
          value={progress}
          toneClassName={complete ? 'text-success' : 'text-primary'}
          label={t('Compliance Progress')}
          className="self-center"
        >
          <span className="text-2xl font-bold tabular-nums leading-none">
            <AnimatedCounter value={progress} suffix="%" />
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t('Mandatory')}
          </span>
        </ProgressRing>
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">
              {countryLabel} · {categoryLabel}
            </p>
            <h2 className="text-lg font-semibold leading-snug">{t('Compliance Progress')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('{{completed}} of {{total}} mandatory items completed', {
                completed: completedMandatory,
                total: totalMandatory,
              })}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <ListChecks className="h-3.5 w-3.5" aria-hidden="true" />
                {t('All items')}
              </p>
              <p className="text-base font-semibold tabular-nums">
                {completedItems}/{totalItems}
              </p>
            </div>
            <div
              className={cn(
                'rounded-lg px-3 py-2',
                complete ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
              )}
            >
              <p className="flex items-center gap-1 text-[11px] font-medium">
                {complete ? (
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {t('Status')}
              </p>
              <p className="text-base font-semibold">{complete ? t('Complete') : t('Incomplete')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Critical items */}
      {criticalOpen.length > 0 ? (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/[0.05] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-destructive">
                {t('{{count}} critical items open', { count: criticalOpen.length })}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t('These items have the highest priority and may lead to sales bans')}
              </p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {criticalOpen.slice(0, 4).map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-sm">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
                <span className="min-w-0 break-words">{item.title}</span>
              </li>
            ))}
          </ul>
          {criticalOpen.length > 4 && (
            <p className="mt-2 text-sm text-muted-foreground">
              {t('+ {{count}} more critical items', { count: criticalOpen.length - 4 })}
            </p>
          )}
        </section>
      ) : (
        <section className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/[0.06] p-4 sm:p-5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-success">{t('No critical items open')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('All items that could block market access are handled.')}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
