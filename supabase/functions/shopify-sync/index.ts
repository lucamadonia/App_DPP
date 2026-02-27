/**
 * Supabase Edge Function: shopify-sync
 *
 * Server-side Shopify Admin API proxy.
 * All Shopify API calls go through this function so the
 * access token never leaves the server.
 *
 * Supports 8 actions:
 *   test_connection   — GET /shop.json
 *   fetch_products    — GET /products.json (with variants)
 *   fetch_locations   — GET /locations.json
 *   sync_orders       — Import orders → wh_shipments
 *   sync_inventory_import — Read Shopify inventory levels
 *   sync_inventory_export — Push wh_stock_levels → Shopify
 *   create_fulfillment — Send fulfillment for a shipment
 *   save_token        — Securely store access token
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
};

// ============================================
// MAIN HANDLER
// ============================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return json(null, 204);
  }

  try {
    // 1. Auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return json({ error: 'Missing authorization' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    // 2. Get tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();
    if (!profile?.tenant_id) return json({ error: 'No tenant' }, 400);
    const tenantId = profile.tenant_id;

    // 3. Billing gate — require warehouse_professional or warehouse_business
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

    // 4. Parse action
    const body = await req.json();
    const { action, params } = body as { action: string; params?: Record<string, unknown> };

    // 5. Dispatch
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
      case 'sync_inventory_import':
        return await handleSyncInventoryImport(supabase, tenantId, user.id);
      case 'sync_inventory_export':
        return await handleSyncInventoryExport(supabase, tenantId, user.id);
      case 'create_fulfillment':
        return await handleCreateFulfillment(supabase, tenantId, user.id, params);
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
  };
}

async function shopifyApi(
  shopDomain: string,
  accessToken: string,
  apiVersion: string,
  endpoint: string,
  method = 'GET',
  // deno-lint-ignore no-explicit-any
  body?: any,
) {
  const url = `https://${shopDomain}/admin/api/${apiVersion}/${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify API ${res.status}: ${text}`);
  }

  return res.json();
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
async function completeSyncLog(supabase: any, logId: string, status: string, counts: Record<string, number>, errors: unknown[] = []) {
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
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

// ============================================
// ACTION HANDLERS
// ============================================

/** Save access token securely (only server-side via service role) */
// deno-lint-ignore no-explicit-any
async function handleSaveToken(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  const token = params?.accessToken as string;
  const shopDomain = params?.shopDomain as string;
  if (!token || !shopDomain) return json({ error: 'accessToken and shopDomain required' }, 400);

  // Load current settings
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
        orderStatusFilter: ['paid'],
      },
      connectedAt: new Date().toISOString(),
    },
  };

  await supabase
    .from('tenants')
    .update({ settings: updated })
    .eq('id', tenantId);

  return json({ success: true });
}

/** Test connection — GET /shop.json */
// deno-lint-ignore no-explicit-any
async function handleTestConnection(supabase: any, tenantId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const data = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, 'shop.json');

  // Update shop name in settings
  if (data?.shop?.name) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    const settings = tenant?.settings || {};
    await supabase
      .from('tenants')
      .update({
        settings: {
          ...settings,
          shopifyIntegration: {
            ...settings.shopifyIntegration,
            shopName: data.shop.name,
          },
        },
      })
      .eq('id', tenantId);
  }

  return json({
    success: true,
    data: {
      shopName: data?.shop?.name,
      domain: data?.shop?.domain,
      email: data?.shop?.email,
      plan: data?.shop?.plan_display_name,
    },
  });
}

/** Fetch Shopify products with variants (for mapping UI) */
// deno-lint-ignore no-explicit-any
async function handleFetchProducts(supabase: any, tenantId: string, params?: Record<string, unknown>) {
  const config = await getShopifyConfig(supabase, tenantId);
  const limit = (params?.limit as number) || 50;
  const sinceId = params?.sinceId as number | undefined;

  let endpoint = `products.json?limit=${limit}&status=active`;
  if (sinceId) endpoint += `&since_id=${sinceId}`;

  const data = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, endpoint);

  // Also fetch existing mappings to show status
  const { data: existingMaps } = await supabase
    .from('shopify_product_map')
    .select('shopify_variant_id, product_id, batch_id')
    .eq('tenant_id', tenantId);

  const mappedVariantIds = new Set((existingMaps || []).map((m: { shopify_variant_id: number }) => m.shopify_variant_id));

  // Annotate products with mapping status
  // deno-lint-ignore no-explicit-any
  const products = (data?.products || []).map((p: any) => ({
    ...p,
    // deno-lint-ignore no-explicit-any
    variants: (p.variants || []).map((v: any) => ({
      ...v,
      _isMapped: mappedVariantIds.has(v.id),
    })),
  }));

  return json({ success: true, data: { products } });
}

/** Fetch Shopify locations (for mapping UI) */
// deno-lint-ignore no-explicit-any
async function handleFetchLocations(supabase: any, tenantId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const data = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, 'locations.json');
  return json({ success: true, data: { locations: data?.locations || [] } });
}

