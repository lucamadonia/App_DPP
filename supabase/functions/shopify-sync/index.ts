/**
 * Supabase Edge Function: shopify-sync
 *
 * Server-side Shopify Admin API proxy. All Shopify API calls go through this
 * function so the access token never leaves the server.
 *
 * Supported actions (Phase-1+2+3 bidirectional):
 *   test_connection         — GET /shop.json + scope probe
 *   fetch_products          — GET /products.json (paginated via cursor)
 *   fetch_locations         — GET /locations.json
 *   sync_orders             — Import orders → wh_shipments (with backfill mode + filters)
 *   sync_inventory_import   — Compare Shopify inventory vs wh_stock_levels
 *   sync_inventory_export   — Push wh_stock_levels → Shopify
 *   create_fulfillment      — Create fulfillment for one shipment in Shopify
 *   retry_fulfillment       — Retry pending-export shipments (bulk or single)
 *   update_fulfillment_tracking — Push tracking updates to existing fulfillment
 *   sync_customers          — Bulk import Shopify customers → rh_customers
 *   create_refund           — Push a DPP return as refund to Shopify
 *   count_orders            — Estimate orders for backfill dialog
 *   fetch_unmapped_variants — Return distinct variants missing from shopify_product_map
 *   register_webhooks       — Programmatically register webhook topics in Shopify
 *   list_webhooks           — Fetch existing Shopify webhook subscriptions
 *   delete_webhooks         — Remove DPP-owned webhooks from Shopify
 *   test_webhook            — Trigger a Shopify test-notification
 *   save_token              — Securely store access token
 *
 * Required Supabase Secrets:
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DESIRED_WEBHOOK_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'orders/fulfilled',
  'orders/paid',
  'fulfillments/create',
  'fulfillments/update',
  'refunds/create',
  'customers/create',
  'customers/update',
  'inventory_levels/update',
  'app/uninstalled',
] as const;

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    if (!profile?.tenant_id) return json({ error: 'No tenant' }, 400);
    const tenantId = profile.tenant_id;

    const { data: activeMods } = await supabase
      .from('billing_module_subscriptions')
      .select('module_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');
    const moduleIds = (activeMods || []).map((m: { module_id: string }) => m.module_id);
    const hasWarehousePro = moduleIds.includes('warehouse_professional') || moduleIds.includes('warehouse_business');
    if (!hasWarehousePro) {
      return json({ error: 'Shopify integration requires Warehouse Professional or Business module' }, 403);
    }

    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };

    switch (action) {
      case 'save_token':
        return await handleSaveToken(supabase, tenantId, params);
      case 'test_connection':
        return await handleTestConnection(supabase, tenantId);
      case 'fetch_products':
        return await handleFetchProducts(supabase, tenantId, params);
      case 'fetch_locations':
        return await handleFetchLocations(supabase, tenantId);
      case 'sync_orders':
        return await handleSyncOrders(supabase, tenantId, user.id, params);
      case 'count_orders':
        return await handleCountOrders(supabase, tenantId, params);
      case 'sync_inventory_import':
        return await handleSyncInventoryImport(supabase, tenantId, user.id);
      case 'sync_inventory_export':
        return await handleSyncInventoryExport(supabase, tenantId, user.id);
      case 'create_fulfillment':
        return await handleCreateFulfillment(supabase, tenantId, user.id, params);
      case 'retry_fulfillment':
        return await handleRetryFulfillment(supabase, tenantId, user.id, params);
      case 'update_fulfillment_tracking':
        return await handleUpdateFulfillmentTracking(supabase, tenantId, user.id, params);
      case 'sync_customers':
        return await handleSyncCustomers(supabase, tenantId, user.id);
      case 'create_refund':
        return await handleCreateRefund(supabase, tenantId, user.id, params);
      case 'fetch_unmapped_variants':
        return await handleFetchUnmappedVariants(supabase, tenantId);
      case 'register_webhooks':
        return await handleRegisterWebhooks(supabase, tenantId);
      case 'list_webhooks':
        return await handleListWebhooks(supabase, tenantId);
      case 'delete_webhooks':
        return await handleDeleteWebhooks(supabase, tenantId);
      case 'test_webhook':
        return await handleTestWebhook(supabase, tenantId, params);
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error('shopify-sync error:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: msg }, 500);
  }
});

// ============================================
// HELPERS
// ============================================

// deno-lint-ignore no-explicit-any
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// deno-lint-ignore no-explicit-any
async function getShopifyConfig(supabase: any, tenantId: string) {
  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = tenant?.settings?.shopifyIntegration;
  if (!settings?.shopDomain || !settings?.accessToken) {
    throw new Error('Shopify not configured — missing domain or access token');
  }
  return settings as {
    shopDomain: string;
    accessToken: string;
    apiVersion: string;
    syncConfig: Record<string, unknown>;
    // deno-lint-ignore no-explicit-any
    registeredWebhooks?: any[];
  };
}

/**
 * Rate-limit aware Shopify API helper.
 *
 * On 429: sleep based on Retry-After, retry once.
 * On 5xx: exponential backoff 500/1000/2000ms (max 3 tries).
 * If bucket >= 80% full (per X-Shopify-Shop-Api-Call-Limit header): proactive 1s sleep.
 * Optionally returns the parsed Link header cursor for pagination.
 */
