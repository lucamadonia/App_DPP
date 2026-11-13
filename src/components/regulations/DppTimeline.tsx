import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { useLocale } from '@/hooks/use-locale';
import { staggerContainer, staggerItem, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { DeadlineChip } from './DeadlineChip';
import { deadlineState, formatDeadline } from './regulation-dates';
import type { Milestone } from './regulation-milestones';

const DOT: Record<string, string> = {
  imminent: 'bg-destructive ring-destructive/25',
  soon: 'bg-warning ring-warning/25',
  upcoming: 'bg-primary ring-primary/25',
  inForce: 'bg-success ring-success/25',
  ongoing: 'bg-muted-foreground ring-border',
};

const INITIAL = 6;

export function DppTimeline({ milestones }: { milestones: Milestone[] }) {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  const upcoming = useMemo(() => milestones.filter((m) => m.days > 0), [milestones]);
  const shown = expanded ? upcoming : upcoming.slice(0, INITIAL);

  const List = prefersReduced ? 'ol' : motion.ol;
  const Item = prefersReduced ? 'li' : motion.li;

  return (
    <section aria-labelledby="dpp-timeline-title" className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <IconTile icon={CalendarClock} size="md" />
        <div className="min-w-0">
          <h3 id="dpp-timeline-title" className="font-semibold leading-tight">{t('DPP Timeline: Important Deadlines')}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('Overview of upcoming Digital Product Passport deadlines')}</p>
        </div>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('No upcoming deadlines')}</p>
      ) : (
        <>
          <List
            className="relative space-y-4 border-l border-border pl-6"
            {...(!prefersReduced && { variants: staggerContainer, initial: 'initial', animate: 'animate' })}
          >
            {shown.map((m) => {
              const state = deadlineState(m.days);
              return (
                <Item key={m.id} className="relative min-w-0" {...(!prefersReduced && { variants: staggerItem })}>
                  <span
                    aria-hidden="true"
                    className={cn('absolute -left-[1.84rem] top-1.5 h-3 w-3 rounded-full ring-4', DOT[state])}
                  />
                  <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tabular-nums text-muted-foreground">{formatDeadline(m, locale)}</p>
                      <p className="font-medium leading-snug break-words">{m.title ?? t('Application')}</p>
                      <p className="text-sm text-muted-foreground break-words">{m.regulation}</p>
                    </div>
                    <DeadlineChip value={m.raw} className="self-start shrink-0" />
                  </div>
                </Item>
              );
            })}
          </List>
          {upcoming.length > INITIAL && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              className="mt-4 min-h-11 w-full sm:min-h-8 sm:w-auto"
              aria-expanded={expanded}
            >
              {expanded ? <ChevronUp className="mr-1.5 h-4 w-4" /> : <ChevronDown className="mr-1.5 h-4 w-4" />}
              {expanded ? t('Show less', { ns: 'common' }) : t('Show all {{count}} deadlines', { count: upcoming.length })}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
