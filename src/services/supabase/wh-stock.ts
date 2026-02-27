/**
 * Warehouse Stock Service
 * Stock levels, goods receipt, adjustments, transfers, transactions
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { generateTransactionNumber } from '@/lib/return-number';
import type {
  WhStockLevel,
  WhStockTransaction,
  StockFilter,
  TransactionFilter,
  StockTransactionType,
  PaginatedStockResult,
  PendingAction,
} from '@/types/warehouse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformStockLevel(row: any): WhStockLevel {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    locationId: row.location_id,
    productId: row.product_id,
    batchId: row.batch_id,
    quantityAvailable: row.quantity_available,
    quantityReserved: row.quantity_reserved,
    quantityDamaged: row.quantity_damaged,
    quantityQuarantine: row.quantity_quarantine,
    binLocation: row.bin_location || undefined,
    zone: row.zone || undefined,
    reorderPoint: row.reorder_point != null ? Number(row.reorder_point) : undefined,
    reorderQuantity: row.reorder_quantity != null ? Number(row.reorder_quantity) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Joined fields
    productName: row.products?.name || row.product_name || undefined,
    batchSerialNumber: row.product_batches?.serial_number || row.batch_serial_number || undefined,
    locationName: row.wh_locations?.name || row.location_name || undefined,
    locationCode: row.wh_locations?.code || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTransaction(row: any): WhStockTransaction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    transactionNumber: row.transaction_number,
    type: row.type,
    locationId: row.location_id || undefined,
    productId: row.product_id,
    batchId: row.batch_id,
    quantity: row.quantity,
    quantityBefore: row.quantity_before,
    quantityAfter: row.quantity_after,
    shipmentId: row.shipment_id || undefined,
    returnId: row.return_id || undefined,
    relatedTransactionId: row.related_transaction_id || undefined,
    reason: row.reason || undefined,
    notes: row.notes || undefined,
    referenceNumber: row.reference_number || undefined,
    performedBy: row.performed_by || undefined,
    createdAt: row.created_at,
    productName: row.products?.name || undefined,
    batchSerialNumber: row.product_batches?.serial_number || undefined,
    locationName: row.wh_locations?.name || undefined,
  };
}

// ============================================
// STOCK LEVELS
// ============================================

export async function getStockLevels(filter?: StockFilter): Promise<WhStockLevel[]> {
  const result = await getStockLevelsPaginated(filter);
  return result.data;
}

export async function getStockLevelsPaginated(filter?: StockFilter): Promise<PaginatedStockResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { data: [], total: 0, page: 1, pageSize: 25 };

  const page = filter?.page || 1;
  const pageSize = filter?.pageSize || 500;

  let query = supabase
    .from('wh_stock_levels')
    .select('*, products(name), product_batches(serial_number), wh_locations(name, code)', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filter?.locationId) query = query.eq('location_id', filter.locationId);
  if (filter?.productId) query = query.eq('product_id', filter.productId);
  if (filter?.batchId) query = query.eq('batch_id', filter.batchId);
  if (filter?.zone) query = query.eq('zone', filter.zone);
  if (filter?.lowStockOnly) {
    query = query.not('reorder_point', 'is', null);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to load stock levels:', error);
    return { data: [], total: 0, page, pageSize };
  }

  let results = (data || []).map(transformStockLevel);

  // Client-side filter for low stock (Supabase can't compare columns easily)
  if (filter?.lowStockOnly) {
    results = results.filter(s => s.reorderPoint != null && s.quantityAvailable <= s.reorderPoint);
  }

  // Client-side search filter across product name, batch serial, bin location
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    results = results.filter(s =>
      (s.productName?.toLowerCase().includes(q)) ||
      (s.batchSerialNumber?.toLowerCase().includes(q)) ||
      (s.binLocation?.toLowerCase().includes(q)) ||
      (s.locationName?.toLowerCase().includes(q))
    );
  }

  return { data: results, total: count || results.length, page, pageSize };
}

export async function getStockForBatch(batchId: string): Promise<WhStockLevel[]> {
  const { data, error } = await supabase
    .from('wh_stock_levels')
    .select('*, products(name), product_batches(serial_number), wh_locations(name, code)')
    .eq('batch_id', batchId);

  if (error) {
    console.error('Failed to load stock for batch:', error);
    return [];
  }
  return (data || []).map(transformStockLevel);
}

export async function getStockForLocation(locationId: string): Promise<WhStockLevel[]> {
  const { data, error } = await supabase
    .from('wh_stock_levels')
    .select('*, products(name), product_batches(serial_number), wh_locations(name, code)')
    .eq('location_id', locationId);

  if (error) {
    console.error('Failed to load stock for location:', error);
    return [];
  }
  return (data || []).map(transformStockLevel);
}

// ============================================
// LOCATION VOLUME CALCULATION
// ============================================

/**
 * Calculate the total used volume (m³) for a warehouse location.
 * Loads all stock entries, fetches their products, and computes volume.
 * Returns totalM3 and coverage (fraction of stock items that have dimensions).
 */
