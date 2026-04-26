import { useEffect, useMemo, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Sparkles,
  Tv2,
  PlugZap,
  Activity,
  Lock,
  Plus,
  AlertCircle,
  Zap,
  Database,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBilling } from '@/contexts/BillingContext';
import { PlatformCard } from '@/components/commerce/PlatformCard';
import { ConnectWizard } from '@/components/commerce/ConnectWizard';
import {
  ALL_COMMERCE_PLATFORMS,
  type CommerceChannelConnection,
  type CommercePlatform,
} from '@/types/commerce-channels';
import {
  listConnections,
  getHealthSummary,
  type CommerceHealthSummary,
} from '@/services/supabase/commerce-channels';
import {
  seedSampleOrders,
  clearSampleOrders,
} from '@/services/supabase/commerce-orders';
import {
  bridgeShopifyToCommerceHub,
  autoLinkWarehouseIntegrations,
  countUnbridgedShopifyOrders,
} from '@/services/supabase/commerce-shopify-bridge';
import { toast } from 'sonner';

/**
 * Commerce Hub landing page.
 *
 * Lists all supported platforms in a marketing-grade grid, surfaces health
 * for already-connected channels, and ushers the operator to the Mega Dashboard
 * (TV-mode wall display) and the new-channel connect wizard.
 */
