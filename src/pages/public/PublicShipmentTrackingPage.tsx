/**
 * Public Shipment Tracking Page (`/t/:token`)
 *
 * Magic-link tracking for end customers — no login, just one URL.
 * Calm, professional layout. Tenant-branded. Animation only on actual
 * state changes (refresh, status update). No decorative motion.
 *
 * Sections (top to bottom):
 *   • Sticky branded header (logo, refresh, share, lang switcher)
 *   • Hero: greeting + ETA + status pipeline
 *   • Live tracking events
 *   • Products in this shipment (all visible)
 *   • Delivery-issue reporter (only after delivery)
 *   • Footer
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Package, MapPin, Clock, Truck, Check, CheckCheck, AlertTriangle,
  RefreshCw, Share2, Recycle, Leaf, ExternalLink, ChevronDown, Loader2,
  PackageCheck, PackageX, MailWarning, Box, PackageOpen,
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
/*  STAGE MODEL                                                                */
/* -------------------------------------------------------------------------- */

type ShipmentStage = 'created' | 'packed' | 'shipped' | 'in_transit' | 'delivered';
const STAGES: ShipmentStage[] = ['created', 'packed', 'shipped', 'in_transit', 'delivered'];

const STAGE_ICONS: Record<ShipmentStage, typeof PackageOpen> = {
  created: PackageOpen,
  packed: Box,
  shipped: Truck,
  in_transit: MapPin,
  delivered: PackageCheck,
};

function mapToStage(status: string): ShipmentStage {
  switch (status) {
    case 'draft':
    case 'picking':
      return 'created';
    case 'packed':
    case 'label_created':
      // label_created = DHL-Label generiert, Paket liegt aber noch im Lager
      // (shipped_at ist noch NULL). Für den Kunden ist das visuell „verpackt".
      return 'packed';
    case 'shipped':
      return 'shipped';
    case 'in_transit':
      return 'in_transit';
    case 'delivered':
      return 'delivered';
    default:
      return 'created';
  }
}

/**
 * True only when the package has actually been handed off to the carrier
 * (shipped_at is set OR status is shipped/in_transit/delivered). Drives
 * the ETA card — predicted arrival makes no sense before this point.
 */
function isInTransit(s: PublicShipmentSummary): boolean {
  if (s.shippedAt) return true;
  return s.status === 'shipped' || s.status === 'in_transit' || s.status === 'delivered';
}

/* -------------------------------------------------------------------------- */
/*  PREDICTIVE ETA                                                            */
/* -------------------------------------------------------------------------- */

function predictArrival(
  s: PublicShipmentSummary,
  eventCount: number,
): { date: Date | null; confidence: 'high' | 'medium' | 'low' } {
  if (s.deliveredAt) return { date: new Date(s.deliveredAt), confidence: 'high' };
  if (s.trackingPredictedArrivalAt) return { date: new Date(s.trackingPredictedArrivalAt), confidence: 'medium' };
  if (s.estimatedDelivery) return { date: new Date(s.estimatedDelivery), confidence: 'medium' };

  const base = s.shippedAt ? new Date(s.shippedAt) : new Date(s.createdAt);
  const days = eventCount > 5 ? 1 : 2;
  const eta = new Date(base);
  eta.setDate(eta.getDate() + days);
  return { date: eta, confidence: 'low' };
}

function titleCaseCity(raw: string | undefined): string {
  if (!raw) return '';
  const head = raw
    .split(/[-,]/)[0]
    .replace(/\b(BRIEFZENTRUM|PAKETZENTRUM|HBF|MAIN|VERTEILZENTRUM)\b/gi, '')
    .trim()
    .split(/\s+/)[0] || raw.split(/[-,]/)[0].trim();
  if (!head) return raw.slice(0, 14);
  return head.charAt(0).toUpperCase() + head.slice(1).toLowerCase().slice(0, 13);
}

/* -------------------------------------------------------------------------- */
/*  ETA DISPLAY                                                                */
/* -------------------------------------------------------------------------- */

