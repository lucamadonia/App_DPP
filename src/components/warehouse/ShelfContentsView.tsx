import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FURNITURE_CATALOG } from '@/components/warehouse/floor-map/furniture-catalog';
import {
  getStockByFurniture,
  getStockBySection,
  getFurnitureFillRatio,
} from '@/components/warehouse/floor-map/floor-map-utils';
import type { ZoneFurniture, WhStockLevel } from '@/types/warehouse';

interface ShelfContentsViewProps {
  furniture: ZoneFurniture;
  stock: WhStockLevel[];
  zoneName: string;
}

export function ShelfContentsView({
  furniture,
  stock,
  zoneName,
}: ShelfContentsViewProps) {
  const { t, i18n } = useTranslation('warehouse');
  const isDE = i18n.language.startsWith('de');
  const catalog = FURNITURE_CATALOG[furniture.type];
  const fStock = getStockByFurniture(stock, furniture.id);
  const fillRatio = getFurnitureFillRatio(stock, furniture);
  const fillPercent = Math.round(fillRatio * 100);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg flex items-center justify-center shrink-0"
          style={{
            backgroundColor: catalog.color,
            color: catalog.textColor,
          }}
        >
          <Package className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-medium truncate">{furniture.name}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {isDE ? catalog.labelDe : catalog.labelEn} · {zoneName}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base sm:text-lg font-bold tabular-nums">
            {fStock.totalUnits}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">{t('items')}</p>
        </div>
      </div>

      {/* Fill level bar */}
      <div className="space-y-1 sm:space-y-1.5">
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
          <span>{t('Fill Level')}</span>
          <span>{fillPercent}%</span>
        </div>
        <Progress
          value={fillPercent}
          className="h-1.5 sm:h-2"
        />
      </div>

      {/* Sections grid */}
      <div className="space-y-1.5 sm:space-y-2">
        {furniture.sections.map((section) => {
          const sStock = getStockBySection(stock, furniture.id, section.id);
          const sectionFill =
            section.capacity && section.capacity > 0
              ? Math.min(100, Math.round((sStock.totalUnits / section.capacity) * 100))
              : null;

          return (
            <div
              key={section.id}
              className="rounded-lg border bg-card p-2.5 sm:p-3 space-y-1.5 sm:space-y-2"
            >
              {/* Section header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <span className="font-mono text-xs sm:text-sm font-medium">
                    {section.label}
                  </span>
                  {section.capacity != null && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">
                      ({t('Capacity')}: {section.capacity})
                    </span>
                  )}
                </div>
                {sStock.totalUnits > 0 ? (
                  <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                    {sStock.totalUnits} {t('units')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                    {t('empty')}
                  </Badge>
                )}
              </div>

              {/* Capacity bar */}
              {sectionFill !== null && (
                <Progress value={sectionFill} className="h-1 sm:h-1.5" />
              )}

              {/* Stock items */}
              {sStock.items.length > 0 && (
                <div className="space-y-1">
                  {sStock.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md bg-muted/30 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {item.productName || item.productId.slice(0, 8)}
                        </p>
                        <p className="text-muted-foreground truncate">
                          {item.batchSerialNumber || item.batchId.slice(0, 8)}
                        </p>
                      </div>
                      <div className="text-right pl-2 sm:pl-3 shrink-0 tabular-nums">
                        <span className="font-medium">
                          {item.quantityAvailable}
                        </span>
                        {item.quantityReserved > 0 && (
                          <span className="text-muted-foreground ml-1 hidden sm:inline">
                            (+{item.quantityReserved} {t('Reserved')})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state for section */}
              {sStock.items.length === 0 && (
                <p className="text-[10px] sm:text-xs text-muted-foreground text-center py-1">
                  {t('No stock assigned')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
