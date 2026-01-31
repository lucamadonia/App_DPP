/**
 * Seed EU Regulations via Supabase REST API
 *
 * Inserts 23 EU regulations into the eu_regulations table.
 * Uses PostgREST upsert via Prefer: resolution=merge-duplicates.
 *
 * Usage:
 *   node scripts/seed-eu-regulations.mjs
 *
 * Environment variables (read from .env in project root if present):
 *   SUPABASE_URL               - e.g. https://xyzabc.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  - service-role secret (NOT the anon key)
 *
 * Falls back to VITE_SUPABASE_URL if SUPABASE_URL is not set.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Minimal .env parser - supports KEY=VALUE and KEY="VALUE" lines. */
function loadDotenv(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf-8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Load .env from project root (one level up from scripts/)
loadDotenv(resolve(__dirname, '..', '.env'));
loadDotenv(resolve(__dirname, '..', '.env.local'));

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'ERROR: Missing environment variables.\n' +
    'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n' +
    '(or their VITE_ prefixed equivalents) in .env or as env vars.'
  );
  process.exit(1);
}

const REST_BASE = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1`;
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Supabase REST helper
// ---------------------------------------------------------------------------

async function supabaseRequest(path, options = {}) {
  const url = `${REST_BASE}/${path}`;
  const method = options.method || 'GET';

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
    ...options.headers,
  };

  const res = await fetch(url, { ...options, method, headers });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase ${method} ${path} failed (${res.status}): ${body}`);
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------
// EU Regulations Data (23 regulations)
// ---------------------------------------------------------------------------
// NOTE: The DB schema CHECK constraint limits category to:
//   'environment', 'chemicals', 'recycling', 'safety', 'energy'
// We map the broader categories as follows:
//   sustainability/trade/digital/labeling -> environment
//   chemicals -> chemicals
//   recycling -> recycling
//   safety -> safety
//   energy -> energy

