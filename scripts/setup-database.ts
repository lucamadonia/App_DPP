/**
 * Setup-Script für NoCodeBackend Datenbank
 *
 * Erstellt alle notwendigen Tabellen und Initialdaten
 * Ausführen mit: npx ts-node scripts/setup-database.ts
 */

const NOCODEBACKEND_URL = 'https://app.nocodebackend.com/api';
const DATABASE_INSTANCE = '48395_mfg_ddp';
const SECRET_KEY = 'e4d980652106cfd48dd5786dbe25f9b4be24a4ba1adb33bc889e139d8ff3f5d7';

async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${NOCODEBACKEND_URL}/${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Database-Instance': DATABASE_INSTANCE,
      'Authorization': `Bearer ${SECRET_KEY}`,
      ...options.headers as Record<string, string>,
    },
  });

  const text = await response.text();
  console.log(`${options.method || 'GET'} ${endpoint}: ${response.status}`);

  if (text) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return null;
}

// ============================================
// PRODUKTE ERSTELLEN
// ============================================

const products = [
  {
    id: '1',
    name: 'Eco Sneaker Pro',
    manufacturer: 'GreenStep Footwear GmbH',
    gtin: '4012345678901',
    serialNumber: 'GSP-2024-001234',
    productionDate: '2024-01-15',
    category: 'Textilien',
    description: 'Nachhaltig produzierter Sneaker aus recycelten Materialien. Der Eco Sneaker Pro vereint Style mit Umweltbewusstsein - mit einer Sohle aus recyceltem Gummi und einem Obermaterial aus upgecycelten Plastikflaschen.',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
    hsCode: '6404.11.00',
    batchNumber: 'B2024-001',
    countryOfOrigin: 'Portugal',
    netWeight: 340,
    grossWeight: 520,
    manufacturerAddress: 'Industriestraße 42, 80339 München, Deutschland',
    manufacturerEORI: 'DE123456789012345',
    manufacturerVAT: 'DE123456789',
    materials: [
      { name: 'Recyceltes Polyester', percentage: 45, recyclable: true, origin: 'Deutschland' },
      { name: 'Bio-Baumwolle', percentage: 30, recyclable: true, origin: 'Türkei' },
      { name: 'Recycelter Gummi', percentage: 20, recyclable: true, origin: 'Portugal' },
      { name: 'Naturkautschuk', percentage: 5, recyclable: true, origin: 'Vietnam' },
    ],
    certifications: [
      { name: 'OEKO-TEX Standard 100', issuedBy: 'OEKO-TEX Association', validUntil: '2025-12-31', certificateUrl: '/certificates/oeko-tex.pdf' },
      { name: 'EU Ecolabel', issuedBy: 'European Commission', validUntil: '2025-06-30', certificateUrl: '/certificates/eu-ecolabel.pdf' },
      { name: 'Fair Trade Certified', issuedBy: 'Fairtrade International', validUntil: '2025-09-15', certificateUrl: '/certificates/fairtrade.pdf' },
    ],
    carbonFootprint: {
      totalKgCO2: 8.5,
      productionKgCO2: 5.2,
      transportKgCO2: 3.3,
      rating: 'B',
    },
    recyclability: {
      recyclablePercentage: 85,
      instructions: 'Trennen Sie Sohle und Obermaterial für optimales Recycling. Die Sohle kann im Gummirecycling entsorgt werden, das Obermaterial im Textilrecycling.',
      disposalMethods: ['Textilrecycling', 'Schuh-Rücknahmeprogramm', 'Gummirecycling'],
    },
    supplyChain: [
      { step: 1, location: 'Hamburg', country: 'Deutschland', date: '2024-01-10', description: 'Materialanlieferung' },
      { step: 2, location: 'Porto', country: 'Portugal', date: '2024-01-12', description: 'Fertigung' },
      { step: 3, location: 'München', country: 'Deutschland', date: '2024-01-15', description: 'Qualitätskontrolle' },
      { step: 4, location: 'Berlin', country: 'Deutschland', date: '2024-01-18', description: 'Distribution' },
    ],
  },
  {
    id: '2',
    name: 'Solar Powerbank 20000',
    manufacturer: 'EcoTech Solutions AG',
    gtin: '4098765432101',
    serialNumber: 'ETS-PB-2024-5678',
    productionDate: '2024-02-20',
    category: 'Elektronik',
    description: 'Leistungsstarke Powerbank mit integriertem Solarpanel. 20000mAh Kapazität für mehrfaches Aufladen Ihrer Geräte - auch unterwegs mit Sonnenenergie.',
    imageUrl: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=600',
    hsCode: '8507.60.00',
    batchNumber: 'B2024-002',
    countryOfOrigin: 'China',
    netWeight: 285,
    grossWeight: 380,
    manufacturerAddress: 'Technikweg 15, 70173 Stuttgart, Deutschland',
    manufacturerEORI: 'DE987654321098765',
    manufacturerVAT: 'DE987654321',
    materials: [
      { name: 'Lithium-Ionen-Zellen', percentage: 50, recyclable: true, origin: 'Südkorea' },
      { name: 'Recyceltes Aluminium', percentage: 25, recyclable: true, origin: 'Deutschland' },
      { name: 'Solarzellen', percentage: 15, recyclable: true, origin: 'China' },
      { name: 'ABS-Kunststoff', percentage: 10, recyclable: true, origin: 'Deutschland' },
    ],
    certifications: [
      { name: 'CE-Kennzeichnung', issuedBy: 'EU Conformity', validUntil: '2026-12-31', certificateUrl: '/certificates/ce.pdf' },
      { name: 'RoHS Compliant', issuedBy: 'SGS', validUntil: '2025-08-15', certificateUrl: '/certificates/rohs.pdf' },
    ],
    carbonFootprint: {
      totalKgCO2: 12.3,
      productionKgCO2: 9.8,
      transportKgCO2: 2.5,
      rating: 'C',
    },
    recyclability: {
      recyclablePercentage: 78,
      instructions: 'Bitte als Elektroschrott entsorgen. Die Lithium-Batterien müssen separat bei einer Sammelstelle abgegeben werden.',
      disposalMethods: ['Elektroschrott', 'Batteriesammelstelle'],
    },
    supplyChain: [
      { step: 1, location: 'Seoul', country: 'Südkorea', date: '2024-02-05', description: 'Batteriezellen-Fertigung' },
      { step: 2, location: 'Shenzhen', country: 'China', date: '2024-02-10', description: 'Montage' },
      { step: 3, location: 'Stuttgart', country: 'Deutschland', date: '2024-02-18', description: 'Qualitätsprüfung' },
    ],
  },
];

