/**
 * Smart Packing — Reference Data
 *
 * Country zones, currency & VAT info, price matrices, surcharges, transit times,
 * Incoterms, customs-form rules, and country-specific hints.
 * Sourced from Kurier_Verpackungsregeln_Europa_v2.xlsx (32 sheets).
 */

// ── Country Zones ──────────────────────────────────────────────

export type ZoneKind = 'eu' | 'eea_non_eu' | 'third_country' | 'special_zone';

export interface CountryZone {
  iso2: string;
  nameDe: string;
  nameEn: string;
  zone: ZoneKind;
  inEurozone: boolean;
  currency: 'EUR' | 'CHF' | 'GBP' | 'DKK' | 'SEK' | 'NOK' | 'PLN' | 'CZK' | 'HUF' | 'RON' | 'BGN';
  vatStandardPct: number;
  vatReducedPct?: number;
  dutiesRequired: boolean;
  hints: string[];
}

export const COUNTRY_ZONES: Record<string, CountryZone> = {
  DE: { iso2: 'DE', nameDe: 'Deutschland', nameEn: 'Germany', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 19, vatReducedPct: 7, dutiesRequired: false, hints: [] },
  AT: { iso2: 'AT', nameDe: 'Österreich', nameEn: 'Austria', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 20, vatReducedPct: 10, dutiesRequired: false, hints: ['Exzise auf Alkohol/Tabak'] },
  CH: { iso2: 'CH', nameDe: 'Schweiz', nameEn: 'Switzerland', zone: 'third_country', inEurozone: false, currency: 'CHF', vatStandardPct: 8.1, vatReducedPct: 2.6, dutiesRequired: true, hints: [
    'Drittland — volle Zollabwicklung (Handelsrechnung + CN23 + EUR.1).',
    'MwSt.-Freigrenze CHF 62 (Standard) bzw. CHF 193 (reduziert).',
    'Verzollungsgebühr Swiss Post: CHF 11,50–70.',
    'Ab CHF 100.000 Jahresumsatz: Schweizer MwSt.-Registrierung Pflicht.',
    'DDP empfohlen für B2C (Versender zahlt Zoll+MwSt.).',
  ] },
  LI: { iso2: 'LI', nameDe: 'Liechtenstein', nameEn: 'Liechtenstein', zone: 'third_country', inEurozone: false, currency: 'CHF', vatStandardPct: 8.1, dutiesRequired: true, hints: ['Zollunion mit CH — wie Schweiz behandeln (PLZ 9485–9499).'] },
  IT: { iso2: 'IT', nameDe: 'Italien', nameEn: 'Italy', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 22, dutiesRequired: false, hints: ['Codice Fiscale häufig auf Rechnung gefordert — Shop-Feld "Steuernummer" anbieten.'] },
  FR: { iso2: 'FR', nameDe: 'Frankreich', nameEn: 'France', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 20, dutiesRequired: false, hints: ['Korsika + Überseegebiete (Réunion, Guadeloupe, Martinique) eigene USt. — PLZ 97xxx = Sonderstatus.'] },
  ES: { iso2: 'ES', nameDe: 'Spanien', nameEn: 'Spain', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 21, dutiesRequired: false, hints: ['Kanaren, Ceuta, Melilla = Zollgebiet außerhalb EU — wie Drittland behandeln!'] },
  PT: { iso2: 'PT', nameDe: 'Portugal', nameEn: 'Portugal', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 23, dutiesRequired: false, hints: ['Azoren + Madeira reduzierte MwSt., teilweise als Drittland behandelt — Shop-Logik PLZ prüfen.'] },
  NL: { iso2: 'NL', nameDe: 'Niederlande', nameEn: 'Netherlands', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 21, dutiesRequired: false, hints: ['PostNL Heimatland — günstige Zustellung.'] },
  BE: { iso2: 'BE', nameDe: 'Belgien', nameEn: 'Belgium', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 21, dutiesRequired: false, hints: [] },
  LU: { iso2: 'LU', nameDe: 'Luxemburg', nameEn: 'Luxembourg', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 17, dutiesRequired: false, hints: [] },
  DK: { iso2: 'DK', nameDe: 'Dänemark', nameEn: 'Denmark', zone: 'eu', inEurozone: false, currency: 'DKK', vatStandardPct: 25, dutiesRequired: false, hints: ['PostNord — DKK-Zone, EU aber eigene Währung.'] },
  SE: { iso2: 'SE', nameDe: 'Schweden', nameEn: 'Sweden', zone: 'eu', inEurozone: false, currency: 'SEK', vatStandardPct: 25, dutiesRequired: false, hints: ['Reko-Pflicht (Quittung) ab bestimmtem Wert.'] },
  NO: { iso2: 'NO', nameDe: 'Norwegen', nameEn: 'Norway', zone: 'third_country', inEurozone: false, currency: 'NOK', vatStandardPct: 25, dutiesRequired: true, hints: [
    'Drittland — VOEC-Registrierung ab NOK 350 Umsatz (ca. €30).',
    'Unter NOK 350: einfacher Versand möglich.',
  ] },
  FI: { iso2: 'FI', nameDe: 'Finnland', nameEn: 'Finland', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 25.5, dutiesRequired: false, hints: [] },
  PL: { iso2: 'PL', nameDe: 'Polen', nameEn: 'Poland', zone: 'eu', inEurozone: false, currency: 'PLN', vatStandardPct: 23, dutiesRequired: false, hints: ['InPost dominiert — Locker-Versand sehr beliebt.'] },
  CZ: { iso2: 'CZ', nameDe: 'Tschechien', nameEn: 'Czech Republic', zone: 'eu', inEurozone: false, currency: 'CZK', vatStandardPct: 21, dutiesRequired: false, hints: [] },
  HU: { iso2: 'HU', nameDe: 'Ungarn', nameEn: 'Hungary', zone: 'eu', inEurozone: false, currency: 'HUF', vatStandardPct: 27, dutiesRequired: false, hints: ['Höchste MwSt. EU — gelber Lkw-Kontrollen streng, saubere Dokumente (dreifache Handelsrechnung).'] },
  IE: { iso2: 'IE', nameDe: 'Irland', nameEn: 'Ireland', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 23, dutiesRequired: false, hints: ['Insel-Aufschlag. Post-Brexit: Direktflug via DHL bevorzugt, Landroute via GB erzeugt Zollpflicht.'] },
  GB: { iso2: 'GB', nameDe: 'Großbritannien', nameEn: 'United Kingdom', zone: 'third_country', inEurozone: false, currency: 'GBP', vatStandardPct: 20, dutiesRequired: true, hints: [
    'Drittland seit 2021 (Brexit).',
    'Unter £135: Verkäufer führt UK-VAT an HMRC ab (OSS-ähnlich).',
    'Über £135: normale Zollabfertigung, VAT beim Import.',
    'TCA: 0% Zoll bei EU-Ursprung + Ursprungserklärung.',
    'UK-EORI (beginnt mit GB…) erforderlich für gewerbliche Versender.',
    'Ab 2025: UKCA-Kennzeichnung teils Pflicht neben CE.',
    'Nordirland hat EU-Sonderstatus — keine VAT-Unterschiede.',
  ] },
  HR: { iso2: 'HR', nameDe: 'Kroatien', nameEn: 'Croatia', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 25, dutiesRequired: false, hints: ['Neuer Euro-Beitritt 2023.'] },
  GR: { iso2: 'GR', nameDe: 'Griechenland', nameEn: 'Greece', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 24, dutiesRequired: false, hints: ['Inseln mit Zuschlag.'] },
  RO: { iso2: 'RO', nameDe: 'Rumänien', nameEn: 'Romania', zone: 'eu', inEurozone: false, currency: 'RON', vatStandardPct: 19, dutiesRequired: false, hints: ['Zolllabore lang — auch EU-intern manchmal Kontrollen.'] },
  BG: { iso2: 'BG', nameDe: 'Bulgarien', nameEn: 'Bulgaria', zone: 'eu', inEurozone: false, currency: 'BGN', vatStandardPct: 20, dutiesRequired: false, hints: ['Längere Laufzeiten.'] },
  SI: { iso2: 'SI', nameDe: 'Slowenien', nameEn: 'Slovenia', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 22, dutiesRequired: false, hints: [] },
  SK: { iso2: 'SK', nameDe: 'Slowakei', nameEn: 'Slovakia', zone: 'eu', inEurozone: true, currency: 'EUR', vatStandardPct: 23, dutiesRequired: false, hints: [] },
};

