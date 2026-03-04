I have now gathered comprehensive knowledge of the codebase. Let me compose the full implementation plan.

---

# Comprehensive Shopify Bidirectional Integration Plan for Trackbliss Warehouse Module

## 1. Architecture Overview

The Shopify integration follows the established Trackbliss patterns: database tables with RLS, a service layer in `src/services/supabase/`, TypeScript types in `src/types/`, Edge Functions for server-side Shopify API calls (the Admin API access token must never be exposed to the browser), and UI pages in `src/pages/warehouse/`. The integration sits within the existing warehouse module billing tier and uses `warehouseCarrierIntegrations` as its feature gate.

**Source of truth rules:**
- Trackbliss is the authority on stock levels (Trackbliss -> Shopify)
- Shopify is the authority on orders (Shopify -> Trackbliss)
- Product mapping is manual (user links Shopify products/variants to Trackbliss products/batches)
- Location mapping is manual (user links Shopify locations to Trackbliss warehouse locations)

**Data flow:**

```
IMPORT (Shopify -> Trackbliss):
  1. Products/Variants -> shopify_product_map (mapping only, no product creation)
  2. Orders -> wh_shipments + wh_shipment_items (via order_reference)
  3. Inventory levels -> wh_stock_levels (initial sync / reconciliation)
  4. Customers -> wh_contacts

EXPORT (Trackbliss -> Shopify):
  1. Stock level changes -> Shopify Inventory Level API (set quantity)
  2. Shipment shipped -> Shopify Fulfillment API (create fulfillment with tracking)
```

**Security model:** The Shopify Admin API access token is stored in `tenants.settings.shopifyIntegration.accessToken`. This token is NEVER sent to the browser. All Shopify API calls go through the `shopify-sync` Edge Function, which reads the token server-side using service role access to the tenants table.

---

## 2. Database Migration

**File:** `supabase/migrations/20260228_shopify_integration.sql`

```sql
-- ================================================================
-- Shopify Integration Tables
-- Migration: 20260228_shopify_integration.sql
--
-- 3 new tables: shopify_product_map, shopify_location_map, shopify_sync_log
-- ================================================================

-- ================================================================
-- 1. shopify_product_map — Maps Shopify product/variant to Trackbliss product/batch
-- ================================================================

CREATE TABLE IF NOT EXISTS shopify_product_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Shopify side
    shopify_product_id BIGINT NOT NULL,
    shopify_variant_id BIGINT NOT NULL,
    shopify_product_title TEXT,
    shopify_variant_title TEXT,
    shopify_sku TEXT,
    shopify_inventory_item_id BIGINT,

    -- Trackbliss side
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,

    -- Sync metadata
    sync_enabled BOOLEAN DEFAULT true,
    sync_direction TEXT NOT NULL DEFAULT 'both'
        CHECK (sync_direction IN ('import_only', 'export_only', 'both')),
    last_synced_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One Shopify variant can only map to one Trackbliss product/batch per tenant
    UNIQUE(tenant_id, shopify_variant_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_product_map_tenant
    ON shopify_product_map(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_map_product
    ON shopify_product_map(product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_map_shopify_product
    ON shopify_product_map(tenant_id, shopify_product_id);
CREATE INDEX IF NOT EXISTS idx_shopify_product_map_inventory_item
    ON shopify_product_map(tenant_id, shopify_inventory_item_id);

ALTER TABLE shopify_product_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_product_map_select" ON shopify_product_map
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "shopify_product_map_insert" ON shopify_product_map
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "shopify_product_map_update" ON shopify_product_map
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "shopify_product_map_delete" ON shopify_product_map
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ================================================================
-- 2. shopify_location_map — Maps Shopify locations to wh_locations
-- ================================================================

CREATE TABLE IF NOT EXISTS shopify_location_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Shopify side
    shopify_location_id BIGINT NOT NULL,
    shopify_location_name TEXT,

    -- Trackbliss side
    location_id UUID NOT NULL REFERENCES wh_locations(id) ON DELETE CASCADE,

    -- Sync config
    sync_inventory BOOLEAN DEFAULT true,
    sync_orders BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One Shopify location maps to one wh_location per tenant
    UNIQUE(tenant_id, shopify_location_id)
);

CREATE INDEX IF NOT EXISTS idx_shopify_location_map_tenant
    ON shopify_location_map(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_location_map_location
    ON shopify_location_map(location_id);

ALTER TABLE shopify_location_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_location_map_select" ON shopify_location_map
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "shopify_location_map_insert" ON shopify_location_map
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "shopify_location_map_update" ON shopify_location_map
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "shopify_location_map_delete" ON shopify_location_map
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ================================================================
-- 3. shopify_sync_log — Sync history and error log
-- ================================================================

CREATE TABLE IF NOT EXISTS shopify_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    sync_type TEXT NOT NULL CHECK (sync_type IN (
        'products', 'orders', 'inventory', 'fulfillment', 'customers', 'full'
    )),
    direction TEXT NOT NULL CHECK (direction IN ('import', 'export')),
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
        'running', 'completed', 'partial', 'failed'
    )),

    -- Counts
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    created_items INTEGER DEFAULT 0,
    updated_items INTEGER DEFAULT 0,
    skipped_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,

    -- Error details
    errors JSONB DEFAULT '[]'::jsonb,
    -- Array of { shopifyId, message, field? }

    -- Trigger: manual, scheduled, webhook
    trigger TEXT NOT NULL DEFAULT 'manual'
        CHECK (trigger IN ('manual', 'scheduled', 'webhook')),
    triggered_by UUID, -- user ID for manual triggers

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_sync_log_tenant
    ON shopify_sync_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_log_type
    ON shopify_sync_log(tenant_id, sync_type, direction);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_log_status
    ON shopify_sync_log(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_shopify_sync_log_started
    ON shopify_sync_log(started_at DESC);

ALTER TABLE shopify_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopify_sync_log_select" ON shopify_sync_log
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "shopify_sync_log_insert" ON shopify_sync_log
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "shopify_sync_log_update" ON shopify_sync_log
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ================================================================
-- updated_at triggers
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_shopify_product_map_updated_at') THEN
        CREATE TRIGGER set_shopify_product_map_updated_at
            BEFORE UPDATE ON shopify_product_map
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_shopify_location_map_updated_at') THEN
        CREATE TRIGGER set_shopify_location_map_updated_at
            BEFORE UPDATE ON shopify_location_map
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;
```

