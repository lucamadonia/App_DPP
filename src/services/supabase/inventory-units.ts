/**
 * Inventory Units Service
 *
 * Per-unit physical inventory tracking. One row per individual unit
 * within a unit-tracked batch. Enables "scan each unit and see what
 * is missing" workflow.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  InventoryUnit,
  InventoryUnitStatus,
  BatchUnitStats,
  GenerateUnitsParams,
  GenerateUnitsResult,
  UnitFilter,
  PaginatedUnitResult,
} from '@/types/inventory-units';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformUnit(row: any): InventoryUnit {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    batchId: row.batch_id,
    productId: row.product_id,
    unitSerial: row.unit_serial,
    status: row.status as InventoryUnitStatus,
    locationId: row.location_id || undefined,
    binLocation: row.bin_location || undefined,
    receivedAt: row.received_at || undefined,
    receivedBy: row.received_by || undefined,
    shippedAt: row.shipped_at || undefined,
    shippedBy: row.shipped_by || undefined,
    shipmentId: row.shipment_id || undefined,
    notes: row.notes || undefined,
    metadata: row.metadata || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productName: row.products?.name || undefined,
    productGtin: row.products?.gtin || undefined,
    batchSerialNumber: row.product_batches?.serial_number || undefined,
    locationName: row.wh_locations?.name || undefined,
  };
}

// ============================================
// READ
// ============================================

export async function getUnitsByBatch(
  batchId: string,
  filter?: { status?: InventoryUnitStatus | InventoryUnitStatus[] }
): Promise<InventoryUnit[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('inventory_units')
    .select('*, products(name, gtin), product_batches(serial_number), wh_locations(name)')
    .eq('tenant_id', tenantId)
    .eq('batch_id', batchId);

  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status);
    } else {
      query = query.eq('status', filter.status);
    }
  }

  const { data, error } = await query.order('unit_serial', { ascending: true });

  if (error) {
    console.error('Failed to load units:', error);
    return [];
  }
  return (data || []).map(transformUnit);
}

export async function getUnitsPaginated(filter?: UnitFilter): Promise<PaginatedUnitResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { data: [], total: 0, page: 1, pageSize: 50 };

  const page = filter?.page || 1;
  const pageSize = filter?.pageSize || 50;

  let query = supabase
    .from('inventory_units')
    .select('*, products(name, gtin), product_batches(serial_number), wh_locations(name)', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filter?.batchId) query = query.eq('batch_id', filter.batchId);
  if (filter?.productId) query = query.eq('product_id', filter.productId);
  if (filter?.locationId) query = query.eq('location_id', filter.locationId);
  if (filter?.status) {
    if (Array.isArray(filter.status)) {
      query = query.in('status', filter.status);
    } else {
      query = query.eq('status', filter.status);
    }
  }
  if (filter?.search) {
    query = query.ilike('unit_serial', `%${filter.search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('unit_serial', { ascending: true })
    .range(from, to);

  if (error) {
    console.error('Failed to load units (paginated):', error);
    return { data: [], total: 0, page, pageSize };
  }

  return {
    data: (data || []).map(transformUnit),
    total: count || 0,
    page,
    pageSize,
  };
}

export async function getUnitBySerial(unitSerial: string): Promise<InventoryUnit | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data, error } = await supabase
    .from('inventory_units')
    .select('*, products(name, gtin), product_batches(serial_number), wh_locations(name)')
    .eq('tenant_id', tenantId)
    .eq('unit_serial', unitSerial)
    .maybeSingle();

  if (error || !data) return null;
  return transformUnit(data);
}

export async function getUnitById(id: string): Promise<InventoryUnit | null> {
  const { data, error } = await supabase
    .from('inventory_units')
    .select('*, products(name, gtin), product_batches(serial_number), wh_locations(name)')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return transformUnit(data);
}

// ============================================
// STATS
// ============================================

export async function getBatchUnitStats(batchId: string): Promise<BatchUnitStats> {
  const tenantId = await getCurrentTenantId();
  const empty: BatchUnitStats = {
    batchId,
    total: 0,
    expected: 0,
    received: 0,
    reserved: 0,
    shipped: 0,
    damaged: 0,
    quarantine: 0,
    returned: 0,
    lost: 0,
    consumed: 0,
    missingSerials: [],
    receivedPercent: 0,
  };
  if (!tenantId) return empty;

  const { data, error } = await supabase
    .from('inventory_units')
    .select('status, unit_serial')
    .eq('tenant_id', tenantId)
    .eq('batch_id', batchId);

  if (error || !data) return empty;

  const counts: Record<InventoryUnitStatus, number> = {
    expected: 0,
    received: 0,
    reserved: 0,
    shipped: 0,
    damaged: 0,
    quarantine: 0,
    returned: 0,
    lost: 0,
    consumed: 0,
  };
  const missingSerials: string[] = [];

  for (const row of data) {
    const s = row.status as InventoryUnitStatus;
    counts[s] = (counts[s] || 0) + 1;
    if (s === 'expected') missingSerials.push(row.unit_serial);
  }

  const total = data.length;
  const physicallyPresent =
    counts.received + counts.reserved + counts.damaged + counts.quarantine + counts.returned;

  return {
    batchId,
    total,
    expected: counts.expected,
    received: counts.received,
    reserved: counts.reserved,
    shipped: counts.shipped,
    damaged: counts.damaged,
    quarantine: counts.quarantine,
    returned: counts.returned,
    lost: counts.lost,
    consumed: counts.consumed,
    missingSerials: missingSerials.sort(),
    receivedPercent: total > 0 ? Math.round((physicallyPresent / total) * 100) : 0,
  };
}

// ============================================
// WRITE — Generation
// ============================================

/**
 * Bulk-generate `count` expected units for a batch.
 *
 * Serial pattern: `${serialPrefix}${number padded to `padding`}`
 * Example: prefix='ABC-', start=1, count=100, padding=3 → ABC-001 ... ABC-100
 *
 * Inserts in chunks of 500 to stay within Supabase request limits.
 * Skips serials that already exist (UNIQUE constraint will reject duplicates).
 */
