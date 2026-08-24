/**
 * EU and national regulations for guests.
 *
 * RegulationsPage needs no changes at all: it has zero auth, tenant or billing
 * references, and every table it reads (countries, eu_regulations,
 * national_regulations, pictograms, recycling_codes, news_items) is RLS-free
 * and served through the anon client. Only the router was ever gating it.
 */
export { RegulationsPage as DiscoverRegulationsPage } from '@/pages/RegulationsPage';
