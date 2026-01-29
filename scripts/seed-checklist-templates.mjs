/**
 * Seed Checklist Templates via Supabase REST API
 *
 * This script deletes all existing checklist_templates and re-inserts
 * them from either an SQL file, a JSON file, or the embedded sample data.
 *
 * Usage:
 *   node scripts/seed-checklist-templates.mjs
 *   node scripts/seed-checklist-templates.mjs --json path/to/templates.json
 *   node scripts/seed-checklist-templates.mjs --sql  path/to/seed.sql
 *
 * Environment variables (read from .env in project root if present):
 *   SUPABASE_URL               – e.g. https://xyzabc.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  – service-role secret (NOT the anon key)
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

/** Minimal .env parser – supports KEY=VALUE and KEY="VALUE" lines. */
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
    // Strip surrounding quotes
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
// Supabase REST helpers
// ---------------------------------------------------------------------------

/**
 * Execute a request against the Supabase PostgREST API.
 *
 * @param {string} path     – table / RPC path (e.g. "checklist_templates")
 * @param {object} options  – fetch options (method, body, headers, …)
 * @returns {Promise<any>}
 */
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
// Embedded sample dataset (5 items)
// ---------------------------------------------------------------------------

const SAMPLE_TEMPLATES = [
  {
    country_code: 'DE',
    category_key: 'electronics',
    title: 'CE-Kennzeichnung',
    description: 'Pruefen Sie, ob das CE-Zeichen korrekt angebracht ist.',
    detailed_description:
      'Die CE-Kennzeichnung bestaetigt die Konformitaet des Produkts mit den geltenden ' +
      'EU-Richtlinien. Sie muss sichtbar, lesbar und dauerhaft auf dem Produkt oder ' +
      'seinem Typenschild angebracht sein. Die Mindesthoehe betraegt 5 mm.',
    mandatory: true,
    category: 'Sicherheit & CE-Konformitaet',
    subcategory: 'Produktkennzeichnung',
    priority: 'critical',
    document_required: true,
    document_types: ['CE-Konformitaetserklaerung', 'Pruefbericht'],
    legal_basis: 'EU-Verordnung 765/2008',
    authority: 'Marktaufsichtsbehoerde',
    deadline: 'Vor dem Inverkehrbringen',
    penalties: 'Vertriebsverbot, Bussgeld bis 100.000 EUR',
    tips: [
      'CE-Zeichen muss mindestens 5 mm hoch sein',
      'Konformitaetserklaerung 10 Jahre aufbewahren',
      'Alle anwendbaren Richtlinien pruefen'
    ],
    links: [
      { label: 'EU CE-Marking Guide', url: 'https://ec.europa.eu/growth/single-market/ce-marking_en' },
      { label: 'Marktaufsicht DE', url: 'https://www.baua.de/DE/Themen/Anwendungssichere-Chemikalien-und-Produkte/Produktsicherheit/Marktueberwachung/marktueberwachung_node.html' }
    ],
    applicable_products: ['Elektronik', 'Maschinen', 'Spielzeug', 'Baumaterialien'],
    sort_order: 1,
  },
  {
    country_code: 'DE',
    category_key: 'electronics',
    title: 'WEEE-Registrierung',
    description: 'Registrierung bei der Stiftung EAR fuer Elektro-Altgeraete.',
    detailed_description:
      'Hersteller und Importeure von Elektrogeraeten muessen sich bei der Stiftung ' +
      'Elektro-Altgeraete Register (EAR) registrieren, bevor sie Produkte in Deutschland ' +
      'in Verkehr bringen. Die Registrierung umfasst die Angabe der Geraeteart, ' +
      'Marke und geplanter Absatzmenge.',
    mandatory: true,
    category: 'Recycling & Entsorgung',
    subcategory: 'Elektroaltgeraete',
    priority: 'critical',
    document_required: true,
    document_types: ['WEEE-Registrierungsnummer', 'EAR-Nachweis'],
    legal_basis: 'ElektroG (Elektro- und Elektronikgeraetegesetz)',
    authority: 'Stiftung EAR',
    deadline: 'Vor dem Inverkehrbringen',
    penalties: 'Vertriebsverbot, Bussgeld bis 100.000 EUR',
    tips: [
      'Registrierung online unter ear-system.de',
      'Jaehrliche Mengenmeldung nicht vergessen',
      'Garantiestellung erforderlich'
    ],
    links: [
      { label: 'Stiftung EAR', url: 'https://www.stiftung-ear.de/' },
      { label: 'ElektroG Volltext', url: 'https://www.gesetze-im-internet.de/elektrog_2015/' }
    ],
    applicable_products: ['Elektronik'],
    sort_order: 2,
  },
  {
    country_code: 'DE',
    category_key: 'textiles',
    title: 'Textilkennzeichnung',
    description: 'Materialzusammensetzung nach EU-Verordnung angeben.',
    detailed_description:
      'Textilerzeugnisse muessen mit der vollstaendigen Faserzusammensetzung ' +
      'in der Amtssprache des Mitgliedstaats gekennzeichnet sein. Die Angaben ' +
      'muessen dauerhaft, leicht lesbar, sichtbar und zugaenglich sein.',
    mandatory: true,
    category: 'Kennzeichnung',
    subcategory: 'Materialangaben',
    priority: 'high',
    document_required: false,
    document_types: null,
    legal_basis: 'EU-Verordnung Nr. 1007/2011 (Textilkennzeichnungsverordnung)',
    authority: 'Gewerbeaufsicht',
    deadline: 'Vor dem Inverkehrbringen',
    penalties: 'Bussgeld bis 50.000 EUR',
    tips: [
      'Faserbezeichnungen gemaess EU-Verordnung verwenden',
      'Prozentangaben in absteigender Reihenfolge',
      'Kennzeichnung muss dauerhaft befestigt sein'
    ],
    links: [
      { label: 'EU Textilkennzeichnung', url: 'https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32011R1007' }
    ],
    applicable_products: ['Textilien'],
    sort_order: 1,
  },
  {
    country_code: 'FR',
    category_key: 'electronics',
    title: 'Indice de reparabilite (Reparierbarkeitsindex)',
    description: 'Reparierbarkeitsindex berechnen und am Produkt anzeigen.',
    detailed_description:
      'Seit dem 1. Januar 2021 muessen bestimmte Elektronikprodukte in Frankreich ' +
      'mit einem Reparierbarkeitsindex versehen werden. Der Index bewertet auf einer ' +
      'Skala von 0-10, wie gut ein Produkt repariert werden kann, basierend auf Kriterien ' +
      'wie Verfuegbarkeit von Dokumentation, Ersatzteilen und Zerlegbarkeit.',
    mandatory: true,
    category: 'Kennzeichnung',
    subcategory: 'Reparierbarkeit',
    priority: 'critical',
    document_required: true,
    document_types: ['Reparierbarkeitsindex-Berechnung', 'Technische Dokumentation'],
    legal_basis: 'Loi anti-gaspillage (AGEC), Art. 16-I',
    authority: 'ADEME / DGCCRF',
    deadline: 'Vor dem Inverkehrbringen in Frankreich',
    penalties: 'Bussgeld bis 15.000 EUR (natuerliche Personen) / 75.000 EUR (juristische Personen)',
    tips: [
      'Gilt fuer Smartphones, Laptops, TV, Waschmaschinen, Rasenmaeher',
      'Index muss am Produkt und online sichtbar sein',
      'Detaillierte Punktetabelle auf Anfrage bereitstellen'
    ],
    links: [
      { label: 'ADEME Reparierbarkeitsindex', url: 'https://www.ecologie.gouv.fr/indice-reparabilite' },
      { label: 'Loi AGEC', url: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000041553759' }
    ],
    applicable_products: ['Elektronik'],
    sort_order: 1,
  },
  {
    country_code: 'FR',
    category_key: 'electronics',
    title: 'Logo Triman',
    description: 'Triman-Recycling-Symbol auf Verpackung anbringen.',
    detailed_description:
      'Das Triman-Logo ist ein Pflichtsymbol fuer alle recycelbaren Produkte und ' +
      'Verpackungen, die in Frankreich verkauft werden. Es informiert Verbraucher, ' +
      'dass das Produkt oder die Verpackung getrennt gesammelt werden muss. ' +
      'Seit 2022 muss es zusammen mit der Info-Tri-Sortieranleitung angebracht werden.',
    mandatory: true,
    category: 'Recycling & Entsorgung',
    subcategory: 'Verpackungskennzeichnung',
    priority: 'high',
    document_required: false,
    document_types: null,
    legal_basis: 'Code de l\'environnement, Art. R541-12-17',
    authority: 'ADEME / CITEO',
    deadline: 'Vor dem Inverkehrbringen in Frankreich',
    penalties: 'Bussgeld bis 7.500 EUR pro Produktreferenz',
    tips: [
      'Triman-Logo zusammen mit Info-Tri verwenden',
      'Mindestgroesse 10 mm (6 mm bei kleinen Verpackungen)',
      'Digital sichtbar, wenn nicht auf Verpackung moeglich'
    ],
    links: [
      { label: 'Triman & Info-Tri Guide', url: 'https://www.citeo.com/le-tri-en-pratique/le-logo-triman-et-linfo-tri' }
    ],
    applicable_products: ['Elektronik', 'Textilien', 'Verpackungen', 'Kosmetik', 'Spielzeug'],
    sort_order: 2,
  },
];

// ---------------------------------------------------------------------------
// Data loaders
// ---------------------------------------------------------------------------

/**
 * Parse a very simple subset of INSERT SQL into JSON objects.
 * This handles the seed.sql format used by this project.
 * For complex SQL, prefer the JSON loader instead.
 */
function loadTemplatesFromSQL(filePath) {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    console.error(`SQL file not found: ${absPath}`);
    return null;
  }

  console.log(`Reading SQL file: ${absPath}`);
  const sql = readFileSync(absPath, 'utf-8');

  // Try to extract rows from INSERT INTO checklist_templates ... VALUES (...)
  const insertMatch = sql.match(
    /INSERT\s+INTO\s+checklist_templates\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?)(?:ON\s+CONFLICT|;)/i
  );
  if (!insertMatch) {
    console.warn('Could not parse INSERT statement from SQL file. Falling back to sample data.');
    return null;
  }

  const columns = insertMatch[1].split(',').map(c => c.trim());
  const valuesBlock = insertMatch[2].trim();

  // Split on row boundaries: "),\n(" or similar
  const rowStrings = [];
  let depth = 0;
  let current = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < valuesBlock.length; i++) {
    const ch = valuesBlock[i];

    if (escapeNext) {
      current += ch;
      escapeNext = false;
      continue;
    }

    if (ch === '\\' || (ch === "'" && i + 1 < valuesBlock.length && valuesBlock[i + 1] === "'")) {
      if (ch === "'" && inString) {
        // Escaped single quote ''
        current += "'";
        i++; // skip next quote
        continue;
      }
      escapeNext = true;
      current += ch;
      continue;
    }

    if (ch === "'" && !escapeNext) {
      inString = !inString;
      current += ch;
      continue;
    }

    if (!inString) {
      if (ch === '(') {
        depth++;
        if (depth === 1) {
          current = '';
          continue;
        }
      }
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          rowStrings.push(current);
          current = '';
          continue;
        }
      }
    }

    current += ch;
  }

  console.log(`Parsed ${rowStrings.length} row(s) from SQL.`);

  const templates = [];
  for (const row of rowStrings) {
    // Tokenise the comma-separated value list respecting quotes and ARRAY[...]
    const values = tokeniseSqlValues(row);
    if (values.length < columns.length) {
      console.warn(`Skipping row – expected ${columns.length} values, got ${values.length}`);
      continue;
    }
    const obj = {};
    columns.forEach((col, idx) => {
      obj[col] = parseSqlValue(col, values[idx]);
    });
    templates.push(obj);
  }

  return templates.length > 0 ? templates : null;
}