export async function getLocationUsedVolumeM3(locationId: string): Promise<{
  totalM3: number;
  coverage: number;
}> {
  const { getProductsByIds } = await import('./products');
  const { calculateStockVolumeM3 } = await import('@/lib/warehouse-volume');

  const stock = await getStockForLocation(locationId);
  if (stock.length === 0) return { totalM3: 0, coverage: 1 };

  // Collect unique product IDs
  const productIds = [...new Set(stock.map(s => s.productId))];
  const products = await getProductsByIds(productIds);
  const productsMap = new Map(products.map(p => [p.id, p]));

  const result = calculateStockVolumeM3(stock, productsMap);
  const totalItems = result.itemsWithDimensions + result.itemsWithout;
  const coverage = totalItems > 0 ? result.itemsWithDimensions / totalItems : 1;

  return { totalM3: result.totalM3, coverage };
}

// ============================================
// GOODS RECEIPT
// ============================================

export async function createGoodsReceipt(params: {
  locationId: string;
  productId: string;
  batchId: string;
  quantity: number;
  quantityDamaged?: number;
  quantityQuarantine?: number;
  binLocation?: string;
  zone?: string;
  referenceNumber?: string;
  notes?: string;
}): Promise<WhStockLevel> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const goodQty = params.quantity - (params.quantityDamaged || 0) - (params.quantityQuarantine || 0);

  // Check if stock row exists
  const { data: existing } = await supabase
    .from('wh_stock_levels')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('location_id', params.locationId)
    .eq('batch_id', params.batchId)
    .maybeSingle();

  let stockLevel: WhStockLevel;
  const quantityBefore = existing?.quantity_available || 0;

  if (existing) {
    // Update existing stock
    const { data, error } = await supabase
      .from('wh_stock_levels')
      .update({
        quantity_available: existing.quantity_available + goodQty,
        quantity_damaged: existing.quantity_damaged + (params.quantityDamaged || 0),
        quantity_quarantine: existing.quantity_quarantine + (params.quantityQuarantine || 0),
        bin_location: params.binLocation || existing.bin_location,
        zone: params.zone || existing.zone,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update stock: ${error.message}`);
    stockLevel = transformStockLevel(data);
  } else {
    // Create new stock row
    const { data, error } = await supabase
      .from('wh_stock_levels')
      .insert({
        tenant_id: tenantId,
        location_id: params.locationId,
        product_id: params.productId,
        batch_id: params.batchId,
        quantity_available: goodQty,
        quantity_damaged: params.quantityDamaged || 0,
        quantity_quarantine: params.quantityQuarantine || 0,
        bin_location: params.binLocation || null,
        zone: params.zone || null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create stock: ${error.message}`);
    stockLevel = transformStockLevel(data);
  }

  // Log transaction
  await supabase.from('wh_stock_transactions').insert({
    tenant_id: tenantId,
    transaction_number: generateTransactionNumber(),
    type: 'goods_receipt' as StockTransactionType,
    location_id: params.locationId,
    product_id: params.productId,
    batch_id: params.batchId,
    quantity: params.quantity,
    quantity_before: quantityBefore,
    quantity_after: quantityBefore + goodQty,
    reference_number: params.referenceNumber || null,
    notes: params.notes || null,
    performed_by: userId,
  });

  return stockLevel;
}

// ============================================
// STOCK ADJUSTMENT
// ============================================

