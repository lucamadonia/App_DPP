/**
 * Seed Countries via Supabase REST API
 *
 * Inserts all EU/EEA countries + important trade partners into the countries table.
 * Uses ON CONFLICT-safe upsert via PostgREST.
 *
 * Usage:
 *   node scripts/seed-countries.mjs
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

/** Minimal .env parser */
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
// Country data
// ---------------------------------------------------------------------------

const COUNTRIES = [
  // Bestehende EU-Kernländer
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', regulations: 45, checklists: 12, authorities: ['Bundesministerium für Wirtschaft und Klimaschutz', 'Umweltbundesamt', 'Bundesnetzagentur'], description: 'Größter EU-Markt mit strengen Umweltauflagen' },
  { code: 'FR', name: 'Frankreich', flag: '🇫🇷', regulations: 38, checklists: 10, authorities: ['Ministère de la Transition écologique', 'ADEME'], description: 'Vorreiter bei Reparierbarkeitsindex' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', regulations: 32, checklists: 8, authorities: ['Bundesministerium für Klimaschutz', 'Umweltbundesamt'], description: 'Hohe Standards bei Nachhaltigkeit' },
  { code: 'IT', name: 'Italien', flag: '🇮🇹', regulations: 35, checklists: 9, authorities: ['Ministero della Transizione Ecologica', 'ISPRA'], description: 'Fokus auf Kreislaufwirtschaft' },
  { code: 'ES', name: 'Spanien', flag: '🇪🇸', regulations: 30, checklists: 7, authorities: ['Ministerio para la Transición Ecológica', 'MITERD'], description: 'Wachsender Nachhaltigkeitsmarkt' },
  { code: 'NL', name: 'Niederlande', flag: '🇳🇱', regulations: 33, checklists: 9, authorities: ['Rijkswaterstaat', 'RIVM'], description: 'Führend bei Kreislaufwirtschaft' },
  { code: 'BE', name: 'Belgien', flag: '🇧🇪', regulations: 28, checklists: 7, authorities: ['SPF Santé publique', 'IBGE-BIM'], description: 'Strikte Verpackungsvorschriften' },
  { code: 'PL', name: 'Polen', flag: '🇵🇱', regulations: 25, checklists: 6, authorities: ['Ministerstwo Klimatu i Środowiska'], description: 'Aufstrebender Markt' },
  { code: 'SE', name: 'Schweden', flag: '🇸🇪', regulations: 40, checklists: 10, authorities: ['Naturvårdsverket', 'Kemikalieinspektionen'], description: 'Nachhaltigkeitspionier' },
  { code: 'CH', name: 'Schweiz', flag: '🇨🇭', regulations: 35, checklists: 8, authorities: ['BAFU', 'SECO'], description: 'Hohe Qualitätsstandards' },
  // Weitere EU-Länder
  { code: 'BG', name: 'Bulgarien', flag: '🇧🇬', regulations: 20, checklists: 5, authorities: ['Ministerium für Umwelt und Wasser'], description: 'EU-Mitglied seit 2007' },
  { code: 'CY', name: 'Zypern', flag: '🇨🇾', regulations: 18, checklists: 4, authorities: ['Department of Environment'], description: 'Inselstaat im Mittelmeer' },
  { code: 'CZ', name: 'Tschechien', flag: '🇨🇿', regulations: 28, checklists: 7, authorities: ['Ministerstvo životního prostředí'], description: 'Starker Industriestandort' },
  { code: 'DK', name: 'Dänemark', flag: '🇩🇰', regulations: 38, checklists: 10, authorities: ['Miljøstyrelsen'], description: 'Vorreiter bei grüner Energie' },
  { code: 'EE', name: 'Estland', flag: '🇪🇪', regulations: 22, checklists: 5, authorities: ['Keskkonnaministeerium'], description: 'Digitaler Vorreiter' },
  { code: 'FI', name: 'Finnland', flag: '🇫🇮', regulations: 36, checklists: 9, authorities: ['Ympäristöministeriö'], description: 'Hohe Umweltstandards' },
  { code: 'GR', name: 'Griechenland', flag: '🇬🇷', regulations: 24, checklists: 6, authorities: ['Υπουργείο Περιβάλλοντος και Ενέργειας'], description: 'Fokus auf Tourismus und Landwirtschaft' },
  { code: 'HR', name: 'Kroatien', flag: '🇭🇷', regulations: 20, checklists: 5, authorities: ['Ministarstvo gospodarstva i održivog razvoja'], description: 'EU-Mitglied seit 2013' },
  { code: 'HU', name: 'Ungarn', flag: '🇭🇺', regulations: 25, checklists: 6, authorities: ['Energiaügyi Minisztérium'], description: 'Wachsender Industriestandort' },
  { code: 'IE', name: 'Irland', flag: '🇮🇪', regulations: 30, checklists: 8, authorities: ['Environmental Protection Agency'], description: 'Wichtiger Tech-Standort' },
  { code: 'LT', name: 'Litauen', flag: '🇱🇹', regulations: 22, checklists: 5, authorities: ['Aplinkos ministerija'], description: 'Baltischer EU-Staat' },
  { code: 'LU', name: 'Luxemburg', flag: '🇱🇺', regulations: 28, checklists: 7, authorities: ["Ministère de l'Environnement"], description: 'Finanz- und Verwaltungszentrum' },
  { code: 'LV', name: 'Lettland', flag: '🇱🇻', regulations: 21, checklists: 5, authorities: ['Vides aizsardzības un reģionālās attīstības ministrija'], description: 'Baltischer EU-Staat' },
  { code: 'MT', name: 'Malta', flag: '🇲🇹', regulations: 18, checklists: 4, authorities: ['Environment and Resources Authority'], description: 'Kleinster EU-Staat' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', regulations: 30, checklists: 7, authorities: ['Agência Portuguesa do Ambiente'], description: 'Wachsender Nachhaltigkeitsmarkt' },
  { code: 'RO', name: 'Rumänien', flag: '🇷🇴', regulations: 22, checklists: 5, authorities: ['Ministerul Mediului'], description: 'EU-Mitglied seit 2007' },
  { code: 'SI', name: 'Slowenien', flag: '🇸🇮', regulations: 24, checklists: 6, authorities: ['Ministrstvo za okolje in prostor'], description: 'Grüner Alpensstaat' },
  { code: 'SK', name: 'Slowakei', flag: '🇸🇰', regulations: 23, checklists: 6, authorities: ['Ministerstvo životného prostredia'], description: 'Starke Automobilindustrie' },
  // EWR-Länder
  { code: 'NO', name: 'Norwegen', flag: '🇳🇴', regulations: 35, checklists: 9, authorities: ['Miljødirektoratet'], description: 'EWR-Mitglied, hohe Umweltstandards' },
  { code: 'IS', name: 'Island', flag: '🇮🇸', regulations: 20, checklists: 5, authorities: ['Umhverfis- og auðlindaráðuneytið'], description: 'EWR-Mitglied, erneuerbare Energien' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', regulations: 18, checklists: 4, authorities: ['Amt für Umwelt'], description: 'EWR-Mitglied, Kleinstaat' },
  // Wichtige Handelspartner
  { code: 'GB', name: 'Vereinigtes Königreich', flag: '🇬🇧', regulations: 40, checklists: 10, authorities: ['Department for Environment, Food & Rural Affairs', 'Environment Agency'], description: 'Wichtiger Handelspartner nach Brexit' },
  { code: 'US', name: 'Vereinigte Staaten', flag: '🇺🇸', regulations: 35, checklists: 8, authorities: ['EPA', 'FTC', 'CPSC'], description: 'Größte Volkswirtschaft weltweit' },
  { code: 'CN', name: 'China', flag: '🇨🇳', regulations: 30, checklists: 7, authorities: ['Ministry of Ecology and Environment'], description: 'Größter Produktionsstandort' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', regulations: 32, checklists: 8, authorities: ['Ministry of the Environment'], description: 'Hohe Qualitäts- und Umweltstandards' },
  { code: 'KR', name: 'Südkorea', flag: '🇰🇷', regulations: 28, checklists: 7, authorities: ['Ministry of Environment'], description: 'Technologieführer in Asien' },
  { code: 'IN', name: 'Indien', flag: '🇮🇳', regulations: 22, checklists: 5, authorities: ['Ministry of Environment, Forest and Climate Change'], description: 'Wachsender Markt' },
  { code: 'TR', name: 'Türkei', flag: '🇹🇷', regulations: 25, checklists: 6, authorities: ['Çevre, Şehircilik ve İklim Değişikliği Bakanlığı'], description: 'Wichtiger Handelspartner' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', regulations: 26, checklists: 6, authorities: ['Environmental Protection Administration'], description: 'Halbleiter- und Elektronikproduktion' },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`Seeding ${COUNTRIES.length} countries into Supabase...`);
  console.log(`URL: ${SUPABASE_URL}`);

  // Upsert countries (on conflict by code, do nothing for existing)
  // PostgREST supports upsert via Prefer header
  const headers = {
    'Prefer': 'resolution=ignore-duplicates,return=minimal',
  };

  try {
    await supabaseRequest('countries', {
      method: 'POST',
      headers,
      body: JSON.stringify(COUNTRIES),
    });

    console.log(`✓ Successfully seeded ${COUNTRIES.length} countries.`);
  } catch (err) {
    console.error('Failed to seed countries:', err.message);
    process.exit(1);
  }
}

main();