/** Tokenise a single SQL VALUES row string into individual value tokens. */
function tokeniseSqlValues(row) {
  const tokens = [];
  let current = '';
  let inString = false;
  let arrayDepth = 0;

  for (let i = 0; i < row.length; i++) {
    const ch = row[i];

    // Handle escaped quote inside string
    if (inString && ch === "'" && i + 1 < row.length && row[i + 1] === "'") {
      current += "'";
      i++;
      continue;
    }

    if (ch === "'" && arrayDepth === 0) {
      inString = !inString;
      current += ch;
      continue;
    }

    if (!inString) {
      if (ch === 'A' && row.slice(i, i + 6) === 'ARRAY[') {
        arrayDepth++;
        current += 'ARRAY[';
        i += 5;
        continue;
      }
      if (arrayDepth > 0 && ch === '[') {
        arrayDepth++;
        current += ch;
        continue;
      }
      if (arrayDepth > 0 && ch === ']') {
        arrayDepth--;
        current += ch;
        continue;
      }
      if (ch === ',' && arrayDepth === 0) {
        tokens.push(current.trim());
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current.trim()) tokens.push(current.trim());
  return tokens;
}

/** Convert a single SQL value token to a JS value. */
function parseSqlValue(column, raw) {
  if (!raw || raw === 'NULL' || raw === 'null') return null;

  // Boolean
  if (raw === 'true' || raw === 'TRUE') return true;
  if (raw === 'false' || raw === 'FALSE') return false;

  // Number
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);

  // ARRAY[...]
  if (raw.startsWith('ARRAY[')) {
    const inner = raw.slice(6, -1);
    return tokeniseSqlValues(inner).map(v => {
      const s = v.trim();
      if (s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
      return s;
    });
  }

  // String in single quotes
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1);
  }

  return raw;
}

