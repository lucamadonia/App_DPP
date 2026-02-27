import type { Product, ProductBatch } from '@/types/product';

export type DimensionSource = 'packaging' | 'product';

export interface Dimensions {
  heightCm: number;
  widthCm: number;
  depthCm: number;
}

export interface VolumeResult {
  unitVolumeM3: number;
  totalVolumeM3: number;
  source: DimensionSource;
  dimensions: Dimensions;
  quantity: number;
}

export type CapacityStatus = 'ok' | 'warning' | 'over_capacity' | 'unknown';

export interface CapacityAnalysis {
  status: CapacityStatus;
  fillPercentAfter: number;
  remainingAfterM3: number;
  locationCapacityM3: number;
}

/**
 * Resolve effective dimensions from batch/product with priority:
 * 1. Batch packaging dims (if all 3 present)
 * 2. Product packaging dims (if all 3 present)
 * 3. Batch product dims (if all 3 present)
 * 4. Product product dims (if all 3 present)
 */
export function resolveEffectiveDimensions(
  product: Product,
  batch?: ProductBatch | null,
): { dimensions: Dimensions; source: DimensionSource } | null {
  // 1. Batch packaging
  if (batch?.packagingHeightCm && batch?.packagingWidthCm && batch?.packagingDepthCm) {
    return {
      dimensions: { heightCm: batch.packagingHeightCm, widthCm: batch.packagingWidthCm, depthCm: batch.packagingDepthCm },
      source: 'packaging',
    };
  }

  // 2. Product packaging
  if (product.packagingHeightCm && product.packagingWidthCm && product.packagingDepthCm) {
    return {
      dimensions: { heightCm: product.packagingHeightCm, widthCm: product.packagingWidthCm, depthCm: product.packagingDepthCm },
      source: 'packaging',
    };
  }

  // 3. Batch product dims
  if (batch?.productHeightCm && batch?.productWidthCm && batch?.productDepthCm) {
    return {
      dimensions: { heightCm: batch.productHeightCm, widthCm: batch.productWidthCm, depthCm: batch.productDepthCm },
      source: 'product',
    };
  }

  // 4. Product product dims
  if (product.productHeightCm && product.productWidthCm && product.productDepthCm) {
    return {
      dimensions: { heightCm: product.productHeightCm, widthCm: product.productWidthCm, depthCm: product.productDepthCm },
      source: 'product',
    };
  }

  return null;
}

/**
 * Calculate volume for a given quantity of products/batches.
 * Returns null if no complete dimension set is available.
 */
export function calculateVolume(
  product: Product,
  quantity: number,
  batch?: ProductBatch | null,
): VolumeResult | null {
  const resolved = resolveEffectiveDimensions(product, batch);
  if (!resolved) return null;

  const { dimensions, source } = resolved;
  const cm3 = dimensions.heightCm * dimensions.widthCm * dimensions.depthCm;
  const unitVolumeM3 = cm3 / 1_000_000;

  return {
    unitVolumeM3,
    totalVolumeM3: unitVolumeM3 * quantity,
    source,
    dimensions,
    quantity,
  };
}

/**
 * Analyze whether incoming volume fits within location capacity.
 * currentUsedM3 can be null if not tracked.
 */
export function analyzeCapacity(
  incomingM3: number,
  locationCapacityM3: number | undefined | null,
  currentUsedM3: number | null,
): CapacityAnalysis | null {
  if (!locationCapacityM3 || locationCapacityM3 <= 0) {
    return { status: 'unknown', fillPercentAfter: 0, remainingAfterM3: 0, locationCapacityM3: 0 };
  }

  const used = currentUsedM3 ?? 0;
  const afterM3 = used + incomingM3;
  const fillPercentAfter = (afterM3 / locationCapacityM3) * 100;
  const remainingAfterM3 = locationCapacityM3 - afterM3;

  let status: CapacityStatus;
  if (fillPercentAfter > 100) {
    status = 'over_capacity';
  } else if (fillPercentAfter >= 80) {
    status = 'warning';
  } else {
    status = 'ok';
  }

  return { status, fillPercentAfter, remainingAfterM3, locationCapacityM3 };
}

/**
 * Format m³ value for display — more decimals for small values.
 */
export function formatVolumeM3(value: number): string {
  if (value === 0) return '0 m³';
  if (value < 0.001) return `${value.toFixed(6)} m³`;
  if (value < 0.1) return `${value.toFixed(4)} m³`;
  return `${value.toFixed(2)} m³`;
}
