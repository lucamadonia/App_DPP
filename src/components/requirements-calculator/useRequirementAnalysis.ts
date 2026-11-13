import { useCallback, useState } from 'react';
import type { ProductContext, RequirementSummary } from '@/services/openrouter/types';
import { buildDeepAnalysisMessages } from '@/services/openrouter/prompts';

export interface RequirementAnalysisState {
  text: string;
  isStreaming: boolean;
  error: string | null;
}

/** Per-requirement AI deep analysis state (streams via OpenRouter client). */
export function useRequirementAnalysis() {
  const [analyses, setAnalyses] = useState<Record<string, RequirementAnalysisState>>({});

  const startAnalysis = useCallback(async (
    requirementId: string,
    productContext: ProductContext,
    requirement: RequirementSummary
  ) => {
    setAnalyses(prev => ({
      ...prev,
      [requirementId]: { text: '', isStreaming: true, error: null },
    }));

    const messages = buildDeepAnalysisMessages(productContext, requirement);
    let fullText = '';

    try {
      const { streamCompletion } = await import('@/services/openrouter/client');
      for await (const chunk of streamCompletion(messages, { maxTokens: 2000, temperature: 0.3 })) {
        fullText += chunk;
        setAnalyses(prev => ({
          ...prev,
          [requirementId]: { text: fullText, isStreaming: true, error: null },
        }));
      }
      setAnalyses(prev => ({
        ...prev,
        [requirementId]: { text: fullText, isStreaming: false, error: null },
      }));
    } catch (err) {
      setAnalyses(prev => ({
        ...prev,
        [requirementId]: {
          text: fullText,
          isStreaming: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      }));
    }
  }, []);

  const clearAnalysis = useCallback((requirementId: string) => {
    setAnalyses(prev => {
      const next = { ...prev };
      delete next[requirementId];
      return next;
    });
  }, []);

  return { analyses, startAnalysis, clearAnalysis };
}
