import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowRightLeft, MapPin, MoreHorizontal, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { WhStockLevel } from '@/types/warehouse';

interface InventoryCardViewProps {
  stock: WhStockLevel[];
  onAdjust: (s: WhStockLevel) => void;
  onTransfer: (s: WhStockLevel) => void;
}

function StockBarVisual({ row }: { row: WhStockLevel }) {
  const total = row.quantityAvailable + row.quantityReserved + row.quantityDamaged + row.quantityQuarantine;
  if (total === 0) return <div className="h-2 w-full rounded-full bg-muted" />;
  const pct = (v: number) => `${(v / total) * 100}%`;
  return (
    <div className="space-y-1">
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted">
        {row.quantityAvailable > 0 && <div className="bg-emerald-500" style={{ width: pct(row.quantityAvailable) }} />}
        {row.quantityReserved > 0 && <div className="bg-blue-500" style={{ width: pct(row.quantityReserved) }} />}
        {row.quantityDamaged > 0 && <div className="bg-orange-500" style={{ width: pct(row.quantityDamaged) }} />}
        {row.quantityQuarantine > 0 && <div className="bg-red-500" style={{ width: pct(row.quantityQuarantine) }} />}
      </div>
      <div className="flex gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />{row.quantityAvailable}</span>
        <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />{row.quantityReserved}</span>
        {row.quantityDamaged > 0 && <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />{row.quantityDamaged}</span>}
        {row.quantityQuarantine > 0 && <span className="flex items-center gap-0.5"><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />{row.quantityQuarantine}</span>}
      </div>
    </div>
  );
}

export function InventoryCardView({ stock, onAdjust, onTransfer }: InventoryCardViewProps) {
  const { t } = useTranslation('warehouse');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {stock.map((s) => {
        const isLow = s.reorderPoint != null && s.quantityAvailable <= s.reorderPoint;
        return (
          <Card
            key={s.id}
            className={`hover:shadow-md transition-all duration-200 ${isLow ? 'border-l-2 border-l-orange-400' : ''}`}
          >
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <Link
                    to={`/products/${s.productId}`}
                    className="text-sm font-medium hover:underline text-primary truncate block"
                  >
                    {s.productName || s.productId.slice(0, 8)}
                  </Link>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {s.batchSerialNumber || s.batchId.slice(0, 8)}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onAdjust(s)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t('Adjust Stock')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onTransfer(s)}>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      {t('Transfer Stock')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Location badge */}
              <div className="flex items-center gap-1.5 mb-3">
                <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                  <MapPin className="h-2.5 w-2.5" />
                  {s.locationName ?? '—'}
                </Badge>
                {s.binLocation && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">{s.binLocation}</Badge>
                )}
                {isLow && (
                  <Badge variant="destructive" className="text-[10px] gap-1 px-1.5 py-0">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {t('Low')}
                  </Badge>
                )}
              </div>

              {/* Stock bar */}
              <StockBarVisual row={s} />

              {/* Available count prominently */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-lg font-bold tabular-nums">{s.quantityAvailable.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">{t('units in stock')}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
