import { useTranslation } from 'react-i18next';
import { Variable } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { RhNotificationEventType } from '@/types/returns-hub';
import { TEMPLATE_VARIABLES } from './emailEditorTypes';

interface VariableInserterProps {
  eventType: RhNotificationEventType;
  onInsert: (variable: string) => void;
}

export function VariableInserter({ eventType, onInsert }: VariableInserterProps) {
  const { t } = useTranslation('returns');
  const variables = TEMPLATE_VARIABLES[eventType] || [];

  if (variables.length === 0) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Variable className="h-3.5 w-3.5" />
          {t('Variables')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <p className="text-xs font-medium text-muted-foreground px-2 mb-2">
          {t('Click to insert')}
        </p>
        <div className="space-y-1">
          {variables.map((v) => (
            <button
              key={v.key}
              type="button"
              className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent text-sm transition-colors"
              onClick={() => onInsert(`{{${v.key}}}`)}
            >
              <span className="font-mono text-xs text-primary">{`{{${v.key}}}`}</span>
              <span className="text-muted-foreground text-xs ml-2">{v.example}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
