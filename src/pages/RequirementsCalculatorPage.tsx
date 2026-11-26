import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Calculator, Printer, SlidersHorizontal, Sparkles } from 'lucide-react';
import { blurIn, useReducedMotion } from '@/lib/motion';
import { Button } from '@/components/ui/button';
import { getRequirementsDatabase, type Requirement } from '@/data/requirements-database';
import { getProductCategories } from '@/data/product-categories';
import { getCountries, getPackagingMaterials } from '@/data/calculator-options';
import { isAIAvailable } from '@/services/openrouter';
import type { ProductContext, RequirementSummary } from '@/services/openrouter/types';
import { canPrint } from '@/lib/download-file';
import { AIAnalysisButton } from '@/components/ai/AIAnalysisButton';
import { AIAnalysisCard } from '@/components/ai/AIAnalysisCard';
import { AIOverallAssessment } from '@/components/ai/AIOverallAssessment';
import { AIActionPlan } from '@/components/ai/AIActionPlan';
import { AIAdditionalReqs } from '@/components/ai/AIAdditionalReqs';
import { AIChatPanel } from '@/components/ai/AIChatPanel';
import { PageContainer } from '@/components/layout/page-container';
import { KnowledgeHero } from '@/components/knowledge/KnowledgeHero';
import { CalculatorForm } from '@/components/requirements-calculator/CalculatorForm';
import { CalculatorResults } from '@/components/requirements-calculator/CalculatorResults';
import { useRequirementAnalysis } from '@/components/requirements-calculator/useRequirementAnalysis';
import {
  DEFAULT_CALCULATOR_CONFIG,
  calculateRequirements,
  type CalculatorConfig,
} from '@/components/requirements-calculator/calculator-logic';

export interface RequirementsCalculatorPageProps {
  /**
   * Overrides AI availability. Guest mode passes false: `streamCompletion`
   * needs a Supabase session token to reach the Edge Function, so every AI
   * control would fail with a 401 the moment it is pressed. Defaults to the
   * runtime check, i.e. today's behaviour.
   */
  aiEnabled?: boolean;
}

