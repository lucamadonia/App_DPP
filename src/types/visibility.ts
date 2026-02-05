// Sichtbarkeitskonfiguration für DPP-Felder

// Sichtbarkeitsstufen für jedes Feld
export type VisibilityLevel = 'internal' | 'customs' | 'consumer';

// Neue Struktur: Jedes Feld hat eine Sichtbarkeitsstufe
export interface FieldVisibilityConfig {
  [fieldKey: string]: VisibilityLevel;
}

// Legacy-Struktur für Abwärtskompatibilität
export interface FieldVisibility {
  [fieldKey: string]: boolean;
}

export interface VisibilityConfig {
  consumer: FieldVisibility;
  customs: FieldVisibility;
}

// Neue Konfigurationsstruktur
export interface VisibilityConfigV2 {
  id?: string;
  version: 2;
  fields: FieldVisibilityConfig;
}

// Sichtbarkeitsstufen-Definitionen
export const visibilityLevels: { value: VisibilityLevel; label: string; description: string; icon: string }[] = [
  {
    value: 'internal',
    label: 'Internal Only',
    description: 'Only visible in admin area',
    icon: 'lock'
  },
  {
    value: 'customs',
    label: 'Customs',
    description: 'Visible for customs and admin',
    icon: 'shield'
  },
  {
    value: 'consumer',
    label: 'Consumer',
    description: 'Publicly visible for everyone',
    icon: 'users'
  },
];

// Neue Standardkonfiguration mit Sichtbarkeitsstufen (V2)
export const defaultVisibilityConfigV2: VisibilityConfigV2 = {
  version: 2,
  fields: {
    // Grundlegende Produktinfos - öffentlich für Verbraucher
    name: 'consumer',
    image: 'consumer',
    description: 'consumer',
    manufacturer: 'consumer',
    category: 'consumer',

    // Materialien - öffentlich für Verbraucher
    materials: 'consumer',
    materialOrigins: 'consumer',

    // Verpackung - öffentlich für Verbraucher
    packagingMaterials: 'consumer',
    packagingRecyclability: 'consumer',
    packagingRecyclingInstructions: 'consumer',
    packagingDisposalMethods: 'consumer',

    // Nachhaltigkeit - öffentlich für Verbraucher
    carbonFootprint: 'consumer',
    carbonRating: 'consumer',

    // Recycling - öffentlich für Verbraucher
    recyclability: 'consumer',
    recyclingInstructions: 'consumer',
    disposalMethods: 'consumer',

    // Zertifizierungen - öffentlich für Verbraucher
    certifications: 'consumer',

    // Lieferkette
    supplyChainSimple: 'consumer',  // Vereinfacht für Verbraucher
    supplyChainFull: 'customs',     // Vollständig nur für Zoll
    supplyChainProcessType: 'consumer',
    supplyChainTransport: 'customs',
    supplyChainEmissions: 'consumer',
    supplyChainCost: 'internal',

    // Identifikatoren - nur für Zoll
    gtin: 'customs',
    serialNumber: 'customs',
    batchNumber: 'customs',

    // Zollrelevante Felder - nur für Zoll
    hsCode: 'customs',
    countryOfOrigin: 'customs',
    netWeight: 'customs',
    grossWeight: 'customs',
    manufacturerAddress: 'customs',
    manufacturerEORI: 'customs',
    manufacturerVAT: 'customs',
    certificateDownloads: 'customs',

    // Set Components
    setComponents: 'consumer',

    // Support
    supportResources: 'consumer',
    supportWarranty: 'consumer',
    supportFaq: 'consumer',
    supportVideos: 'consumer',
    supportRepair: 'consumer',
    supportSpareParts: 'consumer',
  },
};

