import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { AlarmClock, Bell, FileText, Globe, Landmark } from 'lucide-react';
import { KPIGrid, type KPIItem } from '@/components/ui/kpi-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { IconTile } from '@/components/ui/icon-tile';
import { useLocale } from '@/hooks/use-locale';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { DeadlineChip } from './DeadlineChip';
import { formatDeadline } from './regulation-dates';
import type { Milestone } from './regulation-milestones';

interface RegulationsOverviewProps {
  countryCount: number;
  euCount: number;
  euUpcoming: number;
  nationalCount: number;
  mandatoryNational: number;
  importantUpdates: number;
  next: Milestone | null;
  /** Upcoming milestones in the next 365 days. */
  dueThisYear: number;
}

export function RegulationsOverview({
  countryCount,
  euCount,
  euUpcoming,
  nationalCount,
  mandatoryNational,
  importantUpdates,
  next,
  dueThisYear,
}: RegulationsOverviewProps) {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();

  const items: KPIItem[] = [
    {
      id: 'countries',
      label: t('Countries covered'),
      value: <AnimatedCounter value={countryCount} />,
      icon: <Globe className="h-4 w-4" />,
      accentClassName: 'text-primary',
      sublabel: t('EU single market + national rules'),
    },
    {
      id: 'eu',
      label: t('EU Regulations'),
      value: <AnimatedCounter value={euCount} />,
      icon: <FileText className="h-4 w-4" />,
      sublabel: t('{{count}} upcoming', { count: euUpcoming }),
    },
    {
      id: 'national',
      label: t('National rules'),
      value: <AnimatedCounter value={nationalCount} />,
      icon: <Landmark className="h-4 w-4" />,
      sublabel: t('{{count}} mandatory', { count: mandatoryNational }),
    },
    {
      id: 'updates',
      label: t('Important Updates'),
      value: <AnimatedCounter value={importantUpdates} />,
      icon: <Bell className="h-4 w-4" />,
      accentClassName: importantUpdates > 0 ? 'text-warning' : undefined,
      sublabel: t('High priority news'),
    },
  ];

  const urgent = next !== null && next.days <= 180;

  return (
    <section
      aria-label={t('Overview')}
      className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
    >
      {/* Next-milestone spotlight: the one date a compliance lead must not miss. */}
      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className={cn(
          'relative isolate min-w-0 overflow-hidden rounded-2xl border bg-card p-5 shadow-sm sm:p-6',
          urgent ? 'border-destructive/30' : 'border-primary/20',
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full blur-3xl',
            urgent ? 'bg-destructive/15' : 'bg-primary/15',
          )}
        />
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <IconTile icon={AlarmClock} size="sm" tone={urgent ? 'danger' : 'primary'} />
          {t('Next milestone')}
        </div>

        {next ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-end gap-2">
              <span
                className={cn(
                  'text-5xl font-bold leading-none tracking-tight tabular-nums sm:text-6xl',
                  urgent ? 'text-destructive' : 'text-foreground',
                )}
              >
                <AnimatedCounter value={next.days} />
              </span>
              <span className="pb-1 text-sm font-medium text-muted-foreground">{t('days to go')}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-snug break-words">{next.title ?? t('Application')}</p>
              <p className="text-sm text-muted-foreground break-words">
                {next.regulation} · {formatDeadline(next, locale)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DeadlineChip value={next.raw} />
              {dueThisYear > 1 && (
                <span className="text-xs text-muted-foreground">
                  {t('{{count}} deadlines in the next 12 months', { count: dueThisYear })}
                </span>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t('No upcoming deadlines')}</p>
        )}
      </motion.div>

      <KPIGrid items={items} cols={{ base: 2, sm: 2 }} className="min-w-0 [&>div]:h-full [&>div]:auto-rows-fr" />
    </section>
  );
}
