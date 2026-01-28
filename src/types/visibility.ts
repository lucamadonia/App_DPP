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
  version: 2;
  fields: FieldVisibilityConfig;
}

// Sichtbarkeitsstufen-Definitionen
export const visibilityLevels: { value: VisibilityLevel; label: string; description: string; icon: string }[] = [
  {
    value: 'internal',
    label: 'Nur intern',
    description: 'Nur im Admin-Bereich sichtbar',
    icon: 'lock'
  },
  {
    value: 'customs',
    label: 'Zoll',
    description: 'Sichtbar für Zoll und intern',
    icon: 'shield'
  },
  {
    value: 'consumer',
    label: 'Verbraucher',
    description: 'Öffentlich für alle sichtbar',
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

    // Beispiel für interne Felder (können vom Admin hinzugefügt werden)
    // internalNotes: 'internal',
    // costPrice: 'internal',
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
  { key: 'name', label: 'Produktname', category: 'Grunddaten' },
  { key: 'image', label: 'Produktbild', category: 'Grunddaten' },
  { key: 'description', label: 'Beschreibung', category: 'Grunddaten' },
  { key: 'manufacturer', label: 'Hersteller', category: 'Grunddaten' },
  { key: 'category', label: 'Kategorie', category: 'Grunddaten' },

  // Identifikatoren
  { key: 'gtin', label: 'GTIN', category: 'Identifikatoren', description: 'Global Trade Item Number' },
  { key: 'serialNumber', label: 'Seriennummer', category: 'Identifikatoren' },
  { key: 'batchNumber', label: 'Chargennummer', category: 'Identifikatoren' },

  // Materialien
  { key: 'materials', label: 'Materialzusammensetzung', category: 'Materialien' },
  { key: 'materialOrigins', label: 'Materialherkunft', category: 'Materialien' },

  // Nachhaltigkeit
  { key: 'carbonFootprint', label: 'CO2-Fußabdruck (kg)', category: 'Nachhaltigkeit' },
  { key: 'carbonRating', label: 'CO2-Bewertung (A-E)', category: 'Nachhaltigkeit' },

  // Recycling
  { key: 'recyclability', label: 'Recyclingfähigkeit (%)', category: 'Recycling' },
  { key: 'recyclingInstructions', label: 'Recycling-Anleitung', category: 'Recycling' },
  { key: 'disposalMethods', label: 'Entsorgungsmethoden', category: 'Recycling' },

  // Zertifizierungen
  { key: 'certifications', label: 'Zertifizierungen', category: 'Zertifizierungen' },
  { key: 'certificateDownloads', label: 'Zertifikat-Downloads', category: 'Zertifizierungen' },

  // Lieferkette
  { key: 'supplyChainSimple', label: 'Lieferkette (vereinfacht)', category: 'Lieferkette' },
  { key: 'supplyChainFull', label: 'Lieferkette (vollständig)', category: 'Lieferkette' },

  // Zollrelevante Felder
  { key: 'hsCode', label: 'HS-Code', category: 'Zolldaten', description: 'Zolltarifnummer' },
  { key: 'countryOfOrigin', label: 'Herkunftsland', category: 'Zolldaten' },
  { key: 'netWeight', label: 'Nettogewicht (g)', category: 'Zolldaten' },
  { key: 'grossWeight', label: 'Bruttogewicht (g)', category: 'Zolldaten' },
  { key: 'manufacturerAddress', label: 'Herstelleradresse', category: 'Zolldaten' },
  { key: 'manufacturerEORI', label: 'EORI-Nummer', category: 'Zolldaten', description: 'Economic Operators Registration and Identification' },
  { key: 'manufacturerVAT', label: 'USt-IdNr.', category: 'Zolldaten', description: 'Umsatzsteuer-Identifikationsnummer' },
];

// Kategorien für die Gruppierung in den Einstellungen
export const fieldCategories = [
  'Grunddaten',
  'Identifikatoren',
  'Materialien',
  'Nachhaltigkeit',
  'Recycling',
  'Zertifizierungen',
  'Lieferkette',
  'Zolldaten',
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
  const level = config.fields[field];
  if (!level) return false;

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
