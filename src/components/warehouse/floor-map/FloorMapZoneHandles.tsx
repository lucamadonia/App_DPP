import { GRID_CELL, HANDLE_SIZE } from './floor-map-constants';
import type { ZoneMapPosition } from '@/types/warehouse';
import type { HandleDirection } from './useFloorMapInteraction';

interface FloorMapZoneHandlesProps {
  pos: ZoneMapPosition;
  onResizeStart: (e: React.PointerEvent, handle: HandleDirection) => void;
}

const CURSORS: Record<HandleDirection, string> = {
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
  nw: 'nwse-resize',
};

export function FloorMapZoneHandles({
  pos,
  onResizeStart,
}: FloorMapZoneHandlesProps) {
  const w = pos.width * GRID_CELL;
  const h = pos.height * GRID_CELL;
  const half = HANDLE_SIZE / 2;

  const handles: { dir: HandleDirection; cx: number; cy: number }[] = [
    { dir: 'nw', cx: 0, cy: 0 },
    { dir: 'n', cx: w / 2, cy: 0 },
    { dir: 'ne', cx: w, cy: 0 },
    { dir: 'e', cx: w, cy: h / 2 },
    { dir: 'se', cx: w, cy: h },
    { dir: 's', cx: w / 2, cy: h },
    { dir: 'sw', cx: 0, cy: h },
    { dir: 'w', cx: 0, cy: h / 2 },
  ];

  return (
    <g>
      {handles.map(({ dir, cx, cy }) => (
        <g key={dir}>
          {/* Glow ring */}
          <circle
            cx={cx}
            cy={cy}
            r={HANDLE_SIZE + 1}
            fill="rgba(59,130,246,0.12)"
          >
            <animate
              attributeName="r"
              values={`${HANDLE_SIZE};${HANDLE_SIZE + 2};${HANDLE_SIZE}`}
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          {/* Handle */}
          <rect
            x={cx - half}
            y={cy - half}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            rx={2}
            fill="white"
            stroke="#3B82F6"
            strokeWidth={1.5}
            style={{ cursor: CURSORS[dir], filter: 'drop-shadow(0 1px 3px rgba(59,130,246,0.25))' }}
            onPointerDown={(e) => onResizeStart(e, dir)}
          />
        </g>
      ))}
    </g>
  );
}
