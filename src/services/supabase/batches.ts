/**
 * Supabase Product Batches Service
 *
 * CRUD operations for product batches (Chargen) with RLS
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  ProductBatch,
  BatchListItem,
  Material,
  Certification,
  CarbonFootprint,
  RecyclabilityInfo,
  PackagingType,
} from '@/types/product';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBatch(row: any): ProductBatch {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    batchNumber: row.batch_number || undefined,
    serialNumber: row.serial_number,
    productionDate: row.production_date,
    expirationDate: row.expiration_date || undefined,
    netWeight: row.net_weight != null ? Number(row.net_weight) : undefined,
    grossWeight: row.gross_weight != null ? Number(row.gross_weight) : undefined,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    pricePerUnit: row.price_per_unit != null ? Number(row.price_per_unit) : undefined,
    currency: row.currency || undefined,
    supplierId: row.supplier_id || undefined,
    supplierName: row.suppliers?.name || undefined,
    status: row.status || 'draft',
    notes: row.notes || undefined,
    materialsOverride: row.materials_override as Material[] | undefined,
    certificationsOverride: row.certifications_override as Certification[] | undefined,
    carbonFootprintOverride: row.carbon_footprint_override as CarbonFootprint | undefined,
    recyclabilityOverride: row.recyclability_override as RecyclabilityInfo | undefined,
    descriptionOverride: row.description_override || undefined,
    // Dimensions & Packaging overrides
    productHeightCm: row.product_height_cm != null ? Number(row.product_height_cm) : undefined,
    productWidthCm: row.product_width_cm != null ? Number(row.product_width_cm) : undefined,
    productDepthCm: row.product_depth_cm != null ? Number(row.product_depth_cm) : undefined,
    packagingType: (row.packaging_type as PackagingType) || undefined,
    packagingDescription: row.packaging_description || undefined,
    packagingHeightCm: row.packaging_height_cm != null ? Number(row.packaging_height_cm) : undefined,
    packagingWidthCm: row.packaging_width_cm != null ? Number(row.packaging_width_cm) : undefined,
    packagingDepthCm: row.packaging_depth_cm != null ? Number(row.packaging_depth_cm) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformBatchListItem(row: any): BatchListItem {
  const hasOverrides = !!(
    row.materials_override ||
    row.certifications_override ||
    row.carbon_footprint_override ||
    row.recyclability_override ||
    row.description_override ||
    row.product_height_cm != null ||
    row.product_width_cm != null ||
    row.product_depth_cm != null ||
    row.packaging_type ||
    row.packaging_description ||
    row.packaging_height_cm != null ||
    row.packaging_width_cm != null ||
    row.packaging_depth_cm != null
  );

  return {
    id: row.id,
    productId: row.product_id,
    batchNumber: row.batch_number || undefined,
    serialNumber: row.serial_number,
    productionDate: row.production_date,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    pricePerUnit: row.price_per_unit != null ? Number(row.price_per_unit) : undefined,
    currency: row.currency || undefined,
    supplierId: row.supplier_id || undefined,
    supplierName: row.suppliers?.name || undefined,
    status: row.status || 'draft',
    hasOverrides,
    createdAt: row.created_at,
    productHeightCm: row.product_height_cm != null ? Number(row.product_height_cm) : undefined,
    productWidthCm: row.product_width_cm != null ? Number(row.product_width_cm) : undefined,
    productDepthCm: row.product_depth_cm != null ? Number(row.product_depth_cm) : undefined,
    netWeight: row.net_weight != null ? Number(row.net_weight) : undefined,
    grossWeight: row.gross_weight != null ? Number(row.gross_weight) : undefined,
  };
}

/**
 * Get all batches for a product
 */
export async function getBatches(productId: string): Promise<BatchListItem[]> {
  const { data, error } = await supabase
    .from('product_batches')
    .select('*, suppliers(name)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load batches:', error);
    return [];
  }

  return (data || []).map(transformBatchListItem);
}

/**
 * Get a single batch by ID
 */
