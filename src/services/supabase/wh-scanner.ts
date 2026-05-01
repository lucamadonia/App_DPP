/**
 * Warehouse Scanner Service
 * Tenant-scoped lookups for barcode scanning + quick receipt/pick operations
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { WhStockLevel } from '@/types/warehouse';

export interface ScannerProduct {
  id: string;
  name: string;
  gtin: string;
  imageUrl?: string;
  manufacturer?: string;
  category?: string;
}

export interface ScannerBatch {
  id: string;
  serialNumber: string;
  batchNumber?: string;
  status: string;
  quantity?: number;
  productionDate: string;
  expirationDate?: string;
  unitTrackingEnabled?: boolean;
}

/**
 * Per-unit metadata included in lookup results when the scanned code
 * matches an inventory_units row (rather than a batch-level serial).
 */
export interface ScannerUnit {
  id: string;
  unitSerial: string;
  status: string;       // expected | received | shipped | ...
  locationId?: string;
  locationName?: string;
  binLocation?: string;
}

export interface GtinLookupResult {
  product: ScannerProduct;
  batches: ScannerBatch[];
}

export interface GtinSerialLookupResult {
  product: ScannerProduct;
  batch: ScannerBatch;
  stockLevels: WhStockLevel[];
  /** Set when the scanned (gtin, serial) matches an inventory_units row. */
  unit?: ScannerUnit;
}

export interface SerialLookupResult {
  product: ScannerProduct;
  batch: ScannerBatch;
  stockLevels: WhStockLevel[];
  /** Set when the scanned serial matches an inventory_units row (per-unit tracking). */
  unit?: ScannerUnit;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformScannerProduct(row: any): ScannerProduct {
  return {
    id: row.id,
    name: row.name,
    gtin: row.gtin,
    imageUrl: row.image_url || undefined,
    manufacturer: row.manufacturer || undefined,
    category: row.category || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformScannerBatch(row: any): ScannerBatch {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    batchNumber: row.batch_number || undefined,
    status: row.status,
    quantity: row.quantity || undefined,
    productionDate: row.production_date,
    expirationDate: row.expiration_date || undefined,
    unitTrackingEnabled: row.unit_tracking_enabled === true,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformScannerUnit(row: any): ScannerUnit {
  return {
    id: row.id,
    unitSerial: row.unit_serial,
    status: row.status,
    locationId: row.location_id || undefined,
    locationName: row.wh_locations?.name || undefined,
    binLocation: row.bin_location || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStockLevel(row: any): WhStockLevel {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    productId: row.product_id,
    batchId: row.batch_id,
    quantityAvailable: row.quantity_available,
    quantityReserved: row.quantity_reserved,
    quantityDamaged: row.quantity_damaged,
    quantityQuarantine: row.quantity_quarantine,
    binLocation: row.bin_location || undefined,
    zone: row.zone || undefined,
    reorderPoint: row.reorder_point != null ? Number(row.reorder_point) : undefined,
    reorderQuantity: row.reorder_quantity != null ? Number(row.reorder_quantity) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productName: row.products?.name || undefined,
    batchSerialNumber: row.product_batches?.serial_number || undefined,
    locationName: row.wh_locations?.name || undefined,
    locationCode: row.wh_locations?.code || undefined,
  };
}

/**
 * Lookup product by GTIN only (e.g., EAN-13 barcode scan)
 * Returns product + all live batches
 */
export async function lookupByGtin(gtin: string): Promise<GtinLookupResult | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data: product } = await supabase
    .from('products')
    .select('id, name, gtin, image_url, manufacturer, category')
    .eq('tenant_id', tenantId)
    .eq('gtin', gtin)
    .maybeSingle();

  if (!product) return null;

  const { data: batches } = await supabase
    .from('product_batches')
    .select('id, serial_number, batch_number, status, quantity, production_date, expiration_date, unit_tracking_enabled')
    .eq('tenant_id', tenantId)
    .eq('product_id', product.id)
    .eq('status', 'live')
    .order('created_at', { ascending: false });

  return {
    product: transformScannerProduct(product),
    batches: (batches || []).map(transformScannerBatch),
  };
}

/**
 * Lookup product + specific batch by GTIN + serial number (QR code / GS1 Digital Link)
 * Returns product + batch + current stock levels.
 *
 * Resolution order: per-unit serial first (inventory_units.unit_serial),
 * then batch-level serial (product_batches.serial_number).
 */
export async function lookupByGtinSerial(gtin: string, serial: string): Promise<GtinSerialLookupResult | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data: product } = await supabase
    .from('products')
    .select('id, name, gtin, image_url, manufacturer, category')
    .eq('tenant_id', tenantId)
    .eq('gtin', gtin)
    .maybeSingle();

  if (!product) return null;

  // 1. Try per-unit lookup first (inventory_units)
  const { data: unitRow } = await supabase
    .from('inventory_units')
    .select('id, unit_serial, status, location_id, bin_location, batch_id, product_id, wh_locations(name)')
    .eq('tenant_id', tenantId)
    .eq('product_id', product.id)
    .eq('unit_serial', serial)
    .maybeSingle();

  let batchId: string | null = null;
  let unit: ScannerUnit | undefined;

  if (unitRow) {
    batchId = unitRow.batch_id;
    unit = transformScannerUnit(unitRow);
  } else {
    // 2. Fall back to batch-level serial
    const { data: batchRow } = await supabase
      .from('product_batches')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('product_id', product.id)
      .eq('serial_number', serial)
      .maybeSingle();
    if (batchRow) batchId = batchRow.id;
  }

  if (!batchId) return null;

  const { data: batch } = await supabase
    .from('product_batches')
    .select('id, serial_number, batch_number, status, quantity, production_date, expiration_date, unit_tracking_enabled')
    .eq('id', batchId)
    .maybeSingle();

  if (!batch) return null;

  const { data: stockRows } = await supabase
    .from('wh_stock_levels')
    .select('*, products(name), product_batches(serial_number), wh_locations(name, code)')
    .eq('tenant_id', tenantId)
    .eq('batch_id', batch.id);

  return {
    product: transformScannerProduct(product),
    batch: transformScannerBatch(batch),
    stockLevels: (stockRows || []).map(transformStockLevel),
    unit,
  };
}

/**
 * Lookup by serial number directly (fallback when no GTIN).
 *
 * Resolution order: per-unit serial first (inventory_units.unit_serial),
 * then batch-level serial (product_batches.serial_number).
 */
export async function lookupBySerial(serial: string): Promise<SerialLookupResult | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  // 1. Try per-unit lookup first
  const { data: unitRow } = await supabase
    .from('inventory_units')
    .select('id, unit_serial, status, location_id, bin_location, batch_id, product_id, wh_locations(name)')
    .eq('tenant_id', tenantId)
    .eq('unit_serial', serial)
    .maybeSingle();

