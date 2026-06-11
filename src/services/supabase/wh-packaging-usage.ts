/**
 * Warehouse Packaging Usage Service
 *
 * Aggregates how many kilograms of packaging material were consumed by
 * shipments in a date range, split into:
 *   - outer packaging  (shipping carton tare from wh_packaging_types)
 *   - product packaging (per-unit product_packaging layers × shipped quantity)
 *
 * All operations are tenant-scoped via getCurrentTenantId().
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { resolveMaterialShares } from '@/types/compliance';
import type { LucidMaterial, MaterialSplitEntry } from '@/types/compliance';

// ============================================
// TYPES
// ============================================

export interface PackagingUsageTotals {
  outerKg: number;
  productKg: number;
  totalKg: number;
  shipmentCount: number;
  /** Average packaging weight (outer + product) per shipment, in grams. */
  avgPerShipmentG: number;
}

export interface PackagingUsageMaterialRow {
  material: string;
  outerKg: number;
  productKg: number;
}

export interface PackagingUsageTypeRow {
  id: string;
  name: string;
  count: number;
  kg: number;
}

export interface PackagingUsageTimelinePoint {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  outerKg: number;
  productKg: number;
}

export interface PackagingUsageResult {
  totals: PackagingUsageTotals;
  byMaterial: PackagingUsageMaterialRow[];
  byPackagingType: PackagingUsageTypeRow[];
  timeline: PackagingUsageTimelinePoint[];
}

export interface ProductPackagingLayerWeight {
  /** Weight of this layer per product unit, in grams. */
  weightG: number;
  /** Material name (free text / LucidMaterial key), 'other' when unset. */
  material: string;
}

// ============================================
// HELPERS
// ============================================

const EMPTY_RESULT: PackagingUsageResult = {
  totals: { outerKg: 0, productKg: 0, totalKg: 0, shipmentCount: 0, avgPerShipmentG: 0 },
  byMaterial: [],
  byPackagingType: [],
  timeline: [],
};

function toKg(grams: number): number {
  return Math.round(grams) / 1000;
}

/** Max ids per .in() request — Supabase has a soft URL-length cap. */
const CHUNK = 200;

/**
 * Loads product_packaging layers (weight + material) for many products in
 * one batched query. Returns Map<productId, layers[]>. Layers without a
 * weight are skipped; layers without a material fall back to 'other'.
 */
export async function getProductPackagingLayers(
  productIds: string[],
): Promise<Map<string, ProductPackagingLayerWeight[]>> {
  const map = new Map<string, ProductPackagingLayerWeight[]>();
  const distinct = [...new Set(productIds)].filter(Boolean);
  if (distinct.length === 0) return map;

  for (let i = 0; i < distinct.length; i += CHUNK) {
    const slice = distinct.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('product_packaging')
      .select('product_id, weight_g, material')
      .in('product_id', slice);
    if (error) {
      console.error('Failed to load product packaging layers:', error);
      continue;
    }
    for (const row of data || []) {
      const weightG = row.weight_g != null ? Number(row.weight_g) : 0;
      if (weightG <= 0) continue;
      const arr = map.get(row.product_id) || [];
      arr.push({ weightG, material: row.material || 'other' });
      map.set(row.product_id, arr);
    }
  }
  return map;
}

