import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiSuggestionBadgeProps {
  /** Confidence 0..1 */
  confidence: number;
  /** Optional label prefix (e.g., "AI") */
  label?: string;
  className?: string;
}

/**
 * Small inline badge that shows "AI (95%)" with colored dot.
 * Red <50%, Amber 50-70%, Green >=70%.
 */
export function AiSuggestionBadge({ confidence, label = 'AI', className }: AiSuggestionBadgeProps) {
  const pct = Math.round(confidence * 100);
  const color =
    confidence >= 0.7
      ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
      : confidence >= 0.5
      ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-900'
      : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums',
        color,
        className
      )}
      aria-label={`${label} suggestion, ${pct}% confidence`}
    >
      <Sparkles className="size-2.5" />
      {label} · {pct}%
    </span>
  );
}
