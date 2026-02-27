/**
 * Shopify Integration Types
 *
 * Types for bidirectional Shopify sync:
 * - Integration settings (stored in tenants.settings.shopifyIntegration)
 * - Product & location mapping entities
 * - Sync log entries
 * - Shopify Admin API response types
 * - Edge Function request/response types
 */

// ============================================
// INTEGRATION SETTINGS (tenants.settings)
// ============================================

export interface ShopifySyncConfig {
  importOrders: boolean;
  importCustomers: boolean;
  exportStockLevels: boolean;
  exportFulfillments: boolean;
  autoCreateShipments: boolean;
  autoExportFulfillment: boolean;
  /** Only import orders matching these financial statuses */
  orderStatusFilter: ShopifyOrderFinancialStatus[];
}

export type ShopifyOrderFinancialStatus =
  | 'authorized'
  | 'pending'
  | 'paid'
  | 'partially_paid'
  | 'refunded'
  | 'voided'
  | 'partially_refunded'
  | 'unpaid';

export interface ShopifyIntegrationSettings {
  enabled: boolean;
  shopDomain: string; // e.g. "mystore.myshopify.com"
  /** Never sent to the client — server-only via service role */
  accessToken?: string;
  apiVersion: string; // e.g. "2024-10"
  shopName?: string;
  syncConfig: ShopifySyncConfig;
  connectedAt?: string;
}

export const DEFAULT_SHOPIFY_SYNC_CONFIG: ShopifySyncConfig = {
  importOrders: true,
  importCustomers: false,
  exportStockLevels: true,
  exportFulfillments: true,
  autoCreateShipments: true,
  autoExportFulfillment: true,
  orderStatusFilter: ['paid'],
};

export const DEFAULT_SHOPIFY_SETTINGS: ShopifyIntegrationSettings = {
  enabled: false,
  shopDomain: '',
  apiVersion: '2024-10',
  syncConfig: DEFAULT_SHOPIFY_SYNC_CONFIG,
};

// ============================================
// DB ENTITIES — MAPPING TABLES
// ============================================

export type ShopifySyncDirection = 'import_only' | 'export_only' | 'both';

export interface ShopifyProductMap {
  id: string;
  tenantId: string;
  shopifyProductId: number;
  shopifyVariantId: number;
  shopifyInventoryItemId?: number;
  shopifyProductTitle?: string;
  shopifyVariantTitle?: string;
  shopifySku?: string;
  shopifyBarcode?: string;
  productId: string;
  batchId?: string;
  syncDirection: ShopifySyncDirection;
  isActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  productName?: string;
  batchSerialNumber?: string;
}

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
  // Joined
  locationName?: string;
  locationCode?: string;
}

export type ShopifySyncType = 'products' | 'orders' | 'inventory' | 'fulfillment' | 'customers' | 'full';
export type ShopifySyncDirection2 = 'import' | 'export';
export type ShopifySyncStatus = 'running' | 'completed' | 'partial' | 'failed';
export type ShopifySyncTrigger = 'manual' | 'scheduled' | 'webhook';

export interface ShopifySyncLog {
  id: string;
  tenantId: string;
  syncType: ShopifySyncType;
  direction: ShopifySyncDirection2;
  status: ShopifySyncStatus;
  totalCount: number;
  processedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: ShopifySyncError[];
  triggerType: ShopifySyncTrigger;
  triggeredBy?: string;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

export interface ShopifySyncError {
  entity?: string;
  shopifyId?: number;
  message: string;
  details?: string;
}

// ============================================
// SHOPIFY ADMIN API RESPONSE TYPES
// ============================================

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  handle: string;
  status: 'active' | 'archived' | 'draft';
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  image?: ShopifyImage;
}

export interface ShopifyVariant {
  id: number;
  product_id: number;
  title: string;
  sku?: string;
  barcode?: string;
  price: string;
  inventory_item_id: number;
  inventory_quantity?: number;
  option1?: string;
  option2?: string;
  option3?: string;
}

export interface ShopifyImage {
  id: number;
  src: string;
  alt?: string;
}

export interface ShopifyLocation {
  id: number;
  name: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  active: boolean;
  legacy: boolean;
}

export interface ShopifyOrder {
  id: number;
  name: string; // "#1001"
  order_number: number;
  email?: string;
  financial_status: ShopifyOrderFinancialStatus;
  fulfillment_status: 'fulfilled' | 'partial' | null;
  created_at: string;
  updated_at: string;
  total_price: string;
  currency: string;
  line_items: ShopifyLineItem[];
  shipping_address?: ShopifyAddress;
  billing_address?: ShopifyAddress;
  customer?: ShopifyCustomer;
  note?: string;
  tags?: string;
}

export interface ShopifyLineItem {
  id: number;
  variant_id: number;
  product_id: number;
  title: string;
  variant_title?: string;
  sku?: string;
  quantity: number;
  price: string;
  fulfillable_quantity: number;
  fulfillment_status: 'fulfilled' | 'partial' | null;
}

export interface ShopifyAddress {
  first_name?: string;
  last_name?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  country?: string;
  zip?: string;
  phone?: string;
  name?: string;
  country_code?: string;
}

export interface ShopifyCustomer {
  id: number;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  orders_count: number;
  total_spent: string;
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number | null;
  updated_at: string;
}

export interface ShopifyFulfillment {
  id: number;
  order_id: number;
  status: 'success' | 'cancelled' | 'error' | 'failure';
  tracking_number?: string;
  tracking_url?: string;
  tracking_company?: string;
  line_items: ShopifyLineItem[];
}

// ============================================
// EDGE FUNCTION REQUEST / RESPONSE
// ============================================

export type ShopifySyncAction =
  | 'test_connection'
  | 'fetch_products'
  | 'fetch_locations'
  | 'sync_orders'
  | 'sync_inventory_import'
  | 'sync_inventory_export'
  | 'create_fulfillment'
  | 'save_token';

export interface ShopifySyncRequest {
  action: ShopifySyncAction;
  params?: Record<string, unknown>;
}

export interface ShopifySyncResponse {
  success: boolean;
  data?: unknown;
  syncLog?: ShopifySyncLog;
  error?: string;
}

// ============================================
// AUTO-MAP RESULT
// ============================================

export interface AutoMapResult {
  mapped: number;
  skipped: number;
  details: AutoMapDetail[];
}

export interface AutoMapDetail {
  shopifyVariantId: number;
  shopifyProductTitle: string;
  shopifyVariantTitle: string;
  shopifyBarcode?: string;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedBatchId?: string;
  status: 'mapped' | 'skipped_no_match' | 'skipped_already_mapped';
}
