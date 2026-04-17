import { AlertTriangle, Sparkles, CheckCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AiHintsList } from './AiHintsList';
import { acknowledgeDocumentHint } from '@/services/supabase';
import type { DocumentHint } from '@/services/openrouter/document-classification-prompts';
import { cn } from '@/lib/utils';

interface DocumentHintsPopoverProps {
  documentId?: string;
  hints: DocumentHint[];
  confidence?: number;
  compact?: boolean;
  className?: string;
  onChanged?: () => void;
}

/**
 * Small inline indicator that opens a popover showing all AI hints/warnings
 * for a document. Placed in list rows next to the document name.
 */
export function DocumentHintsPopover({
  documentId,
  hints,
  confidence,
  compact = false,
  className,
  onChanged,
}: DocumentHintsPopoverProps) {
  const { t } = useTranslation('documents');

  // Filter to open hints only (acknowledged ones don't show in the indicator)
  const openHints = hints.filter((h) => !h.acknowledgedAt);
  if (openHints.length === 0) return null;

  const hasDanger = openHints.some(
    (h) =>
      h.type === 'already_expired' ||
      h.type === 'svhc_detected' ||
      h.type === 'hazardous_substances' ||
      h.type === 'missing_required_info'
  );

  async function handleAcknowledge(hintId: string | null) {
    if (!documentId) return;
    const result = await acknowledgeDocumentHint(documentId, hintId);
    if (!result.success) {
      toast.error(result.error || 'Failed');
      return;
    }
    toast.success(hintId === null ? t('All hints acknowledged') : t('Hint acknowledged'));
    onChanged?.();
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-colors',
            hasDanger
              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300'
              : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
            className
          )}
          aria-label={t('{{n}} AI hints', { n: openHints.length })}
        >
          <AlertTriangle className="size-2.5" />
          {!compact && <span>{openHints.length}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-xs font-semibold">{t('AI hints')}</span>
              <Badge variant="secondary" className="text-[10px]">
                {openHints.length}
              </Badge>
            </div>
            {typeof confidence === 'number' && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {t('Confidence')}: {Math.round(confidence * 100)}%
              </span>
            )}
          </div>
          <AiHintsList
            hints={openHints}
            onAcknowledge={
              documentId
                ? (hint) => {
                    if (hint.id) handleAcknowledge(hint.id);
                  }
                : undefined
            }
          />
          {documentId && openHints.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-7 text-xs"
              onClick={() => handleAcknowledge(null)}
            >
              <CheckCheck className="size-3 mr-1" />
              {t('Mark all as acknowledged')}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
