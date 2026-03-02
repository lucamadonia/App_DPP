import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';
import type { WarehouseZone, WhStockLevel, ZoneFurniture } from '@/types/warehouse';
import { GRID_CELL, type FloorMapViewMode } from './floor-map-constants';
import { FloorMapFurniture } from './FloorMapFurniture';

interface FloorMapInteriorProps {
  zone: WarehouseZone;
  stock: WhStockLevel[];
  isEditing: boolean;
  viewMode: FloorMapViewMode;
  zoom: number;
  showEmpty: boolean;
  searchHighlightIds: Set<string>;
  selectedFurnitureId: string | null;
  hoveredFurnitureId: string | null;
  pendingFurnitureMove?: { furnitureId: string; position: { x: number; y: number } } | null;
  isDragging?: boolean;
  onFurnitureSelect: (id: string | null) => void;
  onFurnitureHover: (id: string | null) => void;
  onFurniturePointerDown: (e: React.PointerEvent, furniture: ZoneFurniture) => void;
  onFurnitureDoubleClick?: (furniture: ZoneFurniture) => void;
  onFurnitureContextMenu?: (e: React.MouseEvent, furniture: ZoneFurniture) => void;
}

/**
 * Zone Interior View — renders furniture pieces inside a zone.
 * Displayed as SVG content within the zone's bounding box.
 */
export function FloorMapInterior({
  zone,
  stock,
  isEditing,
  viewMode,
  zoom,
  showEmpty,
  searchHighlightIds,
  selectedFurnitureId,
  hoveredFurnitureId,
  pendingFurnitureMove,
  isDragging: parentIsDragging,
  onFurnitureSelect,
  onFurnitureHover,
  onFurniturePointerDown,
  onFurnitureDoubleClick,
  onFurnitureContextMenu,
}: FloorMapInteriorProps) {
  const { t } = useTranslation('warehouse');
  const pos = zone.mapPosition;
  if (!pos) return null;

  const furniture = zone.furniture ?? [];

  const zoneX = pos.x * GRID_CELL;
  const zoneY = pos.y * GRID_CELL;
  const zoneW = pos.width * GRID_CELL;
  const zoneH = pos.height * GRID_CELL;

  // Filter stock to this zone
  const zoneStock = useMemo(
    () => stock.filter((s) => s.zone === zone.name),
    [stock, zone.name],
  );

  // Sort furniture by Y position for 3D overlap
  const sortedFurniture = useMemo(() => {
    const items = furniture.map((f) => ({ ...f }));
    if (viewMode === '3d') {
      items.sort((a, b) => a.position.y - b.position.y);
    }
    return items;
  }, [furniture, viewMode]);

  const handleFurniturePointerEnter = useCallback(
    (_e: React.PointerEvent, f: ZoneFurniture) => {
      onFurnitureHover(f.id);
    },
    [onFurnitureHover],
  );

  const handleFurniturePointerLeave = useCallback(() => {
    onFurnitureHover(null);
  }, [onFurnitureHover]);

  return (
    <g transform={`translate(${zoneX}, ${zoneY})`}>
      {/* Zone interior background */}
      <rect
        width={zoneW}
        height={zoneH}
        rx={4}
        fill={viewMode === 'heatmap' ? 'rgba(15,23,42,0.3)' : 'rgba(255,255,255,0.4)'}
        stroke={viewMode === 'heatmap' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}
        strokeWidth={1}
        style={{ pointerEvents: 'none' }}
      />

      {/* Interior grid (finer) */}
      {isEditing && (
        <g opacity={0.3}>
          {Array.from({ length: pos.width }).map((_, i) => (
            <line
              key={`v${i}`}
              x1={i * GRID_CELL}
              y1={0}
              x2={i * GRID_CELL}
              y2={zoneH}
              stroke={viewMode === 'heatmap' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
              strokeWidth={0.3}
            />
          ))}
          {Array.from({ length: pos.height }).map((_, i) => (
            <line
              key={`h${i}`}
              x1={0}
              y1={i * GRID_CELL}
              x2={zoneW}
              y2={i * GRID_CELL}
              stroke={viewMode === 'heatmap' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}
              strokeWidth={0.3}
            />
          ))}
        </g>
      )}

      {/* Empty state */}
      {furniture.length === 0 && (
        <foreignObject x={0} y={0} width={zoneW} height={zoneH}>
          <div
            className="flex flex-col items-center justify-center h-full text-center"
            style={{ pointerEvents: 'none' }}
          >
            <Package
              className="mb-1"
              style={{
                width: Math.min(24, zoneW * 0.15),
                height: Math.min(24, zoneW * 0.15),
                color: viewMode === 'heatmap' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.12)',
              }}
            />
            <span
              style={{
                fontSize: Math.min(10, zoneW * 0.04),
                color: viewMode === 'heatmap' ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
                fontWeight: 500,
              }}
            >
              {isEditing ? t('Drag items from the palette') : t('No furniture placed yet')}
            </span>
          </div>
        </foreignObject>
      )}

      {/* Furniture pieces */}
      {sortedFurniture.map((f) => {
        // Override position for furniture being dragged
        const isBeingDragged = pendingFurnitureMove?.furnitureId === f.id;
        const effectivePosition = isBeingDragged
          ? pendingFurnitureMove!.position
          : f.position;
        const effectiveFurniture = isBeingDragged
          ? { ...f, position: effectivePosition }
          : f;

        return (
          <FloorMapFurniture
            key={f.id}
            furniture={effectiveFurniture}
            stock={zoneStock}
            isSelected={selectedFurnitureId === f.id}
            isHovered={hoveredFurnitureId === f.id}
            isEditing={isEditing}
            isDragging={isBeingDragged && !!parentIsDragging}
            viewMode={viewMode}
            dimmed={searchHighlightIds.size > 0 && !searchHighlightIds.has(f.id)}
            highlighted={searchHighlightIds.has(f.id)}
            showEmpty={showEmpty}
            zoom={zoom}
            onPointerDown={(e) => {
              if (isEditing) {
                onFurniturePointerDown(e, f);
              } else {
                onFurnitureSelect(selectedFurnitureId === f.id ? null : f.id);
              }
            }}
            onPointerEnter={(e) => handleFurniturePointerEnter(e, f)}
            onPointerLeave={handleFurniturePointerLeave}
            onDoubleClick={() => onFurnitureDoubleClick?.(f)}
            onContextMenu={(e) => onFurnitureContextMenu?.(e, f)}
          />
        );
      })}
    </g>
  );
}