/** Import orders from Shopify → create wh_shipments */
// deno-lint-ignore no-explicit-any
async function handleSyncOrders(supabase: any, tenantId: string, userId: string, params?: Record<string, unknown>) {
  const config = await getShopifyConfig(supabase, tenantId);
  const syncLog = await createSyncLog(supabase, tenantId, 'orders', 'import', userId);

  const counts = { total: 0, processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
  const errors: unknown[] = [];

  try {
    // Filter by financial status
    const statusFilter = (config.syncConfig?.orderStatusFilter as string[]) || ['paid'];
    const statusParam = statusFilter.join(',');

    // Fetch orders not yet fulfilled
    const sinceId = params?.sinceId as number | undefined;
    let endpoint = `orders.json?status=open&financial_status=${statusParam}&limit=50&fulfillment_status=unfulfilled`;
    if (sinceId) endpoint += `&since_id=${sinceId}`;

    const data = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, endpoint);
    const orders = data?.orders || [];
    counts.total = orders.length;

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

    // deno-lint-ignore no-explicit-any
    for (const order of orders) {
      try {
        const orderRef = `Shopify ${order.name}`;

        // Idempotency check — skip if shipment already exists
        const { data: existing } = await supabase
          .from('wh_shipments')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('order_reference', orderRef)
          .maybeSingle();

        if (existing) {
          counts.skipped++;
          counts.processed++;
          continue;
        }

        // Build shipping address
        const addr = order.shipping_address || order.billing_address || {};
        const recipientName = [addr.first_name, addr.last_name].filter(Boolean).join(' ') || order.customer?.first_name || 'Shopify Customer';

        // Build line items from mapped variants
        // deno-lint-ignore no-explicit-any
        const items: any[] = [];
        // deno-lint-ignore no-explicit-any
        for (const li of (order.line_items || [])) {
          const mapping = variantMap.get(li.variant_id);
          if (!mapping) continue; // skip unmapped variants

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
          counts.skipped++;
          counts.processed++;
          continue;
        }

        // Generate shipment number
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        const shipmentNumber = `SHP-${dateStr}-${rand}`;

        const totalItems = items.reduce((sum: number, i: { quantity: number }) => sum + i.quantity, 0);

        // Create shipment
        const { data: shipment, error: shipErr } = await supabase
          .from('wh_shipments')
          .insert({
            tenant_id: tenantId,
            shipment_number: shipmentNumber,
            status: config.syncConfig?.autoCreateShipments ? 'draft' : 'draft',
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
          counts.failed++;
          errors.push({ entity: orderRef, message: shipErr.message });
          counts.processed++;
          continue;
        }

        // Create shipment items
        const shipmentItems = items.map((i: Record<string, unknown>) => ({
          ...i,
          shipment_id: shipment.id,
        }));
        await supabase.from('wh_shipment_items').insert(shipmentItems);

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

    const status = counts.failed > 0 ? (counts.created > 0 ? 'partial' : 'failed') : 'completed';
    await completeSyncLog(supabase, syncLog.id, status, counts, errors);

    return json({ success: true, data: { counts }, syncLog: { ...syncLog, ...counts, status } });
  } catch (err) {
    await completeSyncLog(supabase, syncLog.id, 'failed', counts, [
      { message: err instanceof Error ? err.message : String(err) },
    ]);
    throw err;
  }
}

/** Read Shopify inventory levels → compare with wh_stock_levels */
// deno-lint-ignore no-explicit-any
async function handleSyncInventoryImport(supabase: any, tenantId: string, userId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const syncLog = await createSyncLog(supabase, tenantId, 'inventory', 'import', userId);

  const counts = { total: 0, processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
  const errors: unknown[] = [];

  try {
    // Load mappings
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

    // For each mapped location, fetch inventory levels
    // deno-lint-ignore no-explicit-any
    for (const locMap of locationMaps) {
      const inventoryItemIds = (productMaps || [])
        // deno-lint-ignore no-explicit-any
        .filter((m: any) => m.shopify_inventory_item_id)
        // deno-lint-ignore no-explicit-any
        .map((m: any) => m.shopify_inventory_item_id);

      if (inventoryItemIds.length === 0) continue;

      // Shopify allows max 50 items per request
      for (let i = 0; i < inventoryItemIds.length; i += 50) {
        const batch = inventoryItemIds.slice(i, i + 50);
        const ids = batch.join(',');
        const endpoint = `inventory_levels.json?location_ids=${locMap.shopify_location_id}&inventory_item_ids=${ids}`;

        const data = await shopifyApi(config.shopDomain, config.accessToken, config.apiVersion, endpoint);
        const levels = data?.inventory_levels || [];
        counts.total += levels.length;

        // deno-lint-ignore no-explicit-any
        for (const level of levels) {
          const mapping = inventoryItemMap.get(level.inventory_item_id);
          if (!mapping) { counts.skipped++; counts.processed++; continue; }

          counts.processed++;
          // We just report the data — Trackbliss is source of truth for stock
          // The UI can show discrepancies
          counts.updated++;
        }
      }
    }

    await completeSyncLog(supabase, syncLog.id, 'completed', counts, errors);
    return json({ success: true, data: { counts } });
  } catch (err) {
    await completeSyncLog(supabase, syncLog.id, 'failed', counts, [
      { message: err instanceof Error ? err.message : String(err) },
    ]);
    throw err;
  }
}

/** Push wh_stock_levels → Shopify inventory (absolute set) */
// deno-lint-ignore no-explicit-any
async function handleSyncInventoryExport(supabase: any, tenantId: string, userId: string) {
  const config = await getShopifyConfig(supabase, tenantId);
  const syncLog = await createSyncLog(supabase, tenantId, 'inventory', 'export', userId);

  const counts = { total: 0, processed: 0, created: 0, updated: 0, skipped: 0, failed: 0 };
  const errors: unknown[] = [];

  try {
    // Load active product mappings with inventory_item_id
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
          // Get stock level from Trackbliss
          const { data: stock } = await supabase
            .from('wh_stock_levels')
            .select('quantity_available')
            .eq('tenant_id', tenantId)
            .eq('product_id', prodMap.product_id)
            .eq('location_id', locMap.location_id)
            .maybeSingle();

          const available = stock?.quantity_available || 0;

          // Shopify set (absolute, idempotent)
          await shopifyApi(
            config.shopDomain,
            config.accessToken,
            config.apiVersion,
            'inventory_levels/set.json',
            'POST',
            {
              location_id: locMap.shopify_location_id,
              inventory_item_id: prodMap.shopify_inventory_item_id,
              available,
            },
          );

          // Update last_synced_at
          await supabase
            .from('shopify_product_map')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', prodMap.id);

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
    await completeSyncLog(supabase, syncLog.id, 'failed', counts, [
      { message: err instanceof Error ? err.message : String(err) },
    ]);
    throw err;
  }
}

/** Create fulfillment in Shopify for a shipped shipment */
// deno-lint-ignore no-explicit-any
async function handleCreateFulfillment(supabase: any, tenantId: string, userId: string, params?: Record<string, unknown>) {
  const shipmentId = params?.shipmentId as string;
  if (!shipmentId) return json({ error: 'shipmentId required' }, 400);

  const config = await getShopifyConfig(supabase, tenantId);

  // Load shipment
  const { data: shipment } = await supabase
    .from('wh_shipments')
    .select('*')
    .eq('id', shipmentId)
    .eq('tenant_id', tenantId)
    .single();

  if (!shipment) return json({ error: 'Shipment not found' }, 404);
  if (!shipment.order_reference?.startsWith('Shopify ')) {
    return json({ error: 'Shipment is not a Shopify order' }, 400);
  }

  // Extract Shopify order name (e.g. "#1001")
  const orderName = shipment.order_reference.replace('Shopify ', '');

  // Find the Shopify order by name
  const ordersData = await shopifyApi(
    config.shopDomain, config.accessToken, config.apiVersion,
    `orders.json?name=${encodeURIComponent(orderName)}&status=any&limit=1`,
  );
  const shopifyOrder = ordersData?.orders?.[0];
  if (!shopifyOrder) return json({ error: `Shopify order ${orderName} not found` }, 404);

  // Get fulfillment orders
  const fulfillmentOrdersData = await shopifyApi(
    config.shopDomain, config.accessToken, config.apiVersion,
    `orders/${shopifyOrder.id}/fulfillment_orders.json`,
  );
  const fulfillmentOrders = fulfillmentOrdersData?.fulfillment_orders || [];
  // deno-lint-ignore no-explicit-any
  const openFO = fulfillmentOrders.find((fo: any) => fo.status === 'open' || fo.status === 'in_progress');

  if (!openFO) return json({ error: 'No open fulfillment order found' }, 400);

  // Create fulfillment
  const fulfillmentPayload = {
    fulfillment: {
      line_items_by_fulfillment_order: [{
        fulfillment_order_id: openFO.id,
      }],
      tracking_info: shipment.tracking_number ? {
        number: shipment.tracking_number,
        company: shipment.carrier || undefined,
        url: shipment.label_url || undefined,
      } : undefined,
      notify_customer: true,
    },
  };

  const result = await shopifyApi(
    config.shopDomain, config.accessToken, config.apiVersion,
    'fulfillments.json',
    'POST',
    fulfillmentPayload,
  );

  // Log sync
  const syncLog = await createSyncLog(supabase, tenantId, 'fulfillment', 'export', userId);
  await completeSyncLog(supabase, syncLog.id, 'completed', {
    total: 1, processed: 1, created: 1, updated: 0, skipped: 0, failed: 0,
  });

  return json({
    success: true,
    data: {
      fulfillmentId: result?.fulfillment?.id,
      status: result?.fulfillment?.status,
    },
  });
}
