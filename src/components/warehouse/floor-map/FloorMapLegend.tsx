import { useTranslation } from 'react-i18next';
import { ZONE_FILL_COLORS, HEATMAP_COLORS, type FloorMapViewMode } from './floor-map-constants';
import { ZONE_TYPE_CONFIG } from '@/lib/warehouse-constants';
import type { WarehouseZoneType } from '@/types/warehouse';

interface FloorMapLegendProps {
  visibleTypes: WarehouseZoneType[];
  viewMode: FloorMapViewMode;
  highlightedType: WarehouseZoneType | null;
  onToggleHighlight: (type: WarehouseZoneType) => void;
}

export function FloorMapLegend({
  visibleTypes,
  viewMode,
  highlightedType,
  onToggleHighlight,
}: FloorMapLegendProps) {
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
        const isActive = highlightedType === type;
        return (
          <button
            key={type}
            className="flex items-center gap-1.5 shrink-0 rounded-md px-1.5 py-0.5 transition-all hover:bg-muted/50"
            style={{
              outline: isActive ? `2px solid ${colors.stroke}` : 'none',
              outlineOffset: '1px',
              opacity: highlightedType && !isActive ? 0.4 : 1,
            }}
            onClick={() => onToggleHighlight(type)}
          >
            <div
              className="w-3.5 h-3.5 rounded border shadow-sm transition-transform"
              style={{
                background: `linear-gradient(135deg, ${colors.fill}, ${colors.fillEnd})`,
                borderColor: colors.stroke,
                transform: isActive ? 'scale(1.15)' : 'scale(1)',
              }}
            />
            <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
