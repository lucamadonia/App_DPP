/**
 * Seed News Items via Supabase REST API
 *
 * Upserts 120+ curated news items into the news_items table covering EU
 * regulations, deadlines, recalls, standards, guidance documents,
 * consultations, and national implementations (DE/FR/UK/US/CH/...).
 *
 * Usage:
 *   node scripts/seed-news.mjs            # UPSERT (merge on title)
 *   node scripts/seed-news.mjs --reset    # DELETE all rows first, then insert
 *
 * Requires migration 20260612d_news_items_extend.sql to be applied
 * (8 category values, source/image_url columns, UNIQUE index on title).
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
const RESET = process.argv.includes('--reset');

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
// News Items Data
// ---------------------------------------------------------------------------
// Categories use the full 8-value set supported by the DB CHECK constraint
// (after migration 20260612d_news_items_extend.sql):
//   'regulation', 'deadline', 'update', 'warning',
//   'recall', 'standard', 'guidance', 'consultation'
// Every item carries a `source` (publishing authority). `link` is only set
// when an official URL is known with certainty.

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
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1781',
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'ESPR Electronics: Digital Product Passport expected in a later working plan phase',
    summary: 'Electronics are not among the first ESPR priority product groups, but horizontal requirements on repairability and recycled content will affect electrical equipment earlier.',
    content: 'Under the first ESPR working plan, electronics such as smartphones, laptops, and household appliances are not yet a prioritised product group for a dedicated Digital Product Passport delegated act. However, the Commission plans horizontal ecodesign requirements on repairability (including consumer electronics) and on recycled content and recyclability of electrical and electronic equipment, which will apply across product groups. In parallel, smartphones and tablets are already covered by dedicated ecodesign and energy labelling rules since June 2025. Electronics manufacturers are advised to integrate DPP data collection into their existing product information management systems early, as existing EPREL data is expected to be referenced where possible to minimize additional burden.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-04-20T08:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['ESPR', 'Electronics', 'DPP', 'Repairability'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'ESPR: Commission launches stakeholder consultation on DPP technical standards',
    summary: 'The European Commission has opened a public consultation on the technical standards for Digital Product Passports, including data carriers, data models, and interoperability requirements.',
    content: 'The European Commission has launched a key stakeholder consultation on the technical architecture of the Digital Product Passport system. The consultation covers: (1) data carrier requirements (QR codes, RFID, NFC), (2) standardized data models and vocabularies, (3) interoperability requirements between DPP systems, (4) access rights management for different stakeholder groups, (5) the decentralized DPP registry architecture. Interested parties have until September 2025 to submit feedback. CEN/CENELEC and ETSI are developing harmonized standards in parallel. Companies developing DPP solutions should actively participate to shape the technical framework.',
    category: 'consultation',
    countries: ['EU'],
    published_at: '2025-06-01T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['ESPR', 'DPP', 'Technical Standards', 'Consultation'],
    link: null,
    source: 'Europäische Kommission'
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
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1542',
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // PPWR - Packaging
  // =========================================================================
  {
    title: 'PPWR published: New EU packaging rules to apply from August 2026',
    summary: 'The Packaging and Packaging Waste Regulation (PPWR) has been adopted, setting mandatory recycled content targets, recyclability requirements, and packaging reduction goals.',
    content: 'The Packaging and Packaging Waste Regulation (EU) 2025/40 has been published in the Official Journal, replacing the 30-year-old Packaging Directive 94/62/EC. It entered into force on 11 February 2025 and applies from 12 August 2026. Key provisions include: mandatory recycled content targets (30% for PET beverage bottles by 2030, 65% by 2040), design-for-recycling requirements with recyclability grades, packaging reduction targets (5% by 2030, 10% by 2035, 15% by 2040), mandatory deposit-return systems for plastic beverage bottles and aluminium cans by 2029, restrictions on certain single-use packaging formats in HORECA, and standardized labelling with sorting instructions. Companies should use the time until 12 August 2026 to prepare for the first set of requirements.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-02-11T08:00:00Z',
    effective_date: '2026-08-12',
    priority: 'high',
    tags: ['PPWR', 'Packaging', 'Recycled Content', 'DRS'],
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R0040',
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'PPWR: Recyclability design criteria for packaging published',
    summary: 'The Commission has released guidance on the design-for-recycling criteria that will be used to assess packaging recyclability under the PPWR, with compliance expected from 2030.',
    content: 'The European Commission has published draft guidelines on the design-for-recycling criteria under the PPWR. Packaging will be graded on a scale from A (excellent recyclability) to E (not recyclable), considering material compatibility, ease of separation, and availability of recycling infrastructure. Grade E packaging will be banned from the market after a transition period. Key requirements include: mono-material preference, removable labels and adhesives, no problematic additives (carbon black, PVC sleeves on PET), minimum recycling yield thresholds, and compatibility with existing sorting and recycling infrastructure in Member States. Packaging producers should begin auditing their portfolios against these criteria.',
    category: 'guidance',
    countries: ['EU'],
    published_at: '2025-07-10T10:00:00Z',
    effective_date: '2030-01-01',
    priority: 'medium',
    tags: ['PPWR', 'Recyclability', 'Design for Recycling', 'Packaging'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // CSRD / CSDDD - Sustainability Reporting
  // =========================================================================
  {
    title: 'CSRD: Large companies must report sustainability data for FY2025',
    summary: 'All large companies meeting two of three criteria (250+ employees, EUR 50M+ revenue, EUR 25M+ total assets) must prepare sustainability reports for fiscal year 2025.',
    content: 'The second wave of CSRD reporting requirements takes effect for fiscal year 2025, covering all large companies (previously only large public-interest entities were covered for FY2024). Companies must report according to the European Sustainability Reporting Standards (ESRS) covering environment, social, and governance matters. Key requirements include double materiality assessment, Scope 1/2/3 GHG emissions, climate transition plans, biodiversity impact, workforce conditions, and governance structures. Reports must be digitally tagged in iXBRL format and subject to limited assurance by an auditor. Note: the subsequently adopted "stop-the-clock" directive postpones this second wave by two years - see the Omnibus simplification package news.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-01-10T08:00:00Z',
    effective_date: '2025-01-01',
    priority: 'high',
    tags: ['CSRD', 'Sustainability Reporting', 'ESRS', 'ESG'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'CSRD: Listed SMEs enter reporting scope from FY2026',
    summary: 'Listed small and medium-sized enterprises will need to prepare sustainability reports using simplified ESRS standards from fiscal year 2026, with an opt-out option until 2028.',
    content: 'Starting with fiscal year 2026, listed SMEs on EU regulated markets will fall under the CSRD reporting obligations. However, they can use the simplified LSME ESRS standards and have the option to delay reporting until FY2028. The simplified standards significantly reduce the number of mandatory datapoints while maintaining core disclosures on climate, workforce, and governance. Non-listed SMEs are not directly covered but may face indirect pressure from value chain reporting requirements of larger companies. Voluntary VSME standards are available for non-listed SMEs wishing to meet customer and lender expectations. Note: the "stop-the-clock" directive adopted in 2025 postpones this third wave by two years.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-04-05T09:00:00Z',
    effective_date: '2026-01-01',
    priority: 'medium',
    tags: ['CSRD', 'SME', 'ESRS', 'Listed Companies'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'CSDDD: Due diligence obligations for largest companies from July 2027',
    summary: 'Companies with 1,500+ employees and EUR 450M+ worldwide turnover must implement human rights and environmental due diligence processes by July 2027.',
    content: 'The Corporate Sustainability Due Diligence Directive (CSDDD) will first apply to the largest companies from 26 July 2027. These companies must establish and implement a due diligence policy, identify adverse human rights and environmental impacts in their operations and value chains, take appropriate measures to prevent and mitigate identified impacts, establish a complaints mechanism, and monitor the effectiveness of their measures. Companies must also adopt a climate transition plan aligned with limiting global warming to 1.5 degrees Celsius. Directors of in-scope companies have a duty of care for the implementation of due diligence. Note: the 2025 Omnibus package postpones the transposition deadline and the first application wave to 2028.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-02-28T10:00:00Z',
    effective_date: '2027-07-26',
    priority: 'high',
    tags: ['CSDDD', 'Due Diligence', 'Human Rights', 'Supply Chain'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // EUDR - Deforestation
  // =========================================================================
  {
    title: 'EUDR: Deforestation-free products rules apply from December 2025',
    summary: 'Large operators and traders must ensure that commodities (cattle, cocoa, coffee, oil palm, rubber, soya, wood) placed on the EU market are deforestation-free.',
    content: 'The EU Deforestation Regulation (EUDR) enters full application on 30 December 2025 for large operators and traders, following the one-year postponement adopted in late 2024. Companies must submit due diligence statements confirming that products are deforestation-free (no deforestation after 31 December 2020) and comply with the laws of the country of production. Geolocation coordinates of all production plots must be provided. The regulation covers seven commodities: cattle, cocoa, coffee, oil palm, rubber, soya, and wood, as well as derived products (leather, chocolate, furniture, paper, etc.). Companies should urgently map their supply chains and collect geolocation data from suppliers.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-03-01T08:00:00Z',
    effective_date: '2025-12-30',
    priority: 'high',
    tags: ['EUDR', 'Deforestation', 'Due Diligence', 'Supply Chain'],
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1115',
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Europäische Kommission'
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
    link: 'https://www.verpackungsregister.org/',
    source: 'Zentrale Stelle Verpackungsregister'
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
    link: null,
    source: 'Umweltbundesamt'
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
    link: null,
    source: 'stiftung ear'
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
    link: 'https://www.ecologie.gouv.fr/indice-reparabilite',
    source: 'Ministère de la Transition écologique'
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
    link: null,
    source: 'ADEME'
  },

  // =========================================================================
  // Product Recalls and Warnings
  // =========================================================================
  {
    title: 'Safety Gate alert: Children\'s toys recalled for excessive phthalate content',
    summary: 'Multiple toy brands have been recalled across the EU via the Safety Gate system due to phthalate concentrations exceeding REACH Annex XVII limits.',
    content: 'The European Commission Safety Gate (formerly RAPEX) has issued alerts for multiple children\'s toy products found to contain DEHP, DBP, and BBP phthalates above the legal limit of 0.1% by weight. The affected products were primarily imported from non-EU countries and sold through online marketplaces. National market surveillance authorities in Germany, France, and the Netherlands conducted the testing. Consumers are advised to stop using the identified products and return them to the point of purchase. This highlights the importance of robust supply chain testing and REACH compliance for importers, especially for products in contact with children. Companies should review their supplier testing protocols.',
    category: 'recall',
    countries: ['EU', 'DE', 'FR', 'NL'],
    published_at: '2025-02-05T14:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['Product Recall', 'Toys', 'Phthalates', 'REACH', 'Safety Gate'],
    link: 'https://ec.europa.eu/safety-gate-alerts/screen/webReport',
    source: 'Safety Gate / Europäische Kommission'
  },
  {
    title: 'Safety Gate: Electronic chargers recalled for fire hazard',
    summary: 'Several brands of USB chargers and power banks have been recalled due to inadequate insulation and overheating risk, posing fire and electric shock hazards.',
    content: 'Multiple USB chargers and power banks sold in the EU have been recalled following reports of overheating and in some cases fire incidents. Market surveillance testing revealed inadequate insulation between primary and secondary circuits, exceeding the maximum permissible touch temperature, and missing or fraudulent CE marking. The affected products were primarily sold through online marketplaces at very low prices. Authorities in multiple Member States have coordinated the recall through the Safety Gate system. This underscores the importance of the Low Voltage Directive compliance and proper conformity assessment for electrical accessories. E-commerce platforms are required under GPSR to cooperate in the removal of unsafe products.',
    category: 'recall',
    countries: ['EU'],
    published_at: '2025-03-12T11:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['Product Recall', 'Electronics', 'Fire Hazard', 'CE Marking'],
    link: null,
    source: 'Safety Gate / Europäische Kommission'
  },
  {
    title: 'RAPEX alert: Cosmetics products contain banned substances',
    summary: 'Several cosmetics products have been flagged in the Safety Gate system for containing prohibited substances including hydroquinone and mercury compounds.',
    content: 'The European Commission Safety Gate system has issued notifications for cosmetics products containing substances banned under the EU Cosmetics Regulation (EC) No 1223/2009. Products containing hydroquinone above permitted concentrations and mercury compounds were identified by market surveillance authorities in Belgium and Spain. The products were primarily skin-lightening creams sold through specialized retail and online channels. Member States are coordinating withdrawal and recall actions. Companies importing cosmetics must ensure Responsible Person obligations are met and product safety reports are current.',
    category: 'recall',
    countries: ['EU', 'BE', 'ES'],
    published_at: '2025-04-18T13:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Cosmetics', 'Product Recall', 'Safety Gate', 'Banned Substances'],
    link: null,
    source: 'Safety Gate / Europäische Kommission'
  },
  {
    title: 'Safety alert: Children\'s clothing with excessive drawstring length',
    summary: 'Children\'s outdoor clothing recalled in the EU for non-compliance with EN 14682 standard on cords and drawstrings, posing strangulation risk.',
    content: 'Several children\'s clothing items sold across the EU have been recalled after testing revealed non-compliance with the EN 14682 standard regarding cords and drawstrings on children\'s clothing. The products, targeted at children aged 7-14, had drawstrings in the hood area exceeding the maximum permitted length and toggles that could become entangled. Under the General Product Safety Regulation (GPSR), the manufacturer and importers have initiated voluntary recalls. The products were sold in retail stores and online in Germany, Austria, and Poland. This serves as a reminder that even non-electronic products must meet stringent safety requirements when intended for use by children.',
    category: 'recall',
    countries: ['DE', 'AT', 'PL'],
    published_at: '2025-05-20T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Children Clothing', 'Product Recall', 'Safety Standard', 'EN 14682'],
    link: null,
    source: 'Safety Gate / Europäische Kommission'
  },

  // =========================================================================
  // ISO and Standards Updates
  // =========================================================================
  {
    title: 'ISO 14067:2023 update improves carbon footprint calculation for products',
    summary: 'The updated ISO 14067 standard provides improved guidance for quantifying the carbon footprint of products, directly relevant to ESPR and Battery Regulation requirements.',
    content: 'The International Organization for Standardization has published updates to ISO 14067 on greenhouse gas carbon footprint of products. The revised standard includes improved guidance on biogenic carbon accounting, updated global warming potential factors aligned with the latest IPCC assessment report, clearer allocation rules for multi-output processes, and enhanced requirements for data quality assessment. This standard is directly referenced in several EU regulations including the Battery Regulation carbon footprint methodology and is expected to serve as a key reference for ESPR carbon footprint declarations. Companies calculating product carbon footprints should update their methodologies accordingly.',
    category: 'standard',
    countries: ['EU'],
    published_at: '2025-01-25T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['ISO 14067', 'Carbon Footprint', 'Standards', 'LCA'],
    link: 'https://www.iso.org/standard/71206.html',
    source: 'ISO'
  },
  {
    title: 'CEN/CENELEC: New standards for Digital Product Passport data carriers',
    summary: 'European standards organizations have published draft standards for DPP data carriers, covering QR codes, RFID/NFC, and data matrix requirements for product identification.',
    content: 'CEN/CENELEC has released draft standards (prEN series) for Digital Product Passport data carriers under the standardization request from the European Commission. The standards cover: (1) 2D barcode/QR code specifications for DPP access, (2) RFID and NFC tag requirements for embedded data carriers, (3) data matrix formats for industrial applications, (4) minimum print quality and scanning reliability requirements, (5) interoperability between data carrier types. The standards align with GS1 Digital Link for product identification and will serve as the harmonized reference under ESPR delegated acts. A 60-day public comment period is open for industry feedback.',
    category: 'standard',
    countries: ['EU'],
    published_at: '2025-06-15T08:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['CEN/CENELEC', 'DPP', 'Standards', 'QR Code', 'Data Carrier'],
    link: null,
    source: 'CEN/CENELEC'
  },
  {
    title: 'IEC 62430 update: Environmental design requirements for electronic products',
    summary: 'The updated IEC 62430 standard on environmentally conscious design for electronic products now includes circular economy principles aligned with ESPR.',
    content: 'IEC has published an updated version of IEC 62430, the standard for environmentally conscious design of electrical and electronic products. The revision incorporates circular economy design principles, including design for disassembly, design for recycling, and design for longevity. The update also provides guidance on material declaration formats that align with emerging DPP requirements. Key additions include: methodology for assessing product repairability, guidelines for minimizing critical raw material usage, frameworks for recyclability assessment, and end-of-life scenario planning. This standard is expected to be referenced in ESPR delegated acts for electronics.',
    category: 'standard',
    countries: ['EU'],
    published_at: '2025-07-20T10:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['IEC 62430', 'Eco-design', 'Electronics', 'Circular Economy'],
    link: null,
    source: 'IEC'
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
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0988',
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // Toy Safety
  // =========================================================================
  {
    title: 'New EU Toy Safety Regulation: political agreement paves the way for a toy DPP',
    summary: 'Council and Parliament have reached political agreement on the new Toy Safety Regulation, which will introduce a Digital Product Passport for toys and significantly stricter chemical rules.',
    content: 'The EU institutions have reached political agreement on the new Toy Safety Regulation, which will replace the Toy Safety Directive 2009/48/EC. The regulation introduces several major changes: a mandatory Digital Product Passport for toys (replacing the paper EU Declaration of Conformity at the point of import), significantly strengthened chemical restrictions including bans on endocrine disruptors, PFAS, and the most hazardous bisphenols in toys, stricter safety assessment requirements covering mental health effects of digital toys, and enhanced obligations for online marketplaces. The DPP for toys must include manufacturer information, applicable safety requirements, and conformity assessment data. A transition period of several years after entry into force will apply before full compliance is required, so toy manufacturers should start preparing their data infrastructure now.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-04-10T10:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['Toy Safety', 'DPP', 'Chemical Restrictions', 'Children'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // Machinery Regulation
  // =========================================================================
  {
    title: 'Machinery Regulation: Transition period opens for new requirements',
    summary: 'The new Machinery Regulation (EU) 2023/1230 is now in its transition period, allowing manufacturers to comply with either the old Directive or the new Regulation until January 2027.',
    content: 'The new EU Machinery Regulation entered into force in July 2023 and is now in a transition period alongside the existing Machinery Directive 2006/42/EC. From 20 January 2027, the new Regulation applies exclusively. It introduces significant changes: digital format for instructions and declaration of conformity, cybersecurity requirements for connected machinery, safety requirements for AI-enabled autonomous systems, updated conformity assessment procedures for high-risk machinery, and direct applicability without national transposition. Manufacturers should use the transition period to prepare, particularly for the digital documentation requirements and any new third-party conformity assessment obligations.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-02-20T09:00:00Z',
    effective_date: '2027-01-20',
    priority: 'medium',
    tags: ['Machinery Regulation', 'CE Marking', 'Transition Period', 'AI Safety'],
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1230',
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // Medical Devices
  // =========================================================================
  {
    title: 'MDR transition deadlines extended for legacy devices',
    summary: 'The EU has extended transition periods for certain legacy medical devices under the MDR, giving manufacturers until 2027-2028 depending on device class.',
    content: 'Regulation (EU) 2023/607 extends the MDR transition deadlines for legacy devices that were certified under the old Directives. Class III and class IIb implantable devices now have until 31 December 2027, while other class IIb, class IIa, and class I devices in sterile condition or with a measuring function have until 31 December 2028 to obtain MDR certificates, provided manufacturers have already applied to a Notified Body and meet the other conditions. This extension addresses the significant backlog at Notified Bodies and aims to prevent medical device shortages. The UDI (Unique Device Identification) requirements continue to roll out according to the original timeline.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-03-25T10:00:00Z',
    effective_date: '2027-12-31',
    priority: 'medium',
    tags: ['MDR', 'Medical Devices', 'Transition', 'Notified Body'],
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0607',
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Europäische Kommission'
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
    link: 'https://echa.europa.eu/candidate-list-table',
    source: 'ECHA'
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
    link: null,
    source: 'Europäische Kommission'
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
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R0573',
    source: 'Europäische Kommission'
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
    link: null,
    source: 'BMK (Österreich)'
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
    link: null,
    source: 'Afvalfonds Verpakkingen'
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
    link: null,
    source: 'CONAI'
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
    link: null,
    source: 'MITECO'
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
    link: null,
    source: 'Skatteverket'
  },

  // =========================================================================
  // Cross-Regulation Updates
  // =========================================================================
  {
    title: 'EU Commission adopts first ESPR working plan: textiles and steel prioritised',
    summary: 'The first ESPR working plan 2025-2030, adopted in April 2025, prioritises textiles/apparel and iron & steel for product-specific ecodesign and DPP requirements.',
    content: 'The European Commission has adopted the first ESPR working plan covering 2025-2030. The plan prioritises textiles (with a focus on apparel) and iron & steel as the first product groups for delegated acts with product-specific ecodesign and Digital Product Passport requirements. In addition, horizontal requirements are planned on repairability - including consumer electronics and small household appliances - and on recycled content and recyclability of electrical and electronic equipment. Aluminium, furniture, tyres, and mattresses are among the candidates for later phases. The first delegated acts are expected from around 2027, following consultation of the newly established Ecodesign Forum, with compliance dates typically 18 months after adoption. The decentralized DPP registry is being developed in parallel. Companies in the prioritised sectors should begin mapping their product data against the anticipated requirements now.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-04-16T08:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['DPP', 'Working Plan', 'ESPR', 'Textiles', 'Steel'],
    link: null,
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Eurostat'
  },

  // =========================================================================
  // Additional regulation updates
  // =========================================================================
  {
    title: 'REACH restriction proposal for PFAS: Broadest chemical restriction in EU history',
    summary: 'ECHA is progressing the restriction proposal for per- and polyfluoroalkyl substances (PFAS), potentially affecting thousands of products across all industries.',
    content: 'The European Chemicals Agency (ECHA) continues to evaluate the unprecedented PFAS restriction proposal submitted by five EU/EEA Member States. If adopted, this would be the broadest single chemical restriction in EU history, covering approximately 10,000 substances. The restriction proposal includes sector-specific derogations and transition periods ranging from 18 months to 12 years depending on the availability of alternatives. Key affected sectors include: textiles (water-repellent treatments), electronics (thermal management, semiconductors), medical devices, food contact materials, cosmetics, and firefighting foams. The public consultation received over 5,600 comments. ECHA\'s scientific committees RAC and SEAC are working through the proposal sector by sector, with the European Commission expected to decide on the restriction afterwards.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-03-15T09:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['PFAS', 'REACH', 'Restriction', 'ECHA', 'Chemicals'],
    link: 'https://echa.europa.eu/hot-topics/perfluoroalkyl-chemicals-pfas',
    source: 'ECHA'
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
    link: null,
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Europäische Kommission'
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
    link: null,
    source: 'Fost Plus / Val-I-Pac'
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
    link: null,
    source: 'Fødevarestyrelsen'
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
    link: null,
    source: 'BDO / Ministerstwo Klimatu'
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
    link: null,
    source: 'EPA Ireland'
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
    link: null,
    source: 'Czech Trade Inspection Authority'
  },

  // =========================================================================
  // Consultation periods and upcoming changes
  // =========================================================================
  {
    title: 'EU Commission: Public consultation on ESPR delegated act for textiles',
    summary: 'The European Commission has opened a public consultation on the draft delegated act setting ecodesign and DPP requirements for textile products under the ESPR.',
    content: 'The European Commission has published the draft delegated act for textile products under the ESPR for public consultation. The proposed requirements include: mandatory DPP with QR code access, minimum durability requirements (pilling, colour fastness, seam strength), recycled fibre content disclosure, microfibre release information, chemical substance disclosure (SVHC and CMR substances), repair information and availability, country of manufacturing for main processing steps, and recyclability assessment. The consultation is open for 8 weeks. Industry associations, consumer organizations, and environmental NGOs are encouraged to provide technical feedback. The final delegated act is expected to be adopted in 2026, with compliance required from 2027.',
    category: 'consultation',
    countries: ['EU'],
    published_at: '2025-07-01T08:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['ESPR', 'Textiles', 'Consultation', 'Delegated Act', 'DPP'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'ECHA: Consultation on restricting bisphenols in consumer products',
    summary: 'ECHA has launched a public consultation on a proposed restriction of bisphenol A and structurally similar bisphenols in consumer products, covering thermal paper, food contact, and more.',
    content: 'ECHA has opened a public consultation on a comprehensive restriction proposal for bisphenol A (BPA) and structurally related bisphenols under REACH. The proposal covers: thermal paper (already restricted), food contact materials (complementing EFSA re-evaluation), toys and childcare articles, cosmetics, and textiles. The proposal aims to prevent regrettable substitution where BPA is replaced by other bisphenols with similar hazard profiles. Interested parties have 6 months to submit comments and socio-economic evidence. The restriction could significantly impact manufacturers of coatings, plastics, and consumer goods. Companies should assess their use of bisphenols and evaluate alternative substances.',
    category: 'consultation',
    countries: ['EU'],
    published_at: '2025-06-25T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Bisphenol', 'BPA', 'ECHA', 'REACH', 'Consultation'],
    link: null,
    source: 'ECHA'
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
    link: null,
    source: 'BAFU / SECO'
  },
  {
    title: 'UK: Product regulation reform post-Brexit with focus on sustainability',
    summary: 'The UK government has announced plans for a reformed product regulation framework that includes sustainability and circularity requirements, potentially diverging from EU ESPR.',
    content: 'The UK Department for Business and Trade has published a consultation on reforming product regulation in the post-Brexit landscape. The proposed framework includes elements similar to the EU ESPR but with UK-specific adaptations: a phased approach to ecodesign requirements starting with energy-using products, digital product information requirements (not explicitly called DPP), circular economy duties for producers (durability, repairability, recyclability), and maintained UKCA marking with potential for recognition of CE marking for a transitional period. The proposal acknowledges the need for interoperability with the EU system given the UK\'s close trade relationship. Industry stakeholders have 12 weeks to respond. This could create a parallel but compatible regulatory framework.',
    category: 'consultation',
    countries: ['GB'],
    published_at: '2025-05-30T08:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['UK', 'Product Regulation', 'Sustainability', 'UKCA', 'Post-Brexit'],
    link: null,
    source: 'UK Department for Business and Trade'
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
    link: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1157',
    source: 'Europäische Kommission'
  },
  {
    title: 'EU Green Claims Directive: Proposed rules for environmental marketing claims',
    summary: 'The proposed Green Claims Directive would require substantiation of all environmental claims using lifecycle assessment methodology before products can be marketed with green claims.',
    content: 'The proposed EU Green Claims Directive continues its legislative journey through the European Parliament and Council. The proposal requires companies making environmental claims about their products or practices to: substantiate claims using standardized lifecycle assessment methodology, have claims independently verified before use, refrain from generic claims like "eco-friendly" or "green" without specific evidence, and comply with specific rules for comparison claims and carbon offset claims. The proposal also seeks to regulate environmental labelling schemes. While not yet adopted, companies should begin preparing by auditing current marketing claims and establishing evidence-based substantiation processes.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-06-30T08:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Green Claims', 'Environmental Marketing', 'Greenwashing', 'LCA'],
    link: null,
    source: 'Europäische Kommission'
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
    link: null,
    source: 'APA (Portugal)'
  },

  // =========================================================================
  // NEU 2026: ESPR / DPP (deutschsprachig)
  // =========================================================================
  {
    title: 'Ecodesign-Forum nimmt Arbeit auf: Stakeholder gestalten ESPR-Rechtsakte mit',
    summary: 'Das neue Ecodesign-Forum der Europäischen Kommission bringt Industrie, Handel, Verbraucher- und Umweltverbände zusammen, um die delegierten Rechtsakte unter der ESPR vorzubereiten.',
    content: 'Mit der ESPR (EU) 2024/1781 wurde das Ecodesign-Forum als zentrales Konsultationsgremium geschaffen. Es berät die Kommission bei der Priorisierung von Produktgruppen, der Ausgestaltung produktspezifischer Ökodesign-Anforderungen und der technischen Umsetzung des digitalen Produktpasses. Mitglieder sind Vertreter der Mitgliedstaaten, Industrie- und Handelsverbände, KMU-Organisationen sowie Verbraucher- und Umweltverbände. Unternehmen können sich über ihre Verbände einbringen und sollten die Arbeitsdokumente des Forums beobachten, da sich hier früh abzeichnet, welche Anforderungen in den delegierten Rechtsakten landen.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-02-20T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['ESPR', 'Ecodesign-Forum', 'DPP', 'Delegierte Rechtsakte'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'ESPR: Vernichtungsverbot für unverkaufte Kleidung und Schuhe ab 19. Juli 2026',
    summary: 'Große Unternehmen dürfen unverkaufte Bekleidung, Bekleidungszubehör und Schuhe ab dem 19. Juli 2026 nicht mehr vernichten. Für mittlere Unternehmen gilt eine Übergangsfrist bis 2030.',
    content: 'Die ESPR enthält ein direkt anwendbares Verbot der Vernichtung unverkaufter Verbraucherprodukte für die Produktgruppen Bekleidung, Bekleidungszubehör und Schuhe. Es greift für große Unternehmen ab dem 19. Juli 2026; mittlere Unternehmen haben bis 2030 Zeit, Kleinstunternehmen und kleine Unternehmen sind ausgenommen. Bereits seit Inkrafttreten der ESPR gilt zudem eine Offenlegungspflicht: Unternehmen müssen jährlich Angaben zu Menge und Gewicht der von ihnen aussortierten unverkauften Produkte sowie zu den Gründen und zur weiteren Verwendung veröffentlichen. Händler und Marken sollten ihre Retouren- und Lagerprozesse jetzt auf Wiederverwendung, Spende und Recycling ausrichten.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2026-01-15T08:00:00Z',
    effective_date: '2026-07-19',
    priority: 'high',
    tags: ['ESPR', 'Vernichtungsverbot', 'Textilien', 'Retouren'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R1781',
    source: 'Europäische Kommission'
  },
  {
    title: 'DPP-Registry: Kommission bereitet zentrales EU-Register für Produktpässe vor',
    summary: 'Die Europäische Kommission arbeitet am zentralen Register, in dem eindeutige Kennungen aller digitalen Produktpässe hinterlegt werden müssen — ein Kernbaustein der DPP-Infrastruktur.',
    content: 'Nach der ESPR muss die Kommission ein digitales Register aufbauen, in dem die eindeutigen Produkt- und Betreiberkennungen aller digitalen Produktpässe gespeichert werden. Das Register dient Zollbehörden und Marktüberwachung als Prüfpunkt: Beim Import wird künftig abgeglichen, ob für ein Produkt ein registrierter DPP existiert. Die eigentlichen Passdaten bleiben dezentral beim Wirtschaftsakteur bzw. dessen DPP-Dienstleister gespeichert. Parallel laufen die Normungsarbeiten bei CEN/CENELEC (JTC 24) zu Datenträgern, Identifikatoren und Interoperabilität. Unternehmen, die DPP-Lösungen aufbauen, sollten die Registrierungs- und Schnittstellenanforderungen früh in ihre Architektur einplanen.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-09-10T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['DPP', 'Registry', 'ESPR', 'Zoll', 'Interoperabilität'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Delegierte ESPR-Rechtsakte: erste produktspezifische Anforderungen voraussichtlich ab 2027',
    summary: 'Nach dem ESPR-Arbeitsplan werden die ersten delegierten Rechtsakte (Textilien, Eisen & Stahl) voraussichtlich ab 2027 erlassen — mit Übergangsfristen von in der Regel 18 Monaten.',
    content: 'Die Kommission konkretisiert den Zeitplan für die Umsetzung des ESPR-Arbeitsplans 2025-2030: Für die priorisierten Produktgruppen Textilien/Bekleidung sowie Eisen und Stahl laufen Vorstudien und Konsultationen; die delegierten Rechtsakte werden voraussichtlich ab 2027 erlassen. Anforderungen gelten typischerweise 18 Monate nach Inkrafttreten des jeweiligen Rechtsakts, sodass mit den ersten verpflichtenden digitalen Produktpässen unter der ESPR gegen Ende der 2020er Jahre zu rechnen ist. Daneben werden horizontale Anforderungen zu Reparierbarkeit und Rezyklateinsatz vorbereitet. Unternehmen sollten die Vorstudien (Preparatory Studies) ihrer Produktgruppe verfolgen, da dort die spätere Datenanforderungsliste entsteht.',
    category: 'update',
    countries: ['EU'],
    published_at: '2026-02-05T09:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['ESPR', 'Delegierte Rechtsakte', 'DPP', 'Zeitplan'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // NEU 2026: Batterieverordnung (deutschsprachig)
  // =========================================================================
  {
    title: 'Batterieverordnung: Sorgfaltspflichten in der Lieferkette um zwei Jahre verschoben',
    summary: 'Die ursprünglich ab dem 18. August 2025 geltenden Sorgfaltspflichten für Batterie-Rohstoffe wurden im Rahmen des EU-Omnibus-Vereinfachungspakets um zwei Jahre auf August 2027 verschoben.',
    content: 'Die Batterieverordnung (EU) 2023/1542 verpflichtet größere Unternehmen, für die Rohstoffe Kobalt, Lithium, Nickel und Naturgraphit ein Risikomanagement in der Lieferkette einzurichten (Due Diligence), das durch benannte Stellen überprüft wird. Im Rahmen der Omnibus-Vereinfachungsinitiative hat die EU den Geltungsbeginn dieser Sorgfaltspflichten vom 18. August 2025 auf den 18. August 2027 verschoben; zudem sollen die Leitlinien der Kommission deutlich früher vorliegen. Unternehmen sollten die gewonnene Zeit nutzen, um Lieferkettendaten zu erheben und Managementsysteme nach OECD-Leitsätzen aufzubauen, statt die Vorbereitung zu vertagen.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-07-10T08:00:00Z',
    effective_date: '2027-08-18',
    priority: 'high',
    tags: ['Batterieverordnung', 'Sorgfaltspflichten', 'Lieferkette', 'Omnibus'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Batterien: Kennzeichnungspflichten ab August 2026, QR-Code ab Februar 2027',
    summary: 'Ab dem 18. August 2026 gelten die allgemeinen Kennzeichnungspflichten der Batterieverordnung; ab dem 18. Februar 2027 müssen Batterien zusätzlich einen QR-Code tragen.',
    content: 'Die Batterieverordnung (EU) 2023/1542 führt gestufte Kennzeichnungspflichten ein: Ab dem 18. August 2026 müssen Batterien ein Etikett mit allgemeinen Angaben (u.a. Hersteller, Batterietyp, Kapazität, gefährliche Stoffe) tragen; die getrennte Sammlung ist mit der durchgestrichenen Mülltonne zu kennzeichnen, bei Cadmium- und Blei-Gehalten mit den entsprechenden chemischen Symbolen. Ab dem 18. Februar 2027 kommt der QR-Code hinzu, über den je nach Batteriekategorie die Kennzeichnungsinformationen bzw. der Batteriepass zugänglich sein müssen. Hersteller sollten Etikettenlayouts und Datenflüsse jetzt anpassen, da Verpackungs- und Druckprozesse lange Vorlaufzeiten haben.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2026-03-01T09:00:00Z',
    effective_date: '2026-08-18',
    priority: 'high',
    tags: ['Batterieverordnung', 'Kennzeichnung', 'QR-Code', 'Batteriepass'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32023R1542',
    source: 'Europäische Kommission'
  },
  {
    title: 'Gerätebatterien müssen ab Februar 2027 vom Endnutzer entnehmbar und austauschbar sein',
    summary: 'Ab dem 18. Februar 2027 müssen Produkte mit Gerätebatterien so gestaltet sein, dass Endnutzer die Batterie selbst entnehmen und ersetzen können — mit weitreichenden Folgen für das Produktdesign.',
    content: 'Nach Artikel 11 der Batterieverordnung müssen Gerätebatterien in Produkten ab dem 18. Februar 2027 vom Endnutzer ohne Spezialwerkzeug entnehmbar und austauschbar sein; Batterien für leichte Verkehrsmittel (z.B. E-Bikes, E-Scooter) müssen von unabhängigen Fachleuten ausgetauscht werden können. Ausnahmen gelten nur eng begrenzt, etwa für Geräte, die überwiegend in nasser Umgebung betrieben werden, oder aus Gründen der Datenkontinuität bei Medizinprodukten. Ersatzbatterien müssen über einen angemessenen Zeitraum nach dem Inverkehrbringen des letzten Geräts verfügbar bleiben. Hersteller von Elektronik, Wearables und Kleingeräten sollten ihre Designzyklen darauf ausrichten — Produkte, die 2027 auf den Markt kommen, werden jetzt entwickelt.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-11-12T08:00:00Z',
    effective_date: '2027-02-18',
    priority: 'high',
    tags: ['Batterieverordnung', 'Entnehmbarkeit', 'Austauschbarkeit', 'Produktdesign'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Batterieverordnung: Recyclingeffizienz-Vorgaben gelten ab Ende 2025',
    summary: 'Recyclinganlagen müssen ab dem 31. Dezember 2025 Mindest-Recyclingeffizienzen erreichen — 75% für Blei-Säure- und 65% für Lithium-Batterien.',
    content: 'Die Batterieverordnung legt verbindliche Recyclingeffizienzen fest, die ab dem 31. Dezember 2025 gelten: 75 Gewichtsprozent für Blei-Säure-Batterien, 65 Prozent für Lithium-Batterien und 80 Prozent für Nickel-Cadmium-Batterien. Ab Ende 2027 kommen Vorgaben zur stofflichen Rückgewinnung einzelner Materialien hinzu (u.a. 90% für Kobalt, Kupfer und Nickel, 50% für Lithium), die 2031 nochmals steigen. Diese Quoten sind die Grundlage für die späteren Rezyklat-Mindestanteile in neuen Industriebatterien, EV-Batterien und Starterbatterien. Recycler und Hersteller sollten Nachweis- und Berechnungsmethoden nach den Durchführungsvorschriften der Kommission etablieren.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-10-05T10:00:00Z',
    effective_date: '2025-12-31',
    priority: 'medium',
    tags: ['Batterieverordnung', 'Recycling', 'Recyclingeffizienz', 'Kreislaufwirtschaft'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // NEU 2026: PPWR (deutschsprachig)
  // =========================================================================
  {
    title: 'PPWR: Countdown zum Anwendungsbeginn am 12. August 2026',
    summary: 'Die EU-Verpackungsverordnung (EU) 2025/40 ist seit dem 11. Februar 2025 in Kraft und gilt ab dem 12. August 2026 unmittelbar in allen Mitgliedstaaten — ohne nationale Umsetzung.',
    content: 'Mit dem Anwendungsbeginn der PPWR am 12. August 2026 werden zentrale Pflichten unmittelbar wirksam: Konformitätsanforderungen an Verpackungen (Schadstoffgrenzwerte, u.a. neue Grenzwerte für PFAS in Lebensmittelkontaktverpackungen), Pflichten der Wirtschaftsakteure entlang der Lieferkette, technische Dokumentation und EU-Konformitätserklärung für Verpackungen sowie die Registrierungspflichten im Rahmen der erweiterten Herstellerverantwortung. Da die PPWR eine Verordnung ist, ersetzt sie die bisherige Verpackungsrichtlinie ohne nationalen Umsetzungsspielraum — nationale Regelwerke wie das deutsche VerpackG werden angepasst. Unternehmen sollten bis August 2026 ihre Verpackungsportfolios inventarisieren, Konformitätsbewertungen vorbereiten und Zuständigkeiten für die technische Dokumentation festlegen.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2026-02-11T08:00:00Z',
    effective_date: '2026-08-12',
    priority: 'high',
    tags: ['PPWR', 'Verpackung', 'Anwendungsbeginn', 'Konformität', 'PFAS'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32025R0040',
    source: 'Europäische Kommission'
  },
  {
    title: 'PPWR: Harmonisierte Verpackungskennzeichnung ab 2028',
    summary: 'Ab dem 12. August 2028 müssen Verpackungen EU-weit harmonisiert zur Materialzusammensetzung gekennzeichnet werden, um Verbrauchern die richtige Entsorgung zu erleichtern.',
    content: 'Die PPWR sieht eine EU-weit harmonisierte Kennzeichnung der Materialzusammensetzung von Verpackungen vor, die 42 Monate nach Inkrafttreten — also ab dem 12. August 2028 — verpflichtend wird. Die Kommission legt die Piktogramme und technischen Spezifikationen zuvor in Durchführungsrechtsakten fest; die Kennzeichnung soll mit den harmonisierten Symbolen auf den Sammelbehältern korrespondieren. Wiederverwendbare Verpackungen erhalten zusätzlich ein eigenes Label samt QR-Code mit Informationen zum Wiederverwendungssystem. Nationale Sonderkennzeichnungen wie das französische Triman/Info-Tri-System sollen mittelfristig in der harmonisierten EU-Kennzeichnung aufgehen. Verpackungsdesigner sollten Etikettenflächen und Artwork-Prozesse frühzeitig auf die neuen Pflichtangaben auslegen.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2026-04-02T09:00:00Z',
    effective_date: '2028-08-12',
    priority: 'medium',
    tags: ['PPWR', 'Kennzeichnung', 'Verpackung', 'Entsorgung'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'PPWR 2030: Recyclingfähigkeit, Rezyklat-Mindestanteile und Leerraum-Begrenzung',
    summary: 'Ab 2030 greifen die großen Designvorgaben der PPWR: Verpackungen müssen recyclingfähig sein (Grade A-C), Kunststoffverpackungen Mindest-Rezyklatanteile enthalten und der Leerraum im Versandhandel wird auf 50% begrenzt.',
    content: 'Zum 1. Januar 2030 bündelt die PPWR mehrere weitreichende Anforderungen: Alle Verpackungen müssen recyclingfähig im Sinne der Design-for-Recycling-Kriterien sein (Bewertungsstufen A, B oder C; schlechter bewertete Verpackungen verlieren den Marktzugang). Kunststoffverpackungen müssen Mindest-Rezyklatanteile enthalten — je nach Anwendung z.B. 30% für kontaktempfindliche PET-Verpackungen und 35% für sonstige Kunststoffverpackungen. Im E-Commerce gilt eine maximale Leerraumquote von 50% für Um-, Transport- und Versandverpackungen, und Verpackungen sind generell auf das notwendige Minimum zu reduzieren. Zudem werden bestimmte Einwegkunststoff-Formate (z.B. Schrumpffolien für Obst und Gemüse unter 1,5 kg, Einwegverpackungen im Gastronomie-Verzehr vor Ort) verboten. Unternehmen sollten ihre Verpackungs-Roadmap rückwärts von 2030 planen.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-08-20T10:00:00Z',
    effective_date: '2030-01-01',
    priority: 'medium',
    tags: ['PPWR', 'Rezyklat', 'Recyclingfähigkeit', 'Leerraum', 'E-Commerce'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // NEU 2026: GPSR, RED-Cybersecurity, CRA (deutschsprachig)
  // =========================================================================
  {
    title: 'GPSR in der Praxis: Verantwortliche Person in der EU ist Pflicht für alle Verbraucherprodukte',
    summary: 'Seit dem 13. Dezember 2024 dürfen Verbraucherprodukte nur noch in der EU verkauft werden, wenn ein in der EU niedergelassener Wirtschaftsakteur als verantwortliche Person benannt ist — das trifft besonders Direktimporte und Online-Händler.',
    content: 'Die Produktsicherheitsverordnung (EU) 2023/988 (GPSR) verlangt für jedes Verbraucherprodukt einen in der EU niedergelassenen Verantwortlichen (Hersteller, Importeur, Bevollmächtigter oder Fulfilment-Dienstleister), dessen Name und Kontaktdaten auf dem Produkt oder der Verpackung anzugeben sind. Online-Angebote müssen diese Angaben ebenso enthalten wie Warnhinweise in der Sprache des Ziellandes. Für Verkäufe über Online-Marktplätze gilt: Ohne benannte verantwortliche Person darf das Angebot nicht gelistet werden. Händler, die aus Drittstaaten in die EU verkaufen, benötigen daher zwingend einen EU-Partner. Marktüberwachungsbehörden haben 2025 verstärkt Angebote ohne diese Angaben beanstandet und entfernen lassen.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-01-22T09:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['GPSR', 'Verantwortliche Person', 'Online-Handel', 'Produktsicherheit'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'RED-Cybersicherheit: Artikel 3.3 d/e/f gilt seit 1. August 2025 für Funkanlagen',
    summary: 'Internetfähige Funkanlagen — vom Smart-Home-Gerät bis zum Wearable — müssen seit dem 1. August 2025 Cybersicherheitsanforderungen nach der Funkanlagenrichtlinie erfüllen.',
    content: 'Mit der Delegierten Verordnung (EU) 2022/30 wurden die Anforderungen des Artikels 3 Absatz 3 Buchstaben d, e und f der Funkanlagenrichtlinie (RED) aktiviert: Netzschutz, Schutz personenbezogener Daten und der Privatsphäre sowie Betrugsschutz. Sie gelten seit dem 1. August 2025 für internetfähige Funkanlagen, bestimmte Kinder- und Wearable-Produkte sowie Geräte, die personenbezogene Daten verarbeiten. Zur Konformitätsvermutung wurde die Normenreihe EN 18031 im EU-Amtsblatt gelistet — allerdings mit Einschränkungen (Restrictions), bei deren Einschlägigkeit eine benannte Stelle einzubinden ist. Hersteller vernetzter Produkte sollten ihre Risikoanalysen und Konformitätsbewertungen entsprechend aktualisiert haben; der Cyber Resilience Act baut auf diesen Anforderungen auf und löst sie perspektivisch ab.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-06-10T08:00:00Z',
    effective_date: '2025-08-01',
    priority: 'high',
    tags: ['RED', 'Cybersicherheit', 'Funkanlagen', 'EN 18031', 'IoT'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Cyber Resilience Act: Meldepflichten ab September 2026, Hauptpflichten ab Dezember 2027',
    summary: 'Der Cyber Resilience Act (EU) 2024/2847 verpflichtet Hersteller von Produkten mit digitalen Elementen zu Security-by-Design. Meldepflichten für ausgenutzte Schwachstellen greifen ab dem 11. September 2026, die Hauptpflichten ab dem 11. Dezember 2027.',
    content: 'Der Cyber Resilience Act (CRA) ist am 10. Dezember 2024 in Kraft getreten und gilt für nahezu alle Hard- und Softwareprodukte mit digitalen Elementen — von der Smartwatch über Router bis zur Industriesteuerung. Hersteller müssen Cybersicherheit über den gesamten Produktlebenszyklus gewährleisten: Risikobewertung, sichere Standardkonfiguration, Schwachstellenmanagement und kostenlose Sicherheitsupdates über den Unterstützungszeitraum. Ab dem 11. September 2026 gelten die Meldepflichten: aktiv ausgenutzte Schwachstellen und schwerwiegende Sicherheitsvorfälle sind binnen 24 Stunden (Frühwarnung) an ENISA und die zuständige nationale Behörde zu melden. Ab dem 11. Dezember 2027 gelten die übrigen Pflichten vollständig, inklusive CE-Kennzeichnung auf Basis der Cybersicherheits-Konformitätsbewertung. Für wichtige und kritische Produktklassen gelten verschärfte Bewertungsverfahren.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-09-15T09:00:00Z',
    effective_date: '2027-12-11',
    priority: 'high',
    tags: ['Cyber Resilience Act', 'CRA', 'Cybersicherheit', 'CE-Kennzeichnung', 'Meldepflichten'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R2847',
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // NEU 2026: EUDR (deutschsprachig)
  // =========================================================================
  {
    title: 'EUDR: Länder-Benchmarking veröffentlicht — nur vier Länder mit hohem Risiko',
    summary: 'Die Kommission hat im Mai 2025 die Risikoeinstufung der Länder unter der Entwaldungsverordnung veröffentlicht: Nur Belarus, Myanmar, Nordkorea und Russland gelten als Hochrisikoländer.',
    content: 'Mit der Durchführungsverordnung zum EUDR-Länderbenchmarking hat die Europäische Kommission im Mai 2025 alle Erzeugerländer in die Kategorien geringes, normales und hohes Risiko eingeteilt. Als Hochrisikoländer wurden ausschließlich Belarus, Myanmar, Nordkorea und Russland eingestuft; viele wichtige Lieferländer (u.a. die EU-Mitgliedstaaten, USA, China teilweise je nach Rohstoff) gelten als geringes Risiko. Die Einstufung bestimmt die Prüftiefe: Bei Ware aus Ländern mit geringem Risiko genügt eine vereinfachte Sorgfaltspflicht (kein vollständiges Risk Assessment und keine Risikominderung), und die Kontrollquoten der Behörden sind niedriger (1% statt 3% bzw. 9% der Marktteilnehmer). Unternehmen sollten ihre Lieferländer gegen die Liste abgleichen und die Klassifizierung in ihre Due-Diligence-Systeme einpflegen — die Liste wird regelmäßig überprüft.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-05-22T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['EUDR', 'Benchmarking', 'Länderliste', 'Sorgfaltspflicht'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'EUDR-Informationssystem: Sorgfaltserklärungen können eingereicht werden',
    summary: 'Das EU-Informationssystem für EUDR-Sorgfaltserklärungen ist produktiv. Marktteilnehmer sollten Registrierung und Testeinreichungen vor dem Geltungsbeginn abschließen.',
    content: 'Das zentrale EUDR-Informationssystem (angebunden an TRACES) steht Marktteilnehmern und Händlern zur Verfügung: Dort werden die Sorgfaltserklärungen (Due Diligence Statements) mit Geolokalisierungsdaten der Erzeugungsflächen eingereicht und Referenznummern erzeugt, die in Zollanmeldungen anzugeben sind. Die Kommission stellt API-Schnittstellen für die Massenübermittlung aus ERP- und Compliance-Systemen bereit. Erfahrungen aus der Pilotphase zeigen, dass die Datenqualität der Geokoordinaten (Polygone vs. Punktkoordinaten, Plausibilität der Flächen) der häufigste Stolperstein ist. Unternehmen, die ab dem 30. Dezember 2025 (KMU: 30. Juni 2026) liefern wollen, sollten Registrierung, Bevollmächtigungen und Testläufe rechtzeitig abschließen.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-12-04T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['EUDR', 'TRACES', 'Sorgfaltserklärung', 'Geolokalisierung'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // NEU 2026: REACH / CLP / Chemikalien (deutschsprachig)
  // =========================================================================
  {
    title: 'REACH: Formaldehyd-Grenzwerte für Erzeugnisse gelten ab 6. August 2026',
    summary: 'Mit Eintrag 77 in Anhang XVII der REACH-Verordnung gelten ab dem 6. August 2026 Emissionsgrenzwerte für Formaldehyd aus Erzeugnissen — besonders relevant für Möbel und Holzwerkstoffe.',
    content: 'Die Verordnung (EU) 2023/1464 hat Formaldehyd und Formaldehyd-Abspalter als Eintrag 77 in Anhang XVII der REACH-Verordnung aufgenommen. Nach Ablauf der Übergangsfrist dürfen ab dem 6. August 2026 Erzeugnisse nur noch in Verkehr gebracht werden, wenn die Formaldehyd-Emission in die Innenraumluft 0,062 mg/m³ bei Möbeln und Erzeugnissen auf Holzwerkstoffbasis bzw. 0,08 mg/m³ bei sonstigen Erzeugnissen nicht überschreitet. Für das Innere von Straßenfahrzeugen gilt der Grenzwert von 0,062 mg/m³ ab dem 6. August 2027. Die Messung erfolgt nach den in der Verordnung festgelegten Prüfbedingungen (Kammerverfahren). Hersteller und Importeure von Möbeln, Bodenbelägen und Holzwerkstoffen sollten Prüfberichte ihrer Lieferanten aktualisieren und Lagerbestände fristgerecht abverkaufen.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2026-01-20T08:00:00Z',
    effective_date: '2026-08-06',
    priority: 'high',
    tags: ['REACH', 'Formaldehyd', 'Anhang XVII', 'Möbel', 'Holzwerkstoffe'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32023R1464',
    source: 'ECHA'
  },
  {
    title: 'Mikroplastik-Beschränkung: nächste Stufen für Kosmetik und Sportplatz-Granulat',
    summary: 'Die REACH-Beschränkung bewusst zugesetzter Mikroplastikpartikel (EU) 2023/2055 greift gestuft: Abspülbare Kosmetik ab Oktober 2027, Leave-on-Produkte ab 2029, Kunstrasen-Granulat ab Oktober 2031.',
    content: 'Seit dem 17. Oktober 2023 gilt das Grundverbot für bewusst zugesetzte synthetische Polymermikropartikel (z.B. loses Glitter). Die wichtigsten Übergangsfristen laufen nun schrittweise ab: Abspülbare kosmetische Mittel (Rinse-off, z.B. Peelings) dürfen ab dem 17. Oktober 2027 kein Mikroplastik mehr enthalten, Leave-on-Kosmetik ab dem 17. Oktober 2029 und Make-up, Lippen- und Nagelprodukte ab dem 17. Oktober 2035 (mit Kennzeichnungspflicht ab 2031). Für polymeres Einstreugranulat auf Kunstrasenplätzen endet die Frist am 17. Oktober 2031. Seit 2025 gelten zudem Informationspflichten für Industrieanwender. Hersteller sollten Rezepturumstellungen und Abverkaufsplanung entlang dieser Stufen synchronisieren.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-09-25T10:00:00Z',
    effective_date: '2027-10-17',
    priority: 'medium',
    tags: ['Mikroplastik', 'REACH', 'Kosmetik', 'Beschränkung'],
    link: null,
    source: 'ECHA'
  },
  {
    title: 'CLP-Novelle: neue Einstufungs- und Kennzeichnungsregeln ab Juli 2026',
    summary: 'Die überarbeitete CLP-Verordnung (EU) 2024/2865 bringt neue Etikettierungsregeln, Vorgaben für den Online-Handel und Nachfüllstationen. Für Stoffe gilt sie ab dem 1. Juli 2026, für Gemische ab dem 1. Januar 2027.',
    content: 'Die CLP-Novelle (EU) 2024/2865 ist am 10. Dezember 2024 in Kraft getreten und modernisiert die Einstufungs- und Kennzeichnungsvorschriften umfassend: Mindestschriftgrößen und Formatvorgaben für Etiketten, erleichterte Nutzung von Fold-out-Labels, Regeln für digitale Kennzeichnung als Ergänzung, verpflichtende Gefahrenangaben in Online-Angeboten (der Kaufabschluss darf erst nach Anzeige der Kennzeichnungsinformationen möglich sein), Vorgaben für den Verkauf an Nachfüllstationen sowie neue Fristen für die Aktualisierung von Einstufungen. Die neuen Pflichten gelten für Stoffe ab dem 1. Juli 2026 und für Gemische ab dem 1. Januar 2027, mit Abverkaufsfristen für bereits in Verkehr gebrachte Produkte. Parallel wurden mit der Delegierten Verordnung (EU) 2023/707 neue Gefahrenklassen (u.a. endokrine Disruptoren, PBT/vPvB, PMT/vPvM) eingeführt, deren Übergangsfristen ebenfalls 2025/2026 auslaufen. Inverkehrbringer von Chemikalien sollten Etiketten, Webshops und Sicherheitsdatenblätter systematisch überarbeiten.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-10-10T09:00:00Z',
    effective_date: '2026-07-01',
    priority: 'medium',
    tags: ['CLP', 'Kennzeichnung', 'Einstufung', 'Online-Handel', 'Chemikalien'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R2865',
    source: 'ECHA'
  },
  {
    title: 'PFAS-Beschränkung: ECHA-Ausschüsse bewerten Sektor für Sektor',
    summary: 'Die wissenschaftlichen Ausschüsse RAC und SEAC arbeiten die universelle PFAS-Beschränkung sektorweise ab. Eine Entscheidung der Kommission wird nicht vor 2026/2027 erwartet.',
    content: 'Die Bewertung des universellen PFAS-Beschränkungsvorschlags durch die ECHA-Ausschüsse RAC (Risiken) und SEAC (sozioökonomische Analyse) schreitet sektorweise voran; vorläufige Schlussfolgerungen liegen u.a. für Textilien, Kosmetik, Ski-Wachse und Verbraucher-Mischungen vor, während komplexe Sektoren wie Elektronik, Energie und Transport noch in Bearbeitung sind. Die fünf einreichenden Staaten haben ihr Dossier mehrfach aktualisiert, u.a. zu Fluorpolymeren. Erst nach Abschluss der Ausschussarbeiten entscheidet die Europäische Kommission mit den Mitgliedstaaten über Umfang, Ausnahmen und Übergangsfristen — realistisch nicht vor 2026/2027, mit Anwendungsbeginn deutlich später. Unabhängig davon sollten Unternehmen PFAS-Inventare aufbauen: Kunden- und Investorenanfragen, nationale Regelungen und die PFAS-Grenzwerte der PPWR für Lebensmittelverpackungen wirken bereits heute.',
    category: 'update',
    countries: ['EU'],
    published_at: '2026-03-12T10:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['PFAS', 'REACH', 'ECHA', 'Beschränkung', 'Chemikalien'],
    link: 'https://echa.europa.eu/hot-topics/perfluoroalkyl-chemicals-pfas',
    source: 'ECHA'
  },

  // =========================================================================
  // NEU 2026: Spielzeug, Maschinen, Medizinprodukte (deutschsprachig)
  // =========================================================================
  {
    title: 'Neue Spielzeugverordnung: Übergangsfristen — was Hersteller jetzt vorbereiten sollten',
    summary: 'Nach der politischen Einigung über die neue EU-Spielzeugverordnung haben Hersteller mehrere Jahre Übergangszeit. Die Datenbasis für den Spielzeug-Produktpass sollte trotzdem jetzt aufgebaut werden.',
    content: 'Die kommende EU-Spielzeugverordnung ersetzt die Richtlinie 2009/48/EG und gilt nach einer mehrjährigen Übergangsfrist nach Inkrafttreten (im Trilog wurden 54 Monate vereinbart). Kernpunkte für die Vorbereitung: (1) Der digitale Produktpass ersetzt die bisherige EG-Konformitätserklärung im Handels- und Zollprozess und muss am Produkt verlinkt sein (z.B. QR-Code); (2) erweiterte chemische Anforderungen, darunter Verbote für endokrine Disruptoren, PFAS und besonders besorgniserregende Bisphenole in Spielzeug; (3) verschärfte Sicherheitsbewertung inklusive digitaler Risiken bei vernetztem Spielzeug; (4) strengere Pflichten für Online-Marktplätze. Da Spielzeug lange Entwicklungs- und Beschaffungszyklen hat, sollten Hersteller Stoffdaten, Prüfberichte und Konformitätsnachweise bereits jetzt strukturiert digital erfassen — diese Daten bilden später den Produktpass.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-12-01T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Spielzeug', 'DPP', 'Übergangsfristen', 'Chemikalien'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Maschinenverordnung: Stichtag 20. Januar 2027 — digitale Anleitungen und neue Pflichten',
    summary: 'Ab dem 20. Januar 2027 gilt ausschließlich die Maschinenverordnung (EU) 2023/1230. Betriebsanleitungen dürfen dann digital bereitgestellt werden; für Sicherheitsbauteile mit KI gelten neue Konformitätsverfahren.',
    content: 'Die Maschinenverordnung (EU) 2023/1230 löst am 20. Januar 2027 die Maschinenrichtlinie 2006/42/EG vollständig ab — ohne gleitenden Übergang: Maschinen, die ab diesem Tag in Verkehr gebracht werden, müssen der Verordnung entsprechen. Wichtige Neuerungen: Betriebsanleitungen und EU-Konformitätserklärung dürfen digital bereitgestellt werden (Verbraucher können eine Papierfassung verlangen), Anforderungen an Cybersicherheit sicherheitsrelevanter Steuerungen, Regelungen für selbstlernende Systeme (KI) in Sicherheitsfunktionen sowie eine Liste von Hochrisiko-Maschinen in Anhang I mit teils verpflichtender Drittstellen-Zertifizierung. Da harmonisierte Normen erst sukzessive gelistet werden, sollten Hersteller ihre Konformitätsstrategie (Normen vs. Einzelnachweis) frühzeitig festlegen und Dokumentationsprozesse auf das digitale Format umstellen.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2026-05-05T08:00:00Z',
    effective_date: '2027-01-20',
    priority: 'high',
    tags: ['Maschinenverordnung', 'CE-Kennzeichnung', 'Digitale Anleitung', 'KI'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32023R1230',
    source: 'Europäische Kommission'
  },
  {
    title: 'EUDAMED: verpflichtende Nutzung der ersten Module rückt näher',
    summary: 'Mit der Verordnung (EU) 2024/1860 wird die EUDAMED-Nutzung modulweise verpflichtend, sobald die einzelnen Module auditiert und für funktionsfähig erklärt wurden — voraussichtlich gestaffelt ab 2026.',
    content: 'Die EU hat mit der Verordnung (EU) 2024/1860 die Grundlage geschaffen, einzelne EUDAMED-Module bereits vor Fertigstellung der Gesamtdatenbank verpflichtend zu machen. Nach erfolgreichem Audit und Funktionsfähigkeitserklärung der Kommission wird die Nutzung der jeweiligen Module (u.a. Akteursregistrierung, UDI/Produktregistrierung, benannte Stellen und Zertifikate) nach Übergangsfristen von 6 bzw. 24 Monaten verpflichtend — die ersten Pflichten werden voraussichtlich ab 2026 greifen. Dieselbe Verordnung führte zudem die Informationspflicht bei Lieferunterbrechungen kritischer Medizinprodukte ein. Hersteller, Bevollmächtigte und Importeure sollten ihre Akteurs- und UDI-Daten konsolidieren und interne Prozesse für die fristgerechte Datenpflege in EUDAMED aufsetzen.',
    category: 'update',
    countries: ['EU'],
    published_at: '2026-01-28T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['EUDAMED', 'MDR', 'Medizinprodukte', 'UDI'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'MDCG veröffentlicht neue Leitlinien zu Legacy Devices und klinischer Bewertung',
    summary: 'Die Medical Device Coordination Group hat ihre Guidance-Sammlung erweitert — u.a. zur Behandlung von Bestandsprodukten in der verlängerten MDR-Übergangsphase.',
    content: 'Die MDCG (Medical Device Coordination Group) hat mehrere Leitliniendokumente aktualisiert bzw. neu veröffentlicht, die für Hersteller in der verlängerten MDR-Übergangsphase praktisch relevant sind: Anforderungen an Legacy Devices unter der Verlängerungsverordnung (EU) 2023/607 (u.a. "appropriate surveillance" durch benannte Stellen), Hinweise zur klinischen Bewertung und zur Gleichartigkeit (Equivalence) sowie Klarstellungen zu Registrierungs- und Vigilanzpflichten. MDCG-Leitlinien sind rechtlich nicht bindend, prägen aber die Auslegungspraxis der benannten Stellen und Behörden erheblich. Regulatory-Affairs-Teams sollten die MDCG-Dokumentenliste regelmäßig gegen ihre QM-Verfahrensanweisungen abgleichen.',
    category: 'guidance',
    countries: ['EU'],
    published_at: '2025-07-08T10:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['MDCG', 'MDR', 'Medizinprodukte', 'Guidance', 'Legacy Devices'],
    link: null,
    source: 'MDCG'
  },

  // =========================================================================
  // NEU 2026: Textil & EPR (deutschsprachig)
  // =========================================================================
  {
    title: 'EPR für Textilien kommt EU-weit: Einigung zur Änderung der Abfallrahmenrichtlinie',
    summary: 'Rat und Parlament haben sich 2025 auf eine EU-weit harmonisierte erweiterte Herstellerverantwortung für Textilien geeinigt. Mitgliedstaaten müssen EPR-Systeme innerhalb von 30 Monaten nach Inkrafttreten einführen.',
    content: 'Mit der Einigung über die gezielte Änderung der Abfallrahmenrichtlinie wird die erweiterte Herstellerverantwortung (EPR) für Textilien EU-weit verpflichtend: Hersteller und Importeure von Bekleidung, Heimtextilien und Schuhen müssen die Kosten für Sammlung, Sortierung und Verwertung von Alttextilien tragen. Die Beiträge werden öko-moduliert — langlebige, reparierbare und rezyklierbare Produkte zahlen weniger. Die Regelung erfasst ausdrücklich auch den Online-Handel und Verkäufe aus Drittstaaten über Plattformen; Ultra-Fast-Fashion-Geschäftsmodelle geraten damit unter Kostendruck. Die Mitgliedstaaten müssen die EPR-Systeme innerhalb von 30 Monaten nach Inkrafttreten der Änderungsrichtlinie einrichten. Unternehmen mit Textilsortiment sollten Mengengerüste je Mitgliedstaat aufbauen und bestehende nationale Systeme (Frankreich, Niederlande, Lettland, Ungarn) als Blaupause nutzen.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-02-19T09:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['Textilien', 'EPR', 'Abfallrahmenrichtlinie', 'Fast Fashion'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Frankreich: Umwelt-Kostenlabel (coût environnemental) für Textilien gestartet',
    summary: 'Frankreich hat 2025 die Umweltkosten-Kennzeichnung für Bekleidung eingeführt — zunächst freiwillig, mit amtlicher Berechnungsmethodik und offizieller Datenbank.',
    content: 'Als Vorreiter der Umweltkennzeichnung hat Frankreich den "coût environnemental" für Textilien gestartet: eine Punktzahl, die die Umweltauswirkungen eines Kleidungsstücks über den gesamten Lebenszyklus abbildet (Methodik auf PEF-Basis mit französischen Zusatzkriterien wie Mikrofaserfreisetzung und Export-Praktiken). Die Nutzung ist zunächst freiwillig; wer das Label verwendet, muss aber die amtliche Berechnungsmethode und das offizielle Anzeigeformat einhalten. Die Bewertung erfolgt über das staatliche Tool Ecobalyse. Marken, die in Frankreich verkaufen, sollten die Methodik testen — sie gibt zugleich einen Vorgeschmack auf künftige ESPR-Anforderungen an Umweltinformationen für Textilien.',
    category: 'update',
    countries: ['FR'],
    published_at: '2025-10-08T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Frankreich', 'Textilien', 'Umweltkennzeichnung', 'AGEC', 'PEF'],
    link: null,
    source: 'Ministère de la Transition écologique'
  },
  {
    title: 'EU-Textilstrategie: Zwischenbilanz — DPP, Ökodesign und EPR als Kernbausteine',
    summary: 'Die EU-Strategie für nachhaltige und kreislauffähige Textilien nimmt Gestalt an: ESPR-Arbeitsplan, EPR-Einigung und Anti-Greenwashing-Regeln setzen den Rahmen bis 2030.',
    content: 'Die 2022 vorgestellte EU-Textilstrategie wird Schritt für Schritt in verbindliches Recht überführt: Textilien sind priorisierte Produktgruppe im ersten ESPR-Arbeitsplan (DPP und Ökodesign-Anforderungen), die EPR-Pflicht für Textilien wurde in der Abfallrahmenrichtlinie verankert, die getrennte Sammlung von Alttextilien ist seit Januar 2025 EU-weit verpflichtend, und mit der Empowering-Consumers-Richtlinie (EU) 2024/825 werden pauschale Umweltaussagen wie "klimaneutral" ab dem 27. September 2026 verboten. Offene Baustellen sind u.a. Vorgaben gegen Mikroplastik aus Textilien und die Kriterien für das Ende der Abfalleigenschaft. Für Marken bedeutet das: Produktdaten (Faserzusammensetzung, Lieferkette, Haltbarkeit) werden zur regulatorischen Pflichtinformation — ein frühzeitig aufgebautes Datenfundament zahlt auf alle Instrumente gleichzeitig ein.',
    category: 'update',
    countries: ['EU'],
    published_at: '2024-11-14T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Textilstrategie', 'DPP', 'EPR', 'Greenwashing', 'Kreislaufwirtschaft'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // NEU 2026: National Deutschland (deutschsprachig)
  // =========================================================================
  {
    title: 'BattDG: stiftung ear übernimmt ab 2026 die Batterie-Registrierung in Deutschland',
    summary: 'Das Batterierecht-Durchführungsgesetz (BattDG) löst das BattG ab: Ab 2026 ist die stiftung ear statt des Umweltbundesamts für Registrierung und Herstellerpflichten zuständig.',
    content: 'Mit dem Batterierecht-Durchführungsgesetz (BattDG) passt Deutschland sein nationales Batterierecht an die EU-Batterieverordnung (EU) 2023/1542 an. Die wichtigste organisatorische Änderung: Die Zuständigkeit für die Herstellerregistrierung geht vom Umweltbundesamt (Melderegister) auf die stiftung ear über, die bereits das ElektroG-Register führt. Hersteller und Bevollmächtigte müssen sich im neuen Register registrieren; bestehende BattG-Registrierungen werden nicht automatisch unbegrenzt fortgeführt — die Übergangsregelungen sind zu beachten. Inhaltlich bringt das BattDG u.a. erweiterte Rücknahmepflichten (inklusive der neuen Kategorie Batterien für leichte Verkehrsmittel) und schärfere Vollzugsinstrumente. Wer Batterien oder batteriebetriebene Geräte nach Deutschland liefert, sollte Registrierungsstatus und Beauftragungen 2026 prüfen.',
    category: 'regulation',
    countries: ['DE'],
    published_at: '2025-08-14T08:00:00Z',
    effective_date: '2026-01-01',
    priority: 'high',
    tags: ['BattDG', 'Deutschland', 'Batterien', 'stiftung ear', 'Registrierung'],
    link: 'https://www.stiftung-ear.de/',
    source: 'stiftung ear'
  },
  {
    title: 'LUCID: ZSVR intensiviert Prüfungen — Registrierungen auf Vollständigkeit kontrollieren',
    summary: 'Die Zentrale Stelle Verpackungsregister prüft verstärkt die Vollständigkeit und Richtigkeit von LUCID-Registrierungen, insbesondere Markennamen und Verpackungsarten. Unvollständige Angaben gelten als Registrierungsmangel.',
    content: 'Die ZSVR hat ihre Prüf- und Vollzugstätigkeit ausgeweitet: Kontrolliert werden insbesondere die vollständige Angabe aller Markennamen, die korrekte Einordnung systembeteiligungspflichtiger Verpackungen sowie die Plausibilität der Mengenmeldungen im Abgleich mit den Dualen Systemen. Eine unvollständige Registrierung steht rechtlich einer Nichtregistrierung gleich — Folge können Vertriebsverbote und Bußgelder bis 200.000 Euro sein; zudem trifft Marktplätze und Fulfilment-Dienstleister eine Prüfpflicht, sodass Angebote gesperrt werden. Auch ausländische Versandhändler, die direkt an deutsche Endkunden liefern, sind registrierungspflichtig. Unternehmen sollten ihre LUCID-Stammdaten (Markennamen, Verpackungsarten, Meldemengen) mindestens jährlich auditieren.',
    category: 'warning',
    countries: ['DE'],
    published_at: '2025-11-20T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['LUCID', 'VerpackG', 'ZSVR', 'Registrierung', 'Deutschland'],
    link: 'https://www.verpackungsregister.org/',
    source: 'Zentrale Stelle Verpackungsregister'
  },
  {
    title: 'Einwegkunststofffonds: Abgabepflicht läuft — Jahresmeldung über DIVID',
    summary: 'Hersteller bestimmter Einwegkunststoffprodukte zahlen seit 2024 in den deutschen Einwegkunststofffonds ein. Die Mengenmeldung des Vorjahres ist jeweils bis zum 15. Mai über die DIVID-Plattform abzugeben.',
    content: 'Nach dem Einwegkunststofffondsgesetz (EWKFondsG) sind Hersteller und Importeure von Einwegkunststoffprodukten wie To-go-Bechern, Lebensmittelbehältern, Tüten, Folienverpackungen, Getränkebehältern, leichten Tragetaschen, Feuchttüchern, Luftballons und Tabakfiltern abgabepflichtig: Sie registrieren sich auf der UBA-Plattform DIVID, melden jährlich bis zum 15. Mai die im Vorjahr in Verkehr gebrachten Mengen und zahlen die produktspezifische Abgabe (z.B. 8,972 Euro/kg für Tabakfilter). Die Einnahmen werden an Kommunen für Reinigungs- und Entsorgungskosten ausgeschüttet. Seit 2025 läuft der Vollzug; Nichtregistrierung kann mit Bußgeld und Vertriebsverbot geahndet werden. Betroffene sollten ihre Produktpalette gegen Anlage 1 des EWKFondsG prüfen — die Abgrenzungsfragen (z.B. Verbundmaterialien) sind im Detail anspruchsvoll.',
    category: 'deadline',
    countries: ['DE'],
    published_at: '2025-03-02T08:00:00Z',
    effective_date: '2025-05-15',
    priority: 'medium',
    tags: ['Einwegkunststofffonds', 'EWKFondsG', 'DIVID', 'Deutschland', 'SUP'],
    link: null,
    source: 'Umweltbundesamt'
  },
  {
    title: 'ElektroG-Novelle in der Diskussion: Sammelquote verfehlt, neue Maßnahmen erwartet',
    summary: 'Deutschland verfehlt die WEEE-Sammelquote von 65% weiterhin deutlich. Diskutiert werden u.a. erweiterte Rücknahmepflichten des Handels und bessere Verbraucherinformation.',
    content: 'Deutschland erreicht bei Elektroaltgeräten seit Jahren nur eine Sammelquote von rund 30 Prozent statt der unionsrechtlich geforderten 65 Prozent. Vor diesem Hintergrund wird eine weitere ElektroG-Novelle diskutiert; im Gespräch sind u.a. zusätzliche Rücknahmemöglichkeiten im Handel, einheitliche Sammelstellen-Kennzeichnung, Pfand- oder Anreizsysteme für bestimmte Gerätearten (etwa kleine Geräte mit Lithium-Batterien wegen der Brandgefahr in Sortieranlagen) und verbindlichere Informationspflichten. Konkrete Gesetzesänderungen stehen noch aus — Hersteller und Händler sollten die Entwicklung verfolgen, da neue Rücknahme- und Informationspflichten erfahrungsgemäß kurze Umsetzungsfristen haben. Unabhängig davon gelten die bestehenden ElektroG-Pflichten (Registrierung, Kennzeichnung, Rücknahme im Handel ab bestimmten Verkaufsflächen) unverändert fort.',
    category: 'update',
    countries: ['DE'],
    published_at: '2026-02-18T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['ElektroG', 'WEEE', 'Sammelquote', 'Deutschland'],
    link: null,
    source: 'stiftung ear'
  },
  {
    title: 'Frankreich: AGEC-Fahrplan — weitere Stufen bei Einwegplastik und Verbraucherinformation',
    summary: 'Das französische Anti-Verschwendungsgesetz AGEC entfaltet seine Wirkung in Stufen bis 2040. Für Inverkehrbringer relevant: Rezyklat-Vorgaben, Reparaturfonds und erweiterte Informationspflichten.',
    content: 'Frankreich setzt seinen AGEC-Stufenplan konsequent fort: Das Land verfolgt das Ziel, Einwegkunststoffverpackungen bis 2040 vollständig abzuschaffen (Zwischenziele über die 3R-Dekrete zu Reduktion, Wiederverwendung, Recycling). Für Hersteller und Händler bereits wirksam sind u.a. das Vernichtungsverbot für unverkaufte Non-Food-Produkte, die Qualitäts- und Umweltinformationspflichten (Triman/Info-Tri), Mindestanteile an wiederverwendetem Material in bestimmten Produkten, der Reparaturbonus über die EPR-Reparaturfonds sowie der Reparierbarkeits- bzw. Haltbarkeitsindex für Elektronik. Die EPR-Systeme wurden auf zusätzliche Produktkategorien ausgeweitet (u.a. Sport- und Freizeitartikel, Heimwerkerbedarf, Spielzeug). Unternehmen im Frankreich-Geschäft sollten die Filière-Zugehörigkeit jedes Produkts klären und die jährlichen Öko-Modulations-Kriterien der Systeme (CITEO, Refashion, ecosystem u.a.) in der Produktentwicklung berücksichtigen.',
    category: 'update',
    countries: ['FR'],
    published_at: '2025-05-28T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['AGEC', 'Frankreich', 'EPR', 'Einwegplastik', 'Reparatur'],
    link: null,
    source: 'Ministère de la Transition écologique'
  },

  // =========================================================================
  // NEU 2026: UK / US / Schweiz (deutschsprachig)
  // =========================================================================
  {
    title: 'UK Packaging EPR: PackUK veröffentlicht Gebühren — erste Rechnungen ab Oktober 2025',
    summary: 'Das britische Verpackungs-EPR-System ist gestartet: Der Scheme Administrator PackUK hat die Basisgebühren je Material veröffentlicht; große Hersteller zahlen ab Oktober 2025.',
    content: 'Mit der Extended Producer Responsibility for Packaging (pEPR) verlagert das Vereinigte Königreich die vollen Entsorgungskosten für Haushaltsverpackungen auf die Hersteller. Der Scheme Administrator PackUK hat 2025 die endgültigen Basisgebühren je Materialart (Papier/Karton, Kunststoff, Glas, Aluminium, Stahl, Holz, Faserverbund, Sonstige) veröffentlicht; die ersten Rechnungen für das Gebührenjahr 2025/26 werden seit Oktober 2025 gestellt. Berichtspflichtig sind Unternehmen ab 1 Mio. GBP Umsatz und 25 Tonnen Verpackungen, zahlungspflichtig für Entsorgungsgebühren sind große Hersteller. Ab dem Gebührenjahr 2026/27 werden die Gebühren über die Recyclability Assessment Methodology (RAM) öko-moduliert — schlecht rezyklierbare Verpackungen zahlen deutlich mehr. Unternehmen mit UK-Geschäft sollten Datenmeldungen (Report Packaging Data) und RAM-Einstufungen priorisieren.',
    category: 'deadline',
    countries: ['GB'],
    published_at: '2025-06-27T08:00:00Z',
    effective_date: '2025-10-01',
    priority: 'high',
    tags: ['UK', 'EPR', 'Verpackung', 'PackUK', 'Gebühren'],
    link: null,
    source: 'DEFRA / PackUK'
  },
  {
    title: 'UK: CE-Kennzeichnung wird weiter anerkannt — UKCA-Übergang erneut entschärft',
    summary: 'Die britische Regierung erkennt die CE-Kennzeichnung für die meisten Produktbereiche auf unbestimmte Zeit an. Der neue Product Regulation and Metrology Act schafft die Grundlage für flexible Produktregeln.',
    content: 'Nach mehrfachen Verschiebungen hat die britische Regierung angekündigt, die CE-Kennzeichnung für die meisten unter das frühere EU-Recht fallenden Produktbereiche (u.a. Maschinen, Elektrogeräte, EMV, Funkanlagen, Spielzeug, Druckgeräte) auf unbestimmte Zeit weiter anzuerkennen — UKCA bleibt als Alternative bestehen. Ausnahmen mit eigenen Regimen gelten weiterhin u.a. für Medizinprodukte, Bauprodukte und Ex-Schutz-Produkte. Der Product Regulation and Metrology Act 2025 gibt der Regierung zudem weitreichende Befugnisse, Produktvorschriften künftig flexibel anzupassen und dabei auch EU-Recht nachzuvollziehen, wo dies im britischen Interesse liegt. Exporteure sollten produktbereichsspezifisch prüfen, ob CE weiterhin genügt, und die Entwicklungen bei Medizinprodukten und Bauprodukten separat verfolgen.',
    category: 'update',
    countries: ['GB'],
    published_at: '2024-09-12T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['UK', 'UKCA', 'CE-Kennzeichnung', 'Brexit'],
    link: null,
    source: 'UK Department for Business and Trade'
  },
  {
    title: 'USA: MoCRA — FDA setzt Registrierungs- und Listungspflichten für Kosmetika durch',
    summary: 'Unter dem Modernization of Cosmetics Regulation Act müssen Kosmetikhersteller ihre Betriebe bei der FDA registrieren und Produkte listen. Die FDA hat den Vollzug aufgenommen.',
    content: 'Der Modernization of Cosmetics Regulation Act (MoCRA) ist die größte Reform des US-Kosmetikrechts seit 1938. Kernpflichten: Registrierung der Herstellungsbetriebe bei der FDA (Renewal alle zwei Jahre), Produktlistung mit Inhaltsstoffen (jährliche Aktualisierung), Benennung einer "Responsible Person" mit US-Adresse, Sicherheitsnachweise (Safety Substantiation), Meldung schwerwiegender unerwünschter Ereignisse binnen 15 Werktagen sowie Kennzeichnung mit US-Kontaktadresse für Meldungen. Die Registrierungs- und Listungspflichten werden über das FDA-Portal Cosmetics Direct abgewickelt; die FDA hat nach Ablauf der Schonfristen mit dem Vollzug begonnen. Ausstehend sind weiterhin die finalen Regelungen zu Good Manufacturing Practices und zur Talk-Asbest-Testung. EU-Exporteure in die USA sollten ihre MoCRA-Compliance (US-Agent, Listung, PIF-Äquivalente) verifizieren.',
    category: 'update',
    countries: ['US'],
    published_at: '2024-10-15T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['MoCRA', 'USA', 'Kosmetik', 'FDA', 'Registrierung'],
    link: null,
    source: 'U.S. FDA'
  },
  {
    title: 'Kalifornien Prop 65: geänderte Vorgaben für Kurzform-Warnhinweise',
    summary: 'Die kalifornische OEHHA hat die Safe-Harbor-Regeln für Proposition-65-Warnhinweise geändert: Kurzform-Warnungen müssen künftig mindestens einen Stoff benennen. Übergangsfrist bis 2028.',
    content: 'Kalifornien hat die Safe-Harbor-Vorgaben für Warnhinweise nach Proposition 65 überarbeitet: Die bisher zulässige generische Kurzform-Warnung ("WARNING: Cancer and Reproductive Harm") muss künftig mindestens einen gelisteten Stoff je Endpunkt benennen (z.B. "Cancer risk from exposure to lead"); zudem wurden neue Formulierungsoptionen und klargestellte Regeln für den Online-Handel (Warnung vor Kaufabschluss) und für Lebensmittel eingeführt. Die Änderungen gelten seit dem 1. Januar 2025 mit einer dreijährigen Übergangsfrist: Produkte, die bis Ende 2027 mit alten Warnhinweisen hergestellt wurden, dürfen weiter abverkauft werden. Da die Prop-65-Stoffliste (über 900 Stoffe) laufend erweitert wird, sollten Exporteure in die USA ihre Stoffprüfungen und Etiketten-Templates aktualisieren — Prop-65-Abmahnungen privater Kläger sind ein erhebliches wirtschaftliches Risiko.',
    category: 'update',
    countries: ['US'],
    published_at: '2025-01-06T09:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['Proposition 65', 'USA', 'Kalifornien', 'Warnhinweise', 'Chemikalien'],
    link: null,
    source: 'OEHHA'
  },
  {
    title: 'US-EPR-Welle: Verpackungsgesetze in immer mehr Bundesstaaten',
    summary: 'Oregon, Kalifornien, Colorado, Maine, Minnesota, Maryland und Washington haben EPR-Gesetze für Verpackungen verabschiedet — mit unterschiedlichen Zeitplänen und Meldepflichten.',
    content: 'In den USA entsteht ein Flickenteppich bundesstaatlicher EPR-Systeme für Verpackungen: Oregon ist im Juli 2025 als erster Bundesstaat mit Produzentengebühren gestartet (RecyclingModernization Act), Colorado folgt mit Gebühren ab 2026, Kalifornien (SB 54), Maine, Minnesota, Maryland und Washington setzen ihre Programme gestaffelt bis Ende des Jahrzehnts um. Als Producer Responsibility Organization fungiert in mehreren Staaten die Circular Action Alliance (CAA), bei der sich betroffene Hersteller registrieren und Verpackungsdaten melden müssen. Die Definitionen von "Producer", die Materialkategorien und die Öko-Modulation unterscheiden sich je Staat erheblich. Unternehmen mit US-Vertrieb sollten eine zentrale Verpackungsdatenbasis aufbauen — die Datenanforderungen ähneln strukturell denen der EU-PPWR, sodass Synergien genutzt werden können.',
    category: 'update',
    countries: ['US'],
    published_at: '2025-07-01T08:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['USA', 'EPR', 'Verpackung', 'SB 54', 'Circular Action Alliance'],
    link: null,
    source: 'Circular Action Alliance'
  },
  {
    title: 'Kalifornien SB 54: Programm läuft weiter — Registrierung und 2032-Ziele bestätigt',
    summary: 'Trotz Neufassung der Durchführungsverordnung hält Kalifornien an den SB-54-Zielen fest: 100% recyclingfähige oder kompostierbare Verpackungen und 25% Reduktion bis 2032.',
    content: 'Kaliforniens Plastic Pollution Prevention and Packaging Producer Responsibility Act (SB 54) verpflichtet Hersteller, sich der Producer Responsibility Organization (Circular Action Alliance) anzuschließen und Verpackungsdaten zu melden. Die Kernziele bleiben bestehen: Bis 2032 müssen alle erfassten Verpackungen und Foodservice-Artikel recyclingfähig oder kompostierbar sein, die Recyclingquote für Kunststoffverpackungen muss 65% erreichen und Einwegkunststoff-Verpackungen müssen um 25% reduziert werden. Nachdem der Gouverneur den ersten Entwurf der Durchführungsverordnung 2025 zurückgewiesen hatte, hat CalRecycle das Regelungsverfahren neu aufgesetzt — am Zeitplan der gesetzlichen Ziele ändert das nichts. Hersteller sollten Registrierung und Datenmeldungen bei der CAA nicht aufschieben und die Materialkategorien-Liste (Covered Material Categories) gegen ihr Portfolio prüfen.',
    category: 'update',
    countries: ['US'],
    published_at: '2025-09-18T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['SB 54', 'Kalifornien', 'EPR', 'Verpackung', 'CalRecycle'],
    link: null,
    source: 'CalRecycle'
  },
  {
    title: 'Schweiz: Medizinprodukte — Anerkennung außereuropäischer Zulassungen in Vorbereitung',
    summary: 'Die Schweiz bereitet Anpassungen von MepV und IvDV vor, um neben CE-gekennzeichneten künftig auch Produkte mit bestimmten außereuropäischen Zulassungen (insbesondere FDA) zuzulassen.',
    content: 'Als Reaktion auf das ausgelaufene Mutual Recognition Agreement mit der EU und drohende Versorgungsengpässe hat das Schweizer Parlament den Bundesrat beauftragt, neben Medizinprodukten mit CE-Kennzeichnung auch Produkte zuzulassen, die nach außereuropäischen Regulierungssystemen — namentlich dem der US-amerikanischen FDA — zugelassen sind. Die entsprechenden Anpassungen der Medizinprodukteverordnung (MepV) und der Verordnung über In-vitro-Diagnostika (IvDV) werden vorbereitet; Details zu Produktkategorien, Kennzeichnungs- und Überwachungsanforderungen sowie zum Zeitplan werden in der Vernehmlassung konkretisiert. Bis zum Inkrafttreten bleibt die CE-Kennzeichnung samt Schweizer Bevollmächtigtem (CH-REP) der maßgebliche Marktzugangsweg. Hersteller sollten die Vernehmlassungsunterlagen beobachten, da sich daraus neue strategische Optionen für den Schweizer Markt ergeben können.',
    category: 'update',
    countries: ['CH'],
    published_at: '2025-06-18T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Schweiz', 'MepV', 'IvDV', 'Medizinprodukte', 'FDA'],
    link: null,
    source: 'Swissmedic'
  },
  {
    title: 'Schweiz: strengere Energieeffizienzvorschriften für Elektrogeräte',
    summary: 'Die Schweiz zieht ihre Energieeffizienzverordnung regelmäßig mit dem EU-Ökodesign-Recht nach — mit teils eigenen, strengeren Anforderungen für bestimmte Gerätegruppen.',
    content: 'Die Schweiz übernimmt EU-Ökodesign- und Energielabel-Anforderungen regelmäßig in die Energieeffizienzverordnung (EnEV), setzt aber in einzelnen Kategorien eigene Akzente — historisch etwa mit strengeren Mindestanforderungen für Elektromotoren, Haushaltsgeräte und Netzteile. Mit den jüngsten Revisionen werden u.a. die EU-Regelungen zu Smartphones und Tablets (Ökodesign und Energieetikette) sowie aktualisierte Anforderungen für weitere Produktgruppen nachvollzogen. Für Inverkehrbringer bedeutet das: EU-Konformität deckt den Schweizer Markt meist weitgehend ab, die Abweichungen (Geltungstermine, einzelne Grenzwerte, Deklarationspflichten) müssen aber produktgruppenspezifisch geprüft werden. Das Bundesamt für Energie publiziert die jeweils geltenden Anforderungen und Übergangsfristen.',
    category: 'update',
    countries: ['CH'],
    published_at: '2025-01-09T10:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['Schweiz', 'Energieeffizienz', 'Ökodesign', 'EnEV'],
    link: null,
    source: 'Bundesamt für Energie (BFE)'
  },

  // =========================================================================
  // NEU 2026: Normen (deutschsprachig)
  // =========================================================================
  {
    title: 'EN 18031-Normenreihe im EU-Amtsblatt gelistet: Vermutungswirkung für RED-Cybersicherheit',
    summary: 'Die Kommission hat die Normen EN 18031-1/-2/-3 zur Cybersicherheit von Funkanlagen harmonisiert — allerdings mit Einschränkungen, die Hersteller genau prüfen müssen.',
    content: 'Mit der Listung der Normenreihe EN 18031 im Amtsblatt der EU können Hersteller die Konformität mit den Cybersicherheitsanforderungen der Funkanlagenrichtlinie (Artikel 3.3 d/e/f) im Wege der Konformitätsvermutung nachweisen. Wichtig: Die Listung erfolgte mit Restrictions — die Vermutungswirkung gilt nicht, wenn der Hersteller bestimmte normseitig erlaubte Optionen nutzt (etwa wenn der Nutzer Passwörter nicht setzen muss oder bei bestimmten Ausnahmen für Kinder- und Wearable-Geräte). In diesen Fällen ist eine benannte Stelle in die Konformitätsbewertung einzubinden. Hersteller vernetzter Funkanlagen sollten ein Gap-Assessment gegen EN 18031 durchführen und die Restrictions-Analyse dokumentieren, bevor sie die Selbsterklärung wählen.',
    category: 'standard',
    countries: ['EU'],
    published_at: '2025-02-04T09:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['EN 18031', 'RED', 'Cybersicherheit', 'Harmonisierte Normen'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'CEN/CENELEC JTC 24: erste DPP-Normentwürfe in der Kommentierung',
    summary: 'Das Normungsgremium JTC 24 erarbeitet die harmonisierten Normen für das DPP-System — von Identifikatoren über Datenträger bis zu Zugriffsrechten. Erste Entwürfe durchlaufen die öffentliche Kommentierung.',
    content: 'Im Auftrag der Europäischen Kommission (Normungsauftrag M/602) entwickelt das gemeinsame technische Komitee CEN/CLC/JTC 24 die Normenfamilie für das Digital-Product-Passport-System unter der ESPR. Die Arbeitspakete umfassen u.a. eindeutige Identifikatoren für Produkte, Wirtschaftsakteure und Anlagen, Datenträger und deren Anbringung, das Zusammenspiel von dezentraler Datenhaltung und zentralem Register, Interoperabilitäts- und API-Anforderungen sowie rollenbasierte Zugriffsrechte. Erste Normentwürfe (prEN) durchlaufen die öffentliche Umfrage über die nationalen Normungsinstitute (in Deutschland DIN/DKE). Unternehmen, die DPP-Systeme implementieren, sollten die Entwürfe kommentieren und ihre Architektur gegen die sich abzeichnenden Anforderungen spiegeln — die Normen werden über die delegierten Rechtsakte faktisch verbindlich.',
    category: 'standard',
    countries: ['EU'],
    published_at: '2025-11-06T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['DPP', 'JTC 24', 'Normung', 'ESPR', 'Interoperabilität'],
    link: null,
    source: 'CEN/CENELEC'
  },
  {
    title: 'Harmonisierte Normen zur Maschinenverordnung: erste Listungen im Amtsblatt erwartet',
    summary: 'Für die ab 2027 geltende Maschinenverordnung werden die harmonisierten Normen sukzessive neu gelistet. Hersteller sollten den Normenstatus ihrer Typ-C-Normen verfolgen.',
    content: 'Die unter der Maschinenrichtlinie 2006/42/EG gelisteten harmonisierten Normen entfalten keine automatische Vermutungswirkung unter der neuen Maschinenverordnung (EU) 2023/1230 — die Normen werden derzeit überarbeitet (u.a. Anpassung der Anhänge ZA/ZZ) und müssen neu im Amtsblatt gelistet werden. CEN und CENELEC arbeiten die Normenbestände entlang des Normungsauftrags ab; mit den ersten Listungen unter der neuen Verordnung wird im Laufe des Übergangszeitraums gerechnet. Für Hersteller entsteht daraus ein Übergangsrisiko: Wer ab dem 20. Januar 2027 in Verkehr bringt, braucht entweder unter der Verordnung gelistete Normen oder muss die Erfüllung der grundlegenden Anforderungen anderweitig dokumentieren (Risikobeurteilung mit Normbezug als Stand der Technik). Ein Normen-Monitoring je Maschinentyp ist daher Pflicht.',
    category: 'standard',
    countries: ['EU'],
    published_at: '2026-04-15T09:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['Maschinenverordnung', 'Harmonisierte Normen', 'CE-Kennzeichnung'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'EN 4555x-Reihe: Normen zur Reparierbarkeits- und Langlebigkeitsbewertung gewinnen an Bedeutung',
    summary: 'Die horizontale Normenreihe EN 45552 bis EN 45559 zur Material- und Ressourceneffizienz wird zur methodischen Grundlage für Reparierbarkeits-Scores unter ESPR und nationalen Indizes.',
    content: 'Die unter dem Normungsauftrag M/543 entwickelte horizontale Normenreihe zur Materialeffizienz energieverbrauchsrelevanter Produkte — u.a. EN 45552 (Haltbarkeit), EN 45554 (Reparier-, Wiederverwend- und Aufrüstbarkeit), EN 45555 (Recyclingfähigkeit) und EN 45556 (Wiederverwendung von Komponenten) — etabliert sich als methodische Referenz für regulatorische Bewertungen: Sie fließt in produktspezifische Ökodesign-Verordnungen (z.B. Reparierbarkeits-Index für Smartphones und Tablets), in den französischen Haltbarkeitsindex und in die Vorbereitung der ESPR-Rechtsakte ein. Hersteller sollten die Bewertungslogik (Disassembly Depth, Werkzeugklassen, Ersatzteilverfügbarkeit, Informationsbereitstellung) in ihre Designrichtlinien übernehmen — Produkte, die heute entwickelt werden, werden später nach diesen Kriterien gescort.',
    category: 'standard',
    countries: ['EU'],
    published_at: '2024-09-20T10:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['EN 45554', 'Reparierbarkeit', 'Normung', 'Ökodesign'],
    link: null,
    source: 'CEN/CENELEC'
  },

  // =========================================================================
  // NEU 2026: Guidance / Leitfäden (deutschsprachig)
  // =========================================================================
  {
    title: 'Blue Guide: Aktualisierung des EU-Leitfadens für Produktvorschriften in Arbeit',
    summary: 'Die Kommission bereitet eine Aktualisierung des Blue Guide vor, um GPSR, Maschinenverordnung, Cyber Resilience Act und digitale Konformitätsnachweise abzubilden.',
    content: 'Der Blue Guide ist das zentrale Auslegungsdokument der Kommission zum EU-Produktrecht (New Legislative Framework) — die aktuelle Fassung stammt von 2022 und bildet jüngere Rechtsakte wie die GPSR, die Maschinenverordnung, den Cyber Resilience Act, die neue Bauprodukteverordnung und die zunehmende Digitalisierung von Konformitätserklärungen und Betriebsanleitungen noch nicht ab. Eine überarbeitete Fassung ist in Vorbereitung; bis dahin bleiben die Grundsätze der 2022er-Ausgabe (u.a. zu Wirtschaftsakteursrollen, wesentlicher Veränderung, Fulfilment-Dienstleistern und Online-Verkäufen) maßgeblich. Compliance-Teams sollten die Veröffentlichung verfolgen, da der Blue Guide in der Behörden- und Gerichtspraxis als wichtigste Auslegungshilfe dient.',
    category: 'guidance',
    countries: ['EU'],
    published_at: '2025-10-22T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Blue Guide', 'CE-Kennzeichnung', 'NLF', 'Produktrecht'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'EUDR: Kommission aktualisiert FAQ und Leitlinien zur Sorgfaltspflicht',
    summary: 'Die Kommission hat Guidance und FAQ zur Entwaldungsverordnung mehrfach aktualisiert — mit Vereinfachungen u.a. bei der Wiederverwendung von Sorgfaltserklärungen und der Rolle von Bevollmächtigten.',
    content: 'Zur Vorbereitung des EUDR-Geltungsbeginns hat die Europäische Kommission ihr Guidance-Dokument und die FAQ in mehreren Runden aktualisiert. Wichtige Klarstellungen betreffen u.a.: die Wiederverwendung von Referenznummern bereits eingereichter Sorgfaltserklärungen entlang der Lieferkette (Downstream-Vereinfachung), die jährliche statt sendungsbezogene Einreichung für bestimmte Konstellationen, die Pflichten von Bevollmächtigten, die Behandlung von Verbund- und Verpackungsmaterialien sowie Praxisfragen der Geolokalisierung (Polygon-Anforderungen ab 4 Hektar). Die Dokumente sind rechtlich nicht bindend, geben aber die Vollzugslinie der Behörden vor. Unternehmen sollten ihre Due-Diligence-SOPs gegen die jeweils aktuelle FAQ-Version abgleichen — einige frühere Auslegungen wurden substanziell geändert.',
    category: 'guidance',
    countries: ['EU'],
    published_at: '2025-04-17T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['EUDR', 'FAQ', 'Guidance', 'Sorgfaltspflicht'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'ECHA aktualisiert Leitfaden zur SCIP-Datenbank',
    summary: 'ECHA hat Einreichungsleitfäden und Tools für SCIP-Meldungen überarbeitet — mit Vereinfachungen für komplexe Erzeugnisse und referenzierende Meldungen.',
    content: 'Erzeugnisse mit mehr als 0,1 Gewichtsprozent eines SVHC-Kandidatenstoffs müssen vor dem Inverkehrbringen in der SCIP-Datenbank (Substances of Concern In articles as such or in complex objects (Products)) gemeldet werden. ECHA hat die Einreichungsleitfäden, das Dossier-Format und die Validierungsregeln weiterentwickelt: Vereinfachte SCIP-Meldungen (Simplified SCIP Notification) erlauben es nachgelagerten Lieferanten, auf die Meldung des Vorlieferanten zu referenzieren; für komplexe Erzeugnisse wurden Hierarchie- und Kategorisierungsregeln präzisiert. Da die Kandidatenliste halbjährlich wächst, sollten Unternehmen ihren SCIP-Bestand bei jeder Listenaktualisierung prüfen — die Meldung ist neben der Lieferketteninformation nach Artikel 33 REACH eine eigenständige Pflicht, deren Verletzung in mehreren Mitgliedstaaten bußgeldbewehrt ist.',
    category: 'guidance',
    countries: ['EU'],
    published_at: '2024-10-08T09:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['SCIP', 'ECHA', 'SVHC', 'REACH', 'Datenbank'],
    link: null,
    source: 'ECHA'
  },
  {
    title: 'GPSR: Leitlinien der Kommission konkretisieren Pflichten von Online-Marktplätzen',
    summary: 'Neue Auslegungshilfen zur Produktsicherheitsverordnung erläutern die Pflichten von Marktplätzen, Fulfilment-Dienstleistern und die Anforderungen an Rückrufe.',
    content: 'Zur einheitlichen Anwendung der GPSR hat die Kommission Auslegungshilfen veröffentlicht, die zentrale Praxisfragen adressieren: Registrierung von Online-Marktplätzen im Safety-Gate-Portal und Bearbeitungsfristen für Behördenanordnungen (Entfernung gefährlicher Angebote binnen zwei Arbeitstagen), die Abgrenzung der Verantwortlichkeiten zwischen Marktplatz, Händler und Fulfilment-Dienstleister, Mindestinhalte von Rückrufanzeigen (verpflichtende Elemente wie die Überschrift "Produktsicherheitsrückruf" und der Verzicht auf risikoverharmlosende Formulierungen) sowie die direkten Benachrichtigungspflichten gegenüber betroffenen Verbrauchern. Für Wirtschaftsakteure besonders relevant sind die Hinweise zur Abhilfe: Verbrauchern stehen bei Rückrufen mindestens zwei Optionen aus Reparatur, Ersatz oder Erstattung zu.',
    category: 'guidance',
    countries: ['EU'],
    published_at: '2025-03-06T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['GPSR', 'Online-Marktplätze', 'Rückrufe', 'Guidance'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // NEU 2026: Konsultationen (deutschsprachig)
  // =========================================================================
  {
    title: 'Konsultation: delegierter ESPR-Rechtsakt für Eisen und Stahl',
    summary: 'Die Kommission sammelt Stellungnahmen zur Vorbereitung der Ökodesign- und DPP-Anforderungen für Eisen- und Stahlerzeugnisse — der zweiten priorisierten Produktgruppe des ESPR-Arbeitsplans.',
    content: 'Im Rahmen der Vorbereitung des delegierten Rechtsakts für Eisen und Stahl unter der ESPR führt die Kommission Konsultationen und eine Vorstudie durch. Im Fokus stehen Anforderungen an die Offenlegung des CO2-Fußabdrucks je Tonne Stahl, Rezyklatanteile (Schrotteinsatz), Datenanforderungen für den digitalen Produktpass auf Ebene von Zwischenprodukten (Coils, Bleche, Profile) und das Zusammenspiel mit CBAM-Berichtspflichten. Für die nachgelagerte Industrie (Automobil, Bau, Maschinenbau) ist relevant, dass DPP-Daten der Vorprodukte künftig in eigene Produktpässe übernommen werden müssen. Stahlhersteller, Service-Center und Verarbeiter sollten sich über ihre Verbände in die Konsultation einbringen.',
    category: 'consultation',
    countries: ['EU'],
    published_at: '2026-01-22T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['ESPR', 'Stahl', 'Konsultation', 'DPP', 'CO2-Fußabdruck'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Konsultation zur Überarbeitung der WEEE-Richtlinie gestartet',
    summary: 'Die Kommission evaluiert die Elektroaltgeräte-Richtlinie und sammelt Stellungnahmen — diskutiert werden u.a. realistische Sammelquoten, Vorgaben gegen Batteriebrände und eine mögliche Verordnungslösung.',
    content: 'Die Europäische Kommission hat die Evaluierung und mögliche Überarbeitung der WEEE-Richtlinie 2012/19/EU eingeleitet und dazu Stellungnahmen eingeholt. Hintergrund: Die meisten Mitgliedstaaten verfehlen die Sammelquote von 65 Prozent deutlich, die Berechnungsmethodik gilt als reformbedürftig, und neue Herausforderungen wie Brände durch Lithium-Batterien in Sammel- und Sortieranlagen, der Umgang mit Photovoltaik-Modulen, E-Zigaretten und Kleinst-Elektronik aus dem Direktimport sind nicht adäquat adressiert. Diskutiert werden auch eine stärkere Harmonisierung der Herstellerregistrierung (heute 27 nationale Register) und die Umwandlung in eine Verordnung. Ein Gesetzgebungsvorschlag wird im Anschluss an die Evaluierung erwartet; Hersteller sollten die Entwicklung in ihre Mittelfristplanung aufnehmen.',
    category: 'consultation',
    countries: ['EU'],
    published_at: '2025-06-26T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['WEEE', 'Konsultation', 'Elektroaltgeräte', 'Sammelquote'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Konsultation: Durchführungsbestimmungen zur PPWR-Recyclingfähigkeit',
    summary: 'Die Kommission konsultiert zu den delegierten Rechtsakten, die die Design-for-Recycling-Kriterien und Bewertungsstufen der PPWR konkretisieren — Grundlage der Gebühren-Modulation ab 2030.',
    content: 'Zur Operationalisierung der PPWR-Recyclingfähigkeitsanforderungen erarbeitet die Kommission delegierte Rechtsakte, die für jede Verpackungskategorie Design-for-Recycling-Kriterien und die Einstufung in die Leistungsklassen A, B und C festlegen. Die Konsultationen richten sich an Verpackungshersteller, Inverkehrbringer, Recycler und EPR-Systeme. Strittige Punkte sind u.a. die Bewertungsmethodik (Gewichtung von Materialkombinationen, Farben, Barrieren, Etiketten), die Behandlung von Innovationen ohne etablierten Recyclingstrom und der Nachweis der "At-Scale"-Recyclingfähigkeit ab 2035. Da die Einstufung ab 2030 über Marktzugang und ab 2028 über die Öko-Modulation der EPR-Gebühren entscheidet, sollten Verpackungsverantwortliche die Kriterienentwürfe gegen ihr Portfolio testen und Stellungnahmen einreichen.',
    category: 'consultation',
    countries: ['EU'],
    published_at: '2026-03-19T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['PPWR', 'Recyclingfähigkeit', 'Konsultation', 'Design for Recycling'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // NEU 2026: Recalls / Safety Gate (generisch, deutschsprachig)
  // =========================================================================
  {
    title: 'Safety Gate Jahresbericht 2024: Rekordwert von über 4.000 Meldungen — Kosmetik vorn',
    summary: 'Das EU-Schnellwarnsystem verzeichnete 2024 so viele Meldungen wie nie zuvor. Kosmetika waren erstmals die am häufigsten gemeldete Produktkategorie, gefolgt von Spielzeug und Elektrogeräten.',
    content: 'Der Jahresbericht zum EU-Schnellwarnsystem Safety Gate weist für 2024 mit über 4.100 Warnmeldungen einen Höchststand aus. Häufigste Produktkategorien waren Kosmetika (insbesondere wegen des in der EU verbotenen Duftstoffs BMHCA/Lilial), Spielzeug und Elektrogeräte; das häufigste gemeldete Risiko waren gefährliche chemische Inhaltsstoffe. Ein erheblicher Teil der beanstandeten Produkte stammte aus Drittstaaten und wurde über Online-Kanäle vertrieben. Für Unternehmen unterstreicht der Bericht zwei Trends: Erstens prüfen Behörden verstärkt chemische Compliance (REACH, Kosmetik-Verordnung, Spielzeugrichtlinie), zweitens rücken Marktplatz-Angebote in den Fokus, für die seit der GPSR erweiterte Kooperationspflichten gelten. Importeure sollten Lieferantenprüfungen und Prüfberichte systematisch dokumentieren.',
    category: 'recall',
    countries: ['EU'],
    published_at: '2025-04-23T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Safety Gate', 'Jahresbericht', 'Rückrufe', 'Kosmetik', 'Marktüberwachung'],
    link: 'https://ec.europa.eu/safety-gate-alerts/screen/webReport',
    source: 'Europäische Kommission'
  },
  {
    title: 'Safety Gate: Produkte aus Online-Direktimporten dominieren die Warnmeldungen',
    summary: 'Ein wachsender Anteil der Safety-Gate-Meldungen betrifft Billigprodukte, die Verbraucher direkt aus Drittstaaten bestellen — die EU reagiert mit Zollreform und verschärfter Plattform-Aufsicht.',
    content: 'Die Auswertungen der Marktüberwachungsbehörden zeigen ein strukturelles Muster: Ein erheblicher und wachsender Anteil der gemeldeten gefährlichen Produkte — von Elektrokleingeräten über Spielzeug bis Modeschmuck — gelangt über Direktbestellungen bei Drittstaaten-Plattformen in die EU, vorbei an Importeuren, die Konformität sicherstellen müssten. Typische Mängel sind fehlende oder gefälschte CE-Kennzeichnung, fehlende verantwortliche Person nach GPSR, chemische Grenzwertüberschreitungen und elektrische Sicherheitsmängel. Die EU reagiert mehrgleisig: Durchsetzung der GPSR- und DSA-Pflichten gegenüber Plattformen, geplante Abschaffung der 150-Euro-Zollfreigrenze und koordinierte Testkauf-Aktionen ("Sweeps"). Für regelkonforme Anbieter ist die konsequente Durchsetzung wettbewerblich vorteilhaft — sie sollten Verstöße von Mitbewerbern aktiv an Behörden und Plattformen melden.',
    category: 'recall',
    countries: ['EU'],
    published_at: '2025-12-10T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Safety Gate', 'Online-Handel', 'Direktimporte', 'Produktsicherheit'],
    link: null,
    source: 'Europäische Kommission'
  },

  // =========================================================================
  // NEU 2026: Warnungen (deutschsprachig)
  // =========================================================================
  {
    title: 'Marktüberwachung warnt: fehlende EU-Verantwortliche und gefälschte CE-Zeichen bei Direktimporten',
    summary: 'Behörden mehrerer Mitgliedstaaten melden hohe Beanstandungsquoten bei Produkten ohne benannten EU-Wirtschaftsakteur. Händler haften, wenn sie solche Ware weitervertreiben.',
    content: 'Koordinierte Kontrollaktionen der Marktüberwachung zeigen wiederkehrende Verstöße bei importierter Ware: kein in der EU niedergelassener Wirtschaftsakteur gemäß Marktüberwachungsverordnung (EU) 2019/1020 bzw. keine verantwortliche Person nach GPSR, formal falsche oder gefälschte CE-Kennzeichnungen, fehlende deutschsprachige Anleitungen und Warnhinweise sowie nicht verfügbare technische Unterlagen. Für Händler und Fulfilment-Dienstleister ist das ein unmittelbares Risiko: Wer betroffene Produkte lagert oder weitervertreibt, kann selbst Adressat von Vertriebsverboten und Bußgeldern werden. Empfohlen wird ein Wareneingangs-Check (CE-Kennzeichnung, EU-Akteur auf Produkt/Verpackung, Sprachfassungen) und die vertragliche Absicherung gegenüber Lieferanten inklusive Dokumentationspflichten.',
    category: 'warning',
    countries: ['EU', 'DE'],
    published_at: '2025-08-07T09:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['Marktüberwachung', 'CE-Kennzeichnung', 'Direktimporte', 'GPSR'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'ECHA-Durchsetzungsprojekt: hohe Beanstandungsquote bei Online-Verkäufen von Chemieprodukten',
    summary: 'Ein EU-weites Kontrollprojekt des ECHA-Enforcement-Forums fand bei einem Großteil geprüfter Online-Angebote Verstöße gegen REACH-Beschränkungen und CLP-Pflichten.',
    content: 'Das Enforcement Forum der ECHA koordiniert regelmäßig EU-weite Kontrollprojekte (REF-Projekte) der nationalen Behörden. Die jüngsten Projekte mit Fokus auf den Internethandel ergaben außerordentlich hohe Beanstandungsquoten: Ein Großteil der geprüften Online-Angebote verstieß gegen REACH-Beschränkungen (Anhang XVII) oder gegen die CLP-Pflicht, Gefahrenhinweise bereits im Angebot anzugeben. Häufig betroffen waren Verbraucherprodukte wie Kleber, Reinigungsmittel und Erzeugnisse mit beschränkten Stoffen (z.B. Cadmium und Blei in Schmuck, Phthalate in Weich-PVC). Mit der CLP-Novelle werden die Anforderungen an Online-Angebote nochmals verschärft. Anbieter sollten Produktdatenblätter, Angebotstexte und Stoffprüfungen für ihr Online-Sortiment systematisch qualitätssichern.',
    category: 'warning',
    countries: ['EU'],
    published_at: '2025-02-26T10:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['ECHA', 'Durchsetzung', 'REACH', 'CLP', 'Online-Handel'],
    link: null,
    source: 'ECHA'
  },

  // =========================================================================
  // NEU 2026: Querschnitt EU (deutschsprachig)
  // =========================================================================
  {
    title: 'Omnibus-Paket: "Stop-the-Clock" verschiebt CSRD- und CSDDD-Pflichten',
    summary: 'Mit der Richtlinie (EU) 2025/794 wurden die CSRD-Berichtspflichten der zweiten und dritten Welle um zwei Jahre und die CSDDD-Anwendung auf 2028 verschoben. Parallel werden die Inhalte entschärft.',
    content: 'Als erster Teil des Omnibus-Vereinfachungspakets wurde die "Stop-the-Clock"-Richtlinie (EU) 2025/794 im April 2025 verabschiedet: Große Unternehmen der zweiten CSRD-Welle berichten erstmals für das Geschäftsjahr 2027 (statt 2025), börsennotierte KMU der dritten Welle für 2028 (statt 2026). Bei der CSDDD wurde die Umsetzungsfrist der Mitgliedstaaten auf Juli 2027 und die erste Anwendungswelle auf 2028 verschoben. Parallel verhandeln Parlament und Rat über die inhaltlichen Änderungen des Omnibus-I-Pakets, u.a. deutlich höhere Schwellenwerte für die CSRD-Berichtspflicht, gekürzte ESRS-Datenpunkte und die Beschränkung der CSDDD-Sorgfaltspflichten auf direkte Geschäftspartner. Unternehmen sollten ihre Berichtsprojekte neu takten, die Datenerhebung aber nicht stoppen — Wertschöpfungsketten-Anfragen großer Kunden und Banken bleiben bestehen.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-04-14T08:00:00Z',
    effective_date: null,
    priority: 'high',
    tags: ['Omnibus', 'CSRD', 'CSDDD', 'Stop-the-Clock', 'Berichtspflichten'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32025L0794',
    source: 'Europäische Kommission'
  },
  {
    title: 'Recht auf Reparatur: Richtlinie muss bis 31. Juli 2026 umgesetzt werden',
    summary: 'Die Right-to-Repair-Richtlinie (EU) 2024/1799 verpflichtet Hersteller bestimmter Produkte zur Reparatur auch nach Ablauf der Gewährleistung. Die Mitgliedstaaten müssen sie bis Ende Juli 2026 in nationales Recht umsetzen.',
    content: 'Die Richtlinie (EU) 2024/1799 über die Förderung der Reparatur von Waren führt einen Reparaturanspruch des Verbrauchers gegen den Hersteller ein: Für Produkte, für die EU-Recht Reparierbarkeitsanforderungen vorsieht (u.a. Waschmaschinen, Geschirrspüler, Kühlgeräte, Staubsauger, Smartphones, Tablets, Server, Schweißgeräte und künftig Batterien leichter Verkehrsmittel), müssen Hersteller auf Verlangen auch außerhalb der Gewährleistung zu einem angemessenen Preis reparieren. Flankierend: Verlängerung der Gewährleistung um zwölf Monate nach einer Reparatur im Gewährleistungsfall, ein europäisches Reparaturinformationsformular sowie eine Online-Plattform zur Reparatursuche. Die Mitgliedstaaten müssen die Richtlinie bis zum 31. Juli 2026 umsetzen. Hersteller sollten Ersatzteillogistik, Reparaturpreislisten und Serviceprozesse auf den neuen Anspruch vorbereiten.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-09-03T09:00:00Z',
    effective_date: '2026-07-31',
    priority: 'medium',
    tags: ['Recht auf Reparatur', 'Reparatur', 'Verbraucherschutz', 'Umsetzungsfrist'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024L1799',
    source: 'Europäische Kommission'
  },
  {
    title: 'Ökodesign für Smartphones und Tablets: Anforderungen und neues Energielabel seit 20. Juni 2025',
    summary: 'Seit dem 20. Juni 2025 gelten für Smartphones und Tablets in der EU Ökodesign-Anforderungen (Ersatzteile, Updates, Robustheit) und ein Energielabel mit Reparierbarkeitsklasse.',
    content: 'Mit den Verordnungen (EU) 2023/1670 (Ökodesign) und (EU) 2023/1669 (Energieverbrauchskennzeichnung) gelten seit dem 20. Juni 2025 verbindliche Anforderungen für Smartphones, Mobiltelefone, Schnurlostelefone und Tablets: Ersatzteilverfügbarkeit (u.a. Akkus, Displays) für sieben Jahre nach Verkaufsende mit Lieferfristen von 5-10 Arbeitstagen, Betriebssystem-Updates für mindestens fünf Jahre nach Verkaufsende, Mindestanforderungen an Sturz- und Kratzfestigkeit, Staub- und Wasserschutz sowie Akku-Lebensdauer (800 Ladezyklen mit mindestens 80% Restkapazität). Das neue Energielabel zeigt neben der Effizienzklasse auch Akkulaufzeit, Robustheitsangaben und erstmals eine Reparierbarkeitsklasse (A-E); die Produkte müssen in der EPREL-Datenbank registriert werden. Die Regelung gilt als Blaupause für künftige ESPR-Produktanforderungen.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-06-20T08:00:00Z',
    effective_date: '2025-06-20',
    priority: 'high',
    tags: ['Ökodesign', 'Smartphones', 'Energielabel', 'Reparierbarkeit', 'EPREL'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32023R1670',
    source: 'Europäische Kommission'
  },
  {
    title: 'Neue Bauprodukteverordnung: digitaler Produktpass für Bauprodukte kommt',
    summary: 'Die Bauprodukteverordnung (EU) 2024/3110 ist in Kraft. Sie modernisiert die Leistungserklärung, führt digitale Produktinformationen ein und verzahnt Bauprodukte mit dem DPP-System der ESPR.',
    content: 'Die neue Bauprodukteverordnung (EU) 2024/3110 ersetzt schrittweise die Verordnung (EU) Nr. 305/2011. Kernelemente: kombinierte Leistungs- und Konformitätserklärung, verpflichtende Umweltangaben (insbesondere das Treibhauspotenzial über den Lebenszyklus, gestaffelt nach Inkrafttreten der jeweiligen harmonisierten technischen Spezifikationen), Pflichten für den Online-Handel und Marktplätze sowie die Grundlage für einen digitalen Bauprodukte-Produktpass, der mit dem ESPR-DPP-System interoperabel sein soll. Die Anwendung erfolgt gestaffelt über mehrere Jahre, da die harmonisierten Normen und Durchführungsrechtsakte je Produktfamilie erst erarbeitet werden; bestehende harmonisierte Normen unter der alten BauPVO gelten übergangsweise fort. Hersteller von Bauprodukten sollten ihre Umweltproduktdeklarationen (EPDs) auf die kommenden Pflichtangaben ausrichten.',
    category: 'regulation',
    countries: ['EU'],
    published_at: '2025-01-07T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Bauprodukteverordnung', 'CPR', 'DPP', 'Leistungserklärung', 'EPD'],
    link: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R3110',
    source: 'Europäische Kommission'
  },
  {
    title: 'F-Gas: nächste Verbotsstufe 2026 — SF6-freie Schaltanlagen',
    summary: 'Ab 2026 dürfen neue Mittelspannungs-Schaltanlagen bis 24 kV kein SF6 und keine anderen F-Gase mehr verwenden — weitere Spannungsebenen folgen gestaffelt.',
    content: 'Die F-Gas-Verordnung (EU) 2024/573 setzt ihren Stufenplan fort: Ab dem 1. Januar 2026 dürfen neue Mittelspannungs-Schaltanlagen bis 24 kV nur noch ohne fluorierte Treibhausgase (insbesondere SF6) in Verkehr gebracht werden, sofern technisch verfügbare Alternativen bestehen; Anlagen bis 52 kV folgen 2030, Hochspannungsebenen gestaffelt bis 2032. SF6 ist mit einem Treibhauspotenzial von rund 24.000 das klimaschädlichste regulierte Industriegas. Für Schaltanlagenhersteller und Netzbetreiber bedeutet das eine beschleunigte Umstellung auf Vakuum- und Clean-Air-Technologien; im Servicegeschäft gelten verschärfte Zertifizierungs- und Dichtheitsprüfpflichten. Parallel sinken die HFC-Quoten für Kältemittel weiter, was Preise und Verfügbarkeit gängiger Kältemittel beeinflusst.',
    category: 'deadline',
    countries: ['EU'],
    published_at: '2025-11-05T10:00:00Z',
    effective_date: '2026-01-01',
    priority: 'low',
    tags: ['F-Gas', 'SF6', 'Schaltanlagen', 'Klimaschutz'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'EU-Zollreform: Abschaffung der 150-Euro-Freigrenze geplant',
    summary: 'Die geplante EU-Zollreform soll die Zollfreigrenze für Sendungen unter 150 Euro abschaffen und Plattformen als fiktive Importeure in die Pflicht nehmen — mit Folgen für Produkt-Compliance im E-Commerce.',
    content: 'Die EU verhandelt über die umfassendste Zollreform seit Jahrzehnten: Kernelemente sind die Abschaffung der 150-Euro-Zollfreigrenze, eine zentrale EU-Zolldatenplattform und die Behandlung von Online-Plattformen als "deemed importer", die Zölle, Einfuhrumsatzsteuer und Produktkonformität für Drittstaaten-Verkäufe verantworten. Hintergrund sind Milliarden von Kleinsendungen pro Jahr, die mehrheitlich aus China stammen und bei denen Produktsicherheits- und Umweltvorschriften massenhaft umgangen werden. Bis zum Inkrafttreten (im Gespräch sind gestaffelte Termine in der zweiten Hälfte der 2020er Jahre) setzen Kommission und Mitgliedstaaten auf verschärfte Kontrollen und die Pflichten aus GPSR und DSA. EU-Händler sollten die Reform verfolgen — sie verändert die Wettbewerbsbedingungen gegenüber Direktimporten grundlegend.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-05-14T09:00:00Z',
    effective_date: null,
    priority: 'medium',
    tags: ['Zollreform', 'E-Commerce', 'Direktimporte', '150-Euro-Grenze'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Green Claims: Zukunft der Richtlinie offen — Werbeaussagen trotzdem absichern',
    summary: 'Die Verhandlungen über die Green-Claims-Richtlinie sind ins Stocken geraten. Unabhängig davon verbietet die bereits beschlossene Empowering-Consumers-Richtlinie ab September 2026 pauschale Umweltaussagen.',
    content: 'Nachdem die Kommission im Sommer 2025 zwischenzeitlich die Rücknahme des Green-Claims-Vorschlags in den Raum gestellt hatte, ist der weitere Fortgang der Richtlinie über die Substanziierung expliziter Umweltaussagen offen. Für Unternehmen wäre es jedoch ein Fehler, daraus Entwarnung abzuleiten: Die bereits verabschiedete Empowering-Consumers-Richtlinie (EU) 2024/825 gilt ab dem 27. September 2026 und verbietet u.a. pauschale Umweltaussagen ohne anerkannte Umweltzeichen ("umweltfreundlich", "grün", "klimaneutral"), Aussagen auf Basis von Emissions-Kompensation sowie Nachhaltigkeitssiegel ohne zertifiziertes System. Werbeaussagen sollten daher schon jetzt evidenzbasiert, produktbezogen und spezifisch formuliert werden — nationale Gerichte und Wettbewerbsbehörden gehen bereits heute auf Basis des UWG gegen Greenwashing vor.',
    category: 'update',
    countries: ['EU'],
    published_at: '2025-07-04T10:00:00Z',
    effective_date: '2026-09-27',
    priority: 'medium',
    tags: ['Green Claims', 'Greenwashing', 'Werbung', 'Empowering Consumers'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'Altfahrzeug-Verordnung: Verhandlungen über Rezyklat-Quoten für Kunststoffe',
    summary: 'Parlament und Rat verhandeln die neue Altfahrzeug-Verordnung — mit verbindlichen Rezyklatanteilen in Neufahrzeugen und einem Kreislaufwirtschafts-Pass für Fahrzeuge.',
    content: 'Die vorgeschlagene Verordnung über Kreislaufwirtschaftsanforderungen an die Fahrzeugkonstruktion und das Altfahrzeug-Management (Ablösung der Altfahrzeug-Richtlinie 2000/53/EG) befindet sich im Gesetzgebungsverfahren. Diskutierte Kernelemente: ein verbindlicher Rezyklatanteil für Kunststoffe in neuen Fahrzeugen (im Gespräch sind Größenordnungen um 20-25% mit Teilquoten aus Altfahrzeug-Recycling), Demontagefreundlichkeit für Batterien und E-Motoren, ein digitales Kreislaufwirtschafts-Dossier je Fahrzeug (Circularity Vehicle Passport) und erweiterte Herstellerverantwortung für die Altfahrzeugbehandlung. Für Zulieferer entstehen daraus neue Material-Deklarations- und Rezyklat-Nachweispflichten entlang der Lieferkette. Der finale Text und die Übergangsfristen stehen noch aus; mit der Anwendung ist erst gegen Ende des Jahrzehnts zu rechnen.',
    category: 'update',
    countries: ['EU'],
    published_at: '2026-05-12T09:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['Altfahrzeuge', 'ELV', 'Rezyklat', 'Automotive', 'Kreislaufwirtschaft'],
    link: null,
    source: 'Europäische Kommission'
  },
  {
    title: 'EPREL: Kommission verschärft Kontrolle der Produktdatenbank-Einträge',
    summary: 'Die Kommission und nationale Behörden prüfen EPREL-Registrierungen verstärkt auf Vollständigkeit und Plausibilität — fehlerhafte Einträge führen zu Beanstandungen im Online-Handel.',
    content: 'Alle Produkte mit EU-Energielabel müssen vor dem Inverkehrbringen in der europäischen Produktdatenbank EPREL registriert werden; Händler dürfen nur registrierte Produkte anbieten und müssen Label und Produktdatenblatt auch online korrekt darstellen. Kommission und Marktüberwachungsbehörden haben die Qualitätskontrollen ausgeweitet: geprüft werden Plausibilität der deklarierten Verbrauchswerte, Vollständigkeit der technischen Dokumentation und die Verifizierung der Lieferanten-Identität (u.a. mittels qualifizierter elektronischer Siegel). Im Online-Handel werden Angebote ohne korrekt eingebundenes Label (Pfeil-Symbol mit Effizienzklasse und Link zum Datenblatt) zunehmend abgemahnt bzw. behördlich beanstandet. Lieferanten sollten EPREL-Einträge bei jeder Modellpflege aktualisieren und Händlern die Label-Assets strukturiert bereitstellen.',
    category: 'update',
    countries: ['EU'],
    published_at: '2024-08-21T10:00:00Z',
    effective_date: null,
    priority: 'low',
    tags: ['EPREL', 'Energielabel', 'Online-Handel', 'Marktüberwachung'],
    link: null,
    source: 'Europäische Kommission'
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function printCategoryDistribution(items) {
  const dist = {};
  for (const item of items) {
    dist[item.category] = (dist[item.category] || 0) + 1;
  }
  console.log('  Category distribution:');
  for (const [cat, count] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat.padEnd(14)} ${count}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Seed News Items - Supabase REST API');
  console.log('='.repeat(60));
  console.log(`  Supabase URL : ${SUPABASE_URL}`);
  console.log(`  News items   : ${NEWS_ITEMS.length}`);
  console.log(`  Batch size   : ${BATCH_SIZE}`);
  console.log(`  Mode         : ${RESET ? 'RESET (delete all, then insert)' : 'UPSERT (merge on title)'}`);
  printCategoryDistribution(NEWS_ITEMS);
  console.log('');

  // Guard against accidental duplicate titles within the seed data itself
  // (title is the UPSERT conflict key).
  const seen = new Set();
  const dupes = NEWS_ITEMS.map(i => i.title).filter(t => {
    if (seen.has(t)) return true;
    seen.add(t);
    return false;
  });
  if (dupes.length > 0) {
    console.error('ERROR: Duplicate titles in NEWS_ITEMS:\n  - ' + dupes.join('\n  - '));
    process.exit(1);
  }

  // Optional reset: only delete existing rows when --reset is passed.
  if (RESET) {
    console.log('[1/3] --reset: deleting existing news_items ...');
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
  } else {
    console.log('[1/3] Skipping delete (UPSERT mode; use --reset for a clean slate).\n');
  }

  // Upsert in batches (merge on title; requires UNIQUE index on title,
  // see migration 20260612d_news_items_extend.sql).
  console.log(`[2/3] Upserting ${NEWS_ITEMS.length} news items in batches of ${BATCH_SIZE} ...`);

  let upsertedCount = 0;
  const totalBatches = Math.ceil(NEWS_ITEMS.length / BATCH_SIZE);

  for (let i = 0; i < NEWS_ITEMS.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = NEWS_ITEMS.slice(i, i + BATCH_SIZE);

    try {
      await supabaseRequest('news_items?on_conflict=title', {
        method: 'POST',
        body: JSON.stringify(batch),
        headers: {
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
      });
      upsertedCount += batch.length;
      console.log(`       Batch ${batchNum}/${totalBatches} - upserted ${batch.length} row(s)  (total: ${upsertedCount})`);
    } catch (err) {
      console.error(`       Batch ${batchNum}/${totalBatches} FAILED: ${err.message}`);
      if (/42P10|no unique|ON CONFLICT/i.test(err.message)) {
        console.error('       Hint: apply migration 20260612d_news_items_extend.sql first');
        console.error('       (node scripts/db-migrate.mjs) - it creates the UNIQUE index on title.');
      }
      console.error(`       Rows ${i + 1}..${i + batch.length} were NOT upserted.`);
    }
  }

  // Verify
  console.log('\n[3/3] Verifying ...');
  try {
    const allRows = await supabaseRequest('news_items?select=category');
    if (Array.isArray(allRows)) {
      console.log(`  Rows in news_items: ${allRows.length}`);
      printCategoryDistribution(allRows);
    } else {
      console.log('  Rows in news_items: (unknown)');
    }
  } catch {
    console.log('  (could not verify row count)');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log(
    upsertedCount === NEWS_ITEMS.length
      ? `  Done - ${upsertedCount} news item(s) upserted successfully.`
      : `  Done - ${upsertedCount}/${NEWS_ITEMS.length} news item(s) upserted (some batches failed).`
  );
  console.log('='.repeat(60));

  if (upsertedCount < NEWS_ITEMS.length) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
