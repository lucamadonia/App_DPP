import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WhStockLevel } from '@/types/warehouse';

/**
 * Stock health classification for a stock-level row.
 * - critical: available qty at/below reorder point
 * - low:      available qty within 1.5x of reorder point
 * - ok:       comfortably above reorder point
 * - none:     no reorder point configured
 */
export type StockHealth = 'ok' | 'low' | 'critical' | 'none';

// eslint-disable-next-line react-refresh/only-export-components -- shared health helper, also used by the inventory table and card grid
export function getStockHealth(row: WhStockLevel): StockHealth {
  if (row.reorderPoint == null) return 'none';
  if (row.quantityAvailable <= row.reorderPoint) return 'critical';
  if (row.quantityAvailable <= row.reorderPoint * 1.5) return 'low';
  return 'ok';
}

const HEALTH_DOT_CLASS: Record<StockHealth, string> = {
  ok: 'bg-emerald-500',
  low: 'bg-amber-500',
  critical: 'bg-red-500',
  none: 'bg-muted-foreground/30',
};

/** Small colored indicator dot for stock health. */
export function StockHealthDot({ health, className }: { health: StockHealth; className?: string }) {
  const { t } = useTranslation('warehouse');
  const label =
    health === 'ok' ? t('Stock OK')
    : health === 'low' ? t('Low')
    : health === 'critical' ? t('Critical')
    : undefined;
  return (
    <span
      className={cn('inline-block h-2.5 w-2.5 rounded-full shrink-0', HEALTH_DOT_CLASS[health], className)}
      title={label}
      aria-label={label}
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
    />
  );
}

interface InventoryStockBarProps {
  row: WhStockLevel;
  /** Show the inline mini legend below the bar (default true) */
  showLegend?: boolean;
  className?: string;
}

/**
 * Stock composition bar (available / reserved / damaged / quarantine)
 * with a breakdown tooltip. Extracted from InventoryListPage.
 */
export function InventoryStockBar({ row, showLegend = true, className }: InventoryStockBarProps) {
  const { t } = useTranslation('warehouse');
  const total = row.quantityAvailable + row.quantityReserved + row.quantityDamaged + row.quantityQuarantine;
  if (total === 0) return <div className={cn('h-2 w-full rounded-full bg-muted', className)} />;
  const pct = (v: number) => `${(v / total) * 100}%`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('cursor-default', className)}>
            <div className="flex h-2 w-full min-w-[80px] rounded-full overflow-hidden bg-muted">
              {row.quantityAvailable > 0 && <div className="bg-emerald-500 transition-all duration-300" style={{ width: pct(row.quantityAvailable) }} />}
              {row.quantityReserved > 0 && <div className="bg-blue-500 transition-all duration-300" style={{ width: pct(row.quantityReserved) }} />}
              {row.quantityDamaged > 0 && <div className="bg-orange-500 transition-all duration-300" style={{ width: pct(row.quantityDamaged) }} />}
              {row.quantityQuarantine > 0 && <div className="bg-red-500 transition-all duration-300" style={{ width: pct(row.quantityQuarantine) }} />}
            </div>
            {showLegend && (
              <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground leading-none tabular-nums">
                <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />{row.quantityAvailable}</span>
                <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />{row.quantityReserved}</span>
                {row.quantityDamaged > 0 && <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />{row.quantityDamaged}</span>}
                {row.quantityQuarantine > 0 && <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />{row.quantityQuarantine}</span>}
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-0.5 tabular-nums">
            <div>{t('Available Quantity')}: {row.quantityAvailable.toLocaleString()}</div>
            <div>{t('Reserved Quantity')}: {row.quantityReserved.toLocaleString()}</div>
            {row.quantityDamaged > 0 && <div>{t('Damaged Quantity')}: {row.quantityDamaged.toLocaleString()}</div>}
            {row.quantityQuarantine > 0 && <div>{t('Quarantine Quantity')}: {row.quantityQuarantine.toLocaleString()}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
