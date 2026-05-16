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
import { SHIPMENT_STATUS_ORDER } from '@/types/warehouse';

/**
 * Status transition error — thrown by updateShipmentStatus when a forward
 * transition is missing prerequisites (e.g. carrier not set before label
 * creation). The UI catches these and surfaces them via toast or inline
 * hint instead of a generic "Failed to update status" message.
 */
export class ShipmentStatusError extends Error {
  /** Stable code so the UI can react (e.g. open the carrier picker). */
  code: 'CARRIER_REQUIRED' | 'NO_TENANT' | 'NOT_FOUND' | 'STATUS_LOCKED' | 'INSUFFICIENT_STOCK';
  constructor(code: ShipmentStatusError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'ShipmentStatusError';
  }
}

function statusIndex(s: ShipmentStatus): number {
  // 'cancelled' is not in the linear order — treat as "off-track" (-1).
  return SHIPMENT_STATUS_ORDER.indexOf(s);
}

function isBackwardFromShipped(oldStatus: ShipmentStatus, newStatus: ShipmentStatus): boolean {
  // Going from shipped/in_transit/delivered back to anything before shipped.
  const wasShippedOrLater = statusIndex(oldStatus) >= statusIndex('shipped');
  const goingBeforeShipped = statusIndex(newStatus) >= 0 && statusIndex(newStatus) < statusIndex('shipped');
  return wasShippedOrLater && goingBeforeShipped;
}

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
    shopifyOrderId: row.shopify_order_id ?? undefined,
    shopifyFulfillmentId: row.shopify_fulfillment_id ?? undefined,
    shopifyFulfillmentStatus: row.shopify_fulfillment_status ?? undefined,
    shopifyExportPending: row.shopify_export_pending ?? false,
    shopifyExportAttempts: row.shopify_export_attempts ?? 0,
    shopifyExportError: row.shopify_export_error ?? undefined,
    lastFulfillmentAt: row.last_fulfillment_at ?? undefined,
    trackingLastStatus: row.tracking_last_status ?? undefined,
    trackingLastDescription: row.tracking_last_description ?? undefined,
    trackingLastEventAt: row.tracking_last_event_at ?? undefined,
    trackingLastLocation: row.tracking_last_location ?? undefined,
    trackingPolledAt: row.tracking_polled_at ?? undefined,
    trackingToken: row.tracking_token ?? undefined,
    packagingTypeId: row.packaging_type_id ?? undefined,
    packagingTypeName: row.wh_packaging_types?.name ?? undefined,
    packagingTareGrams: row.wh_packaging_types?.tare_weight_grams ?? undefined,
    priority: row.priority || 'normal',
    notes: row.notes || undefined,
    internalNotes: row.internal_notes || undefined,
    carrierLabelData: row.carrier_label_data || undefined,
    packedBy: row.packed_by || undefined,
    shippedBy: row.shipped_by || undefined,
    sampleMeta: row.sample_meta || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceLocationName: row.wh_locations?.name || undefined,
    contactId: row.contact_id || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformShipmentItem(row: any): WhShipmentItem {
  // shopify_product_map is embedded under product_batches as an array (reverse
  // FK lookup). One batch should map to one variant in practice; take the
  // first active mapping that has a non-empty variant title.
  const mappings: Array<{ shopify_variant_title?: string | null; is_active?: boolean }> | undefined =
    row.product_batches?.shopify_product_map;
  const variantTitle = Array.isArray(mappings)
    ? mappings.find((m) => m?.is_active && m?.shopify_variant_title)?.shopify_variant_title
        || mappings.find((m) => m?.shopify_variant_title)?.shopify_variant_title
    : undefined;

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
    isGift: !!row.is_gift,
    giftNote: row.gift_note || undefined,
    createdAt: row.created_at,
    productName: row.products?.name || undefined,
    batchSerialNumber: row.product_batches?.serial_number || undefined,
    locationName: row.wh_locations?.name || undefined,
    variantTitle: variantTitle || undefined,
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
    .select('*, wh_locations(name), wh_packaging_types(name, tare_weight_grams)', { count: 'exact' })
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
    .select('*, wh_locations(name), wh_packaging_types(name, tare_weight_grams)')
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
      total_weight_grams: input.totalWeightGrams || null,
      source_location_id: input.sourceLocationId || null,
      order_reference: input.orderReference || null,
      customer_id: input.customerId || null,
      contact_id: input.contactId || null,
      priority: input.priority || 'normal',
      notes: input.notes || null,
      internal_notes: input.internalNotes || null,
      sample_meta: input.sampleMeta || null,
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

  // Compute total_weight_grams from batch/product gross_weight + packaging tare
  await recomputeShipmentWeight(data.id);

  return transformShipment(data);
}

// ============================================
// PACKAGING TYPES (Umverpackung)
// ============================================

