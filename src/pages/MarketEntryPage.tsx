import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { blurIn, useReducedMotion } from '@/lib/motion';
import {
  Globe2,
  Sparkles,
  Loader2,
  ListChecks,
  AlertTriangle,
  ClipboardCheck,
  ArrowRight,
  Calculator,
  RefreshCcw,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { KPIGrid, type KPIItem } from '@/components/ui/kpi-grid';
import { EmptyState } from '@/components/ui/state-feedback';
import { KnowledgeHero } from '@/components/knowledge/KnowledgeHero';
import { MarketEntryStepper, StepHeading } from '@/components/market-entry/MarketEntryStepper';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PageContainer } from '@/components/layout/page-container';
import { AIAnalysisCard } from '@/components/ai/AIAnalysisCard';
import { CountrySelectGrid } from '@/components/market-entry/CountrySelectGrid';
import { CategoryFeatureStep } from '@/components/market-entry/CategoryFeatureStep';
import { RequirementsMatrix } from '@/components/market-entry/RequirementsMatrix';
import { useAIStream } from '@/hooks/use-ai-stream';
import { useLocale } from '@/hooks/use-locale';
import {
  getMarketEntryCountries,
  getMarketEntryRequirements,
  type MarketEntryCategory,
  type MarketEntryResult,
} from '@/services/supabase';
import {
  buildMarketEntryMessages,
  type MarketEntryFeatures,
} from '@/services/openrouter/market-entry-prompts';
import type { Country } from '@/types/database';

const CATEGORY_LABEL_KEYS: Record<MarketEntryCategory, string> = {
  electronics: 'Electronics',
  textiles: 'Textiles',
  toys: 'Toys',
  furniture: 'Furniture',
  cosmetics: 'Cosmetics',
  general: 'General Goods',
};

