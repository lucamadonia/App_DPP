/**
 * Supabase Edge Function: shopify-webhook
 *
 * Receives Shopify webhooks. HMAC-verifies, dedups via x-shopify-webhook-id,
 * records in shopify_webhook_events (dead-letter queue), then dispatches to
 * topic-specific handlers.
 *
 * Supported topics:
 *   - orders/create          → create wh_shipment + reserve stock
 *   - orders/updated         → handle cancellation or paid transitions
 *   - orders/cancelled       → cancel shipment + release stock
 *   - orders/fulfilled       → progress shipment to shipped
 *   - orders/paid            → re-enter order-created path (was filtered out earlier)
 *   - fulfillments/create    → write shopify_fulfillment_id + tracking mirror
 *   - fulfillments/update    → update fulfillment status + tracking
 *   - refunds/create         → mirror Shopify refund into rh_returns
 *   - customers/create       → upsert rh_customers
 *   - customers/update       → upsert rh_customers
 *   - inventory_levels/update → log-only by default (importInventory flag to write)
 *   - app/uninstalled        → wipe shopifyIntegration settings
 *
 * Deployment:
 *   supabase functions deploy shopify-webhook --no-verify-jwt
 *
 * Required Supabase Secrets:
 *   - SHOPIFY_WEBHOOK_SECRET (HMAC verification)
 *   - SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SHOPIFY_WEBHOOK_SECRET = Deno.env.get('SHOPIFY_WEBHOOK_SECRET') || '';

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let eventId: string | null = null;
  try {
    const rawBody = await req.text();

    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    const shopDomain = req.headers.get('x-shopify-shop-domain') || '';
    const topic = req.headers.get('x-shopify-topic') || '';
    const webhookId = req.headers.get('x-shopify-webhook-id') || '';

    const isValid = hmacHeader && SHOPIFY_WEBHOOK_SECRET
      ? await verifyHmac(rawBody, hmacHeader, SHOPIFY_WEBHOOK_SECRET)
      : false;

    // Dedup via webhookId (fast short-circuit if this delivery was seen before)
    if (webhookId) {
      const { data: dupe } = await supabase
        .from('shopify_webhook_events')
        .select('id, status')
        .eq('shopify_webhook_id', webhookId)
        .maybeSingle();
      if (dupe) {
        console.log(`Duplicate webhook ${webhookId} (status=${dupe.status}), returning 200`);
        return json({ received: true, deduped: true }, 200);
      }
    }

    let payload: unknown = {};
    try { payload = JSON.parse(rawBody); } catch { /* keep empty */ }

    // Resolve tenant upfront so we can tag the log row
    const tenantId = await resolveTenant(supabase, shopDomain);

    const { data: logRow } = await supabase
      .from('shopify_webhook_events')
      .insert({
        tenant_id: tenantId,
        shop_domain: shopDomain,
        topic,
        shopify_webhook_id: webhookId || null,
        payload,
        hmac_valid: isValid,
        status: 'pending',
      })
      .select('id')
      .single();
    eventId = logRow?.id;

    if (!isValid) {
      await markEvent(supabase, eventId, 'failed', 'HMAC invalid');
      return json({ error: 'Invalid HMAC signature' }, 401);
    }
    if (!shopDomain) {
      await markEvent(supabase, eventId, 'failed', 'Missing shop domain');
      return json({ error: 'Missing shop domain' }, 400);
    }
    if (!tenantId) {
      await markEvent(supabase, eventId, 'failed', `Unknown shop domain: ${shopDomain}`);
      return json({ error: 'Unknown shop domain' }, 404);
    }

    console.log(`Shopify webhook: topic=${topic}, shop=${shopDomain}, event=${eventId}`);

    // deno-lint-ignore no-explicit-any
    const body = payload as any;

    switch (topic) {
      case 'orders/create':
        await handleOrderCreated(supabase, tenantId, body);
        break;
      case 'orders/updated':
        await handleOrderUpdated(supabase, tenantId, body);
        break;
      case 'orders/cancelled':
        await handleOrderCancelled(supabase, tenantId, body);
        break;
      case 'orders/fulfilled':
        await handleOrderFulfilled(supabase, tenantId, body);
        break;
      case 'orders/paid':
        await handleOrderPaid(supabase, tenantId, body);
        break;
      case 'fulfillments/create':
      case 'fulfillments/update':
        await handleFulfillmentUpsert(supabase, tenantId, body);
        break;
      case 'refunds/create':
        await handleRefundCreated(supabase, tenantId, body);
        break;
      case 'customers/create':
      case 'customers/update':
        await handleCustomerUpsert(supabase, tenantId, body);
        break;
      case 'inventory_levels/update':
        await handleInventoryLevelUpdate(supabase, tenantId, body);
        break;
      case 'app/uninstalled':
        await handleAppUninstalled(supabase, tenantId);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    await markEvent(supabase, eventId, 'processed');
    return json({ received: true }, 200);
  } catch (err) {
    console.error('shopify-webhook error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    if (eventId) await markEvent(supabase, eventId, 'failed', msg);
    // 500 → Shopify will retry up to 19 times over 48h
    return json({ error: msg }, 500);
  }
});

