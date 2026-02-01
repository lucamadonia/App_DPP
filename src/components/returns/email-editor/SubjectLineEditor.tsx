import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RhNotificationEventType } from '@/types/returns-hub';
import { VariableInserter } from './VariableInserter';

interface SubjectLineEditorProps {
  value: string;
  onChange: (value: string) => void;
  eventType: RhNotificationEventType;
}

export function SubjectLineEditor({ value, onChange, eventType }: SubjectLineEditorProps) {
  const { t } = useTranslation('returns');
  const maxLen = 150;
  const pct = Math.min((value.length / maxLen) * 100, 100);
  const barColor = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-warning' : 'bg-primary';

  const handleInsertVariable = (variable: string) => {
    onChange(value + variable);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('Subject')}</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{value.length}/{maxLen}</span>
          <VariableInserter eventType={eventType} onInsert={handleInsertVariable} />
        </div>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLen}
        placeholder={t('Email subject line...')}
      />
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
