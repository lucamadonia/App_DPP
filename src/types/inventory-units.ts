/**
 * Per-Unit Inventory Tracking Types
 *
 * One inventory_units row = one individual physical unit within a batch.
 * Enables "scan each unit and see which serials are missing" workflow.
 */

export type InventoryUnitStatus =
  | 'expected'    // Created, not yet physically received
  | 'received'    // Scanned in, in warehouse stock
  | 'reserved'    // Allocated to a shipment but not yet shipped
  | 'shipped'     // Sent out to customer / partner
  | 'damaged'     // Received but damaged
  | 'quarantine'  // Received but on hold
  | 'returned'    // Came back from customer (re-receivable)
  | 'lost'        // Could not be located / written off
  | 'consumed';   // Used up (e.g. sample, internal consumption)

export interface InventoryUnit {
  id: string;
  tenantId: string;
  batchId: string;
  productId: string;
  unitSerial: string;
  status: InventoryUnitStatus;
  locationId?: string;
  binLocation?: string;
  receivedAt?: string;
  receivedBy?: string;
  shippedAt?: string;
  shippedBy?: string;
  shipmentId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  // Joined fields
  productName?: string;
  productGtin?: string;
  batchSerialNumber?: string;
  locationName?: string;
}

/**
 * Aggregated counts + missing serials for a batch with unit tracking.
 */
export interface BatchUnitStats {
  batchId: string;
  total: number;
  expected: number;
  received: number;
  reserved: number;
  shipped: number;
  damaged: number;
  quarantine: number;
  returned: number;
  lost: number;
  consumed: number;
  /** Serials of units still in 'expected' status — the "missing" list. */
  missingSerials: string[];
  /** Percentage of physically present units (received + reserved + damaged + quarantine + returned) of total. */
  receivedPercent: number;
}

/**
 * Parameters for bulk-generating expected units when a batch is created.
 *
 * Example: count=100, serialPrefix='ABC-', startNumber=1, padding=3
 *   → ABC-001, ABC-002, ..., ABC-100
 */
export interface GenerateUnitsParams {
  batchId: string;
  count: number;
  serialPrefix: string;
  startNumber?: number;   // Default: 1
  padding?: number;       // Default: 3 (e.g. 001)
  separator?: string;     // Optional separator already in prefix; ignored unless used by caller
}

export interface GenerateUnitsResult {
  success: boolean;
  created: number;
  error?: string;
  firstSerial?: string;
  lastSerial?: string;
}

export interface UnitFilter {
  batchId?: string;
  productId?: string;
  status?: InventoryUnitStatus | InventoryUnitStatus[];
  locationId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedUnitResult {
  data: InventoryUnit[];
  total: number;
  page: number;
  pageSize: number;
}