export interface PackagingType {
  id: string;
  name: string;
  description?: string;
  tareWeightGrams: number;
  innerLengthCm?: number;
  innerWidthCm?: number;
  innerHeightCm?: number;
  maxLoadGrams?: number;
  isDefault: boolean;
  sortOrder: number;
  stockTracked?: boolean;
  stockOnHand?: number;
  stockThreshold?: number;
  lastRestockedAt?: string;
}

export async function getPackagingTypes(): Promise<PackagingType[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];
  const { data } = await supabase
    .from('wh_packaging_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || undefined,
    tareWeightGrams: r.tare_weight_grams || 0,
    innerLengthCm: r.inner_length_cm != null ? Number(r.inner_length_cm) : undefined,
    innerWidthCm: r.inner_width_cm != null ? Number(r.inner_width_cm) : undefined,
    innerHeightCm: r.inner_height_cm != null ? Number(r.inner_height_cm) : undefined,
    maxLoadGrams: r.max_load_grams != null ? Number(r.max_load_grams) : undefined,
    isDefault: !!r.is_default,
    sortOrder: r.sort_order || 0,
    stockTracked: r.stock_tracked ?? false,
    stockOnHand: r.stock_on_hand ?? 0,
    stockThreshold: r.stock_threshold ?? 10,
    lastRestockedAt: r.last_restocked_at ?? undefined,
  }));
}

// ============================================
// PACKAGING STOCK MANAGEMENT
// ============================================

export async function getPackagingLowStock(): Promise<PackagingType[]> {
  const all = await getPackagingTypes();
  return all.filter(p => p.stockTracked && (p.stockOnHand ?? 0) <= (p.stockThreshold ?? 10));
}

export async function recordPackagingReceipt(packagingTypeId: string, quantity: number, notes?: string): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');
  if (quantity <= 0) throw new Error('Quantity must be positive');

  const { data: pkg } = await supabase.from('wh_packaging_types').select('stock_on_hand').eq('id', packagingTypeId).maybeSingle();
  const before = pkg?.stock_on_hand ?? 0;
  const after = before + quantity;

  const { error: txnErr } = await supabase.from('wh_packaging_transactions').insert({
    tenant_id: tenantId,
    packaging_type_id: packagingTypeId,
    type: 'goods_receipt',
    quantity_change: quantity,
    quantity_before: before,
    quantity_after: after,
    notes: notes || null,
  });
  if (txnErr) throw new Error(txnErr.message);

  const { error: updErr } = await supabase
    .from('wh_packaging_types')
    .update({ stock_on_hand: after, last_restocked_at: new Date().toISOString() })
    .eq('id', packagingTypeId);
  if (updErr) throw new Error(updErr.message);
}

export async function adjustPackagingStock(packagingTypeId: string, newQuantity: number, notes?: string): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');
  if (newQuantity < 0) throw new Error('Quantity must be >= 0');

  const { data: pkg } = await supabase.from('wh_packaging_types').select('stock_on_hand').eq('id', packagingTypeId).maybeSingle();
  const before = pkg?.stock_on_hand ?? 0;
  const change = newQuantity - before;

  const { error: txnErr } = await supabase.from('wh_packaging_transactions').insert({
    tenant_id: tenantId,
    packaging_type_id: packagingTypeId,
    type: 'adjustment',
    quantity_change: change,
    quantity_before: before,
    quantity_after: newQuantity,
    notes: notes || 'Manuelle Inventur',
  });
  if (txnErr) throw new Error(txnErr.message);

  const { error: updErr } = await supabase
    .from('wh_packaging_types')
    .update({ stock_on_hand: newQuantity })
    .eq('id', packagingTypeId);
  if (updErr) throw new Error(updErr.message);
}

export async function updatePackagingTracking(packagingTypeId: string, stockTracked: boolean, stockThreshold?: number): Promise<void> {
  const patch: Record<string, unknown> = { stock_tracked: stockTracked };
  if (stockThreshold != null) patch.stock_threshold = stockThreshold;
  const { error } = await supabase.from('wh_packaging_types').update(patch).eq('id', packagingTypeId);
  if (error) throw new Error(error.message);
}

/**
 * Re-berechnet total_weight_grams eines Shipments aus den items
 * (Batch-Gewicht → Product-Gewicht als Fallback) plus Packaging-Tara.
 * Wird aufgerufen nach jeder Mengen-/Item-/Packaging-Änderung.
 * Läuft silent (keine Errors) — wenn nichts berechnet werden kann, bleibt
 * total_weight_grams so wie es war.
 */