// Legacy Standardkonfiguration für Abwärtskompatibilität
export const defaultVisibilityConfig: VisibilityConfig = {
  consumer: {
    // Grundlegende Produktinfos
    name: true,
    image: true,
    description: true,
    manufacturer: true,
    category: true,

    // Materialien
    materials: true,
    materialOrigins: true,

    // Verpackung
    packagingMaterials: true,
    packagingRecyclability: true,
    packagingRecyclingInstructions: true,
    packagingDisposalMethods: true,

    // Nachhaltigkeit
    carbonFootprint: true,
    carbonRating: true,

    // Recycling
    recyclability: true,
    recyclingInstructions: true,
    disposalMethods: true,

    // Zertifizierungen
    certifications: true,

    // Lieferkette (vereinfacht)
    supplyChainSimple: true,
    supplyChainProcessType: true,
    supplyChainTransport: false,
    supplyChainEmissions: true,
    supplyChainCost: false,

    // Set Components
    setComponents: true,

    // Identifikatoren (für Verbraucher ausgeblendet)
    gtin: false,
    serialNumber: false,
    batchNumber: false,

    // Zollrelevante Felder (für Verbraucher ausgeblendet)
    hsCode: false,
    countryOfOrigin: false,
    netWeight: false,
    grossWeight: false,
    manufacturerAddress: false,
    manufacturerEORI: false,
    manufacturerVAT: false,
    supplyChainFull: false,
    certificateDownloads: false,
  },
  customs: {
    // Grundlegende Produktinfos
    name: true,
    image: true,
    description: true,
    manufacturer: true,
    category: true,

    // Materialien
    materials: true,
    materialOrigins: true,

    // Verpackung
    packagingMaterials: true,
    packagingRecyclability: true,
    packagingRecyclingInstructions: true,
    packagingDisposalMethods: true,

    // Nachhaltigkeit
    carbonFootprint: true,
    carbonRating: true,

    // Recycling
    recyclability: true,
    recyclingInstructions: true,
    disposalMethods: true,

    // Zertifizierungen
    certifications: true,

    // Lieferkette
    supplyChainSimple: true,
    supplyChainFull: true,
    supplyChainProcessType: true,
    supplyChainTransport: true,
    supplyChainEmissions: true,
    supplyChainCost: false,

    // Set Components
    setComponents: true,

    // Identifikatoren (für Zoll sichtbar)
    gtin: true,
    serialNumber: true,
    batchNumber: true,

    // Zollrelevante Felder (für Zoll sichtbar)
    hsCode: true,
    countryOfOrigin: true,
    netWeight: true,
    grossWeight: true,
    manufacturerAddress: true,
    manufacturerEORI: true,
    manufacturerVAT: true,
    certificateDownloads: true,
  },
};

// Felddefinitionen mit Labels und Kategorien
export interface FieldDefinition {
  key: string;
  label: string;
  category: string;
  description?: string;
}

export const fieldDefinitions: FieldDefinition[] = [
  // Grundlegende Produktinfos
  { key: 'name', label: 'Product Name', category: 'Basic Data' },
  { key: 'image', label: 'Product Image', category: 'Basic Data' },
  { key: 'description', label: 'Description', category: 'Basic Data' },
  { key: 'manufacturer', label: 'Manufacturer', category: 'Basic Data' },
  { key: 'category', label: 'Category', category: 'Basic Data' },

  // Identifikatoren
  { key: 'gtin', label: 'GTIN', category: 'Identifiers', description: 'Global Trade Item Number' },
  { key: 'serialNumber', label: 'Serial Number', category: 'Identifiers' },
  { key: 'batchNumber', label: 'Batch Number', category: 'Identifiers' },

  // Materialien
  { key: 'materials', label: 'Material Composition', category: 'Materials', description: 'Product materials (excluding packaging)' },

  // Nachhaltigkeit
  { key: 'carbonFootprint', label: 'Carbon Footprint', category: 'Sustainability', description: 'CO2 footprint with rating (A-E)' },

  // Recycling
  { key: 'recyclability', label: 'Recyclability', category: 'Recycling', description: 'Recyclability percentage, instructions, and disposal methods' },

  // Zertifizierungen
  { key: 'certifications', label: 'Certifications', category: 'Certifications', description: 'Product certifications with certificate URLs' },

  // Lieferkette
  { key: 'supplyChainSimple', label: 'Supply Chain (simplified)', category: 'Supply Chain' },
  { key: 'supplyChainFull', label: 'Supply Chain (full)', category: 'Supply Chain' },
  { key: 'supplyChainProcessType', label: 'Process Type', category: 'Supply Chain' },
  { key: 'supplyChainTransport', label: 'Transport Mode', category: 'Supply Chain' },
  { key: 'supplyChainEmissions', label: 'CO2 Emissions per Step', category: 'Supply Chain' },
  { key: 'supplyChainCost', label: 'Supply Chain Cost', category: 'Supply Chain' },

  // Zollrelevante Felder
  { key: 'hsCode', label: 'HS-Code', category: 'Customs Data', description: 'Customs tariff number' },
  { key: 'countryOfOrigin', label: 'Country of Origin', category: 'Customs Data' },
  { key: 'netWeight', label: 'Net Weight (g)', category: 'Customs Data' },
  { key: 'grossWeight', label: 'Gross Weight (g)', category: 'Customs Data' },
  { key: 'manufacturerAddress', label: 'Manufacturer Address', category: 'Customs Data' },
  { key: 'manufacturerEORI', label: 'EORI Number', category: 'Customs Data', description: 'Economic Operators Registration and Identification' },
  { key: 'manufacturerVAT', label: 'VAT ID', category: 'Customs Data', description: 'Value Added Tax Identification Number' },

  // Set Components
  { key: 'setComponents', label: 'Set Components', category: 'Set / Bundle', description: 'Components of a product set' },

  // Support
  { key: 'supportResources', label: 'Support Information', category: 'Support' },
  { key: 'supportWarranty', label: 'Warranty', category: 'Support' },
  { key: 'supportFaq', label: 'FAQ', category: 'Support' },
  { key: 'supportVideos', label: 'Videos', category: 'Support' },
  { key: 'supportRepair', label: 'Repair Information', category: 'Support' },
  { key: 'supportSpareParts', label: 'Spare Parts', category: 'Support' },
];