export async function createStockAdjustment(params: {
  stockId: string;
  quantityChange: number;
  reason: string;
  notes?: string;
}): Promise<WhStockLevel> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const { data: stock } = await supabase
    .from('wh_stock_levels')
    .select('*')
    .eq('id', params.stockId)
    .single();

  if (!stock) throw new Error('Stock not found');

  const newQty = stock.quantity_available + params.quantityChange;
  if (newQty < 0) throw new Error('Adjustment would result in negative stock');

  const { data, error } = await supabase
    .from('wh_stock_levels')
    .update({ quantity_available: newQty })
    .eq('id', params.stockId)
    .select()
    .single();

  if (error) throw new Error(`Failed to adjust stock: ${error.message}`);

  await supabase.from('wh_stock_transactions').insert({
    tenant_id: tenantId,
    transaction_number: generateTransactionNumber(),
    type: 'adjustment' as StockTransactionType,
    location_id: stock.location_id,
    product_id: stock.product_id,
    batch_id: stock.batch_id,
    quantity: params.quantityChange,
    quantity_before: stock.quantity_available,
    quantity_after: newQty,
    reason: params.reason,
    notes: params.notes || null,
    performed_by: userId,
  });

  return transformStockLevel(data);
}

// ============================================
// STOCK TRANSFER
// ============================================

export async function createStockTransfer(params: {
  fromLocationId: string;
  toLocationId: string;
  productId: string;
  batchId: string;
  quantity: number;
  notes?: string;
}): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  // Get source stock
  const { data: sourceStock } = await supabase
    .from('wh_stock_levels')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('location_id', params.fromLocationId)
    .eq('batch_id', params.batchId)
    .single();

  if (!sourceStock) throw new Error('Source stock not found');
  if (sourceStock.quantity_available < params.quantity) {
    throw new Error('Insufficient stock for transfer');
  }

  // Reduce source
  const sourceAfter = sourceStock.quantity_available - params.quantity;
  await supabase
    .from('wh_stock_levels')
    .update({ quantity_available: sourceAfter })
    .eq('id', sourceStock.id);

  // Add to destination (upsert)
  const { data: destStock } = await supabase
    .from('wh_stock_levels')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('location_id', params.toLocationId)
    .eq('batch_id', params.batchId)
    .maybeSingle();

  const destBefore = destStock?.quantity_available || 0;
  const destAfter = destBefore + params.quantity;

  if (destStock) {
    await supabase
      .from('wh_stock_levels')
      .update({ quantity_available: destAfter })
      .eq('id', destStock.id);
  } else {
    await supabase.from('wh_stock_levels').insert({
      tenant_id: tenantId,
      location_id: params.toLocationId,
      product_id: params.productId,
      batch_id: params.batchId,
      quantity_available: params.quantity,
    });
  }

  // Log both transactions with linked IDs
  const outId = crypto.randomUUID();
  const inId = crypto.randomUUID();

  await supabase.from('wh_stock_transactions').insert([
    {
      id: outId,
      tenant_id: tenantId,
      transaction_number: generateTransactionNumber(),
      type: 'transfer_out' as StockTransactionType,
      location_id: params.fromLocationId,
      product_id: params.productId,
      batch_id: params.batchId,
      quantity: -params.quantity,
      quantity_before: sourceStock.quantity_available,
      quantity_after: sourceAfter,
      related_transaction_id: inId,
      notes: params.notes || null,
      performed_by: userId,
    },
    {
      id: inId,
      tenant_id: tenantId,
      transaction_number: generateTransactionNumber(),
      type: 'transfer_in' as StockTransactionType,
      location_id: params.toLocationId,
      product_id: params.productId,
      batch_id: params.batchId,
      quantity: params.quantity,
      quantity_before: destBefore,
      quantity_after: destAfter,
      related_transaction_id: outId,
      notes: params.notes || null,
      performed_by: userId,
    },
  ]);
}

// ============================================
// RESERVATIONS
// ============================================

export async function reserveStock(stockId: string, quantity: number): Promise<void> {
  const { data: stock } = await supabase
    .from('wh_stock_levels')
    .select('*')
    .eq('id', stockId)
    .single();

  if (!stock) throw new Error('Stock not found');
  if (stock.quantity_available < quantity) throw new Error('Insufficient stock');

  await supabase
    .from('wh_stock_levels')
    .update({
      quantity_available: stock.quantity_available - quantity,
      quantity_reserved: stock.quantity_reserved + quantity,
    })
    .eq('id', stockId);
}

export async function releaseReservation(stockId: string, quantity: number): Promise<void> {
  const { data: stock } = await supabase
    .from('wh_stock_levels')
    .select('*')
    .eq('id', stockId)
    .single();

  if (!stock) throw new Error('Stock not found');
  if (stock.quantity_reserved < quantity) throw new Error('Cannot release more than reserved');

  await supabase
    .from('wh_stock_levels')
    .update({
      quantity_available: stock.quantity_available + quantity,
      quantity_reserved: stock.quantity_reserved - quantity,
    })
    .eq('id', stockId);
}