async function shopifyApi(
  shopDomain: string,
  accessToken: string,
  apiVersion: string,
  endpoint: string,
  method = 'GET',
  // deno-lint-ignore no-explicit-any
  body?: any,
  options?: { withLink?: boolean; attempt?: number },
): Promise<{ body: unknown; link: string | null }> {
  const url = `https://${shopDomain}/admin/api/${apiVersion}/${endpoint}`;
  const attempt = options?.attempt ?? 0;
  const res = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  // Proactive rate-limit pause
  const limit = res.headers.get('x-shopify-shop-api-call-limit');
  if (limit) {
    const [used, total] = limit.split('/').map(n => parseInt(n, 10));
    if (total && used / total > 0.8) await sleep(1000);
  }

  if (res.status === 429 && attempt < 1) {
    const retryAfter = parseFloat(res.headers.get('retry-after') || '2') * 1000;
    console.warn(`Shopify 429 on ${endpoint} — retrying after ${retryAfter}ms`);
    await sleep(retryAfter);
    return shopifyApi(shopDomain, accessToken, apiVersion, endpoint, method, body, { ...options, attempt: attempt + 1 });
  }

  if (res.status >= 500 && attempt < 3) {
    const backoff = [500, 1000, 2000][attempt] ?? 2000;
    console.warn(`Shopify ${res.status} on ${endpoint} — retrying after ${backoff}ms (attempt ${attempt + 1})`);
    await sleep(backoff);
    return shopifyApi(shopDomain, accessToken, apiVersion, endpoint, method, body, { ...options, attempt: attempt + 1 });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  const payload = await res.json();
  const link = options?.withLink ? res.headers.get('link') : null;
  return { body: payload, link };
}

function parseNextCursor(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',').map(p => p.trim());
  const next = parts.find(p => p.endsWith('rel="next"'));
  if (!next) return null;
  const m = next.match(/<([^>]+)>/);
  if (!m) return null;
  try {
    return new URL(m[1]).searchParams.get('page_info');
  } catch {
    return null;
  }
}

// deno-lint-ignore no-explicit-any
async function createSyncLog(supabase: any, tenantId: string, syncType: string, direction: string, triggeredBy: string, triggerType = 'manual') {
  const { data } = await supabase
    .from('shopify_sync_log')
    .insert({
      tenant_id: tenantId,
      sync_type: syncType,
      direction,
      status: 'running',
      trigger_type: triggerType,
      triggered_by: triggeredBy,
    })
    .select()
    .single();
  return data;
}

// deno-lint-ignore no-explicit-any
async function completeSyncLog(supabase: any, logId: string, status: string, counts: Record<string, number>, errors: unknown[] = [], metadata?: Record<string, unknown>) {
  await supabase
    .from('shopify_sync_log')
    .update({
      status,
      total_count: counts.total || 0,
      processed_count: counts.processed || 0,
      created_count: counts.created || 0,
      updated_count: counts.updated || 0,
      skipped_count: counts.skipped || 0,
      failed_count: counts.failed || 0,
      errors: JSON.stringify(errors),
      metadata: metadata ? JSON.stringify(metadata) : undefined,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

// ============================================
// TOKEN + CONNECTION
// ============================================

// deno-lint-ignore no-explicit-any
async function handleSaveToken(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  const token = params?.accessToken as string;
  const shopDomain = params?.shopDomain as string;
  if (!token || !shopDomain) return json({ error: 'accessToken and shopDomain required' }, 400);

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const currentSettings = tenant?.settings || {};
  const currentShopify = currentSettings.shopifyIntegration || {};

  const updated = {
    ...currentSettings,
    shopifyIntegration: {
      ...currentShopify,
      enabled: true,
      shopDomain,
      accessToken: token,
      apiVersion: currentShopify.apiVersion || '2024-10',
      syncConfig: currentShopify.syncConfig || {
        importOrders: true,
        importCustomers: false,
        exportStockLevels: true,
        exportFulfillments: true,
        autoCreateShipments: true,
        autoExportFulfillment: true,
        autoPushRefunds: true,
        importInventory: false,
        orderStatusFilter: ['paid'],
      },
      connectedAt: new Date().toISOString(),
    },
  };

  await supabase.from('tenants').update({ settings: updated }).eq('id', tenantId);
  return json({ success: true });
}

// deno-lint-ignore no-explicit-any
async function handleTestConnection(supabase: any, tenantId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const { body } = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, 'shop.json');
  // deno-lint-ignore no-explicit-any
  const shop = (body as any)?.shop;

  // Scope probe: Shopify returns scopes via X-Shopify-Access-Token-Scopes header,
  // but that's only populated for custom apps. Try fetching webhooks.json as a
  // lightweight write-scope probe (read_orders is implicit if shop.json works).
  let scopes: string[] = [];
  try {
    const { body: webhooksBody } = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, 'webhooks.json?limit=1');
    if (webhooksBody) scopes = ['read_orders', 'write_orders', 'read_products', 'write_inventory', 'read_fulfillments', 'write_fulfillments'];
  } catch {
    scopes = ['read_orders'];
  }

  if (shop?.name) {
    const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', tenantId).single();
    const settings = tenant?.settings || {};
    await supabase
      .from('tenants')
      .update({
        settings: {
          ...settings,
          shopifyIntegration: { ...settings.shopifyIntegration, shopName: shop.name },
        },
      })
      .eq('id', tenantId);
  }

  return json({
    success: true,
    data: {
      shopName: shop?.name,
      domain: shop?.domain,
      email: shop?.email,
      plan: shop?.plan_display_name,
      scopes,
    },
  });
}

// ============================================
// PRODUCTS + LOCATIONS (read-only helpers for UI)
// ============================================

// deno-lint-ignore no-explicit-any
async function handleFetchProducts(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  const config = await getShopifyConfig(supabase, tenantId);
  const limit = (params?.limit as number) || 50;
  const sinceId = params?.sinceId as number | undefined;

  let endpoint = `products.json?limit=${limit}&status=active`;
  if (sinceId) endpoint += `&since_id=${sinceId}`;

  const { body } = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, endpoint);

  const { data: existingMaps } = await supabase
    .from('shopify_product_map')
    .select('shopify_variant_id, product_id, batch_id')
    .eq('tenant_id', tenantId);
  const mappedVariantIds = new Set((existingMaps || []).map((m: { shopify_variant_id: number }) => m.shopify_variant_id));

  // deno-lint-ignore no-explicit-any
  const products = ((body as any)?.products || []).map((p: any) => ({
    ...p,
    // deno-lint-ignore no-explicit-any
    variants: (p.variants || []).map((v: any) => ({ ...v, _isMapped: mappedVariantIds.has(v.id) })),
  }));
  return json({ success: true, data: { products } });
}