// ── Price Matrix (from 32 sheets × 5 weight tiers) ─────────────
// Compact structure: key = "{origin}-{dest}", value = prices per carrier per weight tier.

export type CarrierPriceKey = 'DHL Paket' | 'DPD' | 'GLS' | 'UPS Std.' | 'FedEx Eco.' | 'Hermes/Nat. Post';

export interface RoutePricing {
  note: string;
  currency: 'EUR' | 'CHF' | 'GBP';
  prices: Partial<Record<CarrierPriceKey, { '2'?: number; '5'?: number; '10'?: number; '20'?: number; '30'?: number }>>;
}

export const ROUTE_PRICES: Record<string, RoutePricing> = {
  'DE-DE': { note: 'Eigenland', currency: 'EUR', prices: { 'DHL Paket': {'2':5.49,'5':6.86,'10':8.51,'20':11.53,'30':14.82}, DPD: {'2':5.9,'5':7.38,'10':9.15,'20':12.39,'30':15.93}, GLS: {'2':5.4,'5':6.75,'10':8.37,'20':11.34,'30':14.58}, 'UPS Std.': {'2':7.9,'5':9.88,'10':12.25,'20':16.59,'30':21.33} } },
  'DE-AT': { note: 'EU 1a', currency: 'EUR', prices: { 'DHL Paket': {'2':10.99,'5':13.74,'10':17.03,'20':23.08,'30':29.67}, DPD: {'2':9.5,'5':11.88,'10':14.72,'20':19.95,'30':25.65}, GLS: {'2':8.9,'5':11.12,'10':13.8,'20':18.69,'30':24.03}, 'UPS Std.': {'2':12.9,'5':16.12,'10':20,'20':27.09,'30':34.83}, 'FedEx Eco.': {'2':14.9,'5':18.62,'10':23.1,'20':31.29,'30':40.23} } },
  'DE-CH': { note: 'DRITTLAND', currency: 'EUR', prices: { 'DHL Paket': {'2':16.99,'5':21.24,'10':26.33,'20':35.68,'30':45.87}, DPD: {'2':16.9,'5':21.12,'10':26.2,'20':35.49,'30':45.63}, GLS: {'2':17.5,'5':21.88,'10':27.12,'20':36.75,'30':47.25}, 'UPS Std.': {'2':22.9,'5':28.62,'10':35.49,'20':48.09,'30':61.83}, 'FedEx Eco.': {'2':27.5,'5':34.38,'10':42.62,'20':57.75,'30':74.25} } },
  'DE-NL': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':9.99,'5':12.49,'10':15.48,'20':20.98,'30':26.97}, DPD: {'2':7.5,'5':9.38,'10':11.62,'20':15.75,'30':20.25}, GLS: {'2':7.9,'5':9.88,'10':12.25,'20':16.59,'30':21.33}, 'UPS Std.': {'2':11.5,'5':14.38,'10':17.82,'20':24.15,'30':31.05}, 'FedEx Eco.': {'2':14.5,'5':18.12,'10':22.48,'20':30.45,'30':39.15} } },
  'DE-BE': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':9.99,'5':12.49,'10':15.48,'20':20.98,'30':26.97}, DPD: {'2':7.5,'5':9.38,'10':11.62,'20':15.75,'30':20.25}, GLS: {'2':7.9,'5':9.88,'10':12.25,'20':16.59,'30':21.33}, 'UPS Std.': {'2':11.5,'5':14.38,'10':17.82,'20':24.15,'30':31.05}, 'FedEx Eco.': {'2':14.5,'5':18.12,'10':22.48,'20':30.45,'30':39.15} } },
  'DE-LU': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':9.99,'5':12.49,'10':15.48,'20':20.98,'30':26.97}, DPD: {'2':8.9,'5':11.12,'10':13.8,'20':18.69,'30':24.03}, GLS: {'2':8.5,'5':10.62,'10':13.18,'20':17.85,'30':22.95}, 'UPS Std.': {'2':12.5,'5':15.62,'10':19.38,'20':26.25,'30':33.75}, 'FedEx Eco.': {'2':15.5,'5':19.38,'10':24.03,'20':32.55,'30':41.85} } },
  'DE-FR': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':10.99,'5':13.74,'10':17.03,'20':23.08,'30':29.67}, DPD: {'2':8.9,'5':11.12,'10':13.8,'20':18.69,'30':24.03}, GLS: {'2':8.9,'5':11.12,'10':13.8,'20':18.69,'30':24.03}, 'UPS Std.': {'2':12.9,'5':16.12,'10':20,'20':27.09,'30':34.83}, 'FedEx Eco.': {'2':15.9,'5':19.88,'10':24.64,'20':33.39,'30':42.93} } },
  'DE-IT': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':10.99,'5':13.74,'10':17.03,'20':23.08,'30':29.67}, DPD: {'2':9.9,'5':12.38,'10':15.35,'20':20.79,'30':26.73}, GLS: {'2':9.5,'5':11.88,'10':14.72,'20':19.95,'30':25.65}, 'UPS Std.': {'2':13.5,'5':16.88,'10':20.93,'20':28.35,'30':36.45}, 'FedEx Eco.': {'2':17.5,'5':21.88,'10':27.12,'20':36.75,'30':47.25} } },
  'DE-ES': { note: 'EU (Insel-Aufschlag!)', currency: 'EUR', prices: { 'DHL Paket': {'2':12.99,'5':16.24,'10':20.13,'20':27.28,'30':35.07}, DPD: {'2':11.9,'5':14.88,'10':18.45,'20':24.99,'30':32.13}, GLS: {'2':11.5,'5':14.38,'10':17.82,'20':24.15,'30':31.05}, 'UPS Std.': {'2':14.5,'5':18.12,'10':22.48,'20':30.45,'30':39.15}, 'FedEx Eco.': {'2':18.9,'5':23.62,'10':29.29,'20':39.69,'30':51.03} } },
  'DE-PT': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':12.99,'5':16.24,'10':20.13,'20':27.28,'30':35.07}, DPD: {'2':13.5,'5':16.88,'10':20.93,'20':28.35,'30':36.45}, GLS: {'2':12.9,'5':16.12,'10':20,'20':27.09,'30':34.83}, 'UPS Std.': {'2':15.5,'5':19.38,'10':24.03,'20':32.55,'30':41.85}, 'FedEx Eco.': {'2':20.9,'5':26.12,'10':32.39,'20':43.89,'30':56.43} } },
  'DE-DK': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':10.99,'5':13.74,'10':17.03,'20':23.08,'30':29.67}, DPD: {'2':9.5,'5':11.88,'10':14.72,'20':19.95,'30':25.65}, GLS: {'2':8.9,'5':11.12,'10':13.8,'20':18.69,'30':24.03}, 'UPS Std.': {'2':12.5,'5':15.62,'10':19.38,'20':26.25,'30':33.75}, 'FedEx Eco.': {'2':15.9,'5':19.88,'10':24.64,'20':33.39,'30':42.93} } },
  'DE-SE': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':12.99,'5':16.24,'10':20.13,'20':27.28,'30':35.07}, DPD: {'2':12.5,'5':15.62,'10':19.38,'20':26.25,'30':33.75}, GLS: {'2':11.9,'5':14.88,'10':18.45,'20':24.99,'30':32.13}, 'UPS Std.': {'2':14.9,'5':18.62,'10':23.1,'20':31.29,'30':40.23}, 'FedEx Eco.': {'2':18.5,'5':23.12,'10':28.68,'20':38.85,'30':49.95} } },
  'DE-FI': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':12.99,'5':16.24,'10':20.13,'20':27.28,'30':35.07}, DPD: {'2':13.5,'5':16.88,'10':20.93,'20':28.35,'30':36.45}, GLS: {'2':12.9,'5':16.12,'10':20,'20':27.09,'30':34.83}, 'UPS Std.': {'2':15.5,'5':19.38,'10':24.03,'20':32.55,'30':41.85}, 'FedEx Eco.': {'2':19.9,'5':24.88,'10':30.84,'20':41.79,'30':53.73} } },
  'DE-NO': { note: 'DRITTLAND (VOEC)', currency: 'EUR', prices: { 'DHL Paket': {'2':15.99,'5':19.99,'10':24.78,'20':33.58,'30':43.17}, DPD: {'2':16.5,'5':20.62,'10':25.57,'20':34.65,'30':44.55}, GLS: {'2':16.9,'5':21.12,'10':26.2,'20':35.49,'30':45.63}, 'UPS Std.': {'2':21.9,'5':27.38,'10':33.95,'20':45.99,'30':59.13}, 'FedEx Eco.': {'2':26.5,'5':33.12,'10':41.08,'20':55.65,'30':71.55} } },
  'DE-PL': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':9.99,'5':12.49,'10':15.48,'20':20.98,'30':26.97}, DPD: {'2':7.9,'5':9.88,'10':12.25,'20':16.59,'30':21.33}, GLS: {'2':7.5,'5':9.38,'10':11.62,'20':15.75,'30':20.25}, 'UPS Std.': {'2':11.5,'5':14.38,'10':17.82,'20':24.15,'30':31.05}, 'FedEx Eco.': {'2':14.5,'5':18.12,'10':22.48,'20':30.45,'30':39.15} } },
  'DE-CZ': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':9.99,'5':12.49,'10':15.48,'20':20.98,'30':26.97}, DPD: {'2':7.5,'5':9.38,'10':11.62,'20':15.75,'30':20.25}, GLS: {'2':7.5,'5':9.38,'10':11.62,'20':15.75,'30':20.25}, 'UPS Std.': {'2':11.5,'5':14.38,'10':17.82,'20':24.15,'30':31.05}, 'FedEx Eco.': {'2':14.5,'5':18.12,'10':22.48,'20':30.45,'30':39.15} } },
  'DE-HU': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':10.99,'5':13.74,'10':17.03,'20':23.08,'30':29.67}, DPD: {'2':8.9,'5':11.12,'10':13.8,'20':18.69,'30':24.03}, GLS: {'2':8.5,'5':10.62,'10':13.18,'20':17.85,'30':22.95}, 'UPS Std.': {'2':12.5,'5':15.62,'10':19.38,'20':26.25,'30':33.75}, 'FedEx Eco.': {'2':15.5,'5':19.38,'10':24.03,'20':32.55,'30':41.85} } },
  'DE-GB': { note: 'DRITTLAND (CN22)', currency: 'EUR', prices: { 'DHL Paket': {'2':17.99,'5':22.49,'10':27.88,'20':37.78,'30':48.57}, DPD: {'2':14.9,'5':18.62,'10':23.1,'20':31.29,'30':40.23}, GLS: {'2':15.9,'5':19.88,'10':24.64,'20':33.39,'30':42.93}, 'UPS Std.': {'2':19.9,'5':24.88,'10':30.84,'20':41.79,'30':53.73}, 'FedEx Eco.': {'2':24.9,'5':31.12,'10':38.59,'20':52.29,'30':67.23} } },
  'DE-IE': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':12.99,'5':16.24,'10':20.13,'20':27.28,'30':35.07}, DPD: {'2':12.5,'5':15.62,'10':19.38,'20':26.25,'30':33.75}, GLS: {'2':12.5,'5':15.62,'10':19.38,'20':26.25,'30':33.75}, 'UPS Std.': {'2':14.9,'5':18.62,'10':23.1,'20':31.29,'30':40.23}, 'FedEx Eco.': {'2':18.9,'5':23.62,'10':29.29,'20':39.69,'30':51.03} } },
  'DE-GR': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':13.99,'5':17.49,'10':21.68,'20':29.38,'30':37.77}, DPD: {'2':14.5,'5':18.12,'10':22.48,'20':30.45,'30':39.15}, GLS: {'2':13.9,'5':17.38,'10':21.55,'20':29.19,'30':37.53}, 'UPS Std.': {'2':16.5,'5':20.62,'10':25.57,'20':34.65,'30':44.55}, 'FedEx Eco.': {'2':20.5,'5':25.62,'10':31.78,'20':43.05,'30':55.35} } },
  'DE-HR': { note: 'EU', currency: 'EUR', prices: { 'DHL Paket': {'2':10.99,'5':13.74,'10':17.03,'20':23.08,'30':29.67}, DPD: {'2':9.5,'5':11.88,'10':14.72,'20':19.95,'30':25.65}, GLS: {'2':8.9,'5':11.12,'10':13.8,'20':18.69,'30':24.03}, 'UPS Std.': {'2':12.9,'5':16.12,'10':20,'20':27.09,'30':34.83}, 'FedEx Eco.': {'2':15.9,'5':19.88,'10':24.64,'20':33.39,'30':42.93} } },
  'AT-AT': { note: 'Eigenland', currency: 'EUR', prices: { 'DHL Paket': {'2':5.87,'5':7.34,'10':9.1,'20':12.33,'30':15.85}, DPD: {'2':5.5,'5':6.88,'10':8.53,'20':11.55,'30':14.85}, GLS: {'2':5.2,'5':6.5,'10':8.06,'20':10.92,'30':14.04}, 'UPS Std.': {'2':7.5,'5':9.38,'10':11.62,'20':15.75,'30':20.25} } },
  'AT-DE': { note: 'EU 1a', currency: 'EUR', prices: { 'DHL Paket': {'2':9.8,'5':12.25,'10':15.19,'20':20.58,'30':26.46}, DPD: {'2':8.5,'5':10.62,'10':13.18,'20':17.85,'30':22.95}, GLS: {'2':7.9,'5':9.88,'10':12.25,'20':16.59,'30':21.33}, 'UPS Std.': {'2':11.5,'5':14.38,'10':17.82,'20':24.15,'30':31.05}, 'FedEx Eco.': {'2':14.5,'5':18.12,'10':22.48,'20':30.45,'30':39.15} } },
  'AT-CH': { note: 'DRITTLAND', currency: 'EUR', prices: { 'DHL Paket': {'2':14.5,'5':18.12,'10':22.48,'20':30.45,'30':39.15}, DPD: {'2':14.9,'5':18.62,'10':23.1,'20':31.29,'30':40.23}, GLS: {'2':15.5,'5':19.38,'10':24.03,'20':32.55,'30':41.85}, 'UPS Std.': {'2':19.9,'5':24.88,'10':30.84,'20':41.79,'30':53.73}, 'FedEx Eco.': {'2':24.5,'5':30.62,'10':37.98,'20':51.45,'30':66.15} } },
  'AT-IT': { note: 'EU 1a', currency: 'EUR', prices: { 'DHL Paket': {'2':10.5,'5':13.12,'10':16.28,'20':22.05,'30':28.35}, DPD: {'2':8.5,'5':10.62,'10':13.18,'20':17.85,'30':22.95}, GLS: {'2':7.9,'5':9.88,'10':12.25,'20':16.59,'30':21.33}, 'UPS Std.': {'2':11.5,'5':14.38,'10':17.82,'20':24.15,'30':31.05}, 'FedEx Eco.': {'2':14.5,'5':18.12,'10':22.48,'20':30.45,'30':39.15} } },
  'AT-GB': { note: 'DRITTLAND', currency: 'EUR', prices: { 'DHL Paket': {'2':18.5,'5':23.12,'10':28.68,'20':38.85,'30':49.95}, DPD: {'2':15.9,'5':19.88,'10':24.64,'20':33.39,'30':42.93}, GLS: {'2':16.5,'5':20.62,'10':25.57,'20':34.65,'30':44.55}, 'UPS Std.': {'2':21.5,'5':26.88,'10':33.33,'20':45.15,'30':58.05}, 'FedEx Eco.': {'2':25.5,'5':31.88,'10':39.52,'20':53.55,'30':68.85} } },
  'CH-DE': { note: 'Export CHF', currency: 'CHF', prices: { DPD: {'2':28,'5':35,'10':43.4,'20':58.8,'30':75.6}, GLS: {'2':30,'5':37.5,'10':46.5,'20':63,'30':81}, 'UPS Std.': {'2':38,'5':47.5,'10':58.9,'20':79.8,'30':102.6}, 'FedEx Eco.': {'2':46,'5':57.5,'10':71.3,'20':96.6,'30':124.2} } },
  'CH-AT': { note: 'Export', currency: 'CHF', prices: { 'DHL Paket': {'2':36}, DPD: {'2':26,'5':32.5,'10':40.3,'20':54.6,'30':70.2}, GLS: {'2':28,'5':35,'10':43.4,'20':58.8,'30':75.6}, 'UPS Std.': {'2':36,'5':45,'10':55.8,'20':75.6,'30':97.2}, 'FedEx Eco.': {'2':44,'5':55,'10':68.2,'20':92.4,'30':118.8} } },
  'CH-GB': { note: 'Drittland → Drittland', currency: 'CHF', prices: { 'DHL Paket': {'2':48,'5':60,'10':74.4,'20':100.8,'30':129.6}, DPD: {'2':38,'5':47.5,'10':58.9,'20':79.8,'30':102.6}, GLS: {'2':42,'5':52.5,'10':65.1,'20':88.2,'30':113.4}, 'UPS Std.': {'2':52,'5':65,'10':80.6,'20':109.2,'30':140.4}, 'FedEx Eco.': {'2':58,'5':72.5,'10':89.9,'20':121.8,'30':156.6} } },
  'GB-DE': { note: 'DRITTLAND (Brexit)', currency: 'GBP', prices: { 'DHL Paket': {'2':12.5,'5':15.62,'10':19.38,'20':26.25,'30':33.75}, DPD: {'2':10.9,'5':13.62,'10':16.89,'20':22.89,'30':29.43}, GLS: {'2':11.5,'5':14.38,'10':17.82,'20':24.15,'30':31.05}, 'UPS Std.': {'2':15.9,'5':19.88,'10':24.64,'20':33.39,'30':42.93}, 'FedEx Eco.': {'2':19.9,'5':24.88,'10':30.84,'20':41.79,'30':53.73} } },
};

