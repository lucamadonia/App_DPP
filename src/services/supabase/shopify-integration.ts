/**
 * Shopify Integration Service
 *
 * Client-side service for Shopify bidirectional sync.
 * No direct Shopify API calls — all proxied via the
 * `shopify-sync` Edge Function to keep access tokens server-side.
 *
 * CRUD on mapping tables (product, location) + sync triggers.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  ShopifyIntegrationSettings,
  ShopifySyncConfig,
  ShopifyProductMap,
  ShopifyLocationMap,
  ShopifySyncLog,
  ShopifySyncResponse,
  ShopifyProduct,
  ShopifyLocation,
  ShopifySyncDirection,
  AutoMapResult,
} from '@/types/shopify';

// ============================================
// HELPERS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProductMap(row: any): ShopifyProductMap {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shopifyProductId: row.shopify_product_id,
    shopifyVariantId: row.shopify_variant_id,
    shopifyInventoryItemId: row.shopify_inventory_item_id || undefined,
    shopifyProductTitle: row.shopify_product_title || undefined,
    shopifyVariantTitle: row.shopify_variant_title || undefined,
    shopifySku: row.shopify_sku || undefined,
    shopifyBarcode: row.shopify_barcode || undefined,
    productId: row.product_id,
    batchId: row.batch_id || undefined,
    syncDirection: row.sync_direction,
    isActive: row.is_active,
    lastSyncedAt: row.last_synced_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    productName: row.products?.name || undefined,
    batchSerialNumber: row.product_batches?.serial_number || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformLocationMap(row: any): ShopifyLocationMap {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shopifyLocationId: row.shopify_location_id,
    shopifyLocationName: row.shopify_location_name || undefined,
    locationId: row.location_id,
    syncInventory: row.sync_inventory,
    syncOrders: row.sync_orders,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    locationName: row.wh_locations?.name || undefined,
    locationCode: row.wh_locations?.code || undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformSyncLog(row: any): ShopifySyncLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    syncType: row.sync_type,
    direction: row.direction,
    status: row.status,
    totalCount: row.total_count || 0,
    processedCount: row.processed_count || 0,
    createdCount: row.created_count || 0,
    updatedCount: row.updated_count || 0,
    skippedCount: row.skipped_count || 0,
    failedCount: row.failed_count || 0,
    errors: row.errors || [],
    triggerType: row.trigger_type || 'manual',
    triggeredBy: row.triggered_by || undefined,
    startedAt: row.started_at,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
  };
}

async function callEdgeFunction(action: string, params?: Record<string, unknown>): Promise<ShopifySyncResponse> {
  const { data, error } = await supabase.functions.invoke('shopify-sync', {
    body: { action, params },
  });
  if (error) throw new Error(`Shopify sync failed: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data as ShopifySyncResponse;
}

// ============================================
// SETTINGS
// ============================================

/**
 * Get Shopify integration settings (without accessToken — that's server-only)
 */
export async function getShopifySettings(): Promise<ShopifyIntegrationSettings | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const settings = data?.settings?.shopifyIntegration as ShopifyIntegrationSettings | undefined;
  if (!settings) return null;

  // Strip accessToken from client-side result
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accessToken, ...safeSettings } = settings;
  return safeSettings as ShopifyIntegrationSettings;
}

/**
 * Update Shopify settings (sync config, domain, etc. — NOT token)
 */
export async function updateShopifySettings(updates: Partial<ShopifyIntegrationSettings>): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const currentSettings = tenant?.settings || {};
  const currentShopify = currentSettings.shopifyIntegration || {};

  // Never allow client to set accessToken
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accessToken, ...safeUpdates } = updates;

  const { error } = await supabase
    .from('tenants')
    .update({
      settings: {
        ...currentSettings,
        shopifyIntegration: {
          ...currentShopify,
          ...safeUpdates,
        },
      },
    })
    .eq('id', tenantId);

  if (error) throw new Error(`Failed to update settings: ${error.message}`);
}

/**
 * Update just the sync config portion
 */
export async function updateShopifySyncConfig(syncConfig: Partial<ShopifySyncConfig>): Promise<void> {
  const settings = await getShopifySettings();
  const currentConfig = settings?.syncConfig || {};
  await updateShopifySettings({
    syncConfig: { ...currentConfig, ...syncConfig } as ShopifySyncConfig,
  });
}

/**
 * Save access token securely via Edge Function
 */
export async function saveShopifyAccessToken(shopDomain: string, accessToken: string): Promise<void> {
  await callEdgeFunction('save_token', { shopDomain, accessToken });
}

/**
 * Disconnect Shopify — remove settings
 */
export async function disconnectShopify(): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  const currentSettings = tenant?.settings || {};
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { shopifyIntegration, ...rest } = currentSettings;

  await supabase
    .from('tenants')
    .update({ settings: rest })
    .eq('id', tenantId);

  // Clean up mapping tables
  await supabase.from('shopify_product_map').delete().eq('tenant_id', tenantId);
  await supabase.from('shopify_location_map').delete().eq('tenant_id', tenantId);
}

