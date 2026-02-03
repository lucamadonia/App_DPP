import type { Supplier } from './database';

// ---------------------------------------------------------------------------
// Product Group Detection
// ---------------------------------------------------------------------------

export type ProductGroup = 'toys' | 'electronics' | 'textiles' | 'household' | 'general';

export type LabelVariant = 'b2b' | 'b2c';

// ---------------------------------------------------------------------------
// Compliance Module Icons per Product Group
// ---------------------------------------------------------------------------

export interface ComplianceModuleIcon {
  id: string;
  symbol: string;       // text symbol rendered in PDF (CE, WEEE, etc.)
  label: string;        // i18n key for tooltip/label
  mandatory: boolean;
  present: boolean;     // detected in product data
}

export type ComplianceModuleElectronics = 'ce' | 'weee' | 'rohs' | 'emc' | 'red' | 'energy_label';
export type ComplianceModuleToys = 'ce' | 'en71' | 'age_warning' | 'small_parts';
export type ComplianceModuleTextiles = 'oeko_tex' | 'gots' | 'reach' | 'care_label';
export type ComplianceModuleHousehold = 'ce' | 'food_contact' | 'reach' | 'gs';
export type ComplianceModuleGeneral = 'ce' | 'reach' | 'rohs' | 'ukca';

export type ComplianceModule =
  | ComplianceModuleElectronics
  | ComplianceModuleToys
  | ComplianceModuleTextiles
  | ComplianceModuleHousehold
  | ComplianceModuleGeneral;

// ---------------------------------------------------------------------------
// Label Sections
// ---------------------------------------------------------------------------

export interface IdentitySection {
  productName: string;
  modelSku: string;       // GTIN
  batchNumber: string;
  manufacturer: {
    name: string;
    address: string;
  };
  importer?: {
    name: string;
    address: string;
  };
}

export interface DppQrSection {
  qrDataUrl: string;      // base64 PNG from qrcode library
  labelText: string;      // "Digital Product Passport"
  dppUrl: string;
}

export interface SustainabilitySection {
  packagingMaterialCodes: string[];  // e.g. ["PAP 20", "LDPE 4"]
  recyclingInstructions: string;
  volumeOptimized: boolean;
}

// ---------------------------------------------------------------------------
// Assembled Master Label Data
// ---------------------------------------------------------------------------

export interface MasterLabelData {
  variant: LabelVariant;
  productGroup: ProductGroup;
  identity: IdentitySection;
  dppQr: DppQrSection;
  compliance: ComplianceModuleIcon[];
  sustainability: SustainabilitySection;

  // B2B extras
  b2bQuantity?: number;
  b2bGrossWeight?: number;

  // B2C extras
  b2cTargetCountry?: string;
  b2cDisposalHint?: string;
}

// ---------------------------------------------------------------------------
// Configuration (UI state)
// ---------------------------------------------------------------------------

export interface MasterLabelConfig {
  variant: LabelVariant;
  targetCountry: string;
  selectedBatchId: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface LabelValidationResult {
  field: string;
  message: string;
  severity: ValidationSeverity;
  i18nKey: string;
}

// ---------------------------------------------------------------------------
// Assembler params
// ---------------------------------------------------------------------------

export interface AssembleMasterLabelParams {
  product: {
    name: string;
    gtin: string;
    batchNumber?: string;
    category: string;
    manufacturer: string;
    manufacturerAddress?: string;
    materials: Array<{ name: string; percentage: number; recyclable: boolean; origin?: string; type?: 'product' | 'packaging' }>;
    certifications: Array<{ name: string; issuedBy: string; validUntil: string }>;
    recyclability?: {
      recyclablePercentage: number;
      instructions: string;
      disposalMethods: string[];
      packagingRecyclablePercentage?: number;
      packagingInstructions?: string;
      packagingDisposalMethods?: string[];
    };
    registrations?: Record<string, string>;
    grossWeight?: number;
    manufacturerSupplierId?: string | null;
    importerSupplierId?: string | null;
  };
  batch?: {
    batchNumber?: string;
    serialNumber: string;
    quantity?: number;
    grossWeight?: number;
    materialsOverride?: Array<{ name: string; percentage: number; recyclable: boolean; origin?: string; type?: 'product' | 'packaging' }>;
    certificationsOverride?: Array<{ name: string; issuedBy: string; validUntil: string }>;
    recyclabilityOverride?: {
      recyclablePercentage: number;
      instructions: string;
      disposalMethods: string[];
      packagingRecyclablePercentage?: number;
      packagingInstructions?: string;
      packagingDisposalMethods?: string[];
    };
  };
  manufacturerSupplier: Supplier | null;
  importerSupplier: Supplier | null;
  variant: LabelVariant;
  targetCountry: string;
  dppUrl: string;
  qrDataUrl: string;
}