export function CommerceHubPage() {
  const { t } = useTranslation('commerce');
  const billing = useBilling();
  const [connections, setConnections] = useState<CommerceChannelConnection[]>([]);
  const [health, setHealth] = useState<CommerceHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardPlatform, setWizardPlatform] = useState<CommercePlatform | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [bridging, setBridging] = useState(false);
  const [unbridgedShopify, setUnbridgedShopify] = useState(0);

  const hasModule = billing.hasAnyCommerceHubModule();
  const limits = billing.entitlements?.limits as Record<string, number> | undefined;
  const maxConnections = limits?.maxCommerceConnections ?? 0;

  const load = useCallback(async () => {
    if (!hasModule) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Auto-detect Warehouse-side integrations (Shopify) so they appear as connected on first visit.
      // No-op if a Commerce Hub connection already exists.
      await autoLinkWarehouseIntegrations().catch((err) => {
        console.warn('Auto-link warehouse integrations skipped:', err);
      });

      const [conns, hs, unbridged] = await Promise.all([
        listConnections(),
        getHealthSummary(),
        countUnbridgedShopifyOrders().catch(() => 0),
      ]);
      setConnections(conns);
      setHealth(hs);
      setUnbridgedShopify(unbridged);
    } catch (err) {
      console.error('Commerce Hub load failed:', err);
    } finally {
      setLoading(false);
    }
  }, [hasModule]);

  useEffect(() => { load(); }, [load]);

  const connectionByPlatform = useMemo(() => {
    const m = new Map<CommercePlatform, CommerceChannelConnection>();
    for (const c of connections) m.set(c.platform, c);
    return m;
  }, [connections]);

  const atLimit = connections.length >= maxConnections;

  /* Locked / no-module state */
  if (!hasModule) {
    return <CommerceHubLocked />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            {t('Commerce Hub')}
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold leading-tight md:text-4xl">
            {t('All your sales channels — one passport-aware dashboard.')}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t('Connect Shopify, Etsy, Pinterest, Amazon, eBay, WooCommerce and more. Match every order to its Digital Product Passport in real time.')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link to="/commerce/mega">
              <Tv2 className="h-4 w-4" />
              {t('Open Mega Dashboard')}
            </Link>
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/commerce/orders">
              <Database className="h-4 w-4" />
              {t('All Orders')}
            </Link>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={bridging}
            onClick={async () => {
              setBridging(true);
              try {
                const res = await bridgeShopifyToCommerceHub();
                if (res.ordersInserted > 0) {
                  toast.success(
                    t('Imported {{n}} Shopify orders ({{linked}} DPP-linked)', {
                      n: res.ordersInserted,
                      linked: res.itemsLinkedToDpp,
                    }),
                  );
                } else {
                  toast(t('Already in sync — {{n}} Shopify orders mirrored', { n: res.ordersSkipped }));
                }
                await load();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Bridge failed');
              } finally {
                setBridging(false);
              }
            }}
          >
            <Download className="h-4 w-4" />
            {bridging ? t('Importing…') : t('Import existing Shopify orders')}
          </Button>
        </div>
      </div>

      {/* Health strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <HealthStat
          icon={PlugZap}
          label={t('Connections')}
          value={`${connections.length}/${maxConnections === Infinity ? '∞' : maxConnections}`}
          tone={atLimit ? 'warning' : 'default'}
        />
        <HealthStat
          icon={Activity}
          label={t('Active syncs')}
          value={`${health?.connected ?? 0}`}
          tone="success"
        />
        <HealthStat
          icon={AlertCircle}
          label={t('Issues')}
          value={`${(health?.errors ?? 0) + (health?.awaitingReauth ?? 0)}`}
          tone={(health?.errors ?? 0) > 0 ? 'error' : 'default'}
        />
        <HealthStat
          icon={Zap}
          label={t('Last sync')}
          value={health?.lastSyncAt ? relTime(health.lastSyncAt) : '—'}
          tone="default"
        />
      </div>

      {/* Unbridged Shopify banner — appears when warehouse Shopify has orders not yet mirrored */}
      {unbridgedShopify > 0 && (
        <Card className="overflow-hidden border-emerald-300/40 bg-emerald-50/40 dark:bg-emerald-950/20 dark:border-emerald-700/30">
          <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-500/15 p-2.5 text-emerald-700 dark:text-emerald-300">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-base font-semibold">
                  {t('{{n}} Shopify orders ready to import', { n: unbridgedShopify })}
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('You already have Shopify connected in the Warehouse module — pull those orders into the Commerce Hub now to populate the Mega Dashboard.')}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={bridging}
              className="self-start md:self-auto"
              onClick={async () => {
                setBridging(true);
                try {
                  const res = await bridgeShopifyToCommerceHub();
                  toast.success(
                    t('Imported {{n}} Shopify orders ({{linked}} DPP-linked)', {
                      n: res.ordersInserted,
                      linked: res.itemsLinkedToDpp,
                    }),
                  );
                  await load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Bridge failed');
                } finally {
                  setBridging(false);
                }
              }}
            >
              {bridging ? t('Importing…') : t('Import {{n}} orders now', { n: unbridgedShopify })}
            </Button>
          </div>
        </Card>
      )}

      {/* Connected channels */}
      {connections.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">{t('Connected channels')}</h2>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link to="/commerce/mega"><Tv2 className="h-3.5 w-3.5" /> {t('See live')}</Link>
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {connections.map((c) => (
              <PlatformCard
                key={c.id}
                platform={c.platform}
                connection={c}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sample data CTA — only when no real data yet */}
      {!loading && connections.length === 0 && (
        <Card className="overflow-hidden border-dashed bg-gradient-to-br from-primary/[0.04] to-transparent p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-semibold">{t('Try the Mega Dashboard with sample data')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('No channels connected yet? Seed 30 lifelike orders across 6 platforms to preview the wall display in 30 seconds.')}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  disabled={seeding}
                  onClick={async () => {
                    setSeeding(true);
                    try {
                      const res = await seedSampleOrders();
                      toast.success(t('Seeded {{orders}} sample orders', { orders: res.insertedOrders }));
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Seeding failed');
                    } finally {
                      setSeeding(false);
                    }
                  }}
                >
                  {seeding ? t('Seeding…') : t('Seed sample orders')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const res = await clearSampleOrders();
                    toast(t('Removed {{n}} sample orders', { n: res.removed }));
                  }}
                >
                  {t('Clear samples')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Available channels grid */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">
            {connections.length > 0 ? t('Add another channel') : t('Available channels')}
          </h2>
          {atLimit && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Lock className="h-3 w-3" />
              {t('Connection limit reached — upgrade to add more.')}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ALL_COMMERCE_PLATFORMS
            .filter((p) => p !== 'manual' && p !== 'custom_api')
            .map((p) => {
              const conn = connectionByPlatform.get(p);
              if (conn) return null; // already shown above
              return (
                <PlatformCard
                  key={p}
                  platform={p}
                  locked={atLimit}
                  onConnect={() => setWizardPlatform(p)}
                />
              );
            })
            .filter(Boolean)}
          <PlatformCard
            platform="manual"
            onConnect={() => setWizardPlatform('manual')}
          />
          <PlatformCard
            platform="custom_api"
            onConnect={() => setWizardPlatform('custom_api')}
          />
        </div>
      </section>

      <ConnectWizard
        platform={wizardPlatform}
        open={!!wizardPlatform}
        onClose={() => setWizardPlatform(null)}
        onConnected={load}
      />
    </div>
  );
}

/* ============================================
   Health stat tile
   ============================================ */
function HealthStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: 'default' | 'success' | 'warning' | 'error';
}) {
  const ring = {
    default: 'ring-border',
    success: 'ring-emerald-400/30',
    warning: 'ring-amber-400/30',
    error: 'ring-rose-400/30',
  }[tone];
  return (
    <Card className={`p-4 ring-1 ${ring}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tabular-nums">{value}</div>
    </Card>
  );
}

/* ============================================
   Locked state — no module purchased
   ============================================ */
function CommerceHubLocked() {
  const { t } = useTranslation('commerce');
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/[0.06] via-transparent to-transparent">
        <div className="grid items-center gap-6 p-8 md:grid-cols-[auto_1fr] md:p-12">
          <div className="rounded-3xl bg-primary/10 p-6 text-primary">
            <ShoppingBag className="h-12 w-12" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">
              {t('Commerce Hub is a paid module')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Unify orders from Shopify, Etsy, Pinterest, Amazon, eBay, WooCommerce and more — and link every line item to its Digital Product Passport. Includes the 4K-ready Mega Dashboard wall display.')}
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <PlanTile name={t('Starter')} price="€29" subline={t('1 channel · 500 orders/mo')} />
              <PlanTile name={t('Professional')} price="€69" subline={t('3 channels · 5,000 orders/mo · Webhooks')} highlighted />
              <PlanTile name={t('Business')} price="€149" subline={t('Unlimited · Whitelabel · API')} />
            </div>
            <div className="mt-6 flex gap-2">
              <Button asChild>
                <Link to="/settings/billing">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('Upgrade now')}
                </Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/pricing">{t('See plan comparison')}</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanTile({ name, price, subline, highlighted }: { name: string; price: string; subline: string; highlighted?: boolean }) {
  return (
    <div className={[
      'rounded-2xl border p-4',
      highlighted ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border bg-card',
    ].join(' ')}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{name}</div>
      <div className="mt-1 font-display text-2xl font-bold">{price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
      <div className="mt-1 text-xs text-muted-foreground">{subline}</div>
    </div>
  );
}

function relTime(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}
