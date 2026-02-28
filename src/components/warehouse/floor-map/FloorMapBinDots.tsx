import { GRID_CELL, BIN_DOT_COLORS, WARNING_FILL_THRESHOLD, CRITICAL_FILL_THRESHOLD } from './floor-map-constants';
import type { ZoneMapPosition, WhStockLevel } from '@/types/warehouse';

interface FloorMapBinDotsProps {
  pos: ZoneMapPosition;
  bins: string[];
  strokeColor: string;
  stock: WhStockLevel[];
  zoneName: string;
}

function getBinColor(bin: string, stock: WhStockLevel[], zoneName: string): string {
  const binStock = stock.filter((s) => s.zone === zoneName && s.binLocation === bin);
  const qty = binStock.reduce((sum, s) => sum + s.quantityAvailable, 0);
  if (qty === 0) return BIN_DOT_COLORS.empty;
  // Estimate fill ratio relative to max bin stock in this zone
  const allBinQty = stock
    .filter((s) => s.zone === zoneName && s.binLocation)
    .reduce((map, s) => {
      map.set(s.binLocation!, (map.get(s.binLocation!) ?? 0) + s.quantityAvailable);
      return map;
    }, new Map<string, number>());
  const maxQty = Math.max(1, ...Array.from(allBinQty.values()));
  const ratio = qty / maxQty;
  if (ratio > CRITICAL_FILL_THRESHOLD) return BIN_DOT_COLORS.high;
  if (ratio > WARNING_FILL_THRESHOLD) return BIN_DOT_COLORS.medium;
  return BIN_DOT_COLORS.low;
}

export function FloorMapBinDots({ pos, bins, stock, zoneName }: FloorMapBinDotsProps) {
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
    <g>
      {bins.slice(0, maxDots).map((bin, i) => {
        const col = i % maxCols;
        const row = Math.floor(i / maxCols);
        const dx = padding + col * (dotSize + gap);
        const dy = h - padding - (dotSize + gap) * (row + 1) + gap;
        const color = getBinColor(bin, stock, zoneName);
        return (
          <g key={i}>
            {/* Glow */}
            <rect
              x={dx - 0.5}
              y={dy - 0.5}
              width={dotSize + 1}
              height={dotSize + 1}
              rx={1.5}
              fill={color}
              opacity={0.2}
            />
            {/* Dot */}
            <rect
              x={dx}
              y={dy}
              width={dotSize}
              height={dotSize}
              rx={1}
              fill={color}
              opacity={0.7}
            />
          </g>
        );
      })}
    </g>
  );
}