// ============================================
// UTILITIES
// ============================================

// deno-lint-ignore no-explicit-any
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyHmac(body: string, hmacHeader: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return computed === hmacHeader;
}

// deno-lint-ignore no-explicit-any
async function markEvent(supabase: any, id: string | null, status: string, error?: string) {
  if (!id) return;
  const update: Record<string, unknown> = { status, processed_at: new Date().toISOString() };
  if (error) update.last_error = error;
  if (status === 'failed') update.attempts = 1; // start counter; retry_webhook_events increments from here
  await supabase.from('shopify_webhook_events').update(update).eq('id', id);
}

// deno-lint-ignore no-explicit-any
async function resolveTenant(supabase: any, shopDomain: string): Promise<string | null> {
  if (!shopDomain) return null;
  // Use the indexed expression: settings->'shopifyIntegration'->>'shopDomain'
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .filter('settings->shopifyIntegration->>shopDomain', 'eq', shopDomain)
    .maybeSingle();
  if (error) {
    // Fallback: older PostgREST variants need different syntax
    const { data: fallback } = await supabase.from('tenants').select('id, settings');
    // deno-lint-ignore no-explicit-any
    const match = (fallback || []).find((t: any) => t.settings?.shopifyIntegration?.shopDomain === shopDomain);
    return match?.id || null;
  }
  return data?.id || null;
}

function generateShipmentNumber(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SHP-${dateStr}-${rand}`;
}

function generateTransactionNumber(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${dateStr}-${rand}`;
}

// deno-lint-ignore no-explicit-any
async function resolveAutoBatch(supabase: any, tenantId: string, productId: string): Promise<string | null> {
  const { data } = await supabase
    .from('product_batches')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .eq('status', 'live')
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(1);
  return data?.[0]?.id || null;
}

/**
 * Sum gross_weight (preferring batch over product) × quantity across all items
 * and persist on wh_shipments.total_weight_grams.
 */
// deno-lint-ignore no-explicit-any
async function updateShipmentWeight(supabase: any, tenantId: string, shipmentId: string) {
  const { data: items } = await supabase
    .from('wh_shipment_items')
    .select('product_id, batch_id, quantity')
    .eq('shipment_id', shipmentId);
  if (!items?.length) return;
  let total = 0;
  for (const it of items) {
    let w: number | null = null;
    if (it.batch_id) {
      const { data: b } = await supabase.from('product_batches').select('gross_weight, net_weight').eq('id', it.batch_id).maybeSingle();
      w = b?.gross_weight ?? b?.net_weight ?? null;
    }
    if (w === null) {
      const { data: p } = await supabase.from('products').select('gross_weight, net_weight').eq('tenant_id', tenantId).eq('id', it.product_id).maybeSingle();
      w = p?.gross_weight ?? p?.net_weight ?? null;
    }
    if (w !== null) total += w * (it.quantity || 0);
  }
  if (total > 0) await supabase.from('wh_shipments').update({ total_weight_grams: total }).eq('id', shipmentId);
}

