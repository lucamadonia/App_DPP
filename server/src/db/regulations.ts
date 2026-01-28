// Länderspezifische Regulierungen, Checklisten, Piktogramme
// Diese Daten könnten später in die Datenbank verschoben werden

export interface CountryRegulation {
  code: string;
  name: string;
  flag: string;
  regulations: Regulation[];
  pictograms: Pictogram[];
  disposalSymbols: DisposalSymbol[];
  labelingRequirements: LabelingRequirement[];
}

export interface Regulation {
  id: string;
  name: string;
  description: string;
  category: 'environment' | 'safety' | 'labeling' | 'recycling' | 'chemicals';
  mandatory: boolean;
  effectiveDate: string;
  link?: string;
  applicableTo: string[]; // product categories
}

export interface Pictogram {
  id: string;
  name: string;
  symbol: string; // emoji or icon reference
  description: string;
  category: string;
  mandatory: boolean;
}

export interface DisposalSymbol {
  id: string;
  name: string;
  symbol: string;
  description: string;
  materials: string[];
}

export interface LabelingRequirement {
  id: string;
  name: string;
  description: string;
  mandatory: boolean;
  applicableTo: string[];
}

export interface ComplianceChecklist {
  id: string;
  countryCode: string;
  productCategory: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  mandatory: boolean;
  category: string;
  documentRequired: boolean;
  regulationRef?: string;
}

export interface News {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'regulation' | 'deadline' | 'update' | 'warning';
  countries: string[];
  productCategories: string[];
  publishedAt: string;
  effectiveDate?: string;
  link?: string;
}

// EU-weite Regulierungen
export const euRegulations: Regulation[] = [
  {
    id: 'espr',
    name: 'Ecodesign for Sustainable Products Regulation (ESPR)',
    description: 'Rahmenverordnung für nachhaltige Produkte mit DPP-Anforderungen',
    category: 'environment',
    mandatory: true,
    effectiveDate: '2024-07-18',
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781',
    applicableTo: ['all'],
  },
  {
    id: 'battery-regulation',
    name: 'EU Batterieverordnung',
    description: 'Verpflichtender DPP für Batterien ab 2027',
    category: 'environment',
    mandatory: true,
    effectiveDate: '2027-02-18',
    applicableTo: ['batteries', 'electronics'],
  },
  {
    id: 'reach',
    name: 'REACH Verordnung',
    description: 'Registrierung, Bewertung, Zulassung und Beschränkung chemischer Stoffe',
    category: 'chemicals',
    mandatory: true,
    effectiveDate: '2007-06-01',
    applicableTo: ['all'],
  },
  {
    id: 'rohs',
    name: 'RoHS Richtlinie',
    description: 'Beschränkung gefährlicher Stoffe in Elektrogeräten',
    category: 'chemicals',
    mandatory: true,
    effectiveDate: '2006-07-01',
    applicableTo: ['electronics'],
  },
  {
    id: 'weee',
    name: 'WEEE Richtlinie',
    description: 'Elektro- und Elektronikgeräte-Abfall',
    category: 'recycling',
    mandatory: true,
    effectiveDate: '2005-08-13',
    applicableTo: ['electronics'],
  },
  {
    id: 'textile-regulation',
    name: 'EU Textilkennzeichnungsverordnung',
    description: 'Vorschriften zur Kennzeichnung von Textilerzeugnissen',
    category: 'labeling',
    mandatory: true,
    effectiveDate: '2012-05-08',
    applicableTo: ['textiles'],
  },
];

