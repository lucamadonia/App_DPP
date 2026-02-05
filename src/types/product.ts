import type { ProductRegistrations, SupportResources, ProductImage } from './database';

export type PackagingType = 'box' | 'blister' | 'bottle' | 'pouch' | 'can' | 'tube' | 'bag' | 'clamshell' | 'wrap' | 'pallet' | 'other';

export type PackagingLayerType = 'primary' | 'secondary' | 'tertiary' | 'transport';

export interface ProductPackaging {
  id: string;
  tenantId: string;
  productId: string;
  layerType: PackagingLayerType;
  sortOrder: number;
  packagingType?: PackagingType;
  packagingDescription?: string;
  heightCm?: number;
  widthCm?: number;
  depthCm?: number;
  weightG?: number;
  material?: string;
  recyclable?: boolean;
  recyclingCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  manufacturer: string;
  gtin: string; // Global Trade Item Number
  serialNumber: string;
  productionDate: string;
  expirationDate?: string;
  category: string;
  description: string;
  materials: Material[];
  certifications: Certification[];
  carbonFootprint?: CarbonFootprint;
  recyclability: RecyclabilityInfo;
  supplyChain: SupplyChainEntry[];
  imageUrl?: string;

  // Zollrelevante Felder
  hsCode?: string; // Zolltarifnummer
  batchNumber?: string; // Chargennummer
  countryOfOrigin?: string; // Herkunftsland
  netWeight?: number; // Nettogewicht in Gramm
  grossWeight?: number; // Bruttogewicht in Gramm

  // Erweiterte Herstellerdetails
  manufacturerAddress?: string;
  manufacturerEORI?: string; // Economic Operators Registration and Identification
  manufacturerVAT?: string; // Umsatzsteuer-Identifikationsnummer

  // Feature Pack extensions
  registrations?: ProductRegistrations;
  supportResources?: SupportResources;
  images?: ProductImage[];

  // Multi-language translations
  translations?: Record<string, TranslatableProductFields>;

  // Manufacturer/Importer supplier references
  manufacturerSupplierId?: string | null;
  importerSupplierId?: string | null;

  // Product Sets / Bundles
  productType?: 'single' | 'set';
  components?: ProductComponent[];
  aggregationOverrides?: AggregationOverrides;

  // Product Dimensions (cm)
  productHeightCm?: number;
  productWidthCm?: number;
  productDepthCm?: number;

  // Packaging Details
  packagingType?: PackagingType;
  packagingDescription?: string;
  packagingHeightCm?: number;
  packagingWidthCm?: number;
  packagingDepthCm?: number;

  // ============================================
  // ESPR COMPLIANCE FIELDS
  // ============================================

  // Identification & Economic Operators
  uniqueProductId?: string; // UID per ISO/IEC 15459
  importerName?: string;
  importerEORI?: string;
  authorizedRepresentative?: AuthorizedRepresentative;
  dppResponsible?: DppResponsible;

  // Materials & Substances
  substancesOfConcern?: SubstanceOfConcern[];
  recycledContentPercentage?: number; // 0-100

  // Sustainability
  energyConsumptionKWh?: number;
  durabilityYears?: number;
  repairabilityScore?: number; // 0-100

  // Recycling & End-of-Life
  disassemblyInstructions?: string;
  endOfLifeInstructions?: string;

  // Conformity & Certifications
  euDeclarationOfConformity?: string; // URL
  testReports?: string[]; // Array of URLs
  ceMarking?: boolean;
  userManualUrl?: string;
  safetyInformation?: string;

  // Customs Data
  customsValue?: number; // EUR
  preferenceProof?: string; // EUR.1, REX, etc.

  // Product Sets
  componentDppUrls?: string[];

  // DPP Registry
  dppRegistryId?: string;
}

export interface TranslatableProductFields {
  name?: string;
  description?: string;
  recyclingInstructions?: string;
  packagingInstructions?: string;
  supportResources?: Partial<SupportResources>;
}