// ============================================
// SICHTBARKEITSEINSTELLUNGEN
// ============================================

const visibilitySettings = {
  version: 2,
  fields: {
    name: 'consumer',
    image: 'consumer',
    description: 'consumer',
    manufacturer: 'consumer',
    category: 'consumer',
    materials: 'consumer',
    materialOrigins: 'consumer',
    carbonFootprint: 'consumer',
    carbonRating: 'consumer',
    recyclability: 'consumer',
    recyclingInstructions: 'consumer',
    disposalMethods: 'consumer',
    certifications: 'consumer',
    supplyChainSimple: 'consumer',
    supplyChainFull: 'customs',
    gtin: 'customs',
    serialNumber: 'customs',
    batchNumber: 'customs',
    hsCode: 'customs',
    countryOfOrigin: 'customs',
    netWeight: 'customs',
    grossWeight: 'customs',
    manufacturerAddress: 'customs',
    manufacturerEORI: 'customs',
    manufacturerVAT: 'customs',
    certificateDownloads: 'customs',
  },
};

// ============================================
// HAUPTFUNKTION
// ============================================

async function setup() {
  console.log('='.repeat(50));
  console.log('DPP Manager - NoCodeBackend Setup');
  console.log('='.repeat(50));
  console.log(`Instance: ${DATABASE_INSTANCE}`);
  console.log(`URL: ${NOCODEBACKEND_URL}`);
  console.log('');

  // Produkte erstellen
  console.log('--- Produkte erstellen ---');
  for (const product of products) {
    try {
      const result = await apiFetch('products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
      console.log(`  ✓ ${product.name} erstellt`, result?.id || result?._id || '');
    } catch (error) {
      console.log(`  ✗ ${product.name} Fehler:`, error);
    }
  }

  // Sichtbarkeitseinstellungen erstellen
  console.log('');
  console.log('--- Sichtbarkeitseinstellungen erstellen ---');
  try {
    const result = await apiFetch('visibility', {
      method: 'POST',
      body: JSON.stringify(visibilitySettings),
    });
    console.log('  ✓ Sichtbarkeitseinstellungen erstellt', result);
  } catch (error) {
    console.log('  ✗ Fehler:', error);
  }

  console.log('');
  console.log('='.repeat(50));
  console.log('Setup abgeschlossen!');
  console.log('='.repeat(50));
}

setup().catch(console.error);