export async function generateExpectedUnits(params: GenerateUnitsParams): Promise<GenerateUnitsResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, created: 0, error: 'No tenant' };

  if (params.count <= 0) return { success: false, created: 0, error: 'Count must be > 0' };
  if (params.count > 10000) return { success: false, created: 0, error: 'Max 10,000 units per batch' };

  // Resolve product_id from batch
  const { data: batch, error: batchErr } = await supabase
    .from('product_batches')
    .select('id, product_id, tenant_id')
    .eq('id', params.batchId)
    .maybeSingle();

  if (batchErr || !batch) {
    return { success: false, created: 0, error: 'Batch not found' };
  }
  if (batch.tenant_id !== tenantId) {
    return { success: false, created: 0, error: 'Batch belongs to a different tenant' };
  }

  const start = params.startNumber ?? 1;
  const padding = params.padding ?? 3;
  const prefix = params.serialPrefix;

  const rows: Array<{
    tenant_id: string;
    batch_id: string;
    product_id: string;
    unit_serial: string;
    status: InventoryUnitStatus;
  }> = [];

  for (let i = 0; i < params.count; i++) {
    const num = start + i;
    const serial = `${prefix}${String(num).padStart(padding, '0')}`;
    rows.push({
      tenant_id: tenantId,
      batch_id: params.batchId,
      product_id: batch.product_id,
      unit_serial: serial,
      status: 'expected',
    });
  }

  // Insert in chunks to avoid huge payloads
  const CHUNK = 500;
  let created = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error, count } = await supabase
      .from('inventory_units')
      .insert(chunk, { count: 'exact' });

    if (error) {
      // Likely unique violation if a serial already exists — fail and surface the error
      return {
        success: created > 0,
        created,
        error: `Inserted ${created} units before error: ${error.message}`,
      };
    }
    created += count || chunk.length;
  }

  // Mark batch as unit-tracking
  await supabase
    .from('product_batches')
    .update({ unit_tracking_enabled: true })
    .eq('id', params.batchId);

  return {
    success: true,
    created,
    firstSerial: rows[0]?.unit_serial,
    lastSerial: rows[rows.length - 1]?.unit_serial,
  };
}

/**
 * Add explicit serials (not auto-generated) to a batch as expected units.
 * Useful when serials come from a supplier list / CSV.
 */