// ── Surcharges (from sheet 32) ─────────────────────────────────

export interface SurchargeRule {
  id: string;
  labelDe: string;
  labelEn: string;
  /** Per-carrier amount in EUR (or '~%' for percentage). null = not applicable. */
  amounts: Partial<Record<string, string | number>>;
  note: string;
  /** Function-triggered conditions that apply this surcharge. */
  condition?: string;
}

export const SURCHARGES: SurchargeRule[] = [
  { id: 'oversize', labelDe: 'Sperrgut', labelEn: 'Oversize', amounts: { DHL: 26, DPD: 15, GLS: 17.5, UPS: 45, FedEx: 45 }, note: 'Bei >120×60×60 cm oder Rollen/nicht quaderförmig', condition: 'dims_exceed_standard' },
  { id: 'heavy_25kg', labelDe: 'Heavy Parcel (>25 kg)', labelEn: 'Heavy Parcel', amounts: { DPD: 5, GLS: 5, UPS: 24, FedEx: 24 }, note: 'EU-Regel seit 2025', condition: 'weight_over_25' },
  { id: 'saturday', labelDe: 'Samstagszustellung', labelEn: 'Saturday delivery', amounts: { DHL: 5.5, DPD: 4, UPS: 15, FedEx: 15 }, note: 'Nur auf Wunsch' },
  { id: 'timed_slot', labelDe: 'Express-Zeitfenster', labelEn: 'Time slot', amounts: { DHL: 8, DPD: 6, GLS: 6, UPS: 20, FedEx: 20 }, note: 'Zeitgenau Zustellung' },
  { id: 'age_check', labelDe: 'Altersprüfung', labelEn: 'Age check', amounts: { DHL: 4, DPD: 3.5, UPS: 5 }, note: 'Alkohol / 18+' },
  { id: 'cod', labelDe: 'Nachnahme', labelEn: 'Cash on delivery', amounts: { DHL: 4, DPD: 3.5 }, note: 'Selten bei Drittland' },
  { id: 'customs_clearance', labelDe: 'Zollabfertigung', labelEn: 'Customs clearance', amounts: { DHL: '11.50–70 CHF', DPD: 15, GLS: 15, UPS: 25, FedEx: 25 }, note: 'CH, UK, NO', condition: 'third_country' },
  { id: 'fuel', labelDe: 'Treibstoffzuschlag', labelEn: 'Fuel surcharge', amounts: { DHL: '5–10%', DPD: '8–15%', GLS: '8–15%', UPS: '12–25%', FedEx: '15–25%' }, note: 'Quartalsweise angepasst', condition: 'always_percent' },
  { id: 'peak', labelDe: 'Peak Season (Nov–Jan)', labelEn: 'Peak season', amounts: { DPD: 0.5, UPS: 2, FedEx: 2 }, note: 'Weihnachtsvolumen', condition: 'nov_to_jan' },
  { id: 'address_correction', labelDe: 'Adress-Korrektur', labelEn: 'Address correction', amounts: { DHL: 3, DPD: 5, GLS: 5, UPS: 18, FedEx: 18 }, note: 'Nach Annahme' },
  { id: 'island', labelDe: 'Insel-Zuschlag', labelEn: 'Island surcharge', amounts: { DHL: '3–5€', DPD: '5–10€', GLS: '5–10€', UPS: '10–20€', FedEx: '10–20€' }, note: 'Balearen, Sardinien, Inseln', condition: 'island_postcode' },
];

