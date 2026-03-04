import type { WarehouseZone, ZoneMapPosition, WhStockLevel, ZoneFurniture, FurnitureSection } from '@/types/warehouse';
import {
  GRID_CELL,
  GRID_COLS,
  DEFAULT_ZONE_WIDTH,
  DEFAULT_ZONE_HEIGHT,
  MIN_ZONE_SIZE,
  MAX_EXTRUSION,
  MIN_EXTRUSION,
  HEATMAP_COLORS,
  WARNING_FILL_THRESHOLD,
  CRITICAL_FILL_THRESHOLD,
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

// ============================================
// FURNITURE STOCK UTILITIES
// ============================================

/**
 * Get stock assigned to a specific furniture piece.
 * Stock is linked via `binLocation` field: format "{furnitureId}:{sectionId}"
 */
export function getStockByFurniture(
  stock: WhStockLevel[],
  furnitureId: string,
): { totalUnits: number; totalBatches: number; reserved: number; items: WhStockLevel[] } {
  const items = stock.filter((s) => s.binLocation?.startsWith(`${furnitureId}:`));
  return {
    totalUnits: items.reduce((acc, s) => acc + s.quantityAvailable, 0),
    totalBatches: new Set(items.map((s) => s.batchId)).size,
    reserved: items.reduce((acc, s) => acc + s.quantityReserved, 0),
    items,
  };
}

/**
 * Get stock for a specific section within a furniture piece.
 * binLocation format: "{furnitureId}:{sectionId}"
 */
export function getStockBySection(
  stock: WhStockLevel[],
  furnitureId: string,
  sectionId: string,
): { totalUnits: number; reserved: number; items: WhStockLevel[] } {
  const binKey = `${furnitureId}:${sectionId}`;
  const items = stock.filter((s) => s.binLocation === binKey);
  return {
    totalUnits: items.reduce((acc, s) => acc + s.quantityAvailable, 0),
    reserved: items.reduce((acc, s) => acc + s.quantityReserved, 0),
    items,
  };
}

/**
 * Calculate fill ratio (0-1) for a furniture piece based on section capacities.
 * If no capacity defined, returns ratio based on whether sections have stock.
 */
export function getFurnitureFillRatio(
  stock: WhStockLevel[],
  furniture: ZoneFurniture,
): number {
  if (furniture.sections.length === 0) return 0;

  const totalCapacity = furniture.sections.reduce((sum, s) => sum + (s.capacity ?? 0), 0);
  const { totalUnits } = getStockByFurniture(stock, furniture.id);

  if (totalCapacity > 0) {
    return Math.min(1, totalUnits / totalCapacity);
  }

  // No capacity defined — use section occupancy as heuristic
  let occupiedSections = 0;
  for (const section of furniture.sections) {
    const sectionStock = getStockBySection(stock, furniture.id, section.id);
    if (sectionStock.totalUnits > 0) occupiedSections++;
  }
  return furniture.sections.length > 0 ? occupiedSections / furniture.sections.length : 0;
}

/**
 * Get section fill ratio (0-1) for a specific section.
 */
export function getSectionFillRatio(
  stock: WhStockLevel[],
  furnitureId: string,
  section: FurnitureSection,
): number {
  const { totalUnits } = getStockBySection(stock, furnitureId, section.id);
  if (section.capacity && section.capacity > 0) {
    return Math.min(1, totalUnits / section.capacity);
  }
  return totalUnits > 0 ? 0.5 : 0; // heuristic when no capacity defined
}

/**
 * Get fill level category for color coding.
 */
export function getFillLevel(ratio: number): 'empty' | 'low' | 'medium' | 'high' | 'full' {
  if (ratio <= 0) return 'empty';
  if (ratio < WARNING_FILL_THRESHOLD) return 'low';
  if (ratio < CRITICAL_FILL_THRESHOLD) return 'medium';
  if (ratio >= 1) return 'full';
  return 'high';
}

/**
 * Count total furniture pieces across all zones.
 */
export function getTotalFurnitureCount(zones: WarehouseZone[]): number {
  return zones.reduce((sum, z) => sum + (z.furniture?.length ?? 0), 0);
}

/**
 * Count total furniture capacity across all zones.
 */
export function getTotalFurnitureCapacity(zones: WarehouseZone[]): number {
  let total = 0;
  for (const zone of zones) {
    for (const f of zone.furniture ?? []) {
      for (const s of f.sections) {
        total += s.capacity ?? 0;
      }
    }
  }
  return total;
}

/**
 * Compute viewport that zooms into a zone's interior.
 */
export function zoomToZoneInterior(
  zone: WarehouseZone,
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number; zoom: number } {
  if (!zone.mapPosition) return { x: 20, y: 20, zoom: 1 };
  const pos = zone.mapPosition;

  const zonePixelW = pos.width * GRID_CELL;
  const zonePixelH = pos.height * GRID_CELL;

  const padX = GRID_CELL * 2;
  const padY = GRID_CELL * 2;

  const zoomX = containerWidth / (zonePixelW + padX * 2);
  const zoomY = containerHeight / (zonePixelH + padY * 2);
  const zoom = Math.min(zoomX, zoomY, 3) * 0.9;

  const cx = (pos.x + pos.width / 2) * GRID_CELL;
  const cy = (pos.y + pos.height / 2) * GRID_CELL;

  return {
    x: containerWidth / 2 - cx * zoom,
    y: containerHeight / 2 - cy * zoom,
    zoom,
  };
}

/**
 * Clamp a furniture position within a zone's bounds, ensuring the piece doesn't overflow.
 */
export function clampFurnitureToZone(
  pos: { x: number; y: number },
  size: { w: number; h: number },
  zoneBounds: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: Math.max(0, Math.min(Math.round(pos.x), zoneBounds.width - size.w)),
    y: Math.max(0, Math.min(Math.round(pos.y), zoneBounds.height - size.h)),
  };
}

