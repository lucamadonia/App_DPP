/**
 * Migration Script - Importiert alle Daten in NoCodeBackend
 *
 * Ausführen mit: npx ts-node scripts/migrate-to-nocodebackend.ts
 * Oder: npx tsx scripts/migrate-to-nocodebackend.ts
 */

const NCB_CONFIG = {
  instance: '48395_mfg_ddp',
  baseUrl: 'https://app.nocodebackend.com/api',
  secretKey: 'e4d980652106cfd48dd5786dbe25f9b4be24a4ba1adb33bc889e139d8ff3f5d7',
};

// Helper für API-Aufrufe
async function ncbFetch(endpoint: string, data: any) {
  const response = await fetch(`${NCB_CONFIG.baseUrl}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Database-Instance': NCB_CONFIG.instance,
      'Authorization': `Bearer ${NCB_CONFIG.secretKey}`,
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

async function insertMany(table: string, records: any[]) {
  console.log(`\n📦 Importiere ${records.length} Einträge in "${table}"...`);
  let success = 0;
  let failed = 0;

  for (const record of records) {
    try {
      await ncbFetch(`insert/${table}`, record);
      success++;
      process.stdout.write(`\r   ✓ ${success}/${records.length} importiert`);
    } catch (_error) {
      failed++;
      console.error(`\n   ✗ Fehler bei:`, record.name || record.title || record.id);
    }
  }
  console.log(`\n   Fertig: ${success} erfolgreich, ${failed} fehlgeschlagen`);
}

// ============================================
// DATEN
// ============================================

const countries = [
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪', regulations: 24, checklists: 8, authorities: JSON.stringify(['BAuA', 'UBA', 'BfR', 'stiftung ear']), description: 'Umfangreiche nationale Umsetzungen der EU-Richtlinien' },
  { code: 'FR', name: 'Frankreich', flag: '🇫🇷', regulations: 18, checklists: 7, authorities: JSON.stringify(['ADEME', 'DGCCRF', 'ANSM']), description: 'Vorreiter bei Reparierbarkeit und Anti-Obsoleszenz' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹', regulations: 14, checklists: 5, authorities: JSON.stringify(['BMK', 'AGES', 'Umweltbundesamt']), description: 'Strenge Umweltauflagen und Verpackungsverordnung' },
  { code: 'IT', name: 'Italien', flag: '🇮🇹', regulations: 16, checklists: 6, authorities: JSON.stringify(['ISPRA', 'CONAI', 'Ministero della Salute']), description: 'Besondere Anforderungen an Produktkennzeichnung' },
  { code: 'ES', name: 'Spanien', flag: '🇪🇸', regulations: 12, checklists: 5, authorities: JSON.stringify(['MITECO', 'AEMPS', 'CNMC']), description: 'Fokus auf Kreislaufwirtschaft' },
  { code: 'NL', name: 'Niederlande', flag: '🇳🇱', regulations: 15, checklists: 6, authorities: JSON.stringify(['RVO', 'NVWA', 'ILT']), description: 'Progressive Umweltpolitik' },
  { code: 'BE', name: 'Belgien', flag: '🇧🇪', regulations: 13, checklists: 5, authorities: JSON.stringify(['FOD', 'OVAM', 'Bruxelles Environnement']), description: 'Regionale Unterschiede bei Umweltauflagen' },
  { code: 'PL', name: 'Polen', flag: '🇵🇱', regulations: 11, checklists: 4, authorities: JSON.stringify(['GIOŚ', 'UOKiK', 'GIS']), description: 'Wachsender Fokus auf EU-Konformität' },
  { code: 'SE', name: 'Schweden', flag: '🇸🇪', regulations: 16, checklists: 6, authorities: JSON.stringify(['Naturvårdsverket', 'Kemikalieinspektionen']), description: 'Strenge Chemikalienverordnung' },
  { code: 'DK', name: 'Dänemark', flag: '🇩🇰', regulations: 14, checklists: 5, authorities: JSON.stringify(['Miljøstyrelsen', 'Sikkerhedsstyrelsen']), description: 'Vorreiter bei Kreislaufwirtschaft' },
  { code: 'CZ', name: 'Tschechien', flag: '🇨🇿', regulations: 10, checklists: 4, authorities: JSON.stringify(['MŽP', 'ČIŽP', 'ČOI']), description: 'Nationale EPR-Systeme' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', regulations: 11, checklists: 4, authorities: JSON.stringify(['APA', 'ASAE', 'Infarmed']), description: 'Fokus auf maritime Nachhaltigkeit' },
];

const categories = [
  { name: 'Elektronik & IT', description: 'Computer, Smartphones, Unterhaltungselektronik', icon: '💻', regulations: JSON.stringify(['WEEE', 'RoHS', 'EMV', 'RED']), sort_order: 1 },
  { name: 'Textilien & Bekleidung', description: 'Kleidung, Schuhe, Heimtextilien', icon: '👕', regulations: JSON.stringify(['REACH', 'Textilkennzeichnung']), sort_order: 2 },
  { name: 'Batterien & Akkus', description: 'Alle Arten von Batterien und Akkumulatoren', icon: '🔋', regulations: JSON.stringify(['Batterieverordnung', 'DPP']), sort_order: 3 },
  { name: 'Möbel & Einrichtung', description: 'Möbel, Matratzen, Heimtextilien', icon: '🛋️', regulations: JSON.stringify(['REACH', 'Holzhandelsverordnung']), sort_order: 4 },
  { name: 'Spielzeug', description: 'Spielwaren für Kinder', icon: '🧸', regulations: JSON.stringify(['Spielzeugrichtlinie', 'CE']), sort_order: 5 },
  { name: 'Kosmetik', description: 'Kosmetische Mittel und Körperpflege', icon: '🧴', regulations: JSON.stringify(['Kosmetikverordnung']), sort_order: 6 },
  { name: 'Lebensmittel', description: 'Lebensmittel und Getränke', icon: '🍎', regulations: JSON.stringify(['LMIV', 'Health Claims']), sort_order: 7 },
  { name: 'Medizinprodukte', description: 'Medizinische Geräte und Produkte', icon: '🏥', regulations: JSON.stringify(['MDR', 'IVDR']), sort_order: 8 },
  { name: 'Chemikalien', description: 'Chemische Stoffe und Gemische', icon: '🧪', regulations: JSON.stringify(['REACH', 'CLP']), sort_order: 9 },
  { name: 'Verpackungen', description: 'Verpackungsmaterialien', icon: '📦', regulations: JSON.stringify(['VerpackG', 'PPWR']), sort_order: 10 },
  { name: 'Bauprodukte', description: 'Baumaterialien und -produkte', icon: '🏗️', regulations: JSON.stringify(['Bauproduktenverordnung']), sort_order: 11 },
  { name: 'Maschinen', description: 'Maschinen und Anlagen', icon: '⚙️', regulations: JSON.stringify(['Maschinenrichtlinie']), sort_order: 12 },
];

const euRegulations = [
  {
    name: 'ESPR',
    fullName: 'Ecodesign for Sustainable Products Regulation',
    description: 'Rahmenverordnung für nachhaltige Produkte mit Digital Product Passport',
    category: 'environment',
    status: 'active',
    effectiveDate: '2024-07-18',
    applicationDate: '2027-01-01',
    keyRequirements: JSON.stringify(['Digitaler Produktpass', 'QR-Code', 'Reparierbarkeit', 'Recycelte Materialien']),
    affectedProducts: JSON.stringify(['Textilien', 'Möbel', 'Elektronik', 'Batterien']),
    dppDeadlines: JSON.stringify({ 'Batterien': '2027-02-18', 'Textilien': '2027-12-31', 'Elektronik': '2028-12-31' }),
  },
  {
    name: 'EU-Batterieverordnung',
    fullName: 'Verordnung (EU) 2023/1542 über Batterien',
    description: 'Umfassende Regelung für Batterien mit erstem verbindlichem DPP',
    category: 'environment',
    status: 'active',
    effectiveDate: '2023-08-17',
    applicationDate: '2027-02-18',
    keyRequirements: JSON.stringify(['Digitaler Batteriepass', 'CO2-Fußabdruck', 'Recycling-Quote', 'Due Diligence']),
    affectedProducts: JSON.stringify(['LMT-Batterien', 'Industriebatterien', 'EV-Batterien']),
    dppDeadlines: JSON.stringify({ 'LMT >2kWh': '2027-02-18', 'EV-Batterien': '2027-02-18' }),
  },
  {
    name: 'REACH',
    fullName: 'Verordnung zur Registrierung chemischer Stoffe',
    description: 'Zentrales Regelwerk für Chemikalien in der EU',
    category: 'chemicals',
    status: 'active',
    effectiveDate: '2007-06-01',
    applicationDate: '2007-06-01',
    keyRequirements: JSON.stringify(['SVHC-Prüfung', 'SCIP-Meldung', 'Sicherheitsdatenblätter']),
    affectedProducts: JSON.stringify(['Alle Produkte mit chemischen Stoffen']),
    dppDeadlines: JSON.stringify({}),
  },
  {
    name: 'RoHS',
    fullName: 'Richtlinie zur Beschränkung gefährlicher Stoffe',
    description: 'Beschränkt 10 gefährliche Stoffe in Elektrogeräten',
    category: 'chemicals',
    status: 'active',
    effectiveDate: '2011-07-01',
    applicationDate: '2013-01-03',
    keyRequirements: JSON.stringify(['Stoffgrenzwerte einhalten', 'CE-Kennzeichnung', 'Technische Dokumentation']),
    affectedProducts: JSON.stringify(['Elektro- und Elektronikgeräte']),
    dppDeadlines: JSON.stringify({}),
  },
  {
    name: 'WEEE',
    fullName: 'Richtlinie über Elektro-Altgeräte',
    description: 'Sammlung und Verwertung von Elektroaltgeräten',
    category: 'recycling',
    status: 'active',
    effectiveDate: '2012-08-13',
    applicationDate: '2014-02-14',
    keyRequirements: JSON.stringify(['Registrierung', 'WEEE-Symbol', 'Mengenmeldungen', 'Sammelziele']),
    affectedProducts: JSON.stringify(['Elektrogeräte']),
    dppDeadlines: JSON.stringify({}),
  },
  {
    name: 'CE-Kennzeichnung',
    fullName: 'Verordnung über Konformitätsbewertung',
    description: 'Zeigt EU-Konformität für freien Warenverkehr',
    category: 'safety',
    status: 'active',
    effectiveDate: '2010-01-01',
    applicationDate: '2010-01-01',
    keyRequirements: JSON.stringify(['Konformitätsbewertung', 'Technische Dokumentation', 'CE-Zeichen anbringen']),
    affectedProducts: JSON.stringify(['Spielzeug', 'Maschinen', 'Medizinprodukte', 'Elektrogeräte']),
    dppDeadlines: JSON.stringify({}),
  },
  {
    name: 'EU-Energielabel',
    fullName: 'Verordnung zur Energieverbrauchskennzeichnung',
    description: 'Einheitliche Energiekennzeichnung A bis G',
    category: 'energy',
    status: 'active',
    effectiveDate: '2017-08-01',
    applicationDate: '2021-03-01',
    keyRequirements: JSON.stringify(['Energielabel am POS', 'EPREL-Registrierung', 'QR-Code auf Label']),
    affectedProducts: JSON.stringify(['Kühlschränke', 'Waschmaschinen', 'TVs', 'Leuchtmittel']),
    dppDeadlines: JSON.stringify({}),
  },
  {
    name: 'PPWR',
    fullName: 'Verpackungs- und Verpackungsabfallverordnung',
    description: 'Strenge Recycling- und Wiederverwendungsziele für Verpackungen',
    category: 'environment',
    status: 'upcoming',
    effectiveDate: '2024-12-31',
    applicationDate: '2025-01-01',
    keyRequirements: JSON.stringify(['Alle Verpackungen recycelbar', 'Mindest-Rezyklat', 'Pfandsysteme']),
    affectedProducts: JSON.stringify(['Alle Verpackungen']),
    dppDeadlines: JSON.stringify({}),
  },
];

const pictograms = [
  { symbol: 'CE', name: 'CE-Kennzeichnung', description: 'Zeigt EU-Konformität an', mandatory: true, countries: JSON.stringify(['EU']), category: 'safety', dimensions: 'Mind. 5mm Höhe', placement: 'Auf Produkt oder Verpackung' },
  { symbol: '🗑️❌', name: 'WEEE-Symbol', description: 'Getrennte Sammlung für Elektrogeräte', mandatory: true, countries: JSON.stringify(['EU']), category: 'recycling', dimensions: 'Mind. 7mm x 10mm', placement: 'Auf Produkt dauerhaft' },
  { symbol: '🔄', name: 'Triman', description: 'Französisches Recycling-Symbol', mandatory: true, countries: JSON.stringify(['FR']), category: 'recycling', dimensions: 'Mind. 6mm', placement: 'Auf Produkt oder Verpackung' },
  { symbol: '♻️', name: 'Grüner Punkt', description: 'Teilnahme am Dualen System', mandatory: false, countries: JSON.stringify(['DE', 'AT']), category: 'recycling', dimensions: 'Keine Mindestgröße', placement: 'Auf Verpackung' },
  { symbol: '🔧', name: 'Reparierbarkeitsindex', description: 'Französischer Index 0-10', mandatory: true, countries: JSON.stringify(['FR']), category: 'durability', dimensions: 'Gemäß Décret', placement: 'Am Point of Sale' },
  { symbol: '⚡', name: 'EU-Energielabel', description: 'Energieeffizienzklasse A-G', mandatory: true, countries: JSON.stringify(['EU']), category: 'energy', dimensions: 'Standardgröße', placement: 'Am Point of Sale' },
  { symbol: '🔋❌', name: 'Batteriesammlung', description: 'Getrennte Sammlung für Batterien', mandatory: true, countries: JSON.stringify(['EU']), category: 'recycling', dimensions: 'Mind. 3% der Oberfläche', placement: 'Auf Batterie' },
  { symbol: '💥', name: 'GHS01 - Explosiv', description: 'Explosive Stoffe', mandatory: true, countries: JSON.stringify(['EU']), category: 'chemicals', dimensions: 'Gemäß CLP', placement: 'Auf Verpackung' },
  { symbol: '🔥', name: 'GHS02 - Entzündbar', description: 'Entzündbare Stoffe', mandatory: true, countries: JSON.stringify(['EU']), category: 'chemicals', dimensions: 'Gemäß CLP', placement: 'Auf Verpackung' },
  { symbol: '☠️', name: 'GHS06 - Giftig', description: 'Akut toxische Stoffe', mandatory: true, countries: JSON.stringify(['EU']), category: 'chemicals', dimensions: 'Gemäß CLP', placement: 'Auf Verpackung' },
  { symbol: '⚠️', name: 'GHS07 - Reizend', description: 'Reizende Stoffe', mandatory: true, countries: JSON.stringify(['EU']), category: 'chemicals', dimensions: 'Gemäß CLP', placement: 'Auf Verpackung' },
  { symbol: 'GS', name: 'GS-Zeichen', description: 'Geprüfte Sicherheit (Deutschland)', mandatory: false, countries: JSON.stringify(['DE']), category: 'safety', dimensions: 'Erkennbar', placement: 'Auf Produkt' },
];

const recyclingCodes = [
  { code: '1', symbol: '♳', name: 'PET', fullName: 'Polyethylenterephthalat', examples: 'Getränkeflaschen', recyclable: true },
  { code: '2', symbol: '♴', name: 'HDPE', fullName: 'Polyethylen hoher Dichte', examples: 'Milchflaschen', recyclable: true },
  { code: '3', symbol: '♵', name: 'PVC', fullName: 'Polyvinylchlorid', examples: 'Rohre, Kabel', recyclable: false },
  { code: '4', symbol: '♶', name: 'LDPE', fullName: 'Polyethylen niedriger Dichte', examples: 'Plastiktüten', recyclable: true },
  { code: '5', symbol: '♷', name: 'PP', fullName: 'Polypropylen', examples: 'Joghurtbecher', recyclable: true },
  { code: '6', symbol: '♸', name: 'PS', fullName: 'Polystyrol', examples: 'Styropor', recyclable: false },
  { code: '7', symbol: '♹', name: 'O', fullName: 'Andere Kunststoffe', examples: 'PC, ABS', recyclable: false },
  { code: '20', symbol: '♺', name: 'PAP', fullName: 'Wellpappe', examples: 'Kartons', recyclable: true },
  { code: '21', symbol: '♺', name: 'PAP', fullName: 'Sonstige Pappe', examples: 'Faltschachteln', recyclable: true },
  { code: '22', symbol: '♺', name: 'PAP', fullName: 'Papier', examples: 'Zeitungen', recyclable: true },
  { code: '40', symbol: '♻', name: 'FE', fullName: 'Stahl', examples: 'Konservendosen', recyclable: true },
  { code: '41', symbol: '♻', name: 'ALU', fullName: 'Aluminium', examples: 'Getränkedosen', recyclable: true },
  { code: '70', symbol: '♻', name: 'GL', fullName: 'Farbloses Glas', examples: 'Flaschen', recyclable: true },
  { code: '71', symbol: '♻', name: 'GL', fullName: 'Grünes Glas', examples: 'Weinflaschen', recyclable: true },
  { code: '72', symbol: '♻', name: 'GL', fullName: 'Braunes Glas', examples: 'Bierflaschen', recyclable: true },
];

const news = [
  {
    title: 'ESPR: Erste delegierte Rechtsakte erwartet',
    summary: 'EU-Kommission arbeitet an ersten produktspezifischen Anforderungen',
    content: 'Textilien und Eisen/Stahl werden die ersten Kategorien unter der ESPR sein.',
    category: 'regulation',
    countries: JSON.stringify(['EU']),
    publishedAt: '2025-01-15',
    effectiveDate: '2027-01-01',
    priority: 'high',
    tags: JSON.stringify(['ESPR', 'DPP', 'Textilien']),
  },
  {
    title: 'Batterie-DPP: Technische Standards veröffentlicht',
    summary: 'QR-Code-Anforderungen und Datenformate sind definiert',
    content: 'Hersteller müssen ab Februar 2027 digitale Batteriepässe bereitstellen.',
    category: 'deadline',
    countries: JSON.stringify(['EU']),
    publishedAt: '2025-01-10',
    effectiveDate: '2027-02-18',
    priority: 'high',
    tags: JSON.stringify(['Batterie', 'DPP', 'QR-Code']),
  },
  {
    title: 'Frankreich: Haltbarkeitsindex ersetzt Reparierbarkeitsindex',
    summary: 'Ab 2025 gilt der erweiterte Indice de Durabilité',
    content: 'Der neue Index integriert Zuverlässigkeit und Robustheit.',
    category: 'update',
    countries: JSON.stringify(['FR']),
    publishedAt: '2025-01-05',
    effectiveDate: '2025-01-01',
    priority: 'medium',
    tags: JSON.stringify(['Frankreich', 'Reparierbarkeit']),
  },
  {
    title: 'PPWR: Verpackungsverordnung angenommen',
    summary: 'Strenge Recycling- und Wiederverwendungsziele kommen',
    content: 'Alle Verpackungen müssen bis 2030 recycelbar sein.',
    category: 'regulation',
    countries: JSON.stringify(['EU']),
    publishedAt: '2024-12-15',
    effectiveDate: '2025-01-01',
    priority: 'high',
    tags: JSON.stringify(['PPWR', 'Verpackung', 'Recycling']),
  },
  {
    title: 'REACH: Neue SVHC auf Kandidatenliste',
    summary: 'ECHA hat 5 neue besonders besorgniserregende Stoffe gelistet',
    content: 'Unternehmen müssen SCIP-Meldungen prüfen und aktualisieren.',
    category: 'warning',
    countries: JSON.stringify(['EU']),
    publishedAt: '2024-11-20',
    effectiveDate: '2025-01-15',
    priority: 'high',
    tags: JSON.stringify(['REACH', 'SVHC', 'ECHA']),
  },
];

const tenants = [
  {
    name: 'GreenStep GmbH',
    slug: 'greenstep',
    address: 'Musterstraße 123, 80331 München',
    country: 'DE',
    eori: 'DE123456789012345',
    vat: 'DE123456789',
    plan: 'pro',
    settings: JSON.stringify({ defaultLanguage: 'de', qrCodeStyle: 'branded' }),
  },
];

// ============================================
// MIGRATION AUSFÜHREN
// ============================================

async function migrate() {
  console.log('🚀 Starte Migration zu NoCodeBackend...\n');
  console.log('Instance:', NCB_CONFIG.instance);
  console.log('========================================');

  try {
    // Reihenfolge ist wichtig wegen Abhängigkeiten
    await insertMany('countries', countries);
    await insertMany('categories', categories);
    await insertMany('regulations_eu', euRegulations);
    await insertMany('pictograms', pictograms);
    await insertMany('recycling_codes', recyclingCodes);
    await insertMany('news', news);
    await insertMany('tenants', tenants);

    console.log('\n========================================');
    console.log('✅ Migration abgeschlossen!');
    console.log('\nNächste Schritte:');
    console.log('1. App neu starten (npm run dev)');
    console.log('2. Prüfen ob Daten in der App erscheinen');

  } catch (error) {
    console.error('\n❌ Migration fehlgeschlagen:', error);
  }
}

migrate();