**Notes on the schema:**
- `shopify_product_id` and `shopify_variant_id` are BIGINT because Shopify IDs are numeric (up to 64-bit).
- `shopify_inventory_item_id` is stored because the Shopify Inventory Levels API uses inventory_item_id, not variant_id. This avoids an extra API call during stock sync.
- `batch_id` is nullable on `shopify_product_map` because a user might map a Shopify variant to a product without specifying a batch (in which case, stock operations would pick the default or active batch).
- The `sync_direction` column allows per-mapping control: import-only (Shopify -> Trackbliss), export-only (Trackbliss -> Shopify), or both.

---

## 3. TypeScript Types

**File:** `src/types/shopify.ts`

```typescript
/**
 * Shopify Integration Types
 *
 * Types for the bidirectional Shopify <-> Trackbliss warehouse sync.
 */

// ============================================
// TENANT SETTINGS
// ============================================

export interface ShopifyIntegrationSettings {
  enabled: boolean;
  shopDomain: string;           // e.g., "my-store.myshopify.com"
  // NOTE: accessToken is stored but NEVER sent to the browser.
  // It is only read server-side by the shopify-sync Edge Function.
  accessToken?: string;
  apiVersion: string;           // e.g., "2024-01"

  // Sync configuration
  syncConfig: ShopifySyncConfig;

  // Connection status
  connectionStatus: 'disconnected' | 'connected' | 'error';
  connectionVerifiedAt?: string;
  lastErrorMessage?: string;
}

export interface ShopifySyncConfig {
  // What to sync
  importOrders: boolean;
  importProducts: boolean;       // Product catalog fetch for mapping UI
  importCustomers: boolean;
  exportStockLevels: boolean;
  exportFulfillments: boolean;

  // Order import settings
  orderStatusFilter: string[];   // e.g., ['open', 'closed'] -- which Shopify order statuses to import
  orderImportSince?: string;     // ISO date -- only import orders after this date
  autoCreateShipments: boolean;  // Automatically create wh_shipments from orders

  // Stock export settings
  stockExportOnChange: boolean;  // Push stock to Shopify when wh_stock_levels change
  stockExportBatchMode: boolean; // Batch multiple changes into one sync

  // Fulfillment export settings
  autoExportFulfillment: boolean; // Automatically create Shopify fulfillment when shipment status = 'shipped'
}

export const DEFAULT_SHOPIFY_SETTINGS: ShopifyIntegrationSettings = {
  enabled: false,
  shopDomain: '',
  apiVersion: '2024-01',
  syncConfig: {
    importOrders: true,
    importProducts: true,
    importCustomers: false,
    exportStockLevels: true,
    exportFulfillments: true,
    orderStatusFilter: ['open'],
    autoCreateShipments: true,
    stockExportOnChange: false,
    stockExportBatchMode: false,
    autoExportFulfillment: true,
  },
  connectionStatus: 'disconnected',
};

// ============================================
// PRODUCT MAP
// ============================================

export type ShopifySyncDirection = 'import_only' | 'export_only' | 'both';

export interface ShopifyProductMap {
  id: string;
  tenantId: string;
  shopifyProductId: number;
  shopifyVariantId: number;
  shopifyProductTitle?: string;
  shopifyVariantTitle?: string;
  shopifySku?: string;
  shopifyInventoryItemId?: number;
  productId: string;
  batchId?: string;
  syncEnabled: boolean;
  syncDirection: ShopifySyncDirection;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  productName?: string;
  batchSerialNumber?: string;
}

export interface ShopifyProductMapInput {
  shopifyProductId: number;
  shopifyVariantId: number;
  shopifyProductTitle?: string;
  shopifyVariantTitle?: string;
  shopifySku?: string;
  shopifyInventoryItemId?: number;
  productId: string;
  batchId?: string;
  syncDirection?: ShopifySyncDirection;
}

// ============================================
// LOCATION MAP
// ============================================

export interface ShopifyLocationMap {
  id: string;
  tenantId: string;
  shopifyLocationId: number;
  shopifyLocationName?: string;
  locationId: string;
  syncInventory: boolean;
  syncOrders: boolean;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  locationName?: string;
  locationCode?: string;
}

export interface ShopifyLocationMapInput {
  shopifyLocationId: number;
  shopifyLocationName?: string;
  locationId: string;
  syncInventory?: boolean;
  syncOrders?: boolean;
  isPrimary?: boolean;
}

// ============================================
// SYNC LOG
// ============================================

export type ShopifySyncType = 'products' | 'orders' | 'inventory' | 'fulfillment' | 'customers' | 'full';
export type ShopifySyncDirection_Log = 'import' | 'export';
export type ShopifySyncStatus = 'running' | 'completed' | 'partial' | 'failed';
export type ShopifySyncTrigger = 'manual' | 'scheduled' | 'webhook';

export interface ShopifySyncError {
  shopifyId?: string | number;
  message: string;
  field?: string;
}

export interface ShopifySyncLog {
  id: string;
  tenantId: string;
  syncType: ShopifySyncType;
  direction: ShopifySyncDirection_Log;
  status: ShopifySyncStatus;
  totalItems: number;
  processedItems: number;
  createdItems: number;
  updatedItems: number;
  skippedItems: number;
  failedItems: number;
  errors: ShopifySyncError[];
  trigger: ShopifySyncTrigger;
  triggeredBy?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

// ============================================
// SHOPIFY API RESPONSE TYPES (subset used in sync)
// ============================================

/** Shopify product as returned by REST Admin API */
export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  status: 'active' | 'archived' | 'draft';
  variants: ShopifyVariant[];
  images: { id: number; src: string }[];
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  sku: string | null;
  price: string;
  inventory_item_id: number;
  inventory_quantity: number;
  barcode: string | null;
}

export interface ShopifyLocation {
  id: number;
  name: string;
  address1: string | null;
  city: string | null;
  country_code: string | null;
  active: boolean;
}

export interface ShopifyOrder {
  id: number;
  name: string;            // "#1001"
  order_number: number;
  email: string | null;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
  line_items: ShopifyLineItem[];
  shipping_address: ShopifyAddress | null;
  customer: ShopifyCustomer | null;
  note: string | null;
  tags: string;
}

export interface ShopifyLineItem {
  id: number;
  variant_id: number | null;
  product_id: number | null;
  title: string;
  quantity: number;
  sku: string | null;
  price: string;
  fulfillable_quantity: number;
}

export interface ShopifyAddress {
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  province: string | null;
  zip: string | null;
  country_code: string | null;
  phone: string | null;
}

export interface ShopifyCustomer {
  id: number;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number | null;
}

export interface ShopifyFulfillment {
  id: number;
  order_id: number;
  status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  tracking_company: string | null;
}

// ============================================
// EDGE FUNCTION REQUEST/RESPONSE
// ============================================

export interface ShopifySyncRequest {
  action:
    | 'test_connection'
    | 'fetch_products'
    | 'fetch_locations'
    | 'sync_orders'
    | 'sync_inventory_import'
    | 'sync_inventory_export'
    | 'create_fulfillment'
    | 'full_sync';
  params?: Record<string, unknown>;
}

export interface ShopifySyncResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  syncLogId?: string;
}
```

