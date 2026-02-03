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
    tenant_id: row.tenant_id || undefined,
    translations: (row.translations as Record<string, string>) || undefined,
    subcategory_translations: (row.subcategory_translations as Record<string, Record<string, string>>) || undefined,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    penalties: (row as any).penalties || undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enforcementBody: (row as any).enforcement_body || undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    officialReference: (row as any).official_reference || undefined,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    regulationId: (row as any).regulation_id || undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requiredDocumentCategories: (row as any).required_document_categories || undefined,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    imageUrl: (row as any).image_url || undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source: (row as any).source || undefined,
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
// WRITE OPERATIONS
// ============================================

type WriteResult = { success: boolean; error?: string };

// --- COUNTRIES ---

export async function createCountry(data: Omit<Country, 'id'>): Promise<WriteResult> {
  const { error } = await supabase.from('countries').insert({
    code: data.code,
    name: data.name,
    flag: data.flag,
    regulations: data.regulations,
    checklists: data.checklists,
    authorities: data.authorities,
    description: data.description,
  });
  if (error) return { success: false, error: error.message };
  invalidateCache('countries');
  return { success: true };
}

export async function updateCountry(id: string, data: Partial<Country>): Promise<WriteResult> {
  const update: Record<string, unknown> = {};
  if (data.code !== undefined) update.code = data.code;
  if (data.name !== undefined) update.name = data.name;
  if (data.flag !== undefined) update.flag = data.flag;
  if (data.regulations !== undefined) update.regulations = data.regulations;
  if (data.checklists !== undefined) update.checklists = data.checklists;
  if (data.authorities !== undefined) update.authorities = data.authorities;
  if (data.description !== undefined) update.description = data.description;

  const { error } = await supabase.from('countries').update(update).eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('countries');
  return { success: true };
}

export async function deleteCountry(id: string): Promise<WriteResult> {
  const { error } = await supabase.from('countries').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('countries');
  return { success: true };
}

// --- CATEGORIES ---

export async function createCategory(data: Omit<Category, 'id'>): Promise<WriteResult & { id?: string }> {
  const { data: rows, error } = await supabase.from('categories').insert({
    name: data.name,
    description: data.description,
    icon: data.icon,
    regulations: data.regulations,
    sort_order: data.sort_order,
    parent_id: data.parent_id,
    subcategories: data.subcategories,
    tenant_id: data.tenant_id,
    translations: data.translations || {},
    subcategory_translations: data.subcategory_translations || {},
  }).select('id').single();
  if (error) return { success: false, error: error.message };
  invalidateCache('categories');
  return { success: true, id: rows?.id };
}

export async function addSubcategoryToCategory(
  categoryId: string,
  name: string,
  translations?: Record<string, string>,
): Promise<WriteResult> {
  // Fetch current category
  const { data: row, error: fetchError } = await supabase
    .from('categories')
    .select('subcategories, subcategory_translations')
    .eq('id', categoryId)
    .single();
  if (fetchError || !row) return { success: false, error: fetchError?.message || 'Category not found' };

  const existing = (row.subcategories as string[]) || [];
  if (existing.includes(name)) {
    return { success: false, error: 'Subcategory already exists' };
  }

  const existingTranslations = (row.subcategory_translations as Record<string, Record<string, string>>) || {};
  const updatedTranslations = { ...existingTranslations };
  if (translations) {
    updatedTranslations[name] = translations;
  }

  const { error } = await supabase
    .from('categories')
    .update({
      subcategories: [...existing, name],
      subcategory_translations: updatedTranslations,
    })
    .eq('id', categoryId);
  if (error) return { success: false, error: error.message };
  invalidateCache('categories');
  return { success: true };
}

export async function updateCategory(id: string, data: Partial<Category>): Promise<WriteResult> {
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.icon !== undefined) update.icon = data.icon;
  if (data.regulations !== undefined) update.regulations = data.regulations;
  if (data.sort_order !== undefined) update.sort_order = data.sort_order;
  if (data.parent_id !== undefined) update.parent_id = data.parent_id;
  if (data.subcategories !== undefined) update.subcategories = data.subcategories;

  const { error } = await supabase.from('categories').update(update).eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('categories');
  return { success: true };
}

export async function deleteCategory(id: string): Promise<WriteResult> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('categories');
  return { success: true };
}

// --- PICTOGRAMS ---

export async function createPictogram(data: Omit<Pictogram, 'id'>): Promise<WriteResult> {
  const { error } = await supabase.from('pictograms').insert({
    symbol: data.symbol,
    name: data.name,
    description: data.description,
    mandatory: data.mandatory,
    countries: data.countries,
    category: data.category,
    dimensions: data.dimensions,
    placement: data.placement,
  });
  if (error) return { success: false, error: error.message };
  invalidateCache('pictograms');
  return { success: true };
}