// Länderspezifische Daten
export const countryRegulations: CountryRegulation[] = [
  {
    code: 'DE',
    name: 'Deutschland',
    flag: '🇩🇪',
    regulations: [
      {
        id: 'de-battg',
        name: 'Batteriegesetz (BattG)',
        description: 'Nationale Umsetzung der EU-Batterieverordnung',
        category: 'recycling',
        mandatory: true,
        effectiveDate: '2009-12-01',
        applicableTo: ['batteries', 'electronics'],
      },
      {
        id: 'de-elektrog',
        name: 'Elektro- und Elektronikgerätegesetz (ElektroG)',
        description: 'Registrierungspflicht bei stiftung ear',
        category: 'recycling',
        mandatory: true,
        effectiveDate: '2005-03-23',
        applicableTo: ['electronics'],
      },
      {
        id: 'de-verpackg',
        name: 'Verpackungsgesetz (VerpackG)',
        description: 'Systembeteiligungspflicht für Verpackungen',
        category: 'recycling',
        mandatory: true,
        effectiveDate: '2019-01-01',
        applicableTo: ['all'],
      },
      {
        id: 'de-prodsg',
        name: 'Produktsicherheitsgesetz (ProdSG)',
        description: 'Allgemeine Produktsicherheitsanforderungen',
        category: 'safety',
        mandatory: true,
        effectiveDate: '2011-12-01',
        applicableTo: ['all'],
      },
    ],
    pictograms: [
      { id: 'de-gruener-punkt', name: 'Der Grüne Punkt', symbol: '♻️', description: 'Lizenziertes Verpackungsrecycling', category: 'recycling', mandatory: false },
      { id: 'de-weee', name: 'Durchgestrichene Mülltonne', symbol: '🗑️❌', description: 'Nicht im Hausmüll entsorgen', category: 'disposal', mandatory: true },
    ],
    disposalSymbols: [
      { id: 'de-pet', name: 'PET', symbol: '♳', description: 'Polyethylenterephthalat', materials: ['PET', 'Polyester'] },
      { id: 'de-hdpe', name: 'HDPE', symbol: '♴', description: 'Hochdichtes Polyethylen', materials: ['HDPE'] },
      { id: 'de-pvc', name: 'PVC', symbol: '♵', description: 'Polyvinylchlorid', materials: ['PVC'] },
      { id: 'de-ldpe', name: 'LDPE', symbol: '♶', description: 'Niedrigdichtes Polyethylen', materials: ['LDPE'] },
      { id: 'de-pp', name: 'PP', symbol: '♷', description: 'Polypropylen', materials: ['PP'] },
      { id: 'de-ps', name: 'PS', symbol: '♸', description: 'Polystyrol', materials: ['PS'] },
    ],
    labelingRequirements: [
      { id: 'de-ce', name: 'CE-Kennzeichnung', description: 'Erforderlich für Produkte im EU-Binnenmarkt', mandatory: true, applicableTo: ['electronics', 'toys', 'machinery'] },
      { id: 'de-gtin', name: 'GTIN/EAN', description: 'Empfohlen für Einzelhandelsprodukte', mandatory: false, applicableTo: ['all'] },
    ],
  },
  {
    code: 'FR',
    name: 'Frankreich',
    flag: '🇫🇷',
    regulations: [
      {
        id: 'fr-agec',
        name: 'Loi AGEC (Anti-Gaspillage)',
        description: 'Anti-Verschwendungsgesetz mit Reparierbarkeitsindex',
        category: 'environment',
        mandatory: true,
        effectiveDate: '2021-01-01',
        applicableTo: ['electronics'],
      },
      {
        id: 'fr-repairability',
        name: 'Indice de Réparabilité',
        description: 'Verpflichtender Reparierbarkeitsindex für Elektronik',
        category: 'labeling',
        mandatory: true,
        effectiveDate: '2021-01-01',
        applicableTo: ['electronics'],
      },
      {
        id: 'fr-triman',
        name: 'Triman Symbol',
        description: 'Verpflichtendes Recycling-Symbol',
        category: 'recycling',
        mandatory: true,
        effectiveDate: '2015-01-01',
        applicableTo: ['all'],
      },
    ],
    pictograms: [
      { id: 'fr-triman', name: 'Triman', symbol: '🔄', description: 'Produkt ist recycelbar - zum Recycling geben', category: 'recycling', mandatory: true },
      { id: 'fr-repairability', name: 'Reparierbarkeitsindex', symbol: '🔧', description: 'Index von 0-10 für Reparierbarkeit', category: 'sustainability', mandatory: true },
    ],
    disposalSymbols: [],
    labelingRequirements: [
      { id: 'fr-repairability-label', name: 'Reparierbarkeitsindex', description: 'Sichtbar auf Produkt oder Verpackung', mandatory: true, applicableTo: ['electronics'] },
      { id: 'fr-triman-label', name: 'Triman Symbol', description: 'Auf allen recycelbaren Produkten', mandatory: true, applicableTo: ['all'] },
    ],
  },
  {
    code: 'AT',
    name: 'Österreich',
    flag: '🇦🇹',
    regulations: [
      {
        id: 'at-abfallwirtschaftsgesetz',
        name: 'Abfallwirtschaftsgesetz (AWG)',
        description: 'Österreichisches Abfallwirtschaftsgesetz',
        category: 'recycling',
        mandatory: true,
        effectiveDate: '2002-03-01',
        applicableTo: ['all'],
      },
      {
        id: 'at-verpackvo',
        name: 'Verpackungsverordnung',
        description: 'Regelungen für Verpackungen und Verpackungsabfälle',
        category: 'recycling',
        mandatory: true,
        effectiveDate: '2014-01-01',
        applicableTo: ['all'],
      },
    ],
    pictograms: [
      { id: 'at-ara', name: 'ARA Lizenz', symbol: '♻️', description: 'Altstoff Recycling Austria', category: 'recycling', mandatory: false },
    ],
    disposalSymbols: [],
    labelingRequirements: [],
  },
  {
    code: 'IT',
    name: 'Italien',
    flag: '🇮🇹',
    regulations: [
      {
        id: 'it-d254',
        name: 'Decreto Legislativo 254/2016',
        description: 'Umweltkennzeichnung für Verpackungen',
        category: 'labeling',
        mandatory: true,
        effectiveDate: '2023-01-01',
        applicableTo: ['all'],
      },
    ],
    pictograms: [
      { id: 'it-env-label', name: 'Umweltkennzeichnung', symbol: '🏷️', description: 'Verpflichtende Umweltinformationen auf Verpackungen', category: 'environment', mandatory: true },
    ],
    disposalSymbols: [],
    labelingRequirements: [
      { id: 'it-material-code', name: 'Materialcodes', description: 'Alphanumerische Codes nach Entscheidung 129/97/CE', mandatory: true, applicableTo: ['all'] },
    ],
  },
];

