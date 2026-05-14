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
}

export interface GtinLookupResult {
  product: ScannerProduct;
  batches: ScannerBatch[];
}

export interface GtinSerialLookupResult {
  product: ScannerProduct;
  batch: ScannerBatch;
  stockLevels: WhStockLevel[];
}

export interface SerialLookupResult {
  product: ScannerProduct;
  batch: ScannerBatch;
  stockLevels: WhStockLevel[];
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
 * Build GTIN candidates so a scanned code matches both EAN-13 and GTIN-14
 * storage forms. Mirrors `buildGtinCandidates` in barcode-parser.ts.
 */
function gtinLookupCandidates(gtin: string): string[] {
  const set = new Set<string>();
  if (!gtin) return [];
  set.add(gtin);
  if (gtin.length === 14) {
    set.add(gtin.slice(1));     // drop indicator (standard)
    set.add(gtin.slice(0, 13)); // EAN-13 stored as first 13 digits of GTIN-14
  }
  if (gtin.length === 13) {
    set.add('0' + gtin);
    set.add(gtin + '0');
  }
  if (gtin.length === 8) {
    set.add(gtin.padStart(13, '0'));
    set.add(gtin.padStart(14, '0'));
  }
  return Array.from(set);
}

/**
 * Lookup product by GTIN only (e.g., EAN-13 barcode scan)
 * Returns product + all live batches
 */
export async function lookupByGtin(gtin: string): Promise<GtinLookupResult | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const candidates = gtinLookupCandidates(gtin);

  const { data: product } = await supabase
    .from('products')
    .select('id, name, gtin, image_url, manufacturer, category')
    .eq('tenant_id', tenantId)
    .in('gtin', candidates)
    .maybeSingle();

  if (!product) return null;

  const { data: batches } = await supabase
    .from('product_batches')
    .select('id, serial_number, batch_number, status, quantity, production_date, expiration_date')
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
 * Returns product + batch + current stock levels
 */
export async function lookupByGtinSerial(gtin: string, serial: string): Promise<GtinSerialLookupResult | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const candidates = gtinLookupCandidates(gtin);

  const { data: product } = await supabase
    .from('products')
    .select('id, name, gtin, image_url, manufacturer, category')
    .eq('tenant_id', tenantId)
    .in('gtin', candidates)
    .maybeSingle();

  if (!product) return null;

  const { data: batch } = await supabase
    .from('product_batches')
    .select('id, serial_number, batch_number, status, quantity, production_date, expiration_date')
    .eq('tenant_id', tenantId)
    .eq('product_id', product.id)
    .eq('serial_number', serial)
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
  };
}

/**
 * Lookup by serial number directly (fallback when no GTIN)
 */
export async function lookupBySerial(serial: string): Promise<SerialLookupResult | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data: batch } = await supabase
    .from('product_batches')
    .select('id, serial_number, batch_number, status, quantity, production_date, expiration_date, product_id')
    .eq('tenant_id', tenantId)
    .eq('serial_number', serial)
    .maybeSingle();

  if (!batch) return null;

  const { data: product } = await supabase
    .from('products')
    .select('id, name, gtin, image_url, manufacturer, category')
    .eq('id', batch.product_id)
    .single();

  if (!product) return null;

  const { data: stockRows } = await supabase
    .from('wh_stock_levels')
    .select('*, products(name), product_batches(serial_number), wh_locations(name, code)')
    .eq('tenant_id', tenantId)
    .eq('batch_id', batch.id);

  return {
    product: transformScannerProduct(product),
    batch: transformScannerBatch(batch),
    stockLevels: (stockRows || []).map(transformStockLevel),
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