// ============================================
// PRODUCT MAPS
// ============================================

export async function getShopifyProductMaps(): Promise<ShopifyProductMap[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('shopify_product_map')
    .select('*, products(name), product_batches(serial_number)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) { console.error('Failed to load product maps:', error); return []; }
  return (data || []).map(transformProductMap);
}

export async function createShopifyProductMap(input: {
  shopifyProductId: number;
  shopifyVariantId: number;
  shopifyInventoryItemId?: number;
  shopifyProductTitle?: string;
  shopifyVariantTitle?: string;
  shopifySku?: string;
  shopifyBarcode?: string;
  productId: string;
  batchId?: string;
  syncDirection?: ShopifySyncDirection;
}): Promise<ShopifyProductMap> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { data, error } = await supabase
    .from('shopify_product_map')
    .insert({
      tenant_id: tenantId,
      shopify_product_id: input.shopifyProductId,
      shopify_variant_id: input.shopifyVariantId,
      shopify_inventory_item_id: input.shopifyInventoryItemId || null,
      shopify_product_title: input.shopifyProductTitle || null,
      shopify_variant_title: input.shopifyVariantTitle || null,
      shopify_sku: input.shopifySku || null,
      shopify_barcode: input.shopifyBarcode || null,
      product_id: input.productId,
      batch_id: input.batchId || null,
      sync_direction: input.syncDirection || 'both',
    })
    .select('*, products(name), product_batches(serial_number)')
    .single();

  if (error) throw new Error(`Failed to create product map: ${error.message}`);
  return transformProductMap(data);
}

export async function updateShopifyProductMap(
  id: string,
  updates: Partial<{
    productId: string;
    batchId: string | null;
    syncDirection: ShopifySyncDirection;
    isActive: boolean;
  }>,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (updates.productId !== undefined) update.product_id = updates.productId;
  if (updates.batchId !== undefined) update.batch_id = updates.batchId || null;
  if (updates.syncDirection !== undefined) update.sync_direction = updates.syncDirection;
  if (updates.isActive !== undefined) update.is_active = updates.isActive;

  const { error } = await supabase
    .from('shopify_product_map')
    .update(update)
    .eq('id', id);

  if (error) throw new Error(`Failed to update product map: ${error.message}`);
}

