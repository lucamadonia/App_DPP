import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface EmbedSnippetCardProps {
  tenantSlug: string;
}

type WidgetType = 'portal' | 'register' | 'track';

export function EmbedSnippetCard({ tenantSlug }: EmbedSnippetCardProps) {
  const { t } = useTranslation('returns');
  const [widgetType, setWidgetType] = useState<WidgetType>('portal');
  const [copied, setCopied] = useState(false);

  const origin = window.location.origin;

  const snippet = `<script src="${origin}/embed.js"></script>
<div id="trackbliss-returns"></div>
<script>
  Trackbliss.embed({
    tenant: '${tenantSlug}',
    type: '${widgetType}',
    selector: '#trackbliss-returns',
    // lang: 'de',  // optional: 'en' or 'de'
  });
</script>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const typeLabels: Record<WidgetType, string> = {
    portal: t('Portal (Full)'),
    register: t('Registration Only'),
    track: t('Tracking Only'),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Code2 className="h-4 w-4" />
          {t('Embed Widget')}
        </CardTitle>
        <CardDescription>
          {t('Embed your returns portal on any website')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>{t('Widget Type')}</Label>
          <Select value={widgetType} onValueChange={(v) => setWidgetType(v as WidgetType)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="portal">{typeLabels.portal}</SelectItem>
              <SelectItem value="register">{typeLabels.register}</SelectItem>
              <SelectItem value="track">{typeLabels.track}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('Embed Code')}</Label>
          <div className="relative">
            <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre border">
              {snippet}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2 h-8 gap-1.5"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-green-600" />
                  {t('Copied!')}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {t('Copy embed code')}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