// ── Transit Times (from sheet 21) ──────────────────────────────

export interface TransitTimeRow {
  destIso2: string;
  dhlDays: string;
  dpdDays: string;
  glsDays: string;
  upsDays: string;
  note: string;
}

/** Origin is assumed DE for now. */
export const TRANSIT_TIMES_FROM_DE: TransitTimeRow[] = [
  { destIso2: 'AT', dhlDays: '2–3', dpdDays: '1–2', glsDays: '1–2', upsDays: '1–2', note: 'Eurozone EU' },
  { destIso2: 'CH', dhlDays: '3–5', dpdDays: '2–4', glsDays: '2–3', upsDays: '2–3', note: 'Drittland — Zoll!' },
  { destIso2: 'NL', dhlDays: '2–3', dpdDays: '1–2', glsDays: '1–2', upsDays: '1–2', note: 'EU' },
  { destIso2: 'BE', dhlDays: '2–3', dpdDays: '1–2', glsDays: '1–2', upsDays: '1–2', note: 'EU' },
  { destIso2: 'LU', dhlDays: '2–3', dpdDays: '1–2', glsDays: '1–2', upsDays: '1–2', note: 'EU' },
  { destIso2: 'FR', dhlDays: '2–4', dpdDays: '1–3', glsDays: '2–3', upsDays: '1–3', note: 'EU, Korsika länger' },
  { destIso2: 'IT', dhlDays: '3–5', dpdDays: '1–2', glsDays: '2–3', upsDays: '2–3', note: 'EU, Süditalien länger' },
  { destIso2: 'ES', dhlDays: '4–6', dpdDays: '2–3', glsDays: '2–3', upsDays: '2–3', note: 'Inseln als Drittland!' },
  { destIso2: 'PT', dhlDays: '4–6', dpdDays: '3–4', glsDays: '3–4', upsDays: '3–4', note: 'EU' },
  { destIso2: 'DK', dhlDays: '2–3', dpdDays: '1–2', glsDays: '1–2', upsDays: '1–2', note: 'EU, DKK-Zone' },
  { destIso2: 'SE', dhlDays: '3–5', dpdDays: '2–3', glsDays: '2–3', upsDays: '2–3', note: 'EU' },
  { destIso2: 'NO', dhlDays: '4–7', dpdDays: '3–5', glsDays: '3–5', upsDays: '3–5', note: 'Drittland — VOEC' },
  { destIso2: 'FI', dhlDays: '4–6', dpdDays: '3–4', glsDays: '3–4', upsDays: '3–4', note: 'EU' },
  { destIso2: 'PL', dhlDays: '2–4', dpdDays: '1–2', glsDays: '1–2', upsDays: '1–2', note: 'EU' },
  { destIso2: 'CZ', dhlDays: '2–3', dpdDays: '1–2', glsDays: '1–2', upsDays: '1–2', note: 'EU' },
  { destIso2: 'HU', dhlDays: '3–5', dpdDays: '2–3', glsDays: '2–3', upsDays: '2–3', note: 'EU' },
  { destIso2: 'GB', dhlDays: '4–7', dpdDays: '3–5', glsDays: '3–5', upsDays: '2–4', note: 'Drittland — CN22/23' },
  { destIso2: 'IE', dhlDays: '3–5', dpdDays: '3–4', glsDays: '3–4', upsDays: '3–4', note: 'EU, Insellage' },
  { destIso2: 'GR', dhlDays: '4–6', dpdDays: '3–5', glsDays: '3–5', upsDays: '3–5', note: 'Inseln länger' },
  { destIso2: 'HR', dhlDays: '3–5', dpdDays: '2–3', glsDays: '2–3', upsDays: '2–3', note: 'EU seit 2013' },
];