// Kategorien für die Gruppierung in den Einstellungen
export const fieldCategories = [
  'Basic Data',
  'Identifiers',
  'Materials',
  'Sustainability',
  'Recycling',
  'Certifications',
  'Supply Chain',
  'Customs Data',
  'Set / Bundle',
  'Support',
];

// Hilfsfunktion zum Laden der V2-Konfiguration
export function loadVisibilityConfigV2(): VisibilityConfigV2 {
  const saved = localStorage.getItem('dpp-visibility-settings-v2');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.version === 2) {
        return parsed;
      }
    } catch {
      // Fallback zu Standard
    }
  }
  return defaultVisibilityConfigV2;
}

// Hilfsfunktion zum Speichern der V2-Konfiguration
export function saveVisibilityConfigV2(config: VisibilityConfigV2): void {
  localStorage.setItem('dpp-visibility-settings-v2', JSON.stringify(config));
}

// Konvertiere V2-Konfiguration zu Legacy-Format für die PublicProductPage
export function convertV2ToLegacy(configV2: VisibilityConfigV2): VisibilityConfig {
  const consumer: FieldVisibility = {};
  const customs: FieldVisibility = {};

  for (const [field, level] of Object.entries(configV2.fields)) {
    // Verbraucher sieht nur Felder mit Level 'consumer'
    consumer[field] = level === 'consumer';
    // Zoll sieht Felder mit Level 'consumer' oder 'customs'
    customs[field] = level === 'consumer' || level === 'customs';
  }

  return { consumer, customs };
}

// Hilfsfunktion zum Laden der Sichtbarkeitseinstellungen aus localStorage (Legacy)
export function loadVisibilityConfig(): VisibilityConfig {
  // Zuerst V2 versuchen und konvertieren
  const savedV2 = localStorage.getItem('dpp-visibility-settings-v2');
  if (savedV2) {
    try {
      const parsed = JSON.parse(savedV2);
      if (parsed.version === 2) {
        return convertV2ToLegacy(parsed);
      }
    } catch {
      // Fallback
    }
  }

  // Fallback auf alte Konfiguration
  const saved = localStorage.getItem('dpp-visibility-settings');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return defaultVisibilityConfig;
    }
  }
  return defaultVisibilityConfig;
}

// Hilfsfunktion zum Speichern der Sichtbarkeitseinstellungen in localStorage (Legacy)
export function saveVisibilityConfig(config: VisibilityConfig): void {
  localStorage.setItem('dpp-visibility-settings', JSON.stringify(config));
}

