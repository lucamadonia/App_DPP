/**
 * Warehouse Logistics Calculations
 *
 * Pure functions for pallet fitting, container fill calculations,
 * and batch space summary. No state, no API calls.
 */

import type { Product, ProductBatch } from '@/types/product';
import { calculateVolume, resolveEffectiveDimensions, type Dimensions, type VolumeResult } from './warehouse-volume';

// ─── Standard Logistics Constants ─────────────────────────────

export const EURO_PALLET = {
  lengthCm: 120,
  widthCm: 80,
  heightCm: 15,
  maxStackHeightCm: 180,
  maxWeightKg: 1500,
  areaM2: 0.96,
  label: 'EUR 1 (120×80)',
} as const;

export const CONTAINERS = {
  '20ft': {
    label: "20' Standard",
    innerLengthCm: 589,
    innerWidthCm: 235,
    innerHeightCm: 239,
    usableVolumeM3: 33.2,
    maxPayloadKg: 21_770,
    palletSpots: 11,
  },
  '40ft': {
    label: "40' Standard",
    innerLengthCm: 1203,
    innerWidthCm: 235,
    innerHeightCm: 239,
    usableVolumeM3: 67.7,
    maxPayloadKg: 26_680,
    palletSpots: 23,
  },
  '40ft_hc': {
    label: "40' High Cube",
    innerLengthCm: 1203,
    innerWidthCm: 235,
    innerHeightCm: 269,
    usableVolumeM3: 76.3,
    maxPayloadKg: 26_480,
    palletSpots: 23,
  },
} as const;

export type ContainerType = keyof typeof CONTAINERS;

export const CONTAINER_TYPES = Object.keys(CONTAINERS) as ContainerType[];

// ─── Pallet Calculation ───────────────────────────────────────

export interface PalletCalculation {
  unitsPerLayer: number;
  layersPerPallet: number;
  unitsPerPallet: number;
  palletsNeeded: number;
  lastPalletUnits: number;
  lastPalletFillPct: number;
  totalPalletWeightKg: number | null;
  weightLimited: boolean;
  layoutDesc: string; // e.g. "4×3 × 4 layers"
}

export function calculatePalletFit(
  dims: Dimensions,
  quantity: number,
  unitWeightGrams?: number | null,
): PalletCalculation {
  const palletL = EURO_PALLET.lengthCm;
  const palletW = EURO_PALLET.widthCm;

  // Try both orientations on the pallet surface
  const orient1ColsA = Math.floor(palletL / dims.widthCm);
  const orient1ColsB = Math.floor(palletW / dims.depthCm);
  const orient1Units = orient1ColsA * orient1ColsB;

  const orient2ColsA = Math.floor(palletL / dims.depthCm);
  const orient2ColsB = Math.floor(palletW / dims.widthCm);
  const orient2Units = orient2ColsA * orient2ColsB;

  let unitsPerLayer: number;
  let layoutCols: string;

  if (orient1Units >= orient2Units) {
    unitsPerLayer = orient1Units;
    layoutCols = `${orient1ColsA}×${orient1ColsB}`;
  } else {
    unitsPerLayer = orient2Units;
    layoutCols = `${orient2ColsA}×${orient2ColsB}`;
  }

  // Ensure at least 1 unit per layer if dims fit at all
  if (unitsPerLayer < 1) unitsPerLayer = 1;

  // Layers by height
  let layersPerPallet = Math.floor(EURO_PALLET.maxStackHeightCm / dims.heightCm);
  if (layersPerPallet < 1) layersPerPallet = 1;

  let unitsPerPallet = unitsPerLayer * layersPerPallet;
  let weightLimited = false;

  // Check weight limit
  if (unitWeightGrams && unitWeightGrams > 0) {
    const maxUnitsByWeight = Math.floor((EURO_PALLET.maxWeightKg * 1000) / unitWeightGrams);
    if (maxUnitsByWeight < unitsPerPallet) {
      // Reduce layers to fit weight
      const maxLayersByWeight = Math.floor(maxUnitsByWeight / unitsPerLayer);
      layersPerPallet = Math.max(1, maxLayersByWeight);
      unitsPerPallet = unitsPerLayer * layersPerPallet;
      weightLimited = true;
    }
  }

  const palletsNeeded = Math.ceil(quantity / unitsPerPallet);
  const lastPalletUnits = quantity % unitsPerPallet || unitsPerPallet;
  const lastPalletFillPct = (lastPalletUnits / unitsPerPallet) * 100;

  const totalPalletWeightKg = unitWeightGrams
    ? (unitWeightGrams * quantity) / 1000
    : null;

  const layoutDesc = `${layoutCols} × ${layersPerPallet}`;

  return {
    unitsPerLayer,
    layersPerPallet,
    unitsPerPallet,
    palletsNeeded,
    lastPalletUnits,
    lastPalletFillPct,
    totalPalletWeightKg,
    weightLimited,
    layoutDesc,
  };
}