export function RequirementsCalculatorPage({ aiEnabled }: RequirementsCalculatorPageProps = {}) {
  const { t, i18n } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();

  // These datasets ship fully translated; use the locale-aware getters so a
  // German user reads German requirement names, categories, countries and
  // packaging materials throughout.
  const locale: 'en' | 'de' = i18n.language.startsWith('de') ? 'de' : 'en';
  const requirementsDatabase = useMemo(() => getRequirementsDatabase(locale), [locale]);
  const productCategories = useMemo(() => getProductCategories(locale), [locale]);
  const countries = useMemo(() => getCountries(locale), [locale]);
  const packagingMaterials = useMemo(() => getPackagingMaterials(locale), [locale]);

  const [config, setConfig] = useState<CalculatorConfig>(DEFAULT_CALCULATOR_CONFIG);
  const update = useCallback((patch: Partial<CalculatorConfig>) => {
    setConfig(prev => ({ ...prev, ...patch }));
  }, []);
  const [showResults, setShowResults] = useState(false);

  const aiAvailable = aiEnabled ?? isAIAvailable();
  const { analyses, startAnalysis, clearAnalysis } = useRequirementAnalysis();

  const categoryInfo = productCategories.find(c => c.id === config.selectedCategory);

  const requirements = useMemo(
    () => (showResults ? calculateRequirements(requirementsDatabase, config) : []),
    [showResults, requirementsDatabase, config]
  );

  // Product context for AI features
  const productContext = useMemo((): ProductContext => ({
    productName: config.productName || categoryInfo?.name || '',
    category: categoryInfo?.name || config.selectedCategory,
    subcategory: config.selectedSubcategory,
    countries: config.selectedCountries,
    hasElectronics: config.hasElectronics,
    hasBattery: config.hasBattery,
    batteryType: config.batteryType,
    hasWireless: config.hasWireless,
    wirelessTypes: config.selectedWirelessTypes,
    voltage: config.voltage,
    hasPackaging: config.hasPackaging,
    packagingMaterials: config.selectedPackagingMaterials,
    containsChemicals: config.containsChemicals,
    targetAudience: config.targetAudience,
    isConnected: config.isConnected,
  }), [config, categoryInfo]);

  const requirementSummaries = useMemo((): RequirementSummary[] =>
    requirements.map(r => ({
      id: r.id,
      name: r.name,
      priority: r.priority,
      category: r.category,
      description: r.description,
    })),
  [requirements]);

  // AI analysis controls inside an expanded requirement
  const renderAIAnalysis = (req: Requirement) => {
    if (!aiAvailable) return null;
    const analysis = analyses[req.id];
    const reqSummary: RequirementSummary = {
      id: req.id,
      name: req.name,
      priority: req.priority,
      category: req.category,
      description: req.description,
    };

    return (
      <div className="space-y-3 border-t pt-4">
        <AIAnalysisButton
          onClick={() => startAnalysis(req.id, productContext, reqSummary)}
          isStreaming={analysis?.isStreaming ?? false}
          hasResult={!!analysis?.text}
        />
        <AIAnalysisCard
          text={analysis?.text ?? ''}
          isStreaming={analysis?.isStreaming ?? false}
          error={analysis?.error ?? null}
          onClose={() => clearAnalysis(req.id)}
        />
      </div>
    );
  };

  const properties = [
    config.hasElectronics && t('Electronics'),
    config.hasBattery && t('Battery'),
    config.hasWireless && t('Wireless'),
    config.isConnected && t('Connected device'),
    config.containsChemicals && t('Chemicals'),
    config.hasPackaging && t('Packaging'),
  ].filter((p): p is string => Boolean(p));

  const handleCalculate = () => {
    setShowResults(true);
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  };

  const MotionDiv = prefersReduced ? ('div' as const) : motion.div;
  const viewProps = prefersReduced
    ? {}
    : { variants: blurIn, initial: 'initial', animate: 'animate', exit: { opacity: 0, y: -8 } };

  return (
    <PageContainer size="full" padding={false}>
      <div className="space-y-5 sm:space-y-6">
        <KnowledgeHero
          icon={Calculator}
          eyebrow={t('Compliance & Knowledge')}
          title={t('Requirements Calculator')}
          description={t('Determine all compliance requirements based on your product and target market')}
          actions={
            showResults ? (
              <>
                <Button variant="outline" onClick={() => setShowResults(false)}>
                  <SlidersHorizontal className="h-4 w-4" />
                  {t('Recalculate')}
                </Button>
                {canPrint() && (
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    {t('PDF Export')}
                  </Button>
                )}
              </>
            ) : undefined
          }
        >
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
              {t('{{count}} rules in the knowledge base', { count: requirementsDatabase.length })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1">
              {t('{{count}} markets', { count: countries.length })}
            </span>
            {aiAvailable && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {t('AI deep analysis available')}
              </span>
            )}
          </div>
        </KnowledgeHero>

        <AnimatePresence mode="wait" initial={false}>
          {!showResults ? (
            <MotionDiv key="form" {...viewProps}>
              <CalculatorForm
                config={config}
                update={update}
                productCategories={productCategories}
                countries={countries}
                packagingMaterials={packagingMaterials}
                onCalculate={handleCalculate}
              />
            </MotionDiv>
          ) : (
            <MotionDiv key="results" {...viewProps}>
              <CalculatorResults
                requirements={requirements}
                productLabel={config.productName || categoryInfo?.name || ''}
                subcategory={config.selectedSubcategory}
                selectedCountries={config.selectedCountries}
                countries={countries}
                properties={properties}
                renderAI={renderAIAnalysis}
                aiOverall={aiAvailable ? (
                  <AIOverallAssessment productContext={productContext} requirements={requirementSummaries} />
                ) : undefined}
                aiAdditional={aiAvailable ? (
                  <AIAdditionalReqs productContext={productContext} requirements={requirementSummaries} />
                ) : undefined}
                aiActionPlan={aiAvailable ? (
                  <AIActionPlan productContext={productContext} requirements={requirementSummaries} />
                ) : undefined}
                aiChat={aiAvailable ? (
                  <AIChatPanel productContext={productContext} requirements={requirementSummaries} />
                ) : undefined}
              />
            </MotionDiv>
          )}
        </AnimatePresence>
      </div>
    </PageContainer>
  );
}
