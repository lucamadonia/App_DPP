import { useTranslation } from 'react-i18next';
import { CalendarClock, CalendarCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  DEADLINE_TONE_CLASSES,
  getDaysUntil,
  getDeadlineTone,
  parseDeadlineDate,
} from './deadline-utils';

interface DeadlineChipProps {
  /** ISO date string or free text that may contain a date. */
  date?: string | null;
  /** Show the absolute date next to the relative countdown. */
  showDate?: boolean;
  className?: string;
}

/**
 * "In force since …" / "Applies from … · in N days" chip. Renders nothing when
 * no calendar date can be recognised, so callers can pass free text safely and
 * keep showing the original text elsewhere.
 */
export function DeadlineChip({ date, showDate = true, className }: DeadlineChipProps) {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const parsed = parseDeadlineDate(date);
  if (!parsed) return null;

  const days = getDaysUntil(parsed);
  const tone = getDeadlineTone(days);
  const Icon = tone === 'past' ? CalendarCheck2 : CalendarClock;
  const formatted = formatDate(parsed.toISOString(), locale);

  const label =
    tone === 'past'
      ? showDate
        ? t('In force since {{date}}', { date: formatted })
        : t('In force')
      : days === 1
        ? t('in 1 day')
        : t('in {{days}} days', { days });

  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-5 tabular-nums',
        DEADLINE_TONE_CLASSES[tone],
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {tone !== 'past' && showDate && (
        <span className="truncate">
          {t('Applies from {{date}}', { date: formatted })}
          <span aria-hidden="true"> · </span>
        </span>
      )}
      <span className="shrink-0">{label}</span>
    </span>
  );
}
