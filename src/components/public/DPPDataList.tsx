import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DPPDataListItem {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Hide this row if value is null/undefined/empty */
  hideIfEmpty?: boolean;
}

interface DPPDataListProps {
  items: DPPDataListItem[];
  /** Use bordered card wrapper. Default true */
  bordered?: boolean;
  /** Tight row padding for dense data */
  compact?: boolean;
  className?: string;
  /** Inline style overrides (e.g. for dynamic card background) */
  style?: React.CSSProperties;
  /** Label text color (defaults to muted-foreground) */
  labelColor?: string;
}

function isEmpty(value: React.ReactNode): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

/**
 * Shared label/value `<dl>` stack for DPP Template tables on mobile.
 *
 * Replaces 2-column "label/value" HTML tables in Template Scientific,
 * Technical, etc. Retains semantic definition-list markup for a11y.
 *
 * Desktop: label on left, value on right (flex row, border-b rows).
 * Mobile: label stacked above value for max readability.
 */
export function DPPDataList({
  items,
  bordered = true,
  compact = false,
  className,
  style,
  labelColor,
}: DPPDataListProps) {
  const visible = items.filter((item) => !(item.hideIfEmpty && isEmpty(item.value)));
  if (visible.length === 0) return null;

  return (
    <dl
      className={cn(
        bordered && 'rounded-xl border bg-card divide-y',
        className
      )}
      style={style}
    >
      {visible.map((item, idx) => (
        <div
          key={idx}
          className={cn(
            'flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4',
            compact ? 'px-3 py-2' : 'px-4 py-3',
            !bordered && idx < visible.length - 1 && 'border-b'
          )}
        >
          <dt
            className={cn(
              'text-xs sm:text-sm font-medium uppercase tracking-wide sm:tracking-normal sm:normal-case flex-shrink-0 sm:max-w-[50%]',
              !labelColor && 'text-muted-foreground'
            )}
            style={labelColor ? { color: labelColor } : undefined}
          >
            {item.label}
          </dt>
          <dd
            className={cn(
              'text-sm sm:text-right font-medium text-foreground min-w-0 break-words'
            )}
          >
            {item.value || '—'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
