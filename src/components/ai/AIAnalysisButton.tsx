import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AIAnalysisButtonProps {
  onClick: () => void;
  isStreaming: boolean;
  hasResult: boolean;
}

export function AIAnalysisButton({ onClick, isStreaming, hasResult }: AIAnalysisButtonProps) {
  if (hasResult) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={isStreaming}
      className="gap-1.5"
    >
      {isStreaming ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analysiere...
        </>
      ) : (
        <>
          <Sparkles className="h-3.5 w-3.5" />
          KI-Tiefenanalyse
        </>
      )}
    </Button>
  );
}
