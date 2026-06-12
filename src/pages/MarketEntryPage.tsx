import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { blurIn, gridStagger, gridItem, useReducedMotion } from '@/lib/motion';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { PageHeader } from '@/components/ui/page-header';
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

function StepBadge({ step, label }: { step: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {step}
      </span>
      <span className="font-semibold">{label}</span>
    </div>
  );
}

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
    : { variants: blurIn, initial: 'initial', animate: 'animate' };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('Market Entry Check')}
        description={t('What do you need to sell your products in another country?')}
        actions={
          selectedCountry ? (
            <Button variant="outline" onClick={handleResetCountry} className="h-11 gap-1.5 sm:h-9">
              <RefreshCcw className="h-4 w-4" />
              {t('Start over')}
            </Button>
          ) : undefined
        }
      />

      {/* Step 1: Country */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <StepBadge step={1} label={t('Select Target Market')} />
            {selectedCountry && (
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">{selectedCountry.flag}</span>
                <span className="font-medium">{selectedCountry.name}</span>
                {isCurated && (
                  <Badge className="h-5 gap-1 px-1.5 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 hover:bg-emerald-100">
                    {t('Verified Data')}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetCountry}
                  className="h-9 text-muted-foreground"
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
            <Card>
              <CardHeader className="pb-4">
                <StepBadge step={2} label={t('Describe Your Product')} />
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
      <AnimatePresence initial={false}>
        {showResults && (
          <MotionDiv key={`results-${selectedCountry?.code}-${selectedCategory}`} {...blurProps} className="space-y-6">
            {/* KPI head */}
            {result && result.requirements.length > 0 && (
              <MotionDiv
                {...(prefersReduced
                  ? {}
                  : { variants: gridStagger, initial: 'initial', animate: 'animate' })}
                className="grid grid-cols-1 gap-3 sm:grid-cols-3"
              >
                {[
                  {
                    icon: ListChecks,
                    value: stats.total,
                    label: t('Requirements'),
                    accent: 'text-primary bg-primary/10',
                  },
                  {
                    icon: AlertTriangle,
                    value: stats.critical,
                    label: t('Critical'),
                    accent: 'text-red-600 bg-red-100 dark:bg-red-950/50 dark:text-red-400',
                  },
                  {
                    icon: ClipboardCheck,
                    value: stats.mandatory,
                    label: t('Mandatory'),
                    accent: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400',
                  },
                ].map((kpi) => (
                  <MotionDiv
                    key={kpi.label}
                    {...(prefersReduced ? {} : { variants: gridItem })}
                    className="flex items-center gap-3 rounded-xl border bg-card p-4"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.accent}`}>
                      <kpi.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <AnimatedCounter value={kpi.value} className="text-2xl font-bold" />
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </MotionDiv>
                ))}
              </MotionDiv>
            )}

            {/* Matrix or empty/fallback state */}
            <RequirementsMatrix result={result} loading={resultLoading} />

            {noCuratedData && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Globe2 className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-base">
                    {t('No curated data for this combination yet')}
                  </CardTitle>
                  <p className="max-w-md text-sm text-muted-foreground">
                    {t('Curated data is coming soon — use the AI check below for a tailored market entry analysis.')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* AI deep-dive */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  {t('AI Market Entry Analysis')}
                </CardTitle>
                <CardDescription>
                  {noCuratedData
                    ? t('Generate a complete, country-specific market entry analysis for your product.')
                    : t('Deepen the curated results with a tailored AI analysis for your product.')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!aiVisible && (
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      onClick={handleStartAI}
                      disabled={ai.isStreaming}
                      className="relative h-11 gap-1.5 overflow-hidden border-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 sm:h-10"
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
              </CardContent>
            </Card>

            {/* Cross links */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="h-11 justify-between gap-2 sm:h-10">
                <Link to={`/checklists/${selectedCountry!.code}`}>
                  <span className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4" />
                    {t('Open Country Checklist')}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 justify-between gap-2 sm:h-10">
                <Link to="/requirements-calculator">
                  <span className="flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    {t('Requirements Calculator')}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>
    </div>
  );
}
