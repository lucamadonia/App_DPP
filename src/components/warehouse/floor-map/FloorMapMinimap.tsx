import { useCallback, useRef } from 'react';
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
  onPanTo: (x: number, y: number) => void;
}

export function FloorMapMinimap({
  zones,
  stock,
  viewport,
  containerWidth,
  containerHeight,
  viewMode,
  onPanTo,
}: FloorMapMinimapProps) {
  const draggingRef = useRef(false);

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

  const handleMinimapClick = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Convert minimap coords to world coords, then to viewport offset
      const worldX = mx / scale;
      const worldY = my / scale;
      onPanTo(
        -(worldX * viewport.zoom) + containerWidth / 2,
        -(worldY * viewport.zoom) + containerHeight / 2,
      );
    },
    [scale, viewport.zoom, containerWidth, containerHeight, onPanTo],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      draggingRef.current = true;
      (e.target as Element).setPointerCapture?.(e.pointerId);
      handleMinimapClick(e);
    },
    [handleMinimapClick],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!draggingRef.current) return;
      handleMinimapClick(e);
    },
    [handleMinimapClick],
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  return (
    <div
      className="absolute bottom-3 right-3 rounded-lg border shadow-md overflow-hidden cursor-crosshair"
      style={{
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <svg
        width={MINIMAP_WIDTH}
        height={MINIMAP_HEIGHT}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
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
        {/* Semi-transparent overlay outside viewport */}
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.15)"
          style={{ pointerEvents: 'none' }}
        />
        {/* Viewport rect (clear hole) */}
        <rect
          x={vpX}
          y={vpY}
          width={vpW}
          height={vpH}
          fill="rgba(255,255,255,0.3)"
          stroke="#3B82F6"
          strokeWidth={1.5}
          rx={2}
          style={{ pointerEvents: 'none' }}
        />
      </svg>
    </div>
  );
}
