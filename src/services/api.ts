/**
 * API-Service für DPP Manager
 *
 * Verbindet das Frontend mit NoCodeBackend.com
 * Unterstützt Multi-Tenant Architektur und Master-/Tenant-Daten
 */

// NoCodeBackend Konfiguration
const NOCODEBACKEND_URL = 'https://api.nocodebackend.com';
const DATABASE_INSTANCE = '48395_mfg_ddp';
const SECRET_KEY = 'e4d980652106cfd48dd5786dbe25f9b4be24a4ba1adb33bc889e139d8ff3f5d7';

// Fallback auf localStorage wenn API nicht erreichbar
const USE_LOCAL_FALLBACK = true;

// Cache-Konfiguration (TTL in Millisekunden)
const CACHE_TTL = {
  categories: 24 * 60 * 60 * 1000, // 24 Stunden
  countries: 24 * 60 * 60 * 1000,
  euRegulations: 12 * 60 * 60 * 1000, // 12 Stunden
  nationalRegulations: 12 * 60 * 60 * 1000,
  pictograms: 24 * 60 * 60 * 1000,
  recyclingCodes: 24 * 60 * 60 * 1000,
  checklistTemplates: 6 * 60 * 60 * 1000, // 6 Stunden
  news: 1 * 60 * 60 * 1000, // 1 Stunde
};

// In-Memory Cache
const cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

// ============================================
// TENANT CONTEXT
// ============================================

let currentTenantId: string | null = null;

/**
 * Setzt den aktuellen Tenant für alle API-Aufrufe
 */
export function setTenant(tenantId: string | null): void {
  currentTenantId = tenantId;
}

/**
 * Gibt den aktuellen Tenant zurück
 */
export function getCurrentTenant(): string | null {
  return currentTenantId;
}

/**
 * Generische Fetch-Funktion mit NoCodeBackend Authentifizierung
 * Instance wird als Query-Parameter übergeben
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Instance als Query-Parameter anhängen
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${NOCODEBACKEND_URL}/${endpoint}${separator}Instance=${DATABASE_INSTANCE}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${SECRET_KEY}`,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`API-Fehler bei ${endpoint}:`, error);
    throw error;
  }
}

// ============================================
// CACHE HILFSFUNKTIONEN
// ============================================

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
}

function clearCache(pattern?: string): void {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// ============================================
// IMPORT TYPES
// ============================================

import type { Product } from '@/types/product';
import type {
  Tenant,
  Category,
  Country,
  EURegulation,
  NationalRegulation,
  Pictogram,
  RecyclingCode,
  ChecklistTemplate,
  ChecklistProgress,
  Document,
  SupplyChainEntry,
  NewsItem,
  Supplier,
  SupplierProduct,
} from '@/types/database';

// ============================================
// PRODUKTE API
// ============================================

export interface ProductListItem {
  id: string;
  name: string;
  manufacturer: string;
  gtin: string;
  serial: string;
  serialNumber?: string;
  category: string;
  imageUrl?: string;
  batch?: string;
}

/**
 * Alle Produkte abrufen
 */
export async function getProducts(search?: string): Promise<ProductListItem[]> {
  try {
    let response;

    if (search) {
      // Suche verwenden
      response = await apiFetch<{ data: ProductListItem[] } | ProductListItem[]>('search/products', {
        method: 'POST',
        body: JSON.stringify({ search }),
      });
    } else {
      // Alle abrufen
      response = await apiFetch<{ data: ProductListItem[] } | ProductListItem[]>('read/products');
    }

    // Unterstütze beide Antwortformate
    const products = Array.isArray(response) ? response : response.data || [];

    return products.map(p => ({
      ...p,
      serial: p.serial || p.serialNumber || '',
    }));
  } catch {
    console.warn('Produkte konnten nicht geladen werden');
    return [];
  }
}

/**
 * Ein Produkt per GTIN + Seriennummer abrufen
 */
