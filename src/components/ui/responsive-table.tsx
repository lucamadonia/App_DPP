import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown, ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

/** Priority hint for mobile card rendering */
export type MobilePriority = 'title' | 'subtitle' | 'badge' | 'meta';

export interface ResponsiveTableColumn<T> {
  /** Unique column id (used for sort state and React keys) */
  id: string;
  /** Table header content (desktop); also used as screen-reader label on mobile */
  header: React.ReactNode;
  /** Cell renderer */
  cell: (row: T) => React.ReactNode;
  /** How to render this column's value in mobile card view */
  mobilePriority?: MobilePriority;
  /** Hide column on viewport smaller than breakpoint */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
  /** Enable sorting by this column */
  sortable?: boolean;
  /** Accessor for sort comparison (defaults to cell output if string/number) */
  sortAccessor?: (row: T) => string | number | Date;
  /** Column width / min-width utility classes */
  className?: string;
  /** Mobile label override (defaults to header) */
  mobileLabel?: React.ReactNode;
}

export interface SortState {
  by: string;
  order: 'asc' | 'desc';
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: ResponsiveTableColumn<T>[];
  /** Key extractor for React reconciliation */
  rowKey: (row: T) => string;
  /** Optional row click handler */
  onRowClick?: (row: T) => void;
  /** Optional href extractor — if present, rows render as Links */
  rowHref?: (row: T) => string;
  /** Current sort state (controlled) */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /** Row selection support */
  selection?: {
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
    onToggleAll: () => void;
  };
  /** Empty state */
  emptyState?: React.ReactNode;
  /** Loading state */
  loading?: boolean;
  /** Loading skeleton rows count */
  loadingRows?: number;
  /** Custom mobile card title renderer (overrides auto-pick from mobilePriority=title) */
  mobileCardTitle?: (row: T) => React.ReactNode;
  className?: string;
  /** Force mobile card layout regardless of viewport */
  forceMobileCards?: boolean;
}

const HIDE_BELOW_CLASSES: Record<string, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

/**
 * Universal table primitive that renders a traditional `<table>` on `md+`
 * and a stack of Cards below `md`. Columns declare a `mobilePriority` hint
 * that drives card layout (title, subtitle, badges, meta rows).
 *
 * Desktop: full table with optional sort + selection.
 * Mobile: card list with title/subtitle/badges/meta rows + chevron if clickable.
 */
export function ResponsiveTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  rowHref,
  sort,
  onSortChange,
  selection,
  emptyState,
  loading = false,
  loadingRows = 5,
  mobileCardTitle,
  className,
  forceMobileCards = false,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();
  const showCards = isMobile || forceMobileCards;

  if (loading) {
    return showCards ? (
      <MobileCardsSkeleton rows={loadingRows} />
    ) : (
      <TableSkeleton columns={columns.length} rows={loadingRows} />
    );
  }

  if (data.length === 0) {
    return <div className={cn('py-12 text-center', className)}>{emptyState}</div>;
  }

  if (showCards) {
    return (
      <div className={cn('space-y-2', className)}>
        {data.map((row) => (
          <MobileRowCard
            key={rowKey(row)}
            row={row}
            columns={columns}
            rowKey={rowKey(row)}
            onRowClick={onRowClick}
            rowHref={rowHref}
            selection={selection}
            mobileCardTitle={mobileCardTitle}
          />
        ))}
      </div>
    );
  }

  return (
    <DesktopTable
      data={data}
      columns={columns}
      rowKey={rowKey}
      onRowClick={onRowClick}
      rowHref={rowHref}
      sort={sort}
      onSortChange={onSortChange}
      selection={selection}
      className={className}
    />
  );
}

function DesktopTable<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  rowHref,
  sort,
  onSortChange,
  selection,
  className,
}: Pick<
  ResponsiveTableProps<T>,
  | 'data'
  | 'columns'
  | 'rowKey'
  | 'onRowClick'
  | 'rowHref'
  | 'sort'
  | 'onSortChange'
  | 'selection'
  | 'className'
