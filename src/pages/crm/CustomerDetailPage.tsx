import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, User, ExternalLink, Mail, Phone, Package, Tag, TrendingUp, AlertTriangle, RefreshCw, ShoppingBag, Undo2, MessageSquare, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getCustomerDetail, getCustomerTimeline, getCustomerCLVTrend, refreshCustomerStats, suggestNextAction, buildShopifyCustomerLink, type CrmCustomer, type TimelineEvent } from '@/services/supabase/crm-analytics';
import { getShopifySettings } from '@/services/supabase/shopify-integration';
import { toast } from 'sonner';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const SEGMENT_TONE: Record<string, string> = {
  champion:    'bg-purple-100 text-purple-900 border-purple-300',
  loyal:       'bg-green-100 text-green-900 border-green-300',
  potential:   'bg-sky-100 text-sky-900 border-sky-300',
  new:         'bg-emerald-100 text-emerald-900 border-emerald-300',
  at_risk:     'bg-amber-100 text-amber-900 border-amber-300',
  hibernating: 'bg-orange-100 text-orange-900 border-orange-300',
  lost:        'bg-red-100 text-red-900 border-red-300',
};
const SEGMENT_LABEL: Record<string, string> = {
  champion: 'Champion', loyal: 'Treu', potential: 'Potenzial', new: 'Neu',
  at_risk: 'Gefährdet', hibernating: 'Schlummernd', lost: 'Verloren',
};

