import type { ProductRegistrations, SupportResources, ProductImage } from './database';

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
