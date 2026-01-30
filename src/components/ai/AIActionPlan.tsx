import { Sparkles, Loader2, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAIStream } from '@/hooks/use-ai-stream';
import { buildActionPlanMessages } from '@/services/openrouter/prompts';
import { AIStreamingText } from './AIStreamingText';
import type { ProductContext, RequirementSummary } from '@/services/openrouter/types';

interface AIActionPlanProps {
  productContext: ProductContext;
  requirements: RequirementSummary[];
}

export function AIActionPlan({ productContext, requirements }: AIActionPlanProps) {
  const { text, isStreaming, error, startStream, reset } = useAIStream();

  const handleGenerate = () => {
    const messages = buildActionPlanMessages(productContext, requirements);
    startStream(messages, { maxTokens: 3000, temperature: 0.3 });
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            KI-Handlungsplan
          </div>
          {!text && !isStreaming && (
            <Button onClick={handleGenerate} size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Plan erstellen
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
            Erstellen Sie einen priorisierten, chronologischen Handlungsplan mit konkreten Schritten, Fristen und Aufwandsschätzungen.
          </p>
        )}

        {isStreaming && !text && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Erstelle Handlungsplan...
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
