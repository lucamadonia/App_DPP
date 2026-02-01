import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { RhEmailTemplate, EmailTemplateCategory } from '@/types/returns-hub';

interface TemplateGalleryCardProps {
  template: RhEmailTemplate;
  index: number;
  onEdit: (template: RhEmailTemplate) => void;
  onToggleEnabled: (template: RhEmailTemplate, enabled: boolean) => void;
}

const CATEGORY_COLORS: Record<EmailTemplateCategory, string> = {
  returns: 'bg-blue-50 text-blue-700 border-blue-200',
  tickets: 'bg-purple-50 text-purple-700 border-purple-200',
  general: 'bg-amber-50 text-amber-700 border-amber-200',
};

export function TemplateGalleryCard({ template, index, onEdit, onToggleEnabled }: TemplateGalleryCardProps) {
  const { t } = useTranslation('returns');

  return (
    <div
      className="group relative rounded-xl border bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Mini preview area */}
      <div className="h-28 rounded-t-xl bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center overflow-hidden px-4">
        <div className="w-full max-w-[200px] bg-white rounded shadow-sm p-2 scale-[0.6] origin-center">
          <div className="h-3 rounded bg-slate-800 mb-1.5" />
          <div className="space-y-1 px-1">
            <div className="h-1.5 w-3/4 rounded-full bg-muted" />
            <div className="h-1.5 w-full rounded-full bg-muted" />
            <div className="h-1.5 w-2/3 rounded-full bg-muted" />
            <div className="h-3 w-16 rounded bg-primary/30 mx-auto mt-1" />
          </div>
          <div className="h-2 rounded bg-muted/50 mt-1.5" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{t(template.name || template.eventType)}</h3>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {t(template.description || template.subjectTemplate)}
            </p>
          </div>
          <Badge variant="outline" className={`shrink-0 text-[10px] ${CATEGORY_COLORS[template.category || 'returns']}`}>
            {t(template.category || 'returns')}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-1 border-t">
          <div className="flex items-center gap-2">
            <Switch
              checked={template.enabled}
              onCheckedChange={(v) => onToggleEnabled(template, v)}
              className="scale-75 origin-left"
            />
            <span className="text-xs text-muted-foreground">
              {template.enabled ? t('Active') : t('Inactive')}
            </span>
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => onEdit(template)}>
            <Pencil className="h-3 w-3" />
            {t('Edit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
