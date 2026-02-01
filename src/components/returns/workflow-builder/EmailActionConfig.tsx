import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRhEmailTemplates } from '@/services/supabase';
import type { RhEmailTemplate } from '@/types/returns-hub';

interface EmailActionConfigProps {
  params: Record<string, unknown>;
  onChange: (params: Record<string, unknown>) => void;
}

export function EmailActionConfig({ params, onChange }: EmailActionConfigProps) {
  const { t } = useTranslation('returns');
  const [templates, setTemplates] = useState<RhEmailTemplate[]>([]);

  useEffect(() => {
    getRhEmailTemplates().then(setTemplates);
  }, []);

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-xs">{t('Email Template')}</Label>
        <Select
          value={String(params.templateId ?? '')}
          onValueChange={(v) => onChange({ ...params, templateId: v })}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder={t('Select Template')} />
          </SelectTrigger>
          <SelectContent>
            {templates.map((tpl) => (
              <SelectItem key={tpl.id} value={tpl.id}>
                {tpl.name} ({t(tpl.eventType)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('Recipient Email')}</Label>
        <Input
          className="h-8 text-xs"
          placeholder="{{customer.email}}"
          value={String(params.recipientEmail ?? '')}
          onChange={(e) => onChange({ ...params, recipientEmail: e.target.value })}
        />
        <p className="text-[10px] text-muted-foreground">
          {t('Use {{variable}} syntax for dynamic values')}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">{t('Subject Override')}</Label>
        <Input
          className="h-8 text-xs"
          placeholder={t('Leave empty for template default')}
          value={String(params.subjectOverride ?? '')}
          onChange={(e) => onChange({ ...params, subjectOverride: e.target.value })}
        />
      </div>
    </div>
  );
}