export async function recomputeShipmentWeight(shipmentId: string): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return;
  const { data: ship } = await supabase
    .from('wh_shipments')
    .select('id, packaging_type_id, tenant_id')
    .eq('id', shipmentId)
    .maybeSingle();
  if (!ship) return;
  const { data: items } = await supabase
    .from('wh_shipment_items')
    .select('product_id, batch_id, quantity')
    .eq('shipment_id', shipmentId);
  if (!items?.length) return;
  let itemsWeight = 0;
  for (const it of items) {
    let w: number | null = null;
    if (it.batch_id) {
      const { data: b } = await supabase
        .from('product_batches')
        .select('gross_weight, net_weight')
        .eq('id', it.batch_id)
        .maybeSingle();
      w = (b?.gross_weight ?? b?.net_weight) as number | null;
    }
    if (w === null) {
      const { data: p } = await supabase
        .from('products')
        .select('gross_weight, net_weight')
        .eq('tenant_id', ship.tenant_id)
        .eq('id', it.product_id)
        .maybeSingle();
      w = (p?.gross_weight ?? p?.net_weight) as number | null;
    }
    if (w !== null) itemsWeight += w * (it.quantity || 0);
  }
  let tare = 0;
  if (ship.packaging_type_id) {
    const { data: pkg } = await supabase
      .from('wh_packaging_types')
      .select('tare_weight_grams')
      .eq('id', ship.packaging_type_id)
      .maybeSingle();
    tare = pkg?.tare_weight_grams || 0;
  }
  const total = itemsWeight + tare;
  if (total > 0) {
    await supabase.from('wh_shipments').update({ total_weight_grams: total }).eq('id', shipmentId);
  }
}

/**
 * Assigns a packaging type to a shipment and recomputes total_weight_grams
 * = sum(items.gross_weight × qty) + packaging.tare_weight_grams.
 */
export async function setShipmentPackaging(shipmentId: string, packagingTypeId: string | null): Promise<WhShipment> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  let tare = 0;
  if (packagingTypeId) {
    const { data: pkg } = await supabase.from('wh_packaging_types').select('tare_weight_grams').eq('id', packagingTypeId).maybeSingle();
    tare = pkg?.tare_weight_grams || 0;
  }
  const { data: items } = await supabase
    .from('wh_shipment_items')
    .select('product_id, batch_id, quantity')
    .eq('shipment_id', shipmentId);
  let itemsWeight = 0;
  for (const it of (items || [])) {
    let w: number | null = null;
    if (it.batch_id) {
      const { data: b } = await supabase.from('product_batches').select('gross_weight, net_weight').eq('id', it.batch_id).maybeSingle();
      w = (b?.gross_weight ?? b?.net_weight) as number | null;
    }
    if (w === null) {
      const { data: p } = await supabase.from('products').select('gross_weight, net_weight').eq('tenant_id', tenantId).eq('id', it.product_id).maybeSingle();
      w = (p?.gross_weight ?? p?.net_weight) as number | null;
    }
    if (w !== null) itemsWeight += w * (it.quantity || 0);
  }
  const total = itemsWeight + tare;

  const { data, error } = await supabase
    .from('wh_shipments')
    .update({ packaging_type_id: packagingTypeId, total_weight_grams: total > 0 ? total : null })
    .eq('id', shipmentId)
    .select('*, wh_locations(name), wh_packaging_types(name, tare_weight_grams)')
    .single();
  if (error) throw new Error(`Failed to set packaging: ${error.message}`);
  return transformShipment(data);
}

/**
 * Smart suggestion: smallest packaging whose inner volume covers items' volume × 1.2
 * and whose max_load_grams is >= items weight. Returns packaging ID or null if none fits.
 */