// Aktuelle News und Updates
export const regulatoryNews: News[] = [
  {
    id: 'news-1',
    title: 'EU Digital Product Passport wird ab 2027 für Textilien verpflichtend',
    summary: 'Die EU-Kommission hat die Einführung des DPP für Textilien bestätigt.',
    content: 'Ab 2027 müssen alle Textilprodukte, die in der EU verkauft werden, einen Digital Product Passport haben. Dies umfasst Kleidung, Heimtextilien und technische Textilien.',
    category: 'regulation',
    countries: ['EU'],
    productCategories: ['textiles'],
    publishedAt: '2024-11-15',
    effectiveDate: '2027-01-01',
  },
  {
    id: 'news-2',
    title: 'Frankreich verschärft Reparierbarkeitsindex',
    summary: 'Neue Produktkategorien werden ab 2025 einbezogen.',
    content: 'Der französische Reparierbarkeitsindex wird auf weitere Produktkategorien ausgeweitet. Ab 2025 müssen auch Haushaltsgeräte und Gartengeräte den Index anzeigen.',
    category: 'update',
    countries: ['FR'],
    productCategories: ['electronics', 'appliances'],
    publishedAt: '2024-10-20',
    effectiveDate: '2025-01-01',
  },
  {
    id: 'news-3',
    title: 'Batterieverordnung: QR-Code-Anforderungen konkretisiert',
    summary: 'EU veröffentlicht technische Spezifikationen für Batterie-DPP.',
    content: 'Die EU-Kommission hat die technischen Anforderungen für den QR-Code auf Batterien veröffentlicht. Der Code muss mindestens 4x4mm groß sein und einen direkten Link zum DPP enthalten.',
    category: 'deadline',
    countries: ['EU'],
    productCategories: ['batteries'],
    publishedAt: '2024-12-01',
    effectiveDate: '2027-02-18',
  },
  {
    id: 'news-4',
    title: 'SCIP-Datenbank: Neue Meldeschwellen ab 2025',
    summary: 'ECHA aktualisiert Anforderungen für SVHC-Meldungen.',
    content: 'Die Europäische Chemikalienagentur hat neue Schwellenwerte für die SCIP-Datenbank festgelegt. Produkte mit mehr als 0,1% SVHC müssen gemeldet werden.',
    category: 'warning',
    countries: ['EU'],
    productCategories: ['all'],
    publishedAt: '2024-09-15',
    effectiveDate: '2025-01-01',
  },
];

