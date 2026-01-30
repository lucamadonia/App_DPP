export interface Requirement {
  id: string;
  name: string;
  description: string;
  detailedDescription: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  countries: string[];
  documents: string[];
  registrations: string[];
  symbols: string[];
  deadlines?: string;
  costs?: string;
  authority: string;
  penalties: string;
  tips: string[];
  links?: { title: string; url: string }[];
}

// Umfassende Anforderungsdatenbank
export const requirementsDatabase: Requirement[] = [
  // === CE-KENNZEICHNUNG ===
  {
    id: 'ce-marking',
    name: 'CE Marking',
    description: 'Conformity marking for the EU internal market',
    detailedDescription: 'The CE mark must be affixed to the product, packaging, or accompanying documents. Minimum height 5mm, correct proportions according to Annex II Decision 768/2008/EC.',
    category: 'Product Safety',
    priority: 'critical',
    countries: ['EU', 'DE', 'FR', 'AT', 'IT', 'ES', 'NL', 'BE', 'PL', 'SE', 'DK', 'CZ', 'PT'],
    documents: ['EU Declaration of Conformity', 'Technical Documentation', 'Risk Analysis'],
    registrations: [],
    symbols: ['CE'],
    authority: 'Market Surveillance Authorities',
    penalties: 'Up to 100,000 EUR fine, sales ban, product recall',
    tips: [
      'Only affix CE mark once all directives are fulfilled',
      'Comply with proportions and minimum size',
      'Retain DoC for at least 10 years',
    ],
    links: [
      { title: 'EU Blue Guide', url: 'https://ec.europa.eu/growth/single-market/goods/blue-guide_en' },
    ],
  },
  {
    id: 'lvd',
    name: 'Low Voltage Directive (LVD)',
    description: 'Electrical safety for 50-1000V AC / 75-1500V DC',
    detailedDescription: 'Testing for electrical safety according to relevant EN standards. Protection against electric shock, thermal hazards, mechanical hazards.',
    category: 'Product Safety',
    priority: 'critical',
    countries: ['EU'],
    documents: ['LVD Test Report', 'Circuit Diagrams', 'Bill of Materials'],
    registrations: [],
    symbols: ['CE'],
    authority: 'BAuA, Market Surveillance',
    penalties: 'Up to 100,000 EUR fine, product recall',
    tips: [
      'Testing by accredited laboratory recommended',
      'Safety instructions in local language',
    ],
  },
  {
    id: 'emv',
    name: 'EMC Directive',
    description: 'Electromagnetic Compatibility',
    detailedDescription: 'Testing for electromagnetic emission and immunity. Compliance with limits for conducted and radiated disturbances.',
    category: 'Product Safety',
    priority: 'critical',
    countries: ['EU'],
    documents: ['EMC Test Report'],
    registrations: [],
    symbols: ['CE'],
    authority: 'Federal Network Agency, BAuA',
    penalties: 'Up to 100,000 EUR fine',
    tips: [
      'Consider EMC early in development',
      'Plan for shielding and filtering',
    ],
  },
  {
    id: 'red',
    name: 'Radio Equipment Directive (RED)',
    description: 'Requirements for radio products (WiFi, Bluetooth, etc.)',
    detailedDescription: 'For all devices with radio functions. Covers safety, EMC, and efficient use of radio spectrum. Additional cybersecurity requirements from 2025.',
    category: 'Product Safety',
    priority: 'critical',
    countries: ['EU'],
    documents: ['RED Test Report', 'Radio Testing', 'SAR Measurement if applicable'],
    registrations: [],
    symbols: ['CE', 'Frequency indication'],
    authority: 'Federal Network Agency',
    penalties: 'Up to 500,000 EUR fine',
    tips: [
      'Check frequency usage in target countries',
      'SAR measurement for body-worn use',
      'Notified Body for certain frequencies',
    ],
  },

  // === ELEKTROGERÄTE ===
  {
    id: 'weee-de',
    name: 'ElektroG / WEEE Registration (DE)',
    description: 'Registration with stiftung ear for electrical equipment in Germany',
    detailedDescription: 'Before placing electrical equipment on the German market, registration with stiftung ear is required. Deposit guarantee, register brands, submit quantity reports.',
    category: 'Electrical Equipment',
    priority: 'critical',
    countries: ['DE'],
    documents: ['ear Registration Confirmation'],
    registrations: ['stiftung ear'],
    symbols: ['WEEE Symbol (crossed-out wheelie bin)'],
    deadlines: 'Before first placing on the market',
    costs: 'Registration fee + guarantee + disposal contributions',
    authority: 'stiftung ear, UBA',
    penalties: 'Up to 100,000 EUR fine, sales ban',
    tips: [
      'Complete registration before first sale',
      'WEEE number on B2B invoices',
      'Register all brands',
    ],
    links: [
      { title: 'stiftung ear', url: 'https://www.stiftung-ear.de/' },
    ],
  },
  {
    id: 'weee-fr',
    name: 'DEEE Registration (FR)',
    description: 'Registration with eco-organisme for electrical equipment in France',
    detailedDescription: 'Registration with ecosystem or Ecologic. Contribution payments based on quantities and product categories.',
    category: 'Electrical Equipment',
    priority: 'critical',
    countries: ['FR'],
    documents: ['REP Contract', 'Unique Identifier'],
    registrations: ['ecosystem', 'Ecologic'],
    symbols: ['WEEE Symbol', 'Triman'],
    authority: 'ADEME',
    penalties: 'Up to 200,000 EUR fine',
    tips: [
      'Unique Identifier on invoices',
      'Consider eco-modulation',
    ],
    links: [
      { title: 'ecosystem', url: 'https://www.ecosystem.eco/' },
    ],
  },

  // === BATTERIEN ===
  {
    id: 'battery-de',
    name: 'Battery Act Registration (DE)',
    description: 'Registration with stiftung ear for batteries',
    detailedDescription: 'Registration before placing batteries on the market. Also applies to devices with built-in batteries.',
    category: 'Batteries',
    priority: 'critical',
    countries: ['DE'],
    documents: ['BattG Registration', 'Take-back system contract'],
    registrations: ['stiftung ear - Batteries'],
    symbols: ['Battery symbol', 'Pb/Cd/Hg if applicable', 'Capacity indication'],
    authority: 'stiftung ear, UBA',
    penalties: 'Up to 100,000 EUR fine, sales ban',
    tips: [
      'Also for permanently installed batteries',
      'Indicate capacity in mAh/Ah',
      'Choose take-back system (e.g. GRS)',
    ],
  },
  {
    id: 'battery-dpp',
    name: 'Digital Battery Passport (EU)',
    description: 'DPP for industrial and EV batteries from 2027',
    detailedDescription: 'From 18.02.2027 for batteries >2kWh: Digital Product Passport with QR code, containing identification, material composition, carbon footprint, performance parameters.',
    category: 'Batteries',
    priority: 'high',
    countries: ['EU'],
    documents: ['Digital Battery Passport', 'Carbon Footprint Declaration'],
    registrations: [],
    symbols: ['QR Code for DPP'],
    deadlines: '18.02.2027',
    authority: 'EU Commission',
    penalties: 'Sales ban',
    tips: [
      'Start data collection now',
      'Follow technical specifications',
    ],
  },

  // === VERPACKUNG ===
  {
    id: 'packaging-de',
    name: 'Packaging Act (DE)',
    description: 'LUCID registration and system participation',
    detailedDescription: 'Registration with LUCID before placing on the market. System participation with a Dual System for all sales packaging for private end consumers.',
    category: 'Packaging',
    priority: 'critical',
    countries: ['DE'],
    documents: ['LUCID Registration', 'System Contract'],
    registrations: ['LUCID', 'Dual System'],
    symbols: [],
    authority: 'Central Agency Packaging Register',
    penalties: 'Up to 200,000 EUR fine, sales ban',
    tips: [
      'First LUCID, then system contract',
      'Submit quantity reports on time',
      'Completeness declaration from 80,000 kg',
    ],
    links: [
      { title: 'LUCID', url: 'https://lucid.verpackungsregister.org/' },
    ],
  },
  {
    id: 'packaging-fr',
    name: 'Packaging REP (FR)',
    description: 'CITEO registration for packaging in France',
    detailedDescription: 'Registration with CITEO or another approved eco-organisme. Triman symbol and Info-tri labeling required.',
    category: 'Packaging',
    priority: 'critical',
    countries: ['FR'],
    documents: ['REP Contract Packaging'],
    registrations: ['CITEO', 'Léko'],
    symbols: ['Triman', 'Info-tri'],
    authority: 'ADEME',
    penalties: 'Up to 100,000 EUR fine',
    tips: [
      'Triman on product or packaging',
      'Info-tri with sorting instructions',
    ],
    links: [
      { title: 'CITEO', url: 'https://www.citeo.com/' },
    ],
  },

  // === RoHS ===
  {
    id: 'rohs',
    name: 'RoHS Compliance',
    description: 'Restriction of hazardous substances in electrical equipment',
    detailedDescription: 'Compliance with limits for 10 restricted substances. RoHS declaration is part of the EU Declaration of Conformity.',
    category: 'Chemicals',
    priority: 'critical',
    countries: ['EU'],
    documents: ['RoHS Declaration', 'Material Analyses', 'Supplier Declarations'],
    registrations: [],
    symbols: [],
    authority: 'BAuA, Market Surveillance',
    penalties: 'Up to 100,000 EUR fine, product recall',
    tips: [
      'Systematically collect supplier declarations',
      'Random sample testing by laboratory',
      'Document exemptions',
    ],
  },

  // === REACH ===
  {
    id: 'reach-svhc',
    name: 'REACH SVHC Assessment',
    description: 'Assessment for substances of very high concern',
    detailedDescription: 'Assessment for 230+ SVHC substances. If content >0.1%: information obligation and SCIP notification.',
    category: 'Chemicals',
    priority: 'high',
    countries: ['EU'],
    documents: ['SVHC Analysis', 'SCIP Notification', 'Art. 33 Information'],
    registrations: ['SCIP Database'],
    symbols: [],
    authority: 'ECHA, BAuA',
    penalties: 'Up to 50,000 EUR fine',
    tips: [
      'Check candidate list regularly',
      'Query supply chain',
      'SCIP notification before placing on the market',
    ],
    links: [
      { title: 'ECHA SCIP', url: 'https://echa.europa.eu/de/scip' },
    ],
  },

  // === ENERGIEKENNZEICHNUNG ===
  {
    id: 'energy-label',
    name: 'EU Energy Label',
    description: 'Energy efficiency class labeling',
    detailedDescription: 'For certain product groups: energy label at POS and EPREL registration. Label with QR code to database.',
    category: 'Energy',
    priority: 'high',
    countries: ['EU'],
    documents: ['Energy Label', 'Product Data Sheet', 'EPREL Registration'],
    registrations: ['EPREL Database'],
    symbols: ['EU Energy Label A-G', 'QR Code'],
    authority: 'BAM, Market Surveillance',
    penalties: 'Up to 50,000 EUR fine',
    tips: [
      'EPREL before market launch',
      'Label on product and in advertising',
    ],
    links: [
      { title: 'EPREL', url: 'https://eprel.ec.europa.eu/' },
    ],
  },

  // === FRANKREICH SPEZIFISCH ===
  {
    id: 'repairability-fr',
    name: 'Repairability Index (FR)',
    description: 'Index 0-10 at point of sale',
    detailedDescription: 'For certain electronics: repairability index (0-10) displayed at POS. Evaluates documentation, disassembly, spare parts, prices.',
    category: 'Sustainability',
    priority: 'critical',
    countries: ['FR'],
    documents: ['Repairability Index Calculation'],
    registrations: [],
    symbols: ['Repairability Index logo with value'],
    authority: 'DGCCRF',
    penalties: 'Up to 15,000 EUR per product',
    tips: [
      'Use ADEME calculation tool',
      'Index at POS and online',
      'Follow color scale',
    ],
    links: [
      { title: 'ADEME Repairability', url: 'https://www.indicereparabilite.fr/' },
    ],
  },
  {
    id: 'spare-parts-fr',
    name: 'Spare Parts Availability (FR)',
    description: 'Information on availability duration at POS',
    detailedDescription: 'Indication of spare parts availability duration (min. 5-10 years depending on category). Delivery time max. 15 days.',
    category: 'Sustainability',
    priority: 'high',
    countries: ['FR'],
    documents: [],
    registrations: [],
    symbols: [],
    authority: 'DGCCRF',
    penalties: 'Competition violation',
    tips: [
      'Availability at POS and online',
      'Have spare parts list ready',
    ],
  },

  // === TEXTILIEN ===
  {
    id: 'textile-label',
    name: 'Textile Labeling',
    description: 'Fiber composition in percent',
    detailedDescription: 'Indication of fiber composition in descending order. Only standardized fiber designations according to EU Regulation 1007/2011.',
    category: 'Textiles',
    priority: 'critical',
    countries: ['EU'],
    documents: [],
    registrations: [],
    symbols: ['Fiber labeling'],
    authority: 'Consumer Protection, Market Surveillance',
    penalties: 'Up to 50,000 EUR fine',
    tips: [
      'Only standardized designations',
      'Percentage values with tolerance +/-3%',
    ],
  },
  {
    id: 'textile-azodyes',
    name: 'Azo Dyes (REACH)',
    description: 'Prohibition of certain azo dyes in textiles',
    detailedDescription: 'Textiles with skin contact must not contain prohibited azo dyes. Limit value 30 mg/kg per amine.',
    category: 'Textiles',
    priority: 'critical',
    countries: ['EU'],
    documents: ['Azo Dye Test Report'],
    registrations: [],
    symbols: [],
    authority: 'ECHA, Market Surveillance',
    penalties: 'Sales ban, fine',
    tips: [
      'Laboratory testing for risk products',
      'Only certified dye houses',
    ],
  },
];
