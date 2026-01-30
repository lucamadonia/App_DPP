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

// English requirements database
const requirementsDatabaseEn: Requirement[] = [
  // === CE MARKING ===
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

  // === ELECTRICAL EQUIPMENT ===
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

  // === BATTERIES ===
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

  // === PACKAGING ===
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
    registrations: ['CITEO', 'L\u00E9ko'],
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

  // === ENERGY LABELING ===
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

  // === FRANCE SPECIFIC ===
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

  // === TEXTILES ===
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

// German requirements database
const requirementsDatabaseDe: Requirement[] = [
  // === CE-KENNZEICHNUNG ===
  {
    id: 'ce-marking',
    name: 'CE-Kennzeichnung',
    description: 'Konformit\u00E4tskennzeichnung f\u00FCr den EU-Binnenmarkt',
    detailedDescription: 'Die CE-Kennzeichnung muss auf dem Produkt, der Verpackung oder den Begleitdokumenten angebracht werden. Mindestgr\u00F6\u00DFe 5mm, korrekte Proportionen gem\u00E4\u00DF Anhang II Beschluss 768/2008/EG.',
    category: 'Produktsicherheit',
    priority: 'critical',
    countries: ['EU', 'DE', 'FR', 'AT', 'IT', 'ES', 'NL', 'BE', 'PL', 'SE', 'DK', 'CZ', 'PT'],
    documents: ['EU-Konformit\u00E4tserkl\u00E4rung', 'Technische Dokumentation', 'Risikoanalyse'],
    registrations: [],
    symbols: ['CE'],
    authority: 'Markt\u00FCberwachungsbeh\u00F6rden',
    penalties: 'Bis zu 100.000 EUR Bu\u00DFgeld, Verkaufsverbot, Produktr\u00FCckruf',
    tips: [
      'CE-Kennzeichnung erst anbringen, wenn alle Richtlinien erf\u00FCllt sind',
      'Proportionen und Mindestgr\u00F6\u00DFe einhalten',
      'Konformit\u00E4tserkl\u00E4rung mindestens 10 Jahre aufbewahren',
    ],
    links: [
      { title: 'EU Blue Guide', url: 'https://ec.europa.eu/growth/single-market/goods/blue-guide_en' },
    ],
  },
  {
    id: 'lvd',
    name: 'Niederspannungsrichtlinie (LVD)',
    description: 'Elektrische Sicherheit f\u00FCr 50-1000V AC / 75-1500V DC',
    detailedDescription: 'Pr\u00FCfung der elektrischen Sicherheit nach relevanten EN-Normen. Schutz gegen elektrischen Schlag, thermische Gefahren, mechanische Gefahren.',
    category: 'Produktsicherheit',
    priority: 'critical',
    countries: ['EU'],
    documents: ['LVD-Pr\u00FCfbericht', 'Schaltpl\u00E4ne', 'St\u00FCckliste'],
    registrations: [],
    symbols: ['CE'],
    authority: 'BAuA, Markt\u00FCberwachung',
    penalties: 'Bis zu 100.000 EUR Bu\u00DFgeld, Produktr\u00FCckruf',
    tips: [
      'Pr\u00FCfung durch akkreditiertes Labor empfohlen',
      'Sicherheitshinweise in Landessprache',
    ],
  },
  {
    id: 'emv',
    name: 'EMV-Richtlinie',
    description: 'Elektromagnetische Vertr\u00E4glichkeit',
    detailedDescription: 'Pr\u00FCfung auf elektromagnetische Emission und Immunit\u00E4t. Einhaltung der Grenzwerte f\u00FCr leitungsgebundene und abgestrahlte St\u00F6rungen.',
    category: 'Produktsicherheit',
    priority: 'critical',
    countries: ['EU'],
    documents: ['EMV-Pr\u00FCfbericht'],
    registrations: [],
    symbols: ['CE'],
    authority: 'Bundesnetzagentur, BAuA',
    penalties: 'Bis zu 100.000 EUR Bu\u00DFgeld',
    tips: [
      'EMV fr\u00FChzeitig in der Entwicklung ber\u00FCcksichtigen',
      'Schirmung und Filterung einplanen',
    ],
  },
  {
    id: 'red',
    name: 'Funkanlagenrichtlinie (RED)',
    description: 'Anforderungen an Funkprodukte (WiFi, Bluetooth usw.)',
    detailedDescription: 'F\u00FCr alle Ger\u00E4te mit Funkfunktionen. Umfasst Sicherheit, EMV und effiziente Nutzung des Funkspektrums. Zus\u00E4tzliche Cybersicherheitsanforderungen ab 2025.',
    category: 'Produktsicherheit',
    priority: 'critical',
    countries: ['EU'],
    documents: ['RED-Pr\u00FCfbericht', 'Funkpr\u00FCfung', 'SAR-Messung ggf.'],
    registrations: [],
    symbols: ['CE', 'Frequenzangabe'],
    authority: 'Bundesnetzagentur',
    penalties: 'Bis zu 500.000 EUR Bu\u00DFgeld',
    tips: [
      'Frequenznutzung in Zielm\u00E4rkten pr\u00FCfen',
      'SAR-Messung bei k\u00F6rpernaher Verwendung',
      'Benannte Stelle f\u00FCr bestimmte Frequenzen',
    ],
  },

  // === ELEKTROGER\u00C4TE ===
  {
    id: 'weee-de',
    name: 'ElektroG / WEEE-Registrierung (DE)',
    description: 'Registrierung bei stiftung ear f\u00FCr Elektroger\u00E4te in Deutschland',
    detailedDescription: 'Vor dem Inverkehrbringen von Elektroger\u00E4ten auf dem deutschen Markt ist eine Registrierung bei stiftung ear erforderlich. Garantie hinterlegen, Marken registrieren, Mengemeldungen abgeben.',
    category: 'Elektroger\u00E4te',
    priority: 'critical',
    countries: ['DE'],
    documents: ['ear-Registrierungsbest\u00E4tigung'],
    registrations: ['stiftung ear'],
    symbols: ['WEEE-Symbol (durchgestrichene M\u00FClltonne)'],
    deadlines: 'Vor dem erstmaligen Inverkehrbringen',
    costs: 'Registrierungsgeb\u00FChr + Garantie + Entsorgungsbeitr\u00E4ge',
    authority: 'stiftung ear, UBA',
    penalties: 'Bis zu 100.000 EUR Bu\u00DFgeld, Verkaufsverbot',
    tips: [
      'Registrierung vor erstem Verkauf abschlie\u00DFen',
      'WEEE-Nummer auf B2B-Rechnungen',
      'Alle Marken registrieren',
    ],
    links: [
      { title: 'stiftung ear', url: 'https://www.stiftung-ear.de/' },
    ],
  },
  {
    id: 'weee-fr',
    name: 'DEEE-Registrierung (FR)',
    description: 'Registrierung bei Eco-Organisme f\u00FCr Elektroger\u00E4te in Frankreich',
    detailedDescription: 'Registrierung bei ecosystem oder Ecologic. Beitragszahlungen basierend auf Mengen und Produktkategorien.',
    category: 'Elektroger\u00E4te',
    priority: 'critical',
    countries: ['FR'],
    documents: ['REP-Vertrag', 'Identifiant Unique'],
    registrations: ['ecosystem', 'Ecologic'],
    symbols: ['WEEE-Symbol', 'Triman'],
    authority: 'ADEME',
    penalties: 'Bis zu 200.000 EUR Bu\u00DFgeld',
    tips: [
      'Identifiant Unique auf Rechnungen',
      '\u00D6ko-Modulation ber\u00FCcksichtigen',
    ],
    links: [
      { title: 'ecosystem', url: 'https://www.ecosystem.eco/' },
    ],
  },

  // === BATTERIEN ===
  {
    id: 'battery-de',
    name: 'Batteriegesetz-Registrierung (DE)',
    description: 'Registrierung bei stiftung ear f\u00FCr Batterien',
    detailedDescription: 'Registrierung vor dem Inverkehrbringen von Batterien. Gilt auch f\u00FCr Ger\u00E4te mit fest eingebauten Batterien.',
    category: 'Batterien',
    priority: 'critical',
    countries: ['DE'],
    documents: ['BattG-Registrierung', 'R\u00FCcknahmesystemvertrag'],
    registrations: ['stiftung ear - Batterien'],
    symbols: ['Batteriesymbol', 'Pb/Cd/Hg falls zutreffend', 'Kapazit\u00E4tsangabe'],
    authority: 'stiftung ear, UBA',
    penalties: 'Bis zu 100.000 EUR Bu\u00DFgeld, Verkaufsverbot',
    tips: [
      'Auch f\u00FCr fest eingebaute Batterien',
      'Kapazit\u00E4t in mAh/Ah angeben',
      'R\u00FCcknahmesystem w\u00E4hlen (z.B. GRS)',
    ],
  },
  {
    id: 'battery-dpp',
    name: 'Digitaler Batteriepass (EU)',
    description: 'DPP f\u00FCr Industrie- und EV-Batterien ab 2027',
    detailedDescription: 'Ab 18.02.2027 f\u00FCr Batterien >2kWh: Digitaler Produktpass mit QR-Code, enth\u00E4lt Identifikation, Materialzusammensetzung, CO\u2082-Fu\u00DFabdruck, Leistungsparameter.',
    category: 'Batterien',
    priority: 'high',
    countries: ['EU'],
    documents: ['Digitaler Batteriepass', 'CO\u2082-Fu\u00DFabdruck-Erkl\u00E4rung'],
    registrations: [],
    symbols: ['QR-Code f\u00FCr DPP'],
    deadlines: '18.02.2027',
    authority: 'EU-Kommission',
    penalties: 'Verkaufsverbot',
    tips: [
      'Jetzt mit der Datenerhebung beginnen',
      'Technische Spezifikationen beachten',
    ],
  },

  // === VERPACKUNG ===
  {
    id: 'packaging-de',
    name: 'Verpackungsgesetz (DE)',
    description: 'LUCID-Registrierung und Systembeteiligung',
    detailedDescription: 'Registrierung bei LUCID vor dem Inverkehrbringen. Systembeteiligung bei einem Dualen System f\u00FCr alle Verkaufsverpackungen an private Endverbraucher.',
    category: 'Verpackung',
    priority: 'critical',
    countries: ['DE'],
    documents: ['LUCID-Registrierung', 'Systemvertrag'],
    registrations: ['LUCID', 'Duales System'],
    symbols: [],
    authority: 'Zentrale Stelle Verpackungsregister',
    penalties: 'Bis zu 200.000 EUR Bu\u00DFgeld, Verkaufsverbot',
    tips: [
      'Erst LUCID, dann Systemvertrag',
      'Mengenmeldungen fristgerecht abgeben',
      'Vollst\u00E4ndigkeitserkl\u00E4rung ab 80.000 kg',
    ],
    links: [
      { title: 'LUCID', url: 'https://lucid.verpackungsregister.org/' },
    ],
  },
  {
    id: 'packaging-fr',
    name: 'Verpackungs-REP (FR)',
    description: 'CITEO-Registrierung f\u00FCr Verpackungen in Frankreich',
    detailedDescription: 'Registrierung bei CITEO oder einem anderen zugelassenen Eco-Organisme. Triman-Symbol und Info-tri-Kennzeichnung erforderlich.',
    category: 'Verpackung',
    priority: 'critical',
    countries: ['FR'],
    documents: ['REP-Vertrag Verpackung'],
    registrations: ['CITEO', 'L\u00E9ko'],
    symbols: ['Triman', 'Info-tri'],
    authority: 'ADEME',
    penalties: 'Bis zu 100.000 EUR Bu\u00DFgeld',
    tips: [
      'Triman auf Produkt oder Verpackung',
      'Info-tri mit Sortierhinweisen',
    ],
    links: [
      { title: 'CITEO', url: 'https://www.citeo.com/' },
    ],
  },

  // === RoHS ===
  {
    id: 'rohs',
    name: 'RoHS-Konformit\u00E4t',
    description: 'Beschr\u00E4nkung gef\u00E4hrlicher Stoffe in Elektroger\u00E4ten',
    detailedDescription: 'Einhaltung der Grenzwerte f\u00FCr 10 beschr\u00E4nkte Stoffe. RoHS-Erkl\u00E4rung ist Teil der EU-Konformit\u00E4tserkl\u00E4rung.',
    category: 'Chemikalien',
    priority: 'critical',
    countries: ['EU'],
    documents: ['RoHS-Erkl\u00E4rung', 'Materialanalysen', 'Lieferantenerkl\u00E4rungen'],
    registrations: [],
    symbols: [],
    authority: 'BAuA, Markt\u00FCberwachung',
    penalties: 'Bis zu 100.000 EUR Bu\u00DFgeld, Produktr\u00FCckruf',
    tips: [
      'Lieferantenerkl\u00E4rungen systematisch einholen',
      'Stichprobenartige Labortests',
      'Ausnahmen dokumentieren',
    ],
  },

  // === REACH ===
  {
    id: 'reach-svhc',
    name: 'REACH SVHC-Pr\u00FCfung',
    description: 'Pr\u00FCfung auf besonders besorgniserregende Stoffe',
    detailedDescription: 'Pr\u00FCfung auf 230+ SVHC-Stoffe. Bei Gehalt >0,1%: Informationspflicht und SCIP-Meldung.',
    category: 'Chemikalien',
    priority: 'high',
    countries: ['EU'],
    documents: ['SVHC-Analyse', 'SCIP-Meldung', 'Art. 33 Information'],
    registrations: ['SCIP-Datenbank'],
    symbols: [],
    authority: 'ECHA, BAuA',
    penalties: 'Bis zu 50.000 EUR Bu\u00DFgeld',
    tips: [
      'Kandidatenliste regelm\u00E4\u00DFig pr\u00FCfen',
      'Lieferkette befragen',
      'SCIP-Meldung vor Inverkehrbringen',
    ],
    links: [
      { title: 'ECHA SCIP', url: 'https://echa.europa.eu/de/scip' },
    ],
  },

  // === ENERGIEKENNZEICHNUNG ===
  {
    id: 'energy-label',
    name: 'EU-Energielabel',
    description: 'Energieeffizienzklassen-Kennzeichnung',
    detailedDescription: 'F\u00FCr bestimmte Produktgruppen: Energielabel am POS und EPREL-Registrierung. Label mit QR-Code zur Datenbank.',
    category: 'Energie',
    priority: 'high',
    countries: ['EU'],
    documents: ['Energielabel', 'Produktdatenblatt', 'EPREL-Registrierung'],
    registrations: ['EPREL-Datenbank'],
    symbols: ['EU-Energielabel A-G', 'QR-Code'],
    authority: 'BAM, Markt\u00FCberwachung',
    penalties: 'Bis zu 50.000 EUR Bu\u00DFgeld',
    tips: [
      'EPREL vor Markteinf\u00FChrung',
      'Label am Produkt und in der Werbung',
    ],
    links: [
      { title: 'EPREL', url: 'https://eprel.ec.europa.eu/' },
    ],
  },

  // === FRANKREICH SPEZIFISCH ===
  {
    id: 'repairability-fr',
    name: 'Reparierbarkeitsindex (FR)',
    description: 'Index 0-10 am Point of Sale',
    detailedDescription: 'F\u00FCr bestimmte Elektronik: Reparierbarkeitsindex (0-10) am POS dargestellt. Bewertet Dokumentation, Demontage, Ersatzteile, Preise.',
    category: 'Nachhaltigkeit',
    priority: 'critical',
    countries: ['FR'],
    documents: ['Berechnung Reparierbarkeitsindex'],
    registrations: [],
    symbols: ['Reparierbarkeitsindex-Logo mit Wert'],
    authority: 'DGCCRF',
    penalties: 'Bis zu 15.000 EUR pro Produkt',
    tips: [
      'ADEME-Berechnungstool verwenden',
      'Index am POS und online',
      'Farbskala beachten',
    ],
    links: [
      { title: 'ADEME Reparierbarkeit', url: 'https://www.indicereparabilite.fr/' },
    ],
  },
  {
    id: 'spare-parts-fr',
    name: 'Ersatzteile-Verf\u00FCgbarkeit (FR)',
    description: 'Information zur Verf\u00FCgbarkeitsdauer am POS',
    detailedDescription: 'Angabe der Ersatzteile-Verf\u00FCgbarkeitsdauer (mind. 5-10 Jahre je nach Kategorie). Lieferzeit max. 15 Tage.',
    category: 'Nachhaltigkeit',
    priority: 'high',
    countries: ['FR'],
    documents: [],
    registrations: [],
    symbols: [],
    authority: 'DGCCRF',
    penalties: 'Wettbewerbsversto\u00DF',
    tips: [
      'Verf\u00FCgbarkeit am POS und online',
      'Ersatzteilliste bereithalten',
    ],
  },

  // === TEXTILIEN ===
  {
    id: 'textile-label',
    name: 'Textilkennzeichnung',
    description: 'Faserzusammensetzung in Prozent',
    detailedDescription: 'Angabe der Faserzusammensetzung in absteigender Reihenfolge. Nur genormte Faserbezeichnungen gem\u00E4\u00DF EU-Verordnung 1007/2011.',
    category: 'Textilien',
    priority: 'critical',
    countries: ['EU'],
    documents: [],
    registrations: [],
    symbols: ['Faserkennzeichnung'],
    authority: 'Verbraucherschutz, Markt\u00FCberwachung',
    penalties: 'Bis zu 50.000 EUR Bu\u00DFgeld',
    tips: [
      'Nur genormte Bezeichnungen verwenden',
      'Prozentangaben mit Toleranz +/-3%',
    ],
  },
  {
    id: 'textile-azodyes',
    name: 'Azofarbstoffe (REACH)',
    description: 'Verbot bestimmter Azofarbstoffe in Textilien',
    detailedDescription: 'Textilien mit Hautkontakt d\u00FCrfen keine verbotenen Azofarbstoffe enthalten. Grenzwert 30 mg/kg pro Amin.',
    category: 'Textilien',
    priority: 'critical',
    countries: ['EU'],
    documents: ['Azofarbstoff-Pr\u00FCfbericht'],
    registrations: [],
    symbols: [],
    authority: 'ECHA, Markt\u00FCberwachung',
    penalties: 'Verkaufsverbot, Bu\u00DFgeld',
    tips: [
      'Laborpr\u00FCfung bei Risikoprodukten',
      'Nur zertifizierte F\u00E4rbereien',
    ],
  },
];

// Backwards compatibility: default English export
export const requirementsDatabase = requirementsDatabaseEn;

/**
 * Get the requirements database in the specified locale.
 * @param locale - 'en' for English, 'de' for German. Defaults to 'en'.
 */
export function getRequirementsDatabase(locale: 'en' | 'de' = 'en'): Requirement[] {
  return locale === 'de' ? requirementsDatabaseDe : requirementsDatabaseEn;
}
