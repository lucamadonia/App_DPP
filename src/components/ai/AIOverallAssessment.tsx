import { Sparkles, Loader2, BarChart3 } from 'lucide-react';
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

export function AIOverallAssessment({ productContext, requirements }: AIOverallAssessmentProps) {
  const { text, isStreaming, error, startStream, reset } = useAIStream();

  const handleGenerate = () => {
    const messages = buildOverallAssessmentMessages(productContext, requirements);
    startStream(messages, { maxTokens: 3000, temperature: 0.3 });
  };

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            KI-Gesamtbewertung
          </div>
          {!text && !isStreaming && (
            <Button onClick={handleGenerate} size="sm" className="gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Bewertung generieren
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
            Lassen Sie die KI eine Gesamtbewertung Ihrer Compliance-Readiness erstellen — inkl. Risikobereiche, Aufwandsschätzung und Empfehlungen.
          </p>
        )}

        {isStreaming && !text && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analysiere Compliance-Situation...
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
