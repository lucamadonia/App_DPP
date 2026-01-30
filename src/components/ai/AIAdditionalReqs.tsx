import { Sparkles, Loader2, SearchCheck } from 'lucide-react';
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

export function AIAdditionalReqs({ productContext, requirements }: AIAdditionalReqsProps) {
  const { text, isStreaming, error, startStream, reset } = useAIStream();

  const handleGenerate = () => {
    const messages = buildAdditionalRequirementsMessages(productContext, requirements);
    startStream(messages, { maxTokens: 3000, temperature: 0.4 });
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SearchCheck className="h-5 w-5 text-primary" />
            KI-Erweiterte Anforderungen
          </div>
          {!text && !isStreaming && (
            <Button onClick={handleGenerate} size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Weitere Anforderungen suchen
            </Button>
          )}
          {text && !isStreaming && (
            <Button onClick={reset} variant="ghost" size="sm">
              Zurücksetzen
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!text && !isStreaming && !error && (
          <p className="text-sm text-muted-foreground">
            Die KI identifiziert branchenspezifische Normen, länderspezifische Besonderheiten und freiwillige Zertifizierungen, die über die Standardanalyse hinausgehen.
          </p>
        )}

        {isStreaming && !text && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Suche nach weiteren Anforderungen...
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <AIStreamingText text={text} isStreaming={isStreaming} />
      </CardContent>
    </Card>
  );
}
