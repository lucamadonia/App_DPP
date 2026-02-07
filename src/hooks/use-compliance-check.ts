/**
 * useComplianceCheck — orchestrates 3 sequential AI streaming calls
 * for comprehensive product compliance analysis.
 */

import { useState, useCallback, useRef } from 'react';
import { streamCompletion } from '@/services/openrouter/client';
import {
  buildScoreAndRiskMessages,
  buildFindingsMessages,
  buildActionPlanMessages,
  parseScoreResponse,
  parseFindingsResponse,
  parseActionPlanResponse,
} from '@/services/openrouter/compliance-check-prompts';
import type { ComplianceCheckContext } from '@/services/openrouter/compliance-check-prompts';
import type {
  ComplianceCheckResult,
  ComplianceCheckPhase,
  ComplianceFinding,
  RiskMatrixEntry,
  ActionPlanItem,
  Recommendation,
  RiskLevel,
} from '@/types/compliance-check';

type Locale = 'en' | 'de';

interface UseComplianceCheckReturn {
  result: Partial<ComplianceCheckResult> | null;
  phases: ComplianceCheckPhase[];
  isRunning: boolean;
  error: string | null;
  rawTexts: string[];
  phaseTexts: [string, string, string];
  startCheck: (ctx: ComplianceCheckContext, locale?: Locale) => Promise<ComplianceCheckResult | null>;
  abort: () => void;
  reset: () => void;
}

const INITIAL_PHASES: ComplianceCheckPhase[] = [
  { phase: 1, label: 'Score & Risk Matrix', status: 'pending' },
  { phase: 2, label: 'Detailed Findings', status: 'pending' },
  { phase: 3, label: 'Action Plan', status: 'pending' },
];

export function useComplianceCheck(): UseComplianceCheckReturn {
  const [result, setResult] = useState<Partial<ComplianceCheckResult> | null>(null);
  const [phases, setPhases] = useState<ComplianceCheckPhase[]>(INITIAL_PHASES);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawTexts, setRawTexts] = useState<string[]>([]);
  const [phaseTexts, setPhaseTexts] = useState<[string, string, string]>(['', '', '']);
  const abortRef = useRef(false);

  const updatePhase = useCallback((phaseNum: 1 | 2 | 3, status: ComplianceCheckPhase['status']) => {
    setPhases(prev => prev.map(p =>
      p.phase === phaseNum ? { ...p, status } : p
    ));
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setPhases(INITIAL_PHASES);
    setIsRunning(false);
    setError(null);
    setRawTexts([]);
    setPhaseTexts(['', '', '']);
    abortRef.current = false;
  }, []);

  const abort = useCallback(() => {
    abortRef.current = true;
  }, []);

  const PHASE_LABELS = ['AI Compliance: Score & Risk', 'AI Compliance: Findings', 'AI Compliance: Action Plan'];

  const streamPhase = useCallback(async (
    messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
    phaseIndex: 0 | 1 | 2,
  ): Promise<string> => {
    let fullText = '';
    for await (const chunk of streamCompletion(messages, { maxTokens: 4000, temperature: 0.2, operationLabel: PHASE_LABELS[phaseIndex] })) {
      if (abortRef.current) throw new Error('Aborted');
      fullText += chunk;
      setPhaseTexts(prev => {
        const next = [...prev] as [string, string, string];
        next[phaseIndex] = fullText;
        return next;
      });
    }
    return fullText;
  }, []);

  const startCheck = useCallback(async (
    ctx: ComplianceCheckContext,
    locale: Locale = 'de'
  ): Promise<ComplianceCheckResult | null> => {
    reset();
    setIsRunning(true);
    abortRef.current = false;

    const collected: string[] = [];
    let overallScore = 50;
    let riskLevel: RiskLevel = 'medium';
    let executiveSummary = '';
    let riskMatrix: RiskMatrixEntry[] = [];
    let findings: ComplianceFinding[] = [];
    let actionPlan: ActionPlanItem[] = [];
    let recommendations: Recommendation[] = [];

    try {
      // Phase 1: Score + Risk Matrix + Executive Summary
      updatePhase(1, 'streaming');
      const msgs1 = buildScoreAndRiskMessages(ctx, locale);
      const text1 = await streamPhase(msgs1, 0);
      collected.push(text1);
      setRawTexts([...collected]);

      const parsed1 = parseScoreResponse(text1);
      overallScore = parsed1.score;
      riskLevel = parsed1.riskLevel;
      executiveSummary = parsed1.summary;
      riskMatrix = parsed1.riskMatrix;

      setResult({ overallScore, riskLevel, executiveSummary, riskMatrix });
      updatePhase(1, 'done');

      if (abortRef.current) throw new Error('Aborted');

      // Phase 2: Detailed Findings
      updatePhase(2, 'streaming');
      const msgs2 = buildFindingsMessages(ctx, executiveSummary, locale);
      const text2 = await streamPhase(msgs2, 1);
      collected.push(text2);
      setRawTexts([...collected]);

      findings = parseFindingsResponse(text2);
      setResult(prev => ({ ...prev, findings }));
      updatePhase(2, 'done');

      if (abortRef.current) throw new Error('Aborted');

      // Phase 3: Action Plan + Recommendations
      updatePhase(3, 'streaming');
      const findingSummary = findings.map(f => `[${f.severity}] ${f.category}: ${f.title}`).join('\n');
      const msgs3 = buildActionPlanMessages(ctx, executiveSummary, findingSummary, locale);
      const text3 = await streamPhase(msgs3, 2);
      collected.push(text3);
      setRawTexts([...collected]);

      const parsed3 = parseActionPlanResponse(text3);
      actionPlan = parsed3.actionPlan;
      recommendations = parsed3.recommendations;

      const fullResult: ComplianceCheckResult = {
        overallScore,
        riskLevel,
        executiveSummary,
        riskMatrix,
        findings,
        actionPlan,
        recommendations,
      };

      setResult(fullResult);
      updatePhase(3, 'done');
      setIsRunning(false);

      return fullResult;
    } catch (err) {
      if (abortRef.current) {
        setIsRunning(false);
        return null;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);

      // Mark remaining phases as error
      setPhases(prev => prev.map(p =>
        p.status === 'pending' || p.status === 'streaming' ? { ...p, status: 'error' } : p
      ));

      setIsRunning(false);
      return null;
    }
  }, [reset, updatePhase, streamPhase]);

  return {
    result,
    phases,
    isRunning,
    error,
    rawTexts,
    phaseTexts,
    startCheck,
    abort,
    reset,
  };
}