export async function updatePictogram(id: string, data: Partial<Pictogram>): Promise<WriteResult> {
  const update: Record<string, unknown> = {};
  if (data.symbol !== undefined) update.symbol = data.symbol;
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.mandatory !== undefined) update.mandatory = data.mandatory;
  if (data.countries !== undefined) update.countries = data.countries;
  if (data.category !== undefined) update.category = data.category;
  if (data.dimensions !== undefined) update.dimensions = data.dimensions;
  if (data.placement !== undefined) update.placement = data.placement;

  const { error } = await supabase.from('pictograms').update(update).eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('pictograms');
  return { success: true };
}

export async function deletePictogram(id: string): Promise<WriteResult> {
  const { error } = await supabase.from('pictograms').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('pictograms');
  return { success: true };
}

// --- RECYCLING CODES ---

export async function createRecyclingCode(data: Omit<RecyclingCode, 'id'>): Promise<WriteResult> {
  const { error } = await supabase.from('recycling_codes').insert({
    code: data.code,
    symbol: data.symbol,
    name: data.name,
    full_name: data.fullName,
    examples: data.examples,
    recyclable: data.recyclable,
  });
  if (error) return { success: false, error: error.message };
  invalidateCache('recyclingCodes');
  return { success: true };
}

export async function updateRecyclingCode(id: string, data: Partial<RecyclingCode>): Promise<WriteResult> {
  const update: Record<string, unknown> = {};
  if (data.code !== undefined) update.code = data.code;
  if (data.symbol !== undefined) update.symbol = data.symbol;
  if (data.name !== undefined) update.name = data.name;
  if (data.fullName !== undefined) update.full_name = data.fullName;
  if (data.examples !== undefined) update.examples = data.examples;
  if (data.recyclable !== undefined) update.recyclable = data.recyclable;

  const { error } = await supabase.from('recycling_codes').update(update).eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('recyclingCodes');
  return { success: true };
}

export async function deleteRecyclingCode(id: string): Promise<WriteResult> {
  const { error } = await supabase.from('recycling_codes').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('recyclingCodes');
  return { success: true };
}

// --- NEWS ITEMS ---

export async function createNewsItem(data: Omit<NewsItem, 'id'>): Promise<WriteResult> {
  const { error } = await supabase.from('news_items').insert({
    title: data.title,
    summary: data.summary,
    content: data.content,
    category: data.category,
    countries: data.countries,
    published_at: data.publishedAt,
    effective_date: data.effectiveDate || null,
    priority: data.priority,
    tags: data.tags,
    link: data.link || null,
  });
  if (error) return { success: false, error: error.message };
  invalidateCache('news');
  return { success: true };
}

export async function updateNewsItem(id: string, data: Partial<NewsItem>): Promise<WriteResult> {
  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.summary !== undefined) update.summary = data.summary;
  if (data.content !== undefined) update.content = data.content;
  if (data.category !== undefined) update.category = data.category;
  if (data.countries !== undefined) update.countries = data.countries;
  if (data.publishedAt !== undefined) update.published_at = data.publishedAt;
  if (data.effectiveDate !== undefined) update.effective_date = data.effectiveDate || null;
  if (data.priority !== undefined) update.priority = data.priority;
  if (data.tags !== undefined) update.tags = data.tags;
  if (data.link !== undefined) update.link = data.link || null;

  const { error } = await supabase.from('news_items').update(update).eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('news');
  return { success: true };
}

export async function deleteNewsItem(id: string): Promise<WriteResult> {
  const { error } = await supabase.from('news_items').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('news');
  return { success: true };
}

// --- EU REGULATIONS ---

export async function createEURegulation(data: Omit<EURegulation, 'id'>): Promise<WriteResult> {
  const { error } = await supabase.from('eu_regulations').insert({
    name: data.name,
    full_name: data.fullName,
    description: data.description,
    category: data.category,
    status: data.status,
    effective_date: data.effectiveDate,
    application_date: data.applicationDate,
    key_requirements: data.keyRequirements,
    affected_products: data.affectedProducts,
    dpp_deadlines: data.dppDeadlines,
    link: data.link || null,
  });
  if (error) return { success: false, error: error.message };
  invalidateCache('euRegulations');
  return { success: true };
}

export async function updateEURegulation(id: string, data: Partial<EURegulation>): Promise<WriteResult> {
  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.fullName !== undefined) update.full_name = data.fullName;
  if (data.description !== undefined) update.description = data.description;
  if (data.category !== undefined) update.category = data.category;
  if (data.status !== undefined) update.status = data.status;
  if (data.effectiveDate !== undefined) update.effective_date = data.effectiveDate;
  if (data.applicationDate !== undefined) update.application_date = data.applicationDate;
  if (data.keyRequirements !== undefined) update.key_requirements = data.keyRequirements;
  if (data.affectedProducts !== undefined) update.affected_products = data.affectedProducts;
  if (data.dppDeadlines !== undefined) update.dpp_deadlines = data.dppDeadlines;
  if (data.link !== undefined) update.link = data.link || null;

  const { error } = await supabase.from('eu_regulations').update(update).eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('euRegulations');
  return { success: true };
}

export async function deleteEURegulation(id: string): Promise<WriteResult> {
  const { error } = await supabase.from('eu_regulations').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
  invalidateCache('euRegulations');
  return { success: true };
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
