import { Sparkles, X } from 'lucide-react';
import { AIStreamingText } from './AIStreamingText';

interface AIAnalysisCardProps {
  text: string;
  isStreaming: boolean;
  error: string | null;
  onClose: () => void;
}

export function AIAnalysisCard({ text, isStreaming, error, onClose }: AIAnalysisCardProps) {
  if (!text && !isStreaming && !error) return null;

  return (
    <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          KI-Tiefenanalyse
        </div>
        {!isStreaming && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <AIStreamingText text={text} isStreaming={isStreaming} />
      )}
    </div>
  );
}