function fmtEuro(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

export function CustomerDetailPage() {
  const { t } = useTranslation('warehouse');
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<CrmCustomer | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [trend, setTrend] = useState<{ month: string; revenue: number; orders: number }[]>([]);
  const [shopDomain, setShopDomain] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [c, tl, tr, sh] = await Promise.all([
      getCustomerDetail(id),
      getCustomerTimeline(id),
      getCustomerCLVTrend(id, 12),
      getShopifySettings(),
    ]);
    setCustomer(c);
    setTimeline(tl);
    setTrend(tr);
    setShopDomain(sh?.shopDomain);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    if (!id) return;
    setRefreshing(true);
    try {
      await refreshCustomerStats(id);
      await load();
      toast.success(t('Kundendaten aktualisiert'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }

  if (loading || !customer) {
    return (
      <div className="px-4 py-4 sm:p-6 space-y-4">
        <ShimmerSkeleton className="h-16" />
        <ShimmerSkeleton className="h-32" />
        <ShimmerSkeleton className="h-64" />
      </div>
    );
  }

  const shopifyUrl = buildShopifyCustomerLink(shopDomain, customer.shopifyCustomerId);
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || customer.id.slice(0, 8);
  const daysInactive = daysSince(customer.lastOrderAt);
  const nextAction = suggestNextAction(customer);

  return (
    <div className="px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Back + Title */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/crm/customers"><ArrowLeft className="h-4 w-4 mr-1" />{t('Zurück')}</Link>
        </Button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <User className="h-5 w-5 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold truncate">{fullName}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`mr-1 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('Aktualisieren')}
          </Button>
          {shopifyUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={shopifyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 h-4 w-4" />{t('In Shopify')}
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Badges-Row */}
      <div className="flex flex-wrap gap-2">
        {customer.rfmSegment && (
          <Badge variant="outline" className={SEGMENT_TONE[customer.rfmSegment]}>
            {SEGMENT_LABEL[customer.rfmSegment]}
          </Badge>
        )}
        {customer.lifecycleStage && (
          <Badge variant="secondary">{customer.lifecycleStage}</Badge>
        )}
        {customer.riskScore > 50 && (
          <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Risk {customer.riskScore}</Badge>
        )}
        {(customer.tags || []).map(tag => (
          <Badge key={tag} variant="outline" className="gap-1"><Tag className="h-3 w-3" />{tag}</Badge>
        ))}
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KPI icon={<Package />} label={t('Bestellungen')} value={String(customer.totalOrders)} />
        <KPI icon={<TrendingUp />} label={t('CLV')} value={fmtEuro(customer.totalSpent)} highlight />
        <KPI icon={<ShoppingBag />} label={t('Ø Bestellwert')} value={fmtEuro(customer.avgOrderValue)} />
        <KPI icon={<AlertTriangle />} label={t('Seit letzter Bestellung')} value={daysInactive != null ? `${daysInactive} Tage` : '—'}
             tone={daysInactive != null && daysInactive > 90 ? 'amber' : undefined} />
      </div>

      {/* Next-Best-Action + Contact-Card */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />{t('Nächster Schritt')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={nextAction.urgency === 'high' ? 'destructive' : nextAction.urgency === 'medium' ? 'default' : 'secondary'}>
                {nextAction.urgency === 'high' ? t('Dringend') : nextAction.urgency === 'medium' ? t('Empfohlen') : t('Optional')}
              </Badge>
              <span className="font-medium">{nextAction.label}</span>
            </div>
            <p className="text-sm text-muted-foreground">{nextAction.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('Kontakt')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {customer.email && (
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground shrink-0" /><a href={`mailto:${customer.email}`} className="truncate hover:underline">{customer.email}</a></div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground shrink-0" /><span>{customer.phone}</span></div>
            )}
            {customer.company && (
              <div className="text-xs text-muted-foreground">{customer.company}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CLV Trend Chart */}
      {trend.length > 0 && trend.some(p => p.revenue > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('CLV-Verlauf (12 Monate)')}</CardTitle>
          </CardHeader>
          <CardContent className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtEuro(v)} />
                <Tooltip formatter={(v: number) => fmtEuro(v)} labelClassName="font-semibold" />
                <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Timeline Tabs */}
      <Card>
        <Tabs defaultValue="timeline">
          <CardHeader>
            <TabsList>
              <TabsTrigger value="timeline">{t('Timeline')}</TabsTrigger>
              <TabsTrigger value="orders">{t('Bestellungen')} ({timeline.filter(e => e.type === 'shipment').length})</TabsTrigger>
              <TabsTrigger value="returns">{t('Retouren')} ({timeline.filter(e => e.type === 'return').length})</TabsTrigger>
              <TabsTrigger value="tickets">{t('Tickets')} ({timeline.filter(e => e.type === 'ticket').length})</TabsTrigger>
              <TabsTrigger value="emails">{t('E-Mails')} ({timeline.filter(e => e.type === 'notification').length})</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            <TabsContent value="timeline"><EventList events={timeline} /></TabsContent>
            <TabsContent value="orders"><EventList events={timeline.filter(e => e.type === 'shipment')} /></TabsContent>
            <TabsContent value="returns"><EventList events={timeline.filter(e => e.type === 'return')} /></TabsContent>
            <TabsContent value="tickets"><EventList events={timeline.filter(e => e.type === 'ticket')} /></TabsContent>
            <TabsContent value="emails"><EventList events={timeline.filter(e => e.type === 'notification')} /></TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
}

function KPI({ icon, label, value, highlight, tone }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean; tone?: 'amber' | 'red' }) {
  const toneCls = tone === 'amber' ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20' : tone === 'red' ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : '';
  return (
    <Card className={toneCls}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
          {label}
        </div>
        <div className={`text-xl sm:text-2xl font-bold tabular-nums ${highlight ? 'text-primary' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function EventList({ events }: { events: TimelineEvent[] }) {
  const { t } = useTranslation('warehouse');
  if (events.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">{t('Noch keine Einträge')}</div>;
  }
  return (
    <div className="divide-y">
      {events.map(e => (
        <div key={e.id} className="flex items-start gap-3 py-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
            {e.type === 'shipment' && <Package />}
            {e.type === 'return' && <Undo2 />}
            {e.type === 'ticket' && <MessageSquare />}
            {e.type === 'notification' && <Send />}
          </div>
          <div className="flex-1 min-w-0">
            {e.deepLink ? (
              <Link to={e.deepLink} className="font-medium hover:underline">{e.title}</Link>
            ) : (
              <div className="font-medium">{e.title}</div>
            )}
            {e.description && <div className="text-xs text-muted-foreground mt-0.5 break-words">{e.description}</div>}
            <div className="text-[11px] text-muted-foreground mt-1">
              {new Date(e.timestamp).toLocaleString('de-DE')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