/**
 * Load templates from a JSON file.
 * Expects either a plain array or { "templates": [...] }.
 */
function loadTemplatesFromJSON(filePath) {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    console.error(`JSON file not found: ${absPath}`);
    return null;
  }

  console.log(`Reading JSON file: ${absPath}`);
  const data = JSON.parse(readFileSync(absPath, 'utf-8'));
  const templates = Array.isArray(data) ? data : data.templates;

  if (!Array.isArray(templates) || templates.length === 0) {
    console.warn('JSON file did not contain a valid templates array.');
    return null;
  }

  console.log(`Loaded ${templates.length} template(s) from JSON.`);
  return templates;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('  Seed Checklist Templates – Supabase REST API');
  console.log('='.repeat(60));
  console.log(`  Supabase URL : ${SUPABASE_URL}`);
  console.log(`  Batch size   : ${BATCH_SIZE}`);
  console.log('');

  // ------------------------------------------------------------------
  // 1. Determine data source
  // ------------------------------------------------------------------
  let templates = null;

  const args = process.argv.slice(2);
  const jsonIdx = args.indexOf('--json');
  const sqlIdx = args.indexOf('--sql');

  if (jsonIdx !== -1 && args[jsonIdx + 1]) {
    templates = loadTemplatesFromJSON(args[jsonIdx + 1]);
  } else if (sqlIdx !== -1 && args[sqlIdx + 1]) {
    templates = loadTemplatesFromSQL(args[sqlIdx + 1]);
  } else {
    // Default: try the co-located SQL file
    const defaultSQL = resolve(__dirname, '..', 'supabase', 'seed-checklist-templates.sql');
    if (existsSync(defaultSQL)) {
      console.log('Auto-detected SQL file at default path.');
      templates = loadTemplatesFromSQL(defaultSQL);
    }
  }

  if (!templates) {
    console.log('Using embedded sample dataset (5 templates).\n');
    templates = SAMPLE_TEMPLATES;
  }

  console.log(`Total templates to insert: ${templates.length}\n`);

  // ------------------------------------------------------------------
  // 2. DELETE existing checklist_templates
  // ------------------------------------------------------------------
  console.log('[1/2] Deleting existing checklist_templates ...');
  try {
    // PostgREST requires a filter for DELETE; using a truthy condition to match all rows.
    await supabaseRequest('checklist_templates?id=not.is.null', {
      method: 'DELETE',
    });
    console.log('       Deleted all existing rows.\n');
  } catch (err) {
    console.error('       Failed to delete existing templates:', err.message);
    console.error('       Aborting.');
    process.exit(1);
  }

  // ------------------------------------------------------------------
  // 3. INSERT in batches
  // ------------------------------------------------------------------
  console.log(`[2/2] Inserting ${templates.length} templates in batches of ${BATCH_SIZE} ...`);

  let insertedCount = 0;
  const totalBatches = Math.ceil(templates.length / BATCH_SIZE);

  for (let i = 0; i < templates.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batch = templates.slice(i, i + BATCH_SIZE);

    // Strip auto-generated / server-managed fields before inserting
    const cleanBatch = batch.map(t => {
      const { id, created_at, updated_at, ...rest } = t;
      return rest;
    });

    try {
      await supabaseRequest('checklist_templates', {
        method: 'POST',
        body: JSON.stringify(cleanBatch),
        headers: {
          'Prefer': 'return=minimal',
        },
      });
      insertedCount += batch.length;
      console.log(`       Batch ${batchNum}/${totalBatches} – inserted ${batch.length} row(s)  (total: ${insertedCount})`);
    } catch (err) {
      console.error(`       Batch ${batchNum}/${totalBatches} FAILED: ${err.message}`);
      console.error(`       Rows ${i + 1}..${i + batch.length} were NOT inserted.`);
    }
  }

  // ------------------------------------------------------------------
  // 4. Verify
  // ------------------------------------------------------------------
  console.log('\nVerifying ...');
  try {
    const countRes = await supabaseRequest(
      'checklist_templates?select=id',
      {
        method: 'GET',
        headers: {
          'Prefer': 'count=exact',
          'Range-Unit': 'items',
          'Range': '0-0',
        },
      }
    );
    // PostgREST returns Content-Range header; but since we read the body we
    // just count the returned items via a simpler second request.
    const allRows = await supabaseRequest('checklist_templates?select=id');
    const dbCount = Array.isArray(allRows) ? allRows.length : '(unknown)';
    console.log(`  Rows in checklist_templates: ${dbCount}`);
  } catch {
    console.log('  (could not verify row count)');
  }

  // ------------------------------------------------------------------
  // Done
  // ------------------------------------------------------------------
  console.log('');
  console.log('='.repeat(60));
  console.log(
    insertedCount === templates.length
      ? `  Done – ${insertedCount} template(s) seeded successfully.`
      : `  Done – ${insertedCount}/${templates.length} template(s) seeded (some batches failed).`
  );
  console.log('='.repeat(60));

  if (insertedCount < templates.length) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
