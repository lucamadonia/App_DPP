import { useTranslation } from 'react-i18next';
import { Sparkles, X } from 'lucide-react';
import { AIStreamingText } from './AIStreamingText';

interface AIAnalysisCardProps {
  text: string;
  isStreaming: boolean;
  error: string | null;
  onClose: () => void;
}

function SkeletonLoader() {
  return (
    <div className="space-y-3 py-1">
      <div className="h-3 w-full rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse" />
      <div className="h-3 w-5/6 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse" style={{ animationDelay: '150ms' }} />
      <div className="h-3 w-4/6 rounded-full bg-blue-100 dark:bg-blue-900/30 animate-pulse" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function AIAnalysisCard({ text, isStreaming, error, onClose }: AIAnalysisCardProps) {
  const { t } = useTranslation('compliance');
  if (!text && !isStreaming && !error) return null;

  return (
    <div className="mt-4 animate-slide-up">
      {/* Gradient top border */}
      <div className="h-1 rounded-t-lg bg-gradient-to-r from-blue-500 to-purple-500" />

      <div className="rounded-b-lg border border-t-0 border-blue-200/50 dark:border-blue-800/30 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 text-sm font-medium text-blue-700 dark:text-blue-300">
            <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 animate-glow-pulse">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            {t('AI Deep Analysis')}
          </div>
          {!isStreaming && (
            <button
              onClick={onClose}
              className="flex items-center justify-center h-7 w-7 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors duration-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : isStreaming && !text ? (
          <SkeletonLoader />
        ) : (
          <AIStreamingText text={text} isStreaming={isStreaming} />
        )}
      </div>
    </div>
  );
}
