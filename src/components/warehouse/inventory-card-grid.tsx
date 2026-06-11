import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { AlertTriangle, MapPin, MoreHorizontal, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { staggerContainer, staggerItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { formatBinLocation } from '@/lib/warehouse-utils';
import { InventoryRowActions } from '@/components/warehouse/inventory-row-actions';
import { InventoryStockBar, StockHealthDot, getStockHealth } from '@/components/warehouse/inventory-stock-bar';
import type { WhLocation, WhStockLevel } from '@/types/warehouse';

export interface InventoryCardGroup {
  key: string;
  label: string;
  linkTo?: string;
  rows: WhStockLevel[];
}

export interface InventoryCardGridProps {
  stock: WhStockLevel[];
  /** Optional grouped sections (group-by location/product). Falls back to flat grid. */
  groups: InventoryCardGroup[] | null;
  locations: WhLocation[];
  selectedIds: Set<string>;
  onToggleSelect: (s: WhStockLevel) => void;
  onAdjust: (s: WhStockLevel) => void;
  onMoveShelf: (s: WhStockLevel) => void;
  onTransfer: (s: WhStockLevel) => void;
  onWriteOff: (s: WhStockLevel) => void;
}

/**
 * Feature-complete card grid for inventory stock levels: selection,
 * health indicator, stock composition bar and the full row-action set.
 * Touch targets are >= 44px; entrance is a choreographed stagger.
 */
export function InventoryCardGrid({
  stock,
  groups,
  locations,
  selectedIds,
  onToggleSelect,
  onAdjust,
  onMoveShelf,
  onTransfer,
  onWriteOff,
}: InventoryCardGridProps) {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();

  const renderCard = (s: WhStockLevel) => {
    const health = getStockHealth(s);
    const isSelected = selectedIds.has(s.id);
    const location = locations.find(l => l.id === s.locationId);
    const shelfLabel = s.binLocation ? formatBinLocation(s.binLocation, location) : null;

    return (
      <motion.div
        key={s.id}
        variants={prefersReduced ? undefined : staggerItem}
        whileHover={prefersReduced ? undefined : { y: -2 }}
        whileTap={prefersReduced ? undefined : { scale: 0.97 }}
        className="min-w-0"
      >
        <Card
          className={cn(
            'h-full transition-shadow duration-200 hover:shadow-md',
            isSelected && 'ring-2 ring-primary border-primary/50',
            health === 'critical' && !isSelected && 'border-l-2 border-l-orange-400'
          )}
        >
          <CardContent className="pt-3.5 pb-3 px-3.5 space-y-3">
            {/* Header: checkbox + product/batch + actions */}
            <div className="flex items-start gap-1">
              <label
                className="flex items-center justify-center min-h-11 min-w-11 -ml-2 -mt-2 cursor-pointer shrink-0"
                onClick={e => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(s)}
                  aria-label={t('Select item')}
                />
              </label>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-1.5">
                  <StockHealthDot health={health} />
                  <Link
                    to={`/products/${s.productId}`}
                    className="font-medium text-sm leading-tight hover:underline text-primary truncate"
                  >
                    {s.productName || s.productId.slice(0, 8)}
                  </Link>
                </div>
                <Link
                  to={`/products/${s.productId}/batches/${s.batchId}`}
                  className="block font-mono text-xs text-muted-foreground hover:underline truncate mt-0.5"
                >
                  {s.batchSerialNumber || s.batchId.slice(0, 8)}
                </Link>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 -mr-2 -mt-2 shrink-0 text-muted-foreground"
                    aria-label={t('Actions')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <InventoryRowActions
                    stock={s}
                    onAdjust={onAdjust}
                    onMoveShelf={onMoveShelf}
                    onTransfer={onTransfer}
                    onWriteOff={onWriteOff}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Location + shelf chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="gap-1 text-xs font-normal max-w-full">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{s.locationName ?? '—'}</span>
              </Badge>
              {shelfLabel && (
                <Badge variant="secondary" className="font-mono text-xs font-normal max-w-full">
                  <span className="truncate">{shelfLabel}</span>
                </Badge>
              )}
              {health === 'critical' && (
                <Badge variant="destructive" className="gap-1 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  {t('Low Stock Alerts')}
                </Badge>
              )}
            </div>

            {/* Composition bar */}
            <InventoryStockBar row={s} />

            {/* Quantities */}
            <div className="flex items-end justify-between gap-2">
              <div>
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {s.quantityAvailable.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">{t('Available')}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground tabular-nums">
                <div>{t('Reserved')}: {s.quantityReserved.toLocaleString()}</div>
                {s.reorderPoint != null && (
                  <div>{t('Reorder Point')}: {s.reorderPoint.toLocaleString()}</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const gridClass = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3';

  if (groups && groups.length > 0) {
    return (
      <motion.div
        variants={prefersReduced ? undefined : staggerContainer}
        initial={prefersReduced ? undefined : 'initial'}
        animate={prefersReduced ? undefined : 'animate'}
        className="space-y-5"
      >
        {groups.map(group => (
          <section key={group.key} className="space-y-2.5">
            <div className="flex items-center gap-2 font-medium text-sm">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              {group.linkTo ? (
                <Link to={group.linkTo} className="hover:underline text-primary truncate">
                  {group.label}
                </Link>
              ) : (
                <span className="truncate">{group.label}</span>
              )}
              <Badge variant="secondary" className="text-xs tabular-nums">{group.rows.length}</Badge>
            </div>
            <div className={gridClass}>
              {group.rows.map(renderCard)}
            </div>
          </section>
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={prefersReduced ? undefined : staggerContainer}
      initial={prefersReduced ? undefined : 'initial'}
      animate={prefersReduced ? undefined : 'animate'}
      className={gridClass}
    >
      {stock.map(renderCard)}
    </motion.div>
  );
}