export async function getProductByGtinSerial(
  gtin: string,
  serial: string
): Promise<Product | null> {
  try {
    // Suche nach GTIN und Seriennummer
    const response = await apiFetch<{ data: Product[] } | Product[]>(
      'search/products',
      {
        method: 'POST',
        body: JSON.stringify({ gtin, serialNumber: serial }),
      }
    );

    // Unterstütze beide Antwortformate
    const products = Array.isArray(response) ? response : response.data || [];

    return products[0] || null;
  } catch {
    return null;
  }
}

/**
 * Ein Produkt per ID abrufen
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const response = await apiFetch<{ data: Product } | Product>(`read/products/${encodeURIComponent(id)}`);
    return 'data' in response ? response.data : response;
  } catch {
    return null;
  }
}

/**
 * Neues Produkt anlegen
 */
export async function createProduct(product: Partial<Product>): Promise<{ success: boolean; id?: string }> {
  try {
    const response = await apiFetch<{ id?: string; _id?: string }>('create/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    return { success: true, id: response.id || response._id };
  } catch (error) {
    console.error('Fehler beim Erstellen:', error);
    return { success: false };
  }
}

/**
 * Produkt aktualisieren
 */
export async function updateProduct(id: string, product: Partial<Product>): Promise<{ success: boolean }> {
  try {
    await apiFetch(`update/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(product),
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Produkt löschen
 */
export async function deleteProduct(id: string): Promise<{ success: boolean }> {
  try {
    await apiFetch(`delete/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ============================================
// SICHTBARKEITS-API
// ============================================

import type { VisibilityConfigV2 } from '@/types/visibility';
import { defaultVisibilityConfigV2 } from '@/types/visibility';

const VISIBILITY_STORAGE_KEY = 'dpp-visibility-settings-v2';

/**
 * Sichtbarkeitseinstellungen laden (API mit localStorage Fallback)
 */
export async function getVisibilitySettings(): Promise<VisibilityConfigV2> {
  try {
    const response = await apiFetch<{ data: VisibilityConfigV2[] } | VisibilityConfigV2[]>('read/visibility');
    const data = Array.isArray(response) ? response : response.data || [];
    const config = data[0]; // Erste Konfiguration nehmen

    // Bei Erfolg auch in localStorage cachen
    if (config && config.fields) {
      // Falls fields als String gespeichert wurde, parsen
      const fields = typeof config.fields === 'string' ? JSON.parse(config.fields) : config.fields;
      const normalizedConfig = { ...config, fields };
      localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(normalizedConfig));
      return normalizedConfig;
    }
    throw new Error('Invalid config');
  } catch {
    // Fallback auf localStorage
    if (USE_LOCAL_FALLBACK) {
      const saved = localStorage.getItem(VISIBILITY_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore parse error
        }
      }
    }
    return defaultVisibilityConfigV2;
  }
}

/**
 * Sichtbarkeitseinstellungen speichern (API mit localStorage Fallback)
 */
export async function saveVisibilitySettings(config: VisibilityConfigV2): Promise<boolean> {
  // Immer in localStorage speichern
  localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(config));

  try {
    // Versuche zuerst zu aktualisieren, falls ID existiert
    if (config.id) {
      await apiFetch(`update/visibility/${config.id}`, {
        method: 'PUT',
        body: JSON.stringify(config),
      });
    } else {
      // Neu erstellen mit default ID
      await apiFetch('create/visibility', {
        method: 'POST',
        body: JSON.stringify({ ...config, id: 'default' }),
      });
    }
    return true;
  } catch {
    // API fehlgeschlagen, aber localStorage wurde gespeichert
    console.warn('API nicht erreichbar, Einstellungen nur lokal gespeichert');
    return false;
  }
}

// ============================================
// API STATUS CHECK
// ============================================

/**
 * Prüfen ob die API erreichbar ist
 */
export async function checkApiStatus(): Promise<boolean> {
  try {
    await apiFetch('health');
    return true;
  } catch {
    return false;
  }
}

// ============================================
// TENANT API
// ============================================

/**
 * Tenant-Daten abrufen
 */
export async function getTenant(tenantId: string): Promise<Tenant | null> {
  try {
    const response = await apiFetch<{ data: Tenant } | Tenant>(
      `read/tenants/${encodeURIComponent(tenantId)}`
    );
    return 'data' in response ? response.data : response;
  } catch {
    return null;
  }
}

/**
 * Alle Tenants abrufen (Admin)
 */
export async function getTenants(): Promise<Tenant[]> {
  try {
    const response = await apiFetch<{ data: Tenant[] } | Tenant[]>('read/tenants');
    return Array.isArray(response) ? response : response.data || [];
  } catch {
    return [];
  }
}

// ============================================
// MASTER-DATEN API (mit Caching)
// ============================================

/**
 * Produktkategorien abrufen (gecached)
 */
export async function getCategories(): Promise<Category[]> {
  const cacheKey = 'categories';
  const cached = getCached<Category[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch<{ data: Category[] } | Category[]>('read/categories');
    const data = Array.isArray(response) ? response : response.data || [];

    // Parsen von JSON-Strings falls nötig
    const categories = data.map(cat => ({
      ...cat,
      regulations: typeof cat.regulations === 'string'
        ? JSON.parse(cat.regulations)
        : cat.regulations || [],
      subcategories: typeof cat.subcategories === 'string'
        ? JSON.parse(cat.subcategories)
        : cat.subcategories || [],
    }));

    setCache(cacheKey, categories, CACHE_TTL.categories);

    // In localStorage für Offline-Fallback speichern
    if (USE_LOCAL_FALLBACK) {
      localStorage.setItem('dpp-categories-cache', JSON.stringify(categories));
    }

    return categories;
  } catch {
    // Fallback auf localStorage
    if (USE_LOCAL_FALLBACK) {
      const saved = localStorage.getItem('dpp-categories-cache');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore
        }
      }
    }
    return [];
  }
}

