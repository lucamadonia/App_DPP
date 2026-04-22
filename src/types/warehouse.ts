import type { CarrierLabelData } from './dhl';

// ============================================
// INFLUENCER & CAMPAIGN TYPES
// ============================================

export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'pinterest' | 'other';
export type InfluencerTier = 'nano' | 'micro' | 'mid' | 'macro' | 'mega';
export type SampleType = 'gift' | 'loan';
export type SampleStatus = 'distributed' | 'awaiting_content' | 'content_received' | 'return_pending' | 'returned' | 'kept';
export type ContentStatus = 'no_content' | 'awaiting' | 'received' | 'verified';
export type CampaignStatus = 'draft' | 'planning' | 'outreach' | 'active' | 'review' | 'completed' | 'cancelled';
export type CampaignInfluencerStatus = 'invited' | 'accepted' | 'negotiating' | 'contracted' | 'sample_sent' | 'content_pending' | 'content_delivered' | 'completed' | 'declined' | 'cancelled';
export type CompensationType = 'product_only' | 'paid' | 'affiliate' | 'hybrid';
export type ContentType = 'post' | 'story' | 'reel' | 'video' | 'short' | 'other';
export type CampaignEventType =
  | 'campaign_created' | 'campaign_updated' | 'campaign_status_changed'
  | 'influencer_added' | 'influencer_removed' | 'influencer_status_changed'
  | 'sample_shipped' | 'sample_delivered' | 'sample_returned'
  | 'content_received' | 'content_verified'
  | 'budget_updated' | 'deadline_approaching' | 'milestone_reached'
  | 'note_added';

export interface SampleShipmentMeta {
  sampleType: SampleType;
  campaignId?: string;
  returnExpected: boolean;
  returnDeadline?: string;
  contentExpected: boolean;
  contentDeadline?: string;
  sampleStatus: SampleStatus;
  contentStatus: ContentStatus;
}

export interface CampaignDeliverable {
  platform: SocialPlatform;
  contentType: ContentType;
  quantity: number;
  deadline?: string;
  notes?: string;
}

export interface WhCampaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  budgetSpent?: number;
  currency: string;
  goals?: string;
  productIds: string[];
  tags: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhCampaignInput {
  name: string;
  description?: string;
  status?: CampaignStatus;
  startDate?: string;
  endDate?: string;
  budget?: number;
  currency?: string;
  goals?: string;
  productIds?: string[];
  tags?: string[];
}

