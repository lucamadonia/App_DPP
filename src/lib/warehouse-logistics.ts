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

// ─── Shipping Carton Calculation ─────────────────────────────

export interface ShippingCartonSpec {
  id: string;
  label: string;
  innerLengthCm: number;
  innerWidthCm: number;
  innerHeightCm: number;
  volumeLiters: number;
  palletModule: string;
}

export const SHIPPING_CARTONS: ShippingCartonSpec[] = [
  { id: 'xs',     label: '20×15×10',  innerLengthCm: 20,  innerWidthCm: 15, innerHeightCm: 10, volumeLiters: 3,   palletModule: '1/32' },
  { id: 's',      label: '30×20×15',  innerLengthCm: 30,  innerWidthCm: 20, innerHeightCm: 15, volumeLiters: 9,   palletModule: '1/16' },
  { id: 'm',      label: '40×30×20',  innerLengthCm: 40,  innerWidthCm: 30, innerHeightCm: 20, volumeLiters: 24,  palletModule: '1/4'  },
  { id: 'm-tall', label: '40×30×30',  innerLengthCm: 40,  innerWidthCm: 30, innerHeightCm: 30, volumeLiters: 36,  palletModule: '1/4'  },
  { id: 'l',      label: '50×40×30',  innerLengthCm: 50,  innerWidthCm: 40, innerHeightCm: 30, volumeLiters: 60,  palletModule: '—'    },
  { id: 'euro',   label: '60×40×30',  innerLengthCm: 60,  innerWidthCm: 40, innerHeightCm: 30, volumeLiters: 72,  palletModule: '1/2'  },
  { id: 'euro-l', label: '60×40×40',  innerLengthCm: 60,  innerWidthCm: 40, innerHeightCm: 40, volumeLiters: 96,  palletModule: '1/2'  },
  { id: 'xl',     label: '80×60×40',  innerLengthCm: 80,  innerWidthCm: 60, innerHeightCm: 40, volumeLiters: 192, palletModule: '1/1'  },
  { id: 'xxl',    label: '120×60×60', innerLengthCm: 120, innerWidthCm: 60, innerHeightCm: 60, volumeLiters: 432, palletModule: '1/1'  },
];

export interface CarrierParcelLimit {
  id: string;
  label: string;
  maxLengthCm: number;
  maxWidthCm: number;
  maxHeightCm: number;
  maxGirthCm: number;
  maxWeightKg: number;
}

export const CARRIER_LIMITS: CarrierParcelLimit[] = [
  // Europe
  { id: 'dhl',       label: 'DHL Paket',    maxLengthCm: 120, maxWidthCm: 60,  maxHeightCm: 60,  maxGirthCm: 360, maxWeightKg: 31.5 },
  { id: 'dpd',       label: 'DPD',          maxLengthCm: 175, maxWidthCm: 100, maxHeightCm: 100, maxGirthCm: 300, maxWeightKg: 31.5 },
  { id: 'gls',       label: 'GLS',          maxLengthCm: 200, maxWidthCm: 80,  maxHeightCm: 60,  maxGirthCm: 300, maxWeightKg: 40   },
  { id: 'hermes',    label: 'Hermes/Evri',  maxLengthCm: 120, maxWidthCm: 60,  maxHeightCm: 60,  maxGirthCm: 300, maxWeightKg: 31.5 },
  { id: 'dhl_exp',   label: 'DHL Express',  maxLengthCm: 120, maxWidthCm: 80,  maxHeightCm: 80,  maxGirthCm: 300, maxWeightKg: 70   },
  { id: 'colissimo', label: 'Colissimo',    maxLengthCm: 150, maxWidthCm: 100, maxHeightCm: 100, maxGirthCm: 300, maxWeightKg: 30   },
  { id: 'postnl',    label: 'PostNL',       maxLengthCm: 176, maxWidthCm: 78,  maxHeightCm: 58,  maxGirthCm: 300, maxWeightKg: 30   },
  { id: 'royalmail', label: 'Royal Mail',   maxLengthCm: 150, maxWidthCm: 45,  maxHeightCm: 45,  maxGirthCm: 300, maxWeightKg: 30   },
  // International
  { id: 'ups',       label: 'UPS',          maxLengthCm: 274, maxWidthCm: 150, maxHeightCm: 150, maxGirthCm: 400, maxWeightKg: 70   },
  { id: 'fedex',     label: 'FedEx',        maxLengthCm: 274, maxWidthCm: 150, maxHeightCm: 150, maxGirthCm: 330, maxWeightKg: 68   },
  { id: 'usps',      label: 'USPS',         maxLengthCm: 274, maxWidthCm: 152, maxHeightCm: 152, maxGirthCm: 330, maxWeightKg: 31.75},
  { id: 'canadapost',label: 'Canada Post',  maxLengthCm: 200, maxWidthCm: 150, maxHeightCm: 150, maxGirthCm: 300, maxWeightKg: 30   },
  { id: 'auspost',   label: 'Australia Post',maxLengthCm: 105, maxWidthCm: 105, maxHeightCm: 105, maxGirthCm: 400, maxWeightKg: 22  },
];

