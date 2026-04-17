import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPIItem {
  /** Stable identifier for keying */
  id: string;
  /** Label text */
  label: React.ReactNode;
  /** Primary value (large, prominent) */
  value: React.ReactNode;
  /** Optional icon component */
  icon?: React.ReactNode;
  /** Optional delta/sublabel */
  sublabel?: React.ReactNode;
  /** Optional colored accent (e.g. 'text-success', 'text-destructive') */
  accentClassName?: string;
  /** Optional onClick for tappable KPI cards */
  onClick?: () => void;
}

interface KPIGridProps {
  items: KPIItem[];
  /** Column breakpoints. Default: 2 base, 3 sm, 4 lg */
  cols?: {
    base?: 1 | 2;
    xs?: 1 | 2 | 3;
    sm?: 2 | 3 | 4;
    md?: 2 | 3 | 4 | 5 | 6;
    lg?: 3 | 4 | 5 | 6 | 7;
    xl?: 4 | 5 | 6 | 7 | 8;
  };
  /** Compact variant with smaller padding */
  compact?: boolean;
  /** Collapse beyond N on xs screens (shows "+N more" expander). Default: show all */
  collapseBelow?: number;
  className?: string;
}

const GRID_COL_CLASSES: Record<string, string> = {
  'base-1': 'grid-cols-1',
  'base-2': 'grid-cols-2',
  'xs-1': 'xs:grid-cols-1',
  'xs-2': 'xs:grid-cols-2',
  'xs-3': 'xs:grid-cols-3',
  'sm-2': 'sm:grid-cols-2',
  'sm-3': 'sm:grid-cols-3',
  'sm-4': 'sm:grid-cols-4',
  'md-2': 'md:grid-cols-2',
  'md-3': 'md:grid-cols-3',
  'md-4': 'md:grid-cols-4',
  'md-5': 'md:grid-cols-5',
  'md-6': 'md:grid-cols-6',
  'lg-3': 'lg:grid-cols-3',
  'lg-4': 'lg:grid-cols-4',
  'lg-5': 'lg:grid-cols-5',
  'lg-6': 'lg:grid-cols-6',
  'lg-7': 'lg:grid-cols-7',
  'xl-4': 'xl:grid-cols-4',
  'xl-5': 'xl:grid-cols-5',
  'xl-6': 'xl:grid-cols-6',
  'xl-7': 'xl:grid-cols-7',
  'xl-8': 'xl:grid-cols-8',
};

/**
 * Responsive KPI grid primitive.
 *
 * Replaces ad-hoc `grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7` patterns.
 * Supports "+N more" collapse on xs devices where too many KPIs would crush labels.
 */
export function KPIGrid({
  items,
  cols = { base: 2, sm: 3, lg: 4 },
  compact = false,
  collapseBelow,
  className,
}: KPIGridProps) {
  const { t } = useTranslation('common');
  const [expanded, setExpanded] = React.useState(false);

  const gridClasses = [
    cols.base && GRID_COL_CLASSES[`base-${cols.base}`],
    cols.xs && GRID_COL_CLASSES[`xs-${cols.xs}`],
    cols.sm && GRID_COL_CLASSES[`sm-${cols.sm}`],
    cols.md && GRID_COL_CLASSES[`md-${cols.md}`],
    cols.lg && GRID_COL_CLASSES[`lg-${cols.lg}`],
    cols.xl && GRID_COL_CLASSES[`xl-${cols.xl}`],
  ]
    .filter(Boolean)
    .join(' ');

  const shouldCollapse =
    typeof collapseBelow === 'number' &&
    items.length > collapseBelow &&
    !expanded;

  const visibleItems = shouldCollapse
    ? items.slice(0, collapseBelow as number)
    : items;
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('grid gap-3 sm:gap-4', gridClasses)}>
        {visibleItems.map((item) => (
          <KPICard key={item.id} item={item} compact={compact} />
        ))}
      </div>

      {typeof collapseBelow === 'number' && items.length > collapseBelow && (
        <div className="flex justify-center xs:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs h-8"
          >
            {expanded ? (
              <>
                <ChevronUp className="size-3.5 mr-1" />
                {t('Show less')}
              </>
            ) : (
              <>
                <ChevronDown className="size-3.5 mr-1" />
                {hiddenCount > 0 ? `+${hiddenCount} ${t('More').toLowerCase()}` : t('Show more')}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function KPICard({ item, compact }: { item: KPIItem; compact: boolean }) {
  const interactive = Boolean(item.onClick);
  return (
    <Card
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={item.onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        'gap-0 transition-all',
        compact ? 'py-3' : 'py-4 sm:py-5',
        interactive &&
          'cursor-pointer hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
    >
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-xs text-muted-foreground font-medium line-clamp-2 min-w-0">
            {item.label}
          </span>
          {item.icon && (
            <span className={cn('flex-shrink-0 text-muted-foreground', item.accentClassName)}>
              {item.icon}
            </span>
          )}
        </div>
        <span
          className={cn(
            'font-semibold tabular-nums leading-tight',
            compact ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl',
            item.accentClassName
          )}
        >
          {item.value}
        </span>
        {item.sublabel && (
          <span className="text-xs text-muted-foreground line-clamp-1">
            {item.sublabel}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
