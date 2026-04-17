import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MobileDrawer } from '@/components/layout/mobile-drawer';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ListToolbarProps {
  /** Search input */
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  /** Filter UI rendered inside a mobile drawer OR inline on desktop */
  filters?: React.ReactNode;
  /** Number of active filters (drives mobile badge) */
  activeFilterCount?: number;
  /** View-toggle control (table vs grid vs kanban) */
  viewToggle?: React.ReactNode;
  /** Right-aligned action buttons (e.g. "New", "Export") */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Universal toolbar for list pages: search + filters + view toggle + actions.
 *
 * Mobile: search full-width; filters/view-toggle behind drawer triggers; actions wrap.
 * Desktop: single horizontal row with all slots.
 */
export function ListToolbar({
  search,
  filters,
  activeFilterCount = 0,
  viewToggle,
  actions,
  className,
}: ListToolbarProps) {
  const { t } = useTranslation('common');
  const isMobile = useIsMobile();
  const [filtersOpen, setFiltersOpen] = React.useState(false);

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3', className)}>
      {/* Search */}
      {search && (
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? t('Search')}
            className="pl-9"
            type="search"
          />
        </div>
      )}

      {/* Filters + view-toggle + actions — row on sm+, wraps on mobile */}
      <div className="flex items-center gap-2 flex-wrap">
        {filters && isMobile ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltersOpen(true)}
            className="relative"
          >
            <SlidersHorizontal className="size-4 mr-1" />
            {t('Show filters')}
            {activeFilterCount > 0 && (
              <Badge
                variant="default"
                className="ml-1.5 h-5 min-w-5 px-1.5 text-[10px]"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        ) : (
          filters
        )}

        {viewToggle}

        {actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
      </div>

      {filters && isMobile && (
        <MobileDrawer
          open={filtersOpen}
          onOpenChange={setFiltersOpen}
          title={t('Show filters')}
          side="bottom"
          maxHeight="85vh"
          footer={
            <Button onClick={() => setFiltersOpen(false)} className="w-full">
              {t('Close')}
            </Button>
          }
        >
          {filters}
        </MobileDrawer>
      )}
    </div>
  );
}