/**
 * Länder abrufen (gecached)
 */
export async function getCountries(): Promise<Country[]> {
  const cacheKey = 'countries';
  const cached = getCached<Country[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch<{ data: Country[] } | Country[]>('read/countries');
    const data = Array.isArray(response) ? response : response.data || [];

    const countries = data.map(c => ({
      ...c,
      authorities: typeof c.authorities === 'string'
        ? JSON.parse(c.authorities)
        : c.authorities || [],
    }));

    setCache(cacheKey, countries, CACHE_TTL.countries);

    if (USE_LOCAL_FALLBACK) {
      localStorage.setItem('dpp-countries-cache', JSON.stringify(countries));
    }

    return countries;
  } catch {
    if (USE_LOCAL_FALLBACK) {
      const saved = localStorage.getItem('dpp-countries-cache');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore
        }
      }
    }
    return [];
  }
}

/**
 * EU-Regulierungen abrufen (gecached)
 */
export async function getEURegulations(): Promise<EURegulation[]> {
  const cacheKey = 'euRegulations';
  const cached = getCached<EURegulation[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch<{ data: EURegulation[] } | EURegulation[]>('read/regulations_eu');
    const data = Array.isArray(response) ? response : response.data || [];

    const regulations = data.map(reg => ({
      ...reg,
      keyRequirements: typeof reg.keyRequirements === 'string'
        ? JSON.parse(reg.keyRequirements)
        : reg.keyRequirements || [],
      affectedProducts: typeof reg.affectedProducts === 'string'
        ? JSON.parse(reg.affectedProducts)
        : reg.affectedProducts || [],
      dppDeadlines: typeof reg.dppDeadlines === 'string'
        ? JSON.parse(reg.dppDeadlines)
        : reg.dppDeadlines || {},
    }));

    setCache(cacheKey, regulations, CACHE_TTL.euRegulations);

    if (USE_LOCAL_FALLBACK) {
      localStorage.setItem('dpp-eu-regulations-cache', JSON.stringify(regulations));
    }

    return regulations;
  } catch {
    if (USE_LOCAL_FALLBACK) {
      const saved = localStorage.getItem('dpp-eu-regulations-cache');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore
        }
      }
    }
    return [];
  }
}

/**
 * Nationale Regulierungen abrufen (gecached, optional nach Land gefiltert)
 */
