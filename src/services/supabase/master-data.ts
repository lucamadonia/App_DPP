/**
 * Supabase Master Data Service
 *
 * Lese-Zugriff auf Master-Daten (globale, geteilte Daten)
 * Keine RLS - diese Daten sind für alle Tenants lesbar
 */

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/supabase';
import type {
  Category,
  Country,
  EURegulation,
  NationalRegulation,
  Pictogram,
  RecyclingCode,
  ChecklistTemplate,
  NewsItem,
} from '@/types/database';

// In-memory cache
const cache: Map<string, { data: unknown; expiresAt: number }> = new Map();

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  categories: 24 * 60 * 60 * 1000, // 24 hours
  countries: 24 * 60 * 60 * 1000,
  euRegulations: 12 * 60 * 60 * 1000, // 12 hours
  nationalRegulations: 12 * 60 * 60 * 1000,
  pictograms: 24 * 60 * 60 * 1000,
  recyclingCodes: 24 * 60 * 60 * 1000,
  checklistTemplates: 6 * 60 * 60 * 1000, // 6 hours
  news: 1 * 60 * 60 * 1000, // 1 hour
};

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttl });
}

// ============================================
// CATEGORIES
// ============================================

type CategoryRow = Tables<'categories'>;

function transformCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    parent_id: row.parent_id || undefined,
    name: row.name,
    description: row.description || undefined,
    icon: row.icon || undefined,
    regulations: row.regulations || undefined,
    sort_order: row.sort_order || undefined,
    subcategories: row.subcategories || undefined,
  };
}

export async function getCategories(): Promise<Category[]> {
  const cacheKey = 'categories';
  const cached = getCached<Category[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Failed to load categories:', error);
    return [];
  }

  const categories = (data || []).map(transformCategory);
  setCache(cacheKey, categories, CACHE_TTL.categories);
  return categories;
}

// ============================================
// COUNTRIES
// ============================================

type CountryRow = Tables<'countries'>;

function transformCountry(row: CountryRow): Country {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    flag: row.flag,
    regulations: row.regulations,
    checklists: row.checklists,
    authorities: row.authorities,
    description: row.description,
  };
}

export async function getCountries(): Promise<Country[]> {
  const cacheKey = 'countries';
  const cached = getCached<Country[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('countries')
    .select('*')
    .order('name');

  if (error) {
    console.error('Failed to load countries:', error);
    return [];
  }

  const countries = (data || []).map(transformCountry);
  setCache(cacheKey, countries, CACHE_TTL.countries);
  return countries;
}

// ============================================
// EU REGULATIONS
// ============================================

type EURegulationRow = Tables<'eu_regulations'>;

function transformEURegulation(row: EURegulationRow): EURegulation {
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    description: row.description,
    category: row.category,
    status: row.status,
    effectiveDate: row.effective_date,
    applicationDate: row.application_date,
    keyRequirements: row.key_requirements,
    affectedProducts: row.affected_products,
    dppDeadlines: row.dpp_deadlines as Record<string, string>,
    link: row.link || undefined,
  };
}

export async function getEURegulations(): Promise<EURegulation[]> {
  const cacheKey = 'euRegulations';
  const cached = getCached<EURegulation[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('eu_regulations')
    .select('*')
    .order('effective_date');

  if (error) {
    console.error('Failed to load EU regulations:', error);
    return [];
  }

  const regulations = (data || []).map(transformEURegulation);
  setCache(cacheKey, regulations, CACHE_TTL.euRegulations);
  return regulations;
}

// ============================================
// NATIONAL REGULATIONS
// ============================================

type NationalRegulationRow = Tables<'national_regulations'>;

function transformNationalRegulation(row: NationalRegulationRow): NationalRegulation {
  return {
    id: row.id,
    country_code: row.country_code,
    name: row.name,
    description: row.description,
    category: row.category,
    mandatory: row.mandatory,
    effectiveDate: row.effective_date,
    authority: row.authority,
    penalties: row.penalties,
    products: row.products,
    link: row.link || undefined,
  };
}

export async function getNationalRegulations(countryCode?: string): Promise<NationalRegulation[]> {
  const cacheKey = `nationalRegulations:${countryCode || 'all'}`;
  const cached = getCached<NationalRegulation[]>(cacheKey);
  if (cached) return cached;

  let query = supabase
    .from('national_regulations')
    .select('*')
    .order('effective_date');

  if (countryCode) {
    query = query.eq('country_code', countryCode);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load national regulations:', error);
    return [];
  }

  const regulations = (data || []).map(transformNationalRegulation);
  setCache(cacheKey, regulations, CACHE_TTL.nationalRegulations);
  return regulations;
}

// ============================================
// PICTOGRAMS
// ============================================

type PictogramRow = Tables<'pictograms'>;

function transformPictogram(row: PictogramRow): Pictogram {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    description: row.description,
    mandatory: row.mandatory,
    countries: row.countries,
    category: row.category,
    dimensions: row.dimensions,
    placement: row.placement,
  };
}