// Prüfe ob ein Feld für eine bestimmte Ansicht sichtbar ist
export function isFieldVisibleForView(
  config: VisibilityConfigV2,
  field: string,
  view: 'consumer' | 'customs' | 'internal'
): boolean {
  // Fall back to default visibility if field not in config
  const level = config.fields[field] || defaultVisibilityConfigV2.fields[field];
  if (!level) return false; // Unknown fields default to HIDDEN (security fix)

  switch (view) {
    case 'consumer':
      return level === 'consumer';
    case 'customs':
      return level === 'consumer' || level === 'customs';
    case 'internal':
      return true; // Intern sieht alles
    default:
      return false;
  }
}

// ============================================
// V3 VISIBILITY SYSTEM - INDEPENDENT TOGGLES
// ============================================

/**
 * V3: Independent visibility flags for each field.
 * Consumer and Customs are now separate booleans (no hierarchy).
 */
export interface IndependentFieldVisibility {
  consumer: boolean;
  customs: boolean;
}

/**
 * V3 Visibility Configuration.
 * Each field has independent consumer/customs visibility flags.
 */
export interface VisibilityConfigV3 {
  id?: string;
  version: 3;
  fields: {
    [fieldKey: string]: IndependentFieldVisibility;
  };
}

/**
 * Default V3 configuration with corrected field names
 * (removed non-existent fields like packagingMaterials, carbonRating, certificateDownloads)
 */
export const defaultVisibilityConfigV3: VisibilityConfigV3 = {
  version: 3,
  fields: {
    // Basic Data - Public
    name: { consumer: true, customs: true },
    image: { consumer: true, customs: true },
    description: { consumer: true, customs: true },
    manufacturer: { consumer: true, customs: true },
    category: { consumer: true, customs: true },

    // Identifiers - Customs only
    gtin: { consumer: false, customs: true },
    serialNumber: { consumer: false, customs: true },
    batchNumber: { consumer: false, customs: true },

    // Materials - Public
    materials: { consumer: true, customs: true },

    // Sustainability - Public
    carbonFootprint: { consumer: true, customs: true },

    // Recycling - Public
    recyclability: { consumer: true, customs: true },

    // Certifications - Public
    certifications: { consumer: true, customs: true },

    // Supply Chain - Mixed
    supplyChainSimple: { consumer: true, customs: true },
    supplyChainFull: { consumer: false, customs: true },
    supplyChainProcessType: { consumer: true, customs: true },
    supplyChainTransport: { consumer: false, customs: true },
    supplyChainEmissions: { consumer: true, customs: true },
    supplyChainCost: { consumer: false, customs: false }, // Internal only

    // Customs Data - Customs only
    hsCode: { consumer: false, customs: true },
    countryOfOrigin: { consumer: false, customs: true },
    netWeight: { consumer: false, customs: true },
    grossWeight: { consumer: false, customs: true },
    manufacturerAddress: { consumer: false, customs: true },
    manufacturerEORI: { consumer: false, customs: true },
    manufacturerVAT: { consumer: false, customs: true },

    // Set Components - Public
    setComponents: { consumer: true, customs: true },

    // Support - Public
    supportResources: { consumer: true, customs: true },
    supportWarranty: { consumer: true, customs: true },
    supportFaq: { consumer: true, customs: true },
    supportVideos: { consumer: true, customs: true },
    supportRepair: { consumer: true, customs: true },
    supportSpareParts: { consumer: true, customs: true },
  },
};

/**
 * Migrate V2 config to V3.
 * Converts hierarchical levels to independent boolean flags.
 */
export function migrateVisibilityV2toV3(v2: VisibilityConfigV2): VisibilityConfigV3 {
  const v3: VisibilityConfigV3 = { version: 3, fields: {} };

  for (const [field, level] of Object.entries(v2.fields)) {
    v3.fields[field] = {
      consumer: level === 'consumer',
      customs: level === 'consumer' || level === 'customs',
    };
  }

  return v3;
}

/**
 * Check if a field is visible for a specific view (V3).
 */
export function isFieldVisibleForViewV3(
  config: VisibilityConfigV3,
  field: string,
  view: 'consumer' | 'customs' | 'internal'
): boolean {
  const visibility = config.fields[field] || defaultVisibilityConfigV3.fields[field];

  if (!visibility) return false; // Unknown fields default to HIDDEN

  switch (view) {
    case 'consumer':
      return visibility.consumer;
    case 'customs':
      return visibility.customs;
    case 'internal':
      return true; // Admin sees everything
    default:
      return false;
  }
}
