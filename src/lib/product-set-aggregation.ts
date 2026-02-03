/**
 * Product Set Aggregation
 *
 * Pure functions for aggregating sustainability data from set components.
 * No DB calls — works on already-loaded component data.
 */

import type {
  Material,
  CarbonFootprint,
  RecyclabilityInfo,
  ProductComponent,
  AggregationOverrides,
  Product,
} from '@/types/product';

interface AggregationResult {
  materials: Material[];
  carbonFootprint: CarbonFootprint | undefined;
  recyclability: RecyclabilityInfo;
  netWeight: number | undefined;
  grossWeight: number | undefined;
}

/**
 * Aggregate all sustainability data from set components.
 * Uses overrides from the parent product where flagged.
 */
export function aggregateFromComponents(
  components: ProductComponent[],
  parentProduct: Partial<Product>,
  overrides: AggregationOverrides = {},
): AggregationResult {
  return {
    materials: overrides.materials
      ? (parentProduct.materials || [])
      : aggregateMaterials(components),
    carbonFootprint: overrides.carbonFootprint
      ? parentProduct.carbonFootprint
      : aggregateCarbonFootprint(components),
    recyclability: overrides.recyclability
      ? (parentProduct.recyclability || { recyclablePercentage: 0, instructions: '', disposalMethods: [] })
      : aggregateRecyclability(components),
    netWeight: overrides.netWeight
      ? parentProduct.netWeight
      : aggregateWeight(components, 'netWeight'),
    grossWeight: overrides.grossWeight
      ? parentProduct.grossWeight
      : aggregateWeight(components, 'grossWeight'),
  };
}

/**
 * Merge materials from all components, weighted by quantity.
 * Combines materials with the same name by summing percentages.
 */
export function aggregateMaterials(components: ProductComponent[]): Material[] {
  const materialMap = new Map<string, Material>();

  for (const comp of components) {
    const cp = comp.componentProduct;
    if (!cp?.materials) continue;

    for (const mat of cp.materials) {
      const key = `${mat.name}|${mat.type || 'product'}`;
      const existing = materialMap.get(key);
      if (existing) {
        existing.percentage += mat.percentage * comp.quantity;
      } else {
        materialMap.set(key, {
          ...mat,
          percentage: mat.percentage * comp.quantity,
        });
      }
    }
  }

  // Normalize percentages so they sum to 100 per type
  const byType = new Map<string, Material[]>();
  for (const mat of materialMap.values()) {
    const type = mat.type || 'product';
    const list = byType.get(type) || [];
    list.push(mat);
    byType.set(type, list);
  }

  const result: Material[] = [];
  for (const [, mats] of byType) {
    const total = mats.reduce((sum, m) => sum + m.percentage, 0);
    if (total > 0) {
      for (const mat of mats) {
        result.push({
          ...mat,
          percentage: Math.round((mat.percentage / total) * 100),
        });
      }
    }
  }

  return result;
}

/**
 * Sum CO2 footprints from all components, weighted by quantity.
 */
export function aggregateCarbonFootprint(
  components: ProductComponent[],
): CarbonFootprint | undefined {
  let totalKgCO2 = 0;
  let productionKgCO2 = 0;
  let transportKgCO2 = 0;
  let hasData = false;

  for (const comp of components) {
    const cf = comp.componentProduct?.carbonFootprint;
    if (!cf) continue;
    hasData = true;
    totalKgCO2 += cf.totalKgCO2 * comp.quantity;
    productionKgCO2 += cf.productionKgCO2 * comp.quantity;
    transportKgCO2 += cf.transportKgCO2 * comp.quantity;
  }

  if (!hasData) return undefined;

  // Determine rating based on total
  const rating = getCO2Rating(totalKgCO2);

  return {
    totalKgCO2: Math.round(totalKgCO2 * 100) / 100,
    productionKgCO2: Math.round(productionKgCO2 * 100) / 100,
    transportKgCO2: Math.round(transportKgCO2 * 100) / 100,
    rating,
  };
}

/**
 * Weighted average of recyclability percentages.
 */
export function aggregateRecyclability(
  components: ProductComponent[],
): RecyclabilityInfo {
  let totalWeight = 0;
  let weightedRecyclable = 0;
  let weightedPackagingRecyclable = 0;
  let hasPackaging = false;
  const allDisposalMethods = new Set<string>();
  const allPackagingDisposalMethods = new Set<string>();

  for (const comp of components) {
    const r = comp.componentProduct?.recyclability;
    if (!r) continue;
    const w = comp.quantity;
    totalWeight += w;
    weightedRecyclable += r.recyclablePercentage * w;

    if (r.packagingRecyclablePercentage != null) {
      hasPackaging = true;
      weightedPackagingRecyclable += (r.packagingRecyclablePercentage || 0) * w;
    }

    r.disposalMethods?.forEach(m => allDisposalMethods.add(m));
    r.packagingDisposalMethods?.forEach(m => allPackagingDisposalMethods.add(m));
  }

  if (totalWeight === 0) {
    return { recyclablePercentage: 0, instructions: '', disposalMethods: [] };
  }

  return {
    recyclablePercentage: Math.round(weightedRecyclable / totalWeight),
    instructions: '',
    disposalMethods: Array.from(allDisposalMethods),
    ...(hasPackaging && {
      packagingRecyclablePercentage: Math.round(weightedPackagingRecyclable / totalWeight),
      packagingDisposalMethods: Array.from(allPackagingDisposalMethods),
    }),
  };
}

/**
 * Sum weight from all components, weighted by quantity.
 */
export function aggregateWeight(
  components: ProductComponent[],
  field: 'netWeight' | 'grossWeight',
): number | undefined {
  let total = 0;
  let hasData = false;

  for (const comp of components) {
    const w = comp.componentProduct?.[field];
    if (w != null) {
      hasData = true;
      total += w * comp.quantity;
    }
  }

  return hasData ? Math.round(total * 100) / 100 : undefined;
}

function getCO2Rating(totalKgCO2: number): 'A' | 'B' | 'C' | 'D' | 'E' {
  if (totalKgCO2 <= 5) return 'A';
  if (totalKgCO2 <= 15) return 'B';
  if (totalKgCO2 <= 30) return 'C';
  if (totalKgCO2 <= 50) return 'D';
  return 'E';
}
