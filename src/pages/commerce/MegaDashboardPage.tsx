import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2, RefreshCw, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/contexts/BillingContext';
import { useBranding } from '@/contexts/BrandingContext';
import { MegaKpi } from '@/components/commerce/MegaKpi';
import { LiveOrderFeed } from '@/components/commerce/LiveOrderFeed';
import { GeoHeatmap } from '@/components/commerce/GeoHeatmap';
import { PlatformBreakdown } from '@/components/commerce/PlatformBreakdown';
import { TopProductsLeaderboard } from '@/components/commerce/TopProductsLeaderboard';
import { getMegaDashboardSnapshot } from '@/services/supabase/commerce-orders';
import type { CommerceMegaDashboardSnapshot } from '@/types/commerce-channels';

/**
 * Mega Dashboard — the wall-display experience.
 *
 * - Designed for 1920×1080 → 4K screens
 * - Auto-refreshes every 30s
 * - F11 / fullscreen toggle for kiosks
 * - Dark "operating room" aesthetic so it can dominate any office
 */
export function MegaDashboardPage() {
  const { t } = useTranslation('commerce');
  const billing = useBilling();
  const { branding } = useBranding();
  const [snapshot, setSnapshot] = useState<CommerceMegaDashboardSnapshot | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const limits = billing.entitlements?.limits as Record<string, boolean | number> | undefined;
  const enabled = Boolean(limits?.commerceMegaDashboardEnabled) || billing.hasAnyCommerceHubModule();

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const s = await getMegaDashboardSnapshot();
      setSnapshot(s);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const interval = setInterval(refresh, 30_000);
    const clock = setInterval(() => setNow(new Date()), 1_000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [enabled, refresh]);

  // Fullscreen change tracker
  useEffect(() => {
    const onFs = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  if (!enabled) {
    return (
      <div className="flex h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h1 className="mt-3 font-display text-xl font-semibold">{t('Mega Dashboard requires Commerce Hub')}</h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {t('Activate any Commerce Hub plan to unlock the wall-display experience for live multi-channel sales tracking.')}
          </p>
          <Button asChild className="mt-4">
            <Link to="/settings/billing">{t('Upgrade now')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative -mx-4 -my-4 sm:-mx-6 sm:-my-6 min-h-[calc(100vh-3.5rem)] bg-[#08070d] text-white">
      {/* Atmospheric backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[50vh] w-[50vh] rounded-full bg-gradient-to-br from-fuchsia-500/30 via-fuchsia-700/10 to-transparent blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-[60vh] w-[60vh] rounded-full bg-gradient-to-tl from-cyan-500/30 via-cyan-700/10 to-transparent blur-3xl" />
        <div className="absolute left-1/3 top-1/3 h-[30vh] w-[30vh] rounded-full bg-emerald-500/10 blur-3xl" />
        <DotGridBackdrop />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/30 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="sm" className="text-white/70 hover:bg-white/5 hover:text-white">
            <Link to="/commerce">
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('Hub')}
            </Link>
          </Button>
          <div className="hidden items-center gap-2 md:flex">
            {branding.logo && (
              <img src={branding.logo} alt="" className="h-7 max-w-[120px] object-contain opacity-90" />
            )}
            <div className="h-5 w-px bg-white/15" />
            <div className="flex items-center gap-2">
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
                {t('Live · Mega Dashboard')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right md:block">
            <div className="font-display text-2xl font-bold tabular-nums">
              {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-[11px] uppercase tracking-widest text-white/50">
              {now.toLocaleDateString(undefined, { weekday: 'long', day: '2-digit', month: 'short' })}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:bg-white/5 hover:text-white"
            onClick={refresh}
            disabled={refreshing}
            aria-label={t('Refresh')}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white/70 hover:bg-white/5 hover:text-white"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? t('Exit fullscreen') : t('Enter fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Hero KPI strip */}
      <section className="relative z-10 grid grid-cols-2 gap-4 px-6 pt-6 lg:grid-cols-4">
        {snapshot && (
          <>
            <MegaKpi block={snapshot.hero.revenueToday} hero accent="#22D3EE" />
            <MegaKpi block={snapshot.hero.ordersToday} hero accent="#A78BFA" />
            <MegaKpi block={snapshot.hero.averageOrderValue} hero accent="#34D399" />
            <MegaKpi block={snapshot.hero.conversionEstimate} hero accent="#F472B6" />
          </>
        )}
        {!snapshot && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} hero />)}
      </section>

      {/* 3-column: live feed | geo + breakdown | top products */}
      <section className="relative z-10 grid grid-cols-1 gap-4 px-6 pb-4 pt-4 lg:grid-cols-12">
        <div className="lg:col-span-3 lg:row-span-2 h-[480px] lg:h-auto">
          <LiveOrderFeed orders={snapshot?.liveFeed || []} />
        </div>

        <div className="lg:col-span-6 h-[320px]">
          <GeoHeatmap points={snapshot?.geoPoints || []} />
        </div>

        <div className="lg:col-span-3 lg:row-span-2">
          <TopProductsLeaderboard entries={snapshot?.topProducts || []} />
        </div>

        <div className="lg:col-span-6">
          <PlatformBreakdown entries={snapshot?.platformBreakdown || []} />
        </div>
      </section>

      {/* Footer KPI strip */}
      <section className="relative z-10 grid grid-cols-2 gap-4 px-6 pb-6 lg:grid-cols-4">
        {snapshot && (
          <>
            <MegaKpi block={snapshot.footer.dppActivationsToday} accent="#10B981" />
            <MegaKpi block={snapshot.footer.carbonDeliveredKg} accent="#A3E635" />
            <MegaKpi block={snapshot.footer.returnsRatePct} accent="#F97316" />
            <MegaKpi block={snapshot.footer.avgComplianceScore} accent="#60A5FA" />
          </>
        )}
        {!snapshot && Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)}
      </section>

      {/* Marquee tagline footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/30 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/40">
          <span>{branding.appName} · Commerce Hub</span>
          <span className="hidden md:block">
            {snapshot ? `${t('Updated')} ${new Date(snapshot.generatedAt).toLocaleTimeString()}` : '—'}
          </span>
          <span>↻ 30s</span>
        </div>
      </footer>
    </div>
  );
}

/* ============================================
   visual primitives
   ============================================ */
function Skeleton({ hero }: { hero?: boolean }) {
  return (
    <motion.div
      className={[
        'rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl',
        hero ? 'h-[120px]' : 'h-[100px]',
      ].join(' ')}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 2, repeat: Infinity }}
    />
  );
}

function DotGridBackdrop() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 h-full w-full opacity-[0.08]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="megaDot" width="32" height="32" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#megaDot)" />
    </svg>
  );
}
