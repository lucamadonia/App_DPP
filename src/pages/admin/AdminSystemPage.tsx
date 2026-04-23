/**
 * Admin System-Status Page
 *   - Shopify Webhook Dead Letter Queue mit Retry
 *   - pg_cron Jobs Übersicht (erfordert Service-Role, zeigt aus admin-api)
 *   - Supabase Edge Functions (links)
 */
import { useState, useEffect } from 'react';
import {
  ServerCog, RefreshCw, AlertTriangle, RotateCcw, CheckCircle2,
  ExternalLink, Clock, Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { listFailedWebhooks, retryWebhook } from '@/services/supabase/admin';
import type { ShopifyWebhookEntry } from '@/types/admin-extended';
import { toast } from 'sonner';

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `vor ${min} Min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `vor ${hr} Std`;
  return `vor ${Math.floor(hr / 24)} Tagen`;
}

export function AdminSystemPage() {
  const [webhooks, setWebhooks] = useState<ShopifyWebhookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setWebhooks(await listFailedWebhooks({ limit: 100 }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRetry(id: string) {
    setRetrying(id);
    try {
      await retryWebhook(id);
      toast.success('Webhook zurück in die Queue gelegt');
      await load(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRetrying(null);
    }
  }

  const failed = webhooks.filter(w => w.status === 'failed');
  const dlq = webhooks.filter(w => w.status === 'dead_letter');

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1200px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ServerCog className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">System-Status</h1>
            <p className="text-xs text-muted-foreground">
              Webhook-Queue, Edge Functions, Cron Jobs
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Neu laden
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Failed (retry möglich)" value={failed.length} tone={failed.length > 0 ? 'amber' : 'emerald'} />
        <StatCard label="Dead Letter Queue" value={dlq.length} tone={dlq.length > 0 ? 'red' : 'emerald'} />
        <StatCard label="Gesamt problematisch" value={webhooks.length} tone={webhooks.length > 0 ? 'amber' : 'emerald'} />
        <StatCard label="Als OK" value={webhooks.length === 0 ? '✓' : '–'} tone="emerald" />
      </div>

      {/* Webhook-DLQ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Shopify Webhook-Queue
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Fehlgeschlagene Webhooks können hier manuell zurück in die Queue gelegt werden.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <ShimmerSkeleton key={i} className="h-14" />)}</div>
          ) : webhooks.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-medium">Alle Webhooks OK</p>
              <p className="text-xs text-muted-foreground">Keine fehlgeschlagenen Events in der Queue.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {webhooks.map(w => (
                <li key={w.id} className="p-3 flex items-start gap-3">
                  <div className="shrink-0">
                    {w.status === 'dead_letter'
                      ? <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 h-5 text-[10px]">DLQ</Badge>
                      : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 h-5 text-[10px]">FAILED</Badge>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm">{w.topic}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {w.shopDomain}
                      </span>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">{w.attempts} Versuche</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{relativeTime(w.receivedAt)}</span>
                    </div>
                    {w.lastError && (
                      <div className="mt-1 text-[11px] text-red-700 dark:text-red-400 truncate">
                        {w.lastError}
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRetry(w.id)}
                    disabled={retrying === w.id}
                  >
                    <RotateCcw className={`h-3.5 w-3.5 mr-1 ${retrying === w.id ? 'animate-spin' : ''}`} />
                    Retry
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Static info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Externe Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="text-sm font-medium flex items-center gap-1.5">
                Supabase Dashboard
                <ExternalLink className="h-3 w-3 opacity-60" />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Edge Functions, DB, Cron</div>
            </a>
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="text-sm font-medium flex items-center gap-1.5">
                Vercel Dashboard
                <ExternalLink className="h-3 w-3 opacity-60" />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Deployments, Logs, Envs</div>
            </a>
            <a
              href="https://dashboard.stripe.com"
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border p-3 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="text-sm font-medium flex items-center gap-1.5">
                Stripe Dashboard
                <ExternalLink className="h-3 w-3 opacity-60" />
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Zahlungen, Subscriptions</div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number | string; tone: 'emerald' | 'amber' | 'red' }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : 'text-red-600';
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{label}</div>
        <div className={`text-2xl font-bold tabular-nums mt-1 ${toneClass}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
