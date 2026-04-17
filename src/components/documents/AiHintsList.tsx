import { AlertTriangle, Info, Clock, AlertCircle, FileWarning, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DocumentHint, HintType } from '@/services/openrouter/document-classification-prompts';

const HINT_META: Record<
  HintType,
  { icon: React.ComponentType<{ className?: string }>; tone: 'warning' | 'info' | 'danger' }
> = {
  expiry_soon: { icon: Clock, tone: 'warning' },
  already_expired: { icon: AlertCircle, tone: 'danger' },
  no_expiry_date_found: { icon: Info, tone: 'info' },
  product_match_unsure: { icon: AlertTriangle, tone: 'warning' },
  no_product_match: { icon: Info, tone: 'info' },
  scanned_low_quality: { icon: FileWarning, tone: 'info' },
  svhc_detected: { icon: AlertTriangle, tone: 'danger' },
  hazardous_substances: { icon: AlertTriangle, tone: 'danger' },
  multilingual_document: { icon: Info, tone: 'info' },
  unclear_content: { icon: FileWarning, tone: 'warning' },
  missing_required_info: { icon: AlertTriangle, tone: 'warning' },
  other: { icon: Info, tone: 'info' },
};

const TONE_CLASSES = {
  danger:
    'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200',
  warning:
    'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200',
  info: 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200',
} as const;

interface AiHintsListProps {
  hints: DocumentHint[];
  /** If provided, shows "Acknowledge" (check) + optional dismiss (x) buttons per hint */
  onAcknowledge?: (hint: DocumentHint) => void | Promise<void>;
  /** Show acknowledged hints with reduced opacity instead of hiding */
  showAcknowledged?: boolean;
  className?: string;
}

export function AiHintsList({
  hints,
  onAcknowledge,
  showAcknowledged = false,
  className,
}: AiHintsListProps) {
  const { t } = useTranslation('documents');
  if (!hints || hints.length === 0) return null;

  const visible = showAcknowledged ? hints : hints.filter((h) => !h.acknowledgedAt);
  if (visible.length === 0) return null;

  return (
    <div className={cn('space-y-1.5', className)}>
      {visible.map((hint, idx) => {
        const meta = HINT_META[hint.type as HintType] ?? HINT_META.other;
        const Icon = meta.icon;
        const isAck = Boolean(hint.acknowledgedAt);
        return (
          <div
            key={hint.id ?? `${hint.type}-${idx}`}
            className={cn(
              'flex items-start gap-2 rounded-md border px-3 py-2 text-xs',
              TONE_CLASSES[meta.tone],
              isAck && 'opacity-50'
            )}
          >
            <Icon className="size-3.5 flex-shrink-0 mt-0.5" />
            <span className={cn('flex-1', isAck && 'line-through')}>{hint.message}</span>
            {isAck ? (
              <span className="text-[10px] opacity-70 flex-shrink-0">{t('Acknowledged')}</span>
            ) : onAcknowledge ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-5 flex-shrink-0 hover:bg-white/40 dark:hover:bg-black/40"
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge(hint);
                }}
                title={t('Acknowledge')}
                aria-label={t('Acknowledge')}
              >
                <Check className="size-3" />
              </Button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