// ─── Container Calculation ────────────────────────────────────

export interface ContainerCalculation {
  containerType: ContainerType;
  containerLabel: string;
  palletsPerContainer: number;
  containersNeeded: number;
  lastContainerPallets: number;
  lastContainerFillPct: number;
  fillPercentVolume: number;
  fillPercentWeight: number | null;
  totalWeightKg: number | null;
}

export function calculateContainerFit(
  totalVolumeM3: number,
  palletsNeeded: number,
  totalWeightKg: number | null,
  containerType: ContainerType = '40ft',
): ContainerCalculation {
  const spec = CONTAINERS[containerType];

  let palletsPerContainer: number = spec.palletSpots;

  // If weight is known, check if weight limits the number of pallets
  if (totalWeightKg != null && palletsNeeded > 0) {
    const weightPerPallet = totalWeightKg / palletsNeeded;
    const maxPalletsByWeight = Math.floor(spec.maxPayloadKg / weightPerPallet);
    if (maxPalletsByWeight < palletsPerContainer) {
      palletsPerContainer = Math.max(1, maxPalletsByWeight);
    }
  }

  const containersNeeded = Math.ceil(palletsNeeded / palletsPerContainer);
  const lastContainerPallets = palletsNeeded % palletsPerContainer || palletsPerContainer;
  const lastContainerFillPct = (lastContainerPallets / palletsPerContainer) * 100;

  // Volume fill per container (distribute evenly across containers)
  const volumePerContainer = containersNeeded > 0 ? totalVolumeM3 / containersNeeded : 0;
  const fillPercentVolume = Math.min((volumePerContainer / spec.usableVolumeM3) * 100, 100);

  const fillPercentWeight = totalWeightKg != null && containersNeeded > 0
    ? Math.min(((totalWeightKg / containersNeeded) / spec.maxPayloadKg) * 100, 100)
    : null;

  return {
    containerType,
    containerLabel: spec.label,
    palletsPerContainer,
    containersNeeded,
    lastContainerPallets,
    lastContainerFillPct,
    fillPercentVolume,
    fillPercentWeight,
    totalWeightKg,
  };
}

// ─── Batch Space Summary ──────────────────────────────────────

export interface BatchSpaceSummary {
  volume: VolumeResult;
  dimensions: Dimensions;
  dimensionSource: 'packaging' | 'product';
  pallet: PalletCalculation;
  containers: Record<ContainerType, ContainerCalculation>;
  totalWeightKg: number | null;
  unitWeightGrams: number | null;
  warnings: string[];
}

export function calculateBatchSpace(
  product: Product,
  batch: ProductBatch | null,
  quantity: number,
): BatchSpaceSummary | null {
  if (quantity <= 0) return null;

  const volume = calculateVolume(product, quantity, batch);
  if (!volume) return null;

  const resolved = resolveEffectiveDimensions(product, batch);
  if (!resolved) return null;

  const warnings: string[] = [];

  // Resolve weight: batch grossWeight > product grossWeight > null
  const unitWeightGrams = batch?.grossWeight ?? product.grossWeight ?? null;

  if (!unitWeightGrams) {
    warnings.push('No weight data');
  }

  const totalWeightKg = unitWeightGrams ? (unitWeightGrams * quantity) / 1000 : null;

  // Pallet calculation
  const pallet = calculatePalletFit(resolved.dimensions, quantity, unitWeightGrams);

  if (pallet.weightLimited) {
    warnings.push('Weight-limited');
  }

  // Container calculations for all types
  const containers = {} as Record<ContainerType, ContainerCalculation>;
  for (const type of CONTAINER_TYPES) {
    containers[type] = calculateContainerFit(
      volume.totalVolumeM3,
      pallet.palletsNeeded,
      totalWeightKg,
      type,
    );
  }

  return {
    volume,
    dimensions: resolved.dimensions,
    dimensionSource: resolved.source,
    pallet,
    containers,
    totalWeightKg,
    unitWeightGrams,
    warnings,
  };
}
