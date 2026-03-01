import { useTranslation } from 'react-i18next';
import { GRID_CELL } from './floor-map-constants';
import { getStockByFurniture, getFurnitureFillRatio } from './floor-map-utils';
import { getFurnitureCatalogEntry } from './furniture-catalog';
import type { ZoneFurniture, WhStockLevel, ZoneMapPosition } from '@/types/warehouse';
import type { FloorMapViewport } from './useFloorMapInteraction';

interface FloorMapFurnitureTooltipProps {
  furniture: ZoneFurniture;
  stock: WhStockLevel[];
  viewport: FloorMapViewport;
  containerRect: DOMRect | null;
  zoneOffset: ZoneMapPosition;
}

export function FloorMapFurnitureTooltip({
  furniture,
  stock,
  viewport,
  containerRect,
  zoneOffset,
}: FloorMapFurnitureTooltipProps) {
  const { t, i18n } = useTranslation('warehouse');
  const catalog = getFurnitureCatalogEntry(furniture.type);
  const label = i18n.language.startsWith('de') ? catalog.labelDe : catalog.labelEn;

  const { totalUnits, totalBatches, reserved } = getStockByFurniture(stock, furniture.id);
  const fillRatio = getFurnitureFillRatio(stock, furniture);
  const fillPercent = Math.round(fillRatio * 100);

  // Position: centered above the furniture piece
  const furnitureWorldX = (zoneOffset.x + furniture.position.x + furniture.size.w / 2) * GRID_CELL;
  const furnitureWorldY = (zoneOffset.y + furniture.position.y) * GRID_CELL;

  const screenX = furnitureWorldX * viewport.zoom + viewport.x;
  const screenY = furnitureWorldY * viewport.zoom + viewport.y;

  const cw = containerRect?.width ?? 800;
  const tooltipW = 200;
  const clampedX = Math.max(tooltipW / 2 + 8, Math.min(cw - tooltipW / 2 - 8, screenX));

  const flipBelow = screenY < 120;

  return (
    <div
      className="absolute z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: clampedX,
        top: flipBelow
          ? screenY + (furniture.size.h * GRID_CELL * viewport.zoom) + 10
          : screenY,
        transform: flipBelow ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)',
      }}
    >
      <div
        className="rounded-xl shadow-xl px-3.5 py-2.5 text-sm min-w-[180px] border"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.8)',
          borderColor: 'rgba(0,0,0,0.08)',
          marginBottom: flipBelow ? 0 : 6,
          marginTop: flipBelow ? 6 : 0,
        }}
      >
        {/* Arrow */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border"
          style={{
            background: 'rgba(255,255,255,0.92)',
            borderColor: 'rgba(0,0,0,0.08)',
            ...(flipBelow
              ? { top: -4, borderRight: 'none', borderBottom: 'none' }
              : { bottom: -4, borderLeft: 'none', borderTop: 'none' }),
          }}
        />

        {/* Color accent bar */}
        <div
          className="absolute top-0 left-3 right-3 h-[2px] rounded-full"
          style={{ background: catalog.stroke }}
        />

        <div className="flex items-start justify-between gap-2 mt-0.5">
          <div className="min-w-0">
            <div className="font-bold text-foreground text-xs truncate">{furniture.name}</div>
          </div>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              background: catalog.color,
              color: catalog.textColor,
              border: `1px solid ${catalog.stroke}40`,
            }}
          >
            {label}
          </span>
        </div>

        <div className="mt-2 space-y-1 text-xs">
          {/* Fill bar */}
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-muted-foreground">{t('Fill Level')}</span>
              <span className="font-semibold tabular-nums">{fillPercent}%</span>
            </div>
            <div className="h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${fillPercent}%`,
                  background: fillPercent > 90 ? '#EF4444' : fillPercent > 70 ? '#F59E0B' : '#22C55E',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-0.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Units')}</span>
              <span className="font-semibold tabular-nums">{totalUnits.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Sections')}</span>
              <span className="font-semibold tabular-nums">{furniture.sections.length}</span>
            </div>
            {totalBatches > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Batches')}</span>
                <span className="font-semibold tabular-nums">{totalBatches}</span>
              </div>
            )}
            {reserved > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Reserved')}</span>
                <span className="font-semibold tabular-nums text-amber-600">{reserved}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
