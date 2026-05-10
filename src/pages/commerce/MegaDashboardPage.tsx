import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowLeft, Maximize2, Minimize2, RefreshCw, Sparkles } from 'lucide-react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useBilling } from '@/contexts/BillingContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useDeviceMotion } from '@/hooks/use-device-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { MegaKpi } from '@/components/commerce/MegaKpi';
import { LiveOrderFeed } from '@/components/commerce/LiveOrderFeed';
import { GeoHeatmap } from '@/components/commerce/GeoHeatmap';
import { PlatformBreakdown } from '@/components/commerce/PlatformBreakdown';
import { TopProductsLeaderboard } from '@/components/commerce/TopProductsLeaderboard';
import { getMegaDashboardSnapshot } from '@/services/supabase/commerce-orders';
import type { CommerceMegaDashboardSnapshot } from '@/types/commerce-channels';

const PULL_THRESHOLD = 80;

/**
 * Mega Dashboard — the wall-display experience that also works on a phone.
 *
 * Desktop: 4K-ready, two-column hero KPIs over a 3-column main grid.
 * Mobile: single-column stack, ordered for thumb-scan priority. Aurora
 * blurs trimmed and gated on `prefers-reduced-motion` / low-end devices.
 * Pull-to-refresh on touch.
 */