export async function getBatchById(id: string): Promise<ProductBatch | null> {
  const { data, error } = await supabase
    .from('product_batches')
    .select('*, suppliers(name)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return transformBatch(data);
}

/**
 * Get a batch by product_id and serial_number (for public DPP lookup)
 */
export async function getBatchByProductAndSerial(
  productId: string,
  serialNumber: string
): Promise<ProductBatch | null> {
  const { data, error } = await supabase
    .from('product_batches')
    .select('*')
    .eq('product_id', productId)
    .eq('serial_number', serialNumber)
    .single();

  if (error || !data) {
    return null;
  }

  return transformBatch(data);
}

/**
 * Create a new batch
 */
export async function createBatch(
  batch: Partial<ProductBatch> & { productId: string; serialNumber: string; productionDate: string }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  // Billing quota check
  const { checkQuota } = await import('./billing');
  const quota = await checkQuota('batch', { tenantId, productId: batch.productId });
  if (!quota.allowed) {
    return { success: false, error: `Batch limit reached (${quota.current}/${quota.limit}). Please upgrade your plan.` };
  }

  const insertData = {
    tenant_id: tenantId,
    product_id: batch.productId,
    batch_number: batch.batchNumber || null,
    serial_number: batch.serialNumber,
    production_date: batch.productionDate,
    expiration_date: batch.expirationDate || null,
    net_weight: batch.netWeight ?? null,
    gross_weight: batch.grossWeight ?? null,
    quantity: batch.quantity ?? null,
    price_per_unit: batch.pricePerUnit ?? null,
    currency: batch.currency || null,
    supplier_id: batch.supplierId || null,
    status: batch.status || 'draft',
    notes: batch.notes || null,
    materials_override: batch.materialsOverride || null,
    certifications_override: batch.certificationsOverride || null,
    carbon_footprint_override: batch.carbonFootprintOverride || null,
    recyclability_override: batch.recyclabilityOverride || null,
    description_override: batch.descriptionOverride || null,
    // Dimensions & Packaging overrides
    product_height_cm: batch.productHeightCm ?? null,
    product_width_cm: batch.productWidthCm ?? null,
    product_depth_cm: batch.productDepthCm ?? null,
    packaging_type: batch.packagingType || null,
    packaging_description: batch.packagingDescription || null,
    packaging_height_cm: batch.packagingHeightCm ?? null,
    packaging_width_cm: batch.packagingWidthCm ?? null,
    packaging_depth_cm: batch.packagingDepthCm ?? null,
  };

  const { data, error } = await supabase
    .from('product_batches')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create batch:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data?.id };
}

/**
 * Update a batch
 */
export async function updateBatch(
  id: string,
  batch: Partial<ProductBatch>
): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};

  if (batch.batchNumber !== undefined) updateData.batch_number = batch.batchNumber || null;
  if (batch.serialNumber !== undefined) updateData.serial_number = batch.serialNumber;
  if (batch.productionDate !== undefined) updateData.production_date = batch.productionDate;
  if (batch.expirationDate !== undefined) updateData.expiration_date = batch.expirationDate || null;
  if (batch.netWeight !== undefined) updateData.net_weight = batch.netWeight ?? null;
  if (batch.grossWeight !== undefined) updateData.gross_weight = batch.grossWeight ?? null;
  if (batch.quantity !== undefined) updateData.quantity = batch.quantity ?? null;
  if (batch.pricePerUnit !== undefined) updateData.price_per_unit = batch.pricePerUnit ?? null;
  if (batch.currency !== undefined) updateData.currency = batch.currency || null;
  if (batch.supplierId !== undefined) updateData.supplier_id = batch.supplierId || null;
  if (batch.status !== undefined) updateData.status = batch.status;
  if (batch.notes !== undefined) updateData.notes = batch.notes || null;
  if (batch.materialsOverride !== undefined) updateData.materials_override = batch.materialsOverride || null;
  if (batch.certificationsOverride !== undefined) updateData.certifications_override = batch.certificationsOverride || null;
  if (batch.carbonFootprintOverride !== undefined) updateData.carbon_footprint_override = batch.carbonFootprintOverride || null;
  if (batch.recyclabilityOverride !== undefined) updateData.recyclability_override = batch.recyclabilityOverride || null;
  if (batch.descriptionOverride !== undefined) updateData.description_override = batch.descriptionOverride || null;
  // Dimensions & Packaging overrides
  if (batch.productHeightCm !== undefined) updateData.product_height_cm = batch.productHeightCm ?? null;
  if (batch.productWidthCm !== undefined) updateData.product_width_cm = batch.productWidthCm ?? null;
  if (batch.productDepthCm !== undefined) updateData.product_depth_cm = batch.productDepthCm ?? null;
  if (batch.packagingType !== undefined) updateData.packaging_type = batch.packagingType || null;
  if (batch.packagingDescription !== undefined) updateData.packaging_description = batch.packagingDescription || null;
  if (batch.packagingHeightCm !== undefined) updateData.packaging_height_cm = batch.packagingHeightCm ?? null;
  if (batch.packagingWidthCm !== undefined) updateData.packaging_width_cm = batch.packagingWidthCm ?? null;
  if (batch.packagingDepthCm !== undefined) updateData.packaging_depth_cm = batch.packagingDepthCm ?? null;

  const { error } = await supabase
    .from('product_batches')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update batch:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a batch
 */
