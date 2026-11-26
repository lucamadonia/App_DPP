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
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', regulations: 45, checklists: 12, authorities: ['Bundesministerium für Wirtschaft und Energie', 'Bundesministerium für Umwelt, Klimaschutz, Naturschutz und nukleare Sicherheit', 'Umweltbundesamt', 'Bundesnetzagentur'], description: 'Größter EU-Markt mit strengen Umweltauflagen' },
  { code: 'FR', name: 'Frankreich', flag: '🇫🇷', regulations: 38, checklists: 10, authorities: ['Ministère de la Transition écologique', 'ADEME', 'DGCCRF'], description: 'Vorreiter bei Reparierbarkeits- und Haltbarkeitsindex (AGEC)' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', regulations: 32, checklists: 8, authorities: ['Bundesministerium für Land- und Forstwirtschaft, Klima- und Umweltschutz, Regionen und Wasserwirtschaft', 'Umweltbundesamt'], description: 'Hohe Standards bei Nachhaltigkeit' },
  { code: 'IT', name: 'Italien', flag: '🇮🇹', regulations: 35, checklists: 9, authorities: ["Ministero dell'Ambiente e della Sicurezza Energetica", 'ISPRA', 'CONAI'], description: 'Fokus auf Kreislaufwirtschaft' },
  { code: 'ES', name: 'Spanien', flag: '🇪🇸', regulations: 30, checklists: 7, authorities: ['Ministerio para la Transición Ecológica y el Reto Demográfico', 'MITECO'], description: 'Wachsender Nachhaltigkeitsmarkt' },
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
  { code: 'SI', name: 'Slowenien', flag: '🇸🇮', regulations: 24, checklists: 6, authorities: ['Ministrstvo za okolje, podnebje in energijo', 'Ministrstvo za naravne vire in prostor'], description: 'Grüner Alpenstaat' },
  { code: 'SK', name: 'Slowakei', flag: '🇸🇰', regulations: 23, checklists: 6, authorities: ['Ministerstvo životného prostredia'], description: 'Starke Automobilindustrie' },
  // EWR-Länder
  { code: 'NO', name: 'Norwegen', flag: '🇳🇴', regulations: 35, checklists: 9, authorities: ['Miljødirektoratet'], description: 'EWR-Mitglied, hohe Umweltstandards' },
  { code: 'IS', name: 'Island', flag: '🇮🇸', regulations: 20, checklists: 5, authorities: ['Umhverfis-, orku- og loftslagsráðuneytið'], description: 'EWR-Mitglied, erneuerbare Energien' },
  { code: 'LI', name: 'Liechtenstein', flag: '🇱🇮', regulations: 18, checklists: 4, authorities: ['Amt für Umwelt'], description: 'EWR-Mitglied, Kleinstaat' },
  // Wichtige Handelspartner
  { code: 'GB', name: 'Vereinigtes Königreich', flag: '🇬🇧', regulations: 40, checklists: 10, authorities: ['Department for Environment, Food & Rural Affairs', 'Environment Agency', 'Office for Product Safety and Standards'], description: 'Wichtiger Handelspartner nach Brexit' },
  { code: 'US', name: 'Vereinigte Staaten', flag: '🇺🇸', regulations: 35, checklists: 8, authorities: ['EPA', 'FTC', 'CPSC'], description: 'Größte Volkswirtschaft weltweit' },
  { code: 'CN', name: 'China', flag: '🇨🇳', regulations: 30, checklists: 7, authorities: ['Ministry of Ecology and Environment'], description: 'Größter Produktionsstandort' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', regulations: 32, checklists: 8, authorities: ['Ministry of the Environment'], description: 'Hohe Qualitäts- und Umweltstandards' },
  { code: 'KR', name: 'Südkorea', flag: '🇰🇷', regulations: 28, checklists: 7, authorities: ['Ministry of Environment'], description: 'Technologieführer in Asien' },
  { code: 'IN', name: 'Indien', flag: '🇮🇳', regulations: 22, checklists: 5, authorities: ['Ministry of Environment, Forest and Climate Change'], description: 'Wachsender Markt' },
  { code: 'TR', name: 'Türkei', flag: '🇹🇷', regulations: 25, checklists: 6, authorities: ['Çevre, Şehircilik ve İklim Değişikliği Bakanlığı'], description: 'Wichtiger Handelspartner' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼', regulations: 26, checklists: 6, authorities: ['Ministry of Environment (MOENV)'], description: 'Halbleiter- und Elektronikproduktion' },

  // =========================================================================
  // Europa (nicht EU/EWR)
  // =========================================================================
  { code: 'AD', name: 'Andorra', flag: '🇦🇩', regulations: 0, checklists: 0, authorities: [], description: 'Kleinstaat in den Pyrenäen' },
  { code: 'AL', name: 'Albanien', flag: '🇦🇱', regulations: 0, checklists: 0, authorities: [], description: 'EU-Beitrittskandidat auf dem Westbalkan' },
  { code: 'BA', name: 'Bosnien und Herzegowina', flag: '🇧🇦', regulations: 0, checklists: 0, authorities: [], description: 'Westbalkanstaat mit EU-Perspektive' },
  { code: 'BY', name: 'Belarus', flag: '🇧🇾', regulations: 0, checklists: 0, authorities: [], description: 'Osteuropäischer Binnenstaat' },
  { code: 'GE', name: 'Georgien', flag: '🇬🇪', regulations: 0, checklists: 0, authorities: [], description: 'Kaukasusrepublik mit EU-Assoziierung' },
  { code: 'MD', name: 'Moldau', flag: '🇲🇩', regulations: 0, checklists: 0, authorities: [], description: 'EU-Beitrittskandidat in Osteuropa' },
  { code: 'ME', name: 'Montenegro', flag: '🇲🇪', regulations: 0, checklists: 0, authorities: [], description: 'EU-Beitrittskandidat an der Adria' },
  { code: 'MK', name: 'Nordmazedonien', flag: '🇲🇰', regulations: 0, checklists: 0, authorities: [], description: 'EU-Beitrittskandidat auf dem Westbalkan' },
  { code: 'MC', name: 'Monaco', flag: '🇲🇨', regulations: 0, checklists: 0, authorities: [], description: 'Stadtstaat an der Côte d\'Azur' },
  { code: 'RS', name: 'Serbien', flag: '🇷🇸', regulations: 0, checklists: 0, authorities: [], description: 'EU-Beitrittskandidat auf dem Westbalkan' },
  { code: 'RU', name: 'Russland', flag: '🇷🇺', regulations: 0, checklists: 0, authorities: [], description: 'Größtes Land der Welt' },
  { code: 'SM', name: 'San Marino', flag: '🇸🇲', regulations: 0, checklists: 0, authorities: [], description: 'Kleinstaat in Italien' },
  { code: 'UA', name: 'Ukraine', flag: '🇺🇦', regulations: 0, checklists: 0, authorities: [], description: 'EU-Beitrittskandidat in Osteuropa' },
  { code: 'VA', name: 'Vatikanstadt', flag: '🇻🇦', regulations: 0, checklists: 0, authorities: [], description: 'Kleinster Staat der Welt' },
  { code: 'XK', name: 'Kosovo', flag: '🇽🇰', regulations: 0, checklists: 0, authorities: [], description: 'Westbalkanstaat mit EU-Perspektive' },

  // =========================================================================
  // Afrika
  // =========================================================================
  { code: 'DZ', name: 'Algerien', flag: '🇩🇿', regulations: 0, checklists: 0, authorities: [], description: 'Größter afrikanischer Staat' },
  { code: 'AO', name: 'Angola', flag: '🇦🇴', regulations: 0, checklists: 0, authorities: [], description: 'Rohstoffreicher Staat im südlichen Afrika' },
  { code: 'BJ', name: 'Benin', flag: '🇧🇯', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Küstenstaat' },
  { code: 'BW', name: 'Botswana', flag: '🇧🇼', regulations: 0, checklists: 0, authorities: [], description: 'Stabile Demokratie im südlichen Afrika' },
  { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Binnenstaat' },
  { code: 'BI', name: 'Burundi', flag: '🇧🇮', regulations: 0, checklists: 0, authorities: [], description: 'Ostafrikanischer Binnenstaat' },
  { code: 'CV', name: 'Cabo Verde', flag: '🇨🇻', regulations: 0, checklists: 0, authorities: [], description: 'Inselstaat im Atlantik vor Westafrika' },
  { code: 'CM', name: 'Kamerun', flag: '🇨🇲', regulations: 0, checklists: 0, authorities: [], description: 'Zentralafrikanischer Staat am Golf von Guinea' },
  { code: 'CF', name: 'Zentralafrikanische Republik', flag: '🇨🇫', regulations: 0, checklists: 0, authorities: [], description: 'Binnenstaat in Zentralafrika' },
  { code: 'TD', name: 'Tschad', flag: '🇹🇩', regulations: 0, checklists: 0, authorities: [], description: 'Binnenstaat in Zentralafrika' },
  { code: 'KM', name: 'Komoren', flag: '🇰🇲', regulations: 0, checklists: 0, authorities: [], description: 'Inselstaat im Indischen Ozean' },
  { code: 'CG', name: 'Kongo', flag: '🇨🇬', regulations: 0, checklists: 0, authorities: [], description: 'Zentralafrikanischer Staat' },
  { code: 'CD', name: 'Demokratische Republik Kongo', flag: '🇨🇩', regulations: 0, checklists: 0, authorities: [], description: 'Rohstoffreicher Staat in Zentralafrika' },
  { code: 'CI', name: 'Elfenbeinküste', flag: '🇨🇮', regulations: 0, checklists: 0, authorities: [], description: 'Größter Kakaoproduzent weltweit' },
  { code: 'DJ', name: 'Dschibuti', flag: '🇩🇯', regulations: 0, checklists: 0, authorities: [], description: 'Strategisch gelegener Staat am Horn von Afrika' },
  { code: 'EG', name: 'Ägypten', flag: '🇪🇬', regulations: 0, checklists: 0, authorities: [], description: 'Bevölkerungsreichster arabischer Staat' },
  { code: 'GQ', name: 'Äquatorialguinea', flag: '🇬🇶', regulations: 0, checklists: 0, authorities: [], description: 'Ölreicher Staat in Zentralafrika' },
  { code: 'ER', name: 'Eritrea', flag: '🇪🇷', regulations: 0, checklists: 0, authorities: [], description: 'Staat am Horn von Afrika' },
  { code: 'SZ', name: 'Eswatini', flag: '🇸🇿', regulations: 0, checklists: 0, authorities: [], description: 'Kleiner Binnenstaat im südlichen Afrika' },
  { code: 'ET', name: 'Äthiopien', flag: '🇪🇹', regulations: 0, checklists: 0, authorities: [], description: 'Bevölkerungsreichster Binnenstaat Afrikas' },
  { code: 'GA', name: 'Gabun', flag: '🇬🇦', regulations: 0, checklists: 0, authorities: [], description: 'Ölreicher Staat in Zentralafrika' },
  { code: 'GM', name: 'Gambia', flag: '🇬🇲', regulations: 0, checklists: 0, authorities: [], description: 'Kleinster Staat auf dem afrikanischen Festland' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Küstenstaat' },
  { code: 'GN', name: 'Guinea', flag: '🇬🇳', regulations: 0, checklists: 0, authorities: [], description: 'Bauxitreicher Staat in Westafrika' },
  { code: 'GW', name: 'Guinea-Bissau', flag: '🇬🇼', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Küstenstaat' },
  { code: 'KE', name: 'Kenia', flag: '🇰🇪', regulations: 0, checklists: 0, authorities: [], description: 'Wirtschaftszentrum Ostafrikas' },
  { code: 'LS', name: 'Lesotho', flag: '🇱🇸', regulations: 0, checklists: 0, authorities: [], description: 'Gebirgiger Binnenstaat im südlichen Afrika' },
  { code: 'LR', name: 'Liberia', flag: '🇱🇷', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Küstenstaat' },
  { code: 'LY', name: 'Libyen', flag: '🇱🇾', regulations: 0, checklists: 0, authorities: [], description: 'Ölreicher Staat in Nordafrika' },
  { code: 'MG', name: 'Madagaskar', flag: '🇲🇬', regulations: 0, checklists: 0, authorities: [], description: 'Viertgrößte Insel der Welt' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', regulations: 0, checklists: 0, authorities: [], description: 'Ostafrikanischer Binnenstaat' },
  { code: 'ML', name: 'Mali', flag: '🇲🇱', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Binnenstaat' },
  { code: 'MR', name: 'Mauretanien', flag: '🇲🇷', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Wüstenstaat' },
  { code: 'MU', name: 'Mauritius', flag: '🇲🇺', regulations: 0, checklists: 0, authorities: [], description: 'Inselstaat im Indischen Ozean' },
  { code: 'MA', name: 'Marokko', flag: '🇲🇦', regulations: 0, checklists: 0, authorities: [], description: 'Nordafrikanischer Staat an der Meerenge von Gibraltar' },
  { code: 'MZ', name: 'Mosambik', flag: '🇲🇿', regulations: 0, checklists: 0, authorities: [], description: 'Ostafrikanischer Küstenstaat' },
  { code: 'NA', name: 'Namibia', flag: '🇳🇦', regulations: 0, checklists: 0, authorities: [], description: 'Rohstoffreicher Staat im südlichen Afrika' },
  { code: 'NE', name: 'Niger', flag: '🇳🇪', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Binnenstaat' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', regulations: 0, checklists: 0, authorities: [], description: 'Bevölkerungsreichster Staat Afrikas' },
  { code: 'RW', name: 'Ruanda', flag: '🇷🇼', regulations: 0, checklists: 0, authorities: [], description: 'Ostafrikanischer Binnenstaat' },
  { code: 'ST', name: 'São Tomé und Príncipe', flag: '🇸🇹', regulations: 0, checklists: 0, authorities: [], description: 'Inselstaat im Golf von Guinea' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Küstenstaat' },
  { code: 'SC', name: 'Seychellen', flag: '🇸🇨', regulations: 0, checklists: 0, authorities: [], description: 'Inselstaat im Indischen Ozean' },
  { code: 'SL', name: 'Sierra Leone', flag: '🇸🇱', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Küstenstaat' },
  { code: 'SO', name: 'Somalia', flag: '🇸🇴', regulations: 0, checklists: 0, authorities: [], description: 'Staat am Horn von Afrika' },
  { code: 'ZA', name: 'Südafrika', flag: '🇿🇦', regulations: 0, checklists: 0, authorities: [], description: 'Größte Volkswirtschaft Afrikas' },
  { code: 'SS', name: 'Südsudan', flag: '🇸🇸', regulations: 0, checklists: 0, authorities: [], description: 'Jüngster Staat der Welt' },
  { code: 'SD', name: 'Sudan', flag: '🇸🇩', regulations: 0, checklists: 0, authorities: [], description: 'Staat in Nordostafrika' },
  { code: 'TZ', name: 'Tansania', flag: '🇹🇿', regulations: 0, checklists: 0, authorities: [], description: 'Ostafrikanischer Küstenstaat' },
  { code: 'TG', name: 'Togo', flag: '🇹🇬', regulations: 0, checklists: 0, authorities: [], description: 'Westafrikanischer Küstenstaat' },
  { code: 'TN', name: 'Tunesien', flag: '🇹🇳', regulations: 0, checklists: 0, authorities: [], description: 'Nordafrikanischer Mittelmeeranrainer' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', regulations: 0, checklists: 0, authorities: [], description: 'Ostafrikanischer Binnenstaat' },
  { code: 'ZM', name: 'Sambia', flag: '🇿🇲', regulations: 0, checklists: 0, authorities: [], description: 'Kupferreicher Binnenstaat im südlichen Afrika' },
  { code: 'ZW', name: 'Simbabwe', flag: '🇿🇼', regulations: 0, checklists: 0, authorities: [], description: 'Binnenstaat im südlichen Afrika' },

  // =========================================================================
  // Asien (ohne CN, JP, KR, IN, TR, TW)
  // =========================================================================
  { code: 'AF', name: 'Afghanistan', flag: '🇦🇫', regulations: 0, checklists: 0, authorities: [], description: 'Binnenstaat in Zentralasien' },
  { code: 'AM', name: 'Armenien', flag: '🇦🇲', regulations: 0, checklists: 0, authorities: [], description: 'Kaukasusrepublik' },
  { code: 'AZ', name: 'Aserbaidschan', flag: '🇦🇿', regulations: 0, checklists: 0, authorities: [], description: 'Kaukasusrepublik am Kaspischen Meer' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', regulations: 0, checklists: 0, authorities: [], description: 'Inselstaat im Persischen Golf' },
  { code: 'BD', name: 'Bangladesch', flag: '🇧🇩', regulations: 0, checklists: 0, authorities: [], description: 'Großer Textilproduzent in Südasien' },
  { code: 'BT', name: 'Bhutan', flag: '🇧🇹', regulations: 0, checklists: 0, authorities: [], description: 'Himalaya-Königreich' },
  { code: 'BN', name: 'Brunei', flag: '🇧🇳', regulations: 0, checklists: 0, authorities: [], description: 'Sultanat auf Borneo' },
  { code: 'KH', name: 'Kambodscha', flag: '🇰🇭', regulations: 0, checklists: 0, authorities: [], description: 'Südostasiatischer Staat' },
  { code: 'ID', name: 'Indonesien', flag: '🇮🇩', regulations: 0, checklists: 0, authorities: [], description: 'Größter Inselstaat der Welt' },
  { code: 'IQ', name: 'Irak', flag: '🇮🇶', regulations: 0, checklists: 0, authorities: [], description: 'Ölreicher Staat im Nahen Osten' },
  { code: 'IR', name: 'Iran', flag: '🇮🇷', regulations: 0, checklists: 0, authorities: [], description: 'Staat im Nahen Osten' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', regulations: 0, checklists: 0, authorities: [], description: 'Technologiestandort im Nahen Osten' },
  { code: 'JO', name: 'Jordanien', flag: '🇯🇴', regulations: 0, checklists: 0, authorities: [], description: 'Staat im Nahen Osten' },
  { code: 'KZ', name: 'Kasachstan', flag: '🇰🇿', regulations: 0, checklists: 0, authorities: [], description: 'Größter Binnenstaat der Welt' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', regulations: 0, checklists: 0, authorities: [], description: 'Ölreicher Golfstaat' },
  { code: 'KG', name: 'Kirgisistan', flag: '🇰🇬', regulations: 0, checklists: 0, authorities: [], description: 'Zentralasiatischer Binnenstaat' },
  { code: 'LA', name: 'Laos', flag: '🇱🇦', regulations: 0, checklists: 0, authorities: [], description: 'Südostasiatischer Binnenstaat' },
  { code: 'LB', name: 'Libanon', flag: '🇱🇧', regulations: 0, checklists: 0, authorities: [], description: 'Mittelmeeranrainer im Nahen Osten' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', regulations: 0, checklists: 0, authorities: [], description: 'Südostasiatischer Industriestaat' },
  { code: 'MV', name: 'Malediven', flag: '🇲🇻', regulations: 0, checklists: 0, authorities: [], description: 'Inselstaat im Indischen Ozean' },
  { code: 'MN', name: 'Mongolei', flag: '🇲🇳', regulations: 0, checklists: 0, authorities: [], description: 'Zentralasiatischer Binnenstaat' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲', regulations: 0, checklists: 0, authorities: [], description: 'Südostasiatischer Staat' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵', regulations: 0, checklists: 0, authorities: [], description: 'Himalaya-Staat in Südasien' },
  { code: 'KP', name: 'Nordkorea', flag: '🇰🇵', regulations: 0, checklists: 0, authorities: [], description: 'Ostasiatischer Staat' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', regulations: 0, checklists: 0, authorities: [], description: 'Sultanat auf der Arabischen Halbinsel' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', regulations: 0, checklists: 0, authorities: [], description: 'Bevölkerungsreicher Staat in Südasien' },
  { code: 'PS', name: 'Palästina', flag: '🇵🇸', regulations: 0, checklists: 0, authorities: [], description: 'Staat im Nahen Osten' },
  { code: 'PH', name: 'Philippinen', flag: '🇵🇭', regulations: 0, checklists: 0, authorities: [], description: 'Südostasiatischer Inselstaat' },
  { code: 'QA', name: 'Katar', flag: '🇶🇦', regulations: 0, checklists: 0, authorities: [], description: 'Gasreicher Golfstaat' },
  { code: 'SA', name: 'Saudi-Arabien', flag: '🇸🇦', regulations: 0, checklists: 0, authorities: [], description: 'Größter Staat auf der Arabischen Halbinsel' },
  { code: 'SG', name: 'Singapur', flag: '🇸🇬', regulations: 0, checklists: 0, authorities: [], description: 'Internationales Handels- und Finanzzentrum' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰', regulations: 0, checklists: 0, authorities: [], description: 'Inselstaat im Indischen Ozean' },
  { code: 'SY', name: 'Syrien', flag: '🇸🇾', regulations: 0, checklists: 0, authorities: [], description: 'Staat im Nahen Osten' },
  { code: 'TJ', name: 'Tadschikistan', flag: '🇹🇯', regulations: 0, checklists: 0, authorities: [], description: 'Zentralasiatischer Binnenstaat' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', regulations: 0, checklists: 0, authorities: [], description: 'Südostasiatischer Industriestaat' },
  { code: 'TL', name: 'Timor-Leste', flag: '🇹🇱', regulations: 0, checklists: 0, authorities: [], description: 'Inselstaat in Südostasien' },
  { code: 'TM', name: 'Turkmenistan', flag: '🇹🇲', regulations: 0, checklists: 0, authorities: [], description: 'Zentralasiatischer Binnenstaat' },
  { code: 'AE', name: 'Vereinigte Arabische Emirate', flag: '🇦🇪', regulations: 0, checklists: 0, authorities: [], description: 'Handels- und Finanzzentrum am Persischen Golf' },
  { code: 'UZ', name: 'Usbekistan', flag: '🇺🇿', regulations: 0, checklists: 0, authorities: [], description: 'Bevölkerungsreichster zentralasiatischer Staat' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', regulations: 0, checklists: 0, authorities: [], description: 'Wachsender Produktionsstandort in Südostasien' },
  { code: 'YE', name: 'Jemen', flag: '🇾🇪', regulations: 0, checklists: 0, authorities: [], description: 'Staat auf der Arabischen Halbinsel' },

  // =========================================================================
  // Amerika (ohne US)
  // =========================================================================
  { code: 'AG', name: 'Antigua und Barbuda', flag: '🇦🇬', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Inselstaat' },
  { code: 'AR', name: 'Argentinien', flag: '🇦🇷', regulations: 0, checklists: 0, authorities: [], description: 'Zweitgrößter Staat Südamerikas' },
  { code: 'BS', name: 'Bahamas', flag: '🇧🇸', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Inselstaat' },
  { code: 'BB', name: 'Barbados', flag: '🇧🇧', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Inselstaat' },
  { code: 'BZ', name: 'Belize', flag: '🇧🇿', regulations: 0, checklists: 0, authorities: [], description: 'Zentralamerikanischer Küstenstaat' },
  { code: 'BO', name: 'Bolivien', flag: '🇧🇴', regulations: 0, checklists: 0, authorities: [], description: 'Südamerikanischer Binnenstaat' },
  { code: 'BR', name: 'Brasilien', flag: '🇧🇷', regulations: 0, checklists: 0, authorities: [], description: 'Größter Staat Südamerikas' },
  { code: 'CA', name: 'Kanada', flag: '🇨🇦', regulations: 0, checklists: 0, authorities: [], description: 'Zweitgrößter Staat der Welt' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', regulations: 0, checklists: 0, authorities: [], description: 'Südamerikanischer Pazifikstaat' },
  { code: 'CO', name: 'Kolumbien', flag: '🇨🇴', regulations: 0, checklists: 0, authorities: [], description: 'Viertgrößter Staat Südamerikas' },
  { code: 'CR', name: 'Costa Rica', flag: '🇨🇷', regulations: 0, checklists: 0, authorities: [], description: 'Zentralamerikanischer Staat mit Fokus auf Ökotourismus' },
  { code: 'CU', name: 'Kuba', flag: '🇨🇺', regulations: 0, checklists: 0, authorities: [], description: 'Größter karibischer Inselstaat' },
  { code: 'DM', name: 'Dominica', flag: '🇩🇲', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Inselstaat' },
  { code: 'DO', name: 'Dominikanische Republik', flag: '🇩🇴', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Staat auf Hispaniola' },
  { code: 'EC', name: 'Ecuador', flag: '🇪🇨', regulations: 0, checklists: 0, authorities: [], description: 'Südamerikanischer Pazifikstaat am Äquator' },
  { code: 'SV', name: 'El Salvador', flag: '🇸🇻', regulations: 0, checklists: 0, authorities: [], description: 'Kleinster zentralamerikanischer Staat' },
  { code: 'GD', name: 'Grenada', flag: '🇬🇩', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Inselstaat' },
  { code: 'GT', name: 'Guatemala', flag: '🇬🇹', regulations: 0, checklists: 0, authorities: [], description: 'Bevölkerungsreichster zentralamerikanischer Staat' },
  { code: 'GY', name: 'Guyana', flag: '🇬🇾', regulations: 0, checklists: 0, authorities: [], description: 'Südamerikanischer Staat an der Karibikküste' },
  { code: 'HT', name: 'Haiti', flag: '🇭🇹', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Staat auf Hispaniola' },
  { code: 'HN', name: 'Honduras', flag: '🇭🇳', regulations: 0, checklists: 0, authorities: [], description: 'Zentralamerikanischer Staat' },
  { code: 'JM', name: 'Jamaika', flag: '🇯🇲', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Inselstaat' },
  { code: 'MX', name: 'Mexiko', flag: '🇲🇽', regulations: 0, checklists: 0, authorities: [], description: 'Drittgrößter Staat Nordamerikas' },
  { code: 'NI', name: 'Nicaragua', flag: '🇳🇮', regulations: 0, checklists: 0, authorities: [], description: 'Größter zentralamerikanischer Staat' },
  { code: 'PA', name: 'Panama', flag: '🇵🇦', regulations: 0, checklists: 0, authorities: [], description: 'Zentralamerikanischer Staat am Panamakanal' },
  { code: 'PY', name: 'Paraguay', flag: '🇵🇾', regulations: 0, checklists: 0, authorities: [], description: 'Südamerikanischer Binnenstaat' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', regulations: 0, checklists: 0, authorities: [], description: 'Südamerikanischer Pazifikstaat' },
  { code: 'KN', name: 'St. Kitts und Nevis', flag: '🇰🇳', regulations: 0, checklists: 0, authorities: [], description: 'Kleinster Staat Amerikas' },
  { code: 'LC', name: 'St. Lucia', flag: '🇱🇨', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Inselstaat' },
  { code: 'VC', name: 'St. Vincent und die Grenadinen', flag: '🇻🇨', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Inselstaat' },
  { code: 'SR', name: 'Suriname', flag: '🇸🇷', regulations: 0, checklists: 0, authorities: [], description: 'Südamerikanischer Staat an der Karibikküste' },
  { code: 'TT', name: 'Trinidad und Tobago', flag: '🇹🇹', regulations: 0, checklists: 0, authorities: [], description: 'Karibischer Inselstaat' },
  { code: 'UY', name: 'Uruguay', flag: '🇺🇾', regulations: 0, checklists: 0, authorities: [], description: 'Südamerikanischer Staat am Río de la Plata' },
  { code: 'VE', name: 'Venezuela', flag: '🇻🇪', regulations: 0, checklists: 0, authorities: [], description: 'Ölreicher Staat in Südamerika' },

  // =========================================================================
  // Ozeanien
  // =========================================================================
  { code: 'AU', name: 'Australien', flag: '🇦🇺', regulations: 0, checklists: 0, authorities: [], description: 'Größter Staat in Ozeanien' },
  { code: 'FJ', name: 'Fidschi', flag: '🇫🇯', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Inselstaat' },
  { code: 'KI', name: 'Kiribati', flag: '🇰🇮', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Inselstaat' },
  { code: 'MH', name: 'Marshallinseln', flag: '🇲🇭', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Inselstaat' },
  { code: 'FM', name: 'Mikronesien', flag: '🇫🇲', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Inselstaat' },
  { code: 'NR', name: 'Nauru', flag: '🇳🇷', regulations: 0, checklists: 0, authorities: [], description: 'Kleinster Inselstaat der Welt' },
  { code: 'NZ', name: 'Neuseeland', flag: '🇳🇿', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Staat mit hohen Umweltstandards' },
  { code: 'PW', name: 'Palau', flag: '🇵🇼', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Inselstaat' },
  { code: 'PG', name: 'Papua-Neuguinea', flag: '🇵🇬', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Inselstaat' },
  { code: 'WS', name: 'Samoa', flag: '🇼🇸', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Inselstaat' },
  { code: 'SB', name: 'Salomonen', flag: '🇸🇧', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Inselstaat' },
  { code: 'TO', name: 'Tonga', flag: '🇹🇴', regulations: 0, checklists: 0, authorities: [], description: 'Pazifisches Königreich' },
  { code: 'TV', name: 'Tuvalu', flag: '🇹🇻', regulations: 0, checklists: 0, authorities: [], description: 'Kleinster pazifischer Inselstaat' },
  { code: 'VU', name: 'Vanuatu', flag: '🇻🇺', regulations: 0, checklists: 0, authorities: [], description: 'Pazifischer Inselstaat' },

  // =========================================================================
  // Wichtige Territorien
  // =========================================================================
  { code: 'HK', name: 'Hongkong', flag: '🇭🇰', regulations: 0, checklists: 0, authorities: [], description: 'Sonderverwaltungszone Chinas, internationales Handelszentrum' },
  { code: 'MO', name: 'Macau', flag: '🇲🇴', regulations: 0, checklists: 0, authorities: [], description: 'Sonderverwaltungszone Chinas' },
  { code: 'PR', name: 'Puerto Rico', flag: '🇵🇷', regulations: 0, checklists: 0, authorities: [], description: 'US-Außengebiet in der Karibik' },
  { code: 'GI', name: 'Gibraltar', flag: '🇬🇮', regulations: 0, checklists: 0, authorities: [], description: 'Britisches Überseegebiet an der Südspitze Spaniens' },
  { code: 'GL', name: 'Grönland', flag: '🇬🇱', regulations: 0, checklists: 0, authorities: [], description: 'Autonomes Territorium Dänemarks' },
  { code: 'FO', name: 'Färöer', flag: '🇫🇴', regulations: 0, checklists: 0, authorities: [], description: 'Autonomes Territorium Dänemarks im Nordatlantik' },
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
    await supabaseRequest('countries?on_conflict=code', {
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