// deno-lint-ignore no-explicit-any
async function upsertShopifyCustomer(supabase: any, tenantId: string, shopifyCustomer: any, order?: any): Promise<string | null> {
  if (!shopifyCustomer?.id) return null;

  const { data: existing } = await supabase
    .from('rh_customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('shopify_customer_id', shopifyCustomer.id)
    .maybeSingle();

  const payload = {
    tenant_id: tenantId,
    shopify_customer_id: shopifyCustomer.id,
    email: shopifyCustomer.email || null,
    first_name: shopifyCustomer.first_name || null,
    last_name: shopifyCustomer.last_name || null,
    phone: shopifyCustomer.phone || null,
    total_orders: shopifyCustomer.orders_count ?? 0,
    total_spent: parseFloat(shopifyCustomer.total_spent || '0') || 0,
  };

  if (existing) {
    await supabase.from('rh_customers').update(payload).eq('id', existing.id);
    return existing.id;
  }
  const { data } = await supabase.from('rh_customers').insert(payload).select('id').single();
  // Silence unused: `order` is captured for future address mirroring
  void order;
  return data?.id || null;
}

// ============================================
// ORDER CREATED
// ============================================

// deno-lint-ignore no-explicit-any
async function handleOrderCreated(supabase: any, tenantId: string, order: any) {
  const orderRef = `Shopify ${order.name}`;

  const { data: existing } = await supabase
    .from('wh_shipments')
    .select('id, shopify_order_id')
    .eq('tenant_id', tenantId)
    .or(`shopify_order_id.eq.${order.id},order_reference.eq.${orderRef}`)
    .maybeSingle();

  if (existing) {
    if (!existing.shopify_order_id) {
      await supabase.from('wh_shipments').update({ shopify_order_id: order.id }).eq('id', existing.id);
    }
    console.log(`Shipment already exists for ${orderRef}, skipping`);
    return;
  }

  const { data: productMaps } = await supabase
    .from('shopify_product_map')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  const { data: locationMaps } = await supabase
    .from('shopify_location_map')
    .select('*')
    .eq('tenant_id', tenantId);

  // deno-lint-ignore no-explicit-any
  const variantMap = new Map<number, any>((productMaps || []).map((m: any) => [m.shopify_variant_id, m]));
  // deno-lint-ignore no-explicit-any
  const primaryLocation = (locationMaps || []).find((l: any) => l.is_primary);

  // Tenant config for importCustomers
  const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', tenantId).single();
  const syncConfig = tenant?.settings?.shopifyIntegration?.syncConfig || {};

  const customerRowId = (order.customer && syncConfig.importCustomers)
    ? await upsertShopifyCustomer(supabase, tenantId, order.customer, order)
    : null;

  // deno-lint-ignore no-explicit-any
  const items: any[] = [];
  // deno-lint-ignore no-explicit-any
  for (const li of (order.line_items || [])) {
    const mapping = variantMap.get(li.variant_id);
    if (!mapping) continue;
    const locationId = primaryLocation?.location_id;
    if (!locationId) continue;

    let batchId = mapping.batch_id || null;
    if (!batchId && mapping.auto_batch) {
      batchId = await resolveAutoBatch(supabase, tenantId, mapping.product_id);
    }

    items.push({
      tenant_id: tenantId,
      product_id: mapping.product_id,
      batch_id: batchId,
      location_id: locationId,
      quantity: li.fulfillable_quantity || li.quantity,
      unit_price: parseFloat(li.price) || null,
      currency: order.currency || 'EUR',
    });
  }

  if (items.length === 0) {
    console.log(`No mapped variants found for ${orderRef}, skipping`);
    return;
  }

  const addr = order.shipping_address || order.billing_address || {};
  const recipientName = [addr.first_name, addr.last_name].filter(Boolean).join(' ')
    || order.customer?.first_name || 'Shopify Customer';
  const totalItems = items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

  const { data: shipment, error: shipErr } = await supabase
    .from('wh_shipments')
    .insert({
      tenant_id: tenantId,
      shipment_number: generateShipmentNumber(),
      status: 'draft',
      recipient_type: 'customer',
      recipient_name: recipientName,
      recipient_company: addr.company || null,
      recipient_email: order.email || null,
      recipient_phone: addr.phone || null,
      shipping_street: addr.address1 || '',
      shipping_city: addr.city || '',
      shipping_state: addr.province || null,
      shipping_postal_code: addr.zip || '',
      shipping_country: addr.country_code || addr.country || '',
      currency: order.currency || 'EUR',
      total_items: totalItems,
      source_location_id: primaryLocation?.location_id || null,
      order_reference: orderRef,
      shopify_order_id: order.id,
      customer_id: customerRowId,
      priority: 'normal',
      notes: order.note || null,
    })
    .select()
    .single();

  if (shipErr) {
    console.error(`Failed to create shipment for ${orderRef}:`, shipErr);
    throw new Error(shipErr.message);
  }

  const shipmentItems = items.map((i: Record<string, unknown>) => ({ ...i, shipment_id: shipment.id }));
  const { error: itemsErr } = await supabase.from('wh_shipment_items').insert(shipmentItems);
  if (itemsErr) {
    console.error(`Failed to insert shipment items for ${orderRef}:`, itemsErr.message);
    throw new Error(`wh_shipment_items insert failed: ${itemsErr.message}`);
  }

  await updateShipmentWeight(supabase, tenantId, shipment.id);

  const reservationWarnings: string[] = [];
  for (const item of items) {
    if (!item.batch_id) continue;
    await reserveStockForItem(supabase, tenantId, item.location_id, item.product_id, item.batch_id, item.quantity, shipment.id, orderRef, reservationWarnings);
  }
  if (reservationWarnings.length > 0) {
    console.warn(`Stock reservation warnings for ${orderRef}:`, reservationWarnings);
  }

  console.log(`Created shipment ${shipment.shipment_number} for ${orderRef} with ${items.length} items`);
}

// ============================================
// ORDER UPDATED / PAID / CANCELLED / FULFILLED
// ============================================

// deno-lint-ignore no-explicit-any
async function handleOrderUpdated(supabase: any, tenantId: string, order: any) {
  if (order.cancelled_at) { await handleOrderCancelled(supabase, tenantId, order); return; }
  // If fulfillment status turned to fulfilled, treat as orders/fulfilled
  if (order.fulfillment_status === 'fulfilled') { await handleOrderFulfilled(supabase, tenantId, order); return; }
  console.log(`Order updated: ${order.name} (financial=${order.financial_status}, fulfillment=${order.fulfillment_status})`);
}

// deno-lint-ignore no-explicit-any
async function handleOrderPaid(supabase: any, tenantId: string, order: any) {
  // Idempotent re-enter: if not yet imported (e.g. was pending earlier), create now
  await handleOrderCreated(supabase, tenantId, order);
}

// deno-lint-ignore no-explicit-any
async function handleOrderCancelled(supabase: any, tenantId: string, order: any) {
  const { data: shipment } = await supabase
    .from('wh_shipments')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .or(`shopify_order_id.eq.${order.id},order_reference.eq.Shopify ${order.name}`)
    .maybeSingle();
  if (!shipment) { console.log(`No shipment for cancelled order ${order.name}`); return; }
  if (!['draft', 'picking'].includes(shipment.status)) {
    console.log(`Shipment for ${order.name} is ${shipment.status} — not cancelling`);
    return;
  }

  const { data: items } = await supabase.from('wh_shipment_items').select('*').eq('shipment_id', shipment.id);
  for (const item of (items || [])) {
    if (!item.batch_id) continue;
    await releaseStockForItem(supabase, tenantId, item.location_id, item.product_id, item.batch_id, item.quantity, shipment.id, `Shopify ${order.name}`);
  }
  await supabase.from('wh_shipments').update({ status: 'cancelled' }).eq('id', shipment.id);
  console.log(`Cancelled shipment for ${order.name}`);
}

// deno-lint-ignore no-explicit-any
async function handleOrderFulfilled(supabase: any, tenantId: string, order: any) {
  const { data: shipment } = await supabase
    .from('wh_shipments')
    .select('id, status, shopify_fulfillment_id')
    .eq('tenant_id', tenantId)
    .or(`shopify_order_id.eq.${order.id},order_reference.eq.Shopify ${order.name}`)
    .maybeSingle();
  if (!shipment) {
    // Could be an order that was fulfilled in Shopify but never synced to DPP
    // Import it on-the-fly so history is complete
    console.log(`No shipment for fulfilled order ${order.name} — creating backfill entry`);
    await handleOrderCreated(supabase, tenantId, order);
    return;
  }

  const fulfillment = order.fulfillments?.[0];

  const patch: Record<string, unknown> = {
    shopify_fulfillment_id: fulfillment?.id || shipment.shopify_fulfillment_id,
    shopify_fulfillment_status: 'success',
    last_fulfillment_at: new Date().toISOString(),
  };
  if (fulfillment?.tracking_number) patch.tracking_number = fulfillment.tracking_number;
  if (fulfillment?.tracking_company) patch.carrier = fulfillment.tracking_company;
  if (fulfillment?.tracking_url) patch.label_url = fulfillment.tracking_url;

  // Progress status forward if still in draft/picking/packed
  if (['draft', 'picking', 'packed', 'label_created'].includes(shipment.status)) {
    patch.status = 'shipped';
    patch.shipped_at = new Date().toISOString();
  }
  await supabase.from('wh_shipments').update(patch).eq('id', shipment.id);
  console.log(`Progressed shipment ${shipment.id} to shipped via orders/fulfilled`);
}

// ============================================
// FULFILLMENT CREATE/UPDATE
// ============================================

// deno-lint-ignore no-explicit-any
async function handleFulfillmentUpsert(supabase: any, tenantId: string, fulfillment: any) {
  const orderId = fulfillment.order_id;
  if (!orderId) return;

  const { data: shipment } = await supabase
    .from('wh_shipments')
    .select('id, status, tracking_number, shopify_fulfillment_id')
    .eq('tenant_id', tenantId)
    .eq('shopify_order_id', orderId)
    .maybeSingle();
  if (!shipment) return;

  const patch: Record<string, unknown> = {
    shopify_fulfillment_id: fulfillment.id,
    shopify_fulfillment_status: fulfillment.status || null,
    last_fulfillment_at: new Date().toISOString(),
  };
  if (!shipment.tracking_number && fulfillment.tracking_number) patch.tracking_number = fulfillment.tracking_number;
  if (fulfillment.tracking_company) patch.carrier = fulfillment.tracking_company;
  if (fulfillment.tracking_url) patch.label_url = fulfillment.tracking_url;

  // Shopify's Carrier integration updates fulfillment.shipment_status as the
  // parcel moves: label_printed → in_transit → out_for_delivery → delivered
  const ss = fulfillment.shipment_status;
  const now = new Date().toISOString();
  if (ss === 'delivered' && shipment.status !== 'delivered') {
    patch.status = 'delivered';
    patch.delivered_at = now;
  } else if ((ss === 'in_transit' || ss === 'out_for_delivery') && ['shipped', 'label_created'].includes(shipment.status)) {
    patch.status = 'in_transit';
  } else if (ss === 'confirmed' && ['draft', 'picking', 'packed', 'label_created'].includes(shipment.status)) {
    patch.status = 'shipped';
    patch.shipped_at = now;
  }

  await supabase.from('wh_shipments').update(patch).eq('id', shipment.id);
}

// ============================================
// REFUND CREATED
// ============================================

// deno-lint-ignore no-explicit-any
async function handleRefundCreated(supabase: any, tenantId: string, refund: any) {
  const orderId = refund.order_id;
  if (!orderId) return;

  // Sum refund amount from transactions
  const amount = (refund.transactions || [])
    // deno-lint-ignore no-explicit-any
    .filter((t: any) => t.kind === 'refund' && t.status === 'success')
    // deno-lint-ignore no-explicit-any
    .reduce((sum: number, t: any) => sum + parseFloat(t.amount || '0'), 0);

  // Find existing return by refund id
  const { data: existing } = await supabase
    .from('rh_returns')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('shopify_refund_id', refund.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('rh_returns')
      .update({
        refund_amount: amount,
        refunded_at: refund.created_at || new Date().toISOString(),
        refund_reference: `shopify:${refund.id}`,
      })
      .eq('id', existing.id);
    return;
  }

  // No existing return — record the refund as an inbound-mirror row
  await supabase.from('rh_returns').insert({
    tenant_id: tenantId,
    shopify_order_id: orderId,
    shopify_refund_id: refund.id,
    refund_amount: amount,
    refunded_at: refund.created_at || new Date().toISOString(),
    refund_reference: `shopify:${refund.id}`,
    status: 'REFUND_COMPLETED',
    internal_notes: `Auto-imported from Shopify refund ${refund.id}`,
  });
}

// ============================================
// CUSTOMER UPSERT
// ============================================

// deno-lint-ignore no-explicit-any
async function handleCustomerUpsert(supabase: any, tenantId: string, customer: any) {
  await upsertShopifyCustomer(supabase, tenantId, customer);
}

// ============================================
// INVENTORY LEVEL UPDATE (log-only default)
// ============================================

// deno-lint-ignore no-explicit-any
async function handleInventoryLevelUpdate(supabase: any, tenantId: string, level: any) {
  const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', tenantId).single();
  const importInventory = tenant?.settings?.shopifyIntegration?.syncConfig?.importInventory === true;
  if (!importInventory) {
    console.log(`inventory_levels/update received (log-only): item=${level.inventory_item_id} location=${level.location_id} avail=${level.available}`);
    return;
  }

  // Find mapped product + location
  const { data: productMap } = await supabase
    .from('shopify_product_map')
    .select('product_id')
    .eq('tenant_id', tenantId)
    .eq('shopify_inventory_item_id', level.inventory_item_id)
    .maybeSingle();
  const { data: locationMap } = await supabase
    .from('shopify_location_map')
    .select('location_id')
    .eq('tenant_id', tenantId)
    .eq('shopify_location_id', level.location_id)
    .maybeSingle();

  if (!productMap || !locationMap) return;

  await supabase
    .from('wh_stock_levels')
    .update({ quantity_available: level.available ?? 0 })
    .eq('tenant_id', tenantId)
    .eq('product_id', productMap.product_id)
    .eq('location_id', locationMap.location_id);
}

// ============================================
// APP UNINSTALLED
// ============================================

// deno-lint-ignore no-explicit-any
async function handleAppUninstalled(supabase: any, tenantId: string) {
  const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', tenantId).single();
  const settings = tenant?.settings || {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { shopifyIntegration, ...rest } = settings;
  await supabase.from('tenants').update({ settings: rest }).eq('id', tenantId);
  await supabase.from('shopify_product_map').update({ is_active: false }).eq('tenant_id', tenantId);
  console.log(`App uninstalled — wiped shopifyIntegration for tenant ${tenantId}`);
}

// ============================================
// STOCK HELPERS
// ============================================

async function reserveStockForItem(
  // deno-lint-ignore no-explicit-any
  supabase: any, tenantId: string, locationId: string, productId: string, batchId: string, quantity: number, shipmentId: string, orderRef: string, warnings: string[],
) {
  const { data: stock } = await supabase
    .from('wh_stock_levels')
    .select('id, quantity_available, quantity_reserved')
    .eq('tenant_id', tenantId)
    .eq('location_id', locationId)
    .eq('batch_id', batchId)
    .maybeSingle();
  if (!stock) { warnings.push(`No stock record for batch ${batchId} at location ${locationId}`); return; }
  if (stock.quantity_available < quantity) {
    warnings.push(`Insufficient stock for batch ${batchId}: available=${stock.quantity_available}, requested=${quantity}`);
    const reserveQty = Math.min(stock.quantity_available, quantity);
    if (reserveQty <= 0) return;
    await supabase
      .from('wh_stock_levels')
      .update({ quantity_available: stock.quantity_available - reserveQty, quantity_reserved: stock.quantity_reserved + reserveQty })
      .eq('id', stock.id);
    await supabase.from('wh_stock_transactions').insert({
      tenant_id: tenantId, transaction_number: generateTransactionNumber(), type: 'reservation',
      location_id: locationId, product_id: productId, batch_id: batchId, quantity: reserveQty,
      quantity_before: stock.quantity_available, quantity_after: stock.quantity_available - reserveQty,
      shipment_id: shipmentId, reference_number: orderRef,
      notes: `Partial reservation (${reserveQty}/${quantity}) — insufficient stock`,
    });
    return;
  }
  await supabase
    .from('wh_stock_levels')
    .update({ quantity_available: stock.quantity_available - quantity, quantity_reserved: stock.quantity_reserved + quantity })
    .eq('id', stock.id);
  await supabase.from('wh_stock_transactions').insert({
    tenant_id: tenantId, transaction_number: generateTransactionNumber(), type: 'reservation',
    location_id: locationId, product_id: productId, batch_id: batchId, quantity,
    quantity_before: stock.quantity_available, quantity_after: stock.quantity_available - quantity,
    shipment_id: shipmentId, reference_number: orderRef,
    notes: `Auto-reserved via Shopify webhook`,
  });
}

async function releaseStockForItem(
  // deno-lint-ignore no-explicit-any
  supabase: any, tenantId: string, locationId: string, productId: string, batchId: string, quantity: number, shipmentId: string, orderRef: string,
) {
  const { data: stock } = await supabase
    .from('wh_stock_levels')
    .select('id, quantity_available, quantity_reserved')
    .eq('tenant_id', tenantId)
    .eq('location_id', locationId)
    .eq('batch_id', batchId)
    .maybeSingle();
  if (!stock) return;
  const releaseQty = Math.min(stock.quantity_reserved, quantity);
  if (releaseQty <= 0) return;
  await supabase
    .from('wh_stock_levels')
    .update({ quantity_available: stock.quantity_available + releaseQty, quantity_reserved: stock.quantity_reserved - releaseQty })
    .eq('id', stock.id);
  await supabase.from('wh_stock_transactions').insert({
    tenant_id: tenantId, transaction_number: generateTransactionNumber(), type: 'release',
    location_id: locationId, product_id: productId, batch_id: batchId, quantity: releaseQty,
    quantity_before: stock.quantity_available, quantity_after: stock.quantity_available + releaseQty,
    shipment_id: shipmentId, reference_number: orderRef,
    notes: `Stock released — order cancelled via Shopify webhook`,
  });
}
