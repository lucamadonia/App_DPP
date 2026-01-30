import { Sparkles, SearchCheck, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIStream } from '@/hooks/use-ai-stream';
import { buildAdditionalRequirementsMessages } from '@/services/openrouter/prompts';
import { AIStreamingText } from './AIStreamingText';
import type { ProductContext, RequirementSummary } from '@/services/openrouter/types';

interface AIAdditionalReqsProps {
  productContext: ProductContext;
  requirements: RequirementSummary[];
}

function SkeletonLoader() {
  return (
    <div className="space-y-3 py-2">
      <div className="h-3.5 w-full rounded-full bg-amber-100 dark:bg-amber-900/30 animate-pulse" />
      <div className="h-3.5 w-5/6 rounded-full bg-amber-100 dark:bg-amber-900/30 animate-pulse" style={{ animationDelay: '100ms' }} />
      <div className="h-3.5 w-4/6 rounded-full bg-amber-100 dark:bg-amber-900/30 animate-pulse" style={{ animationDelay: '200ms' }} />
      <div className="h-3.5 w-3/6 rounded-full bg-amber-100 dark:bg-amber-900/30 animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function AIAdditionalReqs({ productContext, requirements }: AIAdditionalReqsProps) {
  const { text, isStreaming, error, startStream, reset } = useAIStream();

  const handleGenerate = () => {
    const messages = buildAdditionalRequirementsMessages(productContext, requirements);
    startStream(messages, { maxTokens: 3000, temperature: 0.4 });
  };

  return (
    <Card className="overflow-hidden border-0 shadow-md">
      {/* Gradient stripe */}
      <div className="h-1.5 bg-gradient-to-r from-amber-500 to-orange-500" />

      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10">
              <SearchCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span>KI-Erweiterte Anforderungen</span>
          </div>
          {!text && !isStreaming && (
            <Button
              onClick={handleGenerate}
              size="sm"
              className="relative overflow-hidden gap-1.5 w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600 transition-all duration-300"
            >
              <div className="absolute inset-0 animate-shimmer" aria-hidden="true">
                <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <Sparkles className="h-3.5 w-3.5" />
              Weitere Anforderungen suchen
            </Button>
          )}
          {text && !isStreaming && (
            <Button
              onClick={reset}
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Zurücksetzen
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0">
        {!text && !isStreaming && !error && (
          <div className="text-center py-6">
            <div className="flex items-center justify-center h-12 w-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10">
              <SearchCheck className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Die KI identifiziert branchenspezifische Normen, länderspezifische Besonderheiten und freiwillige Zertifizierungen, die über die Standardanalyse hinausgehen.
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
