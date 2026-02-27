import { useTranslation } from 'react-i18next';
import { ZONE_TYPE_CONFIG } from '@/lib/warehouse-constants';
import { ZONE_FILL_COLORS } from './floor-map-constants';
import type { WarehouseZone, WhStockLevel } from '@/types/warehouse';
import { getStockByZone, getZoneFillRatio } from './floor-map-utils';

interface FloorMapZoneTooltipProps {
  zone: WarehouseZone;
  stock: WhStockLevel[];
  allZones: WarehouseZone[];
  position: { x: number; y: number };
}

export function FloorMapZoneTooltip({
  zone,
  stock,
  allZones,
  position,
}: FloorMapZoneTooltipProps) {
  const { t, i18n } = useTranslation('warehouse');
  const cfg = zone.type ? ZONE_TYPE_CONFIG[zone.type] : ZONE_TYPE_CONFIG.other;
  const colors = ZONE_FILL_COLORS[zone.type ?? 'other'];
  const label = i18n.language.startsWith('de') ? cfg.labelDe : cfg.labelEn;
  const { totalUnits, totalBatches, reserved } = getStockByZone(stock, zone.name);
  const fillRatio = getZoneFillRatio(stock, allZones, zone.name);
  const fillPercent = Math.round(fillRatio * 100);

  return (
    <div
      className="absolute z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="rounded-xl shadow-xl px-4 py-3 text-sm min-w-[200px] -translate-x-1/2 -translate-y-full -mt-3 border"
        style={{
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(16px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(16px) saturate(1.8)',
          borderColor: 'rgba(0,0,0,0.08)',
        }}
      >
        {/* Color accent bar */}
        <div
          className="absolute top-0 left-4 right-4 h-[2px] rounded-full"
          style={{ background: colors.stroke }}
        />

        <div className="flex items-start justify-between gap-3 mt-0.5">
          <div>
            <div className="font-bold text-foreground">{zone.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{zone.code}</div>
          </div>
          {zone.type && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: colors.fill,
                color: colors.text,
                border: `1px solid ${colors.stroke}40`,
              }}
            >
              {label}
            </span>
          )}
        </div>

        <div className="mt-2.5 space-y-1.5 text-xs">
          {/* Fill bar */}
          <div>
            <div className="flex justify-between mb-0.5">
              <span className="text-muted-foreground">{t('Capacity')}</span>
              <span className="font-semibold tabular-nums">{fillPercent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${fillPercent}%`,
                  background: `linear-gradient(90deg, ${colors.stroke}80, ${colors.stroke})`,
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Units')}</span>
              <span className="font-semibold tabular-nums">{totalUnits.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('Batches')}</span>
              <span className="font-semibold tabular-nums">{totalBatches}</span>
            </div>
            {reserved > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Reserved')}</span>
                <span className="font-semibold tabular-nums text-amber-600">
                  {reserved.toLocaleString()}
                </span>
              </div>
            )}
            {zone.areaM2 != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Area (m\u00B2)')}</span>
                <span className="font-semibold tabular-nums">{zone.areaM2}</span>
              </div>
            )}
            {zone.binLocations && zone.binLocations.length > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Bins')}</span>
                <span className="font-semibold tabular-nums">{zone.binLocations.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
