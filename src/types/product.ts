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
}

export interface SupplyChainEntry {
  step: number;
  location: string;
  country: string;
  date: string;
  description: string;
}
