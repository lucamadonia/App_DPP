/**
 * Supabase Supply Chain Service
 *
 * Supply-Chain-Verwaltung für Produkte
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { Tables, InsertTables, UpdateTables } from '@/types/supabase';
import type { SupplyChainEntry } from '@/types/database';

type SupplyChainRow = Tables<'supply_chain_entries'>;

// Transform database row to SupplyChainEntry type
function transformSupplyChainEntry(row: SupplyChainRow): SupplyChainEntry {
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    product_id: row.product_id,
    step: row.step,
    location: row.location,
    country: row.country,
    date: row.date,
    description: row.description,
    supplier: row.supplier || undefined,
    supplier_id: row.supplier_id || undefined,
    risk_level: row.risk_level || undefined,
    verified: row.verified,
    coordinates: row.coordinates || undefined,
    process_type: (row.process_type as SupplyChainEntry['process_type']) || undefined,
    transport_mode: (row.transport_mode as SupplyChainEntry['transport_mode']) || undefined,
    status: (row.status as SupplyChainEntry['status']) || undefined,
    document_ids: row.document_ids || undefined,
    emissions_kg: row.emissions_kg != null ? Number(row.emissions_kg) : undefined,
    duration_days: row.duration_days || undefined,
    notes: row.notes || undefined,
    cost: row.cost != null ? Number(row.cost) : undefined,
    currency: row.currency || undefined,
  };
}

/**
 * Get supply chain entries for a product
 */
export async function getSupplyChain(productId: string): Promise<SupplyChainEntry[]> {
  const { data, error } = await supabase
    .from('supply_chain_entries')
    .select('*')
    .eq('product_id', productId)
    .order('step', { ascending: true });

  if (error) {
    console.error('Failed to load supply chain:', error);
    return [];
  }

  return (data || []).map(transformSupplyChainEntry);
}

/**
 * Get all supply chain entries for a tenant (avoids N+1 queries)
 */
export async function getSupplyChainByTenant(): Promise<SupplyChainEntry[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('supply_chain_entries')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('step', { ascending: true });

  if (error) {
    console.error('Failed to load supply chain by tenant:', error);
    return [];
  }

  return (data || []).map(transformSupplyChainEntry);
}

/**
 * Create a supply chain entry
 */
export async function createSupplyChainEntry(
  entry: Omit<SupplyChainEntry, 'id' | 'tenant_id'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { success: false, error: 'No tenant set' };
  }

  const insertData: InsertTables<'supply_chain_entries'> = {
    tenant_id: tenantId,
    product_id: entry.product_id,
    step: entry.step,
    location: entry.location,
    country: entry.country,
    date: entry.date,
    description: entry.description,
    supplier: entry.supplier || null,
    supplier_id: entry.supplier_id || null,
    risk_level: entry.risk_level || null,
    verified: entry.verified || false,
    coordinates: entry.coordinates || null,
    process_type: entry.process_type || null,
    transport_mode: entry.transport_mode || null,
    status: entry.status || 'completed',
    document_ids: entry.document_ids || null,
    emissions_kg: entry.emissions_kg ?? null,
    duration_days: entry.duration_days ?? null,
    notes: entry.notes || null,
    cost: entry.cost ?? null,
    currency: entry.currency || 'EUR',
  };

  const { data, error } = await supabase
    .from('supply_chain_entries')
    .insert(insertData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create supply chain entry:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}

/**
 * Update a supply chain entry
 */
