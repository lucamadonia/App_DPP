/**
 * Supabase Checklists Service
 *
 * Checklist-Fortschritt-Verwaltung
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { ChecklistProgress } from '@/types/database';

// Transform database row to ChecklistProgress type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformChecklistProgress(row: any): ChecklistProgress {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    product_id: row.product_id || undefined,
    checklist_item_id: row.checklist_item_id,
    checked: row.checked,
    status: row.status,
    notes: row.notes || undefined,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by || undefined,
  };
}

/**
 * Get checklist progress for current tenant
 */
export async function getChecklistProgress(productId?: string): Promise<ChecklistProgress[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return [];
  }

  let query = supabase
    .from('checklist_progress')
    .select('*')
    .eq('tenant_id', tenantId);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load checklist progress:', error);
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => transformChecklistProgress(row));
}

/**
 * Update or create checklist progress (upsert)
 */
export async function updateChecklistProgress(
  checklistItemId: string,
  data: Partial<Omit<ChecklistProgress, 'id' | 'tenant_id' | 'checklist_item_id'>>,
  productId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  // Check if entry already exists
  let query = supabase
    .from('checklist_progress')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('checklist_item_id', checklistItemId);

  if (productId) {
    query = query.eq('product_id', productId);
  } else {
    query = query.is('product_id', null);
  }

  const { data: existing } = await query.single();

  if (existing) {
    // Update existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.checked !== undefined) updateData.checked = data.checked;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes || null;
    if (data.updatedBy !== undefined) updateData.updated_by = data.updatedBy || null;

    const { error } = await supabase
      .from('checklist_progress')
      .update(updateData)
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to update checklist progress:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: existing.id };
  } else {
    // Create new
    const insertData = {
      tenant_id: tenantId,
      product_id: productId || null,
      checklist_item_id: checklistItemId,
      checked: data.checked || false,
      status: data.status || 'pending',
      notes: data.notes || null,
      updated_by: data.updatedBy || null,
    };

    const { data: result, error } = await supabase
      .from('checklist_progress')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create checklist progress:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: result.id };
  }
}

/**
 * Get checklist completion statistics
 */
export async function getChecklistStats(productId?: string): Promise<{
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  notApplicable: number;
  completionPercentage: number;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      notApplicable: 0,
      completionPercentage: 0,
    };
  }

  let query = supabase
    .from('checklist_progress')
    .select('status')
    .eq('tenant_id', tenantId);

  if (productId) {
    query = query.eq('product_id', productId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return {
      total: 0,
      completed: 0,
      inProgress: 0,
      pending: 0,
      notApplicable: 0,
      completionPercentage: 0,
    };
  }

  const stats = {
    total: data.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    completed: data.filter((d: any) => d.status === 'completed').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    inProgress: data.filter((d: any) => d.status === 'in_progress').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pending: data.filter((d: any) => d.status === 'pending').length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notApplicable: data.filter((d: any) => d.status === 'not_applicable').length,
    completionPercentage: 0,
  };

  const applicableTotal = stats.total - stats.notApplicable;
  if (applicableTotal > 0) {
    stats.completionPercentage = Math.round((stats.completed / applicableTotal) * 100);
  }

  return stats;
}

/**
 * Bulk update checklist items
 */
export async function bulkUpdateChecklistProgress(
  updates: Array<{
    checklistItemId: string;
    productId?: string;
    data: Partial<Omit<ChecklistProgress, 'id' | 'tenant_id' | 'checklist_item_id'>>;
  }>
): Promise<{ success: boolean; error?: string }> {
  const results = await Promise.all(
    updates.map(update =>
      updateChecklistProgress(update.checklistItemId, update.data, update.productId)
    )
  );

  const errors = results.filter(r => !r.success);
  if (errors.length > 0) {
    return { success: false, error: `${errors.length} updates failed` };
  }

  return { success: true };
}

/**
 * Reset checklist progress for a product
 */
export async function resetChecklistProgress(productId: string): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const { error } = await supabase
    .from('checklist_progress')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('product_id', productId);

  if (error) {
    console.error('Failed to reset checklist progress:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}
