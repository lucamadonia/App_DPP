/**
 * Seed News Items via Supabase REST API
 *
 * Inserts 50+ news items into the news_items table covering EU regulations,
 * deadlines, product recalls, standards updates, and national implementations.
 *
 * Usage:
 *   node scripts/seed-news.mjs
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
const BATCH_SIZE = 25;

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
// News Items Data (55 items)
// ---------------------------------------------------------------------------
// NOTE: The DB schema CHECK constraint limits category to:
//   'regulation', 'deadline', 'update', 'warning'
// We map the broader categories as follows:
//   regulation -> regulation
//   deadline -> deadline
//   update/standard/guidance -> update
//   warning/recall/consultation -> warning

const NEWS_ITEMS = [
  // =========================================================================
  // ESPR Implementation Timeline
  // =========================================================================
  {
    title: 'ESPR enters into force: Digital Product Passports become EU law',
    summary: 'The Ecodesign for Sustainable Products Regulation (EU) 2024/1781 was published in the Official Journal, marking the start of the most significant product regulation reform in decades.',
    content: 'The Ecodesign for Sustainable Products Regulation (ESPR) entered into force on 18 July 2024, replacing the existing Ecodesign Directive 2009/125/EC. The regulation introduces mandatory Digital Product Passports (DPP), sustainability requirements, and a ban on the destruction of unsold consumer products. The European Commission will now develop delegated acts for specific product groups, with textiles and batteries expected to be among the first categories. Companies should begin preparations immediately, as the first product-specific requirements could apply as early as 2027.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2024-07-18T10:00:00Z',
    effective_date: '2024-07-18',
    priority: 'high',
    tags: ['ESPR', 'DPP', 'Ecodesign', 'EU Green Deal'],
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781'
  },
  {
    title: 'ESPR Textiles: DPP requirements expected from Q3 2027',
    summary: 'The European Commission has confirmed that textiles will be among the first product groups to require a Digital Product Passport under ESPR, with delegated acts expected in 2025.',
    content: 'According to the ESPR implementation roadmap, textiles are expected to be the first product category requiring a full Digital Product Passport. The delegated act for textiles is anticipated to be adopted in 2025-2026, with a compliance date from Q3 2027. The DPP for textiles will need to include information on fibre composition, country of manufacturing, durability scores, recycled content percentages, and instructions for repair and disposal. Brands and retailers should start mapping their supply chains and collecting the required data now to ensure readiness. The Commission is working with pilot projects to test DPP infrastructure.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-02-15T09:00:00Z',
    effective_date: '2027-07-18',
    priority: 'high',
    tags: ['ESPR', 'Textiles', 'DPP', 'Delegated Act'],
    link: null
  },
  {
    title: 'ESPR Electronics: Digital Product Passport timeline set for 2028',
    summary: 'Electronics manufacturers will need to provide DPPs for products placed on the EU market from early 2028, covering energy efficiency, repairability, and material composition.',
    content: 'The European Commission has outlined that electronics, including smartphones, laptops, and household appliances, will require Digital Product Passports from approximately Q1 2028. The DPP requirements for electronics will be particularly comprehensive, covering energy efficiency ratings, repairability scores, hazardous substance declarations, recycled content, expected lifetime, and spare parts availability. This builds on existing requirements from the ErP Directive and RoHS. Electronics manufacturers are advised to integrate DPP data collection into their existing product information management systems. The Commission has indicated that the delegated act will reference existing EPREL data where possible to minimize additional burden.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-04-20T08:00:00Z',
    effective_date: '2028-01-01',
    priority: 'high',
    tags: ['ESPR', 'Electronics', 'DPP', 'Repairability'],
    link: null
  },
  {
    title: 'ESPR: Commission launches stakeholder consultation on DPP technical standards',
    summary: 'The European Commission has opened a public consultation on the technical standards for Digital Product Passports, including data carriers, data models, and interoperability requirements.',
    content: 'The European Commission has launched a key stakeholder consultation on the technical architecture of the Digital Product Passport system. The consultation covers: (1) data carrier requirements (QR codes, RFID, NFC), (2) standardized data models and vocabularies, (3) interoperability requirements between DPP systems, (4) access rights management for different stakeholder groups, (5) the decentralized DPP registry architecture. Interested parties have until September 2025 to submit feedback. CEN/CENELEC and ETSI are developing harmonized standards in parallel. Companies developing DPP solutions should actively participate to shape the technical framework.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-06-01T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['ESPR', 'DPP', 'Technical Standards', 'Consultation'],
    link: null
  },

  // =========================================================================
  // Battery Regulation
  // =========================================================================
  {
    title: 'Battery Regulation: Carbon footprint declaration mandatory from February 2025',
    summary: 'EV battery and industrial battery manufacturers must now provide carbon footprint declarations for batteries placed on the EU market, the first compliance milestone under the Battery Regulation.',
    content: 'Starting 18 February 2025, manufacturers of electric vehicle batteries and rechargeable industrial batteries with a capacity above 2 kWh must provide a carbon footprint declaration. This declaration must cover the entire lifecycle from raw material extraction through manufacturing. The carbon footprint must be calculated according to the methodology laid out in the delegated acts, using specific Product Environmental Footprint Category Rules (PEFCR). This is the first in a series of compliance milestones that will culminate in the mandatory battery passport from February 2027. Companies should use this interim period to establish data collection processes and verify supplier data.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-01-15T08:00:00Z',
    effective_date: '2025-02-18',
    priority: 'high',
    tags: ['Battery Regulation', 'Carbon Footprint', 'EV Batteries', 'Deadline'],
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542'
  },
  {
    title: 'Battery passport: Full requirements apply from February 2027',
    summary: 'The mandatory battery passport for EV and industrial batteries above 2 kWh will include state of health data, material composition, and supply chain due diligence information.',
    content: 'From 18 February 2027, all EV batteries and industrial batteries with capacity exceeding 2 kWh placed on the EU market must carry a digital battery passport accessible via QR code. The passport must contain: unique battery identifier, manufacturer information, manufacturing date and place, battery weight and capacity, carbon footprint class, recycled content percentages, expected lifetime in cycles, state of health parameters, collection and recycling information, and due diligence report. The Global Battery Alliance (GBA) Battery Passport is being developed as a potential technical solution. Companies should begin pilot implementations now.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-03-10T09:00:00Z',
    effective_date: '2027-02-18',
    priority: 'high',
    tags: ['Battery Regulation', 'Battery Passport', 'DPP', 'QR Code'],
    link: null
  },
  {
    title: 'Battery Regulation: Carbon footprint performance classes coming August 2026',
    summary: 'Carbon footprint performance classes for EV and industrial batteries will apply from August 2026, requiring batteries to be classified into categories based on their lifecycle emissions.',
    content: 'The Battery Regulation mandates that from 18 August 2026, EV and large industrial batteries must carry carbon footprint performance class labels. These classes will range from A (lowest carbon footprint) to E (highest), similar to the energy labelling approach. The class thresholds will be defined in a delegated act based on the distribution of carbon footprint values declared during the first compliance period (since February 2025). A subsequent maximum carbon footprint threshold may follow, effectively banning the highest-emission batteries from the EU market. Manufacturers should aim for continuous improvement of their carbon footprint to maintain market access.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-05-22T10:00:00Z',
    effective_date: '2026-08-18',
    priority: 'medium',
    tags: ['Battery Regulation', 'Carbon Footprint', 'Performance Classes', 'Labelling'],
    link: null
  },

  // =========================================================================
  // PPWR - Packaging
  // =========================================================================
  {
    title: 'PPWR published: New EU packaging rules to apply from August 2027',
    summary: 'The Packaging and Packaging Waste Regulation (PPWR) has been adopted, setting mandatory recycled content targets, recyclability requirements, and packaging reduction goals.',
    content: 'The Packaging and Packaging Waste Regulation (EU) 2025/40 has been published in the Official Journal, replacing the 30-year-old Packaging Directive 94/62/EC. Key provisions include: mandatory recycled content targets (30% for PET beverage bottles by 2030, 65% by 2040), design-for-recycling requirements with recyclability grades, packaging reduction targets (5% by 2030, 10% by 2035, 15% by 2040), mandatory deposit-return systems for plastic beverage bottles and aluminium cans by 2029, restrictions on certain single-use packaging formats in HORECA, and standardized labelling with sorting instructions. Companies have until August 2027 to comply with the first set of requirements.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-02-11T08:00:00Z',
    effective_date: '2027-08-12',
    priority: 'high',
    tags: ['PPWR', 'Packaging', 'Recycled Content', 'DRS'],
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0040'
  },
  {
    title: 'PPWR: Mandatory deposit-return systems by 2029 for beverages',
    summary: 'EU Member States must establish deposit-return systems for single-use plastic beverage bottles and aluminium cans by January 2029, unless existing systems achieve 90% collection rates.',
    content: 'Under the PPWR, all EU Member States must implement a deposit-return system (DRS) for single-use plastic beverage bottles up to 3 litres and single-use aluminium beverage cans by 1 January 2029. An exemption exists for Member States that already achieve a 90% separate collection rate for these containers through existing systems. Countries like Germany, which already has a well-functioning DRS (Pfandsystem), will largely be unaffected. However, countries without such systems, including Spain, France, and Italy, will need to establish new infrastructure. The regulation also sets a 90% collection target for these containers by 2029.',
    category: 'deadline',
    countries: ['EU', 'ES', 'FR', 'IT'],
    published_at: '2025-03-18T09:00:00Z',
    effective_date: '2029-01-01',
    priority: 'medium',
    tags: ['PPWR', 'Deposit-Return', 'Beverage Packaging', 'Collection'],
    link: null
  },
  {
    title: 'PPWR: Recyclability design criteria for packaging published',
    summary: 'The Commission has released guidance on the design-for-recycling criteria that will be used to assess packaging recyclability under the PPWR, with compliance expected from 2030.',
    content: 'The European Commission has published draft guidelines on the design-for-recycling criteria under the PPWR. Packaging will be graded on a scale from A (excellent recyclability) to E (not recyclable), considering material compatibility, ease of separation, and availability of recycling infrastructure. Grade E packaging will be banned from the market after a transition period. Key requirements include: mono-material preference, removable labels and adhesives, no problematic additives (carbon black, PVC sleeves on PET), minimum recycling yield thresholds, and compatibility with existing sorting and recycling infrastructure in Member States. Packaging producers should begin auditing their portfolios against these criteria.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-07-10T10:00:00Z',
    effective_date: '2030-01-01',
    priority: 'medium',
    tags: ['PPWR', 'Recyclability', 'Design for Recycling', 'Packaging'],
    link: null
  },

  // =========================================================================
  // CSRD / CSDDD - Sustainability Reporting
  // =========================================================================
  {
    title: 'CSRD: Large companies must report sustainability data for FY2025',
    summary: 'All large companies meeting two of three criteria (250+ employees, EUR 50M+ revenue, EUR 25M+ total assets) must prepare sustainability reports for fiscal year 2025.',
    content: 'The second wave of CSRD reporting requirements takes effect for fiscal year 2025, covering all large companies (previously only large public-interest entities were covered for FY2024). Companies must report according to the European Sustainability Reporting Standards (ESRS) covering environment, social, and governance matters. Key requirements include double materiality assessment, Scope 1/2/3 GHG emissions, climate transition plans, biodiversity impact, workforce conditions, and governance structures. Reports must be digitally tagged in iXBRL format and subject to limited assurance by an auditor. Companies should finalize their data collection processes and engage assurance providers well in advance.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-01-10T08:00:00Z',
    effective_date: '2025-01-01',
    priority: 'high',
    tags: ['CSRD', 'Sustainability Reporting', 'ESRS', 'ESG'],
    link: null
  },
  {
    title: 'CSRD: Listed SMEs enter reporting scope from FY2026',
    summary: 'Listed small and medium-sized enterprises will need to prepare sustainability reports using simplified ESRS standards from fiscal year 2026, with an opt-out option until 2028.',
    content: 'Starting with fiscal year 2026, listed SMEs on EU regulated markets will fall under the CSRD reporting obligations. However, they can use the simplified LSME ESRS standards and have the option to delay reporting until FY2028. The simplified standards significantly reduce the number of mandatory datapoints while maintaining core disclosures on climate, workforce, and governance. Non-listed SMEs are not directly covered but may face indirect pressure from value chain reporting requirements of larger companies. Voluntary VSME standards are available for non-listed SMEs wishing to meet customer and lender expectations.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-04-05T09:00:00Z',
    effective_date: '2026-01-01',
    priority: 'medium',
    tags: ['CSRD', 'SME', 'ESRS', 'Listed Companies'],
    link: null
  },
  {
    title: 'CSDDD: Due diligence obligations for largest companies from July 2027',
    summary: 'Companies with 1,500+ employees and EUR 450M+ worldwide turnover must implement human rights and environmental due diligence processes by July 2027.',
    content: 'The Corporate Sustainability Due Diligence Directive (CSDDD) will first apply to the largest companies from 26 July 2027. These companies must establish and implement a due diligence policy, identify adverse human rights and environmental impacts in their operations and value chains, take appropriate measures to prevent and mitigate identified impacts, establish a complaints mechanism, and monitor the effectiveness of their measures. Companies must also adopt a climate transition plan aligned with limiting global warming to 1.5 degrees Celsius. Directors of in-scope companies have a duty of care for the implementation of due diligence. Member States must transpose the directive by 26 July 2026.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-02-28T10:00:00Z',
    effective_date: '2027-07-26',
    priority: 'high',
    tags: ['CSDDD', 'Due Diligence', 'Human Rights', 'Supply Chain'],
    link: null
  },

  // =========================================================================
  // EUDR - Deforestation
  // =========================================================================
  {
    title: 'EUDR: Deforestation-free products rules apply from December 2025',
    summary: 'Large operators and traders must ensure that commodities (cattle, cocoa, coffee, oil palm, rubber, soya, wood) placed on the EU market are deforestation-free.',
    content: 'The EU Deforestation Regulation (EUDR) enters full application on 30 December 2025 for large operators and traders. Companies must submit due diligence statements confirming that products are deforestation-free (no deforestation after 31 December 2020) and comply with the laws of the country of production. Geolocation coordinates of all production plots must be provided. The regulation covers seven commodities: cattle, cocoa, coffee, oil palm, rubber, soya, and wood, as well as derived products (leather, chocolate, furniture, paper, etc.). The EU IT system for due diligence statements is being developed. Companies should urgently map their supply chains and collect geolocation data from suppliers.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-03-01T08:00:00Z',
    effective_date: '2025-12-30',
    priority: 'high',
    tags: ['EUDR', 'Deforestation', 'Due Diligence', 'Supply Chain'],
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1115'
  },
  {
    title: 'EUDR: SME operators get additional 6-month grace period',
    summary: 'Small and medium-sized enterprises benefit from an extended deadline of 30 June 2026 for EUDR compliance, giving them additional time to set up supply chain traceability.',
    content: 'Recognizing the challenges for smaller companies, the EUDR provides SME operators and traders with an additional six months beyond the main deadline, making their compliance date 30 June 2026. SMEs should use this additional time to: (1) identify all products in scope, (2) engage suppliers for geolocation data collection, (3) implement or procure due diligence management systems, (4) train staff on the new requirements, (5) conduct trial due diligence statements. The European Commission has also committed to providing guidance documents and free tools to support SME compliance.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-04-12T09:00:00Z',
    effective_date: '2026-06-30',
    priority: 'medium',
    tags: ['EUDR', 'SME', 'Deforestation', 'Grace Period'],
    link: null
  },

  // =========================================================================
  // National Updates - Germany
  // =========================================================================
  {
    title: 'Germany: VerpackG amendment strengthens packaging recycling requirements',
    summary: 'Germany has amended its Packaging Act (VerpackG) to align with the EU PPWR and introduce stricter recyclability requirements for packaging placed on the German market.',
    content: 'The German Packaging Act (Verpackungsgesetz) has been amended to incorporate requirements from the EU PPWR ahead of the EU-wide application date. Key changes include: enhanced recyclability assessment criteria for the dual system fee modulation, expanded requirements for reusable packaging in food delivery (now including all food service establishments, not just restaurants), stricter enforcement of the LUCID registration requirement, updated minimum recycled content for beverage containers, and increased penalties for non-compliance. The Zentrale Stelle Verpackungsregister (ZSVR) has published updated guidelines. All companies placing packaging on the German market should review their registrations and systembeteiligungspflicht.',
    category: 'regulation',
    countries: ['DE'],
    published_at: '2025-03-20T08:00:00Z',
    effective_date: '2025-07-01',
    priority: 'high',
    tags: ['VerpackG', 'Germany', 'Packaging', 'Recycling'],
    link: 'https://www.verpackungsregister.org/'
  },
  {
    title: 'Germany: New battery take-back obligations for online sellers',
    summary: 'Online sellers of batteries in Germany must now provide free take-back points within a reasonable distance of consumers, effective from the Battery Regulation transposition.',
    content: 'Germany has updated its BattG (Batteriegesetz) to transpose elements of the EU Battery Regulation. Online sellers must now offer customers the ability to return waste batteries free of charge, either through partnerships with municipal collection points, retail take-back networks, or dedicated shipping solutions. The registration at the Umweltbundesamt battery register remains mandatory. Sellers must also display the crossed-out wheeled bin symbol and battery chemistry designation on product listings. Fines for non-compliance have been increased to up to EUR 100,000.',
    category: 'regulation',
    countries: ['DE'],
    published_at: '2025-05-15T10:00:00Z',
    effective_date: '2025-08-01',
    priority: 'medium',
    tags: ['BattG', 'Germany', 'Batteries', 'Take-back'],
    link: null
  },
  {
    title: 'Germany: ElektroG - expanded scope includes more product categories',
    summary: 'The German Electrical and Electronic Equipment Act (ElektroG) expands the scope of WEEE registration to additional product categories and tightens collection targets.',
    content: 'An amendment to the ElektroG (Elektro- und Elektronikgeraetegesetz) expands the product scope to better align with EU developments, including certain e-cigarette components, smart home devices, and IoT sensors that were previously in grey zones. The Stiftung EAR registration requirements now include more granular product categorization. Annual collection targets have been increased, and manufacturers face stricter penalties for non-registration. Companies selling electrical or electronic products in Germany should verify their EAR registration status and update product classifications.',
    category: 'update',
    countries: ['DE'],
    published_at: '2025-06-01T09:00:00Z',
    effective_date: '2025-09-01',
    priority: 'medium',
    tags: ['ElektroG', 'WEEE', 'Germany', 'EAR Registration'],
    link: null
  },

  // =========================================================================
  // National Updates - France
  // =========================================================================
  {
    title: 'France: AGEC Law - Durability Index replaces Repairability Index',
    summary: 'France transitions from the Repairability Index to a broader Durability Index for certain electronic products, covering additional criteria including reliability and robustness.',
    content: 'France is implementing the next phase of its anti-waste law (AGEC - Loi anti-gaspillage pour une economie circulaire) by expanding the Repairability Index (Indice de reparabilite) to a Durability Index (Indice de durabilite) for certain product categories. The Durability Index includes the existing repairability criteria plus new dimensions: reliability (expected component lifespan), robustness (resistance to wear and damage), and upgradability (ability to upgrade components). The index will initially apply to washing machines and smartphones, with other categories to follow. Products must display the index score from 1 to 10 at the point of sale. The methodology has been developed in consultation with industry and consumer groups.',
    category: 'regulation',
    countries: ['FR'],
    published_at: '2025-01-20T08:00:00Z',
    effective_date: '2025-04-01',
    priority: 'high',
    tags: ['AGEC', 'France', 'Durability Index', 'Repairability'],
    link: 'https://www.ecologie.gouv.fr/indice-reparabilite'
  },
  {
    title: 'France: Expanded Triman and Info-Tri labelling requirements',
    summary: 'France has updated the Triman and Info-Tri labelling requirements to cover additional product categories, with stricter minimum size requirements and clearer sorting instructions.',
    content: 'The French government has published updated specifications for the Triman recycling logo and Info-Tri sorting guidance, expanding requirements to new product categories and tightening existing rules. All products and packaging subject to Extended Producer Responsibility (EPR) must display the Triman logo together with specific Info-Tri sorting instructions. New requirements include larger minimum sizes (10mm standard, 6mm for small packaging), additional colour coding for sorting guidance, and mandatory digital alternatives for very small products. EPR scheme operators CITEO and Refashion have published updated design guidelines. Companies selling in France should audit their packaging and product labelling for compliance.',
    category: 'update',
    countries: ['FR'],
    published_at: '2025-04-25T10:00:00Z',
    effective_date: '2025-09-01',
    priority: 'medium',
    tags: ['Triman', 'Info-Tri', 'France', 'Labelling', 'EPR'],
    link: null
  },

  // =========================================================================
  // Product Recalls and Warnings
  // =========================================================================
  {
    title: 'Safety Gate alert: Children\'s toys recalled for excessive phthalate content',
    summary: 'Multiple toy brands have been recalled across the EU via the Safety Gate system due to phthalate concentrations exceeding REACH Annex XVII limits.',
    content: 'The European Commission Safety Gate (formerly RAPEX) has issued alerts for multiple children\'s toy products found to contain DEHP, DBP, and BBP phthalates above the legal limit of 0.1% by weight. The affected products were primarily imported from non-EU countries and sold through online marketplaces. National market surveillance authorities in Germany, France, and the Netherlands conducted the testing. Consumers are advised to stop using the identified products and return them to the point of purchase. This highlights the importance of robust supply chain testing and REACH compliance for importers, especially for products in contact with children. Companies should review their supplier testing protocols.',
    category: 'warning',
    countries: ['EU', 'DE', 'FR', 'NL'],
    published_at: '2025-02-05T14:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['Product Recall', 'Toys', 'Phthalates', 'REACH', 'Safety Gate'],
    link: 'https://ec.europa.eu/safety-gate-alerts/screen/webReport'
  },
  {
    title: 'Safety Gate: Electronic chargers recalled for fire hazard',
    summary: 'Several brands of USB chargers and power banks have been recalled due to inadequate insulation and overheating risk, posing fire and electric shock hazards.',
    content: 'Multiple USB chargers and power banks sold in the EU have been recalled following reports of overheating and in some cases fire incidents. Market surveillance testing revealed inadequate insulation between primary and secondary circuits, exceeding the maximum permissible touch temperature, and missing or fraudulent CE marking. The affected products were primarily sold through online marketplaces at very low prices. Authorities in multiple Member States have coordinated the recall through the Safety Gate system. This underscores the importance of the Low Voltage Directive compliance and proper conformity assessment for electrical accessories. E-commerce platforms are required under GPSR to cooperate in the removal of unsafe products.',
    category: 'warning',
    countries: ['EU'],
    published_at: '2025-03-12T11:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['Product Recall', 'Electronics', 'Fire Hazard', 'CE Marking'],
    link: null
  },
  {
    title: 'RAPEX alert: Cosmetics products contain banned substances',
    summary: 'Several cosmetics products have been flagged in the Safety Gate system for containing prohibited substances including hydroquinone and mercury compounds.',
    content: 'The European Commission Safety Gate system has issued notifications for cosmetics products containing substances banned under the EU Cosmetics Regulation (EC) No 1223/2009. Products containing hydroquinone above permitted concentrations and mercury compounds were identified by market surveillance authorities in Belgium and Spain. The products were primarily skin-lightening creams sold through specialized retail and online channels. Member States are coordinating withdrawal and recall actions. Companies importing cosmetics must ensure Responsible Person obligations are met and product safety reports are current.',
    category: 'warning',
    countries: ['EU', 'BE', 'ES'],
    published_at: '2025-04-18T13:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Cosmetics', 'Product Recall', 'Safety Gate', 'Banned Substances'],
    link: null
  },
  {
    title: 'Safety alert: Children\'s clothing with excessive drawstring length',
    summary: 'Children\'s outdoor clothing recalled in the EU for non-compliance with EN 14682 standard on cords and drawstrings, posing strangulation risk.',
    content: 'Several children\'s clothing items sold across the EU have been recalled after testing revealed non-compliance with the EN 14682 standard regarding cords and drawstrings on children\'s clothing. The products, targeted at children aged 7-14, had drawstrings in the hood area exceeding the maximum permitted length and toggles that could become entangled. Under the General Product Safety Regulation (GPSR), the manufacturer and importers have initiated voluntary recalls. The products were sold in retail stores and online in Germany, Austria, and Poland. This serves as a reminder that even non-electronic products must meet stringent safety requirements when intended for use by children.',
    category: 'warning',
    countries: ['DE', 'AT', 'PL'],
    published_at: '2025-05-20T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Children Clothing', 'Product Recall', 'Safety Standard', 'EN 14682'],
    link: null
  },

  // =========================================================================
  // ISO and Standards Updates
  // =========================================================================
  {
    title: 'ISO 14067:2023 update improves carbon footprint calculation for products',
    summary: 'The updated ISO 14067 standard provides improved guidance for quantifying the carbon footprint of products, directly relevant to ESPR and Battery Regulation requirements.',
    content: 'The International Organization for Standardization has published updates to ISO 14067 on greenhouse gas carbon footprint of products. The revised standard includes improved guidance on biogenic carbon accounting, updated global warming potential factors aligned with the latest IPCC assessment report, clearer allocation rules for multi-output processes, and enhanced requirements for data quality assessment. This standard is directly referenced in several EU regulations including the Battery Regulation carbon footprint methodology and is expected to serve as a key reference for ESPR carbon footprint declarations. Companies calculating product carbon footprints should update their methodologies accordingly.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-01-25T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['ISO 14067', 'Carbon Footprint', 'Standards', 'LCA'],
    link: 'https://www.iso.org/standard/71206.html'
  },
  {
    title: 'CEN/CENELEC: New standards for Digital Product Passport data carriers',
    summary: 'European standards organizations have published draft standards for DPP data carriers, covering QR codes, RFID/NFC, and data matrix requirements for product identification.',
    content: 'CEN/CENELEC has released draft standards (prEN series) for Digital Product Passport data carriers under the standardization request from the European Commission. The standards cover: (1) 2D barcode/QR code specifications for DPP access, (2) RFID and NFC tag requirements for embedded data carriers, (3) data matrix formats for industrial applications, (4) minimum print quality and scanning reliability requirements, (5) interoperability between data carrier types. The standards align with GS1 Digital Link for product identification and will serve as the harmonized reference under ESPR delegated acts. A 60-day public comment period is open for industry feedback.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-06-15T08:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['CEN/CENELEC', 'DPP', 'Standards', 'QR Code', 'Data Carrier'],
    link: null
  },
  {
    title: 'IEC 62430 update: Environmental design requirements for electronic products',
    summary: 'The updated IEC 62430 standard on environmentally conscious design for electronic products now includes circular economy principles aligned with ESPR.',
    content: 'IEC has published an updated version of IEC 62430, the standard for environmentally conscious design of electrical and electronic products. The revision incorporates circular economy design principles, including design for disassembly, design for recycling, and design for longevity. The update also provides guidance on material declaration formats that align with emerging DPP requirements. Key additions include: methodology for assessing product repairability, guidelines for minimizing critical raw material usage, frameworks for recyclability assessment, and end-of-life scenario planning. This standard is expected to be referenced in ESPR delegated acts for electronics.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-07-20T10:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['IEC 62430', 'Eco-design', 'Electronics', 'Circular Economy'],
    link: null
  },

  // =========================================================================
  // GPSR and Market Surveillance
  // =========================================================================
  {
    title: 'GPSR fully applicable: New obligations for online marketplaces',
    summary: 'The General Product Safety Regulation is now fully applicable, introducing new due diligence requirements for online marketplaces and enhanced recall procedures.',
    content: 'The General Product Safety Regulation (EU) 2023/988 became fully applicable on 13 December 2024, replacing the old General Product Safety Directive from 2001. Key changes now in effect: online marketplaces must designate a single liaison point for market surveillance authorities, verify that sellers have completed product safety assessments, remove unsafe products within specified timeframes, and cooperate with recall actions. Product recalls must now include direct consumer notification where the seller has customer contact data. The Safety Business Gateway replaces the old RAPEX notification system for business-to-authority reporting. Companies selling consumer products must update their compliance processes.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2024-12-13T08:00:00Z',
    effective_date: '2024-12-13',
    priority: 'high',
    tags: ['GPSR', 'Product Safety', 'Online Marketplace', 'Recalls'],
    link: null
  },

  // =========================================================================
  // Toy Safety
  // =========================================================================
  {
    title: 'New Toy Safety Regulation: DPP for toys from July 2027',
    summary: 'The new EU Toy Safety Regulation introduces a mandatory Digital Product Passport for toys and strengthens chemical restrictions, with full application from July 2027.',
    content: 'Regulation (EU) 2024/1262 on toy safety has been adopted, replacing the Toy Safety Directive 2009/48/EC. The regulation introduces several major changes: mandatory Digital Product Passport for each toy model, significantly strengthened chemical restrictions (including bans on endocrine disruptors and new limits for allergens), reduced lead limits to 0.3 mg/kg from 2.0 mg/kg, stricter safety assessment for connected toys (cybersecurity), and enhanced market surveillance powers. The DPP for toys must include manufacturer information, materials used, applicable safety standards, conformity assessment data, and any age restrictions. The toy industry has a transition period until 17 July 2027 to comply.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-01-08T10:00:00Z',
    effective_date: '2027-07-17',
    priority: 'high',
    tags: ['Toy Safety', 'DPP', 'Chemical Restrictions', 'Children'],
    link: null
  },

  // =========================================================================
  // Machinery Regulation
  // =========================================================================
  {
    title: 'Machinery Regulation: Transition period opens for new requirements',
    summary: 'The new Machinery Regulation (EU) 2023/1230 is now in its transition period, allowing manufacturers to comply with either the old Directive or the new Regulation until January 2027.',
    content: 'The new EU Machinery Regulation entered into force in July 2024 and is now in a dual transition period alongside the existing Machinery Directive 2006/42/EC. Until 20 January 2027, manufacturers can choose to comply with either framework. The new Regulation introduces significant changes: digital format for instructions and declaration of conformity, cybersecurity requirements for connected machinery, safety requirements for AI-enabled autonomous systems, updated conformity assessment procedures for high-risk machinery, and direct applicability without national transposition. Manufacturers should use the transition period to prepare, particularly for the digital documentation requirements and any new third-party conformity assessment obligations.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-02-20T09:00:00Z',
    effective_date: '2027-01-20',
    priority: 'medium',
    tags: ['Machinery Regulation', 'CE Marking', 'Transition Period', 'AI Safety'],
    link: null
  },

  // =========================================================================
  // Medical Devices
  // =========================================================================
  {
    title: 'MDR transition deadlines extended for legacy devices',
    summary: 'The EU has extended transition periods for certain legacy medical devices under the MDR, giving manufacturers until 2027-2028 depending on device class.',
    content: 'The European Parliament and Council have adopted amendments to the Medical Device Regulation (MDR) extending the transition deadlines for legacy devices that were certified under the old Directives. Class IIb and IIa devices now have until 31 December 2027, and Class I up-classified devices until 31 December 2028 to obtain MDR certificates, provided manufacturers have already applied to a Notified Body. This extension addresses the significant backlog at Notified Bodies and aims to prevent medical device shortages. Manufacturers must still have submitted their MDR application before the extension applies. The UDI (Unique Device Identification) requirements continue to roll out according to the original timeline.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-03-25T10:00:00Z',
    effective_date: '2027-12-31',
    priority: 'medium',
    tags: ['MDR', 'Medical Devices', 'Transition', 'Notified Body'],
    link: null
  },

  // =========================================================================
  // Energy Labelling
  // =========================================================================
  {
    title: 'Energy labelling: New product groups to receive A-G labels',
    summary: 'The European Commission is preparing new energy labelling regulations for several product groups, expanding the A-G scale system to heat pumps, solar panels, and commercial refrigeration.',
    content: 'The European Commission has announced plans to expand the A-G energy labelling system to additional product groups as part of the European Green Deal. Priority product groups for new energy labels include: stand-alone heat pumps, solar thermal systems, commercial refrigeration (display cabinets and vending machines), and cooking appliances. The Commission is also reviewing existing labels for potential rescaling, particularly where a significant proportion of products have clustered in the top energy classes. All new labels will include a QR code linking to the EPREL product database, where consumers can access detailed product specifications. Draft delegated acts are expected for public consultation in late 2025.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-05-08T08:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['Energy Labelling', 'EPREL', 'Heat Pumps', 'A-G Scale'],
    link: null
  },

  // =========================================================================
  // RoHS and REACH Updates
  // =========================================================================
  {
    title: 'REACH: New substances added to SVHC Candidate List',
    summary: 'ECHA has added 8 new Substances of Very High Concern to the REACH Candidate List, bringing the total to over 240 substances with notification and communication obligations.',
    content: 'The European Chemicals Agency (ECHA) has published the latest update to the REACH SVHC Candidate List, adding 8 new substances. The newly listed substances include several PFAS compounds, a flame retardant, and an industrial solvent. Companies manufacturing or importing articles containing these substances above 0.1% by weight must: (1) notify ECHA within 6 months, (2) communicate the presence to customers in the supply chain, (3) provide information to consumers upon request within 45 days, and (4) submit data to the SCIP database for waste management purposes. Companies should screen their product portfolios against the updated list and update SCIP notifications accordingly.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-01-30T10:00:00Z',
    effective_date: '2025-01-30',
    priority: 'high',
    tags: ['REACH', 'SVHC', 'ECHA', 'Candidate List', 'PFAS'],
    link: 'https://echa.europa.eu/candidate-list-table'
  },
  {
    title: 'RoHS: Exemption renewals for lead in electronics under review',
    summary: 'The European Commission is reviewing several RoHS exemptions for lead use in electronics, with potential implications for soldering and electronic component manufacturing.',
    content: 'The European Commission has initiated the review of multiple RoHS Directive exemptions related to lead use in electronic equipment. Key exemptions under review include: lead in high-melting-temperature solders (Annex III, exemption 7a), lead in solders for servers and data storage systems (exemption 7c-I), and lead in glass of optical components (exemption 13b). Stakeholders have been invited to provide technical evidence on the availability of substitutes and the socio-economic impact of potential expiration. The Oeko-Institut is conducting the technical review. If exemptions are not renewed, manufacturers would need to transition to lead-free alternatives within a specified transition period. Companies relying on these exemptions should prepare contingency plans.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-04-10T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['RoHS', 'Lead Exemptions', 'Electronics', 'Soldering'],
    link: null
  },

  // =========================================================================
  // F-Gas and Climate
  // =========================================================================
  {
    title: 'Revised F-Gas Regulation: New bans from January 2025',
    summary: 'The revised F-Gas Regulation introduces new prohibitions on certain fluorinated greenhouse gas uses from January 2025, with additional bans phasing in through 2027.',
    content: 'The revised F-Gas Regulation (EU) 2024/573 introduced its first set of new bans from 1 January 2025. Newly prohibited uses include certain self-contained refrigeration and freezing equipment containing HFCs with GWP of 150 or more. From 2027, further bans will apply to split air conditioning systems containing F-gases with GWP of 750 or more, and from 2026, new electrical switchgear using SF6. The regulation also accelerates the HFC phase-down quota system, reducing available HFC quantities more rapidly than under the previous regulation. Companies in the HVAC-R sector should review their product portfolios and plan the transition to lower-GWP or natural refrigerant alternatives.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-01-05T08:00:00Z',
    effective_date: '2025-01-01',
    priority: 'medium',
    tags: ['F-Gas', 'HFC', 'Refrigerants', 'Climate', 'Phase-down'],
    link: null
  },

  // =========================================================================
  // National Updates - Other Countries
  // =========================================================================
  {
    title: 'Austria: EPR for textiles collection from January 2025',
    summary: 'Austria mandates separate collection of used textiles as part of its Waste Management Act update, aligning with the EU Waste Framework Directive requirements.',
    content: 'Austria has implemented mandatory separate collection of textile waste ahead of the EU-wide deadline, incorporating the requirement into its Abfallwirtschaftsgesetz (AWG). Municipalities must provide accessible collection points for used textiles, and producers placing textiles on the Austrian market are expected to contribute to collection and recycling costs through an Extended Producer Responsibility scheme. The move is in anticipation of the EU Waste Framework Directive requirement for mandatory textile separate collection from 2025. Austria joins France, the Netherlands, and Sweden as early movers on textile circularity.',
    category: 'regulation',
    countries: ['AT'],
    published_at: '2025-01-12T10:00:00Z',
    effective_date: '2025-01-01',
    priority: 'medium',
    tags: ['Austria', 'Textiles', 'EPR', 'Separate Collection'],
    link: null
  },
  {
    title: 'Netherlands: Circular economy milestone report shows packaging recycling at 78%',
    summary: 'The Netherlands has achieved a 78% packaging recycling rate, exceeding the EU target, driven by strong deposit-return and EPR systems.',
    content: 'The Netherlands Afvalfonds Verpakkingen has published its annual report showing that the country achieved a 78% packaging recycling rate in 2024, significantly exceeding the current EU minimum target of 65%. Particularly strong performance was seen in glass (87%) and paper/cardboard (85%). The expansion of the deposit-return system (statiegeld) to cans in 2023 contributed to a significant increase in aluminium can collection rates. The report highlights the Netherlands\' position as a leader in circular packaging and provides insights for other Member States implementing the PPWR. However, challenges remain in plastic recycling quality and flexible packaging collection.',
    category: 'update',
    countries: ['NL'],
    published_at: '2025-05-02T09:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['Netherlands', 'Packaging', 'Recycling', 'Circular Economy'],
    link: null
  },
  {
    title: 'Italy: New regulations for food contact materials labelling',
    summary: 'Italy has introduced updated requirements for food contact material labelling, including mandatory material identification codes and recycling guidance on all food packaging.',
    content: 'Italy has updated its environmental labelling requirements for packaging under Legislative Decree 116/2020, with new enforcement provisions taking effect. All packaging placed on the Italian market must now include: alphanumeric material identification codes according to Decision 129/97/EC, clear separation and recycling instructions for consumers, and the collection system applicable in the consumer\'s location. The requirement applies to all packaging components including primary, secondary, and tertiary packaging. Italy\'s CONAI system has published updated guidelines. Companies selling packaged products in Italy must ensure full compliance or face penalties. Digital labelling via QR codes is acceptable for small packaging.',
    category: 'regulation',
    countries: ['IT'],
    published_at: '2025-02-08T10:00:00Z',
    effective_date: '2025-01-01',
    priority: 'medium',
    tags: ['Italy', 'Packaging', 'Labelling', 'Food Contact'],
    link: null
  },
  {
    title: 'Spain: Extended Producer Responsibility for textiles from 2025',
    summary: 'Spain introduces EPR for textiles through its new Royal Decree, requiring producers to organize and finance the collection and management of used textiles.',
    content: 'Spain has adopted a Royal Decree establishing an Extended Producer Responsibility system for textiles, making it one of the first EU countries to implement a dedicated textile EPR scheme alongside France. Producers placing textile products on the Spanish market must: join an authorized collective compliance scheme (SCRAP), contribute financially to collection, sorting, and recycling of textile waste, meet minimum reuse and recycling targets, and report annually on quantities placed on market and waste management results. The scheme is expected to significantly improve textile waste management in Spain, where currently less than 12% of textile waste is separately collected. The transition period allows producers until mid-2025 to register.',
    category: 'regulation',
    countries: ['ES'],
    published_at: '2025-03-05T08:00:00Z',
    effective_date: '2025-01-01',
    priority: 'medium',
    tags: ['Spain', 'Textiles', 'EPR', 'Royal Decree'],
    link: null
  },
  {
    title: 'Sweden: Chemical tax on electronics updated with higher rates',
    summary: 'Sweden has increased the chemical tax (kemikalieskatt) on electronics, raising the per-kg tax rates for products containing brominated flame retardants.',
    content: 'The Swedish chemical tax on electronics (kemikalieskatt) has been updated with increased tax rates from 2025. The tax applies to white goods, electronic goods, and other electrical equipment sold in Sweden. Products containing brominated or chlorinated flame retardants above specified thresholds are subject to the full tax rate, while products that can document the absence of these substances qualify for a reduced rate. The maximum tax per product has also been increased. Companies selling electronics in Sweden should review their product formulations and obtain supplier declarations on flame retardant content to minimize tax exposure. The tax aims to incentivize the phase-out of hazardous flame retardants.',
    category: 'update',
    countries: ['SE'],
    published_at: '2025-01-18T10:00:00Z',
    effective_date: '2025-01-01',
    priority: 'low',
    tags: ['Sweden', 'Chemical Tax', 'Electronics', 'Flame Retardants'],
    link: null
  },

  // =========================================================================
  // Cross-Regulation Updates
  // =========================================================================
  {
    title: 'EU Commission publishes DPP implementation roadmap for 2025-2030',
    summary: 'The European Commission has released a detailed roadmap for Digital Product Passport implementation across all product groups, prioritizing textiles, batteries, and electronics.',
    content: 'The European Commission has published its comprehensive DPP Implementation Roadmap 2025-2030, outlining the phased rollout of Digital Product Passports across product categories under the ESPR. Key milestones: 2027 - batteries (already mandated by Battery Regulation), textiles, and toys; 2028 - electronics, smartphones, and tyres; 2029 - furniture, iron/steel, and construction products; 2030 - remaining priority product groups. The roadmap also covers the development of the decentralized DPP registry, standardization timeline (CEN/CENELEC mandate), SME support measures, third-country engagement, and the role of GS1 Digital Link identifiers. A EUR 50M funding program through Horizon Europe and Digital Europe will support pilot implementations.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-06-20T08:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['DPP', 'Roadmap', 'ESPR', 'Implementation'],
    link: null
  },
  {
    title: 'Conflict Minerals Regulation: Annual reporting deadline April 30',
    summary: 'EU importers of tin, tantalum, tungsten, and gold must submit their annual due diligence reports by April 30, covering the previous calendar year\'s imports.',
    content: 'The annual reporting deadline under the EU Conflict Minerals Regulation (EU) 2017/821 is approaching. All EU importers of 3TG minerals (tin, tantalum, tungsten, gold) and their ores above the Annex I volume thresholds must submit their due diligence reports by 30 April. Reports must describe the supply chain due diligence system in place, identified risks, steps taken to mitigate risks, and third-party audit results for smelters and refiners. Reports must be publicly available on the company\'s website. The European Commission has published templates and guidance to support compliance. Non-compliant importers may face enforcement actions by national competent authorities.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-04-01T08:00:00Z',
    effective_date: '2025-04-30',
    priority: 'medium',
    tags: ['Conflict Minerals', '3TG', 'Due Diligence', 'Annual Report'],
    link: null
  },
  {
    title: 'WEEE: 2024 collection data shows improvement but targets still missed by several Member States',
    summary: 'EUROSTAT data reveals that while EU-wide WEEE collection rates improved in 2024, several Member States still fall short of the 65% collection target.',
    content: 'The latest EUROSTAT data on WEEE collection shows that the EU-wide average collection rate reached 48% of the average weight of EEE placed on the market in the preceding three years, up from 46% the previous year. Top performers include Sweden (68%), Denmark (65%), and Germany (62%). However, several southern and eastern European Member States remain significantly below the 65% target, with some below 30%. The European Commission has noted that enforcement actions are being considered for persistently non-compliant Member States. The data also reveals growing challenges with undocumented e-waste exports and informal collection channels. EPR organizations are being urged to increase collection point density and consumer awareness campaigns.',
    category: 'update',
    countries: ['EU', 'SE', 'DK', 'DE'],
    published_at: '2025-05-28T10:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['WEEE', 'Collection Rates', 'EUROSTAT', 'E-waste'],
    link: null
  },

  // =========================================================================
  // Additional regulation updates
  // =========================================================================
  {
    title: 'REACH restriction proposal for PFAS: Broadest chemical restriction in EU history',
    summary: 'ECHA is progressing the restriction proposal for per- and polyfluoroalkyl substances (PFAS), potentially affecting thousands of products across all industries.',
    content: 'The European Chemicals Agency (ECHA) continues to evaluate the unprecedented PFAS restriction proposal submitted by five EU/EEA Member States. If adopted, this would be the broadest single chemical restriction in EU history, covering approximately 10,000 substances. The restriction proposal includes sector-specific derogations and transition periods ranging from 18 months to 12 years depending on the availability of alternatives. Key affected sectors include: textiles (water-repellent treatments), electronics (thermal management, semiconductors), medical devices, food contact materials, cosmetics, and firefighting foams. The public consultation received over 5,600 comments. ECHA\'s scientific committees RAC and SEAC are expected to deliver their joint opinion in 2025, with the European Commission potentially adopting the restriction in 2026-2027.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-03-15T09:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['PFAS', 'REACH', 'Restriction', 'ECHA', 'Chemicals'],
    link: null
  },
  {
    title: 'EU Single Market compliance: Market surveillance strengthened across Member States',
    summary: 'The EU Market Surveillance Regulation (EU) 2019/1020 enforcement has been strengthened with new joint actions across Member States targeting online sales.',
    content: 'EU Member States have intensified coordinated market surveillance activities under Regulation (EU) 2019/1020, with a particular focus on products sold online. Joint actions in 2025 have targeted: electrical equipment safety, toy safety compliance, PPE (personal protective equipment) standards, and construction products. The Product Safety Pledge for online marketplaces has been expanded with new signatories. National authorities are utilizing new powers to request removal of non-compliant product listings from online platforms. The EU Product Compliance Network has published best practices for customs cooperation and online surveillance techniques. Companies selling through online channels should ensure all products carry proper CE marking, documentation is readily available, and EU responsible person requirements are met.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-06-05T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Market Surveillance', 'Online Sales', 'CE Marking', 'Compliance'],
    link: null
  },
  {
    title: 'POPs Regulation updated: New substance restrictions for textiles and electronics',
    summary: 'The EU POPs Regulation has been amended to include new concentration limits for PFOS and PFOA in textiles and updated limits for brominated flame retardants in electronics.',
    content: 'The European Commission has adopted amendments to the POPs Regulation (EU) 2019/1021, adding new substance entries and tightening concentration limits. Key changes include reduced maximum concentration values for PFOS in textiles (now 1 mg/kg), updated PFOA limits affecting treated consumer goods, and new entries for certain short-chain chlorinated paraffins (SCCPs) with stricter waste management thresholds. The amendments reflect obligations under the Stockholm Convention and aim to reduce the circulation of persistent pollutants in consumer products and waste streams. Companies in the textile, electronics, and packaging sectors should update their substance compliance screening protocols. The changes apply 20 days after Official Journal publication.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-05-10T08:00:00Z',
    effective_date: '2025-06-01',
    priority: 'medium',
    tags: ['POPs', 'PFOS', 'PFOA', 'Textiles', 'Electronics'],
    link: null
  },

  // =========================================================================
  // Additional national updates
  // =========================================================================
  {
    title: 'Belgium: Packaging EPR reforms introduce eco-modulated fees',
    summary: 'Belgium\'s Fost Plus and Val-I-Pac EPR schemes have implemented eco-modulated fee structures that reward recyclable and reusable packaging with lower contribution rates.',
    content: 'Belgium has updated its packaging Extended Producer Responsibility system with enhanced eco-modulation of fees. The updated fee structure administered by Fost Plus (household packaging) and Val-I-Pac (industrial packaging) now applies significant bonuses and maluses based on packaging recyclability, recycled content, and reusability. Easily recyclable mono-material packaging receives fee reductions of up to 30%, while difficult-to-recycle multi-material packaging faces surcharges of up to 50%. The system aims to create economic incentives for sustainable packaging design ahead of the PPWR requirements. Companies placing packaging on the Belgian market should review their product portfolios and calculate the financial impact of the new fee structures.',
    category: 'update',
    countries: ['BE'],
    published_at: '2025-04-22T09:00:00Z',
    effective_date: '2025-01-01',
    priority: 'low',
    tags: ['Belgium', 'Packaging', 'EPR', 'Eco-modulation'],
    link: null
  },
  {
    title: 'Denmark: Extended mandatory climate labelling for food products',
    summary: 'Denmark expands its voluntary climate labelling for food products towards a mandatory framework, with discussions on extending the approach to non-food consumer goods.',
    content: 'Denmark is moving forward with climate labelling for food products, building on the voluntary scheme introduced previously. The Danish government has announced plans to make climate impact labelling mandatory for certain food categories, starting with meat and dairy products. The label will display the product\'s carbon footprint in CO2-equivalents per kilogram, using standardized lifecycle assessment methodology. The Danish Veterinary and Food Administration is developing the regulatory framework. While currently limited to food, discussions are underway to extend the concept to other consumer goods, potentially leveraging Digital Product Passport infrastructure under the ESPR. Denmark\'s approach is being watched closely by other EU Member States as a potential model.',
    category: 'regulation',
    countries: ['DK'],
    published_at: '2025-03-28T10:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['Denmark', 'Climate Labelling', 'Food', 'Carbon Footprint'],
    link: null
  },
  {
    title: 'Poland: New waste management obligations for e-commerce sellers',
    summary: 'Poland implements new requirements for e-commerce sellers regarding packaging waste reporting and contribution to the EPR system, targeting cross-border online sales.',
    content: 'Poland has adopted new regulations targeting e-commerce sellers placing packaged products on the Polish market, including those selling from other EU Member States. The new rules require all sellers, regardless of location, to: register with the Polish BDO waste database, report packaging quantities introduced to the Polish market, financially contribute to the packaging EPR system, and ensure packaging meets Polish labelling requirements. The regulations aim to close the gap in EPR compliance for cross-border e-commerce. Enforcement will be supported by customs cooperation. Companies selling to Polish consumers online should verify their registration status and engage authorized representatives where necessary.',
    category: 'regulation',
    countries: ['PL'],
    published_at: '2025-05-15T08:00:00Z',
    effective_date: '2025-07-01',
    priority: 'medium',
    tags: ['Poland', 'E-commerce', 'EPR', 'Packaging', 'BDO'],
    link: null
  },
  {
    title: 'Ireland: WEEE collection infrastructure expansion for rural areas',
    summary: 'Ireland announces a significant investment in WEEE collection infrastructure to improve e-waste collection rates in rural communities.',
    content: 'The Irish EPA has announced a major expansion of WEEE collection infrastructure targeting rural areas where collection rates have lagged behind urban centres. The investment includes new collection points at community recycling centres, mobile collection events in underserved areas, and partnerships with An Post for small WEEE postal return. WEEE Ireland and ERP Ireland, the two compliance schemes, are co-funding the expansion. Ireland aims to reach the 65% WEEE collection target by improving accessibility. The initiative also includes consumer awareness campaigns and a school education programme on e-waste recycling.',
    category: 'update',
    countries: ['IE'],
    published_at: '2025-06-12T10:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['Ireland', 'WEEE', 'Collection', 'Rural', 'E-waste'],
    link: null
  },
  {
    title: 'Czech Republic: Updated chemical safety reporting for imported products',
    summary: 'The Czech Republic has strengthened chemical safety reporting requirements for imported consumer products, with new testing obligations for market surveillance.',
    content: 'The Czech Trade Inspection Authority (CTIA) has announced enhanced chemical safety testing programmes for imported consumer products, focusing on textiles, toys, and food contact materials. New requirements include mandatory provision of test reports for products flagged during customs screening, expanded scope of substances tested (including PFAS, heavy metals, and phthalates), and higher penalties for non-compliant imports. The changes are part of a broader initiative to improve consumer protection and align with EU market surveillance objectives. Importers should ensure they maintain up-to-date test certificates from accredited laboratories for products entering the Czech market.',
    category: 'update',
    countries: ['CZ'],
    published_at: '2025-04-30T09:00:00Z',
    effective_date: '2025-06-01',
    priority: 'low',
    tags: ['Czech Republic', 'Chemical Safety', 'Import Testing', 'Market Surveillance'],
    link: null
  },

  // =========================================================================
  // Consultation periods and upcoming changes
  // =========================================================================
  {
    title: 'EU Commission: Public consultation on ESPR delegated act for textiles',
    summary: 'The European Commission has opened a public consultation on the draft delegated act setting ecodesign and DPP requirements for textile products under the ESPR.',
    content: 'The European Commission has published the draft delegated act for textile products under the ESPR for public consultation. The proposed requirements include: mandatory DPP with QR code access, minimum durability requirements (pilling, colour fastness, seam strength), recycled fibre content disclosure, microfibre release information, chemical substance disclosure (SVHC and CMR substances), repair information and availability, country of manufacturing for main processing steps, and recyclability assessment. The consultation is open for 8 weeks. Industry associations, consumer organizations, and environmental NGOs are encouraged to provide technical feedback. The final delegated act is expected to be adopted in 2026, with compliance required from 2027.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-07-01T08:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['ESPR', 'Textiles', 'Consultation', 'Delegated Act', 'DPP'],
    link: null
  },
  {
    title: 'ECHA: Consultation on restricting bisphenols in consumer products',
    summary: 'ECHA has launched a public consultation on a proposed restriction of bisphenol A and structurally similar bisphenols in consumer products, covering thermal paper, food contact, and more.',
    content: 'ECHA has opened a public consultation on a comprehensive restriction proposal for bisphenol A (BPA) and structurally related bisphenols under REACH. The proposal covers: thermal paper (already restricted), food contact materials (complementing EFSA re-evaluation), toys and childcare articles, cosmetics, and textiles. The proposal aims to prevent regrettable substitution where BPA is replaced by other bisphenols with similar hazard profiles. Interested parties have 6 months to submit comments and socio-economic evidence. The restriction could significantly impact manufacturers of coatings, plastics, and consumer goods. Companies should assess their use of bisphenols and evaluate alternative substances.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-06-25T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Bisphenol', 'BPA', 'ECHA', 'REACH', 'Consultation'],
    link: null
  },
  {
    title: 'Switzerland: Alignment with EU ESPR framework under consideration',
    summary: 'Switzerland is evaluating the adoption of ESPR-equivalent requirements through its bilateral agreements with the EU, potentially including Digital Product Passport recognition.',
    content: 'The Swiss Federal Office for the Environment (BAFU) and the State Secretariat for Economic Affairs (SECO) are assessing the implications of the EU ESPR for Swiss market access and trade. As Switzerland maintains bilateral agreements with the EU on technical barriers to trade, the country is considering a framework for mutual recognition of Digital Product Passports and ecodesign requirements. This would ensure that Swiss manufacturers can continue to access the EU single market without dual compliance, while also bringing ESPR benefits to Swiss consumers. A consultation paper is expected in late 2025. Swiss industry associations have broadly supported alignment, citing the importance of market access to the EU for Swiss exporters.',
    category: 'update',
    countries: ['CH'],
    published_at: '2025-07-15T09:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['Switzerland', 'ESPR', 'DPP', 'Bilateral Agreements'],
    link: null
  },
  {
    title: 'UK: Product regulation reform post-Brexit with focus on sustainability',
    summary: 'The UK government has announced plans for a reformed product regulation framework that includes sustainability and circularity requirements, potentially diverging from EU ESPR.',
    content: 'The UK Department for Business and Trade has published a consultation on reforming product regulation in the post-Brexit landscape. The proposed framework includes elements similar to the EU ESPR but with UK-specific adaptations: a phased approach to ecodesign requirements starting with energy-using products, digital product information requirements (not explicitly called DPP), circular economy duties for producers (durability, repairability, recyclability), and maintained UKCA marking with potential for recognition of CE marking for a transitional period. The proposal acknowledges the need for interoperability with the EU system given the UK\'s close trade relationship. Industry stakeholders have 12 weeks to respond. This could create a parallel but compatible regulatory framework.',
    category: 'regulation',
    countries: ['GB'],
    published_at: '2025-05-30T08:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['UK', 'Product Regulation', 'Sustainability', 'UKCA', 'Post-Brexit'],
    link: null
  },

  // =========================================================================
  // Final items - additional deadline and update news
  // =========================================================================
  {
    title: 'EU waste shipment regulation: Stricter controls on plastic waste exports',
    summary: 'The revised Waste Shipment Regulation tightens controls on plastic waste exports from the EU, with a ban on exports to non-OECD countries and prior informed consent for OECD exports.',
    content: 'The revised EU Waste Shipment Regulation (EU) 2024/1157 introduces significantly stricter rules for the export of plastic waste from the EU. Exports of plastic waste to non-OECD countries are now banned, while exports to OECD countries require prior informed consent and evidence that waste will be managed in an environmentally sound manner. The regulation also introduces an EU-wide electronic system for tracking waste shipments, replacing paper-based notification procedures. Within the EU, the regulation simplifies shipment procedures for recycling while maintaining controls for disposal. Companies involved in waste management and recycling should update their compliance procedures and ensure all waste shipment documentation meets the new electronic format requirements.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-05-20T10:00:00Z',
    effective_date: '2026-05-21',
    priority: 'medium',
    tags: ['Waste Shipment', 'Plastic Waste', 'Export Ban', 'Circular Economy'],
    link: null
  },
  {
    title: 'EU Green Claims Directive: Proposed rules for environmental marketing claims',
    summary: 'The proposed Green Claims Directive would require substantiation of all environmental claims using lifecycle assessment methodology before products can be marketed with green claims.',
    content: 'The proposed EU Green Claims Directive continues its legislative journey through the European Parliament and Council. The proposal requires companies making environmental claims about their products or practices to: substantiate claims using standardized lifecycle assessment methodology, have claims independently verified before use, refrain from generic claims like "eco-friendly" or "green" without specific evidence, and comply with specific rules for comparison claims and carbon offset claims. The proposal also seeks to regulate environmental labelling schemes. While not yet adopted, companies should begin preparing by auditing current marketing claims and establishing evidence-based substantiation processes. The directive is expected to be finalized in 2025-2026.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-06-30T08:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Green Claims', 'Environmental Marketing', 'Greenwashing', 'LCA'],
    link: null
  },
  {
    title: 'Portugal: New electronic waste management platform launched',
    summary: 'Portugal has launched a modernized electronic platform for tracking waste electrical and electronic equipment, improving WEEE compliance reporting for producers.',
    content: 'The Portuguese Environment Agency (APA) has launched an updated electronic platform for WEEE management and reporting. The new system improves: producer registration with digital onboarding, real-time tracking of collection and recycling quantities, simplified annual reporting interfaces, integration with customs data for import monitoring, and public transparency dashboards. The platform replaces the previous manual reporting system and aligns with EU digital waste management objectives. All producers placing EEE on the Portuguese market must register on the new platform. Existing registrations will be migrated automatically but should be verified for accuracy.',
    category: 'update',
    countries: ['PT'],
    published_at: '2025-04-08T10:00:00Z',
    effective_date: '2025-04-01',
    priority: 'low',
    tags: ['Portugal', 'WEEE', 'Digital Platform', 'Waste Management'],
    link: null
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('  Seed News Items - Supabase REST API');
  console.log('='.repeat(60));
  console.log(`  Supabase URL : ${SUPABASE_URL}`);
  console.log(`  News items   : ${NEWS_ITEMS.length}`);
  console.log(`  Batch size   : ${BATCH_SIZE}`);
  console.log('');

  // Delete existing news_items and re-insert
  console.log('[1/3] Deleting existing news_items ...');
  try {
    await supabaseRequest('news_items?id=not.is.null', {
      method: 'DELETE',
    });
    console.log('       Deleted all existing rows.\n');
  } catch (err) {
    console.error('       Failed to delete existing news items:', err.message);
    console.error('       Aborting.');
    process.exit(1);
  }

  // Insert in batches
  console.log(`[2/3] Inserting ${NEWS_ITEMS.length} news items in batches of ${BATCH_SIZE} ...`);

  let insertedCount = 0;
  const totalBatches = Math.ceil(NEWS_ITEMS.length / BATCH_SIZE);

  for (let i = 0; i < NEWS_ITEMS.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = NEWS_ITEMS.slice(i, i + BATCH_SIZE);

    try {
      await supabaseRequest('news_items', {
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
    const allRows = await supabaseRequest('news_items?select=id');
    const dbCount = Array.isArray(allRows) ? allRows.length : '(unknown)';
    console.log(`  Rows in news_items: ${dbCount}`);
  } catch {
    console.log('  (could not verify row count)');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(
    insertedCount === NEWS_ITEMS.length
      ? `  Done - ${insertedCount} news item(s) seeded successfully.`
      : `  Done - ${insertedCount}/${NEWS_ITEMS.length} news item(s) seeded (some batches failed).`
  );
  console.log('='.repeat(60));

  if (insertedCount < NEWS_ITEMS.length) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
