import { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { RhNotificationEventType } from '@/types/returns-hub';
import type { EmailDesignConfig } from './emailEditorTypes';
import { renderEmailHtml, fillSampleData } from './emailHtmlRenderer';
import { TEMPLATE_VARIABLES } from './emailEditorTypes';

interface LivePreviewProps {
  designConfig: EmailDesignConfig;
  previewText: string;
  eventType: RhNotificationEventType;
  locale: string;
  viewportMode: 'desktop' | 'mobile';
}

export function LivePreview({ designConfig, previewText, eventType, locale, viewportMode }: LivePreviewProps) {
  const { t } = useTranslation('returns');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const useSampleData = useRef(true);

  const rawHtml = useMemo(() => renderEmailHtml(designConfig, previewText, locale), [designConfig, previewText, locale]);

  const displayHtml = useMemo(() => {
    if (!useSampleData.current) return rawHtml;
    const vars = TEMPLATE_VARIABLES[eventType] || [];
    const sampleData: Record<string, string> = {};
    for (const v of vars) {
      sampleData[v.key] = v.example;
    }
    return fillSampleData(rawHtml, sampleData);
  }, [rawHtml, eventType]);

  // Auto-adjust iframe height
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          iframe.style.height = `${doc.body.scrollHeight + 20}px`;
        }
      } catch {
        // cross-origin safety
      }
    };
    iframe.addEventListener('load', handleLoad);
    return () => iframe.removeEventListener('load', handleLoad);
  }, [displayHtml]);

  return (
    <div className="p-4 space-y-3 animate-panel-slide-in">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('Preview')}</h4>
        <div className="flex items-center gap-2">
          <Switch
            checked={useSampleData.current}
            onCheckedChange={(v) => { useSampleData.current = v; }}
            className="scale-75"
          />
          <Label className="text-[10px]">{t('Sample Data')}</Label>
        </div>
      </div>
      <div
        className="mx-auto border rounded-lg overflow-hidden bg-white shadow-sm transition-all duration-300"
        style={{ width: viewportMode === 'desktop' ? '100%' : 320, maxWidth: '100%' }}
      >
        <iframe
          ref={iframeRef}
          srcDoc={displayHtml}
          title="Email Preview"
          sandbox="allow-same-origin"
          className="w-full border-0"
          style={{ minHeight: 400 }}
        />
      </div>
    </div>
  );
}
