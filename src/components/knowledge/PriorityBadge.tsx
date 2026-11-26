import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type KnowledgePriority = 'critical' | 'high' | 'medium' | 'low';

const PRIORITY_CLASSES: Record<KnowledgePriority, string> = {
  critical: 'border-destructive/30 bg-destructive/10 text-destructive',
  high: 'border-warning/30 bg-warning/10 text-warning',
  medium: 'border-primary/25 bg-primary/10 text-primary',
  low: 'border-border bg-muted text-muted-foreground',
};

const PRIORITY_DOT: Record<KnowledgePriority, string> = {
  critical: 'bg-destructive',
  high: 'bg-warning',
  medium: 'bg-primary',
  low: 'bg-muted-foreground/60',
};

const PRIORITY_LABEL: Record<KnowledgePriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Token-based priority pill (no hard-coded palette, readable in every style). */
export function PriorityBadge({
  priority,
  className,
}: {
  priority: KnowledgePriority;
  className?: string;
}) {
  const { t } = useTranslation('compliance');
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-5',
        PRIORITY_CLASSES[priority],
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_DOT[priority])} aria-hidden="true" />
      {t(PRIORITY_LABEL[priority])}
    </span>
  );
}

/** Left accent stripe colour per priority, for cards and rows. */
export const PRIORITY_ACCENT: Record<KnowledgePriority, string> = {
  critical: 'before:bg-destructive',
  high: 'before:bg-warning',
  medium: 'before:bg-primary',
  low: 'before:bg-border',
};