export async function getPictograms(): Promise<Pictogram[]> {
  const cacheKey = 'pictograms';
  const cached = getCached<Pictogram[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('pictograms')
    .select('*')
    .order('name');

  if (error) {
    console.error('Failed to load pictograms:', error);
    return [];
  }

  const pictograms = (data || []).map(transformPictogram);
  setCache(cacheKey, pictograms, CACHE_TTL.pictograms);
  return pictograms;
}

// ============================================
// RECYCLING CODES
// ============================================

type RecyclingCodeRow = Tables<'recycling_codes'>;

function transformRecyclingCode(row: RecyclingCodeRow): RecyclingCode {
  return {
    id: row.id,
    code: row.code,
    symbol: row.symbol,
    name: row.name,
    fullName: row.full_name,
    examples: row.examples,
    recyclable: row.recyclable,
  };
}

export async function getRecyclingCodes(): Promise<RecyclingCode[]> {
  const cacheKey = 'recyclingCodes';
  const cached = getCached<RecyclingCode[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('recycling_codes')
    .select('*')
    .order('code');

  if (error) {
    console.error('Failed to load recycling codes:', error);
    return [];
  }

  const codes = (data || []).map(transformRecyclingCode);
  setCache(cacheKey, codes, CACHE_TTL.recyclingCodes);
  return codes;
}

// ============================================
// CHECKLIST TEMPLATES
// ============================================

type ChecklistTemplateRow = Tables<'checklist_templates'>;

function transformChecklistTemplate(row: ChecklistTemplateRow): ChecklistTemplate {
  return {
    id: row.id,
    country_code: row.country_code,
    category_key: row.category_key,
    title: row.title,
    description: row.description,
    detailedDescription: row.detailed_description || undefined,
    mandatory: row.mandatory,
    category: row.category,
    subcategory: row.subcategory || undefined,
    documentRequired: row.document_required,
    documentTypes: row.document_types || undefined,
    legalBasis: row.legal_basis || undefined,
    authority: row.authority || undefined,
    deadline: row.deadline || undefined,
    penalties: row.penalties || undefined,
    tips: row.tips || undefined,
    links: row.links as ChecklistTemplate['links'],
    applicableProducts: row.applicable_products || undefined,
    priority: row.priority,
    sort_order: row.sort_order || undefined,
  };
}

export async function getChecklistTemplates(
  countryCode?: string,
  categoryKey?: string
): Promise<ChecklistTemplate[]> {
  const cacheKey = `checklistTemplates:${countryCode || 'all'}:${categoryKey || 'all'}`;
  const cached = getCached<ChecklistTemplate[]>(cacheKey);
  if (cached) return cached;

  let query = supabase
    .from('checklist_templates')
    .select('*')
    .order('sort_order');

  if (countryCode) {
    query = query.eq('country_code', countryCode);
  }
  if (categoryKey) {
    query = query.eq('category_key', categoryKey);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load checklist templates:', error);
    return [];
  }

  const templates = (data || []).map(transformChecklistTemplate);
  setCache(cacheKey, templates, CACHE_TTL.checklistTemplates);
  return templates;
}

// ============================================
// NEWS
// ============================================

type NewsItemRow = Tables<'news_items'>;

function transformNewsItem(row: NewsItemRow): NewsItem {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    category: row.category,
    countries: row.countries,
    publishedAt: row.published_at,
    effectiveDate: row.effective_date || undefined,
    priority: row.priority,
    tags: row.tags,
    link: row.link || undefined,
  };
}

export async function getNews(): Promise<NewsItem[]> {
  const cacheKey = 'news';
  const cached = getCached<NewsItem[]>(cacheKey);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('news_items')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Failed to load news:', error);
    return [];
  }

  const news = (data || []).map(transformNewsItem);
  setCache(cacheKey, news, CACHE_TTL.news);
  return news;
}

// ============================================
// CACHE MANAGEMENT
// ============================================

export function invalidateCache(pattern?: string): void {
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
