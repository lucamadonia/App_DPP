import { useTranslation } from 'react-i18next';
import { Sparkles, BarChart3, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIStream } from '@/hooks/use-ai-stream';
import { buildOverallAssessmentMessages } from '@/services/openrouter/prompts';
import { AIStreamingText } from './AIStreamingText';
import type { ProductContext, RequirementSummary } from '@/services/openrouter/types';

interface AIOverallAssessmentProps {
  productContext: ProductContext;
  requirements: RequirementSummary[];
}

function SkeletonLoader() {
  return (
    <div className="space-y-3 py-2">
      <div className="h-3.5 w-full rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse" />
      <div className="h-3.5 w-5/6 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse" style={{ animationDelay: '100ms' }} />
      <div className="h-3.5 w-4/6 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse" style={{ animationDelay: '200ms' }} />
      <div className="h-3.5 w-3/6 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function AIOverallAssessment({ productContext, requirements }: AIOverallAssessmentProps) {
  const { t } = useTranslation('compliance');
  const { text, isStreaming, error, startStream, reset } = useAIStream();

  const handleGenerate = () => {
    const messages = buildOverallAssessmentMessages(productContext, requirements);
    startStream(messages, { maxTokens: 3000, temperature: 0.3 });
  };

  return (
    <Card className="overflow-hidden border-0 shadow-md">
      {/* Gradient stripe */}
      <div className="h-1.5 bg-gradient-to-r from-blue-500 to-purple-500" />

      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span>{t('AI Overall Assessment')}</span>
          </div>
          {!text && !isStreaming && (
            <Button
              onClick={handleGenerate}
              size="sm"
              className="relative overflow-hidden gap-1.5 w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
            >
              <div className="absolute inset-0 animate-shimmer" aria-hidden="true">
                <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <Sparkles className="h-3.5 w-3.5" />
              {t('Generate Assessment')}
            </Button>
          )}
          {text && !isStreaming && (
            <Button
              onClick={reset}
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('Reset')}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
        {!text && !isStreaming && !error && (
          <div className="text-center py-6">
            <div className="flex items-center justify-center h-12 w-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-500/10 to-purple-500/10">
              <BarChart3 className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {t('Let AI create an overall assessment of your compliance readiness — including risk areas, effort estimates, and recommendations.')}
            </p>
          </div>
        )}

        {isStreaming && !text && <SkeletonLoader />}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {text && (
          <div className="animate-slide-up">
            <AIStreamingText text={text} isStreaming={isStreaming} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
