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
    risk_level: row.risk_level || undefined,
    verified: row.verified,
    coordinates: row.coordinates || undefined,
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
    risk_level: entry.risk_level || null,
    verified: entry.verified || false,
    coordinates: entry.coordinates || null,
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
  if (entry.risk_level !== undefined) updateData.risk_level = entry.risk_level || null;
  if (entry.verified !== undefined) updateData.verified = entry.verified;
  if (entry.coordinates !== undefined) updateData.coordinates = entry.coordinates || null;

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
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return {
      totalEntries: 0,
      verified: 0,
      unverified: 0,
      byCountry: {},
      riskBreakdown: {},
    };
  }

  const { data, error } = await supabase
    .from('supply_chain_entries')
    .select('country, verified, risk_level')
    .eq('tenant_id', tenantId);

  if (error || !data) {
    return {
      totalEntries: 0,
      verified: 0,
      unverified: 0,
      byCountry: {},
      riskBreakdown: {},
    };
  }

  const byCountry: Record<string, number> = {};
  const riskBreakdown: Record<string, number> = { low: 0, medium: 0, high: 0 };

  data.forEach(entry => {
    byCountry[entry.country] = (byCountry[entry.country] || 0) + 1;
    if (entry.risk_level) {
      riskBreakdown[entry.risk_level] = (riskBreakdown[entry.risk_level] || 0) + 1;
    }
  });

  return {
    totalEntries: data.length,
    verified: data.filter(e => e.verified).length,
    unverified: data.filter(e => !e.verified).length,
    byCountry,
    riskBreakdown,
  };
}
