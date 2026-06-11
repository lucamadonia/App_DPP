import { useTranslation } from 'react-i18next';
import { AlertTriangle, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { WhLocation, WarehouseZone } from '@/types/warehouse';

export type InventoryGroupBy = 'none' | 'location' | 'product';

export interface InventoryFilterControlsProps {
  /** 'sheet' = stacked labelled fields (mobile drawer), 'inline' = horizontal row (desktop) */
  layout: 'sheet' | 'inline';
  locations: WhLocation[];
  availableZones: WarehouseZone[];
  locationFilter: string;
  onLocationChange: (v: string) => void;
  zoneFilter: string;
  onZoneChange: (v: string) => void;
  groupBy: InventoryGroupBy;
  onGroupByChange: (v: InventoryGroupBy) => void;
  lowStockOnly: boolean;
  onLowStockChange: (v: boolean) => void;
}

/**
 * Location / Zone / Group-by / Low-Stock filter fields for the inventory list.
 * Renders as stacked labelled fields inside the mobile filter drawer and as
 * a compact inline row on desktop (low-stock toggle lives in the quick-chip
 * row on desktop, so it is only rendered in the sheet layout).
 */
export function InventoryFilterControls({
  layout,
  locations,
  availableZones,
  locationFilter,
  onLocationChange,
  zoneFilter,
  onZoneChange,
  groupBy,
  onGroupByChange,
  lowStockOnly,
  onLowStockChange,
}: InventoryFilterControlsProps) {
  const { t } = useTranslation('warehouse');
  const isSheet = layout === 'sheet';

  return (
    <div className={isSheet ? 'space-y-4' : 'flex flex-wrap gap-2 items-center'}>
      {/* Location */}
      <div>
        {isSheet && <Label className="text-xs text-muted-foreground mb-1.5 block">{t('Location')}</Label>}
        <Select value={locationFilter} onValueChange={onLocationChange}>
          <SelectTrigger className={cn(isSheet ? 'w-full min-h-11' : 'h-9 w-[180px]')}>
            <SelectValue placeholder={t('All Locations')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Locations')}</SelectItem>
            {locations.map(l => (
              <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Zone (only when a location is selected) */}
      {availableZones.length > 0 && (
        <div>
          {isSheet && <Label className="text-xs text-muted-foreground mb-1.5 block">{t('Zone')}</Label>}
          <Select value={zoneFilter} onValueChange={onZoneChange}>
            <SelectTrigger className={cn(isSheet ? 'w-full min-h-11' : 'h-9 w-[160px]')}>
              <SelectValue placeholder={t('All Zones')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('All Zones')}</SelectItem>
              {availableZones.map(z => (
                <SelectItem key={z.code} value={z.code}>{z.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Group by */}
      <div className={isSheet ? undefined : 'flex items-center gap-2'}>
        {isSheet ? (
          <Label className="text-xs text-muted-foreground mb-1.5 block">{t('Group by')}</Label>
        ) : (
          <>
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground whitespace-nowrap">{t('Group by')}:</span>
          </>
        )}
        <Select value={groupBy} onValueChange={v => onGroupByChange(v as InventoryGroupBy)}>
          <SelectTrigger className={cn(isSheet ? 'w-full min-h-11' : 'h-9 w-[140px]')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('None')}</SelectItem>
            <SelectItem value="location">{t('By Location')}</SelectItem>
            <SelectItem value="product">{t('By Product')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Low stock toggle — sheet layout only (desktop uses the quick-chip row) */}
      {isSheet && (
        <Button
          variant={lowStockOnly ? 'default' : 'outline'}
          className="w-full justify-start min-h-11"
          onClick={() => onLowStockChange(!lowStockOnly)}
        >
          <AlertTriangle className="mr-1.5 h-4 w-4" />
          {t('Low stock only')}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active filter pills
// ---------------------------------------------------------------------------
export interface InventoryFilterPill {
  key: string;
  label: string;
  onRemove: () => void;
}

interface InventoryFilterPillsProps {
  filters: InventoryFilterPill[];
  onClearAll?: () => void;
  className?: string;
}

/**
 * Removable active-filter pills. The whole pill is one tap target
 * (>= 44px on mobile, compact on desktop).
 */
export function InventoryFilterPills({ filters, onClearAll, className }: InventoryFilterPillsProps) {
  const { t } = useTranslation('warehouse');
  if (filters.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {filters.map(f => (
        <button
          key={f.key}
          type="button"
          onClick={f.onRemove}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border bg-secondary text-secondary-foreground',
            'px-3 text-xs font-medium transition-colors hover:bg-secondary/80',
            'min-h-11 sm:min-h-7 sm:px-2.5'
          )}
          aria-label={`${t('Clear Filters')}: ${f.label}`}
        >
          <span className="truncate max-w-[160px]">{f.label}</span>
          <X className="h-3 w-3 shrink-0" />
        </button>
      ))}
      {onClearAll && filters.length > 1 && (
        <Button variant="ghost" size="sm" className="min-h-11 sm:min-h-7 sm:h-7 text-xs px-2" onClick={onClearAll}>
          {t('Clear Filters')}
        </Button>
      )}
    </div>
  );
}
