import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Copy, Loader2, Webhook, RefreshCw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  listShopifyWebhooks,
  registerShopifyWebhooks,
  deleteShopifyWebhooks,
  testShopifyWebhook,
} from '@/services/supabase/shopify-integration';
import type { ShopifyWebhookSubscription } from '@/types/shopify';
import { toast } from 'sonner';

const REQUIRED_TOPICS = [
  'orders/create',
  'orders/updated',
  'orders/cancelled',
  'orders/fulfilled',
  'orders/paid',
  'fulfillments/create',
  'fulfillments/update',
  'refunds/create',
  'customers/create',
  'customers/update',
  'inventory_levels/update',
  'app/uninstalled',
];

export function ShopifyWebhookSetup() {
  const { t } = useTranslation('warehouse');
  const [webhooks, setWebhooks] = useState<ShopifyWebhookSubscription[]>([]);
  const [expectedAddress, setExpectedAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showManual, setShowManual] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [testResult, setTestResult] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listShopifyWebhooks();
      setWebhooks(res.webhooks);
      setExpectedAddress(res.expectedAddress);
    } catch (err) {
      console.error(err);
      toast.error(t('Failed to load webhooks'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const registeredByTopic = new Map(webhooks.map(w => [w.topic, w]));
  const registeredCount = REQUIRED_TOPICS.filter(topic => {
    const w = registeredByTopic.get(topic);
    return w && w.address === expectedAddress;
  }).length;

  const handleRegister = async () => {
    setBusy(true);
    try {
      const result = await registerShopifyWebhooks();
      toast.success(t('Webhooks registered: {{count}}', { count: result.registered }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('Delete all DPP-registered webhooks from Shopify?'))) return;
    setBusy(true);
    try {
      const res = await deleteShopifyWebhooks();
      toast.success(t('Deleted {{count}} webhooks', { count: res.deleted }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handleTest = async () => {
    setBusy(true);
    try {
      const res = await testShopifyWebhook();
      setTestResult(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('Copied'));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            {t('Webhook Setup')}
          </CardTitle>
          <CardDescription>
            {t('Register Shopify webhooks so new orders, fulfillments and refunds sync live into Trackbliss.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="font-medium">{t('Status')}</div>
              <div className="text-sm text-muted-foreground">
                {registeredCount === REQUIRED_TOPICS.length
                  ? t('All {{total}} topics registered', { total: REQUIRED_TOPICS.length })
                  : t('{{registered}} of {{total}} topics registered', { registered: registeredCount, total: REQUIRED_TOPICS.length })}
              </div>
            </div>
            {registeredCount === REQUIRED_TOPICS.length ? (
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-amber-600" />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRegister} disabled={busy || loading}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t('Register webhooks')}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={busy}>
              {t('Test Ping')}
            </Button>
            {registeredCount > 0 && (
              <Button variant="outline" onClick={handleDelete} disabled={busy}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t('Remove all')}
              </Button>
            )}
          </div>

          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">{t('Topic')}</th>
                  <th className="p-2 text-left">{t('Status')}</th>
                  <th className="p-2 text-left">{t('Created')}</th>
                </tr>
              </thead>
              <tbody>
                {REQUIRED_TOPICS.map(topic => {
                  const w = registeredByTopic.get(topic);
                  const correct = w && w.address === expectedAddress;
                  return (
                    <tr key={topic} className="border-t">
                      <td className="p-2 font-mono text-xs">{topic}</td>
                      <td className="p-2">
                        {correct ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle2 className="mr-1 h-3 w-3" /> {t('Registered')}
                          </Badge>
                        ) : w ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            {t('Wrong address')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground">
                            {t('Missing')}
                          </Badge>
                        )}
                      </td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {w?.created_at ? new Date(w.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {testResult && (
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="font-medium mb-2">{t('Test Result')}</div>
              <p className="text-sm text-muted-foreground mb-2">{testResult.message}</p>
              {testResult.recent?.length > 0 ? (
                <ul className="text-xs space-y-1">
                  {testResult.recent.map((r: { topic: string; received_at: string; status: string }, i: number) => (
                    <li key={i} className="font-mono">
                      [{new Date(r.received_at).toLocaleTimeString()}] {r.topic} — {r.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">{t('No recent events yet')}</p>
              )}
            </div>
          )}

          <Collapsible open={showManual} onOpenChange={setShowManual}>
            <CollapsibleTrigger asChild>
              <Button variant="link" className="p-0 h-auto">
                {showManual ? t('Hide manual setup') : t('Show manual setup')}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-3">
              <div className="text-sm text-muted-foreground">
                {t('If automatic registration fails, set these in Shopify Admin → Settings → Notifications → Webhooks.')}
              </div>
              <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs flex-1 break-all">{expectedAddress || '—'}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(expectedAddress)} aria-label={t('Copy URL')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('Format: JSON. For each required topic above, click "Create webhook" in Shopify Admin and paste this URL.')}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </div>
  );
}
