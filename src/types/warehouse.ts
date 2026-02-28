import type { CarrierLabelData } from './dhl';

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

export type WhContactType = 'b2b' | 'b2c' | 'supplier' | 'other';

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

export interface WarehouseZone {
  name: string;
  code: string;
  type?: WarehouseZoneType;
  areaM2?: number;
  volumeM3?: number;
  binLocations?: string[];
  mapPosition?: ZoneMapPosition;
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

export type RecipientType = 'customer' | 'b2b_partner' | 'warehouse' | 'other';

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
  priority: ShipmentPriority;
  notes?: string;
  internalNotes?: string;
  carrierLabelData?: CarrierLabelData;
  packedBy?: string;
  shippedBy?: string;
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
