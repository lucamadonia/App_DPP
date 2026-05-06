/**
 * Public Shipment Tracking Page (`/t/:token`)
 *
 * Magic-link tracking for end customers.  No login, no tracking code,
 * just one URL.  Combines:
 *   • Animated branded status pipeline (8 stages)
 *   • Predictive ETA countdown
 *   • Live DHL events (auto-refresh every 60s)
 *   • Pre-arrival DPP preview — what's coming + carbon footprint
 *   • Native Web Share + "package not received" report
 *   • Confetti burst on delivered status
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package, MapPin, Clock, Truck, Check, CheckCheck, AlertTriangle,
  RefreshCw, Share2, Recycle, Leaf, ExternalLink, ChevronDown, Loader2,
  PackageCheck, PackageX, Sparkles, MailWarning,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { applyPrimaryColor, applyDocumentTitle } from '@/lib/dynamic-theme';
import {
  getPublicShipmentByToken,
  getPublicShipmentTrackingEvents,
  reportShipmentNotReceived,
  type PublicShipmentSummary,
  type PublicShipmentItem,
  type PublicShipmentBranding,
  type PublicTrackingEvent,
} from '@/services/supabase/shipment-tracking';

/* -------------------------------------------------------------------------- */
/*  Status Pipeline                                                           */
/* -------------------------------------------------------------------------- */

type ShipmentStage = 'created' | 'packed' | 'shipped' | 'in_transit' | 'delivered';
const STAGES: ShipmentStage[] = ['created', 'packed', 'shipped', 'in_transit', 'delivered'];

function mapToStage(status: string): ShipmentStage {
  switch (status) {
    case 'draft':
    case 'picking':
      return 'created';
    case 'packed':
      return 'packed';
    case 'label_created':
    case 'shipped':
      return 'shipped';
    case 'in_transit':
      return 'in_transit';
    case 'delivered':
      return 'delivered';
    case 'cancelled':
      return 'created';
    default:
      return 'created';
  }
}