>) {
  const allSelected =
    selection && data.length > 0 && data.every((row) => selection.selectedIds.has(rowKey(row)));

  const handleSort = (colId: string) => {
    if (!onSortChange) return;
    if (sort?.by === colId) {
      onSortChange({ by: colId, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ by: colId, order: 'asc' });
    }
  };

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {selection && (
              <TableHead className="w-10 px-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={selection.onToggleAll}
                  aria-label="Select all"
                />
              </TableHead>
            )}
            {columns.map((col) => (
              <TableHead
                key={col.id}
                className={cn(
                  col.hideBelow && HIDE_BELOW_CLASSES[col.hideBelow],
                  col.sortable && 'cursor-pointer select-none',
                  col.className
                )}
                onClick={col.sortable ? () => handleSort(col.id) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable &&
                    (sort?.by === col.id ? (
                      sort.order === 'asc' ? (
                        <ArrowUp className="size-3" />
                      ) : (
                        <ArrowDown className="size-3" />
                      )
                    ) : (
                      <ArrowUpDown className="size-3 text-muted-foreground/50" />
                    ))}
                </span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const id = rowKey(row);
            const isSelected = selection?.selectedIds.has(id);
            const clickable = Boolean(onRowClick || rowHref);
            return (
              <TableRow
                key={id}
                data-state={isSelected ? 'selected' : undefined}
                className={cn(clickable && 'cursor-pointer')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {selection && (
                  <TableCell className="w-10 px-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => selection.onToggle(id)}
                      aria-label="Select row"
                    />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    className={cn(
                      col.hideBelow && HIDE_BELOW_CLASSES[col.hideBelow],
                      col.className
                    )}
                  >
                    {col.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function MobileRowCard<T>({
  row,
  columns,
  rowKey,
  onRowClick,
  rowHref,
  selection,
  mobileCardTitle,
}: {
  row: T;
  columns: ResponsiveTableColumn<T>[];
  rowKey: string;
  onRowClick?: (row: T) => void;
  rowHref?: (row: T) => string;
  selection?: ResponsiveTableProps<T>['selection'];
  mobileCardTitle?: (row: T) => React.ReactNode;
}) {
  const titleCol = columns.find((c) => c.mobilePriority === 'title');
  const subtitleCol = columns.find((c) => c.mobilePriority === 'subtitle');
  const badgeCols = columns.filter((c) => c.mobilePriority === 'badge');
  const metaCols = columns.filter((c) => c.mobilePriority === 'meta');

  const href = rowHref?.(row);
  const clickable = Boolean(onRowClick || href);
  const isSelected = selection?.selectedIds.has(rowKey);

  const content = (
    <Card
      className={cn(
        'gap-2 py-3 px-4 transition-colors',
        clickable && 'hover:bg-muted/50 cursor-pointer',
        isSelected && 'ring-2 ring-primary'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {selection && (
          <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => selection.onToggle(rowKey)}
              aria-label="Select row"
            />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title row */}
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-sm truncate">
              {mobileCardTitle ? mobileCardTitle(row) : titleCol?.cell(row)}
            </div>
            {badgeCols.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {badgeCols.map((col) => (
                  <div key={col.id}>{col.cell(row)}</div>
                ))}
              </div>
            )}
          </div>
          {/* Subtitle row */}
          {subtitleCol && (
            <div className="text-xs text-muted-foreground line-clamp-2">
              {subtitleCol.cell(row)}
            </div>
          )}
          {/* Meta rows */}
          {metaCols.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground pt-1">
              {metaCols.map((col) => (
                <div key={col.id} className="inline-flex items-center gap-1">
                  {col.mobileLabel && (
                    <span className="opacity-70">{col.mobileLabel}:</span>
                  )}
                  <span className="text-foreground/80">{col.cell(row)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {clickable && (
          <ChevronRight className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        )}
      </div>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        {content}
      </Link>
    );
  }
  if (onRowClick) {
    return (
      <button type="button" onClick={() => onRowClick(row)} className="w-full text-left">
        {content}
      </button>
    );
  }
  return content;
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: columns }).map((_, j) => (
                <TableCell key={j}>
                  <div className="h-4 w-full bg-muted rounded animate-pulse" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MobileCardsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Card key={i} className="gap-2 py-3 px-4">
          <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
        </Card>
      ))}
    </div>
  );
}

/** Convenience: "Load more" footer for paginated tables */
export function LoadMoreFooter({
  shown,
  total,
  onLoadMore,
  loading,
}: {
  shown: number;
  total: number;
  onLoadMore: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation('common');
  const hasMore = shown < total;
  return (
    <div className="flex flex-col items-center gap-2 py-4">
      <span className="text-xs text-muted-foreground">
        {t('Showing {{shown}} of {{total}}', { shown, total })}
      </span>
      {hasMore && (
        <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}>
          {loading ? t('Loading...') : t('Load more')}
        </Button>
      )}
    </div>
  );
}
