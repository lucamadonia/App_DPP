import { useMemo } from 'react';
import type { ZoneFurniture, WhStockLevel } from '@/types/warehouse';
import { GRID_CELL, FURNITURE_EXTRUSION, ISO_DX, ISO_DY, FURNITURE_FILL_COLORS, type FloorMapViewMode } from './floor-map-constants';
import { getStockByFurniture, getFurnitureFillRatio, getHeatmapColor, getFillLevel } from './floor-map-utils';
import { getFurnitureCatalogEntry } from './furniture-catalog';
import { FloorMapStockBadge } from './FloorMapStockBadge';

interface FloorMapFurnitureProps {
  furniture: ZoneFurniture;
  stock: WhStockLevel[];
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  isDragging?: boolean;
  viewMode: FloorMapViewMode;
  dimmed: boolean;
  highlighted: boolean;
  showEmpty: boolean;
  zoom?: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerLeave: () => void;
  onDoubleClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export function FloorMapFurniture({
  furniture,
  stock,
  isSelected,
  isHovered,
  isEditing,
  isDragging,
  viewMode,
  dimmed,
  highlighted,
  showEmpty,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onDoubleClick,
  onContextMenu,
}: FloorMapFurnitureProps) {
  const catalog = getFurnitureCatalogEntry(furniture.type);

  const w = furniture.size.w * GRID_CELL;
  const h = furniture.size.h * GRID_CELL;
  const x = furniture.position.x * GRID_CELL;
  const y = furniture.position.y * GRID_CELL;

  const { totalUnits } = useMemo(
    () => getStockByFurniture(stock, furniture.id),
    [stock, furniture.id],
  );

  const fillRatio = useMemo(
    () => getFurnitureFillRatio(stock, furniture),
    [stock, furniture],
  );

  const fillLevel = getFillLevel(fillRatio);
  const heatColor = viewMode === 'heatmap' ? getHeatmapColor(fillRatio) : null;
  const isEmpty = totalUnits === 0;
  const isCritical = fillRatio > 0.9 && totalUnits > 0;

  const extrusion = viewMode === '3d' ? FURNITURE_EXTRUSION : 0;
  const liftY = isDragging ? -1 : (isHovered || isSelected) && !isEditing ? -2 : 0;
  const shadowBlur = isDragging ? 8 : isHovered ? 6 : isSelected ? 5 : 2;

  // Resolve fill color
  const fillColor = heatColor
    ?? (isEmpty ? FURNITURE_FILL_COLORS.empty : catalog.color);
  const strokeColor = heatColor
    ? 'rgba(0,0,0,0.2)'
    : (isSelected ? '#3B82F6' : catalog.stroke);
  const strokeWidth = isSelected ? 2 : isHovered ? 1.5 : 0.8;

  // Section line rendering
  const sectionLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const numSections = furniture.sections.length;
    if (numSections <= 1) return lines;

    // Horizontal dividers for vertical stacking (shelves, cabinets, drawers)
    const isVerticalStack = ['shelf', 'heavy_rack', 'cabinet', 'drawer_unit', 'cold_unit'].includes(furniture.type);
    // Vertical dividers for horizontal lanes (flow rack, bin wall)
    const isHorizontalLanes = ['flow_rack'].includes(furniture.type);

    if (isVerticalStack) {
      for (let i = 1; i < numSections; i++) {
        const py = (i / numSections) * h;
        lines.push({ x1: 2, y1: py, x2: w - 2, y2: py });
      }
    } else if (isHorizontalLanes) {
      for (let i = 1; i < numSections; i++) {
        const px = (i / numSections) * w;
        lines.push({ x1: px, y1: 2, x2: px, y2: h - 2 });
      }
    } else if (furniture.type === 'bin_wall') {
      // Grid pattern for bin walls
      const cols = Math.ceil(Math.sqrt(numSections));
      const rows = Math.ceil(numSections / cols);
      for (let i = 1; i < cols; i++) {
        const px = (i / cols) * w;
        lines.push({ x1: px, y1: 2, x2: px, y2: h - 2 });
      }
      for (let i = 1; i < rows; i++) {
        const py = (i / rows) * h;
        lines.push({ x1: 2, y1: py, x2: w - 2, y2: py });
      }
    }

    return lines;
  }, [furniture.type, furniture.sections.length, w, h]);

  // Determine visual opacity
  const opacity = dimmed
    ? 0.15
    : highlighted
      ? 1
      : isEmpty && viewMode !== 'heatmap' && !showEmpty
        ? 0.4
        : 1;

  // Rotation transform
  const rotationTransform = furniture.rotation
    ? `rotate(${furniture.rotation}, ${w / 2}, ${h / 2})`
    : '';

  return (
    <g
      transform={`translate(${x}, ${y + liftY})`}
      style={{
        cursor: isDragging ? 'grabbing' : isEditing ? 'move' : 'pointer',
        transition: isDragging ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
        opacity: isDragging ? 0.75 : opacity,
      }}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      <g transform={rotationTransform}>
        {/* Drop shadow */}
        <rect
          x={2}
          y={2 + extrusion}
          width={w}
          height={h}
          rx={3}
          fill="black"
          opacity={isHovered ? 0.12 : 0.05}
          style={{ filter: `blur(${shadowBlur}px)`, transition: 'opacity 0.25s' }}
        />

        {/* 3D extrusion faces */}
        {extrusion > 0 && (
          <>
            <path
              d={`M ${w} ${h} L ${w + extrusion * ISO_DX} ${h - extrusion * ISO_DY} L ${w + extrusion * ISO_DX} ${-extrusion * ISO_DY} L ${w} 0 Z`}
              fill={catalog.colorDark}
              opacity={0.6}
              style={{ transition: 'all 0.25s ease' }}
            />
            <path
              d={`M 0 ${h} L ${extrusion * ISO_DX} ${h - extrusion * ISO_DY} L ${w + extrusion * ISO_DX} ${h - extrusion * ISO_DY} L ${w} ${h} Z`}
              fill={catalog.colorDark}
              opacity={0.45}
              style={{ transition: 'all 0.25s ease' }}
            />
          </>
        )}

        {/* Critical glow (>90% fill) */}
        {isCritical && viewMode !== 'heatmap' && (
          <rect
            x={-3}
            y={-3}
            width={w + 6}
            height={h + 6}
            rx={5}
            fill="none"
            stroke="#EF4444"
            strokeWidth={1.5}
            opacity={0.4}
          >
            <animate
              attributeName="opacity"
              values="0.2;0.5;0.2"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Highlight glow (search match) */}
        {highlighted && (
          <rect
            x={-4}
            y={-4}
            width={w + 8}
            height={h + 8}
            rx={6}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2}
            opacity={0.6}
          >
            <animate
              attributeName="opacity"
              values="0.3;0.7;0.3"
              dur="1.5s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Show empty glow */}
        {showEmpty && isEmpty && (
          <rect
            x={-3}
            y={-3}
            width={w + 6}
            height={h + 6}
            rx={5}
            fill="none"
            stroke="#22C55E"
            strokeWidth={1.5}
            opacity={0.5}
          >
            <animate
              attributeName="opacity"
              values="0.3;0.6;0.3"
              dur="2s"
              repeatCount="indefinite"
            />
          </rect>
        )}

        {/* Main body */}
        <rect
          width={w}
          height={h}
          rx={3}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{ transition: 'all 0.25s ease' }}
        />

        {/* Inner glass edge */}
        <rect
          x={0.5}
          y={0.5}
          width={w - 1}
          height={Math.min(h * 0.3, 8)}
          rx={2.5}
          fill="white"
          opacity={viewMode === 'heatmap' ? 0.06 : 0.2}
          style={{ pointerEvents: 'none' }}
        />

        {/* Section divider lines */}
        {sectionLines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={heatColor ? 'rgba(0,0,0,0.15)' : catalog.stroke}
            strokeWidth={0.5}
            opacity={0.4}
          />
        ))}

        {/* Special visual markers by furniture type */}
        {furniture.type === 'pallet_spot' && (
          <rect
            x={3}
            y={3}
            width={w - 6}
            height={h - 6}
            rx={2}
            fill="none"
            stroke={catalog.stroke}
            strokeWidth={0.8}
            strokeDasharray="4 2"
            opacity={0.4}
          />
        )}

        {furniture.type === 'staging_area' && (
          <>
            {/* Cross-hatch pattern */}
            {Array.from({ length: Math.floor(w / 8) }).map((_, i) => (
              <line
                key={`h${i}`}
                x1={i * 8}
                y1={0}
                x2={i * 8 + h}
                y2={h}
                stroke={catalog.stroke}
                strokeWidth={0.3}
                opacity={0.15}
              />
            ))}
          </>
        )}

        {furniture.type === 'conveyor' && (
          <>
            {/* Direction arrows */}
            {Array.from({ length: Math.max(1, Math.floor(w / 20)) }).map((_, i) => {
              const ax = 10 + i * 20;
              return (
                <path
                  key={i}
                  d={`M ${ax} ${h / 2 - 3} L ${ax + 5} ${h / 2} L ${ax} ${h / 2 + 3}`}
                  fill="none"
                  stroke={catalog.stroke}
                  strokeWidth={0.8}
                  opacity={0.4}
                />
              );
            })}
          </>
        )}

        {/* Cold unit accent */}
        {furniture.type === 'cold_unit' && (
          <rect
            width={w}
            height={h}
            rx={3}
            fill={catalog.accent}
            opacity={0.08}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* Drag glow */}
        {isDragging && (
          <rect
            x={-3}
            y={-3}
            width={w + 6}
            height={h + 6}
            rx={5}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={2}
            opacity={0.5}
            style={{ filter: 'blur(2px)' }}
          />
        )}

        {/* Selection ring */}
        {isSelected && (
          <>
            <rect
              x={-2}
              y={-2}
              width={w + 4}
              height={h + 4}
              rx={5}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={1.5}
              strokeDasharray="5 2.5"
              opacity={0.7}
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="15"
                dur="0.8s"
                repeatCount="indefinite"
              />
            </rect>
          </>
        )}

        {/* Name label */}
        <foreignObject x={3} y={2} width={w - 6} height={h * 0.45}>
          <div
            style={{
              color: isEmpty ? '#9CA3AF' : (heatColor ? '#1E293B' : catalog.textColor),
              fontSize: Math.min(10, Math.max(7, w / 6)),
              fontWeight: 700,
              lineHeight: 1.15,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              userSelect: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            {furniture.name}
          </div>
        </foreignObject>

        {/* Stock badge */}
        <FloorMapStockBadge
          totalUnits={totalUnits}
          fillRatio={fillRatio}
          x={w - 2}
          y={5}
        />

        {/* Capacity bar (bottom) */}
        {h > 15 && (
          <g transform={`translate(3, ${h - 6})`}>
            <rect
              width={w - 6}
              height={3}
              rx={1.5}
              fill={heatColor ? 'rgba(0,0,0,0.08)' : catalog.stroke}
              opacity={0.15}
            />
            <rect
              width={Math.max(0, (w - 6) * fillRatio)}
              height={3}
              rx={1.5}
              fill={heatColor ?? (fillLevel === 'high' || fillLevel === 'full' ? '#EF4444' : fillLevel === 'medium' ? '#F59E0B' : '#22C55E')}
              opacity={0.7}
              style={{ transition: 'width 0.5s ease' }}
            />
          </g>
        )}
      </g>
    </g>
  );
}
