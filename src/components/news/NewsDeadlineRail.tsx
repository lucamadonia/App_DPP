import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { CalendarClock } from 'lucide-react';
import { gridItem, gridStagger, useReducedMotion } from '@/lib/motion';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';
import type { NewsItem } from '@/types/database';
import {
  DEADLINE_TONE_CLASSES,
  getDaysUntil,
  getDeadlineTone,
  type DeadlineTone,
} from '@/components/knowledge/deadline-utils';

const TONE_TEXT: Record<DeadlineTone, string> = {
  past: 'text-success',
  imminent: 'text-destructive',
  soon: 'text-warning',
  upcoming: 'text-primary',
};

const LOCALE_TAG: Record<string, string> = { de: 'de-DE', en: 'en-GB' };

/** Upcoming effective dates as calendar tiles — scroll rail on phones, grid on desktop. */
export function NewsDeadlineRail({ items }: { items: NewsItem[] }) {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();
  const Grid = prefersReduced ? 'ol' : motion.ol;
  const Item = prefersReduced ? 'li' : motion.li;
  const gridProps = prefersReduced ? {} : { variants: gridStagger, initial: 'initial', animate: 'animate' };
  const itemProps = prefersReduced ? {} : { variants: gridItem };
  const tag = LOCALE_TAG[locale] ?? locale;

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="news-deadlines-heading" className="space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-warning" aria-hidden="true" />
        <h2 id="news-deadlines-heading" className="text-sm font-semibold">
          {t('Upcoming Deadlines')}
        </h2>
      </div>
      <Grid
        {...gridProps}
        className={cn(
          '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide',
          'md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] md:overflow-visible md:px-0 md:pb-0'
        )}
      >
        {items.map((item) => {
          const date = new Date(item.effectiveDate!);
          const days = getDaysUntil(date);
          const tone = getDeadlineTone(days);
          return (
            <Item
              key={item.id}
              {...itemProps}
              className="flex w-[15rem] shrink-0 snap-start items-start gap-3 rounded-2xl border bg-card p-3 shadow-sm md:w-auto"
            >
              <div
                className={cn(
                  'flex w-14 shrink-0 flex-col items-center rounded-xl border py-1.5 text-center',
                  DEADLINE_TONE_CLASSES[tone]
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide">
                  {date.toLocaleDateString(tag, { month: 'short' })}
                </span>
                <span className="text-xl font-bold leading-none tabular-nums">{date.getDate()}</span>
                <span className="text-[10px] tabular-nums opacity-80">{date.getFullYear()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-3 text-sm font-medium leading-snug break-words">{item.title}</p>
                <p className={cn('mt-1 text-xs font-semibold tabular-nums', TONE_TEXT[tone])}>
                  {days === 1 ? t('in 1 day') : t('in {{days}} days', { days })}
                </p>
              </div>
            </Item>
          );
        })}
      </Grid>
    </section>
  );
}