// ── Incoterms 2020 (from sheet 23) ─────────────────────────────

export interface Incoterm {
  code: string;
  labelDe: string;
  senderCosts: string;
  recipientCosts: string;
  typicalUse: string;
  recommended?: ('b2c' | 'b2b' | 'third_country' | 'high_value')[];
}

export const INCOTERMS: Incoterm[] = [
  { code: 'EXW', labelDe: 'Ex Works — Ab Werk', senderCosts: 'Nichts (Abholung)', recipientCosts: 'Alles: Transport + Zoll + MwSt.', typicalUse: 'B2B, erfahrener Käufer', recommended: ['b2b'] },
  { code: 'FCA', labelDe: 'Free Carrier — Frachtfrei Versender', senderCosts: 'Bis Übergabe an Spedition', recipientCosts: 'Hauptlauf + Zoll + MwSt.', typicalUse: 'B2B Standard', recommended: ['b2b'] },
  { code: 'CPT', labelDe: 'Carriage Paid To', senderCosts: 'Hauptlauf', recipientCosts: 'Zoll + MwSt. + letzte Meile', typicalUse: 'Internationale Handelsware' },
  { code: 'CIP', labelDe: 'Carriage & Insurance Paid', senderCosts: 'Hauptlauf + Versicherung', recipientCosts: 'Zoll + MwSt.', typicalUse: 'Wertvolle Ware', recommended: ['high_value'] },
  { code: 'DAP', labelDe: 'Delivered at Place', senderCosts: 'Bis Adresse (OHNE Zoll)', recipientCosts: 'Zoll + MwSt. + ggf. Verzollung', typicalUse: 'Standard CH-Versand B2C', recommended: ['third_country'] },
  { code: 'DDP', labelDe: 'Delivered Duty Paid', senderCosts: 'ALLES inkl. Zoll + MwSt.', recipientCosts: 'Nichts', typicalUse: 'Kundenfreundlicher B2C-Versand', recommended: ['b2c', 'third_country'] },
  { code: 'DPU', labelDe: 'Delivered at Place Unloaded', senderCosts: 'Bis zur Entladung', recipientCosts: 'Zoll + MwSt.', typicalUse: 'Palettenversand' },
];