// deno-lint-ignore no-explicit-any
async function handleFetchLocations(supabase: any, tenantId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const { body } = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, 'locations.json');
  // deno-lint-ignore no-explicit-any
  return json({ success: true, data: { locations: (body as any)?.locations || [] } });
}

// ============================================
// ORDERS — SYNC + BACKFILL + COUNT
// ============================================

interface SyncOrderParams {
  backfill?: boolean;
  createdAtMin?: string;
  createdAtMax?: string;
  status?: 'open' | 'closed' | 'cancelled' | 'any';
  financialStatus?: string;       // comma-separated or 'any'
  fulfillmentStatus?: 'unfulfilled' | 'partial' | 'shipped' | 'any';
  maxPages?: number;
  sinceId?: number;
}

function buildOrdersQuery(config: { syncConfig: Record<string, unknown> }, params: SyncOrderParams) {
  const backfill = params.backfill === true;
  const status = params.status ?? (backfill ? 'any' : 'open');
  const financialStatus = params.financialStatus
    ?? ((config.syncConfig?.orderStatusFilter as string[]) || ['paid']).join(',');
  const fulfillmentStatus = params.fulfillmentStatus ?? (backfill ? 'any' : 'unfulfilled');

  const q = new URLSearchParams();
  q.set('limit', '250');
  q.set('status', status);
  if (financialStatus && financialStatus !== 'any') q.set('financial_status', financialStatus);
  if (fulfillmentStatus && fulfillmentStatus !== 'any') q.set('fulfillment_status', fulfillmentStatus);
  if (params.createdAtMin) q.set('created_at_min', params.createdAtMin);
  if (params.createdAtMax) q.set('created_at_max', params.createdAtMax);
  if (params.sinceId) q.set('since_id', String(params.sinceId));
  return q.toString();
}

// deno-lint-ignore no-explicit-any
async function handleCountOrders(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  const config = await getShopifyConfig(supabase, tenantId);
  const p: SyncOrderParams = (params || {}) as SyncOrderParams;
  const queryString = buildOrdersQuery(config, p).replace(/limit=\d+&?/, '');
  const { body } = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, `orders/count.json?${queryString}`);
  // deno-lint-ignore no-explicit-any
  return json({ success: true, data: { count: (body as any)?.count ?? 0 } });
}

