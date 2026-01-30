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
    status: row.status || 'draft',
    notes: row.notes || undefined,
    materialsOverride: row.materials_override as Material[] | undefined,
    certificationsOverride: row.certifications_override as Certification[] | undefined,
    carbonFootprintOverride: row.carbon_footprint_override as CarbonFootprint | undefined,
    recyclabilityOverride: row.recyclability_override as RecyclabilityInfo | undefined,
    descriptionOverride: row.description_override || undefined,
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
    row.description_override
  );

  return {
    id: row.id,
    productId: row.product_id,
    batchNumber: row.batch_number || undefined,
    serialNumber: row.serial_number,
    productionDate: row.production_date,
    status: row.status || 'draft',
    hasOverrides,
    createdAt: row.created_at,
  };
}

/**
 * Get all batches for a product
 */
export async function getBatches(productId: string): Promise<BatchListItem[]> {
  const { data, error } = await supabase
    .from('product_batches')
    .select('*')
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
    .select('*')
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
    status: batch.status || 'draft',
    notes: batch.notes || null,
    materials_override: batch.materialsOverride || null,
    certifications_override: batch.certificationsOverride || null,
    carbon_footprint_override: batch.carbonFootprintOverride || null,
    recyclability_override: batch.recyclabilityOverride || null,
    description_override: batch.descriptionOverride || null,
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
  if (batch.status !== undefined) updateData.status = batch.status;
  if (batch.notes !== undefined) updateData.notes = batch.notes || null;
  if (batch.materialsOverride !== undefined) updateData.materials_override = batch.materialsOverride || null;
  if (batch.certificationsOverride !== undefined) updateData.certifications_override = batch.certificationsOverride || null;
  if (batch.carbonFootprintOverride !== undefined) updateData.carbon_footprint_override = batch.carbonFootprintOverride || null;
  if (batch.recyclabilityOverride !== undefined) updateData.recyclability_override = batch.recyclabilityOverride || null;
  if (batch.descriptionOverride !== undefined) updateData.description_override = batch.descriptionOverride || null;

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
    status: 'draft',
    notes: existing.notes,
    materialsOverride: existing.materialsOverride,
    certificationsOverride: existing.certificationsOverride,
    carbonFootprintOverride: existing.carbonFootprintOverride,
    recyclabilityOverride: existing.recyclabilityOverride,
    descriptionOverride: existing.descriptionOverride,
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
    .select('*, products!inner(name, gtin)')
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