export function MarketEntryPage() {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();

  // Master data
  const [countries, setCountries] = useState<Country[]>([]);
  const [curatedCodes, setCuratedCodes] = useState<string[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(true);

  // Selection state
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MarketEntryCategory | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState('');
  const [features, setFeatures] = useState<MarketEntryFeatures>({
    hasElectronics: false,
    hasBattery: false,
    hasWireless: false,
  });

  // Results — `null` while a selection exists means "loading" (cleared by the
  // selection handlers, filled asynchronously by the effect below).
  const [result, setResult] = useState<MarketEntryResult | null>(null);

  // AI deep-dive
  const ai = useAIStream();
  const [aiVisible, setAiVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMarketEntryCountries()
      .then(({ countries: list, curatedCountryCodes }) => {
        if (cancelled) return;
        setCountries(list);
        setCuratedCodes(curatedCountryCodes);
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Load requirements whenever country + category are chosen
  useEffect(() => {
    // result is cleared synchronously by the selection handlers;
    // here we only load asynchronously when both selections are present.
    if (!selectedCountry || !selectedCategory) return;
    let cancelled = false;
    getMarketEntryRequirements(selectedCountry.code, selectedCategory).then((res) => {
      if (!cancelled) setResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCountry, selectedCategory]);

  const handleSelectCountry = useCallback((country: Country) => {
    setSelectedCountry(country);
    setAiVisible(false);
  }, []);

  const handleResetCountry = useCallback(() => {
    setSelectedCountry(null);
    setSelectedCategory(null);
    setResult(null);
    setAiVisible(false);
  }, []);

  const handleStartAI = useCallback(() => {
    if (!selectedCountry || !selectedCategory) return;
    setAiVisible(true);
    const categoryLabel = t(CATEGORY_LABEL_KEYS[selectedCategory]);
    const messages = buildMarketEntryMessages(
      selectedCountry.name,
      productName,
      categoryLabel,
      features,
      locale
    );
    void ai.startStream(messages, { maxTokens: 3000, temperature: 0.3 });
  }, [selectedCountry, selectedCategory, productName, features, locale, t, ai]);

  const stats = useMemo(() => {
    const reqs = result?.requirements ?? [];
    return {
      total: reqs.length,
      critical: reqs.filter((r) => r.priority === 'critical').length,
      mandatory: reqs.filter((r) => r.mandatory).length,
    };
  }, [result]);

  const isCurated = selectedCountry ? curatedCodes.includes(selectedCountry.code) : false;
  const showResults = Boolean(selectedCountry && selectedCategory);
  const resultLoading = showResults && result === null;
  const noCuratedData = showResults && !resultLoading && (!result?.available || result.requirements.length === 0);

  const MotionDiv = prefersReduced ? ('div' as const) : motion.div;
  const blurProps = prefersReduced
    ? {}
    : { variants: blurIn, initial: 'initial', animate: 'animate', exit: { opacity: 0, y: -6 } };

  const kpis: KPIItem[] = [
    {
      id: 'total',
      label: t('Requirements'),
      value: <AnimatedCounter value={stats.total} />,
      icon: <IconTile icon={ListChecks} size="sm" />,
    },
    {
      id: 'critical',
      label: t('Critical'),
      value: <AnimatedCounter value={stats.critical} />,
      icon: <IconTile icon={AlertTriangle} size="sm" tone="danger" />,
      accentClassName: stats.critical > 0 ? 'text-destructive' : undefined,
    },
    {
      id: 'mandatory',
      label: t('Mandatory'),
      value: <AnimatedCounter value={stats.mandatory} />,
      icon: <IconTile icon={ClipboardCheck} size="sm" tone="success" />,
    },
  ];

  return (
    <PageContainer size="full" padding={false}>
      <div className="space-y-5 sm:space-y-6">
        <KnowledgeHero
          icon={Globe2}
          eyebrow={t('Compliance & Knowledge')}
          title={t('Market Entry Check')}
          description={t('What do you need to sell your products in another country?')}
          actions={
            selectedCountry ? (
              <Button variant="outline" onClick={handleResetCountry}>
                <RefreshCcw className="h-4 w-4" />
                {t('Start over')}
              </Button>
            ) : undefined
          }
        >
          <MarketEntryStepper
            steps={[
              { label: t('Target market'), done: Boolean(selectedCountry), active: !selectedCountry },
              {
                label: t('Product'),
                done: Boolean(selectedCategory),
                active: Boolean(selectedCountry) && !selectedCategory,
              },
              { label: t('Requirements'), done: false, active: showResults },
            ]}
          />
        </KnowledgeHero>

        {/* Step 1: Country */}
        <Card className="gap-4 overflow-hidden">
          <CardHeader className="gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StepHeading step={1} label={t('Select Target Market')} done={Boolean(selectedCountry)} />
              {selectedCountry && (
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="inline-flex min-w-0 items-center gap-2 rounded-full border bg-muted/40 py-1 pl-1.5 pr-3">
                    <span className="text-2xl leading-none" aria-hidden="true">{selectedCountry.flag}</span>
                    <span className="truncate font-medium">{selectedCountry.name}</span>
                  </span>
                  {isCurated ? (
                    <Badge variant="outline" className="h-6 gap-1 border-success/30 bg-success/10 text-[11px] text-success">
                      <ShieldCheck className="h-3 w-3" />
                      {t('Verified Data')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="h-6 gap-1 border-primary/25 bg-primary/10 text-[11px] text-primary">
                      <Sparkles className="h-3 w-3" />
                      {t('AI-supported')}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetCountry}
                    className="h-11 text-muted-foreground sm:h-9"
                  >
                    {t('Change country')}
                  </Button>
                </div>
              )}
            </div>
            {!selectedCountry && (
              <CardDescription>
                {t('Countries with verified data show curated requirements — all others use the AI check.')}
              </CardDescription>
            )}
          </CardHeader>
          {!selectedCountry && (
            <CardContent>
              <CountrySelectGrid
                countries={countries}
                curatedCountryCodes={curatedCodes}
                selectedCode={null}
                onSelect={handleSelectCountry}
                loading={countriesLoading}
              />
            </CardContent>
          )}
        </Card>

        {/* Step 2: Category + product + features */}
        <AnimatePresence initial={false}>
          {selectedCountry && (
            <MotionDiv key="step2" {...blurProps}>
              <Card className="gap-4">
                <CardHeader>
                  <StepHeading step={2} label={t('Describe Your Product')} done={Boolean(selectedCategory)} />
                </CardHeader>
                <CardContent>
                  <CategoryFeatureStep
                    selectedCategory={selectedCategory}
                    onCategoryChange={(cat) => {
                      setSelectedCategory(cat);
                      setResult(null);
                      setAiVisible(false);
                    }}
                    selectedProductId={selectedProductId}
                    onProductChange={(id, name) => {
                      setSelectedProductId(id);
                      setProductName(name);
                    }}
                    features={features}
                    onFeaturesChange={setFeatures}
                  />
                </CardContent>
              </Card>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence initial={false} mode="wait">
          {showResults && (
            <MotionDiv
              key={`results-${selectedCountry?.code}-${selectedCategory}`}
              {...blurProps}
              className="space-y-5 sm:space-y-6"
            >
              <div className="flex items-center gap-2.5">
                <StepHeading step={3} label={t('Your Market Entry Requirements')} />
                {selectedCategory && (
                  <Badge variant="secondary" className="ml-auto shrink-0">
                    {t(CATEGORY_LABEL_KEYS[selectedCategory])}
                  </Badge>
                )}
              </div>

              {result && result.requirements.length > 0 && (
                <KPIGrid items={kpis} cols={{ base: 1, xs: 3 }} compact />
              )}

              {/* Matrix or empty/fallback state */}
              <RequirementsMatrix result={result} loading={resultLoading} />

              {noCuratedData && (
                <div className="rounded-2xl border border-dashed bg-card">
                  <EmptyState
                    icon={Globe2}
                    illustration={false}
                    title={t('No curated data for this combination yet')}
                    description={t('Curated data is coming soon — use the AI check below for a tailored market entry analysis.')}
                  />
                </div>
              )}

              {/* AI deep-dive */}
              <section className="relative isolate overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.08] via-transparent to-chart-2/[0.08]"
                />
                <div className="flex items-start gap-3">
                  <IconTile icon={Sparkles} size="md" />
                  <div className="min-w-0">
                    <h3 className="font-semibold">{t('AI Market Entry Analysis')}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {noCuratedData
                        ? t('Generate a complete, country-specific market entry analysis for your product.')
                        : t('Deepen the curated results with a tailored AI analysis for your product.')}
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {!aiVisible && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        onClick={handleStartAI}
                        disabled={ai.isStreaming}
                        className="relative h-11 gap-1.5 overflow-hidden border-0 bg-gradient-to-r from-primary to-chart-2 text-primary-foreground shadow-sm hover:opacity-95 sm:h-10"
                      >
                        {!prefersReduced && (
                          <div className="absolute inset-0 animate-shimmer" aria-hidden="true">
                            <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                          </div>
                        )}
                        {ai.isStreaming ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {t('Deepen with AI')}
                      </Button>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Info className="h-3.5 w-3.5" />
                        {t('Uses 1 AI credit')}
                      </span>
                    </div>
                  )}
                  {aiVisible && (
                    <AIAnalysisCard
                      text={ai.text}
                      isStreaming={ai.isStreaming}
                      error={ai.error}
                      onClose={() => {
                        setAiVisible(false);
                        ai.reset();
                      }}
                    />
                  )}
                </div>
              </section>

              {/* Cross links */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    to: `/checklists/${selectedCountry!.code}`,
                    icon: ListChecks,
                    title: t('Open Country Checklist'),
                    hint: t('Track every requirement step by step'),
                  },
                  {
                    to: '/requirements-calculator',
                    icon: Calculator,
                    title: t('Requirements Calculator'),
                    hint: t('Combine several markets and product features'),
                  },
                ].map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="group flex min-h-16 items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <IconTile icon={link.icon} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium leading-snug">{link.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">{link.hint}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary motion-reduce:transition-none" />
                  </Link>
                ))}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </PageContainer>
  );
}
