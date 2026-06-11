/**
 * Integrations Hub — central gallery for carrier + commerce integrations.
 *
 * Phase 1: DHL is fully wired (delegates to the dedicated DHL page /
 * Edge Function), all other carriers connect as account references that
 * enable tracking links; label creation follows in a later phase.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Plug,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Unplug,
  Info,
  Store,
} from 'lucide-react';
import { toast } from 'sonner';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { gridStagger, gridItem, blurIn, useMotionVariants, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';
import {
  listCarrierIntegrations,
  saveCarrierIntegration,
  disconnectCarrierIntegration,
  testCarrierConnection,
} from '@/services/supabase/carrier-integrations';
import type { CarrierIntegrationView, CarrierCatalogEntry } from '@/services/supabase/carrier-integrations';
import { getShopifySettings } from '@/services/supabase/shopify-integration';

// ---------------------------------------------------------------------------
// Brand avatars (logo initials, brand colors)
// ---------------------------------------------------------------------------
const CARRIER_BRAND: Record<string, { bg: string; text: string; initials: string }> = {
  dhl: { bg: 'bg-yellow-400', text: 'text-red-600', initials: 'DHL' },
  dhl_express: { bg: 'bg-yellow-400', text: 'text-red-600', initials: 'DX' },
  ups: { bg: 'bg-amber-900', text: 'text-yellow-400', initials: 'UPS' },
  gls: { bg: 'bg-blue-700', text: 'text-white', initials: 'GLS' },
  dpd: { bg: 'bg-red-600', text: 'text-white', initials: 'DPD' },
  hermes: { bg: 'bg-sky-600', text: 'text-white', initials: 'H' },
};

function BrandAvatar({ carrierId, name }: { carrierId: string; name: string }) {
  const brand = CARRIER_BRAND[carrierId] || { bg: 'bg-muted', text: 'text-foreground', initials: name.slice(0, 2).toUpperCase() };
  return (
    <div
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-extrabold tracking-tight shadow-sm',
        brand.initials.length > 2 ? 'text-[11px]' : 'text-sm',
        brand.bg,
        brand.text,
      )}
      aria-hidden="true"
    >
      {brand.initials}
    </div>
  );
}

function StatusDot({ connected }: { connected: boolean }) {
  const prefersReduced = useReducedMotion();
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      {connected && !prefersReduced && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 animate-status-ping" />
      )}
      <span
        className={cn(
          'relative inline-flex h-2.5 w-2.5 rounded-full',
          connected ? 'bg-green-500' : 'bg-muted-foreground/40',
        )}
      />
    </span>
  );
}

function CapabilityChip({ label, available }: { label: string; available: boolean }) {
  const { t } = useTranslation('warehouse');
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 text-[11px] font-normal',
        available
          ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-400'
          : 'border-dashed text-muted-foreground',
      )}
    >
      {available ? <CheckCircle2 className="h-3 w-3" /> : null}
      {label}
      {!available && <span className="opacity-70">· {t('Coming soon')}</span>}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function IntegrationsHubPage() {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();
  const staggerVariants = useMotionVariants(gridStagger);
  const itemVariants = useMotionVariants(gridItem);
  const headerVariants = useMotionVariants(blurIn);

  const [loading, setLoading] = useState(true);
  const [integrations, setIntegrations] = useState<CarrierIntegrationView[]>([]);
  const [shopifyConnected, setShopifyConnected] = useState(false);

  // Connect dialog state
  const [connectTarget, setConnectTarget] = useState<CarrierCatalogEntry | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  const tapProps = useMemo(
    () => (prefersReduced ? {} : { whileTap: { scale: 0.97 } }),
    [prefersReduced],
  );
  const hoverLift = useMemo(
    () => (prefersReduced ? {} : { whileHover: { y: -3 } }),
    [prefersReduced],
  );

  const load = useCallback(async () => {
    // Both lookups are individually guarded — the hub must never crash,
    // even before the wh_carrier_integrations migration is applied.
    const [carriers, shopify] = await Promise.all([
      listCarrierIntegrations().catch(() => [] as CarrierIntegrationView[]),
      getShopifySettings().catch(() => null),
    ]);
    setIntegrations(carriers);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setShopifyConnected(!!((shopify as any)?.enabled && (shopify as any)?.shopDomain));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openConnectDialog = (catalog: CarrierCatalogEntry) => {
    setConnectTarget(catalog);
    setFieldValues({});
  };

  const handleConnect = async () => {
    if (!connectTarget) return;
    setSaving(true);
    try {
      const settings: Record<string, unknown> = {};
      for (const field of connectTarget.credentialFields) {
        if (fieldValues[field.key]) settings[field.key] = fieldValues[field.key].trim();
      }
      const hint = connectTarget.credentialFields
        .map((f) => fieldValues[f.key]?.trim())
        .find(Boolean);
      await saveCarrierIntegration(connectTarget.carrierId, settings, hint);
      toast.success(t('Configuration saved'));
      setConnectTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (carrierId: string) => {
    setDisconnectingId(carrierId);
    try {
      await disconnectCarrierIntegration(carrierId);
      toast.success(t('Disconnected'));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleTest = async (carrierId: string) => {
    setTestingId(carrierId);
    try {
      const result = await testCarrierConnection(carrierId);
      if (result.success) toast.success(t('Connection successful'));
      else toast.error(result.error || t('Connection failed'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Connection failed'));
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <ShimmerSkeleton className="h-8 w-56" />
          <ShimmerSkeleton className="h-4 w-80 max-w-full" />
        </div>
        <ShimmerSkeleton className="h-5 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ShimmerSkeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
        <ShimmerSkeleton className="h-5 w-32" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <ShimmerSkeleton className="h-44 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      {/* Header */}
      <motion.div variants={headerVariants} initial="initial" animate="animate" className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Plug className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('Integrations')}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t('Connect carriers and commerce platforms in one place.')}
          </p>
        </div>
      </motion.div>

      {/* Carriers */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('Shipping Carriers')}
        </h2>
        <motion.div
          variants={staggerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {integrations.map((integration) => {
            const { catalog } = integration;
            const connected = integration.status === 'connected';
            const isDhl = catalog.carrierId === 'dhl';
            return (
              <GlassCard
                key={catalog.carrierId}
                variants={itemVariants}
                {...hoverLift}
                enableGlow
                className="flex flex-col gap-3 p-4 sm:p-5"
              >
                {/* Top row: avatar + name + status */}
                <div className="flex items-start gap-3">
                  <BrandAvatar carrierId={catalog.carrierId} name={catalog.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{catalog.name}</h3>
                      <StatusDot connected={connected} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {connected
                        ? integration.accountHint || t('Connected')
                        : t('Not connected')}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {t(catalog.descriptionKey)}
                </p>

                {/* Capability chips */}
                <div className="flex flex-wrap gap-1.5">
                  <CapabilityChip label={t('Labels')} available={catalog.capabilities.labels} />
                  <CapabilityChip label={t('Tracking')} available={catalog.capabilities.tracking} />
                  {catalog.capabilities.returns && (
                    <CapabilityChip label={t('Returns')} available />
                  )}
                  {catalog.capabilities.addressValidation && (
                    <CapabilityChip label={t('Address Validation')} available />
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto flex flex-col sm:flex-row gap-2 pt-1">
                  {isDhl ? (
                    <>
                      <motion.div {...tapProps} className="flex-1">
                        <Button asChild variant={connected ? 'outline' : 'default'} className="w-full min-h-[44px] sm:min-h-9">
                          <Link to="/warehouse/integrations/dhl">
                            {t('Manage')}
                            <ArrowRight className="h-4 w-4 ml-1.5" />
                          </Link>
                        </Button>
                      </motion.div>
                      {connected && (
                        <motion.div {...tapProps} className="flex-1">
                          <Button
                            variant="outline"
                            className="w-full min-h-[44px] sm:min-h-9"
                            onClick={() => handleTest('dhl')}
                            disabled={testingId === 'dhl'}
                          >
                            {testingId === 'dhl'
                              ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                              : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                            {t('Test Connection')}
                          </Button>
                        </motion.div>
                      )}
                    </>
                  ) : connected ? (
                    <motion.div {...tapProps} className="flex-1">
                      <Button
                        variant="outline"
                        className="w-full min-h-[44px] sm:min-h-9"
                        onClick={() => handleDisconnect(catalog.carrierId)}
                        disabled={disconnectingId === catalog.carrierId}
                      >
                        {disconnectingId === catalog.carrierId
                          ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          : <Unplug className="h-4 w-4 mr-1.5" />}
                        {t('Disconnect')}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div {...tapProps} className="flex-1">
                      <Button
                        className="w-full min-h-[44px] sm:min-h-9"
                        onClick={() => openConnectDialog(catalog)}
                      >
                        <Plug className="h-4 w-4 mr-1.5" />
                        {t('Connect')}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </motion.div>
      </section>

      {/* Commerce */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t('Commerce')}
        </h2>
        <motion.div
          variants={staggerVariants}
          initial="initial"
          animate="animate"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          <GlassCard
            variants={itemVariants}
            {...hoverLift}
            enableGlow
            className="flex flex-col gap-3 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm" aria-hidden="true">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold truncate">Shopify</h3>
                  <StatusDot connected={shopifyConnected} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {shopifyConnected ? t('Connected') : t('Not connected')}
                </p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {t('Connect your Shopify store to sync orders, inventory and fulfillments.')}
            </p>
            <div className="mt-auto pt-1">
              <motion.div {...tapProps}>
                <Button asChild variant={shopifyConnected ? 'outline' : 'default'} className="w-full sm:w-auto min-h-[44px] sm:min-h-9">
                  <Link to="/warehouse/integrations/shopify">
                    {t('Manage')}
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </Link>
                </Button>
              </motion.div>
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* Connect dialog (non-DHL carriers) */}
      <Dialog open={!!connectTarget} onOpenChange={(open) => { if (!open) setConnectTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          {connectTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">
                  <BrandAvatar carrierId={connectTarget.carrierId} name={connectTarget.name} />
                  {t('Connect')} {connectTarget.name}
                </DialogTitle>
                <DialogDescription>{t(connectTarget.descriptionKey)}</DialogDescription>
              </DialogHeader>

              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/20 p-3 flex gap-2.5 text-xs text-blue-800 dark:text-blue-300">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  {t('Label creation for this carrier is coming soon. Connecting saves your account reference and enables tracking links.')}
                </span>
              </div>

              <div className="space-y-3">
                {connectTarget.credentialFields.map((field) => (
                  <div key={field.key}>
                    <Label className="text-xs text-muted-foreground">{t(field.labelKey)}</Label>
                    <Input
                      value={fieldValues[field.key] || ''}
                      onChange={(e) => setFieldValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="min-h-[44px] sm:min-h-9"
                    />
                  </div>
                ))}
                {connectTarget.credentialFields.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t('Account reference')}: —</p>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" className="min-h-[44px] sm:min-h-9" onClick={() => setConnectTarget(null)}>
                  {t('Cancel', { ns: 'common' })}
                </Button>
                <motion.div {...tapProps}>
                  <Button className="w-full min-h-[44px] sm:min-h-9" onClick={handleConnect} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plug className="h-4 w-4 mr-1.5" />}
                    {t('Connect')}
                  </Button>
                </motion.div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
