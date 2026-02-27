/**
 * Warehouse Locations Service
 * CRUD for wh_locations table
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { WhLocation, WhLocationInput, LocationStats } from '@/types/warehouse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformLocation(row: any): WhLocation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    code: row.code || undefined,
    type: row.type,
    street: row.street || undefined,
    city: row.city || undefined,
    state: row.state || undefined,
    postalCode: row.postal_code || undefined,
    country: row.country || undefined,
    facilityIdentifier: row.facility_identifier || undefined,
    capacityUnits: row.capacity_units != null ? Number(row.capacity_units) : undefined,
    capacityVolumeM3: row.capacity_volume_m3 != null ? Number(row.capacity_volume_m3) : undefined,
    zones: row.zones || [],
    isActive: row.is_active,
    notes: row.notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getLocations(): Promise<WhLocation[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('wh_locations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) {
    console.error('Failed to load locations:', error);
    return [];
  }
  return (data || []).map(transformLocation);
}

export async function getActiveLocations(): Promise<WhLocation[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('wh_locations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Failed to load active locations:', error);
    return [];
  }
  return (data || []).map(transformLocation);
}

export async function getLocation(id: string): Promise<WhLocation | null> {
  const { data, error } = await supabase
    .from('wh_locations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformLocation(data);
}

export async function createLocation(input: WhLocationInput): Promise<WhLocation> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  // Quota check
  const { checkQuota } = await import('./billing');
  const quota = await checkQuota('warehouse_location', { tenantId });
  if (!quota.allowed) throw new Error(`Warehouse location limit reached (${quota.current}/${quota.limit})`);

  const { data, error } = await supabase
    .from('wh_locations')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      code: input.code || null,
      type: input.type || 'main',
      street: input.street || null,
      city: input.city || null,
      state: input.state || null,
      postal_code: input.postalCode || null,
      country: input.country || null,
      facility_identifier: input.facilityIdentifier || null,
      capacity_units: input.capacityUnits || null,
      capacity_volume_m3: input.capacityVolumeM3 || null,
      zones: input.zones || [],
      is_active: input.isActive !== false,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create location: ${error.message}`);
  return transformLocation(data);
}

export async function updateLocation(id: string, input: Partial<WhLocationInput>): Promise<WhLocation> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.code !== undefined) update.code = input.code || null;
  if (input.type !== undefined) update.type = input.type;
  if (input.street !== undefined) update.street = input.street || null;
  if (input.city !== undefined) update.city = input.city || null;
  if (input.state !== undefined) update.state = input.state || null;
  if (input.postalCode !== undefined) update.postal_code = input.postalCode || null;
  if (input.country !== undefined) update.country = input.country || null;
  if (input.facilityIdentifier !== undefined) update.facility_identifier = input.facilityIdentifier || null;
  if (input.capacityUnits !== undefined) update.capacity_units = input.capacityUnits || null;
  if (input.capacityVolumeM3 !== undefined) update.capacity_volume_m3 = input.capacityVolumeM3 || null;
  if (input.zones !== undefined) update.zones = input.zones;
  if (input.isActive !== undefined) update.is_active = input.isActive;
  if (input.notes !== undefined) update.notes = input.notes || null;

  const { data, error } = await supabase
    .from('wh_locations')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update location: ${error.message}`);
  return transformLocation(data);
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('wh_locations')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete location: ${error.message}`);
}

export async function getLocationStats(locationId: string): Promise<LocationStats> {
  const { data, error } = await supabase
    .from('wh_stock_levels')
    .select('quantity_available, batch_id')
    .eq('location_id', locationId);

  if (error || !data) return { totalItems: 0, totalBatches: 0 };

  const totalItems = data.reduce((sum, r) => sum + (r.quantity_available || 0), 0);
  const uniqueBatches = new Set(data.map(r => r.batch_id)).size;

  return {
    totalItems,
    totalBatches: uniqueBatches,
  };
}