function StatusPipeline({ status, t }: { status: string; t: (k: string) => string }) {
  const stage = mapToStage(status);
  const idx = STAGES.indexOf(stage);
  const isCancelled = status === 'cancelled';

  return (
    <div className="relative pt-2">
      {isCancelled && (
        <div className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-rose-600">
          <PackageX className="h-4 w-4" />
          {t('Cancelled')}
        </div>
      )}
      <div className="flex items-start justify-between gap-1">
        {STAGES.map((s, i) => {
          const isPast = !isCancelled && idx > i;
          const isCurrent = !isCancelled && idx === i;
          return (
            <div key={s} className="flex flex-1 flex-col items-center gap-2 min-w-0">
              <div className="relative flex items-center justify-center w-full">
                {/* connector line */}
                {i > 0 && (
                  <div
                    className={`absolute right-1/2 left-0 h-0.5 -translate-y-1/2 top-[14px] transition-all duration-500 ${
                      isPast || (isCurrent && i > 0) ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
                {i < STAGES.length - 1 && (
                  <div
                    className={`absolute left-1/2 right-0 h-0.5 -translate-y-1/2 top-[14px] transition-all duration-500 ${
                      isPast ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
                <div
                  className={`relative z-10 flex items-center justify-center rounded-full transition-all duration-500 ${
                    isPast
                      ? 'h-7 w-7 bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'h-8 w-8 bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'h-7 w-7 bg-muted text-muted-foreground border-2 border-background'
                  }`}
                >
                  {isPast ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : isCurrent ? (
                    <span className="block h-2 w-2 rounded-full bg-primary-foreground animate-pulse" />
                  ) : null}
                </div>
              </div>
              <span
                className={`text-[10px] sm:text-xs text-center leading-tight px-1 ${
                  isCurrent ? 'font-semibold text-foreground' : isPast ? 'text-muted-foreground' : 'text-muted-foreground/60'
                }`}
              >
                {t(`stage_${s}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Predictive ETA                                                            */
/* -------------------------------------------------------------------------- */

function predictArrival(s: PublicShipmentSummary, eventCount: number): { date: Date | null; confidence: 'high' | 'medium' | 'low' } {
  if (s.deliveredAt) return { date: new Date(s.deliveredAt), confidence: 'high' };
  if (s.trackingPredictedArrivalAt) return { date: new Date(s.trackingPredictedArrivalAt), confidence: 'medium' };
  if (s.estimatedDelivery) return { date: new Date(s.estimatedDelivery), confidence: 'medium' };

  // Fallback: shipped + 2 business days
  const base = s.shippedAt ? new Date(s.shippedAt) : new Date(s.createdAt);
  const days = eventCount > 5 ? 1 : 2;
  const eta = new Date(base);
  eta.setDate(eta.getDate() + days);
  return { date: eta, confidence: 'low' };
}

function ETACountdown({ shipment, eventCount, locale, t }: {
  shipment: PublicShipmentSummary;
  eventCount: number;
  locale: string;
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const { date, confidence } = useMemo(
    () => predictArrival(shipment, eventCount),
    [shipment, eventCount],
  );
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!date) return null;
  if (shipment.deliveredAt) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600">
        <CheckCheck className="h-4 w-4" />
        <span>{t('Delivered on {{date}}', {
          date: date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { weekday: 'short', day: '2-digit', month: 'long' }),
        })}</span>
      </div>
    );
  }

  const diffMs = date.getTime() - now.getTime();
  const diffH = Math.round(diffMs / (1000 * 60 * 60));
  const diffD = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const isOverdue = diffMs < 0;

  let line = '';
  if (isOverdue) {
    line = t('Should have arrived');
  } else if (diffH < 6) {
    line = t('Arriving soon');
  } else if (diffH < 24) {
    line = t('Arriving in ~{{h}} hours', { h: Math.max(1, diffH) });
  } else {
    line = t('Arriving in ~{{d}} days', { d: Math.max(1, diffD) });
  }

  const confidenceLabel = confidence === 'high'
    ? t('confirmed')
    : confidence === 'medium'
      ? t('estimated')
      : t('predicted');

  return (
    <div>
      <div className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
        {line}
      </div>
      <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
        <Clock className="h-3.5 w-3.5" />
        <span>
          {date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
            weekday: 'short', day: '2-digit', month: 'long',
          })}
        </span>
        <span className="text-muted-foreground/50">·</span>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{confidenceLabel}</Badge>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Confetti burst                                                            */
/* -------------------------------------------------------------------------- */

interface ConfettiPiece {
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotate: number;
}

function makeConfettiPieces(count: number): ConfettiPiece[] {
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];
  return Array.from({ length: count }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 2 + Math.random() * 1.5,
    color: colors[i % colors.length],
    rotate: Math.random() * 360,
  }));
}

function ConfettiBurst({ active }: { active: boolean }) {
  // Precompute pieces once — Math.random during render breaks React Compiler purity.
  const [pieces] = useState(() => makeConfettiPieces(36));
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            background: p.color,
            transform: `rotate(${p.rotate}deg)`,
          }}
          className="absolute -top-4 h-3 w-2 rounded-sm animate-confetti-fall"
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pre-Arrival DPP Preview                                                   */
/* -------------------------------------------------------------------------- */

function DPPPreview({ items, t }: { items: PublicShipmentItem[]; t: (k: string) => string }) {
  if (items.length === 0) return null;

  const totalCarbon = items.reduce(
    (sum, it) => sum + (it.carbonFootprintTotal != null ? it.carbonFootprintTotal * it.quantity : 0),
    0,
  );
  const avgRecycle = items.length > 0
    ? items.reduce((sum, it) => sum + (it.recyclabilityPct ?? 0) * it.quantity, 0) /
      items.reduce((sum, it) => sum + it.quantity, 0)
    : 0;

  const showCarbon = totalCarbon > 0;
  const showRecycle = avgRecycle > 0;

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">{t('Whats coming')}</h2>
      </div>

      {(showCarbon || showRecycle) && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {showCarbon && (
            <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-50/40 dark:from-emerald-950/20 dark:to-transparent p-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                <Leaf className="h-3.5 w-3.5" />
                <span className="font-medium">{t('CO2 footprint')}</span>
              </div>
              <div className="mt-1 text-lg font-bold tracking-tight text-emerald-900 dark:text-emerald-100">
                {totalCarbon.toFixed(1)} <span className="text-xs font-normal text-emerald-700 dark:text-emerald-400">{items[0].carbonFootprintUnit}</span>
              </div>
            </div>
          )}
          {showRecycle && (
            <div className="rounded-xl border bg-gradient-to-br from-blue-50 to-blue-50/40 dark:from-blue-950/20 dark:to-transparent p-3">
              <div className="flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400">
                <Recycle className="h-3.5 w-3.5" />
                <span className="font-medium">{t('Recyclable')}</span>
              </div>
              <div className="mt-1 text-lg font-bold tracking-tight text-blue-900 dark:text-blue-100">
                {Math.round(avgRecycle)}<span className="text-xs font-normal text-blue-700 dark:text-blue-400">%</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {items.map((item) => {
          const dppUrl = item.productGtin && item.productSerial
            ? `/p/${item.productGtin}/${item.productSerial}`
            : null;
          return (
            <a
              key={item.productId}
              href={dppUrl || undefined}
              target={dppUrl ? '_blank' : undefined}
              rel="noopener noreferrer"
              className={`flex items-center gap-3 rounded-xl border bg-card p-3 transition ${dppUrl ? 'hover:border-primary/50 hover:shadow-sm cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                {item.productImageUrl ? (
                  <img src={item.productImageUrl} alt={item.productName} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{item.productName}</div>
                <div className="text-xs text-muted-foreground">
                  {item.productManufacturer && <span>{item.productManufacturer} · </span>}
                  {item.quantity > 1 ? `${item.quantity}× ` : ''}
                  {item.productCategory || ''}
                </div>
              </div>
              {dppUrl && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </a>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Live Event Timeline                                                       */
/* -------------------------------------------------------------------------- */

function LiveTimeline({ events, locale, t }: {
  events: PublicTrackingEvent[];
  locale: string;
  t: (k: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        <Truck className="mx-auto mb-2 h-6 w-6" />
        {t('No tracking events yet')}
      </div>
    );
  }

  const visible = expanded ? events : events.slice(0, 4);

  return (
    <div>
      <div className="relative space-y-3 pl-6">
        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
        {visible.map((ev, i) => {
          const date = ev.timestamp ? new Date(ev.timestamp) : null;
          const isLatest = i === 0;
          return (
            <div key={i} className="relative">
              <div
                className={`absolute -left-[22px] top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                  isLatest ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted-foreground/40'
                }`}
              >
                {isLatest && <span className="block h-1.5 w-1.5 rounded-full bg-background" />}
              </div>
              <div className={`text-sm ${isLatest ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {ev.description}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground/80">
                {date && (
                  <span>
                    {date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: 'short' })}
                    {' · '}
                    {date.toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {ev.location && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{ev.location}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {events.length > 4 && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-8 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          <ChevronDown className={`mr-1 h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded
            ? t('Show less')
            : t('Show {{count}} more events').replace('{{count}}', String(events.length - 4))}
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export function PublicShipmentTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation('tracking');
  const locale = i18n.language?.startsWith('de') ? 'de' : 'en';

  const [shipment, setShipment] = useState<PublicShipmentSummary | null>(null);
  const [items, setItems] = useState<PublicShipmentItem[]>([]);
  const [branding, setBranding] = useState<PublicShipmentBranding | null>(null);
  const [events, setEvents] = useState<PublicTrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiFiredRef = useRef(false);

  // Initial load
  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let alive = true;
    (async () => {
      const bundle = await getPublicShipmentByToken(token);
      if (!alive) return;
      if (!bundle) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setShipment(bundle.shipment);
      setItems(bundle.items);
      setBranding(bundle.branding);
      if (bundle.branding.primaryColor) applyPrimaryColor(bundle.branding.primaryColor);
      applyDocumentTitle(`${bundle.branding.appName} — ${bundle.shipment.shipmentNumber}`);
      // Fetch live events in parallel
      const evs = await getPublicShipmentTrackingEvents(token);
      if (!alive) return;
      setEvents(evs);
      setLoading(false);

      if (bundle.shipment.deliveredAt && !confettiFiredRef.current) {
        confettiFiredRef.current = true;
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    })();
    return () => { alive = false; };
  }, [token]);

  // Auto-refresh every 60s while not delivered
  useEffect(() => {
    if (!token || !shipment || shipment.deliveredAt) return;
    const interval = setInterval(() => {
      void handleRefresh(true);
    }, 60_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, shipment?.deliveredAt]);

  const handleRefresh = async (silent = false) => {
    if (!token) return;
    if (!silent) setRefreshing(true);
    const bundle = await getPublicShipmentByToken(token);
    if (bundle) {
      setShipment(bundle.shipment);
      setItems(bundle.items);
      const wasDelivered = !!shipment?.deliveredAt;
      const isDeliveredNow = !!bundle.shipment.deliveredAt;
      if (!wasDelivered && isDeliveredNow && !confettiFiredRef.current) {
        confettiFiredRef.current = true;
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    }
    const evs = await getPublicShipmentTrackingEvents(token);
    setEvents(evs);
    if (!silent) setRefreshing(false);
  };

  const handleShare = async () => {
    if (!shipment) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${branding?.appName ?? 'Trackbliss'} — ${shipment.shipmentNumber}`,
          text: t('Track my package'),
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success(t('Link copied'));
    }
  };

  const handleReport = async () => {
    if (!token) return;
    setReportSending(true);
    const ok = await reportShipmentNotReceived(token, reportMessage);
    setReportSending(false);
    if (ok) {
      toast.success(t('Report received — we will be in touch'));
      setReportOpen(false);
      setReportMessage('');
    } else {
      toast.error(t('Failed to send report'));
    }
  };

  /* ---------- Render: not found ---------- */
  if (notFound) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-semibold">{t('Tracking link not found')}</h1>
            <p className="text-sm text-muted-foreground">{t('This link may have expired or been mistyped. Please check the email you received.')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ---------- Render: loading ---------- */
  if (loading || !shipment || !branding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---------- Render: main ---------- */
  const isDelivered = !!shipment.deliveredAt;
  const isCancelled = shipment.status === 'cancelled';
  const carrierLink = shipment.carrier === 'DHL' && shipment.trackingNumber
    ? `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(shipment.trackingNumber)}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 via-background to-background">
      <ConfettiBurst active={showConfetti} />

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {branding.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt={branding.appName}
                className="h-9 w-9 rounded-lg object-contain"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Package className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{branding.appName}</div>
              <div className="truncate text-xs text-muted-foreground">{t('Live tracking')}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => handleRefresh(false)}
              disabled={refreshing}
              aria-label={t('Refresh')}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={handleShare}
              aria-label={t('Share')}
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs"
              onClick={() => i18n.changeLanguage(locale === 'de' ? 'en' : 'de')}
              aria-label={t('Switch language')}
            >
              {locale === 'de' ? 'EN' : 'DE'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-5">
        {/* HERO — ETA + greeting */}
        <Card className="overflow-hidden">
          <div className="relative">
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 20% 50%, var(--primary) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--primary) 0%, transparent 50%)',
              }}
            />
            <CardContent className="relative pt-6 pb-6 sm:pt-8 sm:pb-8 px-5 sm:px-7">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {shipment.recipientFirstName
                  ? t('Hi {{name}}, your package is on the way').replace('{{name}}', shipment.recipientFirstName)
                  : t('Your package is on the way')}
              </div>
              <div className="mt-3">
                <ETACountdown shipment={shipment} eventCount={events.length} locale={locale} t={t} />
              </div>
              {isDelivered && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <PackageCheck className="h-4 w-4" />
                  {t('Your package has been delivered. Enjoy!')}
                </div>
              )}
              {isCancelled && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                  <PackageX className="h-4 w-4" />
                  {t('This shipment was cancelled')}
                </div>
              )}
            </CardContent>
          </div>
          <div className="border-t bg-muted/20 px-5 sm:px-7 py-4">
            <StatusPipeline status={shipment.status} t={t} />
          </div>
        </Card>

        {/* TRACKING + EVENTS */}
        <Card>
          <CardContent className="pt-5 pb-5 px-5 sm:px-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{t('Live progress')}</span>
              </div>
              {shipment.trackingNumber && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{shipment.carrier ?? 'DHL'}</span>
                  {carrierLink ? (
                    <a
                      href={carrierLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {shipment.trackingNumber}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <span className="font-mono">{shipment.trackingNumber}</span>
                  )}
                </div>
              )}
            </div>
            <LiveTimeline events={events} locale={locale} t={t} />
            {shipment.trackingPolledAt && (
              <div className="mt-3 text-[10px] text-muted-foreground/60 text-right">
                {t('Last update')}: {new Date(shipment.trackingPolledAt).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PRE-ARRIVAL DPP PREVIEW */}
        {items.length > 0 && (
          <Card>
            <CardContent className="pt-5 pb-5 px-5 sm:px-7">
              <DPPPreview items={items} t={t} />
            </CardContent>
          </Card>
        )}

        {/* DELIVERY ISSUE BUTTON */}
        {isDelivered && (
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
            <CardContent className="pt-5 pb-5 px-5 sm:px-7">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <MailWarning className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-200">{t('Did not receive your package?')}</div>
                    <div className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">{t('Let us know — we will investigate')}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-200"
                  onClick={() => setReportOpen(true)}
                >
                  {t('Report issue')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FOOTER */}
        <div className="pt-4 pb-8 text-center text-xs text-muted-foreground/60 space-y-1">
          <div>{t('Sent by {{name}}').replace('{{name}}', branding.appName)}</div>
          {branding.supportEmail && (
            <div>
              {t('Need help?')}{' '}
              <a href={`mailto:${branding.supportEmail}`} className="text-primary hover:underline">
                {branding.supportEmail}
              </a>
            </div>
          )}
        </div>
      </main>

      {/* REPORT ISSUE DIALOG */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Report a delivery issue')}</DialogTitle>
            <DialogDescription>{t('Tell us what happened. The sender will get notified immediately.')}</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t('Package was marked delivered but I never received it...')}
            value={reportMessage}
            onChange={(e) => setReportMessage(e.target.value)}
            rows={4}
            maxLength={500}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} disabled={reportSending}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleReport} disabled={reportSending || !reportMessage.trim()}>
              {reportSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('Send report')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
