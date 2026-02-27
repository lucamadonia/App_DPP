import { useTranslation } from 'react-i18next';
import { ZONE_FILL_COLORS, HEATMAP_COLORS, type FloorMapViewMode } from './floor-map-constants';
import { ZONE_TYPE_CONFIG } from '@/lib/warehouse-constants';
import type { WarehouseZoneType } from '@/types/warehouse';

interface FloorMapLegendProps {
  visibleTypes: WarehouseZoneType[];
  viewMode: FloorMapViewMode;
}

export function FloorMapLegend({ visibleTypes, viewMode }: FloorMapLegendProps) {
  const { t, i18n } = useTranslation('warehouse');

  if (viewMode === 'heatmap') {
    return (
      <div className="flex items-center gap-2 px-1">
        <span className="text-xs text-muted-foreground shrink-0">{t('Low')}</span>
        <div
          className="h-2.5 flex-1 max-w-[200px] rounded-full"
          style={{
            background: `linear-gradient(90deg, ${HEATMAP_COLORS.join(', ')})`,
          }}
        />
        <span className="text-xs text-muted-foreground shrink-0">{t('High')}</span>
      </div>
    );
  }

  if (visibleTypes.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-1">
      {visibleTypes.map((type) => {
        const colors = ZONE_FILL_COLORS[type];
        const cfg = ZONE_TYPE_CONFIG[type];
        const label = i18n.language.startsWith('de') ? cfg.labelDe : cfg.labelEn;
        return (
          <div key={type} className="flex items-center gap-1.5 shrink-0">
            <div
              className="w-3.5 h-3.5 rounded border shadow-sm"
              style={{
                background: `linear-gradient(135deg, ${colors.fill}, ${colors.fillEnd})`,
                borderColor: colors.stroke,
              }}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
