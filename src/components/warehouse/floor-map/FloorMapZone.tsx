import { useMemo } from 'react';
import type { WarehouseZone, ZoneMapPosition, WhStockLevel } from '@/types/warehouse';
import {
  GRID_CELL,
  ZONE_FILL_COLORS,
  ISO_DX,
  ISO_DY,
  CRITICAL_FILL_THRESHOLD,
  type FloorMapViewMode,
} from './floor-map-constants';
import { FloorMapZoneHandles } from './FloorMapZoneHandles';
import { FloorMapBinDots } from './FloorMapBinDots';
import {
  getStockByZone,
  getZoneFillRatio,
  getExtrusionDepth,
  getHeatmapColor,
} from './floor-map-utils';
import type { HandleDirection } from './useFloorMapInteraction';

interface FloorMapZoneProps {
  zone: WarehouseZone;
  zoneIdx: number;
  pos: ZoneMapPosition;
  stock: WhStockLevel[];
  allZones: WarehouseZone[];
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  viewMode: FloorMapViewMode;
  gradientId: string;
  dimmed: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerEnter: (e: React.PointerEvent) => void;
  onPointerLeave: () => void;
  onDoubleClick?: () => void;
  onResizeStart: (e: React.PointerEvent, handle: HandleDirection) => void;
}

