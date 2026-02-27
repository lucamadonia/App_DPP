/**
 * Warehouse Locations Service
 * CRUD for wh_locations table
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { WhLocation, WhLocationInput, LocationStats, LocationCapacitySummary } from '@/types/warehouse';

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
    areaM2: row.area_m2 != null ? Number(row.area_m2) : undefined,
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
      area_m2: input.areaM2 || null,
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
  if (input.areaM2 !== undefined) update.area_m2 = input.areaM2 || null;
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
  const [stockRes, locationRes] = await Promise.all([
    supabase
      .from('wh_stock_levels')
      .select('quantity_available, quantity_reserved, batch_id, reorder_point')
      .eq('location_id', locationId),
    supabase
      .from('wh_locations')
      .select('zones, capacity_units')
      .eq('id', locationId)
      .single(),
  ]);

  const stockData = stockRes.data || [];
  const location = locationRes.data;

  const totalItems = stockData.reduce((sum, r) => sum + (r.quantity_available || 0) + (r.quantity_reserved || 0), 0);
  const uniqueBatches = new Set(stockData.map(r => r.batch_id)).size;
  const lowStockCount = stockData.filter(
    r => r.reorder_point != null && r.quantity_available <= r.reorder_point
  ).length;

  const zones: { binLocations?: string[] }[] = location?.zones || [];
  const zoneCount = zones.length;
  const binLocationCount = zones.reduce(
    (sum, z) => sum + (z.binLocations?.length || 0),
    0,
  );

  let capacityUsedPercent: number | undefined;
  if (location?.capacity_units && location.capacity_units > 0) {
    capacityUsedPercent = Math.round((totalItems / location.capacity_units) * 100);
  }

  return {
    totalItems,
    totalBatches: uniqueBatches,
    capacityUsedPercent,
    zoneCount,
    binLocationCount,
    lowStockCount,
  };
}

export async function getLocationCapacitySummaries(): Promise<LocationCapacitySummary[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const [locsRes, stockRes] = await Promise.all([
    supabase
      .from('wh_locations')
      .select('id, name, code, capacity_units, capacity_volume_m3, area_m2')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('wh_stock_levels')
      .select('location_id, quantity_available, quantity_reserved')
      .eq('tenant_id', tenantId),
  ]);

  const locations = locsRes.data || [];
  const stock = stockRes.data || [];

  const stockByLocation = new Map<string, number>();
  for (const s of stock) {
    const current = stockByLocation.get(s.location_id) || 0;
    stockByLocation.set(s.location_id, current + (s.quantity_available || 0) + (s.quantity_reserved || 0));
  }

  return locations.map(loc => {
    const totalUnits = stockByLocation.get(loc.id) || 0;
    const capacityUnits = loc.capacity_units != null ? Number(loc.capacity_units) : undefined;
    const fillPercentUnits = capacityUnits && capacityUnits > 0
      ? Math.round((totalUnits / capacityUnits) * 100)
      : undefined;

    return {
      locationId: loc.id,
      locationName: loc.name,
      locationCode: loc.code || undefined,
      totalUnits,
      capacityUnits,
      fillPercentUnits,
      capacityVolumeM3: loc.capacity_volume_m3 != null ? Number(loc.capacity_volume_m3) : undefined,
      areaM2: loc.area_m2 != null ? Number(loc.area_m2) : undefined,
    };
  });
}
