import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AlarmClock, CalendarClock, CheckCircle2, Hourglass, Info, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import {
  daysUntil,
  deadlineState,
  formatDeadline,
  parseDeadline,
  type DeadlineState,
} from './regulation-dates';

/**
 * Token-based tones only, so chips stay legible in light, dark and every
 * app style (the styles re-tone the neutrals; the semantic tokens hold).
 */
const CHIP_TONES = {
  primary: 'bg-primary/10 text-primary ring-primary/20',
  success: 'bg-success/10 text-success ring-success/25',
  warning: 'bg-warning/10 text-warning ring-warning/25',
  danger: 'bg-destructive/10 text-destructive ring-destructive/25',
  muted: 'bg-muted text-muted-foreground ring-border',
} as const;

export type ChipTone = keyof typeof CHIP_TONES;

interface ChipProps {
  tone?: ChipTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Chip({ tone = 'muted', icon: Icon, children, className, title }: ChipProps) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-5 ring-1 ring-inset',
        CHIP_TONES[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

const STATE_META: Record<DeadlineState, { tone: ChipTone; icon: LucideIcon }> = {
  inForce: { tone: 'success', icon: CheckCircle2 },
  imminent: { tone: 'danger', icon: AlarmClock },
  soon: { tone: 'warning', icon: Hourglass },
  upcoming: { tone: 'primary', icon: CalendarClock },
  ongoing: { tone: 'muted', icon: Info },
};

interface DeadlineChipProps {
  /** Raw master-data value: ISO date, quarter, year or prose. */
  value: string | null | undefined;
  className?: string;
}

/** "In force since …", "In 42 days", "Applies from …" — or the raw text when it is prose. */
export function DeadlineChip({ value, className }: DeadlineChipProps) {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const parsed = parseDeadline(value);
  if (!parsed.raw) return null;

  const days = parsed.date ? daysUntil(parsed.date) : null;
  const state = deadlineState(days);
  const { tone, icon } = STATE_META[state];
  const date = formatDeadline(parsed, locale);

  let label: string;
  if (state === 'inForce') label = t('In force since {{date}}', { date });
  else if (state === 'imminent' || state === 'soon') label = t('In {{count}} days', { count: days ?? 0 });
  else if (state === 'upcoming') label = t('Applies from {{date}}', { date });
  else label = parsed.raw;

  return (
    <Chip tone={tone} icon={icon} className={className} title={parsed.raw}>
      {label}
    </Chip>
  );
}

