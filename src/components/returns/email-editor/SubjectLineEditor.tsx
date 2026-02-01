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

  const handleInsertVariable = (variable: string) => {
    onChange(value + variable);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('Subject')}</Label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{value.length}/150</span>
          <VariableInserter eventType={eventType} onInsert={handleInsertVariable} />
        </div>
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={150}
        placeholder={t('Email subject line...')}
      />
    </div>
  );
}