export interface ProductBatch {
  id: string;
  tenantId: string;
  productId: string;
  batchNumber?: string;
  serialNumber: string;
  productionDate: string;
  expirationDate?: string;
  netWeight?: number;
  grossWeight?: number;
  quantity?: number;
  pricePerUnit?: number;
  currency?: string;
  supplierId?: string;
  supplierName?: string;
  status: 'draft' | 'live' | 'archived';
  notes?: string;
  // Override fields (null/undefined = inherit from product)
  materialsOverride?: Material[];
  certificationsOverride?: Certification[];
  carbonFootprintOverride?: CarbonFootprint;
  recyclabilityOverride?: RecyclabilityInfo;
  descriptionOverride?: string;
  // Dimensions & Packaging overrides (null/undefined = inherit from product)
  productHeightCm?: number;
  productWidthCm?: number;
  productDepthCm?: number;
  packagingType?: PackagingType;
  packagingDescription?: string;
  packagingHeightCm?: number;
  packagingWidthCm?: number;
  packagingDepthCm?: number;
  createdAt: string;
  updatedAt: string;
}

export interface BatchListItem {
  id: string;
  productId: string;
  batchNumber?: string;
  serialNumber: string;
  productionDate: string;
  quantity?: number;
  pricePerUnit?: number;
  currency?: string;
  supplierId?: string;
  supplierName?: string;
  status: 'draft' | 'live' | 'archived';
  hasOverrides: boolean;
  createdAt: string;
}

export interface ProductWithBatches {
  product: Product;
  batches: BatchListItem[];
}

export interface Material {
  name: string;
  percentage: number;
  recyclable: boolean;
  origin?: string;
  type?: 'product' | 'packaging';
}

export interface Certification {
  name: string;
  issuedBy: string;
  validUntil: string;
  certificateUrl?: string;
}

export interface CarbonFootprint {
  totalKgCO2: number;
  productionKgCO2: number;
  transportKgCO2: number;
  rating: 'A' | 'B' | 'C' | 'D' | 'E';
}

export interface RecyclabilityInfo {
  recyclablePercentage: number;
  instructions: string;
  disposalMethods: string[];
  packagingRecyclablePercentage?: number;
  packagingInstructions?: string;
  packagingDisposalMethods?: string[];
}

export interface SupplyChainEntry {
  step: number;
  location: string;
  country: string;
  date: string;
  description: string;
  processType?: string;
  transportMode?: string;
  status?: string;
  emissionsKg?: number;
  facilityIdentifier?: string; // GLN (Global Location Number)
}

// ============================================
// PRODUCT SETS / BUNDLES
// ============================================

export interface ProductComponent {
  id: string;
  parentProductId: string;
  componentProductId: string;
  quantity: number;
  sortOrder: number;
  notes?: string;
  componentProduct?: ProductComponentSummary;
}

export interface ProductComponentSummary {
  id: string;
  name: string;
  gtin: string;
  manufacturer: string;
  category: string;
  imageUrl?: string;
  materials: Material[];
  carbonFootprint?: CarbonFootprint;
  recyclability: RecyclabilityInfo;
  netWeight?: number;
  grossWeight?: number;
}

export interface AggregationOverrides {
  materials?: boolean;
  carbonFootprint?: boolean;
  recyclability?: boolean;
  netWeight?: boolean;
  grossWeight?: boolean;
}

// ============================================
// ESPR COMPLIANCE TYPES
// ============================================

export interface SubstanceOfConcern {
  name: string;
  casNumber: string; // CAS Number
  ecNumber?: string; // EC Number
  concentration?: number; // Concentration in %
  scipId?: string; // SCIP Database ID
  svhcListed: boolean; // Is it a SVHC (Substance of Very High Concern)?
}

export interface AuthorizedRepresentative {
  name: string;
  address: string;
  email: string;
  phone?: string;
  eori?: string;
}

export interface DppResponsible {
  name: string;
  role: string;
  email: string;
  lastUpdate: string;
}