// Checklisten pro Land und Produktkategorie
export const complianceChecklists: ComplianceChecklist[] = [
  {
    id: 'de-electronics',
    countryCode: 'DE',
    productCategory: 'electronics',
    items: [
      { id: '1', title: 'CE-Kennzeichnung angebracht', description: 'CE-Zeichen muss sichtbar auf Produkt oder Verpackung sein', mandatory: true, category: 'safety', documentRequired: false, regulationRef: 'ce-marking' },
      { id: '2', title: 'EU-Konformitätserklärung erstellt', description: 'DoC mit allen angewandten Normen', mandatory: true, category: 'safety', documentRequired: true, regulationRef: 'ce-marking' },
      { id: '3', title: 'stiftung ear Registrierung', description: 'Registrierung als Hersteller/Bevollmächtigter', mandatory: true, category: 'recycling', documentRequired: true, regulationRef: 'de-elektrog' },
      { id: '4', title: 'WEEE-Symbol auf Produkt', description: 'Durchgestrichene Mülltonne gemäß EN 50419', mandatory: true, category: 'recycling', documentRequired: false, regulationRef: 'weee' },
      { id: '5', title: 'RoHS-Konformität dokumentiert', description: 'Keine verbotenen Stoffe über Grenzwerten', mandatory: true, category: 'chemicals', documentRequired: true, regulationRef: 'rohs' },
      { id: '6', title: 'REACH SVHC-Prüfung', description: 'Prüfung auf besonders besorgniserregende Stoffe', mandatory: true, category: 'chemicals', documentRequired: true, regulationRef: 'reach' },
      { id: '7', title: 'Technische Dokumentation', description: 'Vollständige technische Unterlagen aufbewahrt', mandatory: true, category: 'safety', documentRequired: true },
      { id: '8', title: 'Betriebsanleitung in Deutsch', description: 'Sicherheitshinweise in Landessprache', mandatory: true, category: 'labeling', documentRequired: true },
    ],
  },
  {
    id: 'de-textiles',
    countryCode: 'DE',
    productCategory: 'textiles',
    items: [
      { id: '1', title: 'Textilkennzeichnung', description: 'Fasergehalt in %, sortiert nach Gewichtsanteil', mandatory: true, category: 'labeling', documentRequired: false, regulationRef: 'textile-regulation' },
      { id: '2', title: 'Herkunftsangabe bei tierischen Fasern', description: 'Bei Wolle, Seide etc. Tierart angeben', mandatory: true, category: 'labeling', documentRequired: false },
      { id: '3', title: 'REACH SVHC-Prüfung', description: 'Prüfung auf besonders besorgniserregende Stoffe', mandatory: true, category: 'chemicals', documentRequired: true, regulationRef: 'reach' },
      { id: '4', title: 'Pflegekennzeichnung', description: 'Internationale Pflegesymbole (optional aber empfohlen)', mandatory: false, category: 'labeling', documentRequired: false },
      { id: '5', title: 'OEKO-TEX oder vergleichbar', description: 'Schadstoffprüfung empfohlen', mandatory: false, category: 'chemicals', documentRequired: true },
    ],
  },
  {
    id: 'fr-electronics',
    countryCode: 'FR',
    productCategory: 'electronics',
    items: [
      { id: '1', title: 'CE-Kennzeichnung', description: 'CE-Zeichen auf Produkt oder Verpackung', mandatory: true, category: 'safety', documentRequired: false },
      { id: '2', title: 'Reparierbarkeitsindex', description: 'Index von 0-10 sichtbar am Point of Sale', mandatory: true, category: 'sustainability', documentRequired: false, regulationRef: 'fr-repairability' },
      { id: '3', title: 'Triman Symbol', description: 'Recycling-Symbol auf Verpackung', mandatory: true, category: 'recycling', documentRequired: false, regulationRef: 'fr-triman' },
      { id: '4', title: 'Info-tri Kennzeichnung', description: 'Entsorgungshinweise für Verbraucher', mandatory: true, category: 'recycling', documentRequired: false },
      { id: '5', title: 'Ersatzteil-Verfügbarkeit', description: 'Information über Ersatzteilverfügbarkeit (min. 5 Jahre)', mandatory: true, category: 'sustainability', documentRequired: false, regulationRef: 'fr-agec' },
      { id: '6', title: 'Software-Updates', description: 'Information über Dauer der Software-Unterstützung', mandatory: true, category: 'sustainability', documentRequired: false },
    ],
  },
];

// Helper Funktionen
export function getRegulationsForCountry(countryCode: string): CountryRegulation | undefined {
  return countryRegulations.find(c => c.code === countryCode);
}

export function getChecklistForProduct(countryCode: string, category: string): ComplianceChecklist | undefined {
  return complianceChecklists.find(c => c.countryCode === countryCode && c.productCategory === category);
}

export function getNewsForCountry(countryCode: string): News[] {
  return regulatoryNews.filter(n => n.countries.includes(countryCode) || n.countries.includes('EU'));
}

export function getNewsForCategory(category: string): News[] {
  return regulatoryNews.filter(n => n.productCategories.includes(category) || n.productCategories.includes('all'));
}
