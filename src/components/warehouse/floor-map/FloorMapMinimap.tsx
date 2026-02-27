import type { WarehouseZone, WhStockLevel } from '@/types/warehouse';
import {
  GRID_CELL,
  ZONE_FILL_COLORS,
  MINIMAP_WIDTH,
  MINIMAP_HEIGHT,
  type FloorMapViewMode,
} from './floor-map-constants';
import { getZoneFillRatio, getHeatmapColor } from './floor-map-utils';
import type { FloorMapViewport } from './useFloorMapInteraction';

interface FloorMapMinimapProps {
  zones: WarehouseZone[];
  stock: WhStockLevel[];
  viewport: FloorMapViewport;
  containerWidth: number;
  containerHeight: number;
  viewMode: FloorMapViewMode;
}

export function FloorMapMinimap({
  zones,
  stock,
  viewport,
  containerWidth,
  containerHeight,
  viewMode,
}: FloorMapMinimapProps) {
  if (zones.length === 0) return null;

  let maxX = 0;
  let maxY = 0;
  for (const z of zones) {
    if (!z.mapPosition) continue;
    maxX = Math.max(maxX, (z.mapPosition.x + z.mapPosition.width) * GRID_CELL);
    maxY = Math.max(maxY, (z.mapPosition.y + z.mapPosition.height) * GRID_CELL);
  }

  if (maxX === 0) return null;

  const pad = GRID_CELL * 2;
  const worldW = maxX + pad;
  const worldH = maxY + pad;
  const scale = Math.min(MINIMAP_WIDTH / worldW, MINIMAP_HEIGHT / worldH);

  const vpX = (-viewport.x / viewport.zoom) * scale;
  const vpY = (-viewport.y / viewport.zoom) * scale;
  const vpW = (containerWidth / viewport.zoom) * scale;
  const vpH = (containerHeight / viewport.zoom) * scale;

  return (
    <div
      className="absolute bottom-3 right-3 rounded-lg border shadow-md overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT}>
        <rect width="100%" height="100%" fill="transparent" />
        {zones.map((z) => {
          if (!z.mapPosition) return null;
          const colors = ZONE_FILL_COLORS[z.type ?? 'other'];
          const ratio =
            viewMode === 'heatmap'
              ? getZoneFillRatio(stock, zones, z.name)
              : 0;
          const fill =
            viewMode === 'heatmap' ? getHeatmapColor(ratio) : colors.fill;
          return (
            <rect
              key={z.code}
              x={z.mapPosition.x * GRID_CELL * scale}
              y={z.mapPosition.y * GRID_CELL * scale}
              width={z.mapPosition.width * GRID_CELL * scale}
              height={z.mapPosition.height * GRID_CELL * scale}
              fill={fill}
              stroke={viewMode === 'heatmap' ? 'rgba(0,0,0,0.1)' : colors.stroke}
              strokeWidth={0.6}
              rx={1.5}
            />
          );
        })}
        {/* Viewport rect */}
        <rect
          x={vpX}
          y={vpY}
          width={vpW}
          height={vpH}
          fill="rgba(59,130,246,0.06)"
          stroke="#3B82F6"
          strokeWidth={1.2}
          rx={2}
        />
      </svg>
    </div>
  );
}