export async function deleteBatch(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('product_batches')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete batch:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Duplicate a batch with a new serial number
 */
export async function duplicateBatch(
  batchId: string,
  newSerialNumber: string,
  newBatchNumber?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const existing = await getBatchById(batchId);
  if (!existing) {
    return { success: false, error: 'Batch not found' };
  }

  return createBatch({
    productId: existing.productId,
    serialNumber: newSerialNumber,
    batchNumber: newBatchNumber || existing.batchNumber,
    productionDate: existing.productionDate,
    expirationDate: existing.expirationDate,
    netWeight: existing.netWeight,
    grossWeight: existing.grossWeight,
    quantity: existing.quantity,
    pricePerUnit: existing.pricePerUnit,
    currency: existing.currency,
    supplierId: existing.supplierId,
    status: 'draft',
    notes: existing.notes,
    materialsOverride: existing.materialsOverride,
    certificationsOverride: existing.certificationsOverride,
    carbonFootprintOverride: existing.carbonFootprintOverride,
    recyclabilityOverride: existing.recyclabilityOverride,
    descriptionOverride: existing.descriptionOverride,
    // Dimensions & Packaging overrides
    productHeightCm: existing.productHeightCm,
    productWidthCm: existing.productWidthCm,
    productDepthCm: existing.productDepthCm,
    packagingType: existing.packagingType,
    packagingDescription: existing.packagingDescription,
    packagingHeightCm: existing.packagingHeightCm,
    packagingWidthCm: existing.packagingWidthCm,
    packagingDepthCm: existing.packagingDepthCm,
  });
}

/**
 * Get batch count for a product
 */
export async function getBatchCount(productId: string): Promise<number> {
  const { count, error } = await supabase
    .from('product_batches')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId);

  if (error) {
    return 0;
  }

  return count || 0;
}

/**
 * Get batch stats for a product
 */
export async function getBatchStats(productId: string): Promise<{
  total: number;
  draft: number;
  live: number;
  archived: number;
}> {
  const { data, error } = await supabase
    .from('product_batches')
    .select('status')
    .eq('product_id', productId);

  if (error || !data) {
    return { total: 0, draft: 0, live: 0, archived: 0 };
  }

  return {
    total: data.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    draft: data.filter((b: any) => b.status === 'draft').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    live: data.filter((b: any) => b.status === 'live').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    archived: data.filter((b: any) => b.status === 'archived').length,
  };
}

/**
 * Get all batches across all products for the current tenant (for DPP overview)
 */
export async function getAllBatches(): Promise<Array<BatchListItem & { productName: string; gtin: string }>> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('product_batches')
    .select('*, products!inner(name, gtin), suppliers(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load all batches:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    ...transformBatchListItem(row),
    productName: row.products.name,
    gtin: row.products.gtin,
  }));
}

// ============================================
// OUTSTANDING GOODS RECEIPTS
// ============================================

export interface OutstandingBatch {
  batchId: string;
  productId: string;
  productName: string;
  productGtin: string;
  batchSerial: string;
  batchNumber?: string;
  productionDate: string;
  expirationDate?: string;
  status: 'draft' | 'live' | 'archived';
  supplierId?: string;
  supplierName?: string;
  ordered: number;
  received: number;
  outstanding: number;
  receivedPercent: number;
  lastReceiptAt?: string;
  daysOutstanding: number;
}

/**
 * Batches where the ordered quantity is greater than what has been
 * received (sum across all wh_stock_levels rows).
 *
 * Sorted oldest-first so old supplier issues bubble up.
 *
 * Includes only batches with status='live' by default since draft/archived
 * are not actionable.
 */
