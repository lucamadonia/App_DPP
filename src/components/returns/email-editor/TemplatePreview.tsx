import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { RhNotificationEventType } from '@/types/returns-hub';
import type { EmailDesignConfig } from './emailEditorTypes';
import { renderEmailHtml, fillSampleData } from './emailHtmlRenderer';
import { TEMPLATE_VARIABLES } from './emailEditorTypes';

interface TemplatePreviewProps {
  designConfig: EmailDesignConfig;
  previewText: string;
  eventType: RhNotificationEventType;
  locale: string;
  onLocaleChange: (locale: string) => void;
}

export function TemplatePreview({ designConfig, previewText, eventType, locale, onLocaleChange }: TemplatePreviewProps) {
  const { t } = useTranslation('returns');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [useSampleData, setUseSampleData] = useState(true);

  const rawHtml = useMemo(() => renderEmailHtml(designConfig, previewText, locale), [designConfig, previewText, locale]);

  const displayHtml = useMemo(() => {
    if (!useSampleData) return rawHtml;
    const vars = TEMPLATE_VARIABLES[eventType] || [];
    const sampleData: Record<string, string> = {};
    for (const v of vars) {
      sampleData[v.key] = v.example;
    }
    return fillSampleData(rawHtml, sampleData);
  }, [rawHtml, useSampleData, eventType]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'desktop' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode('desktop')}
          >
            <Monitor className="h-3.5 w-3.5" />
            {t('Desktop')}
          </Button>
          <Button
            variant={viewMode === 'mobile' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setViewMode('mobile')}
          >
            <Smartphone className="h-3.5 w-3.5" />
            {t('Mobile')}
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md">
            <button
              onClick={() => onLocaleChange('en')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                locale === 'en' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => onLocaleChange('de')}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                locale === 'de' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-background/50'
              }`}
            >
              DE
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={useSampleData}
              onCheckedChange={setUseSampleData}
              className="scale-75"
            />
            <Label className="text-xs">{t('Sample Data')}</Label>
          </div>
        </div>
      </div>

      {/* Send test email button (disabled) */}
      <Button variant="outline" size="sm" disabled className="w-full opacity-50">
        {t('Send Test Email')} ({t('Coming Soon')})
      </Button>

      {/* Preview iframe */}
      <div
        className="mx-auto border rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-300"
        style={{ width: viewMode === 'desktop' ? '100%' : 320, maxWidth: '100%' }}
      >
        <iframe
          srcDoc={displayHtml}
          title="Email Preview"
          sandbox="allow-same-origin"
          className="w-full border-0"
          style={{ height: 600 }}
        />
      </div>
    </div>
  );
}