export interface CarrierComplianceResult {
  carrierId: string;
  carrierLabel: string;
  fits: boolean;
  reason?: string;
}

export interface CartonFitResult {
  carton: ShippingCartonSpec;
  unitsPerCarton: number;
  layoutDesc: string;
  cartonsNeeded: number;
  lastCartonUnits: number;
  lastCartonFillPct: number;
  cartonWeightKg: number | null;
  carrierCompliance: CarrierComplianceResult[];
}

const CARTON_TARE_WEIGHT_KG = 0.5;

export function calculateCartonFit(
  unitDims: Dimensions,
  quantity: number,
  unitWeightGrams: number | null,
): CartonFitResult[] {
  const results: CartonFitResult[] = [];

  for (const carton of SHIPPING_CARTONS) {
    // Try 2 upright orientations of the unit on the carton base
    const orientations: [number, number, number][] = [
      [unitDims.widthCm, unitDims.depthCm, unitDims.heightCm],
      [unitDims.depthCm, unitDims.widthCm, unitDims.heightCm],
    ];

    let bestUnitsPerLayer = 0;
    let bestLayers = 0;
    let bestLayoutCols = '';

    for (const [dimA, dimB, dimH] of orientations) {
      const colsA = Math.floor(carton.innerLengthCm / dimA);
      const colsB = Math.floor(carton.innerWidthCm / dimB);
      const layers = Math.floor(carton.innerHeightCm / dimH);
      const unitsPerLayer = colsA * colsB;

      if (unitsPerLayer > 0 && layers > 0 && unitsPerLayer * layers > bestUnitsPerLayer * bestLayers) {
        bestUnitsPerLayer = unitsPerLayer;
        bestLayers = layers;
        bestLayoutCols = `${colsA}×${colsB}`;
      }
    }

    const unitsPerCarton = bestUnitsPerLayer * bestLayers;
    if (unitsPerCarton < 1) continue;

    const layoutDesc = `${bestLayoutCols} × ${bestLayers}`;
    const cartonsNeeded = Math.ceil(quantity / unitsPerCarton);
    const lastCartonUnits = quantity % unitsPerCarton || unitsPerCarton;
    const lastCartonFillPct = (lastCartonUnits / unitsPerCarton) * 100;

    const cartonWeightKg = unitWeightGrams != null
      ? (unitsPerCarton * unitWeightGrams) / 1000 + CARTON_TARE_WEIGHT_KG
      : null;

    // Check carrier compliance
    const girth = carton.innerLengthCm + 2 * carton.innerWidthCm + 2 * carton.innerHeightCm;
    const carrierCompliance: CarrierComplianceResult[] = CARRIER_LIMITS.map((carrier) => {
      // Sort carton dimensions descending for proper comparison
      const sorted = [carton.innerLengthCm, carton.innerWidthCm, carton.innerHeightCm].sort((a, b) => b - a);
      const [longest, mid, shortest] = sorted;

      if (longest > carrier.maxLengthCm) {
        return { carrierId: carrier.id, carrierLabel: carrier.label, fits: false, reason: `Length ${longest} > ${carrier.maxLengthCm} cm` };
      }
      if (mid > carrier.maxWidthCm) {
        return { carrierId: carrier.id, carrierLabel: carrier.label, fits: false, reason: `Width ${mid} > ${carrier.maxWidthCm} cm` };
      }
      if (shortest > carrier.maxHeightCm) {
        return { carrierId: carrier.id, carrierLabel: carrier.label, fits: false, reason: `Height ${shortest} > ${carrier.maxHeightCm} cm` };
      }
      if (girth > carrier.maxGirthCm) {
        return { carrierId: carrier.id, carrierLabel: carrier.label, fits: false, reason: `Girth ${girth} > ${carrier.maxGirthCm} cm` };
      }
      if (cartonWeightKg != null && cartonWeightKg > carrier.maxWeightKg) {
        return { carrierId: carrier.id, carrierLabel: carrier.label, fits: false, reason: `Weight ${cartonWeightKg.toFixed(1)} > ${carrier.maxWeightKg} kg` };
      }
      return { carrierId: carrier.id, carrierLabel: carrier.label, fits: true };
    });

    results.push({
      carton,
      unitsPerCarton,
      layoutDesc,
      cartonsNeeded,
      lastCartonUnits,
      lastCartonFillPct,
      cartonWeightKg,
      carrierCompliance,
    });
  }

  // Sort by fewest cartons needed (most efficient first)
  results.sort((a, b) => a.cartonsNeeded - b.cartonsNeeded);
  return results;
}

// ─── Batch Space Summary ──────────────────────────────────────

export interface BatchSpaceSummary {
  volume: VolumeResult;
  dimensions: Dimensions;
  dimensionSource: 'packaging' | 'product';
  pallet: PalletCalculation;
  containers: Record<ContainerType, ContainerCalculation>;
  cartons: CartonFitResult[];
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

  // Shipping carton calculation
  const cartons = calculateCartonFit(resolved.dimensions, quantity, unitWeightGrams);

  return {
    volume,
    dimensions: resolved.dimensions,
    dimensionSource: resolved.source,
    pallet,
    containers,
    cartons,
    totalWeightKg,
    unitWeightGrams,
    warnings,
  };
}
