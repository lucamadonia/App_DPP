/**
 * Supabase Product Packaging Service
 *
 * CRUD operations for product packaging layers (primary, secondary, tertiary, transport)
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { ProductPackaging, PackagingType, PackagingLayerType } from '@/types/product';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformPackaging(row: any): ProductPackaging {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    productId: row.product_id,
    layerType: row.layer_type as PackagingLayerType,
    sortOrder: row.sort_order ?? 0,
    packagingType: (row.packaging_type as PackagingType) || undefined,
    packagingDescription: row.packaging_description || undefined,
    heightCm: row.height_cm != null ? Number(row.height_cm) : undefined,
    widthCm: row.width_cm != null ? Number(row.width_cm) : undefined,
    depthCm: row.depth_cm != null ? Number(row.depth_cm) : undefined,
    weightG: row.weight_g != null ? Number(row.weight_g) : undefined,
    material: row.material || undefined,
    recyclable: row.recyclable ?? false,
    recyclingCode: row.recycling_code || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get all packaging layers for a product
 */
export async function getProductPackaging(productId: string): Promise<ProductPackaging[]> {
  const { data, error } = await supabase
    .from('product_packaging')
    .select('*')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Failed to load product packaging:', error);
    return [];
  }

  return (data || []).map(transformPackaging);
}

/**
 * Get a single packaging layer by ID
 */
export async function getPackagingById(id: string): Promise<ProductPackaging | null> {
  const { data, error } = await supabase
    .from('product_packaging')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return transformPackaging(data);
}

/**
 * Create a new packaging layer
 */
export async function createPackaging(
  packaging: Partial<ProductPackaging> & { productId: string; layerType: PackagingLayerType }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  // Get current max sort_order for this product
  const { data: existing } = await supabase
    .from('product_packaging')
    .select('sort_order')
    .eq('product_id', packaging.productId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existing && existing.length > 0 ? (existing[0].sort_order ?? 0) + 1 : 0;

  const insertData = {
    tenant_id: tenantId,
    product_id: packaging.productId,
    layer_type: packaging.layerType,
    sort_order: packaging.sortOrder ?? nextSortOrder,
    packaging_type: packaging.packagingType || null,
    packaging_description: packaging.packagingDescription || null,
    height_cm: packaging.heightCm ?? null,
    width_cm: packaging.widthCm ?? null,
    depth_cm: packaging.depthCm ?? null,
    weight_g: packaging.weightG ?? null,
    material: packaging.material || null,
    recyclable: packaging.recyclable ?? false,
    recycling_code: packaging.recyclingCode || null,
  };

  const { data, error } = await supabase
    .from('product_packaging')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create packaging:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data?.id };
}

/**
 * Update a packaging layer
 */
export async function updatePackaging(
  id: string,
  packaging: Partial<ProductPackaging>
): Promise<{ success: boolean; error?: string }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (packaging.layerType !== undefined) updateData.layer_type = packaging.layerType;
  if (packaging.sortOrder !== undefined) updateData.sort_order = packaging.sortOrder;
  if (packaging.packagingType !== undefined) updateData.packaging_type = packaging.packagingType || null;
  if (packaging.packagingDescription !== undefined) updateData.packaging_description = packaging.packagingDescription || null;
  if (packaging.heightCm !== undefined) updateData.height_cm = packaging.heightCm ?? null;
  if (packaging.widthCm !== undefined) updateData.width_cm = packaging.widthCm ?? null;
  if (packaging.depthCm !== undefined) updateData.depth_cm = packaging.depthCm ?? null;
  if (packaging.weightG !== undefined) updateData.weight_g = packaging.weightG ?? null;
  if (packaging.material !== undefined) updateData.material = packaging.material || null;
  if (packaging.recyclable !== undefined) updateData.recyclable = packaging.recyclable;
  if (packaging.recyclingCode !== undefined) updateData.recycling_code = packaging.recyclingCode || null;

  const { error } = await supabase
    .from('product_packaging')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update packaging:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a packaging layer
 */
export async function deletePackaging(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('product_packaging')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete packaging:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder packaging layers for a product
 */
export async function reorderPackaging(
  productId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await supabase
        .from('product_packaging')
        .update({ sort_order: i, updated_at: new Date().toISOString() })
        .eq('id', orderedIds[i])
        .eq('product_id', productId);
    }
    return { success: true };
  } catch (err) {
    console.error('Failed to reorder packaging:', err);
    return { success: false, error: 'Failed to reorder packaging layers' };
  }
}

/**
 * Duplicate all packaging layers from one product to another
 */
export async function duplicateProductPackaging(
  sourceProductId: string,
  targetProductId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, count: 0, error: 'No tenant set' };
  }

  const existing = await getProductPackaging(sourceProductId);
  if (existing.length === 0) {
    return { success: true, count: 0 };
  }

  const inserts = existing.map((p, i) => ({
    tenant_id: tenantId,
    product_id: targetProductId,
    layer_type: p.layerType,
    sort_order: i,
    packaging_type: p.packagingType || null,
    packaging_description: p.packagingDescription || null,
    height_cm: p.heightCm ?? null,
    width_cm: p.widthCm ?? null,
    depth_cm: p.depthCm ?? null,
    weight_g: p.weightG ?? null,
    material: p.material || null,
    recyclable: p.recyclable ?? false,
    recycling_code: p.recyclingCode || null,
  }));

  const { error } = await supabase.from('product_packaging').insert(inserts);

  if (error) {
    console.error('Failed to duplicate packaging:', error);
    return { success: false, count: 0, error: error.message };
  }

  return { success: true, count: existing.length };
}