// ============================================
// TRANSACTIONS HISTORY
// ============================================

export async function getTransactionHistory(filter?: TransactionFilter): Promise<WhStockTransaction[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('wh_stock_transactions')
    .select('*, products(name), product_batches(serial_number), wh_locations(name)')
    .eq('tenant_id', tenantId);

  if (filter?.locationId) query = query.eq('location_id', filter.locationId);
  if (filter?.productId) query = query.eq('product_id', filter.productId);
  if (filter?.batchId) query = query.eq('batch_id', filter.batchId);
  if (filter?.type?.length) query = query.in('type', filter.type);
  if (filter?.dateFrom) query = query.gte('created_at', filter.dateFrom);
  if (filter?.dateTo) query = query.lte('created_at', filter.dateTo);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    console.error('Failed to load transactions:', error);
    return [];
  }
  return (data || []).map(transformTransaction);
}

// ============================================
// LOW STOCK ALERTS
// ============================================

export async function getLowStockAlerts(): Promise<WhStockLevel[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('wh_stock_levels')
    .select('*, products(name), product_batches(serial_number), wh_locations(name, code)')
    .eq('tenant_id', tenantId)
    .not('reorder_point', 'is', null);

  if (error) {
    console.error('Failed to load low stock alerts:', error);
    return [];
  }

  return (data || [])
    .map(transformStockLevel)
    .filter(s => s.reorderPoint != null && s.quantityAvailable <= s.reorderPoint);
}

// ============================================
// STATS
// ============================================

export async function getWarehouseStats(): Promise<{
  totalStock: number;
  totalLocations: number;
  lowStockAlerts: number;
}> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { totalStock: 0, totalLocations: 0, lowStockAlerts: 0 };

  const [stockRes, locRes, alertsRes] = await Promise.all([
    supabase
      .from('wh_stock_levels')
      .select('quantity_available')
      .eq('tenant_id', tenantId),
    supabase
      .from('wh_locations')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('wh_stock_levels')
      .select('quantity_available, reorder_point')
      .eq('tenant_id', tenantId)
      .not('reorder_point', 'is', null),
  ]);

  const totalStock = (stockRes.data || []).reduce((sum, r) => sum + (r.quantity_available || 0), 0);
  const totalLocations = locRes.count || 0;
  const lowStockAlerts = (alertsRes.data || []).filter(
    r => r.reorder_point != null && r.quantity_available <= r.reorder_point
  ).length;

  return { totalStock, totalLocations, lowStockAlerts };
}

export async function getRecentTransactions(limit = 10): Promise<WhStockTransaction[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('wh_stock_transactions')
    .select('*, products(name), product_batches(serial_number), wh_locations(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load recent transactions:', error);
    return [];
  }
  return (data || []).map(transformTransaction);
}

export async function getPendingActions(): Promise<PendingAction[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const actions: PendingAction[] = [];

  const [lowStockRes, draftShipmentsRes] = await Promise.all([
    supabase
      .from('wh_stock_levels')
      .select('quantity_available, reorder_point, products(name), wh_locations(name)')
      .eq('tenant_id', tenantId)
      .not('reorder_point', 'is', null),
    supabase
      .from('wh_shipments')
      .select('id, shipment_number, status, recipient_name')
      .eq('tenant_id', tenantId)
      .in('status', ['draft', 'picking']),
  ]);

  // Low stock alerts
  const lowStockItems = (lowStockRes.data || []).filter(
    (r: { quantity_available: number; reorder_point: number }) =>
      r.reorder_point != null && r.quantity_available <= r.reorder_point
  );

  for (const item of lowStockItems) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const row = item as any;
    const isZero = row.quantity_available === 0;
    actions.push({
      type: 'low_stock',
      title: row.products?.name || 'Unknown product',
      subtitle: `${row.quantity_available} / ${row.reorder_point} @ ${row.wh_locations?.name || ''}`,
      linkTo: '/warehouse/inventory?lowStock=true',
      severity: isZero ? 'critical' : 'warning',
    });
  }

  // Draft/picking shipments
  for (const ship of draftShipmentsRes.data || []) {
    actions.push({
      type: 'shipment_action',
      title: ship.shipment_number,
      subtitle: `${ship.recipient_name} — ${ship.status}`,
      linkTo: `/warehouse/shipments/${ship.id}`,
      severity: 'info',
    });
  }

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  actions.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return actions;
}
