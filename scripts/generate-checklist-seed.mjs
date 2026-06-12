#!/usr/bin/env node
/**
 * Generate the full compliance checklist seed dataset
 * (16 countries x 15 product categories) from modular content files.
 *
 * Content modules (created/maintained separately in scripts/checklist-content/):
 *   eu-base-tech.mjs       -> EU_BASE_TECH      { electronics, batteries, machinery, automotive, chemicals }
 *   eu-base-consumer.mjs   -> EU_BASE_CONSUMER  { textiles, toys, furniture, packaging, construction }
 *   eu-base-health.mjs     -> EU_BASE_HEALTH    { cosmetics, food, food_supplements, pet_products, medical_devices }
 *   country-specific.mjs   -> COUNTRY_GENERAL   { [countryCode]: Item[] }
 *                             COUNTRY_CATEGORY  { [countryCode]: { [categoryKey]: Item[] } }
 *   non-eu.mjs             -> NON_EU_BASE       { GB: { [categoryKey]: Item[] }, US: {...}, CH: {...} }
 *
 * Item schema (camelCase):
 *   { title, description, detailedDescription?, mandatory, category, subcategory?,
 *     documentRequired, documentTypes?, legalBasis?, authority?, deadline?, penalties?,
 *     tips?, links? ([{title,url}]), applicableProducts?,
 *     priority ('critical'|'high'|'medium'|'low'), sortOrder }
 *
 * Expansion rules:
 *   (a) EU_BASE_* items        -> one row per EU country          (sort_order 10-89)
 *   (b) COUNTRY_GENERAL[cc]    -> one row per category (all 15)   (sort_order 0-9,
 *                                 category defaults to 'Marktzugang & Registrierung')
 *   (c) COUNTRY_CATEGORY       -> rows as defined                 (sort_order 90+)
 *   (d) NON_EU_BASE            -> rows as defined; GB/US/CH get NO EU_BASE rows
 *
 * Output dedupe on (country_code, category_key, title): COUNTRY_CATEGORY > EU_BASE.
 *
 * Output: supabase/seed-checklists-full.json
 * Usage:  node scripts/generate-checklist-seed.mjs
 */

import { existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EU_COUNTRIES = ['DE', 'FR', 'AT', 'IT', 'ES', 'NL', 'PL', 'CZ', 'SE', 'DK', 'BE', 'PT', 'IE'];
const NON_EU_COUNTRIES = ['GB', 'US', 'CH'];
const ALL_COUNTRIES = [...EU_COUNTRIES, ...NON_EU_COUNTRIES];

const CATEGORY_KEYS = [
  'electronics', 'textiles', 'batteries', 'furniture', 'toys',
  'packaging', 'cosmetics', 'food', 'construction', 'machinery',
  'medical_devices', 'automotive', 'chemicals', 'food_supplements', 'pet_products',
];

const DEFAULT_GENERAL_CATEGORY = 'Marktzugang & Registrierung';
const VALID_PRIORITIES = new Set(['critical', 'high', 'medium', 'low']);
const MIN_ITEMS_PER_COMBINATION = 3;

// sort_order bands: COUNTRY_GENERAL 0-9, BASE 10-89, COUNTRY_CATEGORY 90+
const SORT_OFFSET = {
  country_general: 0,
  eu_base: 10,
  non_eu_base: 10,
  country_category: 90,
};

// Dedupe precedence on (country, category_key, title) — higher wins.
// Spec: COUNTRY_CATEGORY > EU_BASE.
const PRECEDENCE = {
  country_category: 4,
  country_general: 3,
  non_eu_base: 2,
  eu_base: 1,
};

const OUTPUT_PATH = resolve(__dirname, '..', 'supabase', 'seed-checklists-full.json');

// ---------------------------------------------------------------------------
// Content module loading (modules may not exist yet — fail with a clear
// message instead of crashing with a raw ERR_MODULE_NOT_FOUND stack).
// ---------------------------------------------------------------------------

const CONTENT_MODULES = [
  { file: 'checklist-content/eu-base-tech.mjs', exports: ['EU_BASE_TECH'] },
  { file: 'checklist-content/eu-base-consumer.mjs', exports: ['EU_BASE_CONSUMER'] },
  { file: 'checklist-content/eu-base-health.mjs', exports: ['EU_BASE_HEALTH'] },
  { file: 'checklist-content/country-specific.mjs', exports: ['COUNTRY_GENERAL', 'COUNTRY_CATEGORY'] },
  { file: 'checklist-content/non-eu.mjs', exports: ['NON_EU_BASE'] },
];

async function loadContentModules() {
  const missingFiles = [];
  const missingExports = [];
  const loaded = {};

  for (const mod of CONTENT_MODULES) {
    const absPath = resolve(__dirname, mod.file);
    if (!existsSync(absPath)) {
      missingFiles.push(`scripts/${mod.file}`);
      continue;
    }

    let imported;
    try {
      imported = await import(pathToFileURL(absPath).href);
    } catch (err) {
      console.error(`ERROR: failed to import scripts/${mod.file}:`);
      console.error(`       ${err.message}`);
      process.exit(1);
    }

    for (const name of mod.exports) {
      if (imported[name] === undefined) {
        missingExports.push(`${name}  (expected in scripts/${mod.file})`);
      } else {
        loaded[name] = imported[name];
      }
    }
  }

  if (missingFiles.length > 0 || missingExports.length > 0) {
    console.error('ERROR: checklist content modules are incomplete.\n');
    if (missingFiles.length > 0) {
      console.error('  Missing module files:');
      for (const f of missingFiles) console.error(`    - ${f}`);
    }
    if (missingExports.length > 0) {
      console.error('  Missing exports:');
      for (const e of missingExports) console.error(`    - ${e}`);
    }
    console.error('\nCreate the missing content modules first, then re-run:');
    console.error('  node scripts/generate-checklist-seed.mjs');
    process.exit(1);
  }

  return loaded;
}

// ---------------------------------------------------------------------------
// Item -> DB row mapping (camelCase -> snake_case)
// ---------------------------------------------------------------------------

let validationWarnings = 0;

function warn(msg) {
  validationWarnings++;
  console.warn(`  WARN ${msg}`);
}

/**
 * Map a content Item to a checklist_templates row.
 *
 * @param {object} item       – Item in camelCase content schema
 * @param {string} countryCode
 * @param {string} categoryKey
 * @param {string} source     – 'eu_base' | 'country_general' | 'country_category' | 'non_eu_base'
 * @param {number} index      – position within its source list (sortOrder fallback)
 */
function toRow(item, countryCode, categoryKey, source, index) {
  const ctx = `${countryCode}/${categoryKey} [${source}] "${item?.title ?? '?'}"`;

  if (!item || typeof item.title !== 'string' || item.title.trim() === '') {
    warn(`${ctx}: missing title – item skipped`);
    return null;
  }
  if (typeof item.description !== 'string' || item.description.trim() === '') {
    warn(`${ctx}: missing description – item skipped`);
    return null;
  }

  let priority = item.priority;
  if (!VALID_PRIORITIES.has(priority)) {
    warn(`${ctx}: invalid priority "${priority}" – defaulting to "medium"`);
    priority = 'medium';
  }

  let category = item.category;
  if (typeof category !== 'string' || category.trim() === '') {
    if (source !== 'country_general') {
      warn(`${ctx}: missing category – defaulting to "${DEFAULT_GENERAL_CATEGORY}"`);
    }
    category = DEFAULT_GENERAL_CATEGORY;
  }

  const localSort = typeof item.sortOrder === 'number' ? item.sortOrder : index;
  const sortOrder = SORT_OFFSET[source] + localSort;

  // DB columns document_types/tips/applicable_products are TEXT[] — some
  // content modules provide plain strings; normalize to arrays.
  const toArray = (v) => {
    if (v == null) return null;
    if (Array.isArray(v)) return v.length ? v.map((s) => String(s)) : null;
    return [String(v)];
  };

  return {
    // internal (stripped before output)
    __source: source,
    __precedence: PRECEDENCE[source],
    // DB columns
    country_code: countryCode,
    category_key: categoryKey,
    title: item.title.trim(),
    description: item.description.trim(),
    detailed_description: item.detailedDescription ?? null,
    mandatory: item.mandatory ?? true,
    category,
    subcategory: item.subcategory ?? null,
    document_required: item.documentRequired ?? false,
    document_types: toArray(item.documentTypes),
    legal_basis: item.legalBasis ?? null,
    authority: item.authority ?? null,
    deadline: item.deadline ?? null,
    penalties: item.penalties ?? null,
    tips: toArray(item.tips),
    links: item.links ?? null,
    applicable_products: toArray(item.applicableProducts),
    priority,
    sort_order: sortOrder,
  };
}

// ---------------------------------------------------------------------------
// Expansion
// ---------------------------------------------------------------------------

function expand({ EU_BASE_TECH, EU_BASE_CONSUMER, EU_BASE_HEALTH, COUNTRY_GENERAL, COUNTRY_CATEGORY, NON_EU_BASE }) {
  const candidates = [];

  const pushAll = (items, cc, catKey, source) => {
    if (!Array.isArray(items)) {
      warn(`${cc}/${catKey} [${source}]: expected an Item[] array – skipped`);
      return;
    }
    items.forEach((item, i) => {
      const row = toRow(item, cc, catKey, source, i);
      if (row) candidates.push(row);
    });
  };

  // (a) EU base content: one row per EU country (GB/US/CH get NO EU_BASE)
  const EU_BASE = { ...EU_BASE_TECH, ...EU_BASE_CONSUMER, ...EU_BASE_HEALTH };
  for (const [catKey, items] of Object.entries(EU_BASE)) {
    if (!CATEGORY_KEYS.includes(catKey)) {
      warn(`EU_BASE: unknown category key "${catKey}" – skipped`);
      continue;
    }
    for (const cc of EU_COUNTRIES) {
      pushAll(items, cc, catKey, 'eu_base');
    }
  }

  // (b) Country-general items: replicated across ALL 15 categories
  for (const [cc, items] of Object.entries(COUNTRY_GENERAL)) {
    if (!ALL_COUNTRIES.includes(cc)) {
      warn(`COUNTRY_GENERAL: unknown country code "${cc}" – skipped`);
      continue;
    }
    for (const catKey of CATEGORY_KEYS) {
      pushAll(items, cc, catKey, 'country_general');
    }
  }

  // (c) Country+category specific rows
  for (const [cc, byCategory] of Object.entries(COUNTRY_CATEGORY)) {
    if (!ALL_COUNTRIES.includes(cc)) {
      warn(`COUNTRY_CATEGORY: unknown country code "${cc}" – skipped`);
      continue;
    }
    for (const [catKey, items] of Object.entries(byCategory)) {
      if (!CATEGORY_KEYS.includes(catKey)) {
        warn(`COUNTRY_CATEGORY[${cc}]: unknown category key "${catKey}" – skipped`);
        continue;
      }
      pushAll(items, cc, catKey, 'country_category');
    }
  }

  // (d) Non-EU base content (GB / US / CH)
  for (const [cc, byCategory] of Object.entries(NON_EU_BASE)) {
    if (!NON_EU_COUNTRIES.includes(cc)) {
      warn(`NON_EU_BASE: unexpected country code "${cc}" – skipped`);
      continue;
    }
    for (const [catKey, items] of Object.entries(byCategory)) {
      if (!CATEGORY_KEYS.includes(catKey)) {
        warn(`NON_EU_BASE[${cc}]: unknown category key "${catKey}" – skipped`);
        continue;
      }
      pushAll(items, cc, catKey, 'non_eu_base');
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// Dedupe on (country_code, category_key, title) by source precedence
// ---------------------------------------------------------------------------

function dedupe(candidates) {
  const byKey = new Map();
  let overrides = 0;

  for (const row of candidates) {
    const key = `${row.country_code}|${row.category_key}|${row.title}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, row);
    } else if (row.__precedence > existing.__precedence) {
      byKey.set(key, row);
      overrides++;
    } else {
      overrides++;
    }
  }

  const rows = [...byKey.values()]
    .sort((a, b) =>
      a.country_code.localeCompare(b.country_code) ||
      a.category_key.localeCompare(b.category_key) ||
      a.sort_order - b.sort_order ||
      a.title.localeCompare(b.title)
    )
    // strip internal fields
    .map(({ __source, __precedence, ...row }) => row);

  return { rows, overrides };
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function printStats(rows) {
  const matrix = new Map(); // `${cc}|${cat}` -> count
  for (const row of rows) {
    const key = `${row.country_code}|${row.category_key}`;
    matrix.set(key, (matrix.get(key) || 0) + 1);
  }

  console.log('');
  console.log('Rows per country x category:');
  const colWidth = 5;
  const header = '      ' + CATEGORY_KEYS.map(c => c.slice(0, 4).padStart(colWidth)).join('');
  console.log(header);
  for (const cc of ALL_COUNTRIES) {
    let line = `  ${cc}  `;
    let total = 0;
    for (const catKey of CATEGORY_KEYS) {
      const n = matrix.get(`${cc}|${catKey}`) || 0;
      total += n;
      line += String(n).padStart(colWidth);
    }
    console.log(`${line}   = ${total}`);
  }

  const totalCombinations = ALL_COUNTRIES.length * CATEGORY_KEYS.length;
  const thin = [];
  for (const cc of ALL_COUNTRIES) {
    for (const catKey of CATEGORY_KEYS) {
      const n = matrix.get(`${cc}|${catKey}`) || 0;
      if (n < MIN_ITEMS_PER_COMBINATION) {
        thin.push({ cc, catKey, n });
      }
    }
  }

  console.log('');
  console.log(`Total rows         : ${rows.length}`);
  console.log(`Combinations >= ${MIN_ITEMS_PER_COMBINATION}  : ${totalCombinations - thin.length}/${totalCombinations}`);

  if (thin.length > 0) {
    console.log('');
    console.warn(`WARNING: ${thin.length} combination(s) below target of ${MIN_ITEMS_PER_COMBINATION} item(s):`);
    for (const { cc, catKey, n } of thin) {
      console.warn(`  - ${cc}/${catKey}: ${n}`);
    }
  }

  if (validationWarnings > 0) {
    console.log('');
    console.warn(`${validationWarnings} validation warning(s) during generation (see above).`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('  Generate Checklist Seed (16 countries x 15 categories)');
  console.log('='.repeat(60));

  const content = await loadContentModules();

  console.log('Content modules loaded. Expanding ...');
  const candidates = expand(content);
  const { rows, overrides } = dedupe(candidates);

  console.log(`Expanded ${candidates.length} candidate row(s); ${overrides} duplicate(s) resolved by precedence.`);

  const output = {
    generatedAt: new Date().toISOString(),
    count: rows.length,
    templates: rows,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`\nWrote ${rows.length} template(s) to:\n  ${OUTPUT_PATH}`);

  printStats(rows);

  console.log('');
  console.log('Next step (upsert into Supabase):');
  console.log('  node scripts/seed-checklist-templates.mjs --json supabase/seed-checklists-full.json');
}

main().catch(err => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
