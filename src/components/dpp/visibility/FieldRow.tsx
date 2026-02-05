/**
 * Field Row Component
 *
 * Individual field with independent consumer and customs toggles.
 */

import type { FieldDefinition } from '@/types/visibility';
import { cn } from '@/lib/utils';
import { VisibilitySwitch } from './VisibilitySwitch';
import { useTranslation } from 'react-i18next';

interface FieldRowProps {
  field: FieldDefinition;
  consumerVisible: boolean;
  customsVisible: boolean;
  onToggle: (field: string, level: 'consumer' | 'customs', value: boolean) => void;
  isSearchMatch: boolean;
}

export function FieldRow({
  field,
  consumerVisible,
  customsVisible,
  onToggle,
  isSearchMatch,
}: FieldRowProps) {
  const { t } = useTranslation('dpp');

  return (
    <div
      className={cn(
        'grid grid-cols-[1fr_180px_180px] gap-4 items-center p-3 rounded-lg border',
        'hover:border-primary/50 hover:shadow-sm transition-all',
        isSearchMatch && 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-700'
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="font-medium text-sm">{t(field.label)}</div>
        {field.description && (
          <div className="text-xs text-muted-foreground">{t(field.description)}</div>
        )}
      </div>

      <VisibilitySwitch
        level="consumer"
        checked={consumerVisible}
        onChange={(v) => onToggle(field.key, 'consumer', v)}
        label={t('Consumer')}
      />

      <VisibilitySwitch
        level="customs"
        checked={customsVisible}
        onChange={(v) => onToggle(field.key, 'customs', v)}
        label={t('Customs')}
      />
    </div>
  );
}