/**
 * Find a non-overlapping position for new furniture using spiral search.
 * Starts at the preferred position and spirals outward.
 */
export function findNonOverlappingPosition(
  preferred: { x: number; y: number },
  size: { w: number; h: number },
  existingFurniture: { position: { x: number; y: number }; size: { w: number; h: number } }[],
  zoneW: number,
  zoneH: number,
): { x: number; y: number } {
  const overlaps = (x: number, y: number) => {
    for (const f of existingFurniture) {
      if (
        x < f.position.x + f.size.w &&
        x + size.w > f.position.x &&
        y < f.position.y + f.size.h &&
        y + size.h > f.position.y
      ) {
        return true;
      }
    }
    return false;
  };

  const clamp = (x: number, y: number) => ({
    x: Math.max(0, Math.min(x, zoneW - size.w)),
    y: Math.max(0, Math.min(y, zoneH - size.h)),
  });

  // Try preferred position first
  const p = clamp(preferred.x, preferred.y);
  if (!overlaps(p.x, p.y)) return p;

  // Spiral search outward
  for (let radius = 1; radius < Math.max(zoneW, zoneH); radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (const dy of [-radius, radius]) {
        const c = clamp(preferred.x + dx, preferred.y + dy);
        if (!overlaps(c.x, c.y)) return c;
      }
    }
    for (let dy = -radius + 1; dy < radius; dy++) {
      for (const dx of [-radius, radius]) {
        const c = clamp(preferred.x + dx, preferred.y + dy);
        if (!overlaps(c.x, c.y)) return c;
      }
    }
  }

  // Fallback: return clamped preferred (will overlap, but we tried)
  return p;
}

/**
 * Convert screen pixel coordinates to zone-relative grid units.
 * Used for palette drag-to-canvas drops and click placement.
 */
export function screenToZoneGrid(
  clientX: number,
  clientY: number,
  svgRect: DOMRect,
  viewport: { x: number; y: number; zoom: number },
  zonePosition: { x: number; y: number },
): { gridX: number; gridY: number } {
  const svgX = (clientX - svgRect.left - viewport.x) / viewport.zoom;
  const svgY = (clientY - svgRect.top - viewport.y) / viewport.zoom;
  const zoneOriginX = zonePosition.x * GRID_CELL;
  const zoneOriginY = zonePosition.y * GRID_CELL;
  return {
    gridX: Math.round((svgX - zoneOriginX) / GRID_CELL),
    gridY: Math.round((svgY - zoneOriginY) / GRID_CELL),
  };
}

/**
 * Search stock across all furniture in all zones by product name, GTIN, or batch number.
 * Returns matching furniture IDs with their zone indices.
 */
export function searchStockInFurniture(
  zones: WarehouseZone[],
  stock: WhStockLevel[],
  query: string,
): { zoneIdx: number; furnitureId: string; zoneName: string; furnitureName: string }[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: { zoneIdx: number; furnitureId: string; zoneName: string; furnitureName: string }[] = [];

  for (let zoneIdx = 0; zoneIdx < zones.length; zoneIdx++) {
    const zone = zones[zoneIdx];
    for (const furniture of zone.furniture ?? []) {
      const furnitureStock = stock.filter((s) => s.binLocation?.startsWith(`${furniture.id}:`));
      const hasMatch = furnitureStock.some(
        (s) =>
          s.productName?.toLowerCase().includes(q) ||
          s.batchSerialNumber?.toLowerCase().includes(q),
      );
      if (hasMatch) {
        results.push({
          zoneIdx,
          furnitureId: furniture.id,
          zoneName: zone.name,
          furnitureName: furniture.name,
        });
      }
    }
  }

  return results;
}
