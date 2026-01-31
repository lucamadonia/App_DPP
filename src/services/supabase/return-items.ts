/**
 * Supabase Return Items Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhReturnItem } from '@/types/returns-hub';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformReturnItem(row: any): RhReturnItem {
  return {
    id: row.id,
    returnId: row.return_id,
    tenantId: row.tenant_id,
    productId: row.product_id || undefined,
    sku: row.sku || undefined,
    name: row.name,
    quantity: row.quantity,
    unitPrice: row.unit_price != null ? Number(row.unit_price) : undefined,
    batchNumber: row.batch_number || undefined,
    serialNumber: row.serial_number || undefined,
    warrantyStatus: row.warranty_status || undefined,
    condition: row.condition || undefined,
    approved: row.approved ?? true,
    refundAmount: row.refund_amount != null ? Number(row.refund_amount) : undefined,
    photos: row.photos || [],
    notes: row.notes || undefined,
    createdAt: row.created_at,
  };
}

export async function getReturnItems(returnId: string): Promise<RhReturnItem[]> {
  const { data, error } = await supabase
    .from('rh_return_items')
    .select('*')
    .eq('return_id', returnId)
    .order('created_at');

  if (error) {
    console.error('Failed to load return items:', error);
    return [];
  }

  return (data || []).map((row: any) => transformReturnItem(row));
}

export async function addReturnItem(
  item: Omit<RhReturnItem, 'id' | 'tenantId' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const insertData = {
    return_id: item.returnId,
    tenant_id: tenantId,
    product_id: item.productId || null,
    sku: item.sku || null,
    name: item.name,
    quantity: item.quantity,
    unit_price: item.unitPrice ?? null,
    batch_number: item.batchNumber || null,
    serial_number: item.serialNumber || null,
    warranty_status: item.warrantyStatus || null,
    condition: item.condition || null,
    approved: item.approved ?? true,
    refund_amount: item.refundAmount ?? null,
    photos: item.photos || [],
    notes: item.notes || null,
  };

  const { data, error } = await supabase
    .from('rh_return_items')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to add return item:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

export async function updateReturnItem(
  id: string,
  updates: Partial<RhReturnItem>
): Promise<{ success: boolean; error?: string }> {
  const updateData: Record<string, unknown> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
  if (updates.unitPrice !== undefined) updateData.unit_price = updates.unitPrice;
  if (updates.condition !== undefined) updateData.condition = updates.condition;
  if (updates.approved !== undefined) updateData.approved = updates.approved;
  if (updates.refundAmount !== undefined) updateData.refund_amount = updates.refundAmount;
  if (updates.photos !== undefined) updateData.photos = updates.photos;
  if (updates.notes !== undefined) updateData.notes = updates.notes || null;

  const { error } = await supabase
    .from('rh_return_items')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update return item:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function removeReturnItem(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('rh_return_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to remove return item:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
