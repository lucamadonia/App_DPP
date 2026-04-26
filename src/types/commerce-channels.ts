/**
 * Commerce Hub — Multi-Channel Sales Tracking Types
 *
 * Unifies orders from Shopify, Etsy, Pinterest, Amazon, eBay, WooCommerce, TikTok Shop
 * into a single domain model that links to the Trackbliss DPP system.
 */

// ============================================
// PLATFORM REGISTRY
// ============================================

export type CommercePlatform =
  | 'shopify'
  | 'etsy'
  | 'pinterest'
  | 'amazon'
  | 'ebay'
  | 'woocommerce'
  | 'tiktok_shop'
  | 'manual'
  | 'custom_api';

export type CommerceConnectionStatus =
  | 'pending'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'disconnected'
  | 'reauth_required';

/** Auth flow each platform supports out of the box. */
export type CommerceAuthMethod = 'oauth2' | 'api_key' | 'access_token' | 'manual';

export interface CommercePlatformDescriptor {
  id: CommercePlatform;
  /** Public-facing display name */
  label: string;
  /** SVG path string or remote URL — preferred for sharp display on TV mode */
  iconUrl: string;
  /** Brand color hex used as accent */
  brandColor: string;
  /** Subtle gradient pair used for cards (from / to). */
  gradient: [string, string];
  /** Auth flow */
  authMethod: CommerceAuthMethod;
  /** True if this platform is fully implemented (vs scaffolded but coming soon). */
  available: boolean;
  /** Short marketing description rendered on the connection card. */
  blurb: string;
  /** Capability summary for the picker UI. */
  capabilities: {
    orders: boolean;
    products: boolean;
    inventory: boolean;
    fulfillment: boolean;
    refunds: boolean;
  };
  /** OAuth scopes / API permissions required (for legal/transparency). */
  scopesRequired: string[];
  docsUrl?: string;
}

// ============================================
// CONNECTION ENTITY
// ============================================

export interface CommerceChannelConnection {
  id: string;
  tenantId: string;
  platform: CommercePlatform;
  status: CommerceConnectionStatus;

  accountLabel: string;
  accountUrl?: string;
  accountExternalId?: string;
  accountCurrency: string;
  accountCountry?: string;
  iconColor?: string;

  canReadOrders: boolean;
  canReadProducts: boolean;
  canWriteInventory: boolean;
  canWriteFulfillment: boolean;

  credentialRef?: string;
  scopes: string[];
  webhookSubscriptionIds: string[];

  lastFullSyncAt?: string;
  lastIncrementalSyncAt?: string;
  lastErrorMessage?: string;
  lastErrorAt?: string;
  nextSyncAfter?: string;
  syncCursor?: string;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;

  autoMatchByGtin: boolean;
  autoMatchBySku: boolean;
  autoMatchThreshold: number;

  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// ORDER ENTITIES
// ============================================

export type CommerceFinancialStatus =
  | 'paid'
  | 'pending'
  | 'authorized'
  | 'partially_paid'
  | 'partially_refunded'
  | 'refunded'
  | 'voided'
  | 'unpaid';

export type CommerceFulfillmentStatus =
  | 'unfulfilled'
  | 'partial'
  | 'shipped'
  | 'delivered'
  | 'returned';

export type CommerceOrderStatus = 'open' | 'closed' | 'cancelled';

export interface CommerceOrder {
  id: string;
  tenantId: string;
  connectionId?: string;
  platform: CommercePlatform;

  externalOrderId: string;
  externalOrderNumber?: string;
  externalCustomerId?: string;
  externalUrl?: string;

  currency: string;
  subtotalAmount: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalAmountEur?: number;

  customerEmail?: string;
  customerName?: string;
  customerCountry?: string;
  customerCountryName?: string;
  customerCity?: string;
  customerPostalCode?: string;
  customerLat?: number;
  customerLng?: number;
  customerIsReturning: boolean;

  financialStatus?: CommerceFinancialStatus;
  fulfillmentStatus?: CommerceFulfillmentStatus;
  orderStatus?: CommerceOrderStatus;
  isTest: boolean;
  itemCount: number;

  dppLinkedCount: number;
  dppTotalCount: number;

  carbonFootprintKg?: number;

  placedAt: string;
  paidAt?: string;
  fulfilledAt?: string;
  cancelledAt?: string;
  syncedAt: string;

  rawPayload?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;

  // joined / hydrated
  items?: CommerceOrderItem[];
  connection?: Pick<CommerceChannelConnection, 'id' | 'platform' | 'accountLabel'>;
}

export type DppMatchMethod = 'gtin' | 'sku' | 'manual' | 'auto_fuzzy' | null;

export interface CommerceOrderItem {
  id: string;
  tenantId: string;
  orderId: string;

  externalItemId?: string;
  externalProductId?: string;
  externalVariantId?: string;

