import { FURNITURE_FILL_STROKES } from './floor-map-constants';
import { getFillLevel } from './floor-map-utils';

interface FloorMapStockBadgeProps {
  /** Total units in this furniture piece */
  totalUnits: number;
  /** Fill ratio 0-1 */
  fillRatio: number;
  /** X position (top-right anchor) */
  x: number;
  /** Y position */
  y: number;
}

/**
 * Compact SVG badge showing stock count on a furniture piece.
 * Color-coded by fill level.
 */
export function FloorMapStockBadge({ totalUnits, fillRatio, x, y }: FloorMapStockBadgeProps) {
  if (totalUnits <= 0) return null;

  const level = getFillLevel(fillRatio);
  const bgColor = FURNITURE_FILL_STROKES[level];

  const label =
    totalUnits > 99999
      ? `${(totalUnits / 1000).toFixed(0)}k`
      : totalUnits > 9999
        ? `${(totalUnits / 1000).toFixed(1)}k`
        : totalUnits.toLocaleString();

  const textWidth = label.length * 5.5 + 8;
  const badgeW = Math.max(24, textWidth);

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={-badgeW}
        y={-6}
        width={badgeW}
        height={14}
        rx={7}
        fill={bgColor}
        opacity={0.92}
      />
      <text
        x={-badgeW / 2}
        y={4}
        textAnchor="middle"
        fill="white"
        fontSize={7.5}
        fontWeight={700}
        fontFamily="system-ui"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {label}
      </text>
    </g>
  );
}
