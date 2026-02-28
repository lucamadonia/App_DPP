/**
 * Warehouse Shipments Service
 * Shipment CRUD, status management, items
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { generateShipmentNumber, generateTransactionNumber } from '@/lib/return-number';
import type {
  WhShipment,
  WhShipmentItem,
  WhShipmentInput,
  ShipmentFilter,
  ShipmentStatus,
  WarehouseStats,
} from '@/types/warehouse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformShipment(row: any): WhShipment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shipmentNumber: row.shipment_number,
    status: row.status,
    recipientType: row.recipient_type,
    recipientName: row.recipient_name,
    recipientCompany: row.recipient_company || undefined,
    recipientEmail: row.recipient_email || undefined,
    recipientPhone: row.recipient_phone || undefined,
    shippingStreet: row.shipping_street,
    shippingCity: row.shipping_city,
    shippingState: row.shipping_state || undefined,
    shippingPostalCode: row.shipping_postal_code,
    shippingCountry: row.shipping_country,
    carrier: row.carrier || undefined,
    serviceLevel: row.service_level || undefined,
    trackingNumber: row.tracking_number || undefined,
    labelUrl: row.label_url || undefined,
    estimatedDelivery: row.estimated_delivery || undefined,
    shippedAt: row.shipped_at || undefined,
    deliveredAt: row.delivered_at || undefined,
    shippingCost: row.shipping_cost != null ? Number(row.shipping_cost) : undefined,
    currency: row.currency || 'EUR',
    totalWeightGrams: row.total_weight_grams != null ? Number(row.total_weight_grams) : undefined,
    totalItems: row.total_items || 0,
    sourceLocationId: row.source_location_id || undefined,
    orderReference: row.order_reference || undefined,
    customerId: row.customer_id || undefined,
    priority: row.priority || 'normal',
    notes: row.notes || undefined,
    internalNotes: row.internal_notes || undefined,
    carrierLabelData: row.carrier_label_data || undefined,
    packedBy: row.packed_by || undefined,
    shippedBy: row.shipped_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceLocationName: row.wh_locations?.name || undefined,
    contactId: row.contact_id || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformShipmentItem(row: any): WhShipmentItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shipmentId: row.shipment_id,
    productId: row.product_id,
    batchId: row.batch_id,
    locationId: row.location_id,
    quantity: row.quantity,
    quantityPicked: row.quantity_picked || 0,
    quantityPacked: row.quantity_packed || 0,
    unitPrice: row.unit_price != null ? Number(row.unit_price) : undefined,
    currency: row.currency || 'EUR',
    notes: row.notes || undefined,
    createdAt: row.created_at,
    productName: row.products?.name || undefined,
    batchSerialNumber: row.product_batches?.serial_number || undefined,
    locationName: row.wh_locations?.name || undefined,
  };
}

// ============================================
// SHIPMENTS CRUD
// ============================================

export async function getShipments(filter?: ShipmentFilter): Promise<{ data: WhShipment[]; total: number }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { data: [], total: 0 };

  const page = filter?.page || 1;
  const pageSize = filter?.pageSize || 25;

  let query = supabase
    .from('wh_shipments')
    .select('*, wh_locations(name)', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filter?.status?.length) query = query.in('status', filter.status);
  if (filter?.priority?.length) query = query.in('priority', filter.priority);
  if (filter?.carrier) query = query.eq('carrier', filter.carrier);
  if (filter?.recipientType?.length) query = query.in('recipient_type', filter.recipientType);
  if (filter?.contactId) query = query.eq('contact_id', filter.contactId);
  if (filter?.dateFrom) query = query.gte('created_at', filter.dateFrom);
  if (filter?.dateTo) query = query.lte('created_at', filter.dateTo);
  if (filter?.search) {
    query = query.or(
      `shipment_number.ilike.%${filter.search}%,recipient_name.ilike.%${filter.search}%,tracking_number.ilike.%${filter.search}%,order_reference.ilike.%${filter.search}%`
    );
  }

  // Sorting
  const SORT_COLUMN_MAP: Record<string, string> = {
    shipmentNumber: 'shipment_number',
    status: 'status',
    recipientName: 'recipient_name',
    carrier: 'carrier',
    totalItems: 'total_items',
    createdAt: 'created_at',
    priority: 'priority',
  };
  const sortCol = SORT_COLUMN_MAP[filter?.sortBy || ''] || 'created_at';
  const ascending = filter?.sortDir === 'asc';

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order(sortCol, { ascending })
    .range(from, to);

  if (error) {
    console.error('Failed to load shipments:', error);
    return { data: [], total: 0 };
  }
  return { data: (data || []).map(transformShipment), total: count || 0 };
}

export async function getShipmentStatusCounts(): Promise<Record<ShipmentStatus | 'all', number>> {
  const tenantId = await getCurrentTenantId();
  const result: Record<string, number> = {
    all: 0, draft: 0, picking: 0, packed: 0, label_created: 0,
    shipped: 0, in_transit: 0, delivered: 0, cancelled: 0,
  };
  if (!tenantId) return result as Record<ShipmentStatus | 'all', number>;

  const statuses: ShipmentStatus[] = ['draft', 'picking', 'packed', 'label_created', 'shipped', 'in_transit', 'delivered', 'cancelled'];

  const counts = await Promise.all(
    statuses.map(s =>
      supabase
        .from('wh_shipments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', s)
    )
  );

  let total = 0;
  statuses.forEach((s, i) => {
    const c = counts[i].count || 0;
    result[s] = c;
    total += c;
  });
  result.all = total;

  return result as Record<ShipmentStatus | 'all', number>;
}

export async function getShipment(id: string): Promise<WhShipment | null> {
  const { data, error } = await supabase
    .from('wh_shipments')
    .select('*, wh_locations(name)')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformShipment(data);
}

export async function createShipment(input: WhShipmentInput): Promise<WhShipment> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  // Quota check
  const { checkQuota } = await import('./billing');
  const quota = await checkQuota('shipment', { tenantId });
  if (!quota.allowed) throw new Error(`Shipment limit reached (${quota.current}/${quota.limit})`);

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const totalItems = input.items.reduce((sum, i) => sum + i.quantity, 0);

  // Create shipment
  const { data, error } = await supabase
    .from('wh_shipments')
    .insert({
      tenant_id: tenantId,
      shipment_number: generateShipmentNumber(),
      status: 'draft',
      recipient_type: input.recipientType,
      recipient_name: input.recipientName,
      recipient_company: input.recipientCompany || null,
      recipient_email: input.recipientEmail || null,
      recipient_phone: input.recipientPhone || null,
      shipping_street: input.shippingStreet,
      shipping_city: input.shippingCity,
      shipping_state: input.shippingState || null,
      shipping_postal_code: input.shippingPostalCode,
      shipping_country: input.shippingCountry,
      carrier: input.carrier || null,
      service_level: input.serviceLevel || null,
      tracking_number: input.trackingNumber || null,
      estimated_delivery: input.estimatedDelivery || null,
      shipping_cost: input.shippingCost || null,
      currency: input.currency || 'EUR',
      total_items: totalItems,
      source_location_id: input.sourceLocationId || null,
      order_reference: input.orderReference || null,
      customer_id: input.customerId || null,
      contact_id: input.contactId || null,
      priority: input.priority || 'normal',
      notes: input.notes || null,
      internal_notes: input.internalNotes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create shipment: ${error.message}`);

  // Create items
  if (input.items.length > 0) {
    const items = input.items.map(item => ({
      tenant_id: tenantId,
      shipment_id: data.id,
      product_id: item.productId,
      batch_id: item.batchId,
      location_id: item.locationId,
      quantity: item.quantity,
      unit_price: item.unitPrice || null,
      currency: item.currency || 'EUR',
      notes: item.notes || null,
    }));

    await supabase.from('wh_shipment_items').insert(items);

    // Reserve stock for each item
    for (const item of input.items) {
      const { data: stock } = await supabase
        .from('wh_stock_levels')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('location_id', item.locationId)
        .eq('batch_id', item.batchId)
        .maybeSingle();

      if (stock && stock.quantity_available >= item.quantity) {
        await supabase
          .from('wh_stock_levels')
          .update({
            quantity_available: stock.quantity_available - item.quantity,
            quantity_reserved: stock.quantity_reserved + item.quantity,
          })
          .eq('id', stock.id);

        // Log reservation transaction
        await supabase.from('wh_stock_transactions').insert({
          tenant_id: tenantId,
          transaction_number: generateTransactionNumber(),
          type: 'reservation',
          location_id: item.locationId,
          product_id: item.productId,
          batch_id: item.batchId,
          quantity: -item.quantity,
          quantity_before: stock.quantity_available,
          quantity_after: stock.quantity_available - item.quantity,
          shipment_id: data.id,
          performed_by: userId,
        });
      }
    }
  }

  return transformShipment(data);
}

export async function updateShipment(id: string, updates: Partial<{
  carrier: string;
  serviceLevel: string;
  trackingNumber: string;
  labelUrl: string;
  estimatedDelivery: string;
  shippingCost: number;
  totalWeightGrams: number;
  priority: string;
  notes: string;
  internalNotes: string;
  orderReference: string;
  recipientName: string;
  recipientCompany: string;
  recipientEmail: string;
  recipientPhone: string;
  shippingStreet: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  carrierLabelData: any;
}>): Promise<WhShipment> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (updates.carrier !== undefined) update.carrier = updates.carrier || null;
  if (updates.serviceLevel !== undefined) update.service_level = updates.serviceLevel || null;
  if (updates.trackingNumber !== undefined) update.tracking_number = updates.trackingNumber || null;
  if (updates.labelUrl !== undefined) update.label_url = updates.labelUrl || null;
  if (updates.estimatedDelivery !== undefined) update.estimated_delivery = updates.estimatedDelivery || null;
  if (updates.shippingCost !== undefined) update.shipping_cost = updates.shippingCost || null;
  if (updates.totalWeightGrams !== undefined) update.total_weight_grams = updates.totalWeightGrams || null;
  if (updates.priority !== undefined) update.priority = updates.priority;
  if (updates.notes !== undefined) update.notes = updates.notes || null;
  if (updates.internalNotes !== undefined) update.internal_notes = updates.internalNotes || null;
  if (updates.orderReference !== undefined) update.order_reference = updates.orderReference || null;
  if (updates.recipientName !== undefined) update.recipient_name = updates.recipientName;
  if (updates.recipientCompany !== undefined) update.recipient_company = updates.recipientCompany || null;
  if (updates.recipientEmail !== undefined) update.recipient_email = updates.recipientEmail || null;
  if (updates.recipientPhone !== undefined) update.recipient_phone = updates.recipientPhone || null;
  if (updates.shippingStreet !== undefined) update.shipping_street = updates.shippingStreet;
  if (updates.shippingCity !== undefined) update.shipping_city = updates.shippingCity;
  if (updates.shippingPostalCode !== undefined) update.shipping_postal_code = updates.shippingPostalCode;
  if (updates.shippingCountry !== undefined) update.shipping_country = updates.shippingCountry;
  if (updates.carrierLabelData !== undefined) update.carrier_label_data = updates.carrierLabelData;

  const { data, error } = await supabase
    .from('wh_shipments')
    .update(update)
    .eq('id', id)
    .select('*, wh_locations(name)')
    .single();

  if (error) throw new Error(`Failed to update shipment: ${error.message}`);
  return transformShipment(data);
}

export async function updateShipmentStatus(id: string, status: ShipmentStatus): Promise<WhShipment> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { status };

  if (status === 'shipped') {
    update.shipped_at = new Date().toISOString();
    update.shipped_by = userId;
  }
  if (status === 'delivered') {
    update.delivered_at = new Date().toISOString();
  }

  // When shipped, convert reservations to actual shipment deductions
  if (status === 'shipped') {
    const tenantId = await getCurrentTenantId();
    const items = await getShipmentItems(id);

    for (const item of items) {
      const { data: stock } = await supabase
        .from('wh_stock_levels')
        .select('*')
        .eq('location_id', item.locationId)
        .eq('batch_id', item.batchId)
        .maybeSingle();

      if (stock) {
        // Convert reservation to shipment (reduce reserved, don't touch available)
        await supabase
          .from('wh_stock_levels')
          .update({
            quantity_reserved: Math.max(0, stock.quantity_reserved - item.quantity),
          })
          .eq('id', stock.id);

        // Log shipment transaction
        await supabase.from('wh_stock_transactions').insert({
          tenant_id: tenantId,
          transaction_number: generateTransactionNumber(),
          type: 'shipment',
          location_id: item.locationId,
          product_id: item.productId,
          batch_id: item.batchId,
          quantity: -item.quantity,
          quantity_before: stock.quantity_available + stock.quantity_reserved,
          quantity_after: stock.quantity_available + stock.quantity_reserved - item.quantity,
          shipment_id: id,
          performed_by: userId,
        });
      }
    }
  }

  // When cancelled, release all reservations
  if (status === 'cancelled') {
    const items = await getShipmentItems(id);

    for (const item of items) {
      const { data: stock } = await supabase
        .from('wh_stock_levels')
        .select('*')
        .eq('location_id', item.locationId)
        .eq('batch_id', item.batchId)
        .maybeSingle();

      if (stock && stock.quantity_reserved >= item.quantity) {
        await supabase
          .from('wh_stock_levels')
          .update({
            quantity_available: stock.quantity_available + item.quantity,
            quantity_reserved: stock.quantity_reserved - item.quantity,
          })
          .eq('id', stock.id);
      }
    }
  }

  const { data, error } = await supabase
    .from('wh_shipments')
    .update(update)
    .eq('id', id)
    .select('*, wh_locations(name)')
    .single();

  if (error) throw new Error(`Failed to update status: ${error.message}`);

  // Auto-export fulfillment to Shopify when shipped
  if (status === 'shipped' && data.order_reference?.startsWith('Shopify ')) {
    import('./shopify-integration').then(({ createShopifyFulfillment }) => {
      createShopifyFulfillment(id).catch(err =>
        console.error('Shopify fulfillment export failed:', err)
      );
    });
  }

  return transformShipment(data);
}

export async function cancelShipment(id: string): Promise<WhShipment> {
  return updateShipmentStatus(id, 'cancelled');
}

// ============================================
// SHIPMENT ITEMS
// ============================================

export async function getShipmentItems(shipmentId: string): Promise<WhShipmentItem[]> {
  const { data, error } = await supabase
    .from('wh_shipment_items')
    .select('*, products(name), product_batches(serial_number), wh_locations(name)')
    .eq('shipment_id', shipmentId);

  if (error) {
    console.error('Failed to load shipment items:', error);
    return [];
  }
  return (data || []).map(transformShipmentItem);
}

export async function addShipmentItem(shipmentId: string, item: {
  productId: string;
  batchId: string;
  locationId: string;
  quantity: number;
  unitPrice?: number;
  notes?: string;
}): Promise<WhShipmentItem> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data, error } = await supabase
    .from('wh_shipment_items')
    .insert({
      tenant_id: tenantId,
      shipment_id: shipmentId,
      product_id: item.productId,
      batch_id: item.batchId,
      location_id: item.locationId,
      quantity: item.quantity,
      unit_price: item.unitPrice || null,
      notes: item.notes || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add item: ${error.message}`);

  // Update total items count
  const items = await getShipmentItems(shipmentId);
  const total = items.reduce((sum, i) => sum + i.quantity, 0);
  await supabase.from('wh_shipments').update({ total_items: total }).eq('id', shipmentId);

  return transformShipmentItem(data);
}

export async function removeShipmentItem(itemId: string): Promise<void> {
  // Get item first for shipment reference
  const { data: item } = await supabase
    .from('wh_shipment_items')
    .select('shipment_id')
    .eq('id', itemId)
    .single();

  const { error } = await supabase
    .from('wh_shipment_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(`Failed to remove item: ${error.message}`);

  // Update total items count
  if (item) {
    const items = await getShipmentItems(item.shipment_id);
    const total = items.reduce((sum, i) => sum + i.quantity, 0);
    await supabase.from('wh_shipments').update({ total_items: total }).eq('id', item.shipment_id);
  }
}

// ============================================
// STATS
// ============================================

export async function getShipmentStats(): Promise<Partial<WarehouseStats>> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [openRes, todayRes] = await Promise.all([
    supabase
      .from('wh_shipments')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['draft', 'picking', 'packed', 'label_created']),
    supabase
      .from('wh_shipments')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'shipped')
      .gte('shipped_at', today.toISOString()),
  ]);

  return {
    openShipments: openRes.count || 0,
    shippedToday: todayRes.count || 0,
  };
}