  title: string;
  variantTitle?: string;
  sku?: string;
  gtin?: string;
  imageUrl?: string;

  quantity: number;
  unitPrice: number;
  totalPrice: number;

  productId?: string;
  batchId?: string;
  matchMethod: DppMatchMethod;
  matchConfidence?: number;
  dppUrl?: string;
  dppQrEmittedAt?: string;

  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SYNC EVENTS
// ============================================

export type CommerceSyncEventType =
  | 'connection_created'
  | 'connection_updated'
  | 'connection_disconnected'
  | 'sync_started'
  | 'sync_completed'
  | 'sync_failed'
  | 'webhook_received'
  | 'webhook_replayed'
  | 'order_imported'
  | 'order_updated'
  | 'product_matched'
  | 'match_failed';

export type CommerceSyncSeverity = 'info' | 'success' | 'warning' | 'error';

export interface CommerceSyncEvent {
  id: string;
  tenantId: string;
  connectionId?: string;
  platform: CommercePlatform;
  eventType: CommerceSyncEventType;
  severity: CommerceSyncSeverity;
  title: string;
  description?: string;
  durationMs?: number;
  itemsProcessed: number;
  itemsCreated: number;
  itemsUpdated: number;
  itemsFailed: number;
  payload: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// MEGA DASHBOARD STATS
// ============================================

export interface CommerceKpiBlock {
  /** Localized KPI label */
  label: string;
  /** Primary numeric value (already locale-formatted on the consumer side) */
  value: number;
  /** Compare-to value (yesterday/last period). Used to compute deltaPct. */
  prevValue?: number;
  /** Computed % vs previous, rounded to 1 decimal. Positive numbers signal "up". */
  deltaPct?: number;
  /** Currency for currency-typed KPIs. */
  currency?: string;
  /** Display kind hints the renderer for formatting. */
  kind: 'currency' | 'count' | 'percent' | 'duration_minutes' | 'mass_kg';
}

export interface CommerceLeaderboardEntry {
  productId?: string;
  title: string;
  imageUrl?: string;
  unitsSold: number;
  revenue: number;
  carbonFootprintKg?: number;
  hasDpp: boolean;
  dppUrl?: string;
}

export interface CommerceGeoPoint {
  country: string;
  countryName: string;
  lat: number;
  lng: number;
  orders: number;
  revenue: number;
}

export interface CommercePlatformBreakdownEntry {
  platform: CommercePlatform;
  orders: number;
  revenue: number;
  /** 7-day rolling sparkline values */
  sparkline: number[];
}

export interface CommerceLiveOrder {
  id: string;
  platform: CommercePlatform;
  externalOrderNumber?: string;
  totalAmount: number;
  currency: string;
  customerCountry?: string;
  customerCountryName?: string;
  itemCount: number;
  dppLinked: boolean;
  placedAt: string;
}

export interface CommerceMegaDashboardSnapshot {
  generatedAt: string;
  /** Today vs yesterday rollups for the hero strip */
  hero: {
    revenueToday: CommerceKpiBlock;
    ordersToday: CommerceKpiBlock;
    averageOrderValue: CommerceKpiBlock;
    conversionEstimate: CommerceKpiBlock;
  };
  /** Bottom strip — broader sustainability + compliance signals */
  footer: {
    dppActivationsToday: CommerceKpiBlock;
    carbonDeliveredKg: CommerceKpiBlock;
    returnsRatePct: CommerceKpiBlock;
    avgComplianceScore: CommerceKpiBlock;
  };
  liveFeed: CommerceLiveOrder[];
  geoPoints: CommerceGeoPoint[];
  platformBreakdown: CommercePlatformBreakdownEntry[];
  topProducts: CommerceLeaderboardEntry[];
}

// ============================================
// CONNECT WIZARD INPUT TYPES
// ============================================

export interface ConnectWizardInput {
  platform: CommercePlatform;
  accountLabel: string;
  accountUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  shopDomain?: string;
}

// ============================================
// HELPERS
// ============================================

export const ALL_COMMERCE_PLATFORMS: CommercePlatform[] = [
  'shopify',
  'etsy',
  'pinterest',
  'amazon',
  'ebay',
  'woocommerce',
  'tiktok_shop',
  'manual',
];

/** Brand metadata for every supported platform. Sourced from each platform's brand guidelines. */
export const COMMERCE_PLATFORM_REGISTRY: Record<CommercePlatform, CommercePlatformDescriptor> = {
  shopify: {
    id: 'shopify',
    label: 'Shopify',
    iconUrl: 'shopify',
    brandColor: '#5E8E3E',
    gradient: ['#5E8E3E', '#95BF47'],
    authMethod: 'oauth2',
    available: true,
    blurb: 'Sync orders, customers and inventory in real-time. Auto-link DPPs to fulfilled orders.',
    capabilities: { orders: true, products: true, inventory: true, fulfillment: true, refunds: true },
    scopesRequired: ['read_orders', 'read_products', 'write_inventory', 'write_fulfillments'],
    docsUrl: 'https://shopify.dev/docs/admin-api',
  },
  etsy: {
    id: 'etsy',
    label: 'Etsy',
    iconUrl: 'etsy',
    brandColor: '#F1641E',
    gradient: ['#F1641E', '#FF8E3C'],
    authMethod: 'oauth2',
    available: true,
    blurb: 'Connect your Etsy shop and surface every receipt with sustainability proofs from your DPP.',
    capabilities: { orders: true, products: true, inventory: false, fulfillment: true, refunds: true },
    scopesRequired: ['transactions_r', 'listings_r', 'shops_r'],
    docsUrl: 'https://developers.etsy.com/documentation',
  },
  pinterest: {
    id: 'pinterest',
    label: 'Pinterest',
    iconUrl: 'pinterest',
    brandColor: '#E60023',
    gradient: ['#E60023', '#BD081C'],
    authMethod: 'oauth2',
    available: true,
    blurb: 'Pull catalog conversions and pin-level commerce events. Powerful for visual-first DTC brands.',
    capabilities: { orders: true, products: true, inventory: false, fulfillment: false, refunds: false },
    scopesRequired: ['catalogs:read', 'ads:read'],
    docsUrl: 'https://developers.pinterest.com/docs/api/v5/',
  },
  amazon: {
    id: 'amazon',
    label: 'Amazon',
    iconUrl: 'amazon',
    brandColor: '#FF9900',
    gradient: ['#232F3E', '#FF9900'],
    authMethod: 'oauth2',
    available: true,
    blurb: 'SP-API integration: orders, FBA inventory, and EU compliance reporting in one feed.',
    capabilities: { orders: true, products: true, inventory: true, fulfillment: true, refunds: true },
    scopesRequired: ['sellingpartnerapi::orders', 'sellingpartnerapi::inventory'],
    docsUrl: 'https://developer-docs.amazon.com/sp-api/',
  },
  ebay: {
    id: 'ebay',
    label: 'eBay',
    iconUrl: 'ebay',
    brandColor: '#0064D2',
    gradient: ['#0064D2', '#FFA500'],
    authMethod: 'oauth2',
    available: true,
    blurb: 'eBay Trading + Sell APIs. Auto-attach DPP QR labels to listings and shipped parcels.',
    capabilities: { orders: true, products: true, inventory: true, fulfillment: true, refunds: false },
    scopesRequired: ['sell.fulfillment', 'sell.inventory'],
    docsUrl: 'https://developer.ebay.com/api-docs/static/sell-apis.html',
  },
  woocommerce: {
    id: 'woocommerce',
    label: 'WooCommerce',
    iconUrl: 'woocommerce',
    brandColor: '#7F54B3',
    gradient: ['#7F54B3', '#96588A'],
    authMethod: 'api_key',
    available: true,
    blurb: 'Self-hosted WooCommerce store? Use REST API keys to mirror every order automatically.',
    capabilities: { orders: true, products: true, inventory: true, fulfillment: true, refunds: true },
    scopesRequired: ['read', 'write'],
    docsUrl: 'https://woocommerce.com/document/woocommerce-rest-api/',
  },
  tiktok_shop: {
    id: 'tiktok_shop',
    label: 'TikTok Shop',
    iconUrl: 'tiktok',
    brandColor: '#000000',
    gradient: ['#000000', '#FE2C55'],
    authMethod: 'oauth2',
    available: false,
    blurb: 'Coming Q3: TikTok Shop API for short-form social commerce with built-in DPP overlays.',
    capabilities: { orders: true, products: true, inventory: false, fulfillment: false, refunds: false },
    scopesRequired: ['order.list', 'product.list'],
  },
  manual: {
    id: 'manual',
    label: 'Manual / CSV Import',
    iconUrl: 'csv',
    brandColor: '#475569',
    gradient: ['#475569', '#64748B'],
    authMethod: 'manual',
    available: true,
    blurb: 'No API? Drop a CSV/JSON each day or week — perfect for marketplaces without OAuth support.',
    capabilities: { orders: true, products: false, inventory: false, fulfillment: false, refunds: false },
    scopesRequired: [],
  },
  custom_api: {
    id: 'custom_api',
    label: 'Custom Webhook',
    iconUrl: 'webhook',
    brandColor: '#0EA5E9',
    gradient: ['#0EA5E9', '#22D3EE'],
    authMethod: 'access_token',
    available: true,
    blurb: 'Push your own orders into Trackbliss with a signed webhook — full schema flexibility.',
    capabilities: { orders: true, products: false, inventory: false, fulfillment: false, refunds: false },
    scopesRequired: [],
  },
};

export function getPlatformDescriptor(p: CommercePlatform): CommercePlatformDescriptor {
  return COMMERCE_PLATFORM_REGISTRY[p];
}
