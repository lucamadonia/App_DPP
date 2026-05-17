/**
 * Types for the German compliance reporting module.
 * Covers EAR (Stiftung Elektro-Altgeräte-Register) and LUCID
 * (Zentrale Stelle Verpackungsregister) monthly filings.
 */

// ============================================
// CONSTANTS
// ============================================

export type EarCategory = 1 | 2 | 3 | 4 | 5 | 6;

export const EAR_CATEGORY_NAMES_DE: Record<EarCategory, string> = {
  1: 'Wärmeüberträger',
  2: 'Bildschirme & Monitore',
  3: 'Lampen',
  4: 'Großgeräte',
  5: 'Kleingeräte',
  6: 'IT- und Telekommunikationsgeräte',
};

export const EAR_CATEGORY_NAMES_EN: Record<EarCategory, string> = {
  1: 'Temperature exchange equipment',
  2: 'Screens & monitors',
  3: 'Lamps',
  4: 'Large equipment',
  5: 'Small equipment',
  6: 'Small IT & telecommunications',
};

export type LucidMaterial =
  | 'paper'
  | 'plastic'
  | 'glass'
  | 'aluminum'
  | 'steel'
  | 'composite'
  | 'wood'
  | 'other';

export const LUCID_MATERIAL_NAMES_DE: Record<LucidMaterial, string> = {
  paper: 'Papier/Pappe/Karton',
  plastic: 'Kunststoff',
  glass: 'Glas',
  aluminum: 'Aluminium',
  steel: 'Eisenmetalle (Weißblech, Stahl)',
  composite: 'Verbundverpackung',
  wood: 'Holz',
  other: 'Sonstige Materialien',
};

export const LUCID_MATERIAL_NAMES_EN: Record<LucidMaterial, string> = {
  paper: 'Paper / cardboard',
  plastic: 'Plastic',
  glass: 'Glass',
  aluminum: 'Aluminium',
  steel: 'Ferrous metals (tinplate, steel)',
  composite: 'Composite packaging',
  wood: 'Wood',
  other: 'Other materials',
};

export const LUCID_MATERIAL_ORDER: LucidMaterial[] = [
  'paper', 'plastic', 'glass', 'aluminum', 'steel', 'composite', 'wood', 'other',
];

export type ComplianceReportType = 'ear' | 'lucid';
export type ComplianceReportStatus = 'draft' | 'submitted' | 'confirmed' | 'rejected' | 'obsolete';

// ============================================
// SETTINGS (stored in tenants.settings.compliance)
// ============================================

export type DistributorRole = 'manufacturer' | 'distributor' | 'importer';

export interface ComplianceEarSettings {
  enabled: boolean;
  weeeNumber: string;
  stiftungEarBrand: string;
  contactEmails: string[];
  autoReminders: boolean;
  autoGenerateOnMonthEnd: boolean;
}

export interface ComplianceLucidSettings {
  enabled: boolean;
  lucidNumber: string;
  distributorRole: DistributorRole;
  dualSystem?: string;
  contactEmails: string[];
  autoReminders: boolean;
  autoGenerateOnMonthEnd: boolean;
}

export interface ComplianceSettings {
  ear?: ComplianceEarSettings;
  lucid?: ComplianceLucidSettings;
}

// ============================================
// MATERIAL SPLIT (per packaging type)
// ============================================

export interface MaterialSplitEntry {
  material: LucidMaterial;
  weight_grams: number;
}

// ============================================
// AGGREGATION RESULTS
// ============================================

export interface EarAggregateRow {
  category: EarCategory;
  b2b: boolean;
  unitCount: number;
  totalWeightGrams: number;
  unitsWithBattery: number;
  batteryWeightGrams: number;
  products: Array<{ id: string; name: string; brand: string; quantity: number }>;
}

export interface LucidAggregateRow {
  material: LucidMaterial;
  totalWeightGrams: number;
  contributingShipmentCount: number;
  perPackaging: Array<{
    packagingId: string;
    packagingName: string;
    consumedCount: number;
    weightPerUnit: number;
    weightContributionGrams: number;
  }>;
}

export interface EarSnapshot {
  rows: EarAggregateRow[];
  totalUnits: number;
  totalWeightGrams: number;
  totalUnitsWithBattery: number;
  totalBatteryWeightGrams: number;
  shipmentCount: number;
  weeeNumber: string;
  brand: string;
}

export interface LucidSnapshot {
  rows: LucidAggregateRow[];
  totalWeightGrams: number;
  shipmentCount: number;
  lucidNumber: string;
  distributorRole: DistributorRole;
  dualSystem?: string;
}

// ============================================
// REPORT ENTITY
// ============================================

export interface ComplianceMonthlyReport {
  id: string;
  tenantId: string;
  reportType: ComplianceReportType;
  /** ISO date string for the first day of the reported month, e.g. "2026-04-01". */
  reportMonth: string;
  status: ComplianceReportStatus;
  generatedAt: string;
  generatedBy?: string;
  submittedAt?: string;
  submittedBy?: string;
  confirmedAt?: string;
  externalReference?: string;
  summary: EarSnapshot | LucidSnapshot;
  shipmentIds: string[];
  productIds: string[];
  packagingTypeIds: string[];
  csvStoragePath?: string;
  pdfStoragePath?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceAuditEntry {
  id: string;
  tenantId: string;
  reportId?: string;
  action: string;
  performedBy?: string;
  details?: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// FILTERS
// ============================================

export interface ComplianceReportFilter {
  reportType?: ComplianceReportType;
  status?: ComplianceReportStatus | ComplianceReportStatus[];
  yearFrom?: number;
  yearTo?: number;
  limit?: number;
}

// ============================================
// HELPERS
// ============================================

/**
 * Walk the material_split JSONB (or fall back to primary_material + tare)
 * to produce a normalized list of {material, weight_grams} entries.
 */
export function resolveMaterialShares(
  primary: LucidMaterial | null | undefined,
  split: MaterialSplitEntry[] | null | undefined,
  tareWeightGrams: number,
): MaterialSplitEntry[] {
  if (split && Array.isArray(split) && split.length > 0) {
    return split.filter(s => s.weight_grams > 0);
  }
  if (primary && tareWeightGrams > 0) {
    return [{ material: primary, weight_grams: tareWeightGrams }];
  }
  return [];
}

/** Returns the ISO date string for the first day of the previous month relative to `today`. */
export function previousMonthStart(today: Date = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Returns days until the 15th of the current or next month. Negative = overdue. */
export function daysUntilDeadline(today: Date = new Date()): number {
  const target = new Date(today.getFullYear(), today.getMonth(), 15);
  target.setHours(23, 59, 59, 999);
  if (today.getTime() > target.getTime()) {
    target.setMonth(target.getMonth() + 1);
  }
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