export async function getNationalRegulations(countryCode?: string): Promise<NationalRegulation[]> {
  const cacheKey = `nationalRegulations:${countryCode || 'all'}`;
  const cached = getCached<NationalRegulation[]>(cacheKey);
  if (cached) return cached;

  try {
    let response;
    if (countryCode) {
      response = await apiFetch<{ data: NationalRegulation[] } | NationalRegulation[]>(
        'search/regulations_national',
        {
          method: 'POST',
          body: JSON.stringify({ country_code: countryCode }),
        }
      );
    } else {
      response = await apiFetch<{ data: NationalRegulation[] } | NationalRegulation[]>(
        'read/regulations_national'
      );
    }

    const data = Array.isArray(response) ? response : response.data || [];

    const regulations = data.map(reg => ({
      ...reg,
      products: typeof reg.products === 'string'
        ? JSON.parse(reg.products)
        : reg.products || [],
    }));

    setCache(cacheKey, regulations, CACHE_TTL.nationalRegulations);

    return regulations;
  } catch {
    return [];
  }
}

/**
 * Piktogramme abrufen (gecached)
 */
export async function getPictograms(): Promise<Pictogram[]> {
  const cacheKey = 'pictograms';
  const cached = getCached<Pictogram[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch<{ data: Pictogram[] } | Pictogram[]>('read/pictograms');
    const data = Array.isArray(response) ? response : response.data || [];

    const pictograms = data.map(p => ({
      ...p,
      countries: typeof p.countries === 'string'
        ? JSON.parse(p.countries)
        : p.countries || [],
    }));

    setCache(cacheKey, pictograms, CACHE_TTL.pictograms);

    if (USE_LOCAL_FALLBACK) {
      localStorage.setItem('dpp-pictograms-cache', JSON.stringify(pictograms));
    }

    return pictograms;
  } catch {
    if (USE_LOCAL_FALLBACK) {
      const saved = localStorage.getItem('dpp-pictograms-cache');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore
        }
      }
    }
    return [];
  }
}

/**
 * Recycling-Codes abrufen (gecached)
 */
export async function getRecyclingCodes(): Promise<RecyclingCode[]> {
  const cacheKey = 'recyclingCodes';
  const cached = getCached<RecyclingCode[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch<{ data: RecyclingCode[] } | RecyclingCode[]>('read/recycling_codes');
    const data = Array.isArray(response) ? response : response.data || [];

    setCache(cacheKey, data, CACHE_TTL.recyclingCodes);

    if (USE_LOCAL_FALLBACK) {
      localStorage.setItem('dpp-recycling-codes-cache', JSON.stringify(data));
    }

    return data;
  } catch {
    if (USE_LOCAL_FALLBACK) {
      const saved = localStorage.getItem('dpp-recycling-codes-cache');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore
        }
      }
    }
    return [];
  }
}

/**
 * Checklist-Templates abrufen (gecached, gefiltert nach Land und Kategorie)
 */
export async function getChecklistTemplates(
  countryCode?: string,
  categoryKey?: string
): Promise<ChecklistTemplate[]> {
  const cacheKey = `checklistTemplates:${countryCode || 'all'}:${categoryKey || 'all'}`;
  const cached = getCached<ChecklistTemplate[]>(cacheKey);
  if (cached) return cached;

  try {
    const searchParams: Record<string, string> = {};
    if (countryCode) searchParams.country_code = countryCode;
    if (categoryKey) searchParams.category_key = categoryKey;

    let response;
    if (Object.keys(searchParams).length > 0) {
      response = await apiFetch<{ data: ChecklistTemplate[] } | ChecklistTemplate[]>(
        'search/checklist_templates',
        {
          method: 'POST',
          body: JSON.stringify(searchParams),
        }
      );
    } else {
      response = await apiFetch<{ data: ChecklistTemplate[] } | ChecklistTemplate[]>(
        'read/checklist_templates'
      );
    }

    const data = Array.isArray(response) ? response : response.data || [];

    const templates = data.map(t => ({
      ...t,
      tips: typeof t.tips === 'string' ? JSON.parse(t.tips) : t.tips || [],
      links: typeof t.links === 'string' ? JSON.parse(t.links) : t.links || [],
      documentTypes: typeof t.documentTypes === 'string'
        ? JSON.parse(t.documentTypes)
        : t.documentTypes || [],
      applicableProducts: typeof t.applicableProducts === 'string'
        ? JSON.parse(t.applicableProducts)
        : t.applicableProducts || [],
    }));

    setCache(cacheKey, templates, CACHE_TTL.checklistTemplates);

    return templates;
  } catch {
    return [];
  }
}

