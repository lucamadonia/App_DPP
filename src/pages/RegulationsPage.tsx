import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Globe, Printer, Shield, Tag } from 'lucide-react';
import {
  getCountries,
  getEURegulations,
  getNationalRegulations,
  getPictograms,
  getRecyclingCodes,
  getNews,
} from '@/services/supabase';
import type {
  Country,
  EURegulation,
  NationalRegulation,
  Pictogram,
  RecyclingCode,
  NewsItem,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabs } from '@/components/ui/scrollable-tabs';
import { PageContainer } from '@/components/layout/page-container';
import { RegulationsOverview } from '@/components/regulations/RegulationsOverview';
import { RegulationsSkeleton } from '@/components/regulations/RegulationsSkeleton';
import { CountriesTab } from '@/components/regulations/CountriesTab';
import { EURegulationsTab } from '@/components/regulations/EURegulationsTab';
import { PictogramsReferenceTab } from '@/components/regulations/PictogramsReferenceTab';
import { collectMilestones, nextMilestone } from '@/components/regulations/regulation-milestones';
import { daysUntil, parseDeadline } from '@/components/regulations/regulation-dates';
import { downloadCsv } from '@/components/regulations/regulation-export';

type RegulationsTab = 'countries' | 'eu' | 'pictograms';
const TABS: RegulationsTab[] = ['countries', 'eu', 'pictograms'];

/** The tab lives in the URL (/regulations/eu …) so deep links and Back work. */
function tabFromPath(pathname: string): RegulationsTab {
  const seg = pathname.split('/').filter(Boolean)[1];
  return TABS.includes(seg as RegulationsTab) ? (seg as RegulationsTab) : 'countries';
}

