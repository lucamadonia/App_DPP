import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Code2, Building2, ExternalLink, Plus, Trash2, Globe, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface EmbedSnippetCardProps {
  tenantSlug: string;
  tenantName?: string;
  allowedDomains?: string[];
  onAllowedDomainsChange?: (domains: string[]) => void;
}

type WidgetType = 'portal' | 'register' | 'track';

function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  // Remove protocol
  d = d.replace(/^https?:\/\//, '');
  // Remove trailing slash/path
  d = d.replace(/\/.*$/, '');
  // Remove port
  d = d.replace(/:\d+$/, '');
  return d;
}

export function EmbedSnippetCard({ tenantSlug, tenantName, allowedDomains = [], onAllowedDomainsChange }: EmbedSnippetCardProps) {
  const { t } = useTranslation('returns');
  const [widgetType, setWidgetType] = useState<WidgetType>('portal');
  const [copied, setCopied] = useState(false);
  const [newDomain, setNewDomain] = useState('');

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

  const handleAddDomain = () => {
    const domain = normalizeDomain(newDomain);
    if (!domain) return;
    if (allowedDomains.includes(domain)) {
      setNewDomain('');
      return;
    }
    onAllowedDomainsChange?.([...allowedDomains, domain]);
    setNewDomain('');
  };

  const handleRemoveDomain = (domain: string) => {
    onAllowedDomainsChange?.(allowedDomains.filter((d) => d !== domain));
  };

  const typeLabels: Record<WidgetType, string> = {
    portal: t('Portal (Full)'),
    register: t('Registration Only'),
    track: t('Tracking Only'),
  };

  return (
    <div className="space-y-4">
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

          {tenantName && (
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="text-sm">
                  {t('Tenant')}: <span className="font-semibold">{tenantName}</span>{' '}
                  <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{tenantSlug}</code>
                </span>
              </div>
              <a
                href={`${origin}/embed/${widgetType}/${tenantSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t('Preview embed')}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('Allowed Domains')}
          </CardTitle>
          <CardDescription>
            {t('Only these domains can embed your returns portal. Leave empty to allow all domains.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                placeholder="example.com"
                className="pl-9"
              />
            </div>
            <Button onClick={handleAddDomain} disabled={!newDomain.trim()} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" />
              {t('Add Domain')}
            </Button>
          </div>

          {allowedDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t('No domain restrictions — embedding allowed from any website.')}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allowedDomains.map((domain) => (
                <Badge
                  key={domain}
                  variant="secondary"
                  className="gap-1.5 pl-3 pr-1.5 py-1.5 text-sm"
                >
                  <Globe className="h-3 w-3" />
                  {domain}
                  <button
                    onClick={() => handleRemoveDomain(domain)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
