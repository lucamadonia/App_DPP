import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { RhEmailTemplate, EmailTemplateCategory } from '@/types/returns-hub';
import type { EmailDesignConfig } from './emailEditorTypes';
import { getDefaultTemplate } from './emailTemplateDefaults';
import { renderEmailHtml } from './emailHtmlRenderer';

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

  // Generate real mini preview HTML
  const previewHtml = useMemo(() => {
    const storedConfig = template.designConfig as unknown as EmailDesignConfig;
    const config = storedConfig?.blocks?.length > 0
      ? storedConfig
      : getDefaultTemplate(template.eventType)?.designConfig;
    if (!config) return '';
    return renderEmailHtml(config);
  }, [template]);

  return (
    <div
      className="group relative rounded-xl border bg-card/80 backdrop-blur-sm shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Mini iframe preview */}
      <div className="h-32 rounded-t-xl bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden relative">
        {previewHtml ? (
          <div className="w-full h-full overflow-hidden">
            <iframe
              srcDoc={previewHtml}
              title={template.name || template.eventType}
              sandbox="allow-same-origin"
              className="w-full border-0 pointer-events-none"
              style={{
                height: '400px',
                transform: 'scale(0.3)',
                transformOrigin: 'top center',
                width: '333%',
                marginLeft: '-116.5%',
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            {t('Preview')}
          </div>
        )}
        {/* Gradient overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card/80 to-transparent" />

        {/* Edit overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <Button
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 shadow-lg"
            onClick={() => onEdit(template)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t('Edit')}
          </Button>
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
        </div>
      </div>
    </div>
  );
}
