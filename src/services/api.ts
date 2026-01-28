/**
 * API-Service für DPP Manager
 *
 * Verbindet das Frontend mit NoCodeBackend.com
 */

// NoCodeBackend Konfiguration
const NOCODEBACKEND_URL = 'https://api.nocodebackend.com';
const DATABASE_INSTANCE = '48395_mfg_ddp';
const SECRET_KEY = 'e4d980652106cfd48dd5786dbe25f9b4be24a4ba1adb33bc889e139d8ff3f5d7';

// Fallback auf localStorage wenn API nicht erreichbar
const USE_LOCAL_FALLBACK = true;

/**
 * Generische Fetch-Funktion mit NoCodeBackend Authentifizierung
 */
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${NOCODEBACKEND_URL}/${endpoint}`;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Instance': DATABASE_INSTANCE,
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
// PRODUKTE API
// ============================================

import type { Product } from '@/types/product';

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
