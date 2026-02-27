import { GRID_CELL } from './floor-map-constants';
import type { ZoneMapPosition } from '@/types/warehouse';

interface FloorMapBinDotsProps {
  pos: ZoneMapPosition;
  bins: string[];
  strokeColor: string;
}

export function FloorMapBinDots({ pos, bins, strokeColor }: FloorMapBinDotsProps) {
  if (bins.length === 0) return null;

  const w = pos.width * GRID_CELL;
  const h = pos.height * GRID_CELL;

  // Only show dots if zone is big enough
  if (h < GRID_CELL * 3) return null;

  const dotSize = 3.5;
  const padding = 8;
  const gap = 2.5;
  const maxCols = Math.floor((w - padding * 2) / (dotSize + gap));
  const maxDots = Math.min(bins.length, maxCols * 2);

  return (
    <g opacity={0.35}>
      {bins.slice(0, maxDots).map((_, i) => {
        const col = i % maxCols;
        const row = Math.floor(i / maxCols);
        const dx = padding + col * (dotSize + gap);
        const dy = h - padding - (dotSize + gap) * (row + 1) + gap;
        return (
          <rect
            key={i}
            x={dx}
            y={dy}
            width={dotSize}
            height={dotSize}
            rx={1}
            fill={strokeColor}
          />
        );
      })}
    </g>
  );
}