/**
 * News abrufen (gecached)
 */
export async function getNews(): Promise<NewsItem[]> {
  const cacheKey = 'news';
  const cached = getCached<NewsItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const response = await apiFetch<{ data: NewsItem[] } | NewsItem[]>('read/news');
    const data = Array.isArray(response) ? response : response.data || [];

    const news = data.map(n => ({
      ...n,
      countries: typeof n.countries === 'string'
        ? JSON.parse(n.countries)
        : n.countries || [],
      tags: typeof n.tags === 'string'
        ? JSON.parse(n.tags)
        : n.tags || [],
    }));

    setCache(cacheKey, news, CACHE_TTL.news);

    if (USE_LOCAL_FALLBACK) {
      localStorage.setItem('dpp-news-cache', JSON.stringify(news));
    }

    return news;
  } catch {
    if (USE_LOCAL_FALLBACK) {
      const saved = localStorage.getItem('dpp-news-cache');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Ignore
        }
      }
    }
    return [];
  }
}

// ============================================
// TENANT-DATEN API (Dokumente)
// ============================================

/**
 * Dokumente für aktuellen Tenant abrufen
 */
export async function getDocuments(productId?: string): Promise<Document[]> {
  if (!currentTenantId) {
    console.warn('Kein Tenant gesetzt - Dokumente können nicht geladen werden');
    return [];
  }

  try {
    const searchParams: Record<string, string> = { tenant_id: currentTenantId };
    if (productId) searchParams.product_id = productId;

    const response = await apiFetch<{ data: Document[] } | Document[]>(
      'search/documents',
      {
        method: 'POST',
        body: JSON.stringify(searchParams),
      }
    );

    return Array.isArray(response) ? response : response.data || [];
  } catch {
    return [];
  }
}

/**
 * Dokument erstellen
 */
export async function createDocument(
  doc: Omit<Document, 'id' | 'tenant_id' | 'uploadedAt'>
): Promise<{ success: boolean; id?: string }> {
  if (!currentTenantId) {
    return { success: false };
  }

  try {
    const response = await apiFetch<{ id?: string; _id?: string }>('create/documents', {
      method: 'POST',
      body: JSON.stringify({
        ...doc,
        tenant_id: currentTenantId,
        uploadedAt: new Date().toISOString(),
      }),
    });
    return { success: true, id: response.id || response._id };
  } catch {
    return { success: false };
  }
}

/**
 * Dokument aktualisieren
 */