export function FloorMapZone({
  zone,
  pos,
  stock,
  allZones,
  isSelected,
  isHovered,
  isEditing,
  viewMode,
  gradientId,
  dimmed,
  onPointerDown,
  onPointerEnter,
  onPointerLeave,
  onDoubleClick,
  onResizeStart,
}: FloorMapZoneProps) {
  const colors = ZONE_FILL_COLORS[zone.type ?? 'other'];
  const w = pos.width * GRID_CELL;
  const h = pos.height * GRID_CELL;
  const x = pos.x * GRID_CELL;
  const y = pos.y * GRID_CELL;

  const { totalUnits, reserved } = useMemo(
    () => getStockByZone(stock, zone.name),
    [stock, zone.name],
  );

  const fillRatio = useMemo(
    () => getZoneFillRatio(stock, allZones, zone.name),
    [stock, allZones, zone.name],
  );

  const extrusion = viewMode === '3d' ? getExtrusionDepth(fillRatio) : 0;
  const heatColor = viewMode === 'heatmap' ? getHeatmapColor(fillRatio) : null;

  // Enhanced lift effect on hover/select
  const liftY = (isHovered || isSelected) && !isEditing ? -4 : 0;
  const shadowBlur = isHovered ? 12 : isSelected ? 10 : 4;

  const isCritical = fillRatio > CRITICAL_FILL_THRESHOLD && totalUnits > 0;
  const isEmpty = totalUnits === 0;

  // Capacity bar inside zone (mini progress)
  const barWidth = Math.max(0, w - 12);
  const barFill = fillRatio * barWidth;

  // Capacity bar gradient color
  const barColor = isCritical ? '#EF4444' : fillRatio > 0.7 ? '#F59E0B' : '#22C55E';

  return (
    <g
      transform={`translate(${x}, ${y + liftY})`}
      style={{
        cursor: isEditing ? 'move' : 'pointer',
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        opacity: dimmed ? 0.2 : isEmpty && viewMode !== 'heatmap' ? 0.5 : 1,
      }}
      onPointerDown={onPointerDown}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onDoubleClick={onDoubleClick}
    >
      {/* Drop shadow — enhanced */}
      <rect
        x={3}
        y={3 + extrusion}
        width={w}
        height={h}
        rx={5}
        fill="black"
        opacity={isHovered ? 0.18 : 0.08}
        style={{
          filter: `blur(${shadowBlur}px)`,
          transition: 'opacity 0.3s, filter 0.3s',
        }}
      />

      {/* === 3D Extrusion faces === */}
      {extrusion > 0 && (
        <>
          {/* Right face with gradient */}
          <defs>
            <linearGradient id={`side-grad-${zone.code}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colors.side} stopOpacity={0.9} />
              <stop offset="100%" stopColor={colors.side} stopOpacity={0.6} />
            </linearGradient>
            <linearGradient id={`front-grad-${zone.code}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.front} stopOpacity={0.8} />
              <stop offset="100%" stopColor={colors.front} stopOpacity={0.5} />
            </linearGradient>
          </defs>
          {/* Right face */}
          <path
            d={`M ${w} ${h} L ${w + extrusion * ISO_DX} ${h - extrusion * ISO_DY} L ${w + extrusion * ISO_DX} ${-extrusion * ISO_DY} L ${w} 0 Z`}
            fill={`url(#side-grad-${zone.code})`}
            style={{ transition: 'all 0.3s ease' }}
          />
          {/* Bottom face */}
          <path
            d={`M 0 ${h} L ${extrusion * ISO_DX} ${h - extrusion * ISO_DY} L ${w + extrusion * ISO_DX} ${h - extrusion * ISO_DY} L ${w} ${h} Z`}
            fill={`url(#front-grad-${zone.code})`}
            style={{ transition: 'all 0.3s ease' }}
          />
        </>
      )}

      {/* Critical glow (>90% fill, pulsating red) */}
      {isCritical && viewMode !== 'heatmap' && (
        <rect
          x={-5}
          y={-5}
          width={w + 10}
          height={h + 10}
          rx={9}
          fill="none"
          stroke="#EF4444"
          strokeWidth={2.5}
          opacity={0.4}
        >
          <animate
            attributeName="opacity"
            values="0.2;0.6;0.2"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-width"
            values="2;3.5;2"
            dur="2s"
            repeatCount="indefinite"
          />
        </rect>
      )}

      {/* Ambient glow for high-stock zones */}
      {fillRatio > 0.5 && !isCritical && viewMode !== 'heatmap' && (
        <rect
          x={-4}
          y={-4}
          width={w + 8}
          height={h + 8}
          rx={8}
          fill="none"
          stroke={colors.glow}
          strokeWidth={2}
          opacity={0.3 + fillRatio * 0.4}
          style={{ transition: 'opacity 0.4s' }}
        />
      )}

      {/* Main top face */}
      <rect
        width={w}
        height={h}
        rx={5}
        fill={isEmpty && viewMode !== 'heatmap' ? '#F3F4F6' : (heatColor ?? `url(#${gradientId})`)}
        stroke={isSelected ? '#3B82F6' : heatColor ? 'rgba(0,0,0,0.15)' : colors.stroke}
        strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.2}
        opacity={viewMode === 'heatmap' ? 0.85 : 0.95}
        style={{ transition: 'all 0.3s ease' }}
      />

      {/* Inner highlight (glass edge effect) */}
      <rect
        x={1}
        y={1}
        width={w - 2}
        height={Math.min(h * 0.35, 20)}
        rx={4}
        fill="white"
        opacity={viewMode === 'heatmap' ? 0.08 : 0.22}
        style={{ pointerEvents: 'none' }}
      />

      {/* Selection ring with glow */}
      {isSelected && (
        <>
          <rect
            x={-3}
            y={-3}
            width={w + 6}
            height={h + 6}
            rx={8}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={1}
            opacity={0.2}
            style={{ filter: 'blur(3px)' }}
          />
          <rect
            x={-2}
            y={-2}
            width={w + 4}
            height={h + 4}
            rx={7}
            fill="none"
            stroke="#3B82F6"
            strokeWidth={1.5}
            strokeDasharray="6 3"
            opacity={0.7}
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="18"
              dur="1s"
              repeatCount="indefinite"
            />
          </rect>
        </>
      )}

      {/* Zone label */}
      <foreignObject x={6} y={4} width={w - 12} height={h * 0.5}>
        <div
          style={{
            color: isEmpty ? '#9CA3AF' : (heatColor ? '#1E293B' : colors.text),
            fontSize: Math.min(12, Math.max(9, w / 8)),
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
          {zone.name}
        </div>
        <div
          style={{
            color: isEmpty ? '#D1D5DB' : (heatColor ? '#475569' : colors.text),
            fontSize: Math.min(8, Math.max(7, w / 12)),
            opacity: 0.6,
            fontFamily: 'monospace',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {zone.code}
        </div>
      </foreignObject>

      {/* Stock badge (top-right pill) */}
      {totalUnits > 0 && (
        <g transform={`translate(${w - 4}, 6)`}>
          <rect
            x={-30}
            y={-6}
            width={34}
            height={15}
            rx={7.5}
            fill={heatColor ?? colors.stroke}
            opacity={0.92}
          />
          <text
            x={-13}
            y={5}
            textAnchor="middle"
            fill="white"
            fontSize={8}
            fontWeight={700}
            fontFamily="system-ui"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {totalUnits > 99999
              ? `${(totalUnits / 1000).toFixed(0)}k`
              : totalUnits > 9999
                ? `${(totalUnits / 1000).toFixed(1)}k`
                : totalUnits.toLocaleString()}
          </text>
        </g>
      )}

      {/* Capacity bar (bottom of zone) with gradient */}
      {h > GRID_CELL * 2.5 && (
        <g transform={`translate(6, ${h - 10})`}>
          <rect
            width={barWidth}
            height={4}
            rx={2}
            fill={heatColor ? 'rgba(0,0,0,0.1)' : colors.stroke}
            opacity={0.15}
          />
          <rect
            width={barFill}
            height={4}
            rx={2}
            fill={heatColor ?? barColor}
            opacity={0.7}
            style={{ transition: 'width 0.6s ease, fill 0.3s ease' }}
          >
            {isCritical && (
              <animate
                attributeName="opacity"
                values="0.5;0.9;0.5"
                dur="1.5s"
                repeatCount="indefinite"
              />
            )}
          </rect>
        </g>
      )}

      {/* Reserved indicator dot */}
      {reserved > 0 && (
        <circle
          cx={w - 10}
          cy={h - 10}
          r={3}
          fill="#F59E0B"
          stroke="white"
          strokeWidth={1}
        >
          <animate
            attributeName="r"
            values="3;3.8;3"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Bin dots */}
      <FloorMapBinDots
        pos={pos}
        bins={zone.binLocations ?? []}
        strokeColor={heatColor ?? colors.stroke}
        stock={stock}
        zoneName={zone.name}
      />

      {/* Resize handles (edit mode + selected) */}
      {isEditing && isSelected && (
        <FloorMapZoneHandles pos={pos} onResizeStart={onResizeStart} />
      )}
    </g>
  );
}
