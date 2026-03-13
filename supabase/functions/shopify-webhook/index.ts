/**
 * Supabase Edge Function: shopify-webhook
 *
 * Receives Shopify webhooks for automatic order import + stock reservation.
 *
 * Supported topics:
 *   - orders/create   → Create wh_shipment + reserve stock
 *   - orders/updated  → Update shipment (handle cancellations)
 *   - orders/cancelled → Cancel shipment + release stock reservation
 *
 * Deployment:
 *   supabase functions deploy shopify-webhook --no-verify-jwt
 *
 * Required Supabase Secrets:
 *   - SHOPIFY_WEBHOOK_SECRET (HMAC verification)
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const SHOPIFY_WEBHOOK_SECRET = Deno.env.get('SHOPIFY_WEBHOOK_SECRET') || '';

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    // 1. Read raw body for HMAC verification
    const rawBody = await req.text();

    // 2. Verify HMAC-SHA256 signature
    const hmacHeader = req.headers.get('x-shopify-hmac-sha256');
    if (!hmacHeader) {
      console.error('Missing x-shopify-hmac-sha256 header');
      return json({ error: 'Missing HMAC signature' }, 401);
    }

    const isValid = await verifyHmac(rawBody, hmacHeader, SHOPIFY_WEBHOOK_SECRET);
    if (!isValid) {
      console.error('HMAC signature verification failed');
      return json({ error: 'Invalid HMAC signature' }, 401);
    }

    // 3. Parse headers
    const shopDomain = req.headers.get('x-shopify-shop-domain') || '';
    const topic = req.headers.get('x-shopify-topic') || '';

    if (!shopDomain) {
      console.error('Missing x-shopify-shop-domain header');
      return json({ error: 'Missing shop domain' }, 400);
    }

    console.log(`Shopify webhook: topic=${topic}, shop=${shopDomain}`);

    // 4. Parse body
    const order = JSON.parse(rawBody);

    // 5. Resolve tenant from shop domain
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const tenantId = await resolveTenant(supabase, shopDomain);
    if (!tenantId) {
      console.error(`No tenant found for shop domain: ${shopDomain}`);
      return json({ error: 'Unknown shop domain' }, 404);
    }

    // 6. Dispatch by topic
    switch (topic) {
      case 'orders/create':
        await handleOrderCreated(supabase, tenantId, order);
        break;

      case 'orders/updated':
        await handleOrderUpdated(supabase, tenantId, order);
        break;

      case 'orders/cancelled':
        await handleOrderCancelled(supabase, tenantId, order);
        break;

      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return json({ received: true }, 200);
  } catch (err) {
    console.error('shopify-webhook error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
});

// ============================================
// HELPERS
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
async function resolveTenant(supabase: any, shopDomain: string): Promise<string | null> {
  // Lookup tenant by shopifyIntegration.shopDomain in settings JSONB
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, settings')
    .not('settings', 'is', null);

  if (error) {
    console.error('Tenant lookup error:', error);
    return null;
  }

  // deno-lint-ignore no-explicit-any
  const match = (tenants || []).find((t: any) => {
    const domain = t.settings?.shopifyIntegration?.shopDomain;
    return domain === shopDomain;
  });

  return match?.id || null;
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

// ============================================
// ORDER CREATED → Create Shipment + Reserve Stock
// ============================================

// deno-lint-ignore no-explicit-any
async function handleOrderCreated(supabase: any, tenantId: string, order: any) {
  const orderRef = `Shopify ${order.name}`;

  // Idempotency check
  const { data: existing } = await supabase
    .from('wh_shipments')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('order_reference', orderRef)
    .maybeSingle();

  if (existing) {
    console.log(`Shipment already exists for ${orderRef}, skipping`);
    await logSync(supabase, tenantId, 'webhook', {
      total: 1, processed: 1, created: 0, updated: 0, skipped: 1, failed: 0,
    });
    return;
  }

  // Load product and location mappings
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
  const variantMap = new Map((productMaps || []).map((m: any) => [m.shopify_variant_id, m]));
  // deno-lint-ignore no-explicit-any
  const primaryLocation = (locationMaps || []).find((l: any) => l.is_primary);

  // Build line items from mapped variants
  // deno-lint-ignore no-explicit-any
  const items: any[] = [];
  // deno-lint-ignore no-explicit-any
  for (const li of (order.line_items || [])) {
    const mapping = variantMap.get(li.variant_id);
    if (!mapping) continue;

    const locationId = primaryLocation?.location_id;
    if (!locationId) continue;

    items.push({
      tenant_id: tenantId,
      product_id: mapping.product_id,
      batch_id: mapping.batch_id || null,
      location_id: locationId,
      quantity: li.fulfillable_quantity || li.quantity,
      unit_price: parseFloat(li.price) || null,
      currency: order.currency || 'EUR',
    });
  }

  if (items.length === 0) {
    console.log(`No mapped variants found for ${orderRef}, skipping`);
    await logSync(supabase, tenantId, 'webhook', {
      total: 1, processed: 1, created: 0, updated: 0, skipped: 1, failed: 0,
    });
    return;
  }

  // Build shipping address
  const addr = order.shipping_address || order.billing_address || {};
  const recipientName = [addr.first_name, addr.last_name].filter(Boolean).join(' ')
    || order.customer?.first_name || 'Shopify Customer';

  const totalItems = items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

  // Create shipment
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
      priority: 'normal',
      notes: order.note || null,
    })
    .select()
    .single();

  if (shipErr) {
    console.error(`Failed to create shipment for ${orderRef}:`, shipErr);
    await logSync(supabase, tenantId, 'webhook', {
      total: 1, processed: 1, created: 0, updated: 0, skipped: 0, failed: 1,
    }, [{ entity: orderRef, message: shipErr.message }]);
    return;
  }

  // Create shipment items
  const shipmentItems = items.map((i: Record<string, unknown>) => ({
    ...i,
    shipment_id: shipment.id,
  }));
  await supabase.from('wh_shipment_items').insert(shipmentItems);

  // Reserve stock for each item
  const reservationWarnings: string[] = [];
  for (const item of items) {
    if (!item.batch_id) continue;

    await reserveStockForItem(
      supabase,
      tenantId,
      item.location_id,
      item.product_id,
      item.batch_id,
      item.quantity,
      shipment.id,
      orderRef,
      reservationWarnings,
    );
  }

  if (reservationWarnings.length > 0) {
    console.warn(`Stock reservation warnings for ${orderRef}:`, reservationWarnings);
  }

  console.log(`Created shipment ${shipment.shipment_number} for ${orderRef} with ${items.length} items`);
  await logSync(supabase, tenantId, 'webhook', {
    total: 1, processed: 1, created: 1, updated: 0, skipped: 0, failed: 0,
  });
}

// ============================================
// ORDER UPDATED → Update shipment if cancelled
// ============================================

// deno-lint-ignore no-explicit-any
async function handleOrderUpdated(supabase: any, tenantId: string, order: any) {
  const orderRef = `Shopify ${order.name}`;

  // If the order was cancelled via update, treat as cancellation
  if (order.cancelled_at) {
    await handleOrderCancelled(supabase, tenantId, order);
    return;
  }

  // For other updates, just log
  console.log(`Order updated: ${orderRef} (financial_status=${order.financial_status}, fulfillment_status=${order.fulfillment_status})`);
}

// ============================================
// ORDER CANCELLED → Cancel Shipment + Release Stock
// ============================================

// deno-lint-ignore no-explicit-any
async function handleOrderCancelled(supabase: any, tenantId: string, order: any) {
  const orderRef = `Shopify ${order.name}`;

  // Find existing shipment
  const { data: shipment } = await supabase
    .from('wh_shipments')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .eq('order_reference', orderRef)
    .maybeSingle();

  if (!shipment) {
    console.log(`No shipment found for cancelled order ${orderRef}`);
    return;
  }

  // Only cancel if still in draft/picking status
  if (!['draft', 'picking'].includes(shipment.status)) {
    console.log(`Shipment for ${orderRef} is already ${shipment.status}, not cancelling`);
    return;
  }

  // Load shipment items to release reservations
  const { data: shipmentItems } = await supabase
    .from('wh_shipment_items')
    .select('*')
    .eq('shipment_id', shipment.id);

  // Release stock reservations
  for (const item of (shipmentItems || [])) {
    if (!item.batch_id) continue;

    await releaseStockForItem(
      supabase,
      tenantId,
      item.location_id,
      item.product_id,
      item.batch_id,
      item.quantity,
      shipment.id,
      orderRef,
    );
  }

  // Update shipment status to cancelled
  await supabase
    .from('wh_shipments')
    .update({ status: 'cancelled' })
    .eq('id', shipment.id);

  console.log(`Cancelled shipment for ${orderRef} and released stock reservations`);
  await logSync(supabase, tenantId, 'webhook', {
    total: 1, processed: 1, created: 0, updated: 1, skipped: 0, failed: 0,
  });
}

// ============================================
// STOCK RESERVATION HELPERS
// ============================================

async function reserveStockForItem(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  tenantId: string,
  locationId: string,
  productId: string,
  batchId: string,
  quantity: number,
  shipmentId: string,
  orderRef: string,
  warnings: string[],
) {
  // Find stock level row
  const { data: stock } = await supabase
    .from('wh_stock_levels')
    .select('id, quantity_available, quantity_reserved')
    .eq('tenant_id', tenantId)
    .eq('location_id', locationId)
    .eq('batch_id', batchId)
    .maybeSingle();

  if (!stock) {
    warnings.push(`No stock record for batch ${batchId} at location ${locationId}`);
    return;
  }

  if (stock.quantity_available < quantity) {
    warnings.push(
      `Insufficient stock for batch ${batchId}: available=${stock.quantity_available}, requested=${quantity}`,
    );
    // Reserve what we can (partial reservation)
    const reserveQty = Math.min(stock.quantity_available, quantity);
    if (reserveQty <= 0) return;

    await supabase
      .from('wh_stock_levels')
      .update({
        quantity_available: stock.quantity_available - reserveQty,
        quantity_reserved: stock.quantity_reserved + reserveQty,
      })
      .eq('id', stock.id);

    await supabase.from('wh_stock_transactions').insert({
      tenant_id: tenantId,
      transaction_number: generateTransactionNumber(),
      type: 'reservation',
      location_id: locationId,
      product_id: productId,
      batch_id: batchId,
      quantity: reserveQty,
      quantity_before: stock.quantity_available,
      quantity_after: stock.quantity_available - reserveQty,
      shipment_id: shipmentId,
      reference_number: orderRef,
      notes: `Partial reservation (${reserveQty}/${quantity}) — insufficient stock`,
    });
    return;
  }

  // Full reservation
  await supabase
    .from('wh_stock_levels')
    .update({
      quantity_available: stock.quantity_available - quantity,
      quantity_reserved: stock.quantity_reserved + quantity,
    })
    .eq('id', stock.id);

  await supabase.from('wh_stock_transactions').insert({
    tenant_id: tenantId,
    transaction_number: generateTransactionNumber(),
    type: 'reservation',
    location_id: locationId,
    product_id: productId,
    batch_id: batchId,
    quantity: quantity,
    quantity_before: stock.quantity_available,
    quantity_after: stock.quantity_available - quantity,
    shipment_id: shipmentId,
    reference_number: orderRef,
    notes: `Auto-reserved via Shopify webhook`,
  });
}

async function releaseStockForItem(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  tenantId: string,
  locationId: string,
  productId: string,
  batchId: string,
  quantity: number,
  shipmentId: string,
  orderRef: string,
) {
  const { data: stock } = await supabase
    .from('wh_stock_levels')
    .select('id, quantity_available, quantity_reserved')
    .eq('tenant_id', tenantId)
    .eq('location_id', locationId)
    .eq('batch_id', batchId)
    .maybeSingle();

  if (!stock) {
    console.warn(`No stock record to release for batch ${batchId}`);
    return;
  }

  // Release only what was actually reserved
  const releaseQty = Math.min(stock.quantity_reserved, quantity);
  if (releaseQty <= 0) return;

  await supabase
    .from('wh_stock_levels')
    .update({
      quantity_available: stock.quantity_available + releaseQty,
      quantity_reserved: stock.quantity_reserved - releaseQty,
    })
    .eq('id', stock.id);

  await supabase.from('wh_stock_transactions').insert({
    tenant_id: tenantId,
    transaction_number: generateTransactionNumber(),
    type: 'release',
    location_id: locationId,
    product_id: productId,
    batch_id: batchId,
    quantity: releaseQty,
    quantity_before: stock.quantity_available,
    quantity_after: stock.quantity_available + releaseQty,
    shipment_id: shipmentId,
    reference_number: orderRef,
    notes: `Stock released — order cancelled via Shopify webhook`,
  });
}

// ============================================
// SYNC LOG
// ============================================

async function logSync(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  tenantId: string,
  triggerType: string,
  counts: Record<string, number>,
  errors: unknown[] = [],
) {
  const status = counts.failed > 0 ? (counts.created > 0 ? 'partial' : 'failed') : 'completed';

  await supabase.from('shopify_sync_log').insert({
    tenant_id: tenantId,
    sync_type: 'orders',
    direction: 'import',
    status,
    trigger_type: triggerType,
    triggered_by: null,
    total_count: counts.total || 0,
    processed_count: counts.processed || 0,
    created_count: counts.created || 0,
    updated_count: counts.updated || 0,
    skipped_count: counts.skipped || 0,
    failed_count: counts.failed || 0,
    errors: errors.length > 0 ? JSON.stringify(errors) : null,
    completed_at: new Date().toISOString(),
  });
}