**TenantSettings extension** (in `src/types/database.ts`):

Add `shopifyIntegration?: ShopifyIntegrationSettings;` to the `TenantSettings` interface, following the same pattern as `returnsHub`, `supplierPortal`, etc.

---

## 4. Service Layer

### 4a. Client-side service: `src/services/supabase/shopify-integration.ts`

This service handles:
- CRUD for product maps, location maps, and sync logs (direct Supabase queries with RLS)
- Triggering sync operations (calls the `shopify-sync` Edge Function)
- Reading/updating Shopify settings in tenant settings (excluding the access token, which is write-only from the client perspective)

```typescript
/**
 * Shopify Integration Service
 *
 * Client-side service for managing Shopify product/location mappings,
 * sync logs, and triggering sync operations via Edge Function.
 *
 * The Shopify Admin API access token is NEVER exposed to the browser.
 * All Shopify API calls go through the shopify-sync Edge Function.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  ShopifyProductMap,
  ShopifyProductMapInput,
  ShopifyLocationMap,
  ShopifyLocationMapInput,
  ShopifySyncLog,
  ShopifySyncRequest,
  ShopifySyncResponse,
  ShopifyIntegrationSettings,
  ShopifySyncConfig,
} from '@/types/shopify';

// ---- Transform functions (snake_case -> camelCase) ----

function transformProductMap(row: any): ShopifyProductMap { /* ... */ }
function transformLocationMap(row: any): ShopifyLocationMap { /* ... */ }
function transformSyncLog(row: any): ShopifySyncLog { /* ... */ }

// ============================================
// SHOPIFY SETTINGS (stored in tenants.settings)
// ============================================

/**
 * Get Shopify integration settings for the current tenant.
 * NOTE: The accessToken field is EXCLUDED from the response for security.
 */
export async function getShopifySettings(): Promise<ShopifyIntegrationSettings | null> { /* ... */ }

/**
 * Update Shopify settings. If accessToken is provided, it is stored
 * but will not be returned by getShopifySettings().
 */
export async function updateShopifySettings(
  settings: Partial<ShopifyIntegrationSettings>
): Promise<{ success: boolean; error?: string }> { /* ... */ }

/**
 * Save the Shopify access token (write-only operation).
 * Stores it via a dedicated edge function call for added security.
 */
export async function saveShopifyAccessToken(
  shopDomain: string,
  accessToken: string
): Promise<{ success: boolean; error?: string }> { /* ... */ }

/**
 * Update sync configuration only.
 */
export async function updateShopifySyncConfig(
  config: Partial<ShopifySyncConfig>
): Promise<{ success: boolean; error?: string }> { /* ... */ }

/**
 * Disconnect Shopify (remove token + reset settings).
 */
export async function disconnectShopify(): Promise<{ success: boolean; error?: string }> { /* ... */ }

// ============================================
// PRODUCT MAP CRUD
// ============================================

export async function getShopifyProductMaps(): Promise<ShopifyProductMap[]> { /* ... */ }
export async function createShopifyProductMap(input: ShopifyProductMapInput): Promise<ShopifyProductMap> { /* ... */ }
export async function updateShopifyProductMap(id: string, updates: Partial<ShopifyProductMapInput>): Promise<ShopifyProductMap> { /* ... */ }
export async function deleteShopifyProductMap(id: string): Promise<void> { /* ... */ }

// Bulk operations
export async function autoMapByGtin(): Promise<{ mapped: number; skipped: number }> {
  // Calls Edge Function to match Shopify variant barcodes to product GTINs
}

// ============================================
// LOCATION MAP CRUD
// ============================================

export async function getShopifyLocationMaps(): Promise<ShopifyLocationMap[]> { /* ... */ }
export async function createShopifyLocationMap(input: ShopifyLocationMapInput): Promise<ShopifyLocationMap> { /* ... */ }
export async function updateShopifyLocationMap(id: string, updates: Partial<ShopifyLocationMapInput>): Promise<ShopifyLocationMap> { /* ... */ }
export async function deleteShopifyLocationMap(id: string): Promise<void> { /* ... */ }

// ============================================
// SYNC LOG
// ============================================

export async function getShopifySyncLogs(limit?: number): Promise<ShopifySyncLog[]> { /* ... */ }
export async function getLatestSyncLog(syncType?: string): Promise<ShopifySyncLog | null> { /* ... */ }

// ============================================
// SYNC TRIGGER (calls Edge Function)
// ============================================

/**
 * Invoke the shopify-sync Edge Function.
 * All Shopify API calls happen server-side.
 */
async function invokeShopifySync(request: ShopifySyncRequest): Promise<ShopifySyncResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/shopify-sync`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Sync failed');
  }

  return response.json();
}

