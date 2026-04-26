import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Trash2,
  PowerOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getConnection,
  updateConnection,
  disconnectConnection,
  deleteConnection,
  listRecentSyncEvents,
} from '@/services/supabase/commerce-channels';
import { listOrders } from '@/services/supabase/commerce-orders';
import {
  type CommerceChannelConnection,
  type CommerceSyncEvent,
  type CommerceOrder,
  getPlatformDescriptor,
} from '@/types/commerce-channels';
import { PlatformIcon } from '@/components/commerce/PlatformIcon';
import { toast } from 'sonner';

export function ChannelDetailPage() {
  const { t } = useTranslation('commerce');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [conn, setConn] = useState<CommerceChannelConnection | null>(null);
  const [events, setEvents] = useState<CommerceSyncEvent[]>([]);
  const [orders, setOrders] = useState<CommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, e, o] = await Promise.all([
        getConnection(id),
        listRecentSyncEvents(20),
        listOrders({ connectionId: id, limit: 25 }),
      ]);
      setConn(c);
      setEvents(e.filter((x) => x.connectionId === id));
      setOrders(o);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!conn) {
    return (
      <div className="space-y-3 p-6">
        <p>{t('Channel connection not found')}</p>
        <Button asChild variant="outline"><Link to="/commerce">{t('Back to Hub')}</Link></Button>
      </div>
    );
  }

  const desc = getPlatformDescriptor(conn.platform);

  async function handleToggleSync(checked: boolean) {
    if (!conn) return;
    setBusy(true);
    try {
      const updated = await updateConnection(conn.id, { autoSyncEnabled: checked });
      setConn(updated);
      toast.success(checked ? t('Auto-sync enabled') : t('Auto-sync paused'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    if (!conn) return;
    if (!confirm(t('Disconnect this channel? Sync will stop but order history is preserved.'))) return;
    setBusy(true);
    try {
      await disconnectConnection(conn.id);
      toast.success(t('Channel disconnected'));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!conn) return;
    if (!confirm(t('Permanently delete this connection? This will not remove the order history.'))) return;
    setBusy(true);
    try {
      await deleteConnection(conn.id);
      toast.success(t('Connection deleted'));
      navigate('/commerce');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/commerce"><ArrowLeft className="mr-1 h-4 w-4" />{t('Back to Hub')}</Link>
      </Button>

      {/* Hero header */}
      <Card className="relative overflow-hidden p-6">
        <div
          aria-hidden
          className="absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-20 blur-3xl"
          style={{ background: desc.brandColor }}
        />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-center gap-4">
            <PlatformIcon platform={conn.platform} size={36} badge />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold">{desc.label}</h1>
                <StatusPill status={conn.status} />
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {conn.accountLabel} {conn.accountUrl && (
                  <a href={conn.accountUrl} className="ml-1 inline-flex items-center gap-1 underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                    {conn.accountUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => load()}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
              {t('Refresh')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={busy}>
              <PowerOff className="mr-1 h-3.5 w-3.5" />
              {t('Disconnect')}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete} disabled={busy} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30">
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              {t('Delete')}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          <SmallStat label={t('Auto sync')} value={conn.autoSyncEnabled ? t('On') : t('Off')} />
          <SmallStat label={t('Interval')} value={`${conn.syncIntervalMinutes} min`} />
          <SmallStat label={t('Last sync')} value={conn.lastIncrementalSyncAt ? new Date(conn.lastIncrementalSyncAt).toLocaleString() : '—'} />
          <SmallStat label={t('Orders synced')} value={String(orders.length)} />
        </div>
      </Card>

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">{t('Orders')}</TabsTrigger>
          <TabsTrigger value="events">{t('Sync events')}</TabsTrigger>
          <TabsTrigger value="settings">{t('Settings')}</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">{t('Order')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('Customer')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('Country')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('Items')}</th>
                  <th className="px-4 py-2 text-right font-medium">{t('Amount')}</th>
                  <th className="px-4 py-2 text-left font-medium">{t('Placed')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">{t('No orders yet from this channel.')}</td></tr>
                )}
                {orders.map((o) => (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{o.externalOrderNumber || o.externalOrderId.slice(0, 12)}</td>
                    <td className="px-4 py-2 text-muted-foreground">{o.customerName || o.customerEmail || '—'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{o.customerCountryName || o.customerCountry || '—'}</td>
                    <td className="px-4 py-2">{o.itemCount}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {new Intl.NumberFormat('de-DE', { style: 'currency', currency: o.currency }).format(o.totalAmount)}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(o.placedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          <Card className="divide-y">
            {events.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">{t('No sync events recorded yet.')}</div>
            )}
            {events.map((e) => (
              <div key={e.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3">
                <span className={[
                  'h-2 w-2 rounded-full',
                  e.severity === 'error' ? 'bg-rose-500' : e.severity === 'warning' ? 'bg-amber-500' : e.severity === 'success' ? 'bg-emerald-500' : 'bg-sky-500',
                ].join(' ')} />
                <div>
                  <div className="text-sm font-medium">{e.title}</div>
                  {e.description && <div className="text-xs text-muted-foreground">{e.description}</div>}
                </div>
                <div className="text-xs text-muted-foreground">{new Date(e.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card className="space-y-5 p-5">
            <div className="flex items-start justify-between">
              <div>
                <Label className="text-sm font-medium">{t('Automatic sync')}</Label>
                <p className="text-xs text-muted-foreground">{t('Pull new orders, products and inventory automatically.')}</p>
              </div>
              <Switch checked={conn.autoSyncEnabled} onCheckedChange={handleToggleSync} disabled={busy} />
            </div>
            <div className="flex items-start justify-between">
              <div>
                <Label className="text-sm font-medium">{t('Auto-match by GTIN')}</Label>
                <p className="text-xs text-muted-foreground">{t('Link order line items to your DPP catalog by GTIN automatically.')}</p>
              </div>
              <Switch
                checked={conn.autoMatchByGtin}
                onCheckedChange={async (checked) => {
                  setBusy(true);
                  try {
                    const updated = await updateConnection(conn.id, { autoSyncEnabled: conn.autoSyncEnabled });
                    setConn({ ...updated, autoMatchByGtin: checked });
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
              />
            </div>
            <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs">
              <div className="font-semibold uppercase tracking-wider text-muted-foreground">{t('Required Scopes')}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {conn.scopes.map((s) => (
                  <code key={s} className="rounded bg-background px-1.5 py-0.5 text-[10px]">{s}</code>
                ))}
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-display text-base font-semibold">{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: CommerceChannelConnection['status'] }) {
  if (status === 'connected') return <Badge className="border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 gap-1"><CheckCircle2 className="h-3 w-3" />Connected</Badge>;
  if (status === 'error' || status === 'reauth_required') return <Badge className="border-rose-400/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 gap-1"><AlertCircle className="h-3 w-3" />{status}</Badge>;
  return <Badge variant="secondary" className="capitalize">{status}</Badge>;
}
