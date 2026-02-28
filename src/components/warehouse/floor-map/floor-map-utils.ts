import type { WarehouseZone, ZoneMapPosition, WhStockLevel } from '@/types/warehouse';
import {
  GRID_CELL,
  GRID_COLS,
  DEFAULT_ZONE_WIDTH,
  DEFAULT_ZONE_HEIGHT,
  MIN_ZONE_SIZE,
  MAX_EXTRUSION,
  MIN_EXTRUSION,
  HEATMAP_COLORS,
} from './floor-map-constants';

/** Snap a position object to grid */
export function snapPositionToGrid(pos: ZoneMapPosition): ZoneMapPosition {
  return {
    x: Math.max(0, Math.round(pos.x)),
    y: Math.max(0, Math.round(pos.y)),
    width: Math.max(MIN_ZONE_SIZE, Math.round(pos.width)),
    height: Math.max(MIN_ZONE_SIZE, Math.round(pos.height)),
  };
}

/**
 * Auto-layout zones that don't have a mapPosition.
 * Row-packing algorithm, sorted by area (largest first).
 */
export function autoLayoutZones(zones: WarehouseZone[]): WarehouseZone[] {
  const placed: WarehouseZone[] = [];
  const toPlace: WarehouseZone[] = [];

  for (const z of zones) {
    if (z.mapPosition) {
      placed.push(z);
    } else {
      toPlace.push(z);
    }
  }

  toPlace.sort((a, b) => (b.areaM2 ?? 0) - (a.areaM2 ?? 0));

  let curX = 0;
  let curY = 0;
  let rowMaxHeight = 0;

  for (const z of placed) {
    if (z.mapPosition) {
      const bottom = z.mapPosition.y + z.mapPosition.height;
      if (bottom > curY) curY = bottom;
    }
  }
  if (placed.length > 0) curY += 1;

  for (const zone of toPlace) {
    const w = zone.areaM2
      ? Math.max(MIN_ZONE_SIZE, Math.round(Math.sqrt(zone.areaM2 * 1.5)))
      : DEFAULT_ZONE_WIDTH;
    const h = zone.areaM2
      ? Math.max(MIN_ZONE_SIZE, Math.round(w * 0.7))
      : DEFAULT_ZONE_HEIGHT;

    if (curX + w > GRID_COLS) {
      curX = 0;
      curY += rowMaxHeight + 1;
      rowMaxHeight = 0;
    }

    placed.push({
      ...zone,
      mapPosition: { x: curX, y: curY, width: w, height: h },
    });

    curX += w + 1;
    rowMaxHeight = Math.max(rowMaxHeight, h);
  }

  return placed;
}

/** Count stock units per zone */
export function getStockByZone(
  stock: WhStockLevel[],
  zoneName: string,
): { totalUnits: number; totalBatches: number; reserved: number } {
  const zoneStock = stock.filter((s) => s.zone === zoneName);
  return {
    totalUnits: zoneStock.reduce((acc, s) => acc + s.quantityAvailable, 0),
    totalBatches: new Set(zoneStock.map((s) => s.batchId)).size,
    reserved: zoneStock.reduce((acc, s) => acc + s.quantityReserved, 0),
  };
}

/** Calculate fill ratio (0-1) for a zone relative to max stock across all zones */
export function getZoneFillRatio(
  stock: WhStockLevel[],
  zones: WarehouseZone[],
  zoneName: string,
): number {
  let maxUnits = 0;
  for (const z of zones) {
    const u = stock
      .filter((s) => s.zone === z.name)
      .reduce((acc, s) => acc + s.quantityAvailable, 0);
    if (u > maxUnits) maxUnits = u;
  }
  if (maxUnits === 0) return 0;
  const units = stock
    .filter((s) => s.zone === zoneName)
    .reduce((acc, s) => acc + s.quantityAvailable, 0);
  return Math.min(1, units / maxUnits);
}

/** Calculate 3D extrusion depth (SVG px) based on fill ratio */
export function getExtrusionDepth(fillRatio: number): number {
  return MIN_EXTRUSION + fillRatio * (MAX_EXTRUSION - MIN_EXTRUSION);
}

/** Interpolate heatmap color from fill ratio (0-1) */
export function getHeatmapColor(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio));
  const idx = t * (HEATMAP_COLORS.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, HEATMAP_COLORS.length - 1);
  const frac = idx - lo;

  const c1 = hexToRgb(HEATMAP_COLORS[lo]);
  const c2 = hexToRgb(HEATMAP_COLORS[hi]);
  const r = Math.round(c1.r + (c2.r - c1.r) * frac);
  const g = Math.round(c1.g + (c2.g - c1.g) * frac);
  const b = Math.round(c1.b + (c2.b - c1.b) * frac);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** Compute target viewport that centers a specific zone */
export function panToZoneViewport(
  zone: WarehouseZone,
  containerWidth: number,
  containerHeight: number,
  zoom: number,
): { x: number; y: number; zoom: number } {
  if (!zone.mapPosition) return { x: 20, y: 20, zoom };
  const cx = (zone.mapPosition.x + zone.mapPosition.width / 2) * GRID_CELL;
  const cy = (zone.mapPosition.y + zone.mapPosition.height / 2) * GRID_CELL;
  return {
    x: containerWidth / 2 - cx * zoom,
    y: containerHeight / 2 - cy * zoom,
    zoom,
  };
}

/** Fit all zones into viewport */
export function fitAllViewport(
  zones: WarehouseZone[],
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number; zoom: number } {
  if (zones.length === 0 || containerWidth === 0 || containerHeight === 0) {
    return { x: 20, y: 20, zoom: 1 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const z of zones) {
    if (!z.mapPosition) continue;
    const { x, y, width, height } = z.mapPosition;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  if (minX === Infinity) return { x: 20, y: 20, zoom: 1 };

  const contentWidth = (maxX - minX) * GRID_CELL + GRID_CELL * 6;
  const contentHeight = (maxY - minY) * GRID_CELL + GRID_CELL * 6;

  const zoomX = containerWidth / contentWidth;
  const zoomY = containerHeight / contentHeight;
  const zoom = Math.min(zoomX, zoomY, 2) * 0.85;

  const cx = ((minX + maxX) / 2) * GRID_CELL;
  const cy = ((minY + maxY) / 2) * GRID_CELL;

  return {
    x: containerWidth / 2 - cx * zoom,
    y: containerHeight / 2 - cy * zoom,
    zoom,
  };
}