export async function suggestPackaging(shipmentId: string): Promise<{ packagingId: string | null; reason: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { packagingId: null, reason: 'no tenant' };
  const { data: items } = await supabase
    .from('wh_shipment_items')
    .select('product_id, quantity')
    .eq('shipment_id', shipmentId);
  if (!items?.length) return { packagingId: null, reason: 'no items' };

  let itemsWeight = 0;
  let itemsVolume = 0;
  for (const it of items) {
    const { data: p } = await supabase
      .from('products')
      .select('gross_weight, net_weight, product_height_cm, product_width_cm, product_depth_cm, packaging_height_cm, packaging_width_cm, packaging_depth_cm')
      .eq('tenant_id', tenantId)
      .eq('id', it.product_id)
      .maybeSingle();
    const w = p?.gross_weight ?? p?.net_weight;
    if (w) itemsWeight += Number(w) * (it.quantity || 0);
    const h = p?.packaging_height_cm ?? p?.product_height_cm ?? 0;
    const w2 = p?.packaging_width_cm ?? p?.product_width_cm ?? 0;
    const d = p?.packaging_depth_cm ?? p?.product_depth_cm ?? 0;
    if (h && w2 && d) itemsVolume += Number(h) * Number(w2) * Number(d) * (it.quantity || 0);
  }

  const { data: packs } = await supabase
    .from('wh_packaging_types')
    .select('id, name, tare_weight_grams, inner_length_cm, inner_width_cm, inner_height_cm, max_load_grams, is_default')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (!packs?.length) return { packagingId: null, reason: 'no packaging types' };
  const required = itemsVolume * 1.2;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fits = (packs as any[]).filter((p) => {
    const vol = Number(p.inner_length_cm || 0) * Number(p.inner_width_cm || 0) * Number(p.inner_height_cm || 0);
    const okVol = required === 0 || vol >= required;
    const okWeight = !p.max_load_grams || itemsWeight <= p.max_load_grams;
    return okVol && okWeight;
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chosen = fits[0] || (packs as any[]).find((p) => p.is_default) || packs[0];
  return {
    packagingId: chosen?.id || null,
    reason: itemsVolume > 0
      ? `${chosen?.name} — deckt ${Math.round(itemsVolume)} cm³ Produkt-Volumen (+20% Packpuffer)`
      : `${chosen?.name} — Default (keine Produkt-Maße hinterlegt)`,
  };
}

/**
 * Setzt quantity_picked auf ein bestimmtes Item. Wird vom Pick-Dialog genutzt
 * um einzelne Positionen abzuhaken. Aufruf mit quantity === full bedeutet
 * komplett gepickt.
 */
export async function confirmItemPick(itemId: string, quantity: number): Promise<void> {
  const { error } = await supabase
    .from('wh_shipment_items')
    .update({ quantity_picked: quantity })
    .eq('id', itemId);
  if (error) throw new Error(`Failed to confirm pick: ${error.message}`);
}

export async function confirmItemPack(itemId: string, quantity: number): Promise<void> {
  const { error } = await supabase
    .from('wh_shipment_items')
    .update({ quantity_packed: quantity })
    .eq('id', itemId);
  if (error) throw new Error(`Failed to confirm pack: ${error.message}`);
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
    .select('*, wh_locations(name), wh_packaging_types(name, tare_weight_grams)')
    .single();

  if (error) throw new Error(`Failed to update shipment: ${error.message}`);

  // Push tracking update to Shopify if fulfillment already exists and tracking changed
  const trackingChanged =
    updates.trackingNumber !== undefined ||
    updates.carrier !== undefined ||
    updates.labelUrl !== undefined;
  if (trackingChanged && data.shopify_fulfillment_id && data.tracking_number) {
    import('./shopify-integration').then(({ updateShopifyFulfillmentTracking }) => {
      updateShopifyFulfillmentTracking(id).catch(err =>
        console.error('Shopify tracking update failed:', err)
      );
    });
  }

  return transformShipment(data);
}

/**
 * Single guarded entry point for shipment status transitions.
 *
 * Forward guards (throws ShipmentStatusError):
 *  - `label_created`, `shipped`, `in_transit`, `delivered` require carrier set
 *
 * Backward cleanup (silent, automatic):
 *  - From `shipped|in_transit|delivered` → anything before `shipped`:
 *    restores quantity_reserved, logs reverse-shipment transactions,
 *    clears `shipped_at`/`shipped_by`.
 *  - From `delivered` → anything before `delivered`: clears `delivered_at`.
 *  - From `cancelled` → anything else: releases nothing (re-running the cycle
 *    would re-reserve stock at the next forward step).
 *
 * Returns the updated shipment. Same-status calls are a no-op.
 */
export async function updateShipmentStatus(id: string, status: ShipmentStatus): Promise<WhShipment> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new ShipmentStatusError('NO_TENANT', 'No tenant');

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  // 1. Load current state — needed for both guards and cleanup decisions.
  const current = await getShipment(id);
  if (!current) throw new ShipmentStatusError('NOT_FOUND', `Shipment ${id} not found`);

  const oldStatus = current.status;
  if (oldStatus === status) return current; // no-op

  // 2. Forward guards — fail fast before any DB mutation.
  const carrierRequired: ShipmentStatus[] = ['label_created', 'shipped', 'in_transit', 'delivered'];
  if (carrierRequired.includes(status) && !current.carrier) {
    throw new ShipmentStatusError(
      'CARRIER_REQUIRED',
      'Carrier must be set before advancing to this status',
    );
  }

  // 3. Build the patch for wh_shipments.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = { status };

  if (status === 'shipped') {
    update.shipped_at = new Date().toISOString();
    update.shipped_by = userId;
  }
  if (status === 'delivered') {
    update.delivered_at = new Date().toISOString();
  }

  // 4. Backward cleanup — fix the historical "silent revert" bug:
  //   if user moves status from shipped (or later) back to anything before
  //   shipped, restore the reservation that was consumed by the original
  //   shipment, log a reverse transaction, and clear the timestamp so the
  //   activity log doesn't lie about the state.
  const goingBackward = isBackwardFromShipped(oldStatus, status);
  if (goingBackward) {
    const items = await getShipmentItems(id);
    for (const item of items) {
      if (!item.batchId || !item.locationId) continue;
      const { data: stock } = await supabase
        .from('wh_stock_levels')
        .select('*')
        .eq('location_id', item.locationId)
        .eq('batch_id', item.batchId)
        .maybeSingle();
      if (!stock) continue;

      const newReserved = stock.quantity_reserved + item.quantity;
      await supabase
        .from('wh_stock_levels')
        .update({ quantity_reserved: newReserved })
        .eq('id', stock.id);

      await supabase.from('wh_stock_transactions').insert({
        tenant_id: tenantId,
        transaction_number: generateTransactionNumber(),
        type: 'reservation',
        location_id: item.locationId,
        product_id: item.productId,
        batch_id: item.batchId,
        quantity: item.quantity, // positive — restoring a reservation
        quantity_before: stock.quantity_reserved,
        quantity_after: newReserved,
        shipment_id: id,
        performed_by: userId,
        notes: `Reverse: shipment status reverted ${oldStatus} → ${status}`,
      });
    }
    update.shipped_at = null;
    update.shipped_by = null;
  }

  // 5. Backward from delivered (but not as far as before-shipped): just
  //    clear delivered_at so the activity log stays consistent.
  if (oldStatus === 'delivered' && status !== 'delivered' && !goingBackward) {
    update.delivered_at = null;
  }

  // 6. Forward to shipped — convert reservations to actual deductions.
  //    (Skip when going from in_transit/delivered back to shipped — there's
  //    no stock change in that direction.)
  if (status === 'shipped' && statusIndex(oldStatus) < statusIndex('shipped')) {
    const items = await getShipmentItems(id);
    for (const item of items) {
      if (!item.batchId || !item.locationId) continue;
      const { data: stock } = await supabase
        .from('wh_stock_levels')
        .select('*')
        .eq('location_id', item.locationId)
        .eq('batch_id', item.batchId)
        .maybeSingle();
      if (!stock) continue;

      await supabase
        .from('wh_stock_levels')
        .update({
          quantity_reserved: Math.max(0, stock.quantity_reserved - item.quantity),
        })
        .eq('id', stock.id);

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

  // 7. Cancelled — release all open reservations back into available stock.
  if (status === 'cancelled') {
    const items = await getShipmentItems(id);
    for (const item of items) {
      if (!item.batchId || !item.locationId) continue;
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

  // 8. Persist the patch.
  const { data, error } = await supabase
    .from('wh_shipments')
    .update(update)
    .eq('id', id)
    .select('*, wh_locations(name), wh_packaging_types(name, tare_weight_grams)')
    .single();

  if (error) throw new Error(`Failed to update status: ${error.message}`);

  // 9. Auto-export fulfillment to Shopify ONLY on the genuine forward
  //    transition into shipped (not on revert+re-ship cycles where a
  //    fulfillment already exists).
  const isForwardToShipped = status === 'shipped' && statusIndex(oldStatus) < statusIndex('shipped');
  if (isForwardToShipped && (data.shopify_order_id || data.order_reference?.startsWith('Shopify '))) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', data.tenant_id)
      .single();
    const autoExport = tenant?.settings?.shopifyIntegration?.syncConfig?.autoExportFulfillment;
    if (autoExport === false) {
      await supabase
        .from('wh_shipments')
        .update({ shopify_export_pending: true })
        .eq('id', id);
    } else {
      import('./shopify-integration').then(({ createShopifyFulfillment }) => {
        createShopifyFulfillment(id).catch(err => {
          console.error('Shopify fulfillment export failed:', err);
          supabase
            .from('wh_shipments')
            .update({
              shopify_export_pending: true,
              shopify_export_error: err?.message || String(err),
            })
            .eq('id', id);
        });
      });
    }
  }

  return transformShipment(data);
}

export async function cancelShipment(id: string): Promise<WhShipment> {
  return updateShipmentStatus(id, 'cancelled');
}

// ============================================
// SHIPMENT ITEMS
// ============================================

/**
 * Batch-fetch items for many shipments in a single query. Used by the CSV
 * export so we can include per-shipment product lists without N+1 round
 * trips. Returns a map keyed by shipment_id.
 */
export async function getItemsForShipments(
  shipmentIds: string[],
): Promise<Map<string, WhShipmentItem[]>> {
  const map = new Map<string, WhShipmentItem[]>();
  if (shipmentIds.length === 0) return map;

  // Supabase has a soft URL-length cap; chunk to 200 ids per request.
  const CHUNK = 200;
  for (let i = 0; i < shipmentIds.length; i += CHUNK) {
    const slice = shipmentIds.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from('wh_shipment_items')
      .select('*, products(name), product_batches(serial_number, shopify_product_map(shopify_variant_title, is_active)), wh_locations(name)')
      .in('shipment_id', slice);
    if (error || !data) continue;
    for (const row of data) {
      const transformed = transformShipmentItem(row);
      const arr = map.get(transformed.shipmentId) || [];
      arr.push(transformed);
      map.set(transformed.shipmentId, arr);
    }
  }
  return map;
}

export async function getShipmentItems(shipmentId: string): Promise<WhShipmentItem[]> {
  const { data, error } = await supabase
    .from('wh_shipment_items')
    .select('*, products(name), product_batches(serial_number, shopify_product_map(shopify_variant_title, is_active)), wh_locations(name)')
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
  isGift?: boolean;
  giftNote?: string;
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
      // Gift positions are billed at 0 regardless of any unit_price passed in.
      unit_price: item.isGift ? 0 : (item.unitPrice ?? null),
      notes: item.notes || null,
      is_gift: !!item.isGift,
      gift_note: item.giftNote || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add item: ${error.message}`);

  // Reserve stock for the new position so inventory stays accurate and the
  // reservation→shipment conversion in updateShipmentStatus('shipped') picks
  // it up. Skip silently if no matching stock row exists or coverage is short
  // — mirrors the behavior of createShipment().
  if (item.batchId && item.locationId && item.quantity > 0) {
    const { data: stock } = await supabase
      .from('wh_stock_levels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('location_id', item.locationId)
      .eq('batch_id', item.batchId)
      .maybeSingle();

    if (stock && stock.quantity_available >= item.quantity) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;

      await supabase
        .from('wh_stock_levels')
        .update({
          quantity_available: stock.quantity_available - item.quantity,
          quantity_reserved: stock.quantity_reserved + item.quantity,
        })
        .eq('id', stock.id);

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
        shipment_id: shipmentId,
        performed_by: userId,
        notes: item.isGift ? 'Beigabe / Geschenk hinzugefügt' : null,
      });
    }
  }

  // Update total items count
  const items = await getShipmentItems(shipmentId);
  const total = items.reduce((sum, i) => sum + i.quantity, 0);
  await supabase.from('wh_shipments').update({ total_items: total }).eq('id', shipmentId);

  // Recompute weight (Batch → Product fallback + Packaging-Tara)
  await recomputeShipmentWeight(shipmentId);

  return transformShipmentItem(data);
}

/**
 * Patch a shipment item — used by the manual batch-assignment UI to fix
 * items that came in from Shopify without a batch (or with a wrong one).
 *
 * Reservation diff is auto-applied:
 *  - if the old item had (batchId + locationId + quantity) reserved → release
 *    via `quantity_reserved -= oldQuantity` + log `release` transaction
 *  - if the new patch has (batchId + locationId + quantity) → reserve via
 *    `quantity_available -= newQuantity, quantity_reserved += newQuantity` +
 *    log `reservation` transaction
 *
 * Refuses to run when the shipment is past `packed` (label_created and later)
 * because changing items after a real DHL label has been generated would
 * desync the label PDF from the actual contents.
 */
export async function updateShipmentItem(
  itemId: string,
  patch: { batchId?: string | null; locationId?: string; quantity?: number; notes?: string | null },
): Promise<WhShipmentItem> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new ShipmentStatusError('NO_TENANT', 'No tenant');

  // Load the current item + its shipment for status check.
  const { data: rawItem, error: loadErr } = await supabase
    .from('wh_shipment_items')
    .select('*')
    .eq('id', itemId)
    .single();
  if (loadErr || !rawItem) throw new ShipmentStatusError('NOT_FOUND', `Item ${itemId} not found`);

  const shipment = await getShipment(rawItem.shipment_id);
  if (!shipment) throw new ShipmentStatusError('NOT_FOUND', `Shipment ${rawItem.shipment_id} not found`);

  const editableStatuses: ShipmentStatus[] = ['draft', 'picking', 'packed'];
  if (!editableStatuses.includes(shipment.status)) {
    throw new ShipmentStatusError(
      'STATUS_LOCKED',
      `Cannot edit items in status ${shipment.status} — revert to "packed" first`,
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  const oldBatchId = rawItem.batch_id as string | null;
  const oldLocationId = rawItem.location_id as string;
  const oldQuantity = rawItem.quantity as number;

  const newBatchId = patch.batchId !== undefined ? patch.batchId : oldBatchId;
  const newLocationId = patch.locationId ?? oldLocationId;
  const newQuantity = patch.quantity ?? oldQuantity;

  // 1. Release the old reservation (only if old item actually had stock locked).
  if (oldBatchId && oldLocationId && oldQuantity > 0) {
    const { data: oldStock } = await supabase
      .from('wh_stock_levels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('location_id', oldLocationId)
      .eq('batch_id', oldBatchId)
      .maybeSingle();

    if (oldStock) {
      const releasedReserved = Math.max(0, oldStock.quantity_reserved - oldQuantity);
      const restoredAvailable = oldStock.quantity_available + Math.min(oldStock.quantity_reserved, oldQuantity);
      await supabase
        .from('wh_stock_levels')
        .update({ quantity_reserved: releasedReserved, quantity_available: restoredAvailable })
        .eq('id', oldStock.id);

      await supabase.from('wh_stock_transactions').insert({
        tenant_id: tenantId,
        transaction_number: generateTransactionNumber(),
        type: 'release',
        location_id: oldLocationId,
        product_id: rawItem.product_id,
        batch_id: oldBatchId,
        quantity: oldQuantity,
        quantity_before: oldStock.quantity_reserved,
        quantity_after: releasedReserved,
        shipment_id: rawItem.shipment_id,
        performed_by: userId,
        notes: 'Released for shipment item edit',
      });
    }
  }

  // 2. Reserve the new combination (skip silently if no stock row or insufficient).
  if (newBatchId && newLocationId && newQuantity > 0) {
    const { data: newStock } = await supabase
      .from('wh_stock_levels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('location_id', newLocationId)
      .eq('batch_id', newBatchId)
      .maybeSingle();

    if (newStock && newStock.quantity_available >= newQuantity) {
      await supabase
        .from('wh_stock_levels')
        .update({
          quantity_available: newStock.quantity_available - newQuantity,
          quantity_reserved: newStock.quantity_reserved + newQuantity,
        })
        .eq('id', newStock.id);

      await supabase.from('wh_stock_transactions').insert({
        tenant_id: tenantId,
        transaction_number: generateTransactionNumber(),
        type: 'reservation',
        location_id: newLocationId,
        product_id: rawItem.product_id,
        batch_id: newBatchId,
        quantity: -newQuantity,
        quantity_before: newStock.quantity_available,
        quantity_after: newStock.quantity_available - newQuantity,
        shipment_id: rawItem.shipment_id,
        performed_by: userId,
        notes: 'Reserved after shipment item edit',
      });
    }
  }

  // 3. Persist the item patch.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemUpdate: Record<string, any> = {};
  if (patch.batchId !== undefined) itemUpdate.batch_id = patch.batchId;
  if (patch.locationId !== undefined) itemUpdate.location_id = patch.locationId;
  if (patch.quantity !== undefined) itemUpdate.quantity = patch.quantity;
  if (patch.notes !== undefined) itemUpdate.notes = patch.notes;

  const { data: updated, error: updErr } = await supabase
    .from('wh_shipment_items')
    .update(itemUpdate)
    .eq('id', itemId)
    .select('*, products(name), product_batches(serial_number), wh_locations(name)')
    .single();
  if (updErr) throw new Error(`Failed to update item: ${updErr.message}`);

  // 4. Recompute totals.
  const items = await getShipmentItems(rawItem.shipment_id);
  const total = items.reduce((sum, i) => sum + i.quantity, 0);
  await supabase.from('wh_shipments').update({ total_items: total }).eq('id', rawItem.shipment_id);
  await recomputeShipmentWeight(rawItem.shipment_id);

  return transformShipmentItem(updated);
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

  // Update total items count + recompute weight
  if (item) {
    const items = await getShipmentItems(item.shipment_id);
    const total = items.reduce((sum, i) => sum + i.quantity, 0);
    await supabase.from('wh_shipments').update({ total_items: total }).eq('id', item.shipment_id);
    await recomputeShipmentWeight(item.shipment_id);
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

// ============================================
// SHIPMENT MERGE
// ============================================

/**
 * Find other shipments that could be merged INTO the given one — same tenant,
 * different shipment id, status in {draft, picking}, and preferably the same
 * recipient. Returns email-matched candidates first, then name-matched, then
 * all other open shipments (so the user can override when emails differ).
 */
export async function getMergeCandidates(shipmentId: string): Promise<WhShipment[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data: src, error: srcErr } = await supabase
    .from('wh_shipments')
    .select('id, recipient_email, recipient_name')
    .eq('id', shipmentId)
    .single();
  if (srcErr || !src) return [];

  const { data, error } = await supabase
    .from('wh_shipments')
    .select('*, wh_locations(name), wh_packaging_types(name, tare_weight_grams)')
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'picking'])
    .neq('id', shipmentId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const all = data.map(transformShipment);
  const email = (src.recipient_email || '').trim().toLowerCase();
  const name = (src.recipient_name || '').trim().toLowerCase();

  // Rank: same-email first, then same-name, then the rest.
  const score = (s: WhShipment): number => {
    const e = (s.recipientEmail || '').trim().toLowerCase();
    const n = (s.recipientName || '').trim().toLowerCase();
    if (email && e === email) return 0;
    if (name && n === name) return 1;
    return 2;
  };
  return all.sort((a, b) => score(a) - score(b));
}

/**
 * Merge `sourceId` INTO `targetId`. Both shipments must be in `draft` or
 * `picking`. All line items move from source → target (stock reservation is
 * untouched because the aggregate `quantity_reserved` is per location/batch,
 * not per shipment). The source is set to `cancelled` directly — bypassing
 * `updateShipmentStatus` so the standard cancel-path doesn't try to release
 * reservations for items that have already moved off the source.
 *
 * Both shipments' internal_notes get an audit line referencing the other so
 * the merge is traceable. The Shopify order references of the source are
 * appended to the target's order_reference for the same reason.
 */
export async function mergeShipments(sourceId: string, targetId: string): Promise<WhShipment> {
  if (sourceId === targetId) throw new Error('Source and target must differ');
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const [{ data: srcRow, error: srcErr }, { data: tgtRow, error: tgtErr }] = await Promise.all([
    supabase.from('wh_shipments').select('*').eq('id', sourceId).eq('tenant_id', tenantId).single(),
    supabase.from('wh_shipments').select('*').eq('id', targetId).eq('tenant_id', tenantId).single(),
  ]);
  if (srcErr || !srcRow) throw new Error('Source shipment not found');
  if (tgtErr || !tgtRow) throw new Error('Target shipment not found');

  const editable: ShipmentStatus[] = ['draft', 'picking'];
  if (!editable.includes(srcRow.status)) {
    throw new Error(`Source must be draft or picking (currently ${srcRow.status})`);
  }
  if (!editable.includes(tgtRow.status)) {
    throw new Error(`Target must be draft or picking (currently ${tgtRow.status})`);
  }

  // 1. Move every line item from source to target. Stock reservation aggregate
  //    is per (location, batch) so simply changing shipment_id is correct.
  const { error: moveErr } = await supabase
    .from('wh_shipment_items')
    .update({ shipment_id: targetId })
    .eq('shipment_id', sourceId);
  if (moveErr) throw new Error(`Failed to move items: ${moveErr.message}`);

  // 2. Recompute target totals + weight.
  const targetItems = await getShipmentItems(targetId);
  const newTotal = targetItems.reduce((sum, i) => sum + i.quantity, 0);
  await supabase.from('wh_shipments').update({ total_items: newTotal }).eq('id', targetId);
  await recomputeShipmentWeight(targetId);

  // 3. Build audit notes.
  const stamp = new Date().toISOString().split('T')[0];
  const srcOrderRef = srcRow.order_reference ? ` (${srcRow.order_reference})` : '';
  const tgtOrderRef = tgtRow.order_reference ? ` (${tgtRow.order_reference})` : '';
  const targetNote = `[${stamp}] Merged in ${srcRow.shipment_number}${srcOrderRef}`;
  const sourceNote = `[${stamp}] Merged into ${tgtRow.shipment_number}${tgtOrderRef}`;

  const newTargetNotes = tgtRow.internal_notes
    ? `${tgtRow.internal_notes}\n${targetNote}`
    : targetNote;
  const newSourceNotes = srcRow.internal_notes
    ? `${srcRow.internal_notes}\n${sourceNote}`
    : sourceNote;

  // 4. Append the source's order_reference to the target's so both Shopify
  //    orders remain visible. Skip if the target already references it.
  const refs = new Set<string>();
  if (tgtRow.order_reference) refs.add(tgtRow.order_reference);
  if (srcRow.order_reference) refs.add(srcRow.order_reference);
  const combinedOrderRef = refs.size > 0 ? Array.from(refs).join(' + ') : null;

  // 5. Patch target (no status change — keep its current draft/picking state).
  const { error: tgtUpdErr } = await supabase
    .from('wh_shipments')
    .update({
      internal_notes: newTargetNotes,
      order_reference: combinedOrderRef,
    })
    .eq('id', targetId);
  if (tgtUpdErr) throw new Error(`Failed to update target: ${tgtUpdErr.message}`);

  // 6. Mark source as cancelled DIRECTLY (not via updateShipmentStatus to avoid
  //    the reservation-release path — items have already moved off this row).
  const { error: srcUpdErr } = await supabase
    .from('wh_shipments')
    .update({
      status: 'cancelled' as ShipmentStatus,
      internal_notes: newSourceNotes,
      total_items: 0,
      total_weight_grams: null,
    })
    .eq('id', sourceId);
  if (srcUpdErr) throw new Error(`Failed to cancel source: ${srcUpdErr.message}`);

  // 7. Return the updated target.
  const updated = await getShipment(targetId);
  if (!updated) throw new Error('Failed to reload target shipment');
  return updated;
}