export async function getOutstandingBatches(opts?: {
  includeAllStatuses?: boolean;
}): Promise<OutstandingBatch[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  // 1. Pull batches with a non-null positive quantity (otherwise
  //    "outstanding" can't be computed).
  let batchQuery = supabase
    .from('product_batches')
    .select('id, product_id, batch_number, serial_number, production_date, expiration_date, quantity, status, supplier_id, products!inner(name, gtin), suppliers(name)')
    .eq('tenant_id', tenantId)
    .not('quantity', 'is', null)
    .gt('quantity', 0);

  if (!opts?.includeAllStatuses) {
    batchQuery = batchQuery.eq('status', 'live');
  }

  const { data: batches, error: batchErr } = await batchQuery;
  if (batchErr || !batches?.length) {
    if (batchErr) console.error('Failed to load batches for outstanding:', batchErr);
    return [];
  }

  const batchIds = batches.map(b => b.id);

  // 2. Pull stock totals for those batches
  const { data: stockRows } = await supabase
    .from('wh_stock_levels')
    .select('batch_id, quantity_available, quantity_reserved, quantity_damaged, quantity_quarantine')
    .eq('tenant_id', tenantId)
    .in('batch_id', batchIds);

  // 3. Pull last goods_receipt transaction date per batch
  const { data: txRows } = await supabase
    .from('wh_stock_transactions')
    .select('batch_id, created_at, type')
    .eq('tenant_id', tenantId)
    .eq('type', 'goods_receipt')
    .in('batch_id', batchIds)
    .order('created_at', { ascending: false });

  const stockByBatch = new Map<string, number>();
  for (const row of stockRows || []) {
    const total =
      (row.quantity_available || 0) +
      (row.quantity_reserved || 0) +
      (row.quantity_damaged || 0) +
      (row.quantity_quarantine || 0);
    stockByBatch.set(row.batch_id, (stockByBatch.get(row.batch_id) || 0) + total);
  }

  const lastReceiptByBatch = new Map<string, string>();
  for (const row of txRows || []) {
    if (!lastReceiptByBatch.has(row.batch_id)) {
      lastReceiptByBatch.set(row.batch_id, row.created_at);
    }
  }

  const now = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: OutstandingBatch[] = (batches as any[])
    .map(b => {
      const ordered = Number(b.quantity);
      const received = stockByBatch.get(b.id) || 0;
      const outstanding = ordered - received;
      const productionDate = b.production_date;
      const daysOutstanding = productionDate
        ? Math.max(0, Math.floor((now - new Date(productionDate).getTime()) / 86400000))
        : 0;
      return {
        batchId: b.id,
        productId: b.product_id,
        productName: b.products?.name || '',
        productGtin: b.products?.gtin || '',
        batchSerial: b.serial_number,
        batchNumber: b.batch_number || undefined,
        productionDate,
        expirationDate: b.expiration_date || undefined,
        status: b.status as 'draft' | 'live' | 'archived',
        supplierId: b.supplier_id || undefined,
        supplierName: b.suppliers?.name || undefined,
        ordered,
        received,
        outstanding,
        receivedPercent: ordered > 0 ? Math.round((received / ordered) * 100) : 0,
        lastReceiptAt: lastReceiptByBatch.get(b.id),
        daysOutstanding,
      };
    })
    .filter(b => b.outstanding > 0)
    .sort((a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime());

  return result;
}

export interface SupplierBatchCost {
  supplierId: string;
  supplierName: string;
  totalBatches: number;
  totalQuantity: number;
  totalCost: number;
  currency: string;
  avgPricePerUnit: number;
}

/**
 * Get batch costs aggregated by supplier for a product
 */
export async function getBatchCostsBySupplier(productId: string): Promise<SupplierBatchCost[]> {
  const { data, error } = await supabase
    .from('product_batches')
    .select('quantity, price_per_unit, currency, supplier_id, suppliers(name)')
    .eq('product_id', productId)
    .not('supplier_id', 'is', null);

  if (error || !data) {
    console.error('Failed to load batch costs:', error);
    return [];
  }

  const grouped = new Map<string, { name: string; batches: number; qty: number; cost: number; currency: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of data as any[]) {
    const sid = row.supplier_id as string;
    const sname = row.suppliers?.name || 'Unknown';
    const qty = Number(row.quantity) || 0;
    const ppu = Number(row.price_per_unit) || 0;
    const cur = (row.currency as string) || 'EUR';
    const existing = grouped.get(sid);
    if (existing) {
      existing.batches += 1;
      existing.qty += qty;
      existing.cost += ppu * qty;
    } else {
      grouped.set(sid, { name: sname, batches: 1, qty, cost: ppu * qty, currency: cur });
    }
  }

  return Array.from(grouped.entries()).map(([supplierId, v]) => ({
    supplierId,
    supplierName: v.name,
    totalBatches: v.batches,
    totalQuantity: v.qty,
    totalCost: v.cost,
    currency: v.currency,
    avgPricePerUnit: v.qty > 0 ? v.cost / v.qty : 0,
  }));
}
