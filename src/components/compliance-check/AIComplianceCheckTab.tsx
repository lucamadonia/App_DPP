import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { BrainCircuit, Save, FileDown, RotateCcw, Loader2, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { isAIAvailable } from '@/services/openrouter/client';
import { useComplianceCheck } from '@/hooks/use-compliance-check';
import {
  saveComplianceCheck,
  getComplianceChecks,
  deleteComplianceCheck,
} from '@/services/supabase/ai-compliance-checks';
import { getDocuments, type Document } from '@/services/supabase';
import { getBatchById } from '@/services/supabase/batches';
import { AIStreamingText } from '@/components/ai/AIStreamingText';
import { ComplianceScoreGauge } from './ComplianceScoreGauge';
import { ComplianceRiskMatrix } from './ComplianceRiskMatrix';
import { ComplianceFindingsPanel } from './ComplianceFindingsPanel';
import { ComplianceActionPlan } from './ComplianceActionPlan';
import { ComplianceCheckHistory } from './ComplianceCheckHistory';
import type { Product, ProductBatch } from '@/types/product';
import type { SavedComplianceCheck, ComplianceCheckResult } from '@/types/compliance-check';
import type { ComplianceCheckContext, DocumentMeta } from '@/services/openrouter/compliance-check-prompts';

interface AIComplianceCheckTabProps {
  product: Product;
}

type ViewState = 'empty' | 'running' | 'result' | 'saved';

export function AIComplianceCheckTab({ product }: AIComplianceCheckTabProps) {
  const { t } = useTranslation('compliance');
  const { i18n } = useTranslation();
  const locale = (i18n.language === 'de' ? 'de' : 'en') as 'en' | 'de';
  const [searchParams] = useSearchParams();
  const batchId = searchParams.get('batchId');

  const [viewState, setViewState] = useState<ViewState>('empty');
  const [batch, setBatch] = useState<ProductBatch | null>(null);
  const [savedChecks, setSavedChecks] = useState<SavedComplianceCheck[]>([]);
  const [viewedCheck, setViewedCheck] = useState<SavedComplianceCheck | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const {
    result,
    phases,
    isRunning,
    error,
    rawTexts,
    phaseTexts,
    startCheck,
    abort,
    reset,
  } = useComplianceCheck();

  const aiAvailable = isAIAvailable();

  // Load batch if batchId provided
  useEffect(() => {
    if (batchId) {
      getBatchById(batchId).then(b => setBatch(b));
    }
  }, [batchId]);

  // Load saved checks
  const loadHistory = useCallback(async () => {
    const checks = await getComplianceChecks(product.id, batchId);
    setSavedChecks(checks);
  }, [product.id, batchId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Build context for AI
  const buildContext = useCallback(async (): Promise<ComplianceCheckContext> => {
    // Load documents metadata
    let documents: DocumentMeta[] = [];
    try {
      const docs = await getDocuments();
      documents = (docs || [])
        .filter((d: Document) => d.product_id === product.id || !d.product_id)
        .map((d: Document) => ({
          name: d.name,
          type: d.type,
          category: d.category,
          status: d.status || '',
          validUntil: d.validUntil || '',
        }));
    } catch {
      // Documents not critical
    }

    return {
      product,
      batch,
      documents,
      supplyChain: product.supplyChain,
    };
  }, [product, batch]);

  const handleStartCheck = async () => {
    if (!confirm(t('This will use AI credits to analyze your product. Continue?', {
      defaultValue: 'This will use AI credits to analyze your product. Continue?',
    }))) return;

    setViewState('running');
    setViewedCheck(null);
    setSavedSuccess(false);

    const ctx = await buildContext();
    const finalResult = await startCheck(ctx, locale);

    if (finalResult) {
      setViewState('result');
    }
  };

  const handleSave = async () => {
    if (!result || !result.overallScore) return;

    setIsSaving(true);
    const ctx = await buildContext();

    const saved = await saveComplianceCheck({
      productId: product.id,
      batchId: batchId || undefined,
      overallScore: result.overallScore,
      riskLevel: result.riskLevel || 'medium',
      executiveSummary: result.executiveSummary || '',
      findings: result.findings || [],
      riskMatrix: result.riskMatrix || [],
      actionPlan: result.actionPlan || [],
      recommendations: result.recommendations || [],
      rawResponses: rawTexts,
      inputDataSnapshot: ctx as unknown as Record<string, unknown>,
    });

    setIsSaving(false);
    if (saved) {
      setSavedSuccess(true);
      loadHistory();
    }
  };

  const handleViewSaved = (check: SavedComplianceCheck) => {
    setViewedCheck(check);
    setViewState('saved');
  };

  const handleDeleteCheck = async (checkId: string) => {
    await deleteComplianceCheck(checkId);
    loadHistory();
    if (viewedCheck?.id === checkId) {
      setViewedCheck(null);
      setViewState('empty');
    }
  };

  const handleNewCheck = () => {
    reset();
    setViewState('empty');
    setViewedCheck(null);
    setSavedSuccess(false);
  };

  const handleExportPDF = async () => {
    // Dynamic import for PDF to avoid loading the heavy library upfront
    const { generateCompliancePDF } = await import('./ComplianceReportPDF');
    const data = viewedCheck || (result as ComplianceCheckResult);
    if (!data) return;
    await generateCompliancePDF(product, data as ComplianceCheckResult, batch);
  };

  // Display data source: either live result or viewed saved check
  const displayData = viewedCheck || result;
  const isComplete = viewState === 'result' || viewState === 'saved';

  // -----------------------------------------------------------------------
  // Empty State
  // -----------------------------------------------------------------------
  if (viewState === 'empty' && !isRunning) {
    return (
      <div className="space-y-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-8 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent)]" />
          <div className="relative flex flex-col items-center text-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <BrainCircuit className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('AI Compliance Check', { defaultValue: 'AI Compliance Check' })}</h2>
              <p className="text-sm text-white/80 mt-2 max-w-md">
                {t('ai_check_description', {
                  defaultValue: 'Comprehensive AI analysis of your product data against EU regulations. Checks ESPR, CE directives, REACH, GPSR, documentation completeness, and more.',
                })}
              </p>
            </div>
            {batch && (
              <div className="px-3 py-1 rounded-full bg-white/10 text-sm">
                {t('Batch', { defaultValue: 'Batch' })}: {batch.serialNumber}
              </div>
            )}
            <Button
              size="lg"
              variant="secondary"
              onClick={handleStartCheck}
              disabled={!aiAvailable}
              className="mt-2"
            >
              <BrainCircuit className="mr-2 h-5 w-5" />
              {t('Start AI Compliance Check', { defaultValue: 'Start AI Compliance Check' })}
            </Button>
            {!aiAvailable && (
              <p className="text-xs text-white/60">
                {t('AI not available. Configure OpenRouter API key.', {
                  defaultValue: 'AI not available. Configure OpenRouter API key.',
                })}
              </p>
            )}
          </div>
        </div>

        {/* History */}
        <ComplianceCheckHistory
          checks={savedChecks}
          onView={handleViewSaved}
          onDelete={handleDeleteCheck}
        />
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Running / Result / Saved View
  // -----------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Toolbar */}
      {isComplete && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {t('AI Compliance Check', { defaultValue: 'AI Compliance Check' })}
            </span>
            {viewState === 'saved' && (
              <span className="text-xs text-muted-foreground">
                ({new Date(viewedCheck!.createdAt).toLocaleString()})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {viewState === 'result' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving || savedSuccess}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : savedSuccess ? (
                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {savedSuccess
                  ? t('Saved', { defaultValue: 'Saved' })
                  : t('Save', { ns: 'common', defaultValue: 'Save' })}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              {t('PDF Export', { defaultValue: 'PDF Export' })}
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewCheck}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('New Check', { defaultValue: 'New Check' })}
            </Button>
          </div>
        </div>
      )}

      {/* Progress indicator while running */}
      {isRunning && (
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
          {phases.map((phase) => (
            <div key={phase.phase} className="flex items-center gap-2">
              {phase.status === 'streaming' && (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              {phase.status === 'done' && (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              )}
              {phase.status === 'error' && (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              {phase.status === 'pending' && (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
              )}
              <span className={`text-sm ${
                phase.status === 'streaming' ? 'font-medium text-primary' :
                phase.status === 'done' ? 'text-muted-foreground' :
                'text-muted-foreground/50'
              }`}>
                {t(`Phase ${phase.phase}`, { defaultValue: `Phase ${phase.phase}` })}: {phase.label}
              </span>
            </div>
          ))}
          {isRunning && (
            <Button variant="ghost" size="sm" className="ml-auto" onClick={abort}>
              {t('Cancel', { ns: 'common', defaultValue: 'Cancel' })}
            </Button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-medium">{t('Error during AI request', { defaultValue: 'Error during AI request' })}</span>
          </div>
          <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
        </div>
      )}

      {/* Score + Executive Summary */}
      {displayData?.overallScore != null && (
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ComplianceScoreGauge
                score={displayData.overallScore}
                riskLevel={displayData.riskLevel || 'medium'}
                animated={viewState === 'result' && !viewedCheck}
              />
              <div className="flex-1">
                <h3 className="font-semibold mb-2">
                  {t('Executive Summary', { defaultValue: 'Executive Summary' })}
                </h3>
                {displayData.executiveSummary ? (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {displayData.executiveSummary}
                  </p>
                ) : (
                  isRunning && phases[0]?.status === 'streaming' && (
                    <AIStreamingText text={phaseTexts[0]} isStreaming />
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streaming text for phase 1 while still parsing */}
      {isRunning && phases[0]?.status === 'streaming' && !displayData?.overallScore && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('Analyzing...', { defaultValue: 'Analyzing...' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIStreamingText text={phaseTexts[0]} isStreaming />
          </CardContent>
        </Card>
      )}

      {/* Risk Matrix */}
      {displayData?.riskMatrix && displayData.riskMatrix.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">
            {t('Risk Matrix', { defaultValue: 'Risk Matrix' })}
          </h3>
          <ComplianceRiskMatrix entries={displayData.riskMatrix} />
        </div>
      )}

      {/* Streaming text for phase 2 */}
      {isRunning && phases[1]?.status === 'streaming' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('Analyzing Findings...', { defaultValue: 'Analyzing Findings...' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIStreamingText text={phaseTexts[1]} isStreaming />
          </CardContent>
        </Card>
      )}

      {/* Findings */}
      {displayData?.findings && displayData.findings.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3">
            {t('Findings', { defaultValue: 'Findings' })} ({displayData.findings.length})
          </h3>
          <ComplianceFindingsPanel findings={displayData.findings} />
        </div>
      )}

      {/* Streaming text for phase 3 */}
      {isRunning && phases[2]?.status === 'streaming' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('Creating Action Plan...', { defaultValue: 'Creating Action Plan...' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AIStreamingText text={phaseTexts[2]} isStreaming />
          </CardContent>
        </Card>
      )}

      {/* Action Plan + Recommendations */}
      {((displayData?.actionPlan && displayData.actionPlan.length > 0) ||
        (displayData?.recommendations && displayData.recommendations.length > 0)) && (
        <ComplianceActionPlan
          actionPlan={displayData.actionPlan || []}
          recommendations={displayData.recommendations || []}
        />
      )}

      {/* AI Disclaimer */}
      {isComplete && (
        <>
          <Separator />
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium mb-1">
                {t('AI Disclaimer', { defaultValue: 'AI Disclaimer' })}
              </p>
              <p>
                {t('ai_disclaimer_text', {
                  defaultValue: 'This analysis was generated by AI and serves as an orientation aid. It does not replace professional legal advice or an official conformity assessment. All information should be verified by qualified compliance experts. The AI model may produce inaccurate or incomplete results.',
                })}
              </p>
            </div>
          </div>
        </>
      )}

      {/* History (below results) */}
      {isComplete && savedChecks.length > 0 && (
        <>
          <Separator />
          <ComplianceCheckHistory
            checks={savedChecks}
            onView={handleViewSaved}
            onDelete={handleDeleteCheck}
          />
        </>
      )}
    </div>
  );
}