export async function testShopifyConnection(): Promise<ShopifySyncResponse> {
  return invokeShopifySync({ action: 'test_connection' });
}

export async function fetchShopifyProducts(): Promise<ShopifySyncResponse> {
  return invokeShopifySync({ action: 'fetch_products' });
}

export async function fetchShopifyLocations(): Promise<ShopifySyncResponse> {
  return invokeShopifySync({ action: 'fetch_locations' });
}

export async function syncShopifyOrders(params?: { since?: string }): Promise<ShopifySyncResponse> {
  return invokeShopifySync({ action: 'sync_orders', params });
}

export async function syncInventoryImport(): Promise<ShopifySyncResponse> {
  return invokeShopifySync({ action: 'sync_inventory_import' });
}

export async function syncInventoryExport(): Promise<ShopifySyncResponse> {
  return invokeShopifySync({ action: 'sync_inventory_export' });
}

export async function createShopifyFulfillment(shipmentId: string): Promise<ShopifySyncResponse> {
  return invokeShopifySync({ action: 'create_fulfillment', params: { shipmentId } });
}

export async function runFullSync(): Promise<ShopifySyncResponse> {
  return invokeShopifySync({ action: 'full_sync' });
}
```

### 4b. Barrel export addition to `src/services/supabase/index.ts`

```typescript
// Shopify Integration
export {
  getShopifySettings,
  updateShopifySettings,
  saveShopifyAccessToken,
  updateShopifySyncConfig,
  disconnectShopify,
  getShopifyProductMaps,
  createShopifyProductMap,
  updateShopifyProductMap,
  deleteShopifyProductMap,
  autoMapByGtin,
  getShopifyLocationMaps,
  createShopifyLocationMap,
  updateShopifyLocationMap,
  deleteShopifyLocationMap,
  getShopifySyncLogs,
  getLatestSyncLog,
  testShopifyConnection,
  fetchShopifyProducts,
  fetchShopifyLocations,
  syncShopifyOrders,
  syncInventoryImport,
  syncInventoryExport,
  createShopifyFulfillment,
  runFullSync,
} from './shopify-integration';
```

---

## 5. Edge Function: `shopify-sync`

**File:** `supabase/functions/shopify-sync/index.ts`

This is the core server-side function that:
- Reads the Shopify access token from tenant settings (service role, bypasses RLS)
- Makes authenticated REST Admin API calls to Shopify
- Performs sync operations and writes results back to Trackbliss tables

**Structure:**

```typescript
/**
 * Supabase Edge Function: shopify-sync
 *
 * Handles all Shopify REST Admin API interactions server-side.
 * The Shopify access token is NEVER exposed to the browser.
 *
 * Deployment:
 *   supabase functions deploy shopify-sync
 *
 * Required Supabase Secrets:
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 *
 * The Shopify access token is read from tenants.settings at runtime.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---- Shopify REST Admin API helper ----

async function shopifyFetch(
  shopDomain: string,
  accessToken: string,
  apiVersion: string,
  endpoint: string,
  options?: { method?: string; body?: unknown }
) {
  const url = `https://${shopDomain}/admin/api/${apiVersion}/${endpoint}`;
  const resp = await fetch(url, {
    method: options?.method || 'GET',
    headers: {
      'X-Shopify-Access-Token': accessToken,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Shopify API ${resp.status}: ${err}`);
  }

  return resp.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT and get tenant
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return errorResponse('Missing authorization', 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return errorResponse('Unauthorized', 401);

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.tenant_id) return errorResponse('No tenant', 403);
    const tenantId = profile.tenant_id;

    // 2. Check billing: warehouseCarrierIntegrations > 0
    // (Integration counts as a carrier integration)
    const { data: moduleSubs } = await supabase
      .from('billing_module_subscriptions')
      .select('module_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    const activeModules = (moduleSubs || []).map(m => m.module_id);
    const hasWarehouse = activeModules.some(m =>
      ['warehouse_professional', 'warehouse_business'].includes(m)
    );

    if (!hasWarehouse) {
      return errorResponse('Warehouse Professional or higher required for Shopify integration', 403);
    }

    // 3. Load Shopify settings (including the access token, service role)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenantId)
      .single();

    const shopifySettings = tenant?.settings?.shopifyIntegration;
    if (!shopifySettings?.enabled || !shopifySettings?.accessToken || !shopifySettings?.shopDomain) {
      return errorResponse('Shopify integration not configured', 400);
    }

    const { shopDomain, accessToken, apiVersion } = shopifySettings;

    // 4. Parse request and dispatch
    const { action, params = {} } = await req.json();

    switch (action) {
      case 'test_connection':
        return await handleTestConnection(shopDomain, accessToken, apiVersion, supabase, tenantId);

      case 'fetch_products':
        return await handleFetchProducts(shopDomain, accessToken, apiVersion);

      case 'fetch_locations':
        return await handleFetchLocations(shopDomain, accessToken, apiVersion);

      case 'sync_orders':
        return await handleSyncOrders(shopDomain, accessToken, apiVersion, supabase, tenantId, params, user.id);

      case 'sync_inventory_import':
        return await handleInventoryImport(shopDomain, accessToken, apiVersion, supabase, tenantId, user.id);

      case 'sync_inventory_export':
        return await handleInventoryExport(shopDomain, accessToken, apiVersion, supabase, tenantId, user.id);

      case 'create_fulfillment':
        return await handleCreateFulfillment(shopDomain, accessToken, apiVersion, supabase, tenantId, params);

      case 'full_sync':
        return await handleFullSync(shopDomain, accessToken, apiVersion, supabase, tenantId, user.id);

      case 'save_token':
        return await handleSaveToken(supabase, tenantId, params);

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (err) {
    console.error('shopify-sync error:', err);
    return errorResponse(String(err), 500);
  }
});
```

**Key handler implementations:**

### `handleTestConnection`
Calls `GET /admin/api/2024-01/shop.json` to verify the token is valid and return the shop name.

### `handleFetchProducts`
Calls `GET /admin/api/2024-01/products.json?limit=250&fields=id,title,handle,variants,images,status` with pagination via `page_info`. Returns the product list for the mapping UI. Does NOT write to DB -- just returns data for the client.

### `handleFetchLocations`
Calls `GET /admin/api/2024-01/locations.json` and returns for the mapping UI.

### `handleSyncOrders`
1. Creates a `shopify_sync_log` entry with status `running`.
2. Fetches orders from Shopify: `GET /admin/api/2024-01/orders.json?status=open&created_at_min={since}&limit=250`.
3. For each order:
   a. Check if a `wh_shipment` with `order_reference = Shopify #{order.name}` already exists (idempotency).
   b. If not, create a `wh_shipment` (status `draft`) with address from `order.shipping_address`.
   c. For each line item with a mapped variant (lookup `shopify_product_map`), create a `wh_shipment_item`.
   d. If the order customer exists, optionally create/update a `wh_contact`.
4. Updates the `shopify_sync_log` with counts and status `completed` or `partial`.

### `handleInventoryImport`
1. Creates sync log.
2. For each entry in `shopify_location_map` where `sync_inventory = true`:
   a. Fetch `GET /admin/api/2024-01/inventory_levels.json?location_ids={shopifyLocationId}&limit=250`.
   b. For each inventory level, look up the `shopify_product_map` by `shopify_inventory_item_id`.
   c. If mapped, compare with `wh_stock_levels` for that (location, batch) and update if different.
3. Updates sync log.

### `handleInventoryExport`
1. Creates sync log.
2. For each entry in `shopify_location_map` where `sync_inventory = true`:
   a. For each `shopify_product_map` that links to that location (via stock levels):
      - Read `wh_stock_levels.quantity_available`.
      - Call `POST /admin/api/2024-01/inventory_levels/set.json` with `{ location_id, inventory_item_id, available }`.
3. Updates sync log.

### `handleCreateFulfillment`
1. Load the shipment by ID.
2. Find the Shopify order ID from `order_reference` (parse "Shopify #1001" -> look up the order).
3. Load shipment items and map back to Shopify line item IDs via `shopify_product_map`.
4. Call `POST /admin/api/2024-01/orders/{orderId}/fulfillments.json` with:
   ```json
   {
     "fulfillment": {
       "tracking_number": shipment.trackingNumber,
       "tracking_company": shipment.carrier,
       "line_items": [{ "id": lineItemId, "quantity": qty }]
     }
   }
   ```
5. Update sync log.

### `handleSaveToken`
A special action that writes the access token to `tenants.settings.shopifyIntegration.accessToken` using service role (bypasses RLS). This ensures the token is never in the browser network tab for GET requests.

---

## 6. Edge Function: `shopify-webhook` (v2 -- future)

**File:** `supabase/functions/shopify-webhook/index.ts`

This is marked as v2 because it requires a public URL and Shopify app configuration. For v1, polling-based sync is used. The webhook function would:

1. Verify the `X-Shopify-Hmac-Sha256` header against the shared secret.
2. Route by topic: `orders/create`, `orders/updated`, `inventory_levels/update`, `products/update`.
3. Process each event similar to the sync handlers but for a single resource.

This is documented here for completeness but NOT part of the v1 implementation scope.

---

## 7. Integration Hook: Fulfillment Auto-Export

When `autoExportFulfillment` is enabled in sync config, the `updateShipmentStatus` function in `src/services/supabase/wh-shipments.ts` should be extended at line 277 (after setting `shipped_at`) to fire-and-forget a call to `createShopifyFulfillment`:

```typescript
// In updateShipmentStatus, after the 'shipped' block:
if (status === 'shipped') {
  // Existing shipped_at and stock logic...

  // Auto-export fulfillment to Shopify (fire-and-forget)
  if (shipment.orderReference?.startsWith('Shopify #')) {
    import('./shopify-integration').then(({ createShopifyFulfillment }) => {
      createShopifyFulfillment(id).catch(err =>
        console.error('Shopify fulfillment export failed:', err)
      );
    });
  }
}
```

This follows the exact same dynamic `import()` pattern used for billing checks and workflow engine calls throughout the codebase.

---

## 8. UI Components and Pages

### 8a. Shopify Integration Page

**File:** `src/pages/warehouse/ShopifyIntegrationPage.tsx`

Tabbed page accessible from the warehouse settings or sidebar. Tabs:

1. **Connection** -- Setup tab
   - Shop domain input field
   - Access token input (password field, write-only)
   - "Test Connection" button
   - Connection status badge (connected/disconnected/error)
   - "Disconnect" button (with confirmation dialog)

2. **Product Mapping** -- Map Shopify products to Trackbliss products
   - Split-pane view: Left = Shopify products (fetched on demand), Right = Trackbliss products
   - "Auto-Map by GTIN" button (matches Shopify variant barcode to product GTIN)
   - Manual mapping: select Shopify variant, select Trackbliss product+batch, click "Link"
   - Table of current mappings with edit/delete
   - Sync direction toggle per mapping

3. **Location Mapping** -- Map Shopify locations to warehouse locations
   - "Fetch Locations" button to load from Shopify
   - Dropdown selection: Shopify location -> Trackbliss wh_location
   - Toggle: sync inventory, sync orders
   - Primary location marker

4. **Sync Configuration** -- What and how to sync
   - Checkboxes: Import orders, Import customers, Export stock, Export fulfillments
   - Order status filter (multi-select)
   - Auto-create shipments toggle
   - Auto-export fulfillment toggle

5. **Sync Dashboard** -- Monitoring
   - Last sync time per sync type (orders, inventory, fulfillment)
   - Manual sync buttons: "Sync Orders Now", "Push Stock Now", "Pull Inventory Now", "Full Sync"
   - Sync log table: date, type, direction, status, counts, errors expandable
   - Running sync indicator

### 8b. Component Files

| File | Purpose |
|------|---------|
| `src/components/warehouse/shopify/ShopifyConnectionCard.tsx` | Connection setup form |
| `src/components/warehouse/shopify/ShopifyProductMappingTable.tsx` | Product mapping CRUD table |
| `src/components/warehouse/shopify/ShopifyProductPicker.tsx` | Fetches and displays Shopify products for selection |
| `src/components/warehouse/shopify/ShopifyLocationMappingTable.tsx` | Location mapping CRUD |
| `src/components/warehouse/shopify/ShopifySyncConfigCard.tsx` | Sync configuration form |
| `src/components/warehouse/shopify/ShopifySyncDashboard.tsx` | Sync status and manual triggers |
| `src/components/warehouse/shopify/ShopifySyncLogTable.tsx` | Sync history with error details |
| `src/components/warehouse/shopify/ShopifyAutoMapDialog.tsx` | Auto-map by GTIN dialog with results |

### 8c. Route Addition in `App.tsx`

```typescript
const ShopifyIntegrationPage = lazy(() =>
  import('@/pages/warehouse/ShopifyIntegrationPage')
    .then(m => ({ default: m.ShopifyIntegrationPage }))
);

// Under the warehouse route group:
<Route path="warehouse/integrations/shopify" element={<ShopifyIntegrationPage />} />
```

### 8d. Sidebar Navigation

Add a "Shopify" link under the Warehouse section in the sidebar, gated behind `warehouseCarrierIntegrations > 0` (Warehouse Professional tier or higher). Use a Shopify bag icon or the existing `ShoppingBag` from Lucide.

---

## 9. Translation Keys

**File additions to `public/locales/en/warehouse.json`:**

```json
{
  "Shopify Integration": "Shopify Integration",
  "Connect your Shopify store": "Connect your Shopify store to sync orders, inventory, and fulfillments",
  "Connection": "Connection",
  "Product Mapping": "Product Mapping",
  "Location Mapping": "Location Mapping",
  "Sync Configuration": "Sync Configuration",
  "Sync Dashboard": "Sync Dashboard",

  "Shop Domain": "Shop Domain",
  "shop-domain-help": "Your myshopify.com domain (e.g., my-store.myshopify.com)",
  "Access Token": "Access Token",
  "access-token-help": "Admin API access token from your Shopify Custom App",
  "Test Connection": "Test Connection",
  "Connection successful": "Connection successful",
  "Connected to {{shopName}}": "Connected to {{shopName}}",
  "Connection failed": "Connection failed",
  "Disconnect": "Disconnect",
  "Disconnect Shopify": "Disconnect Shopify",
  "disconnect-confirm": "This will remove the Shopify connection and all mappings. Are you sure?",

  "Shopify Product": "Shopify Product",
  "Shopify Variant": "Shopify Variant",
  "Shopify SKU": "Shopify SKU",
  "Trackbliss Product": "Trackbliss Product",
  "Trackbliss Batch": "Trackbliss Batch",
  "Sync Direction": "Sync Direction",
  "import_only": "Import Only (Shopify -> Trackbliss)",
  "export_only": "Export Only (Trackbliss -> Shopify)",
  "both": "Bidirectional",
  "Auto-Map by GTIN": "Auto-Map by GTIN",
  "auto-map-description": "Automatically match Shopify variant barcodes to Trackbliss product GTINs",
  "{{count}} products mapped": "{{count}} products mapped",
  "{{count}} products skipped": "{{count}} products skipped (no matching GTIN)",
  "Link Products": "Link Products",
  "Unlink": "Unlink",
  "No mappings yet": "No product mappings configured yet",

  "Shopify Location": "Shopify Location",
  "Trackbliss Location": "Trackbliss Location",
  "Sync Inventory": "Sync Inventory",
  "Sync Orders": "Sync Orders",
  "Primary Location": "Primary Location",
  "Fetch Locations": "Fetch Locations",
  "No locations mapped": "No locations mapped yet",

  "Import Orders": "Import Orders",
  "Import Customers": "Import Customers",
  "Export Stock Levels": "Export Stock Levels",
  "Export Fulfillments": "Export Fulfillments",
  "Order Status Filter": "Order Status Filter",
  "Auto-Create Shipments": "Auto-Create Shipments",
  "auto-create-help": "Automatically create warehouse shipments when Shopify orders are imported",
  "Auto-Export Fulfillment": "Auto-Export Fulfillment",
  "auto-fulfill-help": "Automatically notify Shopify when a shipment is marked as shipped",

  "Sync Now": "Sync Now",
  "Sync Orders Now": "Sync Orders Now",
  "Push Stock Now": "Push Stock to Shopify",
  "Pull Inventory Now": "Pull Inventory from Shopify",
  "Full Sync": "Full Sync",
  "Last Sync": "Last Sync",
  "Never synced": "Never synced",
  "Sync in progress": "Sync in progress...",
  "Sync completed": "Sync completed",
  "Sync failed": "Sync failed",

  "Sync Log": "Sync Log",
  "Type": "Type",
  "Direction": "Direction",
  "Status": "Status",
  "Processed": "Processed",
  "Created": "Created",
  "Updated": "Updated",
  "Skipped": "Skipped",
  "Failed": "Failed",
  "Errors": "Errors",
  "import": "Import",
  "export": "Export",
  "products": "Products",
  "orders": "Orders",
  "inventory": "Inventory",
  "fulfillment": "Fulfillment",
  "customers": "Customers",
  "full": "Full Sync",
  "running": "Running",
  "completed": "Completed",
  "partial": "Partial",
  "failed": "Failed",
  "manual": "Manual",
  "scheduled": "Scheduled",
  "webhook": "Webhook",
  "No sync history": "No sync history yet",

  "Shopify": "Shopify",
  "Integrations": "Integrations",
  "Warehouse Professional required": "Warehouse Professional or higher required for Shopify integration"
}
```

**File additions to `public/locales/de/warehouse.json`:**

```json
{
  "Shopify Integration": "Shopify-Integration",
  "Connect your Shopify store": "Verbinden Sie Ihren Shopify-Shop um Bestellungen, Bestand und Versand zu synchronisieren",
  "Connection": "Verbindung",
  "Product Mapping": "Produktzuordnung",
  "Location Mapping": "Lagerzuordnung",
  "Sync Configuration": "Synchronisierung",
  "Sync Dashboard": "Sync-Dashboard",

  "Shop Domain": "Shop-Domain",
  "shop-domain-help": "Ihre myshopify.com-Domain (z.B. mein-shop.myshopify.com)",
  "Access Token": "Zugriffstoken",
  "access-token-help": "Admin API Zugriffstoken aus Ihrer Shopify Custom App",
  "Test Connection": "Verbindung testen",
  "Connection successful": "Verbindung erfolgreich",
  "Connected to {{shopName}}": "Verbunden mit {{shopName}}",
  "Connection failed": "Verbindung fehlgeschlagen",
  "Disconnect": "Trennen",
  "Disconnect Shopify": "Shopify trennen",
  "disconnect-confirm": "Dies entfernt die Shopify-Verbindung und alle Zuordnungen. Sind Sie sicher?",

  "Shopify Product": "Shopify-Produkt",
  "Shopify Variant": "Shopify-Variante",
  "Shopify SKU": "Shopify-SKU",
  "Trackbliss Product": "Trackbliss-Produkt",
  "Trackbliss Batch": "Trackbliss-Charge",
  "Sync Direction": "Sync-Richtung",
  "import_only": "Nur Import (Shopify -> Trackbliss)",
  "export_only": "Nur Export (Trackbliss -> Shopify)",
  "both": "Bidirektional",
  "Auto-Map by GTIN": "Automatisch nach GTIN zuordnen",
  "auto-map-description": "Shopify-Varianten-Barcodes automatisch mit Trackbliss-Produkt-GTINs abgleichen",
  "{{count}} products mapped": "{{count}} Produkte zugeordnet",
  "{{count}} products skipped": "{{count}} Produkte übersprungen (keine passende GTIN)",
  "Link Products": "Produkte verknüpfen",
  "Unlink": "Verknüpfung aufheben",
  "No mappings yet": "Noch keine Produktzuordnungen konfiguriert",

  "Shopify Location": "Shopify-Standort",
  "Trackbliss Location": "Trackbliss-Lager",
  "Sync Inventory": "Bestand synchronisieren",
  "Sync Orders": "Bestellungen synchronisieren",
  "Primary Location": "Hauptstandort",
  "Fetch Locations": "Standorte abrufen",
  "No locations mapped": "Noch keine Standorte zugeordnet",

  "Import Orders": "Bestellungen importieren",
  "Import Customers": "Kunden importieren",
  "Export Stock Levels": "Bestände exportieren",
  "Export Fulfillments": "Versand exportieren",
  "Order Status Filter": "Bestellstatus-Filter",
  "Auto-Create Shipments": "Sendungen automatisch erstellen",
  "auto-create-help": "Automatisch Lagersendungen erstellen wenn Shopify-Bestellungen importiert werden",
  "Auto-Export Fulfillment": "Versand automatisch exportieren",
  "auto-fulfill-help": "Shopify automatisch benachrichtigen wenn eine Sendung als versendet markiert wird",

  "Sync Now": "Jetzt synchronisieren",
  "Sync Orders Now": "Bestellungen jetzt synchronisieren",
  "Push Stock Now": "Bestand zu Shopify senden",
  "Pull Inventory Now": "Bestand von Shopify abrufen",
  "Full Sync": "Vollständige Synchronisierung",
  "Last Sync": "Letzte Synchronisierung",
  "Never synced": "Nie synchronisiert",
  "Sync in progress": "Synchronisierung läuft...",
  "Sync completed": "Synchronisierung abgeschlossen",
  "Sync failed": "Synchronisierung fehlgeschlagen",

  "Sync Log": "Sync-Protokoll",
  "Type": "Typ",
  "Direction": "Richtung",
  "Status": "Status",
  "Processed": "Verarbeitet",
  "Created": "Erstellt",
  "Updated": "Aktualisiert",
  "Skipped": "Übersprungen",
  "Failed": "Fehlgeschlagen",
  "Errors": "Fehler",
  "import": "Import",
  "export": "Export",
  "products": "Produkte",
  "orders": "Bestellungen",
  "inventory": "Bestand",
  "fulfillment": "Versand",
  "customers": "Kunden",
  "full": "Vollsync",
  "running": "Läuft",
  "completed": "Abgeschlossen",
  "partial": "Teilweise",
  "failed": "Fehlgeschlagen",
  "manual": "Manuell",
  "scheduled": "Geplant",
  "webhook": "Webhook",
  "No sync history": "Noch keine Sync-Historie",

  "Shopify": "Shopify",
  "Integrations": "Integrationen",
  "Warehouse Professional required": "Warehouse Professional oder höher erforderlich für Shopify-Integration"
}
```

---

## 10. Implementation Order with Dependencies

### Phase 1: Foundation (no UI needed)

| Step | File(s) | Dependencies | Effort |
|------|---------|-------------|--------|
| 1.1 | `src/types/shopify.ts` | None | Types definition |
| 1.2 | `src/types/database.ts` | 1.1 | Add `shopifyIntegration` to `TenantSettings` |
| 1.3 | `supabase/migrations/20260228_shopify_integration.sql` | None | Run migration |
| 1.4 | Translation files (EN + DE) | None | Add keys to `warehouse.json` |

### Phase 2: Edge Function

| Step | File(s) | Dependencies | Effort |
|------|---------|-------------|--------|
| 2.1 | `supabase/functions/shopify-sync/index.ts` | 1.3 | Core edge function with all handlers |
| 2.2 | Deploy edge function | 2.1 | `supabase functions deploy shopify-sync` |

### Phase 3: Service Layer

| Step | File(s) | Dependencies | Effort |
|------|---------|-------------|--------|
| 3.1 | `src/services/supabase/shopify-integration.ts` | 1.1, 1.3, 2.1 | Client service with all CRUD + sync triggers |
| 3.2 | `src/services/supabase/index.ts` | 3.1 | Add barrel exports |

### Phase 4: UI - Connection & Configuration

| Step | File(s) | Dependencies | Effort |
|------|---------|-------------|--------|
| 4.1 | `src/components/warehouse/shopify/ShopifyConnectionCard.tsx` | 3.1 | Connection setup |
| 4.2 | `src/components/warehouse/shopify/ShopifySyncConfigCard.tsx` | 3.1 | Sync config form |
| 4.3 | `src/pages/warehouse/ShopifyIntegrationPage.tsx` | 4.1, 4.2 | Main page shell with tabs |
| 4.4 | `src/App.tsx` | 4.3 | Add route |

### Phase 5: UI - Mapping

| Step | File(s) | Dependencies | Effort |
|------|---------|-------------|--------|
| 5.1 | `src/components/warehouse/shopify/ShopifyProductPicker.tsx` | 3.1 | Fetch + display Shopify products |
| 5.2 | `src/components/warehouse/shopify/ShopifyProductMappingTable.tsx` | 5.1 | Product mapping CRUD |
| 5.3 | `src/components/warehouse/shopify/ShopifyAutoMapDialog.tsx` | 3.1 | Auto-map by GTIN dialog |
| 5.4 | `src/components/warehouse/shopify/ShopifyLocationMappingTable.tsx` | 3.1 | Location mapping CRUD |

### Phase 6: UI - Sync Dashboard

| Step | File(s) | Dependencies | Effort |
|------|---------|-------------|--------|
| 6.1 | `src/components/warehouse/shopify/ShopifySyncLogTable.tsx` | 3.1 | Sync history table |
| 6.2 | `src/components/warehouse/shopify/ShopifySyncDashboard.tsx` | 6.1 | Dashboard with triggers |

### Phase 7: Integration Hook

| Step | File(s) | Dependencies | Effort |
|------|---------|-------------|--------|
| 7.1 | `src/services/supabase/wh-shipments.ts` | 3.1 | Add auto-fulfillment export on `shipped` |

### Phase 8 (v2, future): Webhooks

| Step | File(s) | Dependencies | Effort |
|------|---------|-------------|--------|
| 8.1 | `supabase/functions/shopify-webhook/index.ts` | All above | Webhook receiver |
| 8.2 | Shopify App registration | 8.1 | Register webhook URLs |

---

## 11. Key Design Decisions and Trade-offs

**1. REST Admin API over GraphQL:** The Shopify REST Admin API is simpler to implement in Deno Edge Functions (no GraphQL client library needed). For the data volumes involved (product catalog, orders, inventory), REST pagination is sufficient. GraphQL can be considered for v2 if query complexity grows.

**2. Edge Function for all Shopify calls:** The Shopify access token must never be exposed to the browser. By routing ALL Shopify API calls through the `shopify-sync` Edge Function, the token is only read server-side with the service role key. The client only sends the user's JWT.

**3. Polling over webhooks for v1:** Webhooks require a public URL and Shopify app registration. Since the integration uses a Custom App approach (not an OAuth install flow), the webhook setup is simpler but still requires SSL verification and HMAC validation. Polling via manual triggers is sufficient for v1 and can be augmented with scheduled cron calls.

**4. Idempotency via Shopify IDs:** Every `shopify_product_map` entry uses `shopify_variant_id` as the unique key. Orders are deduplicated by checking `wh_shipments.order_reference` for the Shopify order name (e.g., "Shopify #1001"). Inventory exports use `POST /inventory_levels/set.json` which is idempotent (sets absolute quantity, not delta).

**5. Conflict resolution:** Trackbliss is the source of truth for stock levels because the warehouse module manages reservations, damaged stock, quarantine, etc. Shopify only sees the `quantity_available`. For orders, Shopify is the source of truth because orders originate there.

**6. Billing gate:** The integration requires `warehouse_professional` or higher because `warehouseCarrierIntegrations >= 3` is only available at that tier. This is checked both in the Edge Function (server-side) and in the UI (client-side via `useBilling()`).

**7. Access token storage:** The token is stored in `tenants.settings.shopifyIntegration.accessToken`. While Supabase encrypts data at rest, the token is readable by anyone with service role access. For production hardening, consider migrating to Supabase Vault (secrets management) in a future iteration.

---

## 12. Potential Challenges

1. **Shopify API rate limits:** The REST Admin API has a leaky bucket rate limit of 40 requests per app per store. The `shopify-sync` function should implement retry logic with `Retry-After` header parsing and exponential backoff. For large catalogs, paginate with `page_info` cursor.

2. **Stock level consistency:** When both Shopify and Trackbliss can modify stock, race conditions are possible. The "Trackbliss is source of truth" policy means exports always overwrite Shopify. For import, the user should explicitly trigger a reconciliation rather than auto-import.

3. **Variant-to-batch mapping complexity:** Shopify variants map cleanly to product+variant, but Trackbliss has the product->batch->stock hierarchy. The mapping UI needs to handle the case where a Shopify variant maps to a product with multiple batches (user must choose which batch, or the system uses the "active" batch).

4. **Edge Function cold starts:** The first invocation of `shopify-sync` after deployment has a cold start. For sync operations that process many items, the Edge Function timeout (default 150s, max 300s) may be a concern for full syncs. Consider chunking large syncs.

5. **Order line item matching:** When a Shopify order contains line items for variants that are not mapped, those items should be logged in the sync log as warnings but the order should still be created (with partial items).

---

### Critical Files for Implementation
- `C:\Users\luca\projects\app_dpp\src\services\supabase\wh-shipments.ts` - Core file to extend with auto-fulfillment export hook on shipment status change to 'shipped'
- `C:\Users\luca\projects\app_dpp\src\types\database.ts` - Must add `shopifyIntegration` to the `TenantSettings` interface (line 241)
- `C:\Users\luca\projects\app_dpp\supabase\functions\stripe-webhook\index.ts` - Reference pattern for Edge Function structure (Deno, CORS, JWT auth, service role client)
- `C:\Users\luca\projects\app_dpp\src\services\supabase\wh-stock.ts` - Stock level operations that inventory sync must integrate with (createGoodsReceipt, createStockAdjustment patterns)
- `C:\Users\luca\projects\app_dpp\src\services\supabase\index.ts` - Barrel export file where new Shopify service exports must be added