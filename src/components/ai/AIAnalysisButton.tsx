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
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={isStreaming}
      className="relative overflow-hidden gap-1.5 w-full sm:w-auto bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 text-white border-0 hover:from-blue-600 hover:via-purple-600 hover:to-blue-700 transition-all duration-300"
    >
      {/* Shimmer overlay */}
      {!isStreaming && (
        <div className="absolute inset-0 animate-shimmer" aria-hidden="true">
          <div className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      )}

      {isStreaming ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Sparkles className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-12" />
          AI Deep Analysis
        </>
      )}
    </Button>
  );
}