export async function addExpectedUnits(
  batchId: string,
  serials: string[]
): Promise<GenerateUnitsResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, created: 0, error: 'No tenant' };

  if (!serials.length) return { success: false, created: 0, error: 'No serials provided' };

  const { data: batch } = await supabase
    .from('product_batches')
    .select('id, product_id, tenant_id')
    .eq('id', batchId)
    .maybeSingle();

  if (!batch || batch.tenant_id !== tenantId) {
    return { success: false, created: 0, error: 'Batch not found' };
  }

  const rows = serials.map(s => ({
    tenant_id: tenantId,
    batch_id: batchId,
    product_id: batch.product_id,
    unit_serial: s.trim(),
    status: 'expected' as InventoryUnitStatus,
  }));

  const { error, count } = await supabase
    .from('inventory_units')
    .insert(rows, { count: 'exact' });

  if (error) {
    return { success: false, created: 0, error: error.message };
  }

  await supabase
    .from('product_batches')
    .update({ unit_tracking_enabled: true })
    .eq('id', batchId);

  return {
    success: true,
    created: count || rows.length,
    firstSerial: rows[0]?.unit_serial,
    lastSerial: rows[rows.length - 1]?.unit_serial,
  };
}

// ============================================
// WRITE — Lifecycle
// ============================================

/**
 * Mark a unit as received (scanned in to a warehouse location).
 * Returns updated unit. Throws if already received (caller may catch and warn).
 */
export async function markUnitReceived(params: {
  unitId: string;
  locationId: string;
  binLocation?: string;
  notes?: string;
  allowReReceive?: boolean;  // If true, accept units that aren't 'expected'
}): Promise<InventoryUnit> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  // Read current state
  const { data: existing, error: readErr } = await supabase
    .from('inventory_units')
    .select('*')
    .eq('id', params.unitId)
    .single();

  if (readErr || !existing) throw new Error('Unit not found');

  if (existing.status === 'received' && !params.allowReReceive) {
    throw new Error(`Unit ${existing.unit_serial} already received`);
  }
  if (existing.status === 'shipped' && !params.allowReReceive) {
    throw new Error(`Unit ${existing.unit_serial} already shipped — use returned status instead`);
  }

  const { data, error } = await supabase
    .from('inventory_units')
    .update({
      status: 'received',
      location_id: params.locationId,
      bin_location: params.binLocation || null,
      received_at: new Date().toISOString(),
      received_by: userId || null,
      notes: params.notes || existing.notes || null,
    })
    .eq('id', params.unitId)
    .select('*, products(name, gtin), product_batches(serial_number), wh_locations(name)')
    .single();

  if (error || !data) throw new Error(`Failed to mark unit received: ${error?.message}`);

  return transformUnit(data);
}

export async function markUnitShipped(params: {
  unitId: string;
  shipmentId?: string;
  notes?: string;
}): Promise<InventoryUnit> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const { data, error } = await supabase
    .from('inventory_units')
    .update({
      status: 'shipped',
      shipment_id: params.shipmentId || null,
      shipped_at: new Date().toISOString(),
      shipped_by: userId || null,
      notes: params.notes || null,
    })
    .eq('id', params.unitId)
    .select('*, products(name, gtin), product_batches(serial_number), wh_locations(name)')
    .single();

  if (error || !data) throw new Error(`Failed to mark unit shipped: ${error?.message}`);
  return transformUnit(data);
}

export async function updateUnitStatus(
  unitId: string,
  status: InventoryUnitStatus,
  notes?: string
): Promise<InventoryUnit> {
  const { data, error } = await supabase
    .from('inventory_units')
    .update({
      status,
      notes: notes || null,
    })
    .eq('id', unitId)
    .select('*, products(name, gtin), product_batches(serial_number), wh_locations(name)')
    .single();

  if (error || !data) throw new Error(`Failed to update unit status: ${error?.message}`);
  return transformUnit(data);
}

export async function deleteUnit(unitId: string): Promise<void> {
  const { error } = await supabase.from('inventory_units').delete().eq('id', unitId);
  if (error) throw new Error(`Failed to delete unit: ${error.message}`);
}

/**
 * Reset all 'expected' units of a batch to a different state, or delete them.
 * Used when disabling unit tracking on a batch.
 */
export async function deleteExpectedUnitsOfBatch(batchId: string): Promise<number> {
  const { data, error } = await supabase
    .from('inventory_units')
    .delete()
    .eq('batch_id', batchId)
    .eq('status', 'expected')
    .select('id');

  if (error) throw new Error(`Failed to delete expected units: ${error.message}`);
  return data?.length || 0;
}
