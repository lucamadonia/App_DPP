import { useRef, useCallback, useState } from 'react';
import type { WarehouseZone, ZoneMapPosition, WhStockLevel, WarehouseZoneType } from '@/types/warehouse';
import {
  GRID_CELL,
  ZONE_FILL_COLORS,
  type FloorMapViewMode,
} from './floor-map-constants';
import { FloorMapZone } from './FloorMapZone';
import { FloorMapZoneTooltip } from './FloorMapZoneTooltip';
import { FloorMapMinimap } from './FloorMapMinimap';
import type { FloorMapInteraction } from './useFloorMapInteraction';

interface FloorMapCanvasProps {
  zones: WarehouseZone[];
  stock: WhStockLevel[];
  isEditing: boolean;
  viewMode: FloorMapViewMode;
  canvasHeight: string;
  highlightedType: WarehouseZoneType | null;
  searchQuery: string;
  onZoneDoubleClick?: (zoneIdx: number) => void;
  onZoneClick?: (zoneIdx: number) => void;
  interaction: FloorMapInteraction;
}

export function FloorMapCanvas({
  zones,
  stock,
  isEditing,
  viewMode,
  canvasHeight,
  highlightedType,
  searchQuery,
  onZoneDoubleClick,
  onZoneClick,
  interaction,
}: FloorMapCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [tooltipZone, setTooltipZone] = useState<WarehouseZone | null>(null);

  const {
    viewport,
    selectedZoneIdx,
    setSelectedZoneIdx,
    hoveredZoneIdx,
    setHoveredZoneIdx,
    handleZoneDragStart,
    handleResizeStart,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleWheel,
    pendingMove,
    isDragging,
    panTo,
  } = interaction;

  const getEffectivePos = useCallback(
    (zone: WarehouseZone, idx: number): ZoneMapPosition => {
      if (pendingMove && pendingMove.zoneIdx === idx) return pendingMove.pos;
      return zone.mapPosition ?? { x: 0, y: 0, width: 4, height: 3 };
    },
    [pendingMove],
  );

  const handleZonePointerEnter = useCallback(
    (_e: React.PointerEvent, zone: WarehouseZone, idx: number) => {
      if (isDragging) return;
      setHoveredZoneIdx(idx);
      setTooltipZone(zone);
    },
    [isDragging, setHoveredZoneIdx],
  );

  const handleZonePointerLeave = useCallback(() => {
    setHoveredZoneIdx(-1);
    setTooltipZone(null);
  }, [setHoveredZoneIdx]);

  // Check if zone is dimmed by legend filter or search
  const isZoneDimmed = useCallback(
    (zone: WarehouseZone): boolean => {
      if (highlightedType && zone.type !== highlightedType) return true;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          !zone.name.toLowerCase().includes(q) &&
          !zone.code.toLowerCase().includes(q)
        );
      }
      return false;
    },
    [highlightedType, searchQuery],
  );

  const handleMinimapPanTo = useCallback(
    (x: number, y: number) => {
      panTo(x, y);
    },
    [panTo],
  );

  // Collect unique zone types for gradient definitions
  const zoneTypes = new Set(zones.map((z) => z.type ?? 'other'));

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl border shadow-sm"
      style={{
        minHeight: 320,
        height: canvasHeight,
        touchAction: 'none',
        background: viewMode === 'heatmap'
          ? 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)'
          : 'linear-gradient(145deg, #FAFBFC 0%, #F1F5F9 40%, #E8ECF1 100%)',
        transition: 'background 0.5s ease, height 0.3s ease',
      }}
      tabIndex={0}
    >
      <svg
        ref={svgRef}
        className="w-full h-full outline-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onWheel={handleWheel}
      >
        <defs>
          {/* Gradient fills for each zone type */}
          {Array.from(zoneTypes).map((type) => {
            const colors = ZONE_FILL_COLORS[type];
            return (
              <linearGradient
                key={type}
                id={`zone-grad-${type}`}
                x1="0"
                y1="0"
                x2="0.3"
                y2="1"
              >
                <stop offset="0%" stopColor={colors.fill} />
                <stop offset="100%" stopColor={colors.fillEnd} />
              </linearGradient>
            );
          })}

          {/* Dot grid */}
          <pattern
            id="floor-grid-dots"
            width={GRID_CELL}
            height={GRID_CELL}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={GRID_CELL / 2}
              cy={GRID_CELL / 2}
              r={0.6}
              fill={viewMode === 'heatmap' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}
            />
          </pattern>

          {/* Edit-mode line grid */}
          <pattern
            id="floor-grid-lines"
            width={GRID_CELL}
            height={GRID_CELL}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${GRID_CELL} 0 L 0 0 0 ${GRID_CELL}`}
              fill="none"
              stroke={viewMode === 'heatmap' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}
              strokeWidth={0.4}
            />
          </pattern>
        </defs>

        {/* World group */}
        <g
          transform={`translate(${viewport.x}, ${viewport.y}) scale(${viewport.zoom})`}
          style={{ transition: isDragging ? 'none' : 'transform 0.15s ease-out' }}
        >
          {/* Background grid */}
          <rect x={-3000} y={-3000} width={6000} height={6000} fill="url(#floor-grid-dots)" />
          {isEditing && (
            <rect x={-3000} y={-3000} width={6000} height={6000} fill="url(#floor-grid-lines)" />
          )}

          {/* Zone rendering — sort by Y for proper overlap in 3D mode */}
          {zones
            .map((zone, idx) => ({ zone, idx, pos: getEffectivePos(zone, idx) }))
            .sort((a, b) => {
              if (viewMode === '3d') return a.pos.y - b.pos.y;
              return 0;
            })
            .map(({ zone, idx, pos }) => (
              <FloorMapZone
                key={zone.code}
                zone={zone}
                zoneIdx={idx}
                pos={pos}
                stock={stock}
                allZones={zones}
                isSelected={selectedZoneIdx === idx}
                isHovered={hoveredZoneIdx === idx}
                isEditing={isEditing}
                viewMode={viewMode}
                gradientId={`zone-grad-${zone.type ?? 'other'}`}
                dimmed={isZoneDimmed(zone)}
                onPointerDown={(e) => {
                  if (isEditing) {
                    handleZoneDragStart(e, idx, pos);
                  } else {
                    setSelectedZoneIdx(selectedZoneIdx === idx ? -1 : idx);
                    onZoneClick?.(idx);
                  }
                }}
                onPointerEnter={(e) => handleZonePointerEnter(e, zone, idx)}
                onPointerLeave={handleZonePointerLeave}
                onDoubleClick={isEditing ? () => onZoneDoubleClick?.(idx) : undefined}
                onResizeStart={(e, handle) => handleResizeStart(e, idx, pos, handle)}
              />
            ))}
        </g>
      </svg>

      {/* Tooltip — anchored to zone */}
      {tooltipZone && !isDragging && (
        <FloorMapZoneTooltip
          zone={tooltipZone}
          stock={stock}
          allZones={zones}
          viewport={viewport}
          containerRect={containerRef.current?.getBoundingClientRect() ?? null}
        />
      )}

      {/* Minimap */}
      <FloorMapMinimap
        zones={zones}
        stock={stock}
        viewport={viewport}
        containerWidth={containerRef.current?.clientWidth ?? 800}
        containerHeight={containerRef.current?.clientHeight ?? 500}
        viewMode={viewMode}
        onPanTo={handleMinimapPanTo}
      />

      {/* View mode label (subtle) */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5">
        <div
          className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{
            background: viewMode === 'heatmap' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)',
            color: viewMode === 'heatmap' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.25)',
            backdropFilter: 'blur(4px)',
          }}
        >
          {viewMode === '3d' ? '3D View' : viewMode === 'heatmap' ? 'Stock Density' : 'Floor Plan'}
        </div>
      </div>
    </div>
  );
}