function ETADisplay({ shipment, eventCount, locale, t }: {
  shipment: PublicShipmentSummary;
  eventCount: number;
  locale: 'de' | 'en';
  t: TFunction;
}) {
  const { date, confidence } = useMemo(
    () => predictArrival(shipment, eventCount),
    [shipment, eventCount],
  );
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // If the package hasn't been handed to the carrier yet, don't show an
  // ETA — that just confuses the customer (e.g. "should have arrived" while
  // the box is still on the packing table). Show a "wird vorbereitet" hint.
  if (!isInTransit(shipment) && !shipment.deliveredAt) {
    const isLabelReady = shipment.status === 'label_created';
    return (
      <div className="space-y-1.5">
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          {isLabelReady ? t('Wird abgeholt') : t('Wird vorbereitet')}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {isLabelReady
              ? t('Versandetikett erstellt — wartet auf Übergabe an den Spediteur.')
              : t('Wir kommissionieren und verpacken dein Paket — Tracking wird aktiv, sobald es unterwegs ist.')}
          </span>
        </div>
      </div>
    );
  }

  if (!date) return null;
  const dateLabel = date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    weekday: 'short', day: '2-digit', month: 'long',
  });

  if (shipment.deliveredAt) {
    return (
      <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
        <CheckCheck className="h-4 w-4" />
        <span>{t('Delivered on {{date}}', { date: dateLabel })}</span>
      </div>
    );
  }

  const diffMs = date.getTime() - now.getTime();
  const diffH = Math.round(diffMs / 3_600_000);
  const diffD = Math.round(diffMs / 86_400_000);
  const isOverdue = diffMs < 0;

  let mainText = '';
  if (isOverdue) {
    mainText = t('Should have arrived');
  } else if (diffH < 6) {
    mainText = t('Arriving soon');
  } else if (diffH < 24) {
    mainText = t('Arriving in ~{{h}} hours', { h: Math.max(1, diffH) });
  } else {
    mainText = t('Arriving in ~{{d}} days', { d: Math.max(1, diffD) });
  }

  const confidenceLabel = confidence === 'high'
    ? t('confirmed')
    : confidence === 'medium'
      ? t('estimated')
      : t('predicted');

  return (
    <div className="space-y-1.5">
      <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
        {mainText}
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>{dateLabel}</span>
        <span className="text-muted-foreground/50">·</span>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-medium">{confidenceLabel}</Badge>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  STATUS PIPELINE                                                            */
/* -------------------------------------------------------------------------- */

function StatusPipeline({ status, t, reduce }: { status: string; t: TFunction; reduce: boolean }) {
  const stage = mapToStage(status);
  const idx = STAGES.indexOf(stage);
  const isCancelled = status === 'cancelled';

  return (
    <div className="relative pt-2">
      {isCancelled && (
        <div className="mb-3 flex items-center justify-center gap-2 text-sm font-medium text-rose-600">
          <PackageX className="h-4 w-4" />
          {t('Cancelled')}
        </div>
      )}
      <div className="flex items-start justify-between gap-1">
        {STAGES.map((s, i) => {
          const Icon = STAGE_ICONS[s];
          const isPast = !isCancelled && idx > i;
          const isCurrent = !isCancelled && idx === i;
          const lineLeftFilled = !isCancelled && idx >= i;
          return (
            <div key={s} className="flex flex-1 flex-col items-center gap-2 min-w-0">
              <div className="relative flex items-center justify-center w-full h-8">
                {/* connector lines */}
                {i > 0 && (
                  <div className="absolute right-1/2 left-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden bg-muted">
                    <motion.div
                      className="h-full origin-left"
                      style={{ background: 'var(--tracking-accent, #3B82F6)' }}
                      initial={reduce ? { scaleX: lineLeftFilled ? 1 : 0 } : { scaleX: 0 }}
                      animate={{ scaleX: lineLeftFilled ? 1 : 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                )}
                {i < STAGES.length - 1 && (
                  <div className="absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden bg-muted">
                    <motion.div
                      className="h-full origin-left"
                      style={{ background: 'var(--tracking-accent, #3B82F6)' }}
                      initial={reduce ? { scaleX: isPast ? 1 : 0 } : { scaleX: 0 }}
                      animate={{ scaleX: isPast ? 1 : 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                )}

                {/* dot/icon */}
                <div
                  className={`relative z-10 flex items-center justify-center rounded-full transition-colors ${
                    isPast || isCurrent
                      ? 'h-7 w-7 text-white'
                      : 'h-7 w-7 bg-muted text-muted-foreground border-2 border-background'
                  }`}
                  style={
                    isPast || isCurrent
                      ? { background: 'var(--tracking-accent, #3B82F6)' }
                      : undefined
                  }
                >
                  {isPast ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <Icon className="h-3.5 w-3.5" />
                  )}
                </div>
              </div>
              <span
                className={`text-[10px] sm:text-xs text-center leading-tight px-0.5 ${
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
/*  LIVE EVENT TIMELINE                                                       */
/* -------------------------------------------------------------------------- */

function LiveTimeline({ events, locale, t }: {
  events: PublicTrackingEvent[];
  locale: 'de' | 'en';
  t: TFunction;
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
      <div className="relative space-y-4 pl-6">
        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
        {visible.map((ev, i) => {
          const date = ev.timestamp ? new Date(ev.timestamp) : null;
          const isLatest = i === 0;
          const cityClean = titleCaseCity(ev.location);
          return (
            <div key={`${ev.timestamp}-${i}`} className="relative">
              <div className="absolute -left-[22px] top-1.5">
                <div
                  className={`h-3.5 w-3.5 rounded-full border-2 border-background ${
                    isLatest ? '' : 'bg-muted-foreground/30'
                  }`}
                  style={isLatest ? { background: 'var(--tracking-accent, #3B82F6)' } : undefined}
                />
              </div>
              <div className={`text-sm ${isLatest ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {ev.description}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground/70">
                {date && (
                  <span>
                    {date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: 'short' })}
                    {' · '}
                    {date.toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
                {cityClean && (
                  <>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {cityClean}
                    </span>
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
          className="mt-3 h-8 text-xs"
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
/*  PRODUCTS IN SHIPMENT                                                      */
/* -------------------------------------------------------------------------- */

function ProductsInShipment({ items, t }: { items: PublicShipmentItem[]; t: TFunction }) {
  if (items.length === 0) return null;

  const totalCarbon = items.reduce(
    (sum, it) => sum + (it.carbonFootprintTotal != null ? it.carbonFootprintTotal * it.quantity : 0),
    0,
  );
  const totalQty = items.reduce((s, it) => s + it.quantity, 0);
  const avgRecycle = totalQty > 0
    ? items.reduce((sum, it) => sum + (it.recyclabilityPct ?? 0) * it.quantity, 0) / totalQty
    : 0;

  const showCarbon = totalCarbon > 0;
  const showRecycle = avgRecycle > 0;
  const carbonUnit = items[0]?.carbonFootprintUnit || 'kg CO₂e';

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-foreground">
        {t('In this shipment')}
      </h2>

      {(showCarbon || showRecycle) && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {showCarbon && (
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Leaf className="h-3.5 w-3.5" />
                <span>{t('CO2 footprint')}</span>
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                {totalCarbon.toFixed(1)}
                <span className="text-xs font-normal text-muted-foreground ml-1">{carbonUnit}</span>
              </div>
            </div>
          )}
          {showRecycle && (
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Recycle className="h-3.5 w-3.5" />
                <span>{t('Recyclable')}</span>
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                {Math.round(avgRecycle)}
                <span className="text-xs font-normal text-muted-foreground ml-1">%</span>
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
          const card = (
            <div className="flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors hover:border-primary/50">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                {item.productImageUrl ? (
                  <img src={item.productImageUrl} alt={item.productName} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-foreground">{item.productName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {item.productManufacturer && <span>{item.productManufacturer}</span>}
                  {item.productManufacturer && (item.quantity > 1 || item.productCategory) && <span> · </span>}
                  {item.quantity > 1 ? `${item.quantity}× ` : ''}
                  {item.productCategory || ''}
                </div>
              </div>
              {dppUrl && <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            </div>
          );
          return dppUrl ? (
            <a
              key={item.productId}
              href={dppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {card}
            </a>
          ) : (
            <div key={item.productId}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  MAIN PAGE                                                                  */
/* -------------------------------------------------------------------------- */

export function PublicShipmentTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const { t, i18n } = useTranslation('tracking');
  const locale: 'de' | 'en' = i18n.language?.startsWith('de') ? 'de' : 'en';
  const reduce = useReducedMotion() ?? false;

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
  const lastStageRef = useRef<ShipmentStage | null>(null);

  /* ---------- Reset CSS vars on unmount ---------- */
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--tracking-accent');
      root.style.removeProperty('--tracking-accent-soft');
      root.style.removeProperty('--tracking-accent-glow');
    };
  }, []);

  /* ---------- Initial load ---------- */
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
      lastStageRef.current = mapToStage(bundle.shipment.status);

      const evs = await getPublicShipmentTrackingEvents(token, locale);
      if (!alive) return;
      setEvents(evs);
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ---------- Refetch DHL events when locale changes ---------- */
  useEffect(() => {
    if (!token || !shipment) return;
    let alive = true;
    (async () => {
      const evs = await getPublicShipmentTrackingEvents(token, locale);
      if (alive) setEvents(evs);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, token]);

  /* ---------- Auto-refresh every 60s ---------- */
  useEffect(() => {
    if (!token || !shipment || shipment.deliveredAt) return;
    const id = setInterval(() => {
      void handleRefresh(true);
    }, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, shipment?.deliveredAt]);

  const handleRefresh = async (silent = false) => {
    if (!token) return;
    if (!silent) setRefreshing(true);
    const bundle = await getPublicShipmentByToken(token);
    if (bundle) {
      setShipment(bundle.shipment);
      setItems(bundle.items);
      lastStageRef.current = mapToStage(bundle.shipment.status);
    }
    const evs = await getPublicShipmentTrackingEvents(token, locale);
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

  /* ---------- Not-found ---------- */
  if (notFound) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center px-4">
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

  /* ---------- Loading ---------- */
  if (loading || !shipment || !branding) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isDelivered = !!shipment.deliveredAt;
  const isCancelled = shipment.status === 'cancelled';
  const carrierLink = shipment.carrier === 'DHL' && shipment.trackingNumber
    ? `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(shipment.trackingNumber)}`
    : null;

  return (
    <div className="min-h-screen bg-muted/20">
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
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ background: 'var(--tracking-accent, #3B82F6)' }}
              >
                <Package className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{branding.appName}</div>
              <div className="truncate text-xs text-muted-foreground">
                {shipment.shipmentNumber}
              </div>
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
              className="h-9 px-2 text-xs font-mono"
              onClick={() => i18n.changeLanguage(locale === 'de' ? 'en' : 'de')}
              aria-label={t('Switch language')}
            >
              {locale === 'de' ? 'EN' : 'DE'}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-4">
        {/* HERO — banner + greeting + ETA + pipeline */}
        <Card className="overflow-hidden">
          {/* Hero banner: first product image, or branded gradient fallback */}
          {items[0]?.productImageUrl ? (
            <div className="relative h-32 sm:h-44 overflow-hidden bg-muted">
              <img
                src={items[0].productImageUrl}
                alt={items[0].productName}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/0 to-card/0" />
            </div>
          ) : (
            <div
              className="relative h-32 sm:h-44 overflow-hidden flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--tracking-accent, #3B82F6) 0%, var(--tracking-accent-glow, #3B82F666) 100%)',
              }}
            >
              <Package className="h-12 w-12 text-white/70" strokeWidth={1.5} />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/0 to-card/0" />
            </div>
          )}
          <CardContent className="pt-5 pb-6 px-5 sm:px-7">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {(() => {
                // State-aware greeting — never lie about being "on the way"
                // when the package is still in the warehouse.
                const inTransit = isInTransit(shipment);
                const name = shipment.recipientFirstName;
                if (shipment.deliveredAt) {
                  return name
                    ? t('Hi {{name}}, your package has arrived').replace('{{name}}', name)
                    : t('Your package has arrived');
                }
                if (inTransit) {
                  return name
                    ? t('Hi {{name}}, your package is on the way').replace('{{name}}', name)
                    : t('Your package is on the way');
                }
                if (shipment.status === 'label_created') {
                  return name
                    ? t('Hi {{name}}, your label is ready').replace('{{name}}', name)
                    : t('Your label is ready');
                }
                // draft / picking / packed
                return name
                  ? t('Hi {{name}}, we are preparing your package').replace('{{name}}', name)
                  : t('We are preparing your package');
              })()}
            </div>
            <div className="mt-3">
              <ETADisplay
                shipment={shipment}
                eventCount={events.length}
                locale={locale}
                t={t}
              />
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
            <div className="mt-6">
              <StatusPipeline status={shipment.status} t={t} reduce={reduce} />
            </div>
          </CardContent>
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

        {/* PRODUCTS */}
        {items.length > 0 && (
          <Card>
            <CardContent className="pt-5 pb-5 px-5 sm:px-7">
              <ProductsInShipment items={items} t={t} />
            </CardContent>
          </Card>
        )}

        {/* DELIVERY ISSUE */}
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

      {/* REPORT DIALOG */}
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