/** Fills every day between from and to (inclusive) so charts have no gaps. */
function buildTimeline(
  from: string,
  to: string,
  byDate: Map<string, { outerG: number; productG: number }>,
): PackagingUsageTimelinePoint[] {
  const start = new Date(from.slice(0, 10));
  const end = new Date(to.slice(0, 10));
  const points: PackagingUsageTimelinePoint[] = [];
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    // Fallback: just emit the dates we have, sorted.
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, outerKg: toKg(v.outerG), productKg: toKg(v.productG) }));
  }
  const cursor = new Date(start);
  let guard = 0;
  while (cursor.getTime() <= end.getTime() && guard < 1000) {
    const key = cursor.toISOString().slice(0, 10);
    const v = byDate.get(key);
    points.push({
      date: key,
      outerKg: v ? toKg(v.outerG) : 0,
      productKg: v ? toKg(v.productG) : 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    guard++;
  }
  return points;
}

// ============================================
// MAIN AGGREGATION
// ============================================

/**
 * Packaging material usage for all non-cancelled shipments in the range.
 * The range is matched against shipped_at, falling back to created_at for
 * shipments that have not shipped yet. Pass full ISO timestamps (start of
 * day / end of day) for inclusive bounds.
 */
export async function getPackagingUsage(range: {
  from: string;
  to: string;
}): Promise<PackagingUsageResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return EMPTY_RESULT;

  // 1. Shipments in range (shipped_at, fallback created_at), incl. carton info.
  const { data: shipments, error } = await supabase
    .from('wh_shipments')
    .select(
      'id, status, shipped_at, created_at, packaging_type_id, wh_packaging_types(id, name, tare_weight_grams, primary_material, material_split)',
    )
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .or(
      `and(shipped_at.gte."${range.from}",shipped_at.lte."${range.to}"),and(shipped_at.is.null,created_at.gte."${range.from}",created_at.lte."${range.to}")`,
    );
  if (error) throw new Error(`Failed to load packaging usage: ${error.message}`);
  if (!shipments?.length) return EMPTY_RESULT;

  // 2. Items of all shipments (chunked .in()).
  const itemsByShipment = new Map<string, Array<{ productId: string; quantity: number }>>();
  const shipmentIds = shipments.map((s) => s.id);
  for (let i = 0; i < shipmentIds.length; i += CHUNK) {
    const slice = shipmentIds.slice(i, i + CHUNK);
    const { data: items, error: itemsErr } = await supabase
      .from('wh_shipment_items')
      .select('shipment_id, product_id, quantity')
      .in('shipment_id', slice);
    if (itemsErr) throw new Error(`Failed to load shipment items: ${itemsErr.message}`);
    for (const row of items || []) {
      const arr = itemsByShipment.get(row.shipment_id) || [];
      arr.push({ productId: row.product_id, quantity: row.quantity || 0 });
      itemsByShipment.set(row.shipment_id, arr);
    }
  }

  // 3. Product packaging layers for all involved products in one batched load.
  const allProductIds = [...itemsByShipment.values()].flat().map((it) => it.productId);
  const layersByProduct = await getProductPackagingLayers(allProductIds);

  // Per-unit grams + per-unit material grams, precomputed per product.
  const perUnitG = new Map<string, number>();
  const perUnitMaterialG = new Map<string, Map<string, number>>();
  for (const [productId, layers] of layersByProduct) {
    let sum = 0;
    const matMap = new Map<string, number>();
    for (const layer of layers) {
      sum += layer.weightG;
      matMap.set(layer.material, (matMap.get(layer.material) || 0) + layer.weightG);
    }
    perUnitG.set(productId, sum);
    perUnitMaterialG.set(productId, matMap);
  }

  // 4. Aggregate.
  let totalOuterG = 0;
  let totalProductG = 0;
  const byDate = new Map<string, { outerG: number; productG: number }>();
  const materialMap = new Map<string, { outerG: number; productG: number }>();
  const typeMap = new Map<string, { name: string; count: number; grams: number }>();

  const bumpMaterial = (material: string, key: 'outerG' | 'productG', grams: number) => {
    if (grams <= 0) return;
    const entry = materialMap.get(material) || { outerG: 0, productG: 0 };
    entry[key] += grams;
    materialMap.set(material, entry);
  };

  for (const s of shipments) {
    // Joined row comes back as object (FK join), but type tooling may see an array.
    const rawPkg = s.wh_packaging_types as unknown;
    const pkg = (Array.isArray(rawPkg) ? rawPkg[0] : rawPkg) as
      | {
          id: string;
          name: string;
          tare_weight_grams: number | null;
          primary_material: LucidMaterial | null;
          material_split: MaterialSplitEntry[] | null;
        }
      | null;

    const outerG = pkg?.tare_weight_grams ?? 0;

    let productG = 0;
    const items = itemsByShipment.get(s.id) || [];
    for (const it of items) {
      const unitG = perUnitG.get(it.productId) || 0;
      if (unitG > 0) productG += unitG * it.quantity;
      const matMap = perUnitMaterialG.get(it.productId);
      if (matMap) {
        for (const [material, gramsPerUnit] of matMap) {
          bumpMaterial(material, 'productG', gramsPerUnit * it.quantity);
        }
      }
    }

    totalOuterG += outerG;
    totalProductG += productG;

    const date = (s.shipped_at || s.created_at || '').slice(0, 10);
    if (date) {
      const bucket = byDate.get(date) || { outerG: 0, productG: 0 };
      bucket.outerG += outerG;
      bucket.productG += productG;
      byDate.set(date, bucket);
    }

    // Outer material attribution — proportional via resolveMaterialShares.
    if (outerG > 0) {
      const shares = resolveMaterialShares(
        pkg?.primary_material ?? null,
        pkg?.material_split ?? null,
        outerG,
      );
      const shareSum = shares.reduce((sum, sh) => sum + sh.weight_grams, 0);
      if (shareSum > 0) {
        for (const sh of shares) {
          bumpMaterial(sh.material, 'outerG', outerG * (sh.weight_grams / shareSum));
        }
      } else {
        bumpMaterial('other', 'outerG', outerG);
      }
    }

    if (pkg) {
      const entry = typeMap.get(pkg.id) || { name: pkg.name, count: 0, grams: 0 };
      entry.count += 1;
      entry.grams += outerG;
      typeMap.set(pkg.id, entry);
    }
  }

  const shipmentCount = shipments.length;
  const totalG = totalOuterG + totalProductG;

  const byMaterial: PackagingUsageMaterialRow[] = [...materialMap.entries()]
    .map(([material, v]) => ({
      material,
      outerKg: toKg(v.outerG),
      productKg: toKg(v.productG),
    }))
    .sort((a, b) => b.outerKg + b.productKg - (a.outerKg + a.productKg));

  const byPackagingType: PackagingUsageTypeRow[] = [...typeMap.entries()]
    .map(([id, v]) => ({ id, name: v.name, count: v.count, kg: toKg(v.grams) }))
    .sort((a, b) => b.kg - a.kg);

  return {
    totals: {
      outerKg: toKg(totalOuterG),
      productKg: toKg(totalProductG),
      totalKg: toKg(totalG),
      shipmentCount,
      avgPerShipmentG: shipmentCount > 0 ? Math.round(totalG / shipmentCount) : 0,
    },
    byMaterial,
    byPackagingType,
    timeline: buildTimeline(range.from, range.to, byDate),
  };
}
