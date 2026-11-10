/**
 * Seed EU Regulations via Supabase REST API
 *
 * Inserts the EU regulations library (see EU_REGULATIONS below) into the
 * eu_regulations table.
 *
 * Legal status last reviewed: 2026-11-10. Source URLs for every change made
 * in that review are recorded as `// Source:` comments next to each entry.
 * Status model (DB CHECK constraint): 'active' = obligations already apply,
 * 'upcoming' = adopted/in force but main obligations not yet applicable.
 * Proposals that are not adopted are NOT listed as separate entries.
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
// EU Regulations Data (33 regulations, legal review 2026-11-10)
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
    // Review 2026-11-10. Sources:
    //   https://eur-lex.europa.eu/eli/reg_del/2026/296/oj (derogations from destruction ban, applies 2026-07-19)
    //   https://sustainablefutures.linklaters.com/post/102miiy/eu-espr-commission-adopts-final-acts-on-unsold-consumer-product-destruction-and
    //   https://data.consilium.europa.eu/doc/document/ST-8225-2025-INIT/en/pdf (ESPR & Energy Labelling Working Plan 2025-2030, COM(2025) 187)
    description: 'Framework regulation establishing ecodesign requirements for sustainable products placed on the EU market. Introduces Digital Product Passports (DPP), set product by product through delegated acts. Replaces the Ecodesign Directive 2009/125/EC with a scope beyond energy-related products. First direct obligations apply since 19 July 2026: ban on destroying unsold apparel, clothing accessories and footwear for large enterprises (derogations in Delegated Regulation (EU) 2026/296) and the Commission DPP registry. The ESPR & Energy Labelling Working Plan 2025-2030 (COM(2025) 187, adopted 16 April 2025) prioritises steel and aluminium, textiles (apparel), furniture, tyres and mattresses plus horizontal repairability and recycled-content/recyclability measures for electrical and electronic equipment. No product-specific DPP delegated act was in application as of November 2026.',
    category: 'environment',
    status: 'active',
    effective_date: '2024-07-18',
    application_date: '2026-07-19',
    key_requirements: [
      'Digital Product Passport (DPP) for each product group regulated by a delegated act (typically applicable ~18 months after adoption)',
      'Durability, reparability, and recyclability requirements',
      'Minimum recycled content thresholds',
      'Ban on destruction of unsold apparel, clothing accessories and footwear (large enterprises since 2026-07-19, medium-sized from 2030-07-19; micro/small exempt)',
      'Annual public disclosure of discarded unsold consumer products (standardised format via Implementing Regulation, applicable from 2027-03-02)',
      'Substance of concern disclosure',
      'Carbon and environmental footprint information where required by delegated acts',
      'Performance and information requirements set via delegated acts'
    ],
    affected_products: ['Textiles (apparel)', 'Footwear', 'Iron and Steel', 'Aluminium', 'Furniture', 'Mattresses', 'Tyres', 'Electrical and Electronic Equipment (horizontal repairability/recyclability)', 'Energy-related products (transition from Directive 2009/125/EC)'],
    dpp_deadlines: {
      dpp_registry: '2026-07-19 (Commission registry, Art. 13)',
      unsold_destruction_ban_large: '2026-07-19',
      unsold_destruction_ban_medium: '2030-07-19',
      unsold_disclosure_format: '2027-03-02',
      steel_aluminium: 'Delegated act in preparation (expected 2026-2027); DPP applies after transition period set in the act',
      textiles: 'Delegated act expected 2027; DPP applies after transition period set in the act',
      furniture_tyres_mattresses: 'Working Plan 2025-2030 priorities; delegated acts pending',
      batteries: '2027-02-18 (battery passport under Regulation (EU) 2023/1542)',
      general: 'Phased rollout via delegated acts per Working Plan 2025-2030'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781'
  },

  // 2. Battery Regulation
  {
    name: 'Battery Regulation',
    full_name: 'Regulation (EU) 2023/1542 concerning batteries and waste batteries',
    // Review 2026-11-10. Sources:
    //   https://eur-lex.europa.eu/eli/reg/2023/1542/oj
    //   https://sustainablefutures.linklaters.com/post/102kymo/eu-regulation-delaying-due-diligence-rules-for-batteries-published-in-the-ojeu (Reg. (EU) 2025/1561)
    //   https://www.ul.com/news/sustainability-ec-postpones-eu-battery-regulation-due-diligence-policies
    //   https://publications.jrc.ec.europa.eu/repository/handle/JRC141282 (EV carbon-footprint method still a draft delegated act)
    description: 'Comprehensive regulation covering the entire lifecycle of batteries from design and production to end-of-life management. First EU regulation to mandate a Digital Product Passport (battery passport from 18 February 2027). Establishes sustainability, safety, labelling, and end-of-life requirements for all battery types. Regulation (EU) 2025/1561 postponed the supply-chain due diligence obligations to 18 August 2027 (the EUR 40 million turnover threshold was not changed by that act; the Omnibus IV small mid-cap proposal to raise it to EUR 150 million was provisionally agreed in June 2026 but not yet published in the Official Journal as of November 2026). Carbon-footprint obligations apply only once the respective delegated/implementing acts are in force (EV calculation method not yet adopted as of 2026).',
    category: 'recycling',
    status: 'active',
    effective_date: '2023-08-17',
    application_date: '2024-02-18',
    key_requirements: [
      'Battery passport (QR code) for EV, LMT and industrial batteries >2 kWh from 2027-02-18',
      'Carbon footprint declaration and performance classes (EV first; dates triggered by delegated acts)',
      'Minimum recycled content (cobalt, lead, lithium, nickel)',
      'Collection and recycling efficiency targets, extended producer responsibility',
      // Fact-check 2026-11-10: 2025/1561 only postponed the date; EUR 150m threshold is an Omnibus IV proposal (pending).
      //   https://www.algoodbody.com/insights-publications/batteries-due-diligence-a-two-year-pause-and-reduced-scope
      'Supply-chain due diligence for raw materials from 2027-08-18 (operators with net turnover > EUR 40 million; Omnibus IV proposal to raise to EUR 150 million pending)',
      'General labelling (capacity, CE, separate collection symbol) from 2026-08-18; QR code from 2027-02-18',
      'Removability and replaceability of portable and LMT batteries from 2027-02-18',
      'State of health information for EV, LMT and stationary storage batteries'
    ],
    affected_products: ['Portable Batteries', 'Industrial Batteries', 'EV Batteries', 'LMT Batteries', 'SLI Batteries'],
    dpp_deadlines: {
      carbon_footprint_declaration_ev: '2025-02-18 or 12 months after delegated act enters into force, whichever is later (act not yet adopted)',
      carbon_footprint_classes_ev: '2026-08-18 or 18 months after delegated act, whichever is later',
      labelling_general: '2026-08-18',
      battery_passport_ev: '2027-02-18',
      battery_passport_industrial: '2027-02-18',
      battery_passport_lmt: '2027-02-18',
      qr_code_labelling: '2027-02-18',
      removability_portable: '2027-02-18',
      due_diligence: '2027-08-18 (postponed by Regulation (EU) 2025/1561)',
      recycled_content_documentation: '2028-08-18 or 24 months after delegated act, whichever is later',
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
    // Review 2026-11-10. Sources:
    //   https://public.cdxsystem.com/en/web/cdx/w/eu-reach-candidate-list-updated-with-two-new-substances (Candidate List 253 entries, Feb 2026)
    //   https://www.eurofins.com/en/consumer-product-testing/news/chemicals-monthly-bulletin-july-2026/ (Reg. (EU) 2026/1168 microplastics amendment)
    //   https://www.linklaters.com/knowledge/articles/alerts-newsletters-and-guides/2025/july/22/simplification-of-eu-chemicals-regulation--defence-readiness-omnibus-and-chemicals-industry-action
    description: 'EU framework regulation for chemicals management. Requires manufacturers and importers to register substances manufactured or imported in quantities of 1 tonne or more per year. Establishes the SVHC (Substances of Very High Concern) Candidate List (253 entries after the February 2026 update) and the Authorisation List. A targeted REACH revision proposal was announced by the Commission but not adopted as of November 2026.',
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
      'SCIP database notification for waste management (Waste Framework Directive Art. 9)',
      'Annex XVII restriction on intentionally added synthetic polymer microparticles (Reg. (EU) 2023/2055, amended by Reg. (EU) 2026/1168), phased transition periods',
      'Annex XVII restriction on PFHxA and related substances (Reg. (EU) 2024/2462), phased by use'
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
    // Review 2026-11-10. Sources:
    //   https://eur-lex.europa.eu/eli/reg/2024/2865/oj (CLP revision)
    //   https://www.tuv.com/regulations-and-standards/en/europe-eu-adjusting-the-application-date-and-transitional-provisions-to-clp-regulation-eu-2025-2439-clp-amendment.html (Reg. (EU) 2025/2439)
    //   https://www.complianceandrisks.com/blog/stop-the-clock-overview-of-the-omnibus-simplification-for-clp-regulation/
    description: 'Implements the Globally Harmonized System (GHS) in the EU for classifying and labelling chemicals. Revised by Regulation (EU) 2024/2865 (new label layout rules, digital labelling, online-sales and advertising obligations, refill rules) and by Delegated Regulation (EU) 2023/707 (new hazard classes: endocrine disruptors, PBT/vPvB, PMT/vPvM). Regulation (EU) 2025/2439 ("stop-the-clock") postponed the label-format, advertising, distance-selling and fuel-station labelling provisions to 1 January 2028. A further Omnibus VI proposal to remove the mandatory label formatting rules was still pending.',
    category: 'chemicals',
    status: 'active',
    effective_date: '2009-01-20',
    application_date: '2010-12-01',
    key_requirements: [
      'New hazard classes ED HH/ENV, PBT/vPvB, PMT/vPvM (Delegated Reg. (EU) 2023/707)',
      'Label layout, advertising and distance-selling hazard information (Reg. (EU) 2024/2865) from 2028-01-01',
      'Optional digital labelling (Reg. (EU) 2024/2865)',
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
      ufi_requirement: 'Mandatory for all new mixtures',
      new_hazard_classes_new_substances: '2025-05-01',
      new_hazard_classes_new_mixtures: '2026-05-01',
      new_hazard_classes_existing_substances: '2026-11-01',
      new_hazard_classes_existing_mixtures: '2028-05-01',
      label_format_advertising_distance_sales: '2028-01-01 (postponed by Regulation (EU) 2025/2439)'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008R1272'
  },

  // 7. ErP Directive (Ecodesign)
  {
    name: 'ErP',
    full_name: 'Directive 2009/125/EC establishing a framework for Ecodesign Requirements for Energy-related Products',
    // Review 2026-11-10. Source:
    //   https://eur-lex.europa.eu/eli/reg/2024/1781/oj (Art. 79 transitional provisions)
    //   https://ecomundo.eu/en/blog/ecodesign-labeling-energetics-sustainable-products (Working Plan 2025-2030, transition after 31 Dec 2026)
    description: 'Framework directive for setting mandatory ecodesign requirements for energy-related products sold in the EU. Repealed by ESPR (EU 2024/1781), but existing implementing measures remain in force until replaced, and the Commission could still adopt or amend measures under this Directive until 31 December 2026. Product groups not finalised by then move to the ESPR framework.',
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
      transition_to_espr: 'New/amended measures under 2009/125/EC possible until 2026-12-31; afterwards via ESPR delegated acts',
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
    // Review 2026-11-10. Source: https://eur-lex.europa.eu/eli/reg_del/2023/1669/oj (smartphones/tablets energy label)
    affected_products: ['Refrigerators', 'Washing Machines', 'Dishwashers', 'TVs and Displays', 'Light Sources', 'Tyres', 'Air Conditioners', 'Tumble Dryers', 'Ovens', 'Range Hoods', 'Smartphones', 'Slate Tablets'],
    dpp_deadlines: {
      eprel_registration: 'Before placing on market',
      rescaled_labels: 'Since 2021-03-01 (major appliances)',
      light_sources: 'Since 2021-09-01',
      smartphones_tablets_label: 'Since 2025-06-20 (Delegated Regulation (EU) 2023/1669, incl. repairability class)',
      future_rescaling: 'When >=30% of products reach class A or >=50% reach class A+B'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R1369'
  },

  // 9. EUDR - EU Deforestation Regulation
  {
    name: 'EUDR',
    full_name: 'Regulation (EU) 2023/1115 on deforestation-free products',
    // Review 2026-11-10. Sources:
    //   https://www.cece.eu/news/eu-deforestation-regulation-eudr-targeted-revision-officially-published (Reg. (EU) 2025/2650, OJ 23.12.2025)
    //   https://cm.twobirds.com/en/insights/2025/out-of-the-woods-the-eudr-postponed-and-simplified
    //   https://www.bakermckenzie.com/en/insight/publications/2026/05/eu-commission-publishes-simplification-review-of-eudr
    //   https://transition-pathways.europa.eu/textiles/news/commission-publishes-simplification-review-eu-deforestation-regulation
    description: 'Prohibits placing or making available on the EU market products that have contributed to deforestation or forest degradation. Requires due diligence statements with geolocation data for all relevant commodities: cattle, cocoa, coffee, oil palm, rubber, soya, and wood. Postponed twice: by Regulation (EU) 2024/3234 and by Regulation (EU) 2025/2650 (targeted revision, in force 26 December 2025), which also simplified obligations for downstream operators and traders. The Commission simplification review (published May 2026) kept the dates and proposed scope adjustments of Annex I via delegated act.',
    category: 'environment',
    status: 'upcoming',
    effective_date: '2023-06-29',
    application_date: '2026-12-30',
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
      large_and_medium_operators: '2026-12-30',
      micro_and_small_operators: '2027-06-30',
      due_diligence_statements: 'Before placing on market or export (simplified for downstream operators/traders by Reg. (EU) 2025/2650)',
      benchmarking_system: 'Country classification adopted (Implementing Regulation (EU) 2025/1093)',
      general_review: '2030-06-30'
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
    // Fact-check 2026-11-10: OJ 20.02.2024, in force 2024-03-11 (not 03-20).
    //   https://oeil.europarl.europa.eu/oeil/en/document-summary?id=1776223
    effective_date: '2024-03-11',
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
      // Review 2026-11-10. Sources:
      //   https://eia-international.org/wp-content/uploads/2026-EIA-A-Concise-Guide-to-the-EU-F-Gas-Regulation-5.pdf
      //   https://climate.ec.europa.eu/areas-action/fluorinated-greenhouse-gases/climate-friendly-alternatives-f-gases/air-conditioning_en
      new_bans_refrigerants: '2025-01-01',
      monoblock_ac_hp_gwp150_ban: '2027-01-01 (self-contained units <=12 kW)',
      split_ac_hp_gwp150_ban: '2029-01-01 for air-to-air splits <=12 kW (earlier dates for certain air-to-water splits; full F-gas ban in small splits 2035)',
      sf6_switchgear_ban: '2026-01-01 (new medium-voltage switchgear up to 24 kV, subject to exemptions)',
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
    // Review 2026-11-10. Sources:
    //   https://eur-lex.europa.eu/eli/reg/2023/1230/oj
    //   https://oeil.europarl.europa.eu/oeil/en/document-summary?id=1887965 (Omnibus IV digitalisation, provisional agreement June 2026, not yet in OJ)
    description: 'Replaces the Machinery Directive 2006/42/EC from 20 January 2027. Covers machinery, interchangeable equipment, safety components, lifting accessories, chains/ropes/webbing, removable mechanical transmission devices, and partly completed machinery. Adds requirements for cybersecurity, self-evolving/AI safety functions and digital instructions. The Omnibus IV "digital by default" package (provisional agreement June 2026) would further harmonise digital instructions across product laws but was not yet published in the Official Journal as of November 2026.',
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
      notified_bodies_provisions: 'Since 2024-01-20 (Chapter on notification of conformity assessment bodies)',
      digital_instructions: '2027-01-20'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1230'
  },

  // 13. CPR - Construction Products Regulation (EU) 2024/3110 (replaces 305/2011)
  // Review 2026-11-10. Sources:
  //   https://eur-lex.europa.eu/eli/reg/2024/3110/oj
  //   https://single-market-economy.ec.europa.eu/sectors/construction/construction-products-regulation-cpr/cpr-2024-revision_en
  //   https://economie.fgov.be/en/themes/enterprises/specific-sectors/construction/construction-products/construction-products
  {
    name: 'CPR',
    full_name: 'Regulation (EU) 2024/3110 laying down harmonised rules for the marketing of construction products (repealing Regulation (EU) No 305/2011)',
    description: 'New Construction Products Regulation, applicable from 8 January 2026, replacing Regulation (EU) No 305/2011 (some old provisions continue to apply for products covered by legacy harmonised standards until 8 January 2040). Introduces a combined Declaration of Performance and Conformity (DoPC), environmental sustainability declarations (starting with global warming potential), product requirements, obligations for online sellers, and a Digital Product Passport for construction products. The DPP system will be established by a separate delegated act and becomes mandatory 18 months after that act; the date is not yet fixed.',
    category: 'safety',
    status: 'active',
    effective_date: '2025-01-07',
    application_date: '2026-01-08',
    key_requirements: [
      'Declaration of Performance and Conformity (DoPC), may be provided digitally',
      'CE marking based on harmonised technical specifications',
      'Assessment and Verification of Constancy of Performance (AVCP)',
      'Environmental sustainability declaration (GWP first, further indicators phased in via delegated acts)',
      'Digital Product Passport (via delegated act, mandatory 18 months later)',
      'Obligations for distributors, online marketplaces and fulfilment service providers',
      'Notified body involvement per AVCP system'
    ],
    affected_products: ['Cement', 'Concrete', 'Steel', 'Glass', 'Insulation', 'Doors and Windows', 'Roofing', 'Flooring', 'Pipes', 'Aggregates', 'Adhesives', 'Structural Timber', '3D-printed and prefabricated construction products'],
    dpp_deadlines: {
      general_application: '2026-01-08',
      dopc_required: 'Before placing on market under new harmonised technical specifications',
      digital_product_passport: '18 months after the DPP delegated act (date to be fixed)',
      legacy_harmonised_standards: 'CPR 2011 standards remain valid until withdrawn; legacy regime until 2040-01-08 at the latest',
      european_assessment_documents: 'Existing EADs valid until 2031-01-09'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3110'
  },

  // 14. Toy Safety Regulation
  {
    name: 'Toy Safety Regulation',
    // Review 2026-11-10. Sources (previous entry cited a wrong act number "2024/1262"):
    //   https://eur-lex.europa.eu/eli/reg/2025/2509/oj (OJ 12.12.2025, in force 2026-01-01, applies 2030-08-01)
    //   https://www.noerr.com/en/insights/new-european-toy-safety-regulation-2025-2509-comes-into-force-key-points-at-a-glance
    full_name: 'Regulation (EU) 2025/2509 on the safety of toys (repealing Directive 2009/48/EC)',
    description: 'New regulation replacing Directive 2009/48/EC on toy safety, published 12 December 2025, in force since 1 January 2026 and applicable from 1 August 2030 (Directive 2009/48/EC repealed with effect from the same date). Strengthens chemical restrictions (ban on CMR, endocrine disruptors, respiratory sensitisers, PFAS and most bisphenols in toys), introduces a Digital Product Passport for every toy, and enhances market surveillance and online marketplace obligations.',
    category: 'safety',
    status: 'upcoming',
    effective_date: '2026-01-01',
    application_date: '2030-08-01',
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
      full_application: '2030-08-01',
      digital_product_passport: '2030-08-01',
      transition_period: '2026-01-01 to 2030-08-01 (Directive 2009/48/EC still applies)',
      old_ec_type_examination_certificates: 'Valid until 2031-02-01 unless expiring earlier'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R2509'
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
    // Review 2026-11-10. Sources:
    //   https://www.dlapiper.com/insights/blogs/environment-health-safety-and-product-compliance/2026/eu-omnibus-i-directive-amending-csrd-and-csddd-will-enter-into-force-on-18-march-2026 (Directive (EU) 2026/470)
    //   https://eur-lex.europa.eu/eli/dir/2025/794/oj ("stop-the-clock" Directive)
    //   https://www.efrag.org/en/news-and-calendar/news/european-commission-publishes-delegated-act-on-revised-esrs-and-voluntary-sustainability-reporting
    //   https://www.bdo.global/en-gb/news/ifrs-news/revised-esrss-and-eu-voluntary-sustainability-reporting-standard-published-in-official-journal
    full_name: 'Directive (EU) 2022/2464 on Corporate Sustainability Reporting (as amended by Directives (EU) 2025/794 and (EU) 2026/470 - Omnibus I)',
    description: 'Requires companies to report on sustainability matters according to European Sustainability Reporting Standards (ESRS). Scope sharply reduced by the Omnibus I Directive (EU) 2026/470 (in force 18 March 2026, transposition by 19 March 2027): only EU undertakings with more than 1,000 employees and net turnover above EUR 450 million, plus non-EU groups with EU turnover above EUR 450 million and an EU subsidiary/branch above EUR 200 million. Listed SMEs are no longer in mandatory scope. Simplified (revised) ESRS adopted July 2026 apply to financial years from 1 January 2027. Limited assurance remains required.',
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
      wave_1_large_pie: 'FY2024 reports (since 2024-01-01); check national transposition of Omnibus I for entities below the new thresholds',
      in_scope_eu_companies: 'FY starting on/after 2027-01-01 (reports in 2028), postponed by Directive (EU) 2025/794',
      non_eu_parents: 'FY starting on/after 2028-01-01 (reports in 2029)',
      revised_esrs: 'Mandatory for FY from 2027-01-01, voluntary early use for FY2026',
      transposition_omnibus_i: '2027-03-19'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2464'
  },

  // 17. CSDDD - Corporate Sustainability Due Diligence Directive
  {
    name: 'CSDDD',
    // Review 2026-11-10. Sources:
    //   https://www.dlapiper.com/insights/blogs/environment-health-safety-and-product-compliance/2026/eu-omnibus-i-directive-amending-csrd-and-csddd-will-enter-into-force-on-18-march-2026 (Directive (EU) 2026/470)
    //   https://www.complianceandrisks.com/blog/eu-omnibus-i-finalized-comparing-key-structural-changes-to-the-csrd-and-csddd/
    full_name: 'Directive (EU) 2024/1760 on Corporate Sustainability Due Diligence (as amended by Directives (EU) 2025/794 and (EU) 2026/470 - Omnibus I)',
    description: 'Requires very large companies to identify, prevent, mitigate, and account for adverse human rights and environmental impacts in their operations and chains of activities. After the Omnibus I Directive (EU) 2026/470 it applies only to EU companies/groups with more than 5,000 employees and over EUR 1.5 billion net worldwide turnover (non-EU: over EUR 1.5 billion EU turnover), met in two consecutive years. Transposition by 26 July 2028, application from 26 July 2029. The previous phased 2027/2028/2029 thresholds no longer apply.',
    category: 'environment',
    status: 'upcoming',
    effective_date: '2024-07-25',
    application_date: '2029-07-26',
    key_requirements: [
      'Human rights and environmental due diligence policy',
      'Risk-based scoping exercise on reasonably available information (replaces full mapping)',
      'Prevention, mitigation, and remediation measures',
      'Complaints mechanism for affected stakeholders',
      'Limited information requests to business partners with fewer than 5,000 employees',
      'Periodic monitoring and public reporting',
      'Penalties capped at 3% of net worldwide turnover',
      'Climate transition plan obligation and harmonised EU civil liability removed by Omnibus I (national liability rules apply)'
    ],
    // Source for key requirements: https://www.adherent.com/blog/eu-omnibus-i-finalized-comparing-key-structural-changes-to-the-csrd-and-csddd/
    affected_products: ['Not product-specific - applies to companies and their value chains'],
    dpp_deadlines: {
      transposition: '2028-07-26',
      application_companies_5000_employees_eur_1_5bn: '2029-07-26',
      reporting: 'Financial years starting on/after 2030-01-01',
      franchisors_licensors: 'In scope if EU royalties > EUR 75 million and turnover > EUR 275 million'
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
      // Fact-check 2026-11-10: spare parts 7 years for both device types; IP67 is not a general requirement.
      //   https://energy-efficient-products.ec.europa.eu/product-list/smartphones-and-tablets_en
      'Spare parts availability for 7 years after end of placement on the market (smartphones and slate tablets)',
      'Repair information access for professional repairers',
      'Operating system upgrades for at least 5 years after end of placement on the market',
      'Resistance to accidental drops and scratches',
      'Protection from dust and water ingress (IP rating shown on the energy label)',
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
      // Review 2026-11-10. Sources:
      //   https://eur-lex.europa.eu/eli/reg/2023/607/oj (extended transition)
      //   https://www.hpra.ie/news-events/news/article/mandatory-use-of-eudamed-modules-for-medical-devices (Decision (EU) 2025/2371, Reg. (EU) 2024/1860)
      new_devices_full_mdr: 'Since 2021-05-26',
      legacy_class_III_and_IIb_implantable: 'Transition until 2027-12-31 (Regulation (EU) 2023/607, conditions apply)',
      legacy_other_IIb_IIa_I_sterile_measuring_upclassified: 'Transition until 2028-12-31 (Regulation (EU) 2023/607)',
      legacy_class_III_custom_implantable: 'Until 2026-05-26 (Regulation (EU) 2023/607)',
      eudamed_first_four_modules_mandatory: '2026-05-28 (Commission Decision (EU) 2025/2371)',
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
    // Review 2026-11-10. Sources:
    //   https://environment.ec.europa.eu/news/new-eu-rules-packaging-enter-application-2026-08-11_en (applies since 2026-08-12)
    //   https://www.compliancegate.com/ppwr-timeline-and-dates/
    //   https://www.coolset.com/academy/ppwr-what-companies-must-have-in-place-from-august-12-2026
    description: 'Replaces Directive 94/62/EC on packaging waste; generally applicable since 12 August 2026 (entry into force 11 February 2025). Introduces mandatory recycled content targets, recyclability (design-for-recycling) criteria, packaging minimisation, reuse targets, mandatory deposit-return systems, PFAS limits for food-contact packaging, harmonised labelling and EPR producer registers. Restricts certain single-use packaging formats and introduces compostability requirements for specific packaging. Many obligations are phased and depend on implementing/delegated acts.',
    category: 'recycling',
    status: 'active',
    effective_date: '2025-02-11',
    application_date: '2026-08-12',
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
      general_application: '2026-08-12',
      pfas_food_contact_packaging: '2026-08-12',
      harmonised_material_label: '2028-08-12 or 24 months after labelling implementing act, whichever is later',
      recycled_content_targets: '2030-01-01 (or 3 years after implementing act on calculation, whichever is later)',
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
    // Review 2026-11-10. Sources:
    //   https://eur-lex.europa.eu/eli/dir/2025/1892/oj (textile EPR + food waste amendment)
    //   https://sustainablefutures.linklaters.com/post/102l7yl/eu-revised-waste-framework-directive-to-cater-for-food-and-textile-waste-publish
    //   https://cms.law/en/prt/news-information/amendments-to-the-waste-framework-directive-2008-98-ec-for-the-textile-and-food-sectors
    full_name: 'Directive 2008/98/EC on waste (as amended by Directives (EU) 2018/851 and (EU) 2025/1892)',
    description: 'Foundational EU waste legislation establishing the waste hierarchy, extended producer responsibility principles, and recycling targets. Sets definitions for waste, by-products, and end-of-waste criteria. The 2018 amendment strengthened recycling targets and EPR requirements. Directive (EU) 2025/1892 (in force 16 October 2025, transposition by 17 June 2027) introduces mandatory EU-wide extended producer responsibility for textiles, textile-related products and footwear (schemes by April 2028, micro-enterprises one year later, eco-modulated fees, producer register) and binding food waste reduction targets for 2030.',
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
    affected_products: ['All products generating waste', 'Packaging', 'Textiles (separate collection from 2025, EPR from 2028)', 'Clothing and Accessories', 'Footwear', 'Household Textiles', 'Mattresses (optional national EPR)', 'Food', 'Bio-waste', 'Construction and Demolition Waste'],
    dpp_deadlines: {
      textile_separate_collection: '2025-01-01',
      textile_epr_transposition: '2027-06-17 (Directive (EU) 2025/1892)',
      textile_epr_schemes: '2028-04-17 (30 months after entry into force; micro-enterprises +12 months)',
      food_waste_targets: '2030-12-31 (-10% processing/manufacturing, -30% per capita retail/consumption vs. 2021-2023)',
      municipal_recycling_55: '2025-01-01',
      municipal_recycling_60: '2030-01-01',
      municipal_recycling_65: '2035-01-01',
      epr_modulated_fees: 'Member State implementation'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32008L0098'
  },

  // ===========================================================================
  // Added in legal review 2026-11-10
  // ===========================================================================

  // 24. RED - Radio Equipment Directive incl. cybersecurity delegated act
  // Sources:
  //   https://eur-lex.europa.eu/eli/dir/2014/53/oj
  //   https://eur-lex.europa.eu/eli/reg_del/2022/30/oj (as amended by Delegated Reg. (EU) 2023/2444: applies from 2025-08-01)
  //   https://www.cyberresilienceact.eu/reporting.html (RED cyber requirements until CRA takes over)
  {
    name: 'RED',
    full_name: 'Directive 2014/53/EU on radio equipment (incl. Delegated Regulation (EU) 2022/30 on cybersecurity)',
    description: 'Sets essential requirements for health, safety, electromagnetic compatibility and efficient use of spectrum for all radio equipment (Wi-Fi, Bluetooth, cellular, RFID, NFC). Since 1 August 2025, Delegated Regulation (EU) 2022/30 activates the cybersecurity, privacy and anti-fraud requirements of Art. 3(3)(d)(e)(f) for internet-connected radio equipment, toys and wearables, with EN 18031-1/-2/-3 as harmonised standards (cited with restrictions). Also carries the common charger obligations (Directive (EU) 2022/2380). These cybersecurity requirements are expected to be superseded by the Cyber Resilience Act from 11 December 2027.',
    category: 'safety',
    status: 'active',
    effective_date: '2014-06-11',
    application_date: '2016-06-13',
    key_requirements: [
      'Essential requirements: safety (LVD level, no voltage limit), EMC, effective use of radio spectrum',
      'Cybersecurity: network protection, personal data/privacy protection, fraud protection (Delegated Reg. (EU) 2022/30)',
      'Conformity assessment; notified body if harmonised standards not (fully) applied',
      'CE marking and EU Declaration of Conformity (simplified DoC possible)',
      'Technical documentation, risk assessment and test reports',
      'Information on frequency bands and maximum transmitted power',
      'USB-C receptacle and unbundled charger option for covered devices (Directive (EU) 2022/2380)'
    ],
    affected_products: ['Smartphones', 'Tablets', 'Laptops with radio', 'Wearables', 'Connected Toys', 'Smart Home Devices', 'Routers', 'IoT Devices', 'Baby Monitors', 'Wireless Headphones'],
    dpp_deadlines: {
      compliance: 'Before placing on market',
      cybersecurity_delegated_act: '2025-08-01',
      common_charger_small_devices: '2024-12-28',
      common_charger_laptops: '2026-04-28',
      handover_to_cra: '2027-12-11 (CRA full application)'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0053'
  },

  // 25. LVD - Low Voltage Directive
  // Source: https://eur-lex.europa.eu/eli/dir/2014/35/oj
  {
    name: 'LVD',
    full_name: 'Directive 2014/35/EU on electrical equipment designed for use within certain voltage limits (Low Voltage Directive)',
    description: 'Ensures electrical equipment operating between 50 and 1000 V AC or 75 and 1500 V DC provides a high level of protection against electrical, mechanical, chemical and other hazards. One of the core CE directives for electrical and electronic products; no amendment changing obligations as of November 2026 (the Omnibus IV digitalisation package, still pending, would allow digital instructions and DoC).',
    category: 'safety',
    status: 'active',
    effective_date: '2014-04-18',
    application_date: '2016-04-20',
    key_requirements: [
      'Safety objectives of Annex I (protection against electrical, mechanical, fire and radiation hazards)',
      'Internal production control (Module A) conformity assessment',
      'CE marking and EU Declaration of Conformity',
      'Technical documentation incl. risk analysis, kept for 10 years',
      'Instructions and safety information in language easily understood by end-users',
      'Manufacturer, importer and distributor traceability (name, address, type/batch/serial number)'
    ],
    affected_products: ['Household Appliances', 'Power Supplies and Chargers', 'Lighting', 'Cables and Cords', 'Electrical Tools', 'IT Equipment', 'Consumer Electronics'],
    dpp_deadlines: {
      compliance: 'Before placing on market',
      documentation_retention: '10 years after product placed on market'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0035'
  },

  // 26. EMC - Electromagnetic Compatibility Directive
  // Source: https://eur-lex.europa.eu/eli/dir/2014/30/oj
  {
    name: 'EMC',
    full_name: 'Directive 2014/30/EU on electromagnetic compatibility',
    description: 'Ensures electrical and electronic equipment does not generate electromagnetic disturbance exceeding appropriate levels and has adequate immunity. Core CE directive for practically all electrical and electronic products (radio equipment is covered via RED instead).',
    category: 'safety',
    status: 'active',
    effective_date: '2014-04-18',
    application_date: '2016-04-20',
    key_requirements: [
      'Essential requirements on emissions and immunity (Annex I)',
      'EMC assessment against harmonised standards (e.g. EN 55032, EN 55035, EN IEC 61000 series)',
      'CE marking and EU Declaration of Conformity',
      'Technical documentation, kept for 10 years',
      'Installation and use instructions to ensure compliance',
      'Fixed installations: good engineering practice and documentation'
    ],
    affected_products: ['Consumer Electronics', 'IT Equipment', 'Household Appliances', 'Industrial Equipment', 'Lighting', 'Electrical Tools', 'Fixed Installations'],
    dpp_deadlines: {
      compliance: 'Before placing on market',
      documentation_retention: '10 years after product placed on market'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014L0030'
  },

  // 27. CRA - Cyber Resilience Act
  // Sources:
  //   https://eur-lex.europa.eu/eli/reg/2024/2847/oj
  //   https://digital-strategy.ec.europa.eu/en/policies/cra-reporting
  //   https://www.mccannfitzgerald.com/knowledge/data-privacy-and-cyber-risk/cyber-resilience-act-reporting-obligations-apply-from-11-september-2026
  {
    name: 'Cyber Resilience Act',
    full_name: 'Regulation (EU) 2024/2847 on horizontal cybersecurity requirements for products with digital elements',
    description: 'Horizontal cybersecurity regulation for hardware and software products with digital elements. Requires security-by-design, vulnerability handling for the support period and CE marking. Reporting obligations for actively exploited vulnerabilities and severe incidents apply since 11 September 2026 via the ENISA single reporting platform (also for products already on the market); full application from 11 December 2027.',
    category: 'safety',
    status: 'active',
    effective_date: '2024-12-10',
    application_date: '2026-09-11',
    key_requirements: [
      'Essential cybersecurity requirements (Annex I): secure by default, no known exploitable vulnerabilities, access control, data protection',
      'Vulnerability handling and free security updates for the support period (generally at least 5 years)',
      'Reporting of actively exploited vulnerabilities (24h early warning, 72h notification) and severe incidents',
      'Software Bill of Materials (SBOM) in technical documentation',
      'Conformity assessment; third-party for important (class II) and critical products',
      'CE marking and EU Declaration of Conformity',
      'User information on support period and secure use'
    ],
    affected_products: ['Connected Devices (IoT)', 'Smart Home Products', 'Software', 'Routers and Network Equipment', 'Operating Systems', 'Password Managers', 'Wearables', 'Connected Toys'],
    dpp_deadlines: {
      notified_bodies_provisions: '2026-06-11',
      reporting_obligations: '2026-09-11',
      full_application: '2027-12-11'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R2847'
  },

  // 28. AI Act
  // Sources:
  //   https://eur-lex.europa.eu/eli/reg/2024/1689/oj
  //   https://www.gibsondunn.com/eu-ai-act-omnibus-agreement
  //   https://www.loyensloeff.com/nl/insights/news--events/news/eu-ai-act-key-amendments-adopted-under-digital-omnibus-package/
  {
    name: 'AI Act',
    full_name: 'Regulation (EU) 2024/1689 laying down harmonised rules on artificial intelligence (as amended by Regulation (EU) 2026/1744 - Digital Omnibus on AI)',
    description: 'Risk-based framework for AI systems placed on the EU market. Prohibited practices apply since 2 February 2025 and general-purpose AI model obligations since 2 August 2025; the general date of application is 2 August 2026. The Digital Omnibus on AI (Regulation (EU) 2026/1744, OJ 24 July 2026, in force 27 July 2026) postponed high-risk obligations to 2 December 2027 for stand-alone (Annex III) systems and to 2 August 2028 for AI used as safety components of products under EU harmonisation law (e.g. machinery, toys, radio equipment, medical devices), and gave certain existing AI systems until 2 December 2026 to comply with the AI-generated content marking duty of Art. 50(2).',
    // Fact-check 2026-11-10: https://fpf.org/blog/the-ai-act-implementation-timeline-what-changes-under-the-ai-omnibus
    //   https://www.lewissilkin.com/insights/2026/07/27/the-digital-omnibus-on-ai-enters-into-force-today-102nedo
    category: 'safety',
    status: 'active',
    effective_date: '2024-08-01',
    application_date: '2026-08-02',
    key_requirements: [
      'Prohibited AI practices (social scoring, manipulative techniques, certain biometric uses)',
      'AI literacy obligation for providers and deployers',
      'General-purpose AI model documentation, copyright policy and training-data summary',
      'High-risk AI: risk management, data governance, technical documentation, logging, human oversight, accuracy and robustness',
      'Conformity assessment, CE marking and registration in EU database for high-risk AI',
      'Transparency: disclosure of AI interaction, marking of AI-generated content',
      'Post-market monitoring and serious incident reporting'
    ],
    affected_products: ['AI-enabled products', 'Machinery with AI safety functions', 'Connected Toys', 'Medical Devices with AI', 'Chatbots and Generative AI', 'Biometric Systems', 'HR and Credit Scoring Software'],
    dpp_deadlines: {
      prohibitions_ai_literacy: '2025-02-02',
      gpai_obligations: '2025-08-02',
      general_application: '2026-08-02',
      ai_generated_content_marking: '2026-12-02 (transitional date for certain existing systems, Art. 50(2))',
      high_risk_annex_iii: '2027-12-02 (postponed by Digital Omnibus on AI)',
      high_risk_product_safety_components: '2028-08-02 (postponed by Digital Omnibus on AI)'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689'
  },

  // 29. Right to Repair Directive
  // Sources:
  //   https://eur-lex.europa.eu/eli/dir/2024/1799/oj
  //   https://oeil.europarl.europa.eu/oeil/en/document-summary?id=1786203
  {
    name: 'Right to Repair',
    full_name: 'Directive (EU) 2024/1799 on common rules promoting the repair of goods',
    description: 'Obliges manufacturers of products with EU reparability requirements (e.g. washing machines, dishwashers, fridges, displays, vacuum cleaners, smartphones and tablets, servers, welding equipment, LMT batteries) to repair them at a reasonable price after the legal guarantee, and extends the legal guarantee by 12 months when consumers choose repair. Member States had to apply national rules from 31 July 2026. A European online repair platform follows by 31 July 2027.',
    category: 'environment',
    status: 'active',
    effective_date: '2024-07-30',
    application_date: '2026-07-31',
    key_requirements: [
      'Manufacturer obligation to repair Annex II products outside the legal guarantee (free or for reasonable price)',
      'Access to spare parts and tools at reasonable prices; no hindering of independent repair (software, hardware, contracts)',
      'Information on repair services and prices on a free-access website',
      'Optional European Repair Information Form',
      'Extension of legal guarantee by 12 months when repair is chosen',
      'Repaired-instead-of-replaced preference and loan devices may be offered'
    ],
    affected_products: ['Washing Machines', 'Dishwashers', 'Refrigerators', 'Electronic Displays', 'Vacuum Cleaners', 'Smartphones', 'Tablets', 'Servers and Data Storage', 'Welding Equipment', 'LMT Batteries'],
    dpp_deadlines: {
      transposition_and_application: '2026-07-31',
      european_repair_platform: '2027-07-31'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1799'
  },

  // 30. ECGT / EmpCo - Empowering Consumers for the Green Transition
  // Sources:
  //   https://eur-lex.europa.eu/eli/dir/2024/825/oj
  //   https://www.mayerbrown.com/en/insights/publications/2026/10/the-eu-directive-on-empowering-consumers-for-the-green-transition-two-years-on-what-it-requires-and-where-the-member-states-stand
  //   https://www.lewissilkin.com/insights/2026/11/07/the-green-claims-directive-is-dead-but-what-will-be-the-net-effect-of-zero-toler-102o8n1 (Green Claims Directive proposal listed for withdrawal in Commission Work Programme 2027)
  {
    name: 'ECGT',
    full_name: 'Directive (EU) 2024/825 empowering consumers for the green transition (amending Directives 2005/29/EC and 2011/83/EU)',
    description: 'Anti-greenwashing rules in EU consumer law, applicable since 27 September 2026. Bans generic environmental claims without recognised excellent performance, product-level climate-neutral claims based on offsetting, and sustainability labels not based on certification schemes or public authorities. Adds pre-contractual information on durability, reparability and the legal guarantee (harmonised notice and label). The separate Green Claims Directive proposal was not adopted: the Commission listed it for withdrawal in its 2027 Work Programme (November 2026), so ECGT is the binding baseline.',
    category: 'environment',
    status: 'active',
    effective_date: '2024-03-26',
    application_date: '2026-09-27',
    key_requirements: [
      'No generic environmental claims ("eco-friendly", "green") without recognised excellent environmental performance',
      'No product-level climate-neutral/compensated claims based on greenhouse gas offsetting',
      'Sustainability labels only if based on a certification scheme or established by public authorities',
      'Future environmental performance claims require an implementation plan and independent monitoring',
      'Information on durability guarantees, software updates and reparability score where available',
      'Harmonised notice/label on legal guarantee and commercial durability guarantee',
      'Ban on early-obsolescence practices and misleading claims on consumables'
    ],
    affected_products: ['All consumer products and marketing claims', 'Textiles', 'Electronics', 'Cosmetics', 'Food and Beverages', 'Packaging claims'],
    dpp_deadlines: {
      transposition: '2026-03-27',
      application: '2026-09-27',
      harmonised_guarantee_label: '2026-09-27'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L0825'
  },

  // 31. Product Liability Directive (new)
  // Sources:
  //   https://eur-lex.europa.eu/eli/dir/2024/2853/oj
  //   https://www.sidley.com/en/insights/newsupdates/2026/10/revised-eu-product-liability-directive
  {
    name: 'Product Liability Directive',
    full_name: 'Directive (EU) 2024/2853 on liability for defective products (repealing Directive 85/374/EEC)',
    description: 'Modernised strict liability regime for defective products, covering software, AI systems, digital manufacturing files, related services and substantially modified (refurbished) products. Applies to products placed on the market after 9 December 2026; Directive 85/374/EEC continues for earlier products. Introduces disclosure of evidence and rebuttable presumptions of defectiveness and causation; online platforms and fulfilment service providers can be liable as last resort.',
    category: 'safety',
    status: 'upcoming',
    effective_date: '2024-12-08',
    application_date: '2026-12-09',
    key_requirements: [
      'Strict liability of manufacturers incl. software and AI providers',
      'Liability of importers, authorised representatives, fulfilment service providers and online platforms (subsidiary)',
      'Defectiveness includes cybersecurity and lack of security updates',
      'Court-ordered disclosure of evidence and presumptions in favour of claimants',
      'Damage includes medically recognised psychological harm and loss/corruption of data',
      'Liability period 10 years (25 years for latent personal injury)'
    ],
    affected_products: ['All movable products', 'Software and AI systems', 'Connected Devices', 'Refurbished and Remanufactured Products', 'Digital Manufacturing Files'],
    dpp_deadlines: {
      transposition: '2026-12-09',
      application: 'Products placed on market after 2026-12-09'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L2853'
  },

  // 32. Forced Labour Regulation
  // Sources:
  //   https://eur-lex.europa.eu/eli/reg/2024/3015/oj
  //   https://valtioneuvosto.fi/en/-/1410877/eu-to-ban-products-made-with-forced-labour-regulation-now-in-force
  {
    name: 'Forced Labour Regulation',
    full_name: 'Regulation (EU) 2024/3015 on prohibiting products made with forced labour on the Union market',
    description: 'Prohibits placing or making available on the EU market, and exporting, products made wholly or partly with forced labour, irrespective of origin, company size or sector. Investigations are risk-based (Commission and national authorities, supported by a database of risk areas/products); banned products must be withdrawn and disposed of. Applies from 14 December 2027; Commission guidelines due by 14 June 2026.',
    category: 'environment',
    status: 'upcoming',
    effective_date: '2024-12-13',
    application_date: '2027-12-14',
    key_requirements: [
      'Prohibition of products made with forced labour at any stage of production',
      'Supply-chain traceability and evidence to respond to authority requests',
      'Risk-based investigations; decisions to withdraw, prevent and dispose of products',
      'Single EU information portal and forced labour risk database',
      'Customs controls at EU external borders'
    ],
    affected_products: ['All products (imported, domestic and exported)', 'Textiles and Cotton', 'Solar Panels and Polysilicon', 'Electronics', 'Agricultural Products', 'Mined Raw Materials'],
    dpp_deadlines: {
      commission_guidelines: '2026-06-14',
      application: '2027-12-14'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3015'
  },

  // 33. CBAM - Carbon Border Adjustment Mechanism
  // Sources:
  //   https://eur-lex.europa.eu/eli/reg/2023/956/oj
  //   https://www.ey.com/en_gl/technical/tax-alerts/eu-adopts-cbam-omnibus-regulation (Reg. (EU) 2025/2083)
  //   https://www.hsfkramer.com/fr/notes/crt/2026-01/operationalisation-and-simplification-of-the-eu-cbam-starting-the-year-with-a-cbam
  {
    name: 'CBAM',
    full_name: 'Regulation (EU) 2023/956 establishing a carbon border adjustment mechanism (as amended by Regulation (EU) 2025/2083)',
    description: 'Puts a carbon price on imports of cement, iron and steel, aluminium, fertilisers, electricity and hydrogen. The definitive period started on 1 January 2026: only authorised CBAM declarants may import goods above the de minimis threshold. Regulation (EU) 2025/2083 (CBAM Omnibus) replaced the EUR 150 per-consignment exemption with a 50-tonne annual mass threshold per importer and simplified emissions calculation and verification.',
    category: 'environment',
    status: 'active',
    effective_date: '2023-05-17',
    application_date: '2026-01-01',
    key_requirements: [
      'Authorised CBAM declarant status before importing above 50 tonnes per year',
      'Annual CBAM declaration of embedded emissions (direct and, where applicable, indirect)',
      'Purchase and surrender of CBAM certificates',
      'Verification of embedded emissions by accredited verifiers',
      'Deduction of carbon price paid in the country of origin',
      'Supplier emissions data collection across the supply chain'
    ],
    affected_products: ['Cement', 'Iron and Steel (incl. screws, bolts and certain downstream products)', 'Aluminium', 'Fertilisers', 'Hydrogen', 'Electricity'],
    dpp_deadlines: {
      transitional_reporting_period: '2023-10-01 to 2025-12-31',
      definitive_period: '2026-01-01',
      authorisation_transitional_rule: 'Applications filed by 2026-03-31 allow continued imports pending decision',
      first_annual_declaration: 'In 2027 for imports of 2026 (deadline as amended by Regulation (EU) 2025/2083)'
    },
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956'
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
