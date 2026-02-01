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
  { key: 'materials', label: 'Material Composition', category: 'Materials' },
  { key: 'materialOrigins', label: 'Material Origin', category: 'Materials' },

  // Nachhaltigkeit
  { key: 'carbonFootprint', label: 'Carbon Footprint (kg)', category: 'Sustainability' },
  { key: 'carbonRating', label: 'CO2 Rating (A-E)', category: 'Sustainability' },

  // Recycling
  { key: 'recyclability', label: 'Recyclability (%)', category: 'Recycling' },
  { key: 'recyclingInstructions', label: 'Recycling Instructions', category: 'Recycling' },
  { key: 'disposalMethods', label: 'Disposal Methods', category: 'Recycling' },

  // Zertifizierungen
  { key: 'certifications', label: 'Certifications', category: 'Certifications' },
  { key: 'certificateDownloads', label: 'Certificate Downloads', category: 'Certifications' },

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
  if (!level) return true; // Unknown fields default to visible

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