export async function updateDocument(
  id: string,
  doc: Partial<Document>
): Promise<{ success: boolean }> {
  try {
    await apiFetch(`update/documents/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(doc),
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Dokument löschen
 */
export async function deleteDocument(id: string): Promise<{ success: boolean }> {
  try {
    await apiFetch(`delete/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ============================================
// TENANT-DATEN API (Supply Chain)
// ============================================

/**
 * Supply Chain Einträge für ein Produkt abrufen
 */
export async function getSupplyChain(productId: string): Promise<SupplyChainEntry[]> {
  if (!currentTenantId) {
    return [];
  }

  try {
    const response = await apiFetch<{ data: SupplyChainEntry[] } | SupplyChainEntry[]>(
      'search/supply_chain',
      {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: currentTenantId,
          product_id: productId,
        }),
      }
    );

    const data = Array.isArray(response) ? response : response.data || [];
    return data.sort((a, b) => a.step - b.step);
  } catch {
    return [];
  }
}

/**
 * Supply Chain Eintrag erstellen
 */
export async function createSupplyChainEntry(
  entry: Omit<SupplyChainEntry, 'id' | 'tenant_id'>
): Promise<{ success: boolean; id?: string }> {
  if (!currentTenantId) {
    return { success: false };
  }

  try {
    const response = await apiFetch<{ id?: string; _id?: string }>('create/supply_chain', {
      method: 'POST',
      body: JSON.stringify({
        ...entry,
        tenant_id: currentTenantId,
      }),
    });
    return { success: true, id: response.id || response._id };
  } catch {
    return { success: false };
  }
}

/**
 * Supply Chain Eintrag aktualisieren
 */
export async function updateSupplyChainEntry(
  id: string,
  entry: Partial<SupplyChainEntry>
): Promise<{ success: boolean }> {
  try {
    await apiFetch(`update/supply_chain/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(entry),
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Supply Chain Eintrag löschen
 */
export async function deleteSupplyChainEntry(id: string): Promise<{ success: boolean }> {
  try {
    await apiFetch(`delete/supply_chain/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ============================================
// TENANT-DATEN API (Checklist Progress)
// ============================================

/**
 * Checklist-Fortschritt für ein Produkt oder global abrufen
 */
export async function getChecklistProgress(productId?: string): Promise<ChecklistProgress[]> {
  if (!currentTenantId) {
    return [];
  }

  try {
    const searchParams: Record<string, string> = { tenant_id: currentTenantId };
    if (productId) searchParams.product_id = productId;

    const response = await apiFetch<{ data: ChecklistProgress[] } | ChecklistProgress[]>(
      'search/checklist_progress',
      {
        method: 'POST',
        body: JSON.stringify(searchParams),
      }
    );

    return Array.isArray(response) ? response : response.data || [];
  } catch {
    return [];
  }
}

/**
 * Checklist-Fortschritt aktualisieren oder erstellen (Upsert)
 */
export async function updateChecklistProgress(
  checklistItemId: string,
  data: Partial<Omit<ChecklistProgress, 'id' | 'tenant_id' | 'checklist_item_id'>>,
  productId?: string
): Promise<{ success: boolean; id?: string }> {
  if (!currentTenantId) {
    return { success: false };
  }

  try {
    // Prüfen ob bereits existiert
    const existing = await apiFetch<{ data: ChecklistProgress[] } | ChecklistProgress[]>(
      'search/checklist_progress',
      {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: currentTenantId,
          checklist_item_id: checklistItemId,
          ...(productId && { product_id: productId }),
        }),
      }
    );

    const existingData = Array.isArray(existing) ? existing : existing.data || [];

    if (existingData.length > 0) {
      // Update
      await apiFetch(`update/checklist_progress/${encodeURIComponent(existingData[0].id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...data,
          updatedAt: new Date().toISOString(),
        }),
      });
      return { success: true, id: existingData[0].id };
    } else {
      // Create
      const response = await apiFetch<{ id?: string; _id?: string }>('create/checklist_progress', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          tenant_id: currentTenantId,
          checklist_item_id: checklistItemId,
          product_id: productId || null,
          updatedAt: new Date().toISOString(),
        }),
      });
      return { success: true, id: response.id || response._id };
    }
  } catch {
    return { success: false };
  }
}

// ============================================
// TENANT-DATEN API (Lieferanten)
// ============================================

/**
 * Alle Lieferanten für aktuellen Tenant abrufen
 */
export async function getSuppliers(): Promise<Supplier[]> {
  if (!currentTenantId) {
    return [];
  }

  try {
    const response = await apiFetch<{ data: Supplier[] } | Supplier[]>(
      'search/suppliers',
      {
        method: 'POST',
        body: JSON.stringify({ tenant_id: currentTenantId }),
      }
    );

    const data = Array.isArray(response) ? response : response.data || [];

    // Parse certifications wenn als String gespeichert
    return data.map(s => ({
      ...s,
      certifications: typeof s.certifications === 'string'
        ? JSON.parse(s.certifications)
        : s.certifications || [],
    }));
  } catch {
    return [];
  }
}

/**
 * Einzelnen Lieferanten abrufen
 */
export async function getSupplier(id: string): Promise<Supplier | null> {
  try {
    const response = await apiFetch<{ data: Supplier } | Supplier>(
      `read/suppliers/${encodeURIComponent(id)}`
    );
    const supplier = 'data' in response ? response.data : response;
    return {
      ...supplier,
      certifications: typeof supplier.certifications === 'string'
        ? JSON.parse(supplier.certifications)
        : supplier.certifications || [],
    };
  } catch {
    return null;
  }
}

/**
 * Lieferant erstellen
 */
export async function createSupplier(
  supplier: Omit<Supplier, 'id' | 'tenant_id' | 'createdAt'>
): Promise<{ success: boolean; id?: string }> {
  if (!currentTenantId) {
    return { success: false };
  }

  try {
    const response = await apiFetch<{ id?: string; _id?: string }>('create/suppliers', {
      method: 'POST',
      body: JSON.stringify({
        ...supplier,
        certifications: JSON.stringify(supplier.certifications || []),
        tenant_id: currentTenantId,
        createdAt: new Date().toISOString(),
      }),
    });
    return { success: true, id: response.id || response._id };
  } catch {
    return { success: false };
  }
}

/**
 * Lieferant aktualisieren
 */
export async function updateSupplier(
  id: string,
  supplier: Partial<Supplier>
): Promise<{ success: boolean }> {
  try {
    const updateData = { ...supplier };
    if (supplier.certifications) {
      updateData.certifications = JSON.stringify(supplier.certifications) as unknown as string[];
    }
    updateData.updatedAt = new Date().toISOString();

    await apiFetch(`update/suppliers/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Lieferant löschen
 */
export async function deleteSupplier(id: string): Promise<{ success: boolean }> {
  try {
    await apiFetch(`delete/suppliers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ============================================
// TENANT-DATEN API (Lieferant-Produkt-Zuordnung)
// ============================================

/**
 * Produkte eines Lieferanten abrufen
 */
export async function getSupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
  if (!currentTenantId) {
    return [];
  }

  try {
    const response = await apiFetch<{ data: SupplierProduct[] } | SupplierProduct[]>(
      'search/supplier_products',
      {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: currentTenantId,
          supplier_id: supplierId,
        }),
      }
    );

    return Array.isArray(response) ? response : response.data || [];
  } catch {
    return [];
  }
}

/**
 * Lieferanten für ein Produkt abrufen
 */
export async function getProductSuppliers(productId: string): Promise<SupplierProduct[]> {
  if (!currentTenantId) {
    return [];
  }

  try {
    const response = await apiFetch<{ data: SupplierProduct[] } | SupplierProduct[]>(
      'search/supplier_products',
      {
        method: 'POST',
        body: JSON.stringify({
          tenant_id: currentTenantId,
          product_id: productId,
        }),
      }
    );

    return Array.isArray(response) ? response : response.data || [];
  } catch {
    return [];
  }
}

/**
 * Produkt zu Lieferant zuordnen
 */
export async function assignProductToSupplier(
  data: Omit<SupplierProduct, 'id' | 'tenant_id' | 'createdAt'>
): Promise<{ success: boolean; id?: string }> {
  if (!currentTenantId) {
    return { success: false };
  }

  try {
    const response = await apiFetch<{ id?: string; _id?: string }>('create/supplier_products', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        tenant_id: currentTenantId,
        createdAt: new Date().toISOString(),
      }),
    });
    return { success: true, id: response.id || response._id };
  } catch {
    return { success: false };
  }
}

/**
 * Produkt-Lieferant-Zuordnung aktualisieren
 */
export async function updateSupplierProduct(
  id: string,
  data: Partial<SupplierProduct>
): Promise<{ success: boolean }> {
  try {
    await apiFetch(`update/supplier_products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

/**
 * Produkt-Lieferant-Zuordnung entfernen
 */
export async function removeProductFromSupplier(id: string): Promise<{ success: boolean }> {
  try {
    await apiFetch(`delete/supplier_products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ============================================
// CACHE MANAGEMENT
// ============================================

/**
 * Cache leeren (für bestimmtes Pattern oder komplett)
 */
export function invalidateCache(pattern?: string): void {
  clearCache(pattern);
}

/**
 * Alle Master-Daten vorladen (für schnelleren initialen Zugriff)
 */
export async function preloadMasterData(): Promise<void> {
  await Promise.all([
    getCategories(),
    getCountries(),
    getEURegulations(),
    getPictograms(),
    getRecyclingCodes(),
    getNews(),
  ]);
}