export async function deleteShopifyProductMap(id: string): Promise<void> {
  const { error } = await supabase.from('shopify_product_map').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete product map: ${error.message}`);
}

/**
 * Auto-map Shopify variants to Trackbliss products by matching GTIN/barcode
 */
export async function autoMapByGtin(shopifyProducts: ShopifyProduct[]): Promise<AutoMapResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  // Load all Trackbliss products with GTIN
  const { data: tbProducts } = await supabase
    .from('products')
    .select('id, name, gtin')
    .eq('tenant_id', tenantId)
    .not('gtin', 'is', null);

  // Load existing mappings to skip
  const { data: existingMaps } = await supabase
    .from('shopify_product_map')
    .select('shopify_variant_id')
    .eq('tenant_id', tenantId);

  const mappedVariantIds = new Set((existingMaps || []).map(m => m.shopify_variant_id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gtinMap = new Map((tbProducts || []).map((p: any) => [p.gtin, p]));

  const result: AutoMapResult = { mapped: 0, skipped: 0, details: [] };

  for (const product of shopifyProducts) {
    for (const variant of product.variants) {
      if (mappedVariantIds.has(variant.id)) {
        result.skipped++;
        result.details.push({
          shopifyVariantId: variant.id,
          shopifyProductTitle: product.title,
          shopifyVariantTitle: variant.title,
          shopifyBarcode: variant.barcode || undefined,
          status: 'skipped_already_mapped',
        });
        continue;
      }

      const barcode = variant.barcode?.trim();
      const matchedProduct = barcode ? gtinMap.get(barcode) : undefined;

      if (matchedProduct) {
        // Create mapping
        await supabase.from('shopify_product_map').insert({
          tenant_id: tenantId,
          shopify_product_id: product.id,
          shopify_variant_id: variant.id,
          shopify_inventory_item_id: variant.inventory_item_id || null,
          shopify_product_title: product.title,
          shopify_variant_title: variant.title,
          shopify_sku: variant.sku || null,
          shopify_barcode: barcode || null,
          product_id: matchedProduct.id,
          sync_direction: 'both',
        });

        result.mapped++;
        result.details.push({
          shopifyVariantId: variant.id,
          shopifyProductTitle: product.title,
          shopifyVariantTitle: variant.title,
          shopifyBarcode: barcode,
          matchedProductId: matchedProduct.id,
          matchedProductName: matchedProduct.name,
          status: 'mapped',
        });
      } else {
        result.skipped++;
        result.details.push({
          shopifyVariantId: variant.id,
          shopifyProductTitle: product.title,
          shopifyVariantTitle: variant.title,
          shopifyBarcode: barcode,
          status: 'skipped_no_match',
        });
      }
    }
  }

  return result;
}

// ============================================
// LOCATION MAPS
// ============================================

export async function getShopifyLocationMaps(): Promise<ShopifyLocationMap[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('shopify_location_map')
    .select('*, wh_locations(name, code)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) { console.error('Failed to load location maps:', error); return []; }
  return (data || []).map(transformLocationMap);
}

export async function createShopifyLocationMap(input: {
  shopifyLocationId: number;
  shopifyLocationName?: string;
  locationId: string;
  syncInventory?: boolean;
  syncOrders?: boolean;
  isPrimary?: boolean;
}): Promise<ShopifyLocationMap> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  // If setting as primary, unset others
  if (input.isPrimary) {
    await supabase
      .from('shopify_location_map')
      .update({ is_primary: false })
      .eq('tenant_id', tenantId);
  }

  const { data, error } = await supabase
    .from('shopify_location_map')
    .insert({
      tenant_id: tenantId,
      shopify_location_id: input.shopifyLocationId,
      shopify_location_name: input.shopifyLocationName || null,
      location_id: input.locationId,
      sync_inventory: input.syncInventory ?? true,
      sync_orders: input.syncOrders ?? true,
      is_primary: input.isPrimary ?? false,
    })
    .select('*, wh_locations(name, code)')
    .single();

  if (error) throw new Error(`Failed to create location map: ${error.message}`);
  return transformLocationMap(data);
}

export async function updateShopifyLocationMap(
  id: string,
  updates: Partial<{
    locationId: string;
    syncInventory: boolean;
    syncOrders: boolean;
    isPrimary: boolean;
  }>,
): Promise<void> {
  const tenantId = await getCurrentTenantId();

  // If setting as primary, unset others first
  if (updates.isPrimary && tenantId) {
    await supabase
      .from('shopify_location_map')
      .update({ is_primary: false })
      .eq('tenant_id', tenantId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {};
  if (updates.locationId !== undefined) update.location_id = updates.locationId;
  if (updates.syncInventory !== undefined) update.sync_inventory = updates.syncInventory;
  if (updates.syncOrders !== undefined) update.sync_orders = updates.syncOrders;
  if (updates.isPrimary !== undefined) update.is_primary = updates.isPrimary;

  const { error } = await supabase
    .from('shopify_location_map')
    .update(update)
    .eq('id', id);

  if (error) throw new Error(`Failed to update location map: ${error.message}`);
}

export async function deleteShopifyLocationMap(id: string): Promise<void> {
  const { error } = await supabase.from('shopify_location_map').delete().eq('id', id);
  if (error) throw new Error(`Failed to delete location map: ${error.message}`);
}

// ============================================
// SYNC LOGS
// ============================================

export async function getShopifySyncLogs(limit = 50): Promise<ShopifySyncLog[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('shopify_sync_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) { console.error('Failed to load sync logs:', error); return []; }
  return (data || []).map(transformSyncLog);
}

export async function getLatestSyncLog(syncType: string, direction: string): Promise<ShopifySyncLog | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data, error } = await supabase
    .from('shopify_sync_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('sync_type', syncType)
    .eq('direction', direction)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return transformSyncLog(data);
}

// ============================================
// SYNC TRIGGERS (via Edge Function)
// ============================================

export async function testShopifyConnection(): Promise<{
  shopName: string;
  domain: string;
  email: string;
  plan: string;
}> {
  const res = await callEdgeFunction('test_connection');
  return res.data as { shopName: string; domain: string; email: string; plan: string };
}

export async function fetchShopifyProducts(sinceId?: number): Promise<ShopifyProduct[]> {
  const res = await callEdgeFunction('fetch_products', { limit: 250, sinceId });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.products || [];
}

export async function fetchShopifyLocations(): Promise<ShopifyLocation[]> {
  const res = await callEdgeFunction('fetch_locations');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (res.data as any)?.locations || [];
}

export async function syncShopifyOrders(sinceId?: number): Promise<ShopifySyncResponse> {
  return callEdgeFunction('sync_orders', { sinceId });
}

export async function syncInventoryImport(): Promise<ShopifySyncResponse> {
  return callEdgeFunction('sync_inventory_import');
}

export async function syncInventoryExport(): Promise<ShopifySyncResponse> {
  return callEdgeFunction('sync_inventory_export');
}

export async function createShopifyFulfillment(shipmentId: string): Promise<ShopifySyncResponse> {
  return callEdgeFunction('create_fulfillment', { shipmentId });
}

export async function runFullSync(): Promise<{
  orders: ShopifySyncResponse;
  inventory: ShopifySyncResponse;
}> {
  const [orders, inventory] = await Promise.all([
    syncShopifyOrders(),
    syncInventoryExport(),
  ]);
  return { orders, inventory };
}