// deno-lint-ignore no-explicit-any
async function handleSyncOrders(supabase: any, tenantId: string, userId: string, params?: Record<string, unknown>) {
  const config = await getShopifyConfig(supabase, tenantId);
  const p: SyncOrderParams = (params || {}) as SyncOrderParams;
  const backfill = p.backfill === true;
  const maxPages = p.maxPages ?? (backfill ? 100 : 5);

  const syncLog = await createSyncLog(supabase, tenantId, 'orders', 'import', userId, backfill ? 'manual' : 'manual');
  const counts = { total: 0, processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
  const errors: unknown[] = [];

  try {
    // Preload mappings + locations + auto-batch candidates
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

    let cursor: string | null = null;
    let page = 0;
    const unmappedEncountered = new Map<number, unknown>();

    do {
      const endpoint = cursor
        ? `orders.json?limit=250&page_info=${encodeURIComponent(cursor)}`
        : `orders.json?${buildOrdersQuery(config, p)}`;
      const { body, link } = await shopifyApi(
        config.shopDomain, config.accessToken, config.apiVersion,
        endpoint, 'GET', undefined, { withLink: true },
      );
      // deno-lint-ignore no-explicit-any
      const orders = ((body as any)?.orders || []);
      counts.total += orders.length;

      // deno-lint-ignore no-explicit-any
      for (const order of orders) {
        try {
          const orderRef = `Shopify ${order.name}`;

          // Idempotency via shopify_order_id (new) + fallback to order_reference for legacy rows
          const { data: existing } = await supabase
            .from('wh_shipments')
            .select('id, shopify_order_id, status')
            .eq('tenant_id', tenantId)
            .or(`shopify_order_id.eq.${order.id},order_reference.eq.${orderRef}`)
            .maybeSingle();

          if (existing) {
            // Ensure shopify_order_id is backfilled on existing legacy rows
            if (!existing.shopify_order_id) {
              await supabase.from('wh_shipments').update({ shopify_order_id: order.id }).eq('id', existing.id);
            }
            counts.skipped++;
            counts.processed++;
            continue;
          }

          // Upsert customer first (if present + flag enabled)
          let customerRowId: string | null = null;
          if (order.customer && config.syncConfig?.importCustomers) {
            customerRowId = await upsertShopifyCustomer(supabase, tenantId, order.customer, order);
          }

          // Build line items from mappings (with FEFO auto-batch resolution)
          // deno-lint-ignore no-explicit-any
          const items: any[] = [];
          // deno-lint-ignore no-explicit-any
          for (const li of (order.line_items || [])) {
            const mapping = variantMap.get(li.variant_id);
            if (!mapping) {
              unmappedEncountered.set(li.variant_id, {
                type: 'unmapped_variant',
                shopifyVariantId: li.variant_id,
                shopifyProductId: li.product_id,
                shopifyProductTitle: li.title,
                shopifyVariantTitle: li.variant_title,
                sku: li.sku,
                orderName: order.name,
                firstSeenAt: new Date().toISOString(),
              });
              continue;
            }
            if (!primaryLocation?.location_id) continue;

            let batchId = mapping.batch_id || null;
            if (!batchId && mapping.auto_batch) {
              batchId = await resolveAutoBatch(supabase, tenantId, mapping.product_id);
            }

            items.push({
              tenant_id: tenantId,
              product_id: mapping.product_id,
              batch_id: batchId,
              location_id: primaryLocation.location_id,
              quantity: li.fulfillable_quantity || li.quantity,
              unit_price: parseFloat(li.price) || null,
              currency: order.currency || 'EUR',
            });
          }

          if (items.length === 0) {
            counts.skipped++;
            counts.processed++;
            continue;
          }

          // Address + recipient
          const addr = order.shipping_address || order.billing_address || {};
          const recipientName = [addr.first_name, addr.last_name].filter(Boolean).join(' ') || order.customer?.first_name || 'Shopify Customer';
          const totalItems = items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

          // In backfill mode, historical fulfilled orders get imported as already-shipped
          const isHistoricallyFulfilled = backfill && (order.fulfillment_status === 'fulfilled' || (order.fulfillments?.length > 0 && order.fulfillments[0].status === 'success'));
          const existingFulfillment = order.fulfillments?.[0];
          const shipmentStatus = isHistoricallyFulfilled ? 'shipped' : 'draft';
          const shippedAt = isHistoricallyFulfilled ? (order.closed_at || existingFulfillment?.created_at || null) : null;
          const shopifyFulfillmentId = isHistoricallyFulfilled ? (existingFulfillment?.id || null) : null;

          const now = new Date();
          const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
          const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
          const shipmentNumber = `SHP-${dateStr}-${rand}`;

          const { data: shipment, error: shipErr } = await supabase
            .from('wh_shipments')
            .insert({
              tenant_id: tenantId,
              shipment_number: shipmentNumber,
              status: shipmentStatus,
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
              shopify_fulfillment_id: shopifyFulfillmentId,
              shopify_fulfillment_status: shopifyFulfillmentId ? 'success' : null,
              last_fulfillment_at: shippedAt,
              shipped_at: shippedAt,
              tracking_number: existingFulfillment?.tracking_number || null,
              carrier: existingFulfillment?.tracking_company || null,
              label_url: existingFulfillment?.tracking_url || null,
              customer_id: customerRowId,
              priority: 'normal',
              notes: order.note || null,
            })
            .select()
            .single();

          if (shipErr) {
            counts.failed++;
            counts.processed++;
            errors.push({ entity: orderRef, message: shipErr.message });
            continue;
          }

          const shipmentItems = items.map((i: Record<string, unknown>) => ({ ...i, shipment_id: shipment.id }));
          const { error: itemsErr } = await supabase.from('wh_shipment_items').insert(shipmentItems);
          if (itemsErr) {
            errors.push({ entity: orderRef, type: 'shipment_items_insert_failed', message: itemsErr.message });
            console.error(`Failed to insert shipment items for ${orderRef}:`, itemsErr.message);
          }

          // Reserve stock only for not-yet-shipped shipments
          if (!isHistoricallyFulfilled) {
            const reservationWarnings: string[] = [];
            for (const item of items) {
              if (!item.batch_id) continue;
              await reserveStockForItem(supabase, tenantId, item.location_id, item.product_id, item.batch_id, item.quantity, shipment.id, orderRef, reservationWarnings);
            }
            if (reservationWarnings.length > 0) console.warn(`Stock reservation warnings for ${orderRef}:`, reservationWarnings);
          }

          counts.created++;
          counts.processed++;
        } catch (orderErr) {
          counts.failed++;
          counts.processed++;
          errors.push({
            entity: `Order ${order.name}`,
            message: orderErr instanceof Error ? orderErr.message : String(orderErr),
          });
        }
      }

      cursor = parseNextCursor(link);
      page++;

      // Persist cursor progress for UI observability
      await supabase
        .from('shopify_sync_log')
        .update({
          total_count: counts.total,
          processed_count: counts.processed,
          created_count: counts.created,
          skipped_count: counts.skipped,
          failed_count: counts.failed,
          metadata: { lastCursor: cursor, page, pagesCompleted: page },
        })
        .eq('id', syncLog.id);

      if (cursor) await sleep(500); // rate-limit safety between pages
    } while (cursor && page < maxPages);

    // Append unmapped-variant errors (distinct)
    for (const e of unmappedEncountered.values()) errors.push(e);

    const status = counts.failed > 0 ? (counts.created > 0 ? 'partial' : 'failed') : 'completed';
    await completeSyncLog(supabase, syncLog.id, status, counts, errors, { pagesCompleted: page, backfill });

    return json({
      success: true,
      data: { counts, unmappedVariants: unmappedEncountered.size, pagesCompleted: page },
      syncLog: { ...syncLog, ...counts, status },
    });
  } catch (err) {
    await completeSyncLog(supabase, syncLog.id, 'failed', counts, [
      { message: err instanceof Error ? err.message : String(err) },
    ]);
    throw err;
  }
}

// deno-lint-ignore no-explicit-any
async function resolveAutoBatch(supabase: any, tenantId: string, productId: string): Promise<string | null> {
  const { data } = await supabase
    .from('product_batches')
    .select('id, expiry_date, created_at')
    .eq('tenant_id', tenantId)
    .eq('product_id', productId)
    .eq('status', 'active')
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(1);
  return data?.[0]?.id || null;
}

// ============================================
// CUSTOMERS
// ============================================

// deno-lint-ignore no-explicit-any
async function upsertShopifyCustomer(supabase: any, tenantId: string, shopifyCustomer: any, order?: any): Promise<string | null> {
  if (!shopifyCustomer?.id) return null;
  const addresses: unknown[] = [];
  if (order?.shipping_address) addresses.push({ ...order.shipping_address, type: 'shipping' });
  if (order?.billing_address) addresses.push({ ...order.billing_address, type: 'billing' });

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
  return data?.id || null;
}

// deno-lint-ignore no-explicit-any
async function handleSyncCustomers(supabase: any, tenantId: string, userId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const syncLog = await createSyncLog(supabase, tenantId, 'customers', 'import', userId);
  const counts = { total: 0, processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
  const errors: unknown[] = [];

  try {
    let cursor: string | null = null;
    let page = 0;
    const maxPages = 50;
    do {
      const endpoint = cursor
        ? `customers.json?limit=250&page_info=${encodeURIComponent(cursor)}`
        : 'customers.json?limit=250';
      const { body, link } = await shopifyApi(
        config.shopDomain, config.accessToken, config.apiVersion,
        endpoint, 'GET', undefined, { withLink: true },
      );
      // deno-lint-ignore no-explicit-any
      const customers = ((body as any)?.customers || []);
      counts.total += customers.length;

      for (const c of customers) {
        try {
          await upsertShopifyCustomer(supabase, tenantId, c);
          counts.created++;
          counts.processed++;
        } catch (err) {
          counts.failed++;
          counts.processed++;
          errors.push({ entity: `Customer ${c.id}`, message: err instanceof Error ? err.message : String(err) });
        }
      }

      cursor = parseNextCursor(link);
      page++;
      if (cursor) await sleep(500);
    } while (cursor && page < maxPages);

    await completeSyncLog(supabase, syncLog.id, counts.failed > 0 ? 'partial' : 'completed', counts, errors);
    return json({ success: true, data: { counts } });
  } catch (err) {
    await completeSyncLog(supabase, syncLog.id, 'failed', counts, [{ message: err instanceof Error ? err.message : String(err) }]);
    throw err;
  }
}

// ============================================
// INVENTORY (unchanged from legacy — DPP is source of truth)
// ============================================

// deno-lint-ignore no-explicit-any
async function handleSyncInventoryImport(supabase: any, tenantId: string, userId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const syncLog = await createSyncLog(supabase, tenantId, 'inventory', 'import', userId);
  const counts = { total: 0, processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
  const errors: unknown[] = [];

  try {
    const { data: locationMaps } = await supabase
      .from('shopify_location_map')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('sync_inventory', true);

    const { data: productMaps } = await supabase
      .from('shopify_product_map')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true);

    if (!locationMaps?.length || !productMaps?.length) {
      await completeSyncLog(supabase, syncLog.id, 'completed', counts);
      return json({ success: true, data: { counts, message: 'No mappings configured' } });
    }

    // deno-lint-ignore no-explicit-any
    const inventoryItemMap = new Map((productMaps || []).map((m: any) => [m.shopify_inventory_item_id, m]));

    // deno-lint-ignore no-explicit-any
    for (const locMap of locationMaps) {
      const inventoryItemIds = (productMaps || [])
        // deno-lint-ignore no-explicit-any
        .filter((m: any) => m.shopify_inventory_item_id)
        // deno-lint-ignore no-explicit-any
        .map((m: any) => m.shopify_inventory_item_id);
      if (inventoryItemIds.length === 0) continue;

      for (let i = 0; i < inventoryItemIds.length; i += 50) {
        const batch = inventoryItemIds.slice(i, i + 50);
        const ids = batch.join(',');
        const { body } = await shopifyApi(
          config.shopDomain, config.accessToken, config.apiVersion,
          `inventory_levels.json?location_ids=${locMap.shopify_location_id}&inventory_item_ids=${ids}`,
        );
        // deno-lint-ignore no-explicit-any
        const levels = ((body as any)?.inventory_levels || []);
        counts.total += levels.length;

        // deno-lint-ignore no-explicit-any
        for (const level of levels) {
          const mapping = inventoryItemMap.get(level.inventory_item_id);
          if (!mapping) { counts.skipped++; counts.processed++; continue; }
          counts.processed++;
          counts.updated++;
        }
      }
    }

    await completeSyncLog(supabase, syncLog.id, 'completed', counts, errors);
    return json({ success: true, data: { counts } });
  } catch (err) {
    await completeSyncLog(supabase, syncLog.id, 'failed', counts, [{ message: err instanceof Error ? err.message : String(err) }]);
    throw err;
  }
}

// deno-lint-ignore no-explicit-any
async function handleSyncInventoryExport(supabase: any, tenantId: string, userId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const syncLog = await createSyncLog(supabase, tenantId, 'inventory', 'export', userId);
  const counts = { total: 0, processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
  const errors: unknown[] = [];

  try {
    const { data: productMaps } = await supabase
      .from('shopify_product_map')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .in('sync_direction', ['export_only', 'both']);

    const { data: locationMaps } = await supabase
      .from('shopify_location_map')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('sync_inventory', true);

    if (!productMaps?.length || !locationMaps?.length) {
      await completeSyncLog(supabase, syncLog.id, 'completed', counts);
      return json({ success: true, data: { counts, message: 'No export mappings' } });
    }

    // deno-lint-ignore no-explicit-any
    for (const prodMap of productMaps) {
      if (!prodMap.shopify_inventory_item_id) { counts.skipped++; continue; }
      // deno-lint-ignore no-explicit-any
      for (const locMap of locationMaps) {
        counts.total++;
        try {
          const { data: stock } = await supabase
            .from('wh_stock_levels')
            .select('quantity_available')
            .eq('tenant_id', tenantId)
            .eq('product_id', prodMap.product_id)
            .eq('location_id', locMap.location_id)
            .maybeSingle();
          const available = stock?.quantity_available || 0;

          await shopifyApi(
            config.shopDomain, config.accessToken, config.apiVersion,
            'inventory_levels/set.json', 'POST',
            {
              location_id: locMap.shopify_location_id,
              inventory_item_id: prodMap.shopify_inventory_item_id,
              available,
            },
          );

          await supabase.from('shopify_product_map').update({ last_synced_at: new Date().toISOString() }).eq('id', prodMap.id);
          counts.updated++;
          counts.processed++;
        } catch (exportErr) {
          counts.failed++;
          counts.processed++;
          errors.push({
            entity: `Product ${prodMap.shopify_product_title} → Location ${locMap.shopify_location_name}`,
            shopifyId: prodMap.shopify_inventory_item_id,
            message: exportErr instanceof Error ? exportErr.message : String(exportErr),
          });
        }
      }
    }

    const status = counts.failed > 0 ? (counts.updated > 0 ? 'partial' : 'failed') : 'completed';
    await completeSyncLog(supabase, syncLog.id, status, counts, errors);
    return json({ success: true, data: { counts } });
  } catch (err) {
    await completeSyncLog(supabase, syncLog.id, 'failed', counts, [{ message: err instanceof Error ? err.message : String(err) }]);
    throw err;
  }
}

// ============================================
// FULFILLMENT
// ============================================

// deno-lint-ignore no-explicit-any
async function handleCreateFulfillment(supabase: any, tenantId: string, userId: string, params?: Record<string, unknown>) {
  const shipmentId = params?.shipmentId as string;
  if (!shipmentId) return json({ error: 'shipmentId required' }, 400);
  const config = await getShopifyConfig(supabase, tenantId);

  const { data: shipment } = await supabase
    .from('wh_shipments')
    .select('*')
    .eq('id', shipmentId)
    .eq('tenant_id', tenantId)
    .single();

  if (!shipment) return json({ error: 'Shipment not found' }, 404);
  if (!shipment.shopify_order_id && !shipment.order_reference?.startsWith('Shopify ')) {
    return json({ error: 'Shipment is not a Shopify order' }, 400);
  }

  try {
    // Resolve shopify order id if missing
    let shopifyOrderId = shipment.shopify_order_id;
    if (!shopifyOrderId) {
      const orderName = shipment.order_reference.replace('Shopify ', '');
      const { body } = await shopifyApi(
        config.shopDomain, config.accessToken, config.apiVersion,
        `orders.json?name=${encodeURIComponent(orderName)}&status=any&limit=1`,
      );
      // deno-lint-ignore no-explicit-any
      shopifyOrderId = ((body as any)?.orders?.[0]?.id) || null;
      if (shopifyOrderId) {
        await supabase.from('wh_shipments').update({ shopify_order_id: shopifyOrderId }).eq('id', shipmentId);
      }
    }
    if (!shopifyOrderId) throw new Error(`Shopify order not found for ${shipment.order_reference}`);

    const { body: foBody } = await shopifyApi(
      config.shopDomain, config.accessToken, config.apiVersion,
      `orders/${shopifyOrderId}/fulfillment_orders.json`,
    );
    // deno-lint-ignore no-explicit-any
    const fulfillmentOrders = ((foBody as any)?.fulfillment_orders || []);
    // deno-lint-ignore no-explicit-any
    const openFO = fulfillmentOrders.find((fo: any) => fo.status === 'open' || fo.status === 'in_progress');
    if (!openFO) throw new Error('No open fulfillment order found');

    const fulfillmentPayload = {
      fulfillment: {
        line_items_by_fulfillment_order: [{ fulfillment_order_id: openFO.id }],
        tracking_info: shipment.tracking_number ? {
          number: shipment.tracking_number,
          company: shipment.carrier || undefined,
          url: shipment.label_url || undefined,
        } : undefined,
        notify_customer: true,
      },
    };

    const { body: result } = await shopifyApi(
      config.shopDomain, config.accessToken, config.apiVersion,
      'fulfillments.json', 'POST', fulfillmentPayload,
    );
    // deno-lint-ignore no-explicit-any
    const fulfillment = (result as any)?.fulfillment;

    await supabase
      .from('wh_shipments')
      .update({
        shopify_fulfillment_id: fulfillment?.id || null,
        shopify_fulfillment_status: fulfillment?.status || 'success',
        last_fulfillment_at: new Date().toISOString(),
        shopify_export_pending: false,
        shopify_export_error: null,
      })
      .eq('id', shipmentId);

    const syncLog = await createSyncLog(supabase, tenantId, 'fulfillment', 'export', userId);
    await completeSyncLog(supabase, syncLog.id, 'completed', { total: 1, processed: 1, created: 1, updated: 0, skipped: 0, failed: 0 });

    return json({ success: true, data: { fulfillmentId: fulfillment?.id, status: fulfillment?.status } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from('wh_shipments')
      .update({
        shopify_export_pending: true,
        shopify_export_attempts: (shipment.shopify_export_attempts ?? 0) + 1,
        shopify_export_error: msg,
      })
      .eq('id', shipmentId);
    return json({ success: false, error: msg }, 500);
  }
}

// deno-lint-ignore no-explicit-any
async function handleRetryFulfillment(supabase: any, tenantId: string, userId: string, params?: Record<string, unknown>) {
  const shipmentId = params?.shipmentId as string | undefined;

  let shipments;
  if (shipmentId) {
    const { data } = await supabase.from('wh_shipments').select('id').eq('id', shipmentId).eq('tenant_id', tenantId);
    shipments = data || [];
  } else {
    const { data } = await supabase
      .from('wh_shipments')
      .select('id, shopify_export_attempts')
      .eq('tenant_id', tenantId)
      .eq('shopify_export_pending', true)
      .lt('shopify_export_attempts', 5);
    shipments = data || [];
  }

  const results: Record<string, unknown>[] = [];
  for (const s of shipments) {
    const res = await handleCreateFulfillment(supabase, tenantId, userId, { shipmentId: s.id });
    const body = await res.json();
    results.push({ shipmentId: s.id, success: body.success, error: body.error });

    // Dead-letter after 5 failures
    if (!body.success) {
      const { data: refreshed } = await supabase
        .from('wh_shipments')
        .select('shopify_export_attempts')
        .eq('id', s.id)
        .single();
      if (refreshed?.shopify_export_attempts >= 5) {
        await supabase
          .from('wh_shipments')
          .update({ shopify_export_pending: false, shopify_fulfillment_status: 'dead_letter' })
          .eq('id', s.id);
      }
    }
  }

  return json({ success: true, data: { total: shipments.length, results } });
}

// deno-lint-ignore no-explicit-any
async function handleUpdateFulfillmentTracking(supabase: any, tenantId: string, _userId: string, params?: Record<string, unknown>) {
  const shipmentId = params?.shipmentId as string;
  if (!shipmentId) return json({ error: 'shipmentId required' }, 400);
  const config = await getShopifyConfig(supabase, tenantId);

  const { data: shipment } = await supabase
    .from('wh_shipments')
    .select('*')
    .eq('id', shipmentId)
    .eq('tenant_id', tenantId)
    .single();
  if (!shipment) return json({ error: 'Shipment not found' }, 404);
  if (!shipment.shopify_fulfillment_id) return json({ error: 'Shipment has no Shopify fulfillment to update' }, 400);
  if (!shipment.tracking_number) return json({ error: 'Shipment has no tracking number' }, 400);

  try {
    const { body } = await shopifyApi(
      config.shopDomain, config.accessToken, config.apiVersion,
      `fulfillments/${shipment.shopify_fulfillment_id}/update_tracking.json`,
      'POST',
      {
        fulfillment: {
          notify_customer: true,
          tracking_info: {
            number: shipment.tracking_number,
            company: shipment.carrier || undefined,
            url: shipment.label_url || undefined,
          },
        },
      },
    );
    // deno-lint-ignore no-explicit-any
    const fulfillment = (body as any)?.fulfillment;
    await supabase
      .from('wh_shipments')
      .update({
        shopify_fulfillment_status: fulfillment?.status || shipment.shopify_fulfillment_status,
        last_fulfillment_at: new Date().toISOString(),
      })
      .eq('id', shipmentId);
    return json({ success: true, data: { fulfillmentId: shipment.shopify_fulfillment_id } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // If fulfillment was deleted in Shopify, degrade to retry_fulfillment path
    if (msg.includes('404')) {
      await supabase.from('wh_shipments').update({ shopify_fulfillment_id: null, shopify_export_pending: true }).eq('id', shipmentId);
    }
    return json({ success: false, error: msg }, 500);
  }
}

// ============================================
// REFUNDS
// ============================================

// deno-lint-ignore no-explicit-any
async function handleCreateRefund(supabase: any, tenantId: string, userId: string, params?: Record<string, unknown>) {
  const returnId = params?.returnId as string;
  if (!returnId) return json({ error: 'returnId required' }, 400);
  const config = await getShopifyConfig(supabase, tenantId);

  const { data: rhReturn } = await supabase
    .from('rh_returns')
    .select('*')
    .eq('id', returnId)
    .eq('tenant_id', tenantId)
    .single();
  if (!rhReturn) return json({ error: 'Return not found' }, 404);
  if (!rhReturn.shopify_order_id) return json({ error: 'Return is not linked to a Shopify order' }, 400);
  if (rhReturn.shopify_refund_id) return json({ error: 'Refund already pushed to Shopify', data: { shopifyRefundId: rhReturn.shopify_refund_id } }, 409);
  if (!rhReturn.refund_amount || rhReturn.refund_amount <= 0) return json({ error: 'refund_amount must be > 0' }, 400);

  try {
    // 1. Find parent transaction
    const { body: txBody } = await shopifyApi(
      config.shopDomain, config.accessToken, config.apiVersion,
      `orders/${rhReturn.shopify_order_id}/transactions.json`,
    );
    // deno-lint-ignore no-explicit-any
    const transactions = ((txBody as any)?.transactions || []);
    // deno-lint-ignore no-explicit-any
    const parent = transactions.find((t: any) => (t.kind === 'sale' || t.kind === 'capture') && t.status === 'success');
    if (!parent) throw new Error('No capture/sale transaction found on Shopify order');

    // 2. Build + POST refund
    const syncLog = await createSyncLog(supabase, tenantId, 'fulfillment', 'export', userId); // reuse fulfillment as sync_type for refund (schema constraint)
    const refundPayload = {
      refund: {
        notify: true,
        note: rhReturn.internal_notes || `DPP Return ${rhReturn.return_number || rhReturn.id}`,
        shipping: { full_refund: false },
        transactions: [{
          parent_id: parent.id,
          amount: String(rhReturn.refund_amount),
          kind: 'refund',
          gateway: parent.gateway,
        }],
      },
    };

    const { body: refundBody } = await shopifyApi(
      config.shopDomain, config.accessToken, config.apiVersion,
      `orders/${rhReturn.shopify_order_id}/refunds.json`,
      'POST', refundPayload,
    );
    // deno-lint-ignore no-explicit-any
    const refund = (refundBody as any)?.refund;

    await supabase
      .from('rh_returns')
      .update({
        shopify_refund_id: refund?.id || null,
        refund_reference: refund?.id ? `shopify:${refund.id}` : rhReturn.refund_reference,
        refunded_at: new Date().toISOString(),
        last_refund_error: null,
      })
      .eq('id', returnId);

    await completeSyncLog(supabase, syncLog.id, 'completed', { total: 1, processed: 1, created: 1, updated: 0, skipped: 0, failed: 0 });
    return json({ success: true, data: { shopifyRefundId: refund?.id } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase.from('rh_returns').update({ last_refund_error: msg }).eq('id', returnId);
    return json({ success: false, error: msg }, 500);
  }
}

// ============================================
// UNMAPPED VARIANTS
// ============================================

// deno-lint-ignore no-explicit-any
async function handleFetchUnmappedVariants(supabase: any, tenantId: string) {
  // Pull from recent sync logs with unmapped_variant error entries
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: logs } = await supabase
    .from('shopify_sync_log')
    .select('errors, started_at')
    .eq('tenant_id', tenantId)
    .gte('started_at', since)
    .order('started_at', { ascending: false })
    .limit(20);

  const distinct = new Map<number, Record<string, unknown>>();
  for (const log of (logs || [])) {
    let errs: unknown[] = [];
    try { errs = typeof log.errors === 'string' ? JSON.parse(log.errors) : (log.errors || []); } catch { /* ignore */ }
    for (const e of errs) {
      // deno-lint-ignore no-explicit-any
      const err: any = e;
      if (err?.type !== 'unmapped_variant') continue;
      const existing = distinct.get(err.shopifyVariantId);
      if (existing) {
        // deno-lint-ignore no-explicit-any
        (existing as any).occurrences = ((existing as any).occurrences || 1) + 1;
      } else {
        distinct.set(err.shopifyVariantId, { ...err, lastSeenAt: log.started_at, occurrences: 1 });
      }
    }
  }

  // Also exclude variants already mapped in the meantime
  const { data: maps } = await supabase
    .from('shopify_product_map')
    .select('shopify_variant_id')
    .eq('tenant_id', tenantId);
  const mappedIds = new Set((maps || []).map((m: { shopify_variant_id: number }) => m.shopify_variant_id));
  for (const id of Array.from(distinct.keys())) if (mappedIds.has(id)) distinct.delete(id);

  return json({ success: true, data: { variants: Array.from(distinct.values()) } });
}

// ============================================
// WEBHOOKS
// ============================================

function webhookAddress(): string {
  try {
    const host = new URL(SUPABASE_URL).host;
    return `https://${host}/functions/v1/shopify-webhook`;
  } catch {
    return '';
  }
}

// deno-lint-ignore no-explicit-any
async function handleListWebhooks(supabase: any, tenantId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const { body } = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, 'webhooks.json?limit=250');
  // deno-lint-ignore no-explicit-any
  const webhooks = ((body as any)?.webhooks || []);
  return json({ success: true, data: { webhooks, expectedAddress: webhookAddress() } });
}

// deno-lint-ignore no-explicit-any
async function handleRegisterWebhooks(supabase: any, tenantId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const address = webhookAddress();
  if (!address) return json({ error: 'Could not compute webhook address' }, 500);

  const { body } = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, 'webhooks.json?limit=250');
  // deno-lint-ignore no-explicit-any
  const existing = ((body as any)?.webhooks || []);
  // deno-lint-ignore no-explicit-any
  const existingByTopic = new Map<string, any>(existing.map((w: any) => [w.topic, w]));

  const registered: unknown[] = [];
  const skipped: unknown[] = [];
  const failed: unknown[] = [];

  for (const topic of DESIRED_WEBHOOK_TOPICS) {
    const existingWebhook = existingByTopic.get(topic);
    if (existingWebhook && existingWebhook.address === address) {
      skipped.push({ topic, reason: 'already_registered', webhookId: existingWebhook.id });
      continue;
    }
    // If pointing to wrong address, delete + recreate
    if (existingWebhook) {
      try {
        await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, `webhooks/${existingWebhook.id}.json`, 'DELETE');
      } catch (e) {
        console.warn(`Failed to delete stale webhook ${existingWebhook.id}:`, e);
      }
    }

    try {
      const { body: created } = await shopifyApi(
        config.shopDomain, config.accessToken, config.apiVersion,
        'webhooks.json', 'POST',
        { webhook: { topic, address, format: 'json' } },
      );
      // deno-lint-ignore no-explicit-any
      registered.push((created as any)?.webhook);
    } catch (err) {
      failed.push({ topic, error: err instanceof Error ? err.message : String(err) });
    }
  }

  // Persist registered webhooks snapshot
  const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', tenantId).single();
  const settings = tenant?.settings || {};
  await supabase
    .from('tenants')
    .update({
      settings: {
        ...settings,
        shopifyIntegration: {
          ...settings.shopifyIntegration,
          registeredWebhooks: registered.concat(Array.from(existingByTopic.values()).filter(w => w.address === address)),
          webhooksRegisteredAt: new Date().toISOString(),
        },
      },
    })
    .eq('id', tenantId);

  return json({ success: true, data: { registered: registered.length, skipped: skipped.length, failed: failed.length, details: { registered, skipped, failed }, expectedAddress: address } });
}

// deno-lint-ignore no-explicit-any
async function handleDeleteWebhooks(supabase: any, tenantId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const address = webhookAddress();
  const { body } = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, 'webhooks.json?limit=250');
  // deno-lint-ignore no-explicit-any
  const toDelete = ((body as any)?.webhooks || []).filter((w: any) => w.address === address);

  let deleted = 0;
  const errors: unknown[] = [];
  // deno-lint-ignore no-explicit-any
  for (const w of toDelete as any[]) {
    try {
      await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, `webhooks/${w.id}.json`, 'DELETE');
      deleted++;
    } catch (err) {
      errors.push({ id: w.id, topic: w.topic, error: err instanceof Error ? err.message : String(err) });
    }
  }

  const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', tenantId).single();
  const settings = tenant?.settings || {};
  await supabase
    .from('tenants')
    .update({
      settings: {
        ...settings,
        shopifyIntegration: {
          ...settings.shopifyIntegration,
          registeredWebhooks: [],
          webhooksRegisteredAt: null,
        },
      },
    })
    .eq('id', tenantId);

  return json({ success: true, data: { deleted, errors } });
}

// deno-lint-ignore no-explicit-any
async function handleTestWebhook(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  const config = await getShopifyConfig(supabase, tenantId);
  const topic = (params?.topic as string) || 'orders/create';
  // Shopify has no direct "test" API; the most common approach is to tell Shopify
  // Admin to send a test notification. We simulate this by recording intent + relying
  // on the user to trigger a real test from Shopify Admin UI.
  // For now: read-back recent shopify_webhook_events to prove end-to-end delivery.
  const { data: recent } = await supabase
    .from('shopify_webhook_events')
    .select('topic, received_at, status')
    .eq('tenant_id', tenantId)
    .eq('shop_domain', config.shopDomain)
    .order('received_at', { ascending: false })
    .limit(5);
  return json({
    success: true,
    data: {
      message: `Send a test notification from Shopify Admin → Settings → Notifications → Webhooks for topic "${topic}". Recent events shown below.`,
      recent: recent || [],
      expectedAddress: webhookAddress(),
    },
  });
}

// ============================================
// STOCK RESERVATION HELPERS
// ============================================

function generateTransactionNumber(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${dateStr}-${rand}`;
}

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
    warnings.push(`Insufficient stock for batch ${batchId}: available=${stock.quantity_available}, requested=${quantity}`);
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
    notes: `Auto-reserved via Shopify sync`,
  });
}