  let batchId: string | null = null;
  let productId: string | null = null;
  let unit: ScannerUnit | undefined;

  if (unitRow) {
    batchId = unitRow.batch_id;
    productId = unitRow.product_id;
    unit = transformScannerUnit(unitRow);
  } else {
    // 2. Fall back to batch-level serial
    const { data: batchRow } = await supabase
      .from('product_batches')
      .select('id, product_id')
      .eq('tenant_id', tenantId)
      .eq('serial_number', serial)
      .maybeSingle();
    if (batchRow) {
      batchId = batchRow.id;
      productId = batchRow.product_id;
    }
  }

  if (!batchId || !productId) return null;

  const [batchRes, productRes] = await Promise.all([
    supabase
      .from('product_batches')
      .select('id, serial_number, batch_number, status, quantity, production_date, expiration_date, unit_tracking_enabled')
      .eq('id', batchId)
      .single(),
    supabase
      .from('products')
      .select('id, name, gtin, image_url, manufacturer, category')
      .eq('id', productId)
      .single(),
  ]);

  if (!batchRes.data || !productRes.data) return null;

  const { data: stockRows } = await supabase
    .from('wh_stock_levels')
    .select('*, products(name), product_batches(serial_number), wh_locations(name, code)')
    .eq('tenant_id', tenantId)
    .eq('batch_id', batchRes.data.id);

  return {
    product: transformScannerProduct(productRes.data),
    batch: transformScannerBatch(batchRes.data),
    stockLevels: (stockRows || []).map(transformStockLevel),
    unit,
  };
}

/**
 * Quick stock pick (deduct stock for outbound/dispatch)
 */
export async function quickStockPick(params: {
  stockLevelId: string;
  quantity: number;
  notes?: string;
}): Promise<void> {
  const { createStockAdjustment } = await import('./wh-stock');
  await createStockAdjustment({
    stockId: params.stockLevelId,
    quantityChange: -params.quantity,
    reason: 'Scanner quick pick',
    notes: params.notes,
  });
}
