import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { staggerContainer, staggerItem, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { dateLocaleFor, daysFromToday, groupByDay, TONE_SURFACE, type HubTone } from './compliance-ui';

export interface TimelineItem {
  id: string;
  createdAt: string;
  icon: LucideIcon;
  tone: HubTone;
  title: ReactNode;
  meta?: ReactNode;
  body?: ReactNode;
}

function DayLabel({ day }: { day: string }) {
  const { t, i18n } = useTranslation('compliance');
  const date = new Date(`${day}T00:00:00`);
  const diff = daysFromToday(date);
  const label =
    diff === 0
      ? t('Today')
      : diff === -1
        ? t('Yesterday')
        : date.toLocaleDateString(dateLocaleFor(i18n.language), {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
          });
  return label;
}

/**
 * Day-grouped vertical timeline. Day headers keep long logs scannable;
 * the rail + tinted node make the action type readable before the text is.
 */
export function HubTimeline({ items }: { items: TimelineItem[] }) {
  const { i18n } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();
  const groups = groupByDay(items);
  const dateLocale = dateLocaleFor(i18n.language);
  const List = prefersReduced ? 'ol' : motion.ol;
  const Row = prefersReduced ? 'li' : motion.li;

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <section key={g.day} aria-label={g.day}>
          <h3 className="mb-2 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            <DayLabel day={g.day} />
            <span className="ml-2 font-normal normal-case tracking-normal tabular-nums">· {g.items.length}</span>
          </h3>
          <List
            className="relative space-y-1 before:absolute before:bottom-3 before:left-[17px] before:top-3 before:w-px before:bg-border"
            {...(!prefersReduced && { variants: staggerContainer, initial: 'initial', animate: 'animate' })}
          >
            {g.items.map((item) => {
              const Icon = item.icon;
              return (
                <Row
                  key={item.id}
                  className="relative flex min-w-0 gap-3 rounded-xl p-1.5 pr-2 transition-colors hover:bg-muted/40"
                  {...(!prefersReduced && { variants: staggerItem })}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative z-[1] mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card',
                      TONE_SURFACE[item.tone],
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 py-0.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <div className="min-w-0 text-sm font-medium break-words">{item.title}</div>
                      <time
                        dateTime={item.createdAt}
                        className="shrink-0 text-xs tabular-nums text-muted-foreground"
                      >
                        {new Date(item.createdAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}
                      </time>
                    </div>
                    {item.meta && <div className="mt-0.5 text-xs text-muted-foreground">{item.meta}</div>}
                    {item.body && <div className="mt-1.5 min-w-0">{item.body}</div>}
                  </div>
                </Row>
              );
            })}
          </List>
        </section>
      ))}
    </div>
  );
}

/** Key/value detail chips — readable replacement for raw JSON dumps. */
export function DetailChips({ details, max = 6 }: { details?: Record<string, unknown>; max?: number }) {
  if (!details) return null;
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;
  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {entries.slice(0, max).map(([k, v]) => {
        const text = typeof v === 'object' ? JSON.stringify(v) : String(v);
        return (
          <span
            key={k}
            className="inline-flex max-w-full min-w-0 items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]"
          >
            <span className="shrink-0 text-muted-foreground">{k}</span>
            <span className="truncate text-foreground" title={text}>
              {text.length > 80 ? `${text.slice(0, 80)}…` : text}
            </span>
          </span>
        );
      })}
      {entries.length > max && (
        <span className="px-1 py-0.5 text-[11px] text-muted-foreground">+{entries.length - max}</span>
      )}
    </div>
  );
}