const EU_REGULATIONS = [
  // 1. ESPR - Ecodesign for Sustainable Products Regulation
  {
    name: 'ESPR',
    full_name: 'Ecodesign for Sustainable Products Regulation (EU) 2024/1781',
    description: 'Framework regulation establishing ecodesign requirements for sustainable products placed on the EU market. Introduces Digital Product Passports (DPP) as mandatory requirement for most product categories. Replaces the previous Ecodesign Directive 2009/125/EC with a broader scope beyond energy-related products.',
    category: 'environment',
    status: 'active',
    effective_date: '2024-07-18',
    application_date: '2027-07-18',
    key_requirements: [
      'Digital Product Passport (DPP) for all regulated product groups',
      'Durability, reparability, and recyclability requirements',
      'Minimum recycled content thresholds',
      'Ban on destruction of unsold consumer products',
      'Substance of concern disclosure',
      'Carbon footprint declaration',
      'Performance requirements set via delegated acts'
    ],
    affected_products: ['Textiles', 'Electronics', 'Furniture', 'Construction Products', 'Batteries', 'Tyres', 'Detergents', 'Paints', 'Iron and Steel'],
    dpp_deadlines: {
      textiles: '2027-Q3',
      batteries: '2027-Q1',
      electronics: '2028-Q1',
      furniture: '2028-Q3',
      iron_and_steel: '2029-Q1',
      construction_products: '2029-Q3',
      tyres: '2028-Q2',
      general: 'Phased rollout 2027-2030 via delegated acts'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781'
  },

  // 2. Battery Regulation
  {
    name: 'Battery Regulation',
    full_name: 'Regulation (EU) 2023/1542 concerning batteries and waste batteries',
    description: 'Comprehensive regulation covering the entire lifecycle of batteries from design and production to end-of-life management. First EU regulation to mandate Digital Product Passports. Establishes sustainability, safety, labelling, and end-of-life requirements for all battery types.',
    category: 'recycling',
    status: 'active',
    effective_date: '2023-08-17',
    application_date: '2027-02-18',
    key_requirements: [
      'Battery passport for EV and industrial batteries >2kWh',
      'Carbon footprint declaration and performance classes',
      'Minimum recycled content (cobalt, lead, lithium, nickel)',
      'Collection and recycling targets',
      'Due diligence for raw material sourcing',
      'QR code linking to battery passport',
      'State of health monitoring for EV batteries',
      'Labelling with hazard symbols and recycling information'
    ],
    affected_products: ['Portable Batteries', 'Industrial Batteries', 'EV Batteries', 'LMT Batteries', 'SLI Batteries'],
    dpp_deadlines: {
      carbon_footprint_declaration: '2025-02-18',
      carbon_footprint_classes: '2026-08-18',
      battery_passport_ev: '2027-02-18',
      battery_passport_industrial: '2027-02-18',
      recycled_content_documentation: '2028-08-18',
      recycled_content_targets: '2031-08-18'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542'
  },

  // 3. WEEE Directive
  {
    name: 'WEEE',
    full_name: 'Directive 2012/19/EU on Waste Electrical and Electronic Equipment',
    description: 'Directive establishing collection, recycling, and recovery targets for electrical and electronic equipment. Requires producers to finance the collection, treatment, and environmentally sound disposal of WEEE. Applies the extended producer responsibility (EPR) principle.',
    category: 'recycling',
    status: 'active',
    effective_date: '2012-08-13',
    application_date: '2014-02-14',
    key_requirements: [
      'Producer registration in each Member State',
      'Collection target of 65% of EEE placed on market',
      'Recovery and recycling targets per category',
      'Crossed-out wheeled bin marking on products',
      'Financial guarantees for collection and recycling',
      'Reporting obligations on quantities placed on market',
      'Treatment at authorized facilities only'
    ],
    affected_products: ['Large Household Appliances', 'Small Household Appliances', 'IT Equipment', 'Consumer Electronics', 'Lighting', 'Electrical Tools', 'Toys and Sports Equipment', 'Medical Devices', 'Monitoring Instruments', 'Automatic Dispensers'],
    dpp_deadlines: {
      registration: 'Before placing on market',
      annual_reporting: 'Yearly by March 31',
      collection_target_65: 'Since 2019'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32012L0019'
  },

  // 4. RoHS Directive
  {
    name: 'RoHS',
    full_name: 'Directive 2011/65/EU on the Restriction of Hazardous Substances in EEE',
    description: 'Restricts the use of specific hazardous materials found in electrical and electronic products. Limits concentrations of lead, mercury, cadmium, hexavalent chromium, PBB, and PBDE, plus four additional phthalates (DEHP, BBP, DBP, DIBP).',
    category: 'chemicals',
    status: 'active',
    effective_date: '2011-07-21',
    application_date: '2013-01-02',
    key_requirements: [
      'Maximum concentration values for 10 restricted substances',
      'CE marking and EU Declaration of Conformity',
      'Technical documentation for compliance',
      'Exemption management and renewal process',
      'Supply chain due diligence on substance content',
      'Testing and material declarations from suppliers'
    ],
    affected_products: ['Large Household Appliances', 'Small Household Appliances', 'IT Equipment', 'Consumer Electronics', 'Lighting', 'Electrical Tools', 'Toys', 'Medical Devices', 'Control Instruments', 'Automatic Dispensers', 'Cables'],
    dpp_deadlines: {
      compliance: 'Before placing on market',
      documentation_retention: '10 years after product placed on market',
      phthalates_restriction: 'Since 2019-07-22'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011L0065'
  },

  // 5. REACH Regulation
  {
    name: 'REACH',
    full_name: 'Regulation (EC) No 1907/2006 on Registration, Evaluation, Authorisation and Restriction of Chemicals',
    description: 'EU framework regulation for chemicals management. Requires manufacturers and importers to register substances manufactured or imported in quantities of 1 tonne or more per year. Establishes the SVHC (Substances of Very High Concern) Candidate List and Authorisation List.',
    category: 'chemicals',
    status: 'active',
    effective_date: '2006-12-18',
    application_date: '2007-06-01',
    key_requirements: [
      'Registration of substances >1 tonne/year with ECHA',
      'Safety Data Sheet (SDS) provision in supply chain',
      'SVHC notification for articles containing >0.1% w/w',
      'Authorisation required for Annex XIV substances',
      'Restriction compliance for Annex XVII substances',
      'Communication of SVHC presence to customers',
      'SCIP database notification for waste management'
    ],
    affected_products: ['Chemicals', 'Textiles', 'Electronics', 'Plastics', 'Cosmetics', 'Construction Products', 'Furniture', 'Automotive Parts', 'Toys', 'All manufactured articles'],
    dpp_deadlines: {
      registration: 'Before manufacturing/importing >1 tonne/year',
      scip_notification: 'Before placing article on market',
      svhc_communication: 'Within 45 days of customer request',
      candidate_list_update: 'Twice yearly (June and January)'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32006R1907'
  },

  // 6. CLP Regulation
  {
    name: 'CLP',
    full_name: 'Regulation (EC) No 1272/2008 on Classification, Labelling and Packaging of Substances and Mixtures',
    description: 'Implements the Globally Harmonized System (GHS) in the EU for classifying and labelling chemicals. Ensures that hazards are clearly communicated to workers and consumers through standardized labels and Safety Data Sheets.',
    category: 'chemicals',
    status: 'active',
    effective_date: '2009-01-20',
    application_date: '2010-12-01',
    key_requirements: [
      'Classification of substances and mixtures according to GHS criteria',
      'Hazard pictograms (GHS01-GHS09) on labels',
      'Signal words (Danger/Warning) on labels',
      'Hazard and precautionary statements (H/P statements)',
      'Notification to ECHA Classification & Labelling Inventory',
      'Poison Centre Notification (PCN) via Annex VIII',
      'UFI (Unique Formula Identifier) on labels for mixtures'
    ],
    affected_products: ['Chemical Substances', 'Chemical Mixtures', 'Detergents', 'Paints', 'Adhesives', 'Inks', 'Cleaning Products', 'Biocides', 'Pesticides'],
    dpp_deadlines: {
      substance_classification: 'Before placing on market',
      mixture_classification: 'Before placing on market',
      pcn_industrial: '2024-01-01',
      pcn_consumer_professional: '2021-01-01',
      ufi_requirement: 'Mandatory for all new mixtures'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008R1272'
  },

  // 7. ErP Directive (Ecodesign)
  {
    name: 'ErP',
    full_name: 'Directive 2009/125/EC establishing a framework for Ecodesign Requirements for Energy-related Products',
    description: 'Framework directive for setting mandatory ecodesign requirements for energy-related products sold in the EU. Being gradually superseded by ESPR (EU 2024/1781) but existing implementing measures remain in force during transition.',
    category: 'energy',
    status: 'active',
    effective_date: '2009-11-20',
    application_date: '2009-11-20',
    key_requirements: [
      'Minimum energy efficiency requirements per product group',
      'Maximum standby/off-mode power consumption',
      'Product-specific implementing measures via delegated regulations',
      'CE marking and EU Declaration of Conformity',
      'Technical documentation with energy calculations',
      'Information requirements for users (manuals, labelling)'
    ],
    affected_products: ['Electric Motors', 'Lighting', 'Heating Systems', 'Cooling and Ventilation', 'TVs and Displays', 'Washing Machines', 'Dishwashers', 'Refrigerators', 'Vacuum Cleaners', 'Water Pumps', 'Servers', 'Power Supplies'],
    dpp_deadlines: {
      compliance: 'Before placing on market',
      transition_to_espr: '2027 onwards for new delegated acts',
      existing_measures: 'Remain valid until replaced by ESPR implementing acts'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0125'
  },

  // 8. Energy Labelling Regulation
  {
    name: 'Energy Labelling',
    full_name: 'Regulation (EU) 2017/1369 setting a framework for energy labelling',
    description: 'Establishes the framework for mandatory energy labels on energy-related products. The rescaled A-G label system helps consumers make informed purchasing decisions. Products are registered in the European Product Registry for Energy Labelling (EPREL).',
    category: 'energy',
    status: 'active',
    effective_date: '2017-08-01',
    application_date: '2019-11-01',
    key_requirements: [
      'Energy label displayed at point of sale (physical and online)',
      'Product registration in EPREL database',
      'Rescaled A-G energy efficiency classes',
      'Product fiche with technical specifications',
      'QR code on label linking to EPREL entry',
      'Supplier and dealer obligations for label provision',
      'Advertisement requirements showing energy class'
    ],
    affected_products: ['Refrigerators', 'Washing Machines', 'Dishwashers', 'TVs and Displays', 'Light Sources', 'Tyres', 'Air Conditioners', 'Tumble Dryers', 'Ovens', 'Range Hoods'],
    dpp_deadlines: {
      eprel_registration: 'Before placing on market',
      rescaled_labels: 'Since 2021-03-01 (major appliances)',
      light_sources: 'Since 2021-09-01',
      future_rescaling: 'When >=30% of products reach class A or >=50% reach class A+B'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R1369'
  },

  // 9. EUDR - EU Deforestation Regulation
  {
    name: 'EUDR',
    full_name: 'Regulation (EU) 2023/1115 on deforestation-free products',
    description: 'Prohibits placing or making available on the EU market products that have contributed to deforestation or forest degradation. Requires due diligence statements with geolocation data for all relevant commodities. Applies to cattle, cocoa, coffee, oil palm, rubber, soya, and wood.',
    category: 'environment',
    status: 'upcoming',
    effective_date: '2023-06-29',
    application_date: '2025-12-30',
    key_requirements: [
      'Due diligence system for deforestation-free supply chains',
      'Geolocation coordinates for all production plots',
      'Due diligence statements submitted via EU IT system',
      'Benchmarking system for country risk assessment',
      'Traceability from production to EU market',
      'Annual reporting for large operators',
      'Third-party verification for high-risk countries'
    ],
    affected_products: ['Cattle (leather, meat)', 'Cocoa (chocolate)', 'Coffee', 'Oil Palm (palm oil)', 'Rubber', 'Soya', 'Wood (furniture, paper, packaging)', 'Derived Products'],
    dpp_deadlines: {
      large_operators: '2025-12-30',
      sme_operators: '2026-06-30',
      due_diligence_statements: 'Before placing on market or export',
      benchmarking_system: '2024-12-30'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1115'
  },

  // 10. F-Gas Regulation
  {
    name: 'F-Gas Regulation',
    full_name: 'Regulation (EU) 2024/573 on fluorinated greenhouse gases',
    description: 'Revised regulation on fluorinated greenhouse gases aiming to reduce EU F-gas emissions by 98% by 2050 compared to 2015 levels. Strengthens the phase-down schedule for HFCs, introduces new bans, and enhances leak detection and reporting requirements.',
    category: 'environment',
    status: 'active',
    effective_date: '2024-03-20',
    application_date: '2025-01-01',
    key_requirements: [
      'Accelerated HFC phase-down (quota system)',
      'Bans on specific F-gas uses by product type',
      'Mandatory leak detection and repair',
      'F-gas handling certification for personnel',
      'Import/export quota management via F-Gas Portal',
      'Record-keeping and reporting of quantities',
      'Recovery and destruction obligations'
    ],
    affected_products: ['Refrigeration Equipment', 'Air Conditioning', 'Heat Pumps', 'Switchgear (SF6)', 'Aerosols', 'Foams', 'Fire Protection Equipment', 'Solvents'],
    dpp_deadlines: {
      new_bans_refrigerants: '2025-01-01',
      split_ac_ban: '2027-01-01',
      sf6_switchgear_ban: '2026-01-01',
      full_hfc_phasedown: '2050-01-01'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R0573'
  },

  // 11. POPs Regulation
  {
    name: 'POPs',
    full_name: 'Regulation (EU) 2019/1021 on Persistent Organic Pollutants (recast)',
    description: 'Implements the Stockholm Convention and the Aarhus Protocol in the EU. Prohibits or restricts the manufacturing, placing on the market, and use of persistent organic pollutants. Regulates unintentional release and waste management of POPs.',
    category: 'chemicals',
    status: 'active',
    effective_date: '2019-07-15',
    application_date: '2019-07-15',
    key_requirements: [
      'Prohibition of listed POPs in products (Annex I)',
      'Restriction conditions for specific POPs (Annex II)',
      'Unintentional release minimization obligations',
      'Waste containing POPs management requirements',
      'Concentration limits for POPs in waste',
      'Stockpile management and reporting',
      'National implementation plans'
    ],
    affected_products: ['Textiles (PFOS/PFOA treated)', 'Electronics (brominated flame retardants)', 'Packaging Materials', 'Construction Products', 'Automotive Components', 'Firefighting Foams'],
    dpp_deadlines: {
      compliance: 'Immediate - ongoing obligation',
      pfoa_restriction: 'Since 2020-07-04',
      pfos_restriction: 'Since 2019-07-15',
      waste_limits: 'Regularly reviewed'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019R1021'
  },

  // 12. Machinery Regulation
  {
    name: 'Machinery Regulation',
    full_name: 'Regulation (EU) 2023/1230 on machinery products',
    description: 'Replaces the Machinery Directive 2006/42/EC. Covers machinery, interchangeable equipment, safety components, lifting accessories, chains/ropes/webbing, removable mechanical transmission devices, and partly completed machinery. Adds requirements for cybersecurity and AI in machinery.',
    category: 'safety',
    status: 'upcoming',
    effective_date: '2023-07-29',
    application_date: '2027-01-20',
    key_requirements: [
      'Essential health and safety requirements (EHSR)',
      'Conformity assessment including third-party for high-risk',
      'Digital format for declaration of conformity and instructions',
      'Cybersecurity requirements for connected machinery',
      'AI safety requirements for autonomous machinery',
      'CE marking and technical documentation',
      'Risk assessment considering foreseeable misuse'
    ],
    affected_products: ['Industrial Machinery', 'Construction Machinery', 'Agricultural Machinery', 'Woodworking Machines', 'Presses', 'Robots', 'Autonomous Mobile Machinery', 'Lifting Equipment', 'Safety Components'],
    dpp_deadlines: {
      full_application: '2027-01-20',
      dual_period: '2024-07-29 to 2027-01-20 (both Directive and Regulation applicable)',
      digital_instructions: '2027-01-20'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1230'
  },

  // 13. CPR - Construction Products Regulation (proposed revision)
  {
    name: 'CPR',
    full_name: 'Regulation (EU) No 305/2011 laying down harmonised conditions for the marketing of construction products',
    description: 'Establishes harmonized conditions for the marketing of construction products in the EU through CE marking and Declarations of Performance. A major revision proposal is pending to align with Green Deal objectives and improve mutual recognition.',
    category: 'safety',
    status: 'active',
    effective_date: '2011-04-04',
    application_date: '2013-07-01',
    key_requirements: [
      'Declaration of Performance (DoP) for covered products',
      'CE marking based on harmonized European standards',
      'Assessment and Verification of Constancy of Performance (AVCP)',
      'Technical documentation and test reports',
      'Environmental sustainability declarations (proposed revision)',
      'Digital product information (proposed revision)',
      'Notified body involvement per AVCP system'
    ],
    affected_products: ['Cement', 'Concrete', 'Steel', 'Glass', 'Insulation', 'Doors and Windows', 'Roofing', 'Flooring', 'Pipes', 'Aggregates', 'Adhesives', 'Structural Timber'],
    dpp_deadlines: {
      current: 'DoP before placing on market',
      proposed_revision: 'Digital DoP and environmental data - pending trilogue',
      sustainability_requirements: 'Expected 2026-2028 via delegated acts'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011R0305'
  },

  // 14. Toy Safety Regulation
  {
    name: 'Toy Safety Regulation',
    full_name: 'Regulation (EU) 2024/1262 on the safety of toys',
    description: 'New regulation replacing Directive 2009/48/EC on toy safety. Strengthens chemical restrictions, introduces Digital Product Passport for toys, and enhances market surveillance. Bans further hazardous chemicals and introduces stricter limits for substances like lead and aluminium.',
    category: 'safety',
    status: 'upcoming',
    effective_date: '2024-07-17',
    application_date: '2027-07-17',
    key_requirements: [
      'Digital Product Passport for each toy model',
      'Stricter chemical restrictions (endocrine disruptors, sensitizers)',
      'Reduced limits for lead, aluminium, nitrosamines',
      'CE marking and EU Declaration of Conformity',
      'Age-appropriate warnings and labels',
      'Choking hazard and small parts testing',
      'Third-party conformity assessment for certain categories'
    ],
    affected_products: ['All toys intended for children under 14', 'Electronic Toys', 'Stuffed Animals', 'Plastic Toys', 'Wooden Toys', 'Outdoor Play Equipment', 'Craft Kits', 'Toy Cosmetics'],
    dpp_deadlines: {
      full_application: '2027-07-17',
      digital_product_passport: '2027-07-17',
      transition_period: '2024-07-17 to 2027-07-17'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1262'
  },

  // 15. GPSR - General Product Safety Regulation
  {
    name: 'GPSR',
    full_name: 'Regulation (EU) 2023/988 on General Product Safety',
    description: 'Replaces the General Product Safety Directive 2001/95/EC. Modernizes product safety rules for consumer products, including online marketplace obligations, product recall requirements, and the Safety Gate rapid alert system. Introduces a safety-by-design approach.',
    category: 'safety',
    status: 'active',
    effective_date: '2023-06-23',
    application_date: '2024-12-13',
    key_requirements: [
      'General safety requirement for all consumer products',
      'Internal risk analysis for products without harmonized standards',
      'Traceability requirements (name, address, product identifier)',
      'Online marketplace due diligence obligations',
      'Product recall effectiveness requirements',
      'Incident reporting via Safety Business Gateway',
      'Specific obligations for product recalls (direct notification)',
      'Vulnerability of certain consumer groups (children, elderly)'
    ],
    affected_products: ['All consumer products not covered by sector-specific harmonization', 'Online Marketplace Products', 'Second-hand Products', 'Repaired and Refurbished Products'],
    dpp_deadlines: {
      full_application: '2024-12-13',
      marketplace_obligations: '2024-12-13',
      recall_notification: 'Immediately upon safety concern'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0988'
  },

  // 16. CSRD - Corporate Sustainability Reporting Directive
  {
    name: 'CSRD',
    full_name: 'Directive (EU) 2022/2464 on Corporate Sustainability Reporting',
    description: 'Requires companies to report on sustainability matters according to European Sustainability Reporting Standards (ESRS). Extends reporting obligations to all large companies and listed SMEs. Reports must be digitally tagged (XBRL) and subject to limited assurance.',
    category: 'environment',
    status: 'active',
    effective_date: '2023-01-05',
    application_date: '2024-01-01',
    key_requirements: [
      'Double materiality assessment (impact and financial)',
      'Reporting according to ESRS standards',
      'Climate transition plan disclosure',
      'Scope 1, 2, and 3 GHG emissions reporting',
      'Biodiversity and resource use reporting',
      'Social and governance disclosures',
      'Digital tagging in XHTML/iXBRL format',
      'Third-party limited assurance of sustainability information'
    ],
    affected_products: ['Not product-specific - applies to reporting entities'],
    dpp_deadlines: {
      large_public_interest_entities: '2024-01-01 (FY2024 reports)',
      large_companies: '2025-01-01 (FY2025 reports)',
      listed_smes: '2026-01-01 (FY2026 reports, opt-out until 2028)',
      non_eu_companies: '2028-01-01 (FY2028 reports)'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2464'
  },

  // 17. CSDDD - Corporate Sustainability Due Diligence Directive
  {
    name: 'CSDDD',
    full_name: 'Directive (EU) 2024/1760 on Corporate Sustainability Due Diligence',
    description: 'Requires large companies to identify, prevent, mitigate, and account for adverse human rights and environmental impacts in their operations and value chains. Establishes civil liability for failure to comply and requires climate transition plans aligned with the Paris Agreement.',
    category: 'environment',
    status: 'active',
    effective_date: '2024-07-25',
    application_date: '2027-07-26',
    key_requirements: [
      'Human rights and environmental due diligence policy',
      'Risk identification and assessment across value chain',
      'Prevention, mitigation, and remediation measures',
      'Complaints mechanism for affected stakeholders',
      'Annual monitoring and reporting',
      'Climate transition plan aligned with 1.5C target',
      'Director duty of care for sustainability matters',
      'Civil liability for damages from due diligence failures'
    ],
    affected_products: ['Not product-specific - applies to companies and their value chains'],
    dpp_deadlines: {
      large_companies_1500_employees: '2027-07-26',
      companies_900_employees: '2028-07-26',
      companies_450_employees: '2029-07-26',
      climate_transition_plan: 'Within 12 months of transposition deadline'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1760'
  },

  // 18. Eco-design Mobile Phones and Tablets
  {
    name: 'Eco-design Mobile',
    full_name: 'Regulation (EU) 2023/1670 on ecodesign requirements for smartphones and tablets',
    description: 'Specific ecodesign implementing regulation for smartphones and tablets under the ErP Directive. Sets requirements for energy efficiency, durability, repairability, reliability, and recyclability. Mandates availability of spare parts and repair information.',
    category: 'energy',
    status: 'active',
    effective_date: '2023-09-28',
    application_date: '2025-06-20',
    key_requirements: [
      'Battery endurance minimum 800 charge cycles at 80% capacity',
      'Spare parts availability for minimum 7 years (smartphones) / 8 years (tablets)',
      'Repair information access for professional repairers',
      'Software support for minimum 5 years',
      'Drop resistance testing (1m height)',
      'IP67 or equivalent ingress protection (smartphones)',
      'Reliability requirements for buttons and ports',
      'Reparability score disclosure'
    ],
    affected_products: ['Smartphones', 'Tablets', 'Slate Tablets'],
    dpp_deadlines: {
      ecodesign_requirements: '2025-06-20',
      spare_parts: '2025-06-20',
      repair_information: '2025-06-20',
      software_updates: '5 years from last unit placed on market'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1670'
  },

  // 19. Eco-design Servers and Data Storage
  {
    name: 'Eco-design Servers',
    full_name: 'Regulation (EU) 2019/424 on ecodesign requirements for servers and data storage products',
    description: 'Sets ecodesign requirements for servers and online data storage products. Addresses energy efficiency, material efficiency, and information requirements. Currently under review for potential update to align with ESPR requirements.',
    category: 'energy',
    status: 'active',
    effective_date: '2019-03-25',
    application_date: '2020-03-01',
    key_requirements: [
      'Active state energy efficiency requirements (idle and active)',
      'Power supply efficiency minimums (PSU)',
      'Data erasure capability without physical destruction',
      'Firmware and security update availability',
      'Material efficiency and disassembly information',
      'Product information disclosure (power consumption, memory)',
      'Free-of-charge firmware updates for minimum 5 years'
    ],
    affected_products: ['Servers', 'Online Data Storage Products', 'Enterprise Storage'],
    dpp_deadlines: {
      tier_1_requirements: 'Since 2020-03-01',
      tier_2_requirements: 'Since 2021-01-01',
      review: 'Under review for alignment with ESPR'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32019R0424'
  },

  // 20. Conflict Minerals Regulation
  {
    name: 'Conflict Minerals',
    full_name: 'Regulation (EU) 2017/821 on supply chain due diligence for minerals from conflict-affected areas',
    description: 'Requires EU importers of tin, tantalum, tungsten, and gold (3TG) to carry out supply chain due diligence aligned with OECD guidance. Aims to break the link between armed conflict, human rights abuses, and mineral trade.',
    category: 'environment',
    status: 'active',
    effective_date: '2017-06-17',
    application_date: '2021-01-01',
    key_requirements: [
      'Supply chain due diligence system for 3TG minerals',
      'Third-party audit of smelters and refiners',
      'Risk identification and management in supply chain',
      'Annual public reporting on due diligence',
      'Conformity with OECD Due Diligence Guidance',
      'Supply chain traceability from mine to smelter',
      'Grievance mechanism'
    ],
    affected_products: ['Tin (electronics soldering)', 'Tantalum (capacitors)', 'Tungsten (vibration motors)', 'Gold (connectors, circuit boards)', 'All products containing 3TG minerals'],
    dpp_deadlines: {
      compliance: 'Since 2021-01-01',
      annual_reporting: 'By April 30 each year',
      importer_thresholds: 'Based on Annex I volume thresholds per mineral'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R0821'
  },

  // 21. MDR - Medical Device Regulation
  {
    name: 'MDR',
    full_name: 'Regulation (EU) 2017/745 on Medical Devices',
    description: 'Comprehensive regulation for medical devices replacing Directives 93/42/EEC and 90/385/EEC. Strengthens clinical evidence requirements, post-market surveillance, traceability via UDI system, and notified body oversight. Establishes EUDAMED database.',
    category: 'safety',
    status: 'active',
    effective_date: '2017-05-25',
    application_date: '2021-05-26',
    key_requirements: [
      'Unique Device Identification (UDI) system',
      'Registration in EUDAMED database',
      'Clinical evaluation and clinical investigations',
      'Post-market surveillance and periodic safety update reports',
      'Implant card for patients',
      'Quality management system (ISO 13485)',
      'Conformity assessment by Notified Body (except Class I)',
      'Technical documentation per Annex II and III'
    ],
    affected_products: ['Class I Medical Devices', 'Class IIa Medical Devices', 'Class IIb Medical Devices', 'Class III Medical Devices', 'In Vitro Diagnostic Devices (covered by IVDR)', 'Active Implantable Devices', 'Custom-made Devices'],
    dpp_deadlines: {
      class_III_implantable: 'Since 2021-05-26',
      class_IIb_IIa: 'Extended to 2027-12-31 (amended transition)',
      class_I_up_classified: 'Extended to 2028-12-31',
      udi_class_III: 'Since 2021-05-26',
      udi_class_II: '2023-05-26',
      udi_class_I: '2025-05-26'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R0745'
  },

  // 22. PPWR - Packaging and Packaging Waste Regulation
  {
    name: 'PPWR',
    full_name: 'Regulation (EU) 2025/40 on packaging and packaging waste',
    description: 'Replaces Directive 94/62/EC on packaging waste. Introduces mandatory recycled content targets, recyclability criteria, packaging reduction targets, and mandatory deposit-return systems. Restricts certain single-use packaging formats and introduces compostability requirements for specific packaging.',
    category: 'recycling',
    status: 'upcoming',
    effective_date: '2025-02-11',
    application_date: '2027-08-12',
    key_requirements: [
      'Minimum recycled content targets per material type',
      'Design for recycling requirements (recyclability grades)',
      'Packaging reduction targets (5% by 2030, 10% by 2035, 15% by 2040)',
      'Mandatory deposit-return systems for beverage containers',
      'Restrictions on single-use packaging (hotels, restaurants)',
      'Reuse and refill targets for specific sectors',
      'Labelling with material composition and sorting instructions',
      'Compostable packaging requirements for tea bags, capsules, stickers'
    ],
    affected_products: ['Primary Packaging', 'Secondary Packaging', 'Transport Packaging', 'E-commerce Packaging', 'Beverage Containers', 'Food Contact Packaging', 'Grouped Packaging'],
    dpp_deadlines: {
      general_application: '2027-08-12',
      recycled_content_targets: '2030-01-01',
      recyclability_criteria: '2030-01-01',
      deposit_return_systems: '2029-01-01',
      reuse_targets: '2030-01-01',
      packaging_reduction_5pct: '2030-01-01',
      packaging_reduction_10pct: '2035-01-01'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0040'
  },

  // 23. Waste Framework Directive (revised)
  {
    name: 'Waste Framework Directive',
    full_name: 'Directive 2008/98/EC on waste (as amended by Directive 2018/851)',
    description: 'Foundational EU waste legislation establishing the waste hierarchy, extended producer responsibility principles, and recycling targets. Sets definitions for waste, by-products, and end-of-waste criteria. The 2018 amendment strengthened recycling targets and EPR requirements.',
    category: 'recycling',
    status: 'active',
    effective_date: '2008-11-22',
    application_date: '2010-12-12',
    key_requirements: [
      'Waste hierarchy compliance (prevention, reuse, recycling, recovery, disposal)',
      'Extended Producer Responsibility (EPR) for packaging, EEE, batteries, vehicles',
      'Municipal waste recycling targets (55% by 2025, 60% by 2030, 65% by 2035)',
      'Separate collection obligations for bio-waste, textiles, hazardous household waste',
      'Waste management plans and waste prevention programmes',
      'Permit and registration requirements for waste operators',
      'Hazardous waste tracking and record-keeping'
    ],
    affected_products: ['All products generating waste', 'Packaging', 'Textiles (separate collection from 2025)', 'Bio-waste', 'Construction and Demolition Waste'],
    dpp_deadlines: {
      textile_separate_collection: '2025-01-01',
      municipal_recycling_55: '2025-01-01',
      municipal_recycling_60: '2030-01-01',
      municipal_recycling_65: '2035-01-01',
      epr_modulated_fees: 'Member State implementation'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008L0098'
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('  Seed EU Regulations - Supabase REST API');
  console.log('='.repeat(60));
  console.log(`  Supabase URL : ${SUPABASE_URL}`);
  console.log(`  Regulations  : ${EU_REGULATIONS.length}`);
  console.log('');

  // Upsert regulations using merge-duplicates strategy
  // Since eu_regulations has no unique constraint beyond id,
  // we delete first and re-insert (same pattern as checklist-templates)
  console.log('[1/3] Deleting existing eu_regulations ...');
  try {
    await supabaseRequest('eu_regulations?id=not.is.null', {
      method: 'DELETE',
    });
    console.log('       Deleted all existing rows.\n');
  } catch (err) {
    console.error('       Failed to delete existing regulations:', err.message);
    console.error('       Aborting.');
    process.exit(1);
  }

  // Insert in batches
  console.log(`[2/3] Inserting ${EU_REGULATIONS.length} regulations in batches of ${BATCH_SIZE} ...`);

  let insertedCount = 0;
  const totalBatches = Math.ceil(EU_REGULATIONS.length / BATCH_SIZE);

  for (let i = 0; i < EU_REGULATIONS.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = EU_REGULATIONS.slice(i, i + BATCH_SIZE);

    try {
      await supabaseRequest('eu_regulations', {
        method: 'POST',
        body: JSON.stringify(batch),
        headers: {
          'Prefer': 'return=minimal',
        },
      });
      insertedCount += batch.length;
      console.log(`       Batch ${batchNum}/${totalBatches} - inserted ${batch.length} row(s)  (total: ${insertedCount})`);
    } catch (err) {
      console.error(`       Batch ${batchNum}/${totalBatches} FAILED: ${err.message}`);
      console.error(`       Rows ${i + 1}..${i + batch.length} were NOT inserted.`);
    }
  }

  // Verify
  console.log('\n[3/3] Verifying ...');
  try {
    const allRows = await supabaseRequest('eu_regulations?select=id');
    const dbCount = Array.isArray(allRows) ? allRows.length : '(unknown)';
    console.log(`  Rows in eu_regulations: ${dbCount}`);
  } catch {
    console.log('  (could not verify row count)');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(
    insertedCount === EU_REGULATIONS.length
      ? `  Done - ${insertedCount} regulation(s) seeded successfully.`
      : `  Done - ${insertedCount}/${EU_REGULATIONS.length} regulation(s) seeded (some batches failed).`
  );
  console.log('='.repeat(60));

  if (insertedCount < EU_REGULATIONS.length) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
