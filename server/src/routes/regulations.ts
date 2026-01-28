import { Hono } from 'hono';
import {
  countryRegulations,
  euRegulations,
  complianceChecklists,
  regulatoryNews,
  getRegulationsForCountry,
  getChecklistForProduct,
  getNewsForCountry,
  getNewsForCategory,
} from '../db/regulations';

const app = new Hono();

// GET /regulations/countries - Liste aller Länder mit Regulierungen
app.get('/countries', async (c) => {
  const countries = countryRegulations.map(country => ({
    code: country.code,
    name: country.name,
    flag: country.flag,
    regulationsCount: country.regulations.length,
    pictogramsCount: country.pictograms.length,
  }));

  return c.json({
    data: countries,
    euRegulations: euRegulations.length,
  });
});

// GET /regulations/eu - EU-weite Regulierungen
app.get('/eu', async (c) => {
  const { category } = c.req.query();

  let regulations = euRegulations;
  if (category) {
    regulations = regulations.filter(r => r.category === category);
  }

  return c.json({ data: regulations });
});

// GET /regulations/:countryCode - Regulierungen für ein Land
app.get('/:countryCode', async (c) => {
  const { countryCode } = c.req.param();

  const country = getRegulationsForCountry(countryCode.toUpperCase());
  if (!country) {
    return c.json({ error: 'Country not found' }, 404);
  }

  return c.json({
    country: {
      code: country.code,
      name: country.name,
      flag: country.flag,
    },
    regulations: country.regulations,
    pictograms: country.pictograms,
    disposalSymbols: country.disposalSymbols,
    labelingRequirements: country.labelingRequirements,
    euRegulations, // Immer auch EU-Regulierungen einbeziehen
  });
});

// GET /regulations/:countryCode/checklist/:category - Checkliste für Land + Kategorie
app.get('/:countryCode/checklist/:category', async (c) => {
  const { countryCode, category } = c.req.param();

  const checklist = getChecklistForProduct(countryCode.toUpperCase(), category);
  if (!checklist) {
    return c.json({
      error: 'No checklist found for this country and category',
      suggestion: 'Use EU-wide regulations as baseline'
    }, 404);
  }

  const country = getRegulationsForCountry(countryCode.toUpperCase());

  return c.json({
    country: country ? {
      code: country.code,
      name: country.name,
      flag: country.flag,
    } : null,
    productCategory: category,
    checklist: checklist.items,
    totalItems: checklist.items.length,
    mandatoryItems: checklist.items.filter(i => i.mandatory).length,
  });
});

// GET /regulations/:countryCode/pictograms - Piktogramme für ein Land
app.get('/:countryCode/pictograms', async (c) => {
  const { countryCode } = c.req.param();

  const country = getRegulationsForCountry(countryCode.toUpperCase());
  if (!country) {
    return c.json({ error: 'Country not found' }, 404);
  }

  return c.json({
    country: {
      code: country.code,
      name: country.name,
      flag: country.flag,
    },
    pictograms: country.pictograms,
    disposalSymbols: country.disposalSymbols,
  });
});

// GET /regulations/news - Alle News
app.get('/news/all', async (c) => {
  const { country, category, limit = '10' } = c.req.query();

  let news = regulatoryNews;

  if (country) {
    news = getNewsForCountry(country.toUpperCase());
  }

  if (category) {
    news = news.filter(n =>
      n.productCategories.includes(category) ||
      n.productCategories.includes('all')
    );
  }

  // Nach Datum sortieren (neueste zuerst)
  news.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return c.json({
    data: news.slice(0, parseInt(limit)),
    total: news.length,
  });
});

// GET /regulations/news/:countryCode - News für ein Land
app.get('/news/:countryCode', async (c) => {
  const { countryCode } = c.req.param();

  const news = getNewsForCountry(countryCode.toUpperCase());

  return c.json({
    countryCode: countryCode.toUpperCase(),
    data: news,
    total: news.length,
  });
});

// GET /regulations/categories - Verfügbare Produktkategorien
app.get('/categories/all', async (c) => {
  const categories = [
    { id: 'electronics', name: 'Elektronik', icon: '💻' },
    { id: 'textiles', name: 'Textilien', icon: '👕' },
    { id: 'batteries', name: 'Batterien', icon: '🔋' },
    { id: 'furniture', name: 'Möbel', icon: '🪑' },
    { id: 'toys', name: 'Spielzeug', icon: '🧸' },
    { id: 'cosmetics', name: 'Kosmetik', icon: '💄' },
    { id: 'food', name: 'Lebensmittel', icon: '🍎' },
    { id: 'appliances', name: 'Haushaltsgeräte', icon: '🏠' },
  ];

  return c.json({ data: categories });
});

export default app;