export interface WhContentPost {
  id: string;
  tenantId: string;
  shipmentId: string;
  campaignId?: string;
  contactId?: string;
  platform: SocialPlatform;
  postUrl: string;
  postedAt?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  engagementRate?: number;
  thumbnailUrl?: string;
  estimatedReach?: number;
  contentType?: ContentType;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhContentPostInput {
  shipmentId: string;
  campaignId?: string;
  contactId?: string;
  platform: SocialPlatform;
  postUrl: string;
  postedAt?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  engagementRate?: number;
  thumbnailUrl?: string;
  estimatedReach?: number;
  contentType?: ContentType;
  notes?: string;
}

export interface WhCampaignInfluencer {
  id: string;
  tenantId: string;
  campaignId: string;
  contactId: string;
  status: CampaignInfluencerStatus;
  budgetAllocated: number;
  budgetSpent: number;
  currency: string;
  deliverables: CampaignDeliverable[];
  compensationType: CompensationType;
  contractTerms?: string;
  paymentTerms?: string;
  notes?: string;
  invitedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
  shipmentId?: string;
  createdAt: string;
  updatedAt: string;
  // Joined
  contact?: WhContact;
}

export interface WhCampaignInfluencerInput {
  campaignId: string;
  contactId: string;
  status?: CampaignInfluencerStatus;
  budgetAllocated?: number;
  budgetSpent?: number;
  currency?: string;
  deliverables?: CampaignDeliverable[];
  compensationType?: CompensationType;
  contractTerms?: string;
  paymentTerms?: string;
  notes?: string;
  shipmentId?: string;
}

export interface WhCampaignEvent {
  id: string;
  tenantId: string;
  campaignId: string;
  eventType: CampaignEventType;
  description?: string;
  actorId?: string;
  actorType: 'system' | 'user';
  contactId?: string;
  shipmentId?: string;
  contentPostId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WhCampaignEventInput {
  campaignId: string;
  eventType: CampaignEventType;
  description?: string;
  actorType?: 'system' | 'user';
  contactId?: string;
  shipmentId?: string;
  contentPostId?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// INFLUENCER HUB DASHBOARD TYPES
// ============================================

export interface InfluencerHubStats {
  activeCampaigns: number;
  totalReach: number;
  avgEngagement: number;
  samplesOut: number;
  contentReceived: number;
  budgetSpent: number;
  totalViews: number;
  overdueItems: number;
}

export interface InfluencerRanking {
  contactId: string;
  contactName: string;
  platform: SocialPlatform;
  followerCount: number;
  engagementRate: number;
  contentCount: number;
  totalViews: number;
}

export interface ActivityItem {
  id: string;
  eventType: CampaignEventType;
  description: string;
  campaignName?: string;
  contactName?: string;
  createdAt: string;
}

export interface DeadlineItem {
  id: string;
  type: 'content' | 'return' | 'campaign_end';
  label: string;
  campaignName?: string;
  contactName?: string;
  deadline: string;
  daysRemaining: number;
}

export interface PlatformBreakdown {
  platform: SocialPlatform;
  count: number;
  totalViews: number;
  totalEngagement: number;
}

export interface DailyEngagement {
  date: string;
  views: number;
  likes: number;
  comments: number;
}

export interface CampaignAnalytics {
  campaign: WhCampaign;
  stats: CampaignStats;
  influencerCount: number;
  platformBreakdown: PlatformBreakdown[];
  topContent: WhContentPost[];
}

export interface CampaignStats {
  totalShipments: number;
  totalSamples: number;
  contentReceived: number;
  contentPending: number;
  returnsPending: number;
  totalViews: number;
  totalLikes: number;
  totalEngagement: number;
}

export interface SampleDashboardStats {
  samplesOut: number;
  awaitingContent: number;
  returnsPending: number;
  overdue: number;
  contentReceived: number;
  totalCampaigns: number;
}

/**
 * Warehouse & Fulfillment Module Types
 *
 * Domain types for the "Lager & Versand" module:
 * - Warehouse locations (wh_locations)
 * - Stock levels per batch per location (wh_stock_levels)
 * - Stock transactions / audit trail (wh_stock_transactions)
 * - Shipments (wh_shipments)
 * - Shipment items (wh_shipment_items)
 * - B2B contacts (wh_contacts)
 */

// ============================================
// B2B CONTACTS
// ============================================

export type WhContactType = 'b2b' | 'b2c' | 'supplier' | 'influencer' | 'other';

export interface WhContact {
  id: string;
  tenantId: string;
  type: WhContactType;
  companyName?: string;
  contactName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  customerNumber?: string;
  vatId?: string;
  notes?: string;
  tags: string[];
  isActive: boolean;
  // Influencer fields
  instagramHandle?: string;
  tiktokHandle?: string;
  youtubeHandle?: string;
  otherSocialUrl?: string;
  primaryPlatform?: SocialPlatform;
  followerCount?: number;
  engagementRate?: number;
  niche?: string;
  influencerTier?: InfluencerTier;
  createdAt: string;
  updatedAt: string;
}

export interface WhContactInput {
  type?: WhContactType;
  companyName?: string;
  contactName: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  customerNumber?: string;
  vatId?: string;
  notes?: string;
  tags?: string[];
  // Influencer fields
  instagramHandle?: string;
  tiktokHandle?: string;
  youtubeHandle?: string;
  otherSocialUrl?: string;
  primaryPlatform?: SocialPlatform;
  followerCount?: number;
  engagementRate?: number;
  niche?: string;
  influencerTier?: InfluencerTier;
}

// ============================================
// WAREHOUSE LOCATIONS
// ============================================

export type WarehouseLocationType = 'main' | 'external' | 'dropship' | 'consignment' | 'returns';

export type WarehouseZoneType = 'receiving' | 'storage' | 'picking' | 'packing' | 'shipping' | 'cold_storage' | 'hazmat' | 'returns' | 'other';

export interface ZoneMapPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// ZONE FURNITURE (Floor Planner)
// ============================================

/** Furniture types available for placement inside zones */
export type FurnitureType =
  | 'shelf'          // Standard shelf
  | 'heavy_rack'     // Heavy-duty rack
  | 'pallet_rack'    // Pallet rack
  | 'cabinet'        // Cabinet
  | 'drawer_unit'    // Drawer unit
  | 'flow_rack'      // Flow rack
  | 'table'          // Worktable / packing table
  | 'bin_wall'       // Small parts bin wall
  | 'cold_unit'      // Cold storage unit
  | 'pallet_spot'    // Floor pallet spot
  | 'staging_area'   // Staging area
  | 'conveyor';      // Conveyor belt

/** A single section/slot inside a furniture piece */
export interface FurnitureSection {
  id: string;           // e.g. "A1", "B2", "TOP", "BOTTOM"
  label: string;        // Display label
  capacity?: number;    // Max units (optional)
}

/** A physical furniture piece placed inside a zone */
export interface ZoneFurniture {
  id: string;                              // UUID
  type: FurnitureType;
  name: string;                            // e.g. "Shelf A-01"
  position: { x: number; y: number };      // Grid position within zone
  size: { w: number; h: number };          // Grid units
  rotation: 0 | 90 | 180 | 270;
  sections: FurnitureSection[];
  color?: string;                          // Optional custom color
  notes?: string;
}

export interface WarehouseZone {
  name: string;
  code: string;
  type?: WarehouseZoneType;
  areaM2?: number;
  volumeM3?: number;
  binLocations?: string[];
  mapPosition?: ZoneMapPosition;
  furniture?: ZoneFurniture[];             // Furniture pieces in this zone
}

export interface WhLocation {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  type: WarehouseLocationType;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  facilityIdentifier?: string;
  capacityUnits?: number;
  capacityVolumeM3?: number;
  areaM2?: number;
  zones: WarehouseZone[];
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhLocationInput {
  name: string;
  code?: string;
  type?: WarehouseLocationType;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  facilityIdentifier?: string;
  capacityUnits?: number;
  capacityVolumeM3?: number;
  areaM2?: number;
  zones?: WarehouseZone[];
  isActive?: boolean;
  notes?: string;
}

// ============================================
// STOCK LEVELS
// ============================================

export interface WhStockLevel {
  id: string;
  tenantId: string;
  locationId: string;
  productId: string;
  batchId: string;
  quantityAvailable: number;
  quantityReserved: number;
  quantityDamaged: number;
  quantityQuarantine: number;
  binLocation?: string;
  zone?: string;
  reorderPoint?: number;
  reorderQuantity?: number;
  createdAt: string;
  updatedAt: string;
  // Joined fields (optional)
  productName?: string;
  batchSerialNumber?: string;
  locationName?: string;
  locationCode?: string;
  // Joined product dimensions & weights — used by warehouse AI to reason about
  // shipping, pallet loading, and carrier selection.
  productNetWeightKg?: number;
  productGrossWeightKg?: number;
  productHeightCm?: number;
  productWidthCm?: number;
  productDepthCm?: number;
  packagingHeightCm?: number;
  packagingWidthCm?: number;
  packagingDepthCm?: number;
}

// ============================================
// STOCK TRANSACTIONS (AUDIT TRAIL)
// ============================================

export type StockTransactionType =
  | 'goods_receipt'
  | 'shipment'
  | 'transfer_out'
  | 'transfer_in'
  | 'adjustment'
  | 'return_receipt'
  | 'reservation'
  | 'release'
  | 'damage'
  | 'write_off';

export interface WhStockTransaction {
  id: string;
  tenantId: string;
  transactionNumber: string;
  type: StockTransactionType;
  locationId?: string;
  productId: string;
  batchId: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  shipmentId?: string;
  returnId?: string;
  relatedTransactionId?: string;
  reason?: string;
  notes?: string;
  referenceNumber?: string;
  performedBy?: string;
  createdAt: string;
  // Joined fields (optional)
  productName?: string;
  batchSerialNumber?: string;
  locationName?: string;
}

// ============================================
// SHIPMENTS
// ============================================

export type ShipmentStatus =
  | 'draft'
  | 'picking'
  | 'packed'
  | 'label_created'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type RecipientType = 'customer' | 'b2b_partner' | 'warehouse' | 'influencer' | 'other';

export type ShipmentPriority = 'low' | 'normal' | 'high' | 'urgent';

export const SHIPMENT_STATUS_ORDER: ShipmentStatus[] = [
  'draft', 'picking', 'packed', 'label_created',
  'shipped', 'in_transit', 'delivered',
];

export const CARRIER_OPTIONS = [
  'DHL', 'DPD', 'UPS', 'GLS', 'Hermes', 'FedEx',
  'Deutsche Post', 'TNT', 'DB Schenker',
] as const;

export interface WhShipment {
  id: string;
  tenantId: string;
  shipmentNumber: string;
  status: ShipmentStatus;
  recipientType: RecipientType;
  recipientName: string;
  recipientCompany?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState?: string;
  shippingPostalCode: string;
  shippingCountry: string;
  carrier?: string;
  serviceLevel?: string;
  trackingNumber?: string;
  labelUrl?: string;
  estimatedDelivery?: string;
  shippedAt?: string;
  deliveredAt?: string;
  shippingCost?: number;
  currency: string;
  totalWeightGrams?: number;
  totalItems: number;
  sourceLocationId?: string;
  orderReference?: string;
  customerId?: string;
  contactId?: string;
  // Shopify bidirectional linkage
  shopifyOrderId?: number;
  shopifyFulfillmentId?: number;
  shopifyFulfillmentStatus?: string;
  shopifyExportPending?: boolean;
  shopifyExportAttempts?: number;
  shopifyExportError?: string;
  lastFulfillmentAt?: string;
  // DHL tracking snapshot (filled by 8h pg_cron poll)
  trackingLastStatus?: string;
  trackingLastDescription?: string;
  trackingLastEventAt?: string;
  trackingLastLocation?: string;
  trackingPolledAt?: string;
  priority: ShipmentPriority;
  notes?: string;
  internalNotes?: string;
  carrierLabelData?: CarrierLabelData;
  packedBy?: string;
  shippedBy?: string;
  sampleMeta?: SampleShipmentMeta;
  createdAt: string;
  updatedAt: string;
  // Joined
  sourceLocationName?: string;
  items?: WhShipmentItem[];
}

export interface WhShipmentInput {
  recipientType: RecipientType;
  recipientName: string;
  recipientCompany?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState?: string;
  shippingPostalCode: string;
  shippingCountry: string;
  carrier?: string;
  serviceLevel?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  shippingCost?: number;
  currency?: string;
  sourceLocationId?: string;
  orderReference?: string;
  customerId?: string;
  contactId?: string;
  priority?: ShipmentPriority;
  notes?: string;
  internalNotes?: string;
  totalWeightGrams?: number;
  sampleMeta?: SampleShipmentMeta;
  items: WhShipmentItemInput[];
}

export interface WhShipmentItem {
  id: string;
  tenantId: string;
  shipmentId: string;
  productId: string;
  batchId: string;
  locationId: string;
  quantity: number;
  quantityPicked: number;
  quantityPacked: number;
  unitPrice?: number;
  currency: string;
  notes?: string;
  createdAt: string;
  // Joined
  productName?: string;
  batchSerialNumber?: string;
  locationName?: string;
}

export interface WhShipmentItemInput {
  productId: string;
  batchId: string;
  locationId: string;
  quantity: number;
  unitPrice?: number;
  currency?: string;
  notes?: string;
}

// ============================================
// FILTERS & STATS
// ============================================

export interface StockFilter {
  locationId?: string;
  productId?: string;
  batchId?: string;
  lowStockOnly?: boolean;
  search?: string;
  zone?: string;
  page?: number;
  pageSize?: number;
}

export interface TransactionFilter {
  locationId?: string;
  productId?: string;
  batchId?: string;
  type?: StockTransactionType[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ShipmentFilter {
  status?: ShipmentStatus[];
  priority?: ShipmentPriority[];
  carrier?: string;
  recipientType?: RecipientType[];
  contactId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface WarehouseStats {
  totalStock: number;
  totalLocations: number;
  openShipments: number;
  shippedToday: number;
  lowStockAlerts: number;
  avgShippingDays: number;
}

export interface LocationStats {
  totalItems: number;
  totalBatches: number;
  capacityUsedPercent?: number;
  zoneCount: number;
  binLocationCount: number;
  lowStockCount: number;
}

export interface LocationCapacitySummary {
  locationId: string;
  locationName: string;
  locationCode?: string;
  totalUnits: number;
  capacityUnits?: number;
  fillPercentUnits?: number;
  capacityVolumeM3?: number;
  areaM2?: number;
  usedVolumeM3?: number;
  fillPercentVolume?: number;
}

export interface PendingAction {
  type: 'low_stock' | 'shipment_action';
  title: string;
  subtitle?: string;
  linkTo: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface ContactStats {
  totalShipments: number;
  totalItemsShipped: number;
  lastShipmentDate?: string;
  topProducts: { productId: string; productName: string; totalQuantity: number }[];
}

export interface PaginatedStockResult {
  data: WhStockLevel[];
  total: number;
  page: number;
  pageSize: number;
}