export function MegaDashboardPage() {
  const { t } = useTranslation('commerce');
  const billing = useBilling();
  const { branding } = useBranding();
  const isMobile = useIsMobile();
  const motionBudget = useDeviceMotion();
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

  // Pull-to-refresh — mobile only, respects reduced-motion.
  const pullY = useMotionValue(0);
  const rubberY = useTransform(pullY, (v) => (v > 0 ? Math.min(v * 0.4, 60) : 0));
  const pullOpacity = useTransform(pullY, [0, PULL_THRESHOLD], [0, 1]);
  const pullRotation = useTransform(pullY, [0, PULL_THRESHOLD], [0, 180]);
  const pullEnabled = isMobile && !motionBudget.reduceMotion;
  const pullStartScrollTop = useRef(0);

  const handlePanStart = useCallback(() => {
    pullStartScrollTop.current = window.scrollY;
  }, []);

  const handlePan = useCallback(
    (_e: unknown, info: PanInfo) => {
      if (!pullEnabled) return;
      if (pullStartScrollTop.current > 0) return;
      if (info.offset.y > 0) pullY.set(info.offset.y);
    },
    [pullEnabled, pullY],
  );

  const handlePanEnd = useCallback(
    (_e: unknown, info: PanInfo) => {
      if (!pullEnabled) return;
      if (info.offset.y >= PULL_THRESHOLD && pullStartScrollTop.current === 0) {
        refresh();
      }
      pullY.set(0);
    },
    [pullEnabled, pullY, refresh],
  );

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

  const reduceAurora = motionBudget.reduceMotion || motionBudget.isLowEnd;

  return (
    <motion.div
      className="relative -mx-3 sm:-mx-6 -my-4 sm:-my-6 min-h-[calc(100vh-3.5rem)] bg-[#08070d] text-white safe-bottom"
      style={pullEnabled ? { y: rubberY } : undefined}
      onPanStart={pullEnabled ? handlePanStart : undefined}
      onPan={pullEnabled ? handlePan : undefined}
      onPanEnd={pullEnabled ? handlePanEnd : undefined}
    >
      {/* Pull-to-refresh indicator (mobile only) */}
      {pullEnabled && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-full bg-white/10 p-2 backdrop-blur-md"
          style={{ opacity: pullOpacity }}
        >
          <motion.div style={{ rotate: pullRotation }}>
            <RefreshCw className="h-4 w-4 text-white/80" />
          </motion.div>
        </motion.div>
      )}

      {/* Atmospheric backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {reduceAurora ? (
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/[0.08] via-transparent to-cyan-500/[0.08]" />
        ) : (
          <>
            <div className="absolute -left-32 top-0 h-[50vh] w-[50vh] rounded-full bg-gradient-to-br from-fuchsia-500/30 via-fuchsia-700/10 to-transparent blur-2xl opacity-60 md:blur-3xl md:opacity-100" />
            <div className="absolute -right-32 bottom-0 h-[60vh] w-[60vh] rounded-full bg-gradient-to-tl from-cyan-500/30 via-cyan-700/10 to-transparent blur-2xl opacity-60 md:blur-3xl md:opacity-100" />
            {/* Third aurora blob only on tablet+ */}
            <div className="absolute left-1/3 top-1/3 hidden h-[30vh] w-[30vh] rounded-full bg-emerald-500/10 blur-3xl md:block" />
          </>
        )}
        <DotGridBackdrop reduced={isMobile} />
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-black/30 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-4 safe-top">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-white/70 hover:bg-white/5 hover:text-white touch-target px-2 sm:px-3"
          >
            <Link to="/commerce">
              <ArrowLeft className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">{t('Hub')}</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            {branding.logo && (
              <img src={branding.logo} alt="" className="hidden h-7 max-w-[120px] object-contain opacity-90 md:block" />
            )}
            <div className="hidden h-5 w-px bg-white/15 md:block" />
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative inline-flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="hidden text-xs font-medium uppercase tracking-[0.2em] text-white/70 md:inline">
                {t('Live · Mega Dashboard')}
              </span>
              <span className="font-display text-base tabular-nums text-white/80 md:hidden">
                {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
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
            className="touch-target text-white/70 hover:bg-white/5 hover:text-white active:bg-white/10"
            onClick={refresh}
            disabled={refreshing}
            aria-label={t('Refresh')}
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </Button>
          {/* Fullscreen — desktop only; on iOS Safari + most mobile browsers the API is unreliable. */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex text-white/70 hover:bg-white/5 hover:text-white"
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? t('Exit fullscreen') : t('Enter fullscreen')}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      {/* Hero KPI strip */}
      <section className="relative z-10 grid grid-cols-2 gap-3 px-3 pt-4 sm:gap-4 sm:px-6 sm:pt-6 lg:grid-cols-4">
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

      {/* Main grid: stacks vertically on mobile, 3-column on lg+ */}
      <section className="relative z-10 grid grid-cols-1 gap-3 px-3 pb-3 pt-3 sm:gap-4 sm:px-6 sm:pb-4 sm:pt-4 lg:grid-cols-12">
        {/* Live feed: first on mobile (the "is anything happening" gut check) */}
        <div className="order-1 lg:col-span-3 lg:row-span-2">
          <LiveOrderFeed orders={snapshot?.liveFeed || []} />
        </div>

        {/* Platform breakdown: second on mobile (most actionable summary) */}
        <div className="order-2 lg:order-4 lg:col-span-6">
          <PlatformBreakdown entries={snapshot?.platformBreakdown || []} />
        </div>

        {/* Top products: third on mobile (leaderboard reads naturally as a list) */}
        <div className="order-3 lg:order-2 lg:col-span-3 lg:row-span-2">
          <TopProductsLeaderboard entries={snapshot?.topProducts || []} />
        </div>

        {/* Geo: fourth on mobile (rendered as country list at <md), takes full height on lg */}
        <div className="order-4 lg:order-3 lg:col-span-6 lg:h-[320px]">
          <GeoHeatmap points={snapshot?.geoPoints || []} />
        </div>
      </section>

      {/* Footer KPI strip */}
      <section className="relative z-10 grid grid-cols-2 gap-3 px-3 pb-4 sm:gap-4 sm:px-6 sm:pb-6 lg:grid-cols-4">
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

      {/* Marquee footer */}
      <footer className="relative z-10 border-t border-white/5 bg-black/30 px-3 py-3 backdrop-blur-md sm:px-6 safe-bottom">
        <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em] text-white/40 sm:text-[11px]">
          <span className="truncate">{branding.appName} · Commerce Hub</span>
          <span className="hidden md:block tabular-nums">
            {snapshot ? `${t('Updated')} ${new Date(snapshot.generatedAt).toLocaleTimeString()}` : '—'}
          </span>
          <span className="shrink-0">↻ 30s</span>
        </div>
      </footer>
    </motion.div>
  );
}

/* ============================================
   visual primitives
   ============================================ */
function Skeleton({ hero }: { hero?: boolean }) {
  return (
    <motion.div
      className={cn(
        'rounded-[20px] md:rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl',
        hero ? 'h-[108px] sm:h-[120px]' : 'h-[88px] sm:h-[100px]',
      )}
      animate={{ opacity: [0.4, 0.8, 0.4] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <div className="p-4">
        <div className="h-2 w-16 rounded-full bg-white/10" />
      </div>
    </motion.div>
  );
}

function DotGridBackdrop({ reduced }: { reduced: boolean }) {
  return (
    <svg
      aria-hidden
      className={cn('absolute inset-0 h-full w-full', reduced ? 'opacity-[0.05]' : 'opacity-[0.08]')}
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
