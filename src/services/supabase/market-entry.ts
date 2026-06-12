/**
 * Market Entry Requirements Service
 *
 * Read access to the curated `country_product_requirements` master data
 * table (global, no RLS — same pattern as countries/eu_regulations).
 *
 * Crash-safe by design: if the table does not exist yet (migration not
 * applied) or any query fails, the service resolves to an empty result
 * with `available: false` so the UI can fall back to the AI deep-dive.
 */

import { supabase } from '@/lib/supabase';
import { getCountries } from './master-data';
import type { Country } from '@/types/database';

export type MarketEntryCategory =
  | 'electronics'
  | 'textiles'
  | 'toys'
  | 'furniture'
  | 'cosmetics'
  | 'general';

export type MarketEntryRequirementType =
  | 'registration'
  | 'labeling'
  | 'language'
  | 'packaging'
  | 'disposal'
  | 'standards'
  | 'tax';

export type MarketEntryPriority = 'critical' | 'high' | 'medium' | 'low';

export interface MarketEntryLink {
  label: string;
  url: string;
}

export interface MarketEntryRequirement {
  id: string;
  countryCode: string;
  productCategory: MarketEntryCategory;
  requirementType: MarketEntryRequirementType;
  title: string;
  description: string;
  mandatory: boolean;
  applicableRegulations: string[];
  authority?: string;
  deadlineNote?: string;
  penaltiesSummary?: string;
  implementationSteps: string[];
  costEstimate?: string;
  links: MarketEntryLink[];
  priority: MarketEntryPriority;
}

export interface MarketEntryResult {
  /** All matching requirements (category-specific + 'general'), sorted by priority */
  requirements: MarketEntryRequirement[];
  /** Requirements grouped by type (only non-empty groups present) */
  grouped: Partial<Record<MarketEntryRequirementType, MarketEntryRequirement[]>>;
  /**
   * false when the master data table is unavailable (migration not applied)
   * or the query failed — UI should show the AI fallback hint.
   */
  available: boolean;
}

export interface MarketEntryCountriesResult {
  /** All countries from master data (for the picker, incl. AI-only countries) */
  countries: Country[];
  /** ISO codes of countries with curated requirement data */
  curatedCountryCodes: string[];
}

const PRIORITY_ORDER: Record<MarketEntryPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Display order of requirement type groups */
export const MARKET_ENTRY_TYPE_ORDER: MarketEntryRequirementType[] = [
  'registration',
  'labeling',
  'language',
  'packaging',
  'disposal',
  'standards',
  'tax',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformRequirement(row: any): MarketEntryRequirement {
  return {
    id: row.id,
    countryCode: row.country_code,
    productCategory: row.product_category,
    requirementType: row.requirement_type,
    title: row.title,
    description: row.description,
    mandatory: row.mandatory ?? true,
    applicableRegulations: row.applicable_regulations || [],
    authority: row.authority || undefined,
    deadlineNote: row.deadline_note || undefined,
    penaltiesSummary: row.penalties_summary || undefined,
    implementationSteps: row.implementation_steps || [],
    costEstimate: row.cost_estimate || undefined,
    links: Array.isArray(row.links) ? (row.links as MarketEntryLink[]) : [],
    priority: (row.priority as MarketEntryPriority) || 'high',
  };
}

function emptyResult(): MarketEntryResult {
  return { requirements: [], grouped: {}, available: false };
}

/**
 * Load curated market entry requirements for a country + category.
 * Always merges the country's 'general' entries (apply to all categories).
 */
export async function getMarketEntryRequirements(
  countryCode: string,
  category: MarketEntryCategory
): Promise<MarketEntryResult> {
  try {
    const categories = category === 'general' ? ['general'] : [category, 'general'];

    const { data, error } = await supabase
      .from('country_product_requirements')
      .select('*')
      .eq('country_code', countryCode.toUpperCase())
      .in('product_category', categories);

    if (error) {
      console.warn('Market entry requirements unavailable:', error.message);
      return emptyResult();
    }

    const requirements = (data || [])
      .map(transformRequirement)
      .sort(
        (a, b) =>
          PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
          a.title.localeCompare(b.title)
      );

    const grouped: MarketEntryResult['grouped'] = {};
    for (const req of requirements) {
      (grouped[req.requirementType] ||= []).push(req);
    }

    return { requirements, grouped, available: true };
  } catch (err) {
    console.warn('Market entry requirements unavailable:', err);
    return emptyResult();
  }
}

/**
 * Returns all countries for the picker plus the subset of country codes
 * that have curated requirement data ("Verified Data" badge). Countries
 * without curated data fall back to the AI deep-dive.
 */
export async function getMarketEntryCountries(): Promise<MarketEntryCountriesResult> {
  const countries = await getCountries();

  try {
    const { data, error } = await supabase
      .from('country_product_requirements')
      .select('country_code');

    if (error) {
      console.warn('Curated market entry countries unavailable:', error.message);
      return { countries, curatedCountryCodes: [] };
    }

    const curatedCountryCodes = Array.from(
      new Set((data || []).map((row: { country_code: string }) => row.country_code))
    );

    return { countries, curatedCountryCodes };
  } catch (err) {
    console.warn('Curated market entry countries unavailable:', err);
    return { countries, curatedCountryCodes: [] };
  }
}