export async function updateSupplyChainEntry(
  id: string,
  entry: Partial<SupplyChainEntry>
): Promise<{ success: boolean; error?: string }> {
  const updateData: UpdateTables<'supply_chain_entries'> = {};

  if (entry.step !== undefined) updateData.step = entry.step;
  if (entry.location !== undefined) updateData.location = entry.location;
  if (entry.country !== undefined) updateData.country = entry.country;
  if (entry.date !== undefined) updateData.date = entry.date;
  if (entry.description !== undefined) updateData.description = entry.description;
  if (entry.supplier !== undefined) updateData.supplier = entry.supplier || null;
  if (entry.supplier_id !== undefined) updateData.supplier_id = entry.supplier_id || null;
  if (entry.risk_level !== undefined) updateData.risk_level = entry.risk_level || null;
  if (entry.verified !== undefined) updateData.verified = entry.verified;
  if (entry.coordinates !== undefined) updateData.coordinates = entry.coordinates || null;
  if (entry.process_type !== undefined) updateData.process_type = entry.process_type || null;
  if (entry.transport_mode !== undefined) updateData.transport_mode = entry.transport_mode || null;
  if (entry.status !== undefined) updateData.status = entry.status || 'completed';
  if (entry.document_ids !== undefined) updateData.document_ids = entry.document_ids || null;
  if (entry.emissions_kg !== undefined) updateData.emissions_kg = entry.emissions_kg ?? null;
  if (entry.duration_days !== undefined) updateData.duration_days = entry.duration_days ?? null;
  if (entry.notes !== undefined) updateData.notes = entry.notes || null;
  if (entry.cost !== undefined) updateData.cost = entry.cost ?? null;
  if (entry.currency !== undefined) updateData.currency = entry.currency || 'EUR';

  const { error } = await supabase
    .from('supply_chain_entries')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Failed to update supply chain entry:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete a supply chain entry
 */
export async function deleteSupplyChainEntry(id: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('supply_chain_entries')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete supply chain entry:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Reorder supply chain entries
 */
export async function reorderSupplyChain(
  productId: string,
  orderedIds: string[]
): Promise<{ success: boolean; error?: string }> {
  // Update step numbers based on new order
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('supply_chain_entries')
      .update({ step: index + 1 })
      .eq('id', id)
      .eq('product_id', productId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    console.error('Failed to reorder supply chain:', errors[0].error);
    return { success: false, error: 'Failed to reorder entries' };
  }

  return { success: true };
}

/**
 * Get supply chain statistics for a tenant
 */
export async function getSupplyChainStats(): Promise<{
  totalEntries: number;
  verified: number;
  unverified: number;
  byCountry: Record<string, number>;
  riskBreakdown: Record<string, number>;
  byProcessType: Record<string, number>;
  byStatus: Record<string, number>;
  totalEmissions: number;
  totalCost: number;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      totalEntries: 0,
      verified: 0,
      unverified: 0,
      byCountry: {},
      riskBreakdown: {},
      byProcessType: {},
      byStatus: {},
      totalEmissions: 0,
      totalCost: 0,
    };
  }

  const { data, error } = await supabase
    .from('supply_chain_entries')
    .select('country, verified, risk_level, process_type, status, emissions_kg, cost')
    .eq('tenant_id', tenantId);

  if (error || !data) {
    return {
      totalEntries: 0,
      verified: 0,
      unverified: 0,
      byCountry: {},
      riskBreakdown: {},
      byProcessType: {},
      byStatus: {},
      totalEmissions: 0,
      totalCost: 0,
    };
  }

  const byCountry: Record<string, number> = {};
  const riskBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0 };
  const byProcessType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalEmissions = 0;
  let totalCost = 0;

  data.forEach(entry => {
    byCountry[entry.country] = (byCountry[entry.country] || 0) + 1;
    if (entry.risk_level) {
      riskBreakdown[entry.risk_level] = (riskBreakdown[entry.risk_level] || 0) + 1;
    }
    if (entry.process_type) {
      byProcessType[entry.process_type] = (byProcessType[entry.process_type] || 0) + 1;
    }
    if (entry.status) {
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    }
    if (entry.emissions_kg) {
      totalEmissions += Number(entry.emissions_kg);
    }
    if (entry.cost) {
      totalCost += Number(entry.cost);
    }
  });

  return {
    totalEntries: data.length,
    verified: data.filter(e => e.verified).length,
    unverified: data.filter(e => !e.verified).length,
    byCountry,
    riskBreakdown,
    byProcessType,
    byStatus,
    totalEmissions,
    totalCost,
  };
}