export function RegulationsPage() {
  const { t } = useTranslation('compliance');
  const location = useLocation();
  const navigate = useNavigate();
  const tab = tabFromPath(location.pathname);
  const [isLoading, setIsLoading] = useState(true);

  const [countries, setCountries] = useState<Country[]>([]);
  const [euRegulations, setEURegulations] = useState<EURegulation[]>([]);
  const [countryRegulations, setCountryRegulations] = useState<Record<string, NationalRegulation[]>>({});
  const [pictograms, setPictograms] = useState<Pictogram[]>([]);
  const [recyclingCodes, setRecyclingCodes] = useState<RecyclingCode[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [countriesData, euRegsData, nationalRegsData, pictogramsData, recyclingCodesData, newsData] =
          await Promise.all([
            getCountries(),
            getEURegulations(),
            // Unfiltered: this used to be one request PER country, so opening the
            // page fired ~40 sequential round trips on a phone. The table is
            // small and RLS-free, so fetching it whole and grouping client-side
            // is both simpler and dramatically faster.
            getNationalRegulations(),
            getPictograms(),
            getRecyclingCodes(),
            getNews(),
          ]);

        setCountries(countriesData || []);
        setEURegulations(euRegsData || []);
        setPictograms(pictogramsData || []);
        setRecyclingCodes(recyclingCodesData || []);
        setNews(newsData || []);

        const nationalRegsMap: Record<string, NationalRegulation[]> = {};
        for (const reg of nationalRegsData || []) {
          (nationalRegsMap[reg.country_code] ??= []).push(reg);
        }
        setCountryRegulations(nationalRegsMap);
      } catch (error) {
        console.error('Error loading regulation data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const milestones = useMemo(() => collectMilestones(euRegulations), [euRegulations]);
  const next = useMemo(() => nextMilestone(milestones), [milestones]);
  const nationalAll = useMemo(() => Object.values(countryRegulations).flat(), [countryRegulations]);
  const euUpcoming = useMemo(
    () =>
      euRegulations.filter((r) => {
        const d = parseDeadline(r.applicationDate).date;
        return d ? daysUntil(d) > 0 : r.status === 'upcoming';
      }).length,
    [euRegulations],
  );

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    if (tab === 'countries') {
      const byCode = new Map(countries.map((c) => [c.code, c.name]));
      downloadCsv(
        `national-regulations-${stamp}.csv`,
        ['Country', 'Code', 'Regulation', 'Category', 'Mandatory', 'Effective', 'Authority', 'Penalties', 'Products', 'Link'],
        nationalAll.map((r) => [
          byCode.get(r.country_code) ?? r.country_code, r.country_code, r.name, r.category, r.mandatory,
          r.effectiveDate, r.authority, r.penalties, r.products.join(' | '), r.link,
        ]),
      );
    } else if (tab === 'eu') {
      downloadCsv(
        `eu-regulations-${stamp}.csv`,
        ['Regulation', 'Full name', 'Category', 'Status', 'Entered into force', 'Applies from', 'Reference', 'Enforcement', 'Penalties', 'DPP deadlines', 'Link'],
        euRegulations.map((r) => [
          r.name, r.fullName, r.category, r.status, r.effectiveDate, r.applicationDate, r.officialReference,
          r.enforcementBody, r.penalties,
          Object.entries(r.dppDeadlines ?? {}).map(([k, v]) => `${k}: ${v}`).join(' | '), r.link,
        ]),
      );
    } else {
      downloadCsv(
        `pictograms-${stamp}.csv`,
        ['Symbol', 'Name', 'Category', 'Mandatory', 'Countries', 'Dimensions', 'Placement', 'Description'],
        pictograms.map((p) => [p.symbol, p.name, p.category, p.mandatory, p.countries.join(' | '), p.dimensions, p.placement, p.description]),
      );
    }
  };

  if (isLoading) return <RegulationsSkeleton />;

  const tabMeta: Record<RegulationsTab, { label: string; icon: typeof Globe; count: number }> = {
    countries: { label: t('Countries'), icon: Globe, count: countries.length },
    eu: { label: t('EU Regulations'), icon: Shield, count: euRegulations.length },
    pictograms: { label: t('Pictograms'), icon: Tag, count: pictograms.length },
  };

  return (
    <PageContainer
      size="full"
      padding={false}
      title={t('Regulations & Compliance')}
      description={t('Comprehensive overview of EU and national regulations, pictograms, and recent developments')}
      actions={
        <>
          <Button variant="outline" onClick={handleExport} className="min-h-11 sm:min-h-9">
            <Download className="mr-2 h-4 w-4" />
            {t('Export', { ns: 'common' })}
          </Button>
          <Button variant="outline" onClick={() => window.print()} className="min-h-11 sm:min-h-9">
            <Printer className="mr-2 h-4 w-4" />
            {t('Print', { ns: 'common' })}
          </Button>
        </>
      }
    >
      <div className="min-w-0 space-y-6 sm:space-y-8">
        <RegulationsOverview
          countryCount={countries.length}
          euCount={euRegulations.length}
          euUpcoming={euUpcoming}
          nationalCount={nationalAll.length}
          mandatoryNational={nationalAll.filter((r) => r.mandatory).length}
          importantUpdates={news.filter((n) => n.priority === 'high').length}
          next={next}
          dueThisYear={milestones.filter((m) => m.days > 0 && m.days <= 365).length}
        />

        <Tabs
          value={tab}
          onValueChange={(v) => navigate(`/regulations/${v}`, { replace: true })}
          className="min-w-0 gap-5"
        >
          <ScrollableTabs className="min-w-0">
            <TabsList className="h-auto min-w-full sm:min-w-0 group-data-[orientation=horizontal]/tabs:h-auto">
              {TABS.map((id) => {
                const { label, icon: Icon, count } = tabMeta[id];
                return (
                  <TabsTrigger key={id} value={id} className="min-h-11 gap-2 px-3 sm:min-h-9 sm:px-4">
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                    <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums leading-5 text-muted-foreground">
                      {count}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollableTabs>

          <TabsContent value="countries" className="min-w-0">
            <CountriesTab countries={countries} regulationsByCountry={countryRegulations} />
          </TabsContent>
          <TabsContent value="eu" className="min-w-0">
            <EURegulationsTab regulations={euRegulations} milestones={milestones} />
          </TabsContent>
          <TabsContent value="pictograms" className="min-w-0">
            <PictogramsReferenceTab pictograms={pictograms} recyclingCodes={recyclingCodes} />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
