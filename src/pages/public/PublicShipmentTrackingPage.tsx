/**
 * Public Shipment Tracking Page (`/t/:token`)
 *
 * Magic-link tracking for end customers. No login, no tracking code, just
 * one URL. Designed to be a brand moment — Apple-tier polish + storytelling
 * (journey arc with traveling package glyph) + anticipation-building reveal
 * mechanics on the DPP cards.
 *
 * Sections (top to bottom):
 *   • Header (sticky, branded)
 *   • Hero card: aurora blobs + ETA digits (animated) + microcopy narration
 *     + Journey Arc SVG (origin → waypoints → destination, glyph rides path)
 *     + status pipeline (Lucide icons + animated SVG connectors)
 *   • Live event timeline (stagger reveal + time-ago + city chips)
 *   • DPP preview cards (3D tilt, animated CO₂/recycle stats, reveal-on-progress)
 *   • Delivery-issue reporter
 *   • Footer
 *
 * Animation budget respects `useReducedMotion()` — every motion gate falls
 * back to a static final state when the OS asks for reduced motion.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Package, MapPin, Clock, Truck, Check, CheckCheck, AlertTriangle,
  RefreshCw, Share2, Recycle, Leaf, ExternalLink, ChevronDown, Loader2,
  PackageCheck, PackageX, Sparkles, MailWarning, Box, PackageOpen, Lock,
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
  spring, microInteraction, staggerContainer, staggerItem,
  gridStagger, gridItem, cardEntrance, blurIn,
} from '@/lib/motion';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
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
      return 'packed';
    case 'label_created':
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

/* -------------------------------------------------------------------------- */
/*  HELPERS — Time-Ago + City Normalization + Narration                       */
/* -------------------------------------------------------------------------- */

function useNowTicker(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function formatTimeAgo(timestamp: string | undefined, now: number, t: TFunction): string {
  if (!timestamp) return '';
  const diffMs = now - new Date(timestamp).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return '';
  if (diffMs < 60_000) return t('time_ago_just_now');
  if (diffMs < 3_600_000) return t('time_ago_minutes', { n: Math.max(1, Math.round(diffMs / 60_000)) });
  if (diffMs < 86_400_000) return t('time_ago_hours', { n: Math.max(1, Math.round(diffMs / 3_600_000)) });
  return t('time_ago_days', { n: Math.max(1, Math.round(diffMs / 86_400_000)) });
}

function titleCaseCity(raw: string | undefined): string {
  if (!raw) return '';
  // DHL strings come in messy: "KÖLN PAKETZENTRUM", "Frankfurt am Main - 60311", "BRIEFZENTRUM 76"
  const head = raw
    .split(/[-,]/)[0]
    .replace(/\b(BRIEFZENTRUM|PAKETZENTRUM|HBF|MAIN|VERTEILZENTRUM)\b/gi, '')
    .trim()
    .split(/\s+/)[0] || raw.split(/[-,]/)[0].trim();
  if (!head) return raw.slice(0, 14);
  return head.charAt(0).toUpperCase() + head.slice(1).toLowerCase().slice(0, 13);
}

function narrate(
  events: PublicTrackingEvent[],
  status: string,
  t: TFunction,
): string {
  if (status === 'cancelled') return t('narration_cancelled');
  if (status === 'delivered') return t('narration_delivered');

  const latest = events[0];
  const ageMs = latest?.timestamp ? Date.now() - new Date(latest.timestamp).getTime() : Infinity;
  const rawCity = latest?.location || '';
  const city = titleCaseCity(rawCity);

  const desc = (latest?.description || '').toLowerCase();
  const code = (latest?.statusCode || '').toLowerCase();
  if (
    code.includes('out_for_delivery') ||
    /(out for delivery|in zustellung|wird heute zugestellt|zustellung)/i.test(desc)
  ) {
    return t('narration_out_for_delivery');
  }

  if (events.length === 0) {
    if (status === 'shipped' || status === 'in_transit' || status === 'label_created') {
      return t('narration_shipped_no_events');
    }
    return t('narration_preparing');
  }

  if (city) {
    if (ageMs > 6 * 3_600_000) return t('narration_resting', { city });
    if (ageMs > 90 * 60_000) return t('narration_brief_stop', { city });
    return t('narration_in_transit', { city });
  }

  return t('narration_shipped_no_events');
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

/* -------------------------------------------------------------------------- */
/*  AURORA BACKGROUND                                                          */
/* -------------------------------------------------------------------------- */

function AuroraBackground({ reduce }: { reduce: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-32 -left-24 h-[70vw] w-[70vw] max-h-[600px] max-w-[600px] rounded-full opacity-50 blur-3xl mix-blend-screen dark:opacity-30"
        style={{ background: 'radial-gradient(circle, var(--tracking-accent, #3B82F6) 0%, transparent 70%)' }}
        animate={reduce ? undefined : { x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
        transition={reduce ? undefined : { duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -right-24 h-[70vw] w-[70vw] max-h-[600px] max-w-[600px] rounded-full opacity-40 blur-3xl mix-blend-screen dark:opacity-25"
        style={{ background: 'radial-gradient(circle, var(--tracking-accent-glow, #3B82F666) 0%, transparent 70%)' }}
        animate={reduce ? undefined : { x: [0, -30, 20, 0], y: [0, 30, -20, 0] }}
        transition={reduce ? undefined : { duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="hidden sm:block absolute top-1/3 left-1/4 h-[40vw] w-[40vw] max-h-[400px] max-w-[400px] rounded-full opacity-30 blur-3xl mix-blend-screen dark:opacity-20"
        style={{ background: 'radial-gradient(circle, var(--tracking-accent-soft, #3B82F633) 0%, transparent 70%)' }}
        animate={reduce ? undefined : { x: [0, 50, -30, 0], y: [0, -40, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={reduce ? undefined : { duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  ETA COUNTDOWN (animated digit)                                            */
/* -------------------------------------------------------------------------- */

function ETACountdown({ shipment, eventCount, locale, t, reduce }: {
  shipment: PublicShipmentSummary;
  eventCount: number;
  locale: 'de' | 'en';
  t: TFunction;
  reduce: boolean;
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

  // Digit + unit + label structure, so the digit can swap independently.
  let digit = 0;
  let unit = '';
  let label = '';
  if (isOverdue) {
    label = t('Should have arrived');
  } else if (diffH < 6) {
    label = t('Arriving soon');
  } else if (diffH < 24) {
    digit = Math.max(1, diffH);
    unit = t('hours_short');
    label = locale === 'de' ? 'Stunden bis Lieferung' : 'hours to delivery';
  } else {
    digit = Math.max(1, diffD);
    unit = t('days_short');
    label = locale === 'de' ? 'Tage bis Lieferung' : 'days to delivery';
  }

  const confidenceLabel = confidence === 'high'
    ? t('confirmed')
    : confidence === 'medium'
      ? t('estimated')
      : t('predicted');

  if (digit === 0) {
    // No digit case ("Arriving soon", "Should have arrived")
    return (
      <div className="space-y-2">
        <motion.div
          className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? undefined : spring.gentle}
        >
          {label}
        </motion.div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{dateLabel}</span>
          <span className="text-muted-foreground/50">·</span>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{confidenceLabel}</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 sm:gap-3 leading-none">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={digit}
            initial={reduce ? false : { y: 28, opacity: 0, filter: 'blur(4px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { y: -28, opacity: 0, filter: 'blur(4px)' }}
            transition={reduce ? { duration: 0.1 } : spring.snappy}
            className="inline-block text-6xl sm:text-7xl md:text-8xl font-bold tabular-nums min-w-[1.4ch] text-center bg-clip-text text-transparent"
            style={{
              backgroundImage: 'linear-gradient(135deg, var(--tracking-accent, #3B82F6) 0%, var(--tracking-accent-glow, #3B82F666) 100%)',
            }}
          >
            {digit}
          </motion.span>
        </AnimatePresence>
        <span className="text-2xl sm:text-3xl font-semibold text-muted-foreground tabular-nums">{unit}</span>
      </div>
      <div className="text-base sm:text-lg font-medium text-foreground/80">{label}</div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1">
        <Clock className="h-3.5 w-3.5" />
        <span>{dateLabel}</span>
        <span className="text-muted-foreground/50">·</span>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{confidenceLabel}</Badge>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  JOURNEY ARC SVG                                                            */
/* -------------------------------------------------------------------------- */

interface Waypoint {
  t: number;
  x: number;
  y: number;
  label: string;
  intermediate: boolean;
}

// Quadratic Bezier B(t) = (1-t)² P0 + 2(1-t)t P1 + t² P2
// P0=(20,80), P1=(160,15), P2=(300,80)
function bezierAt(t: number): { x: number; y: number } {
  const u = 1 - t;
  return {
    x: u * u * 20 + 2 * u * t * 160 + t * t * 300,
    y: u * u * 80 + 2 * u * t * 15 + t * t * 80,
  };
}

function buildWaypoints(events: PublicTrackingEvent[], origin: string, destination: string): Waypoint[] {
  // Dedup, preserve order from events (oldest first => use reverse since events come newest-first)
  const seen = new Set<string>();
  const cities: string[] = [];
  for (let i = events.length - 1; i >= 0; i--) {
    const c = titleCaseCity(events[i].location);
    if (!c) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    cities.push(c);
  }
  // Cap at 2 intermediates
  const intermediates = cities.length <= 2
    ? cities
    : [cities[0], cities[cities.length - 1]];

  const result: Waypoint[] = [
    { t: 0, ...bezierAt(0), label: origin, intermediate: false },
  ];
  intermediates.forEach((label, i) => {
    const t = (i + 1) / (intermediates.length + 1);
    result.push({ t, ...bezierAt(t), label, intermediate: true });
  });
  result.push({ t: 1, ...bezierAt(1), label: destination, intermediate: false });
  return result;
}

function JourneyArc({ events, stageIdx, isDelivered, isCancelled, ageOfLatestMs, t, reduce }: {
  events: PublicTrackingEvent[];
  stageIdx: number;
  isDelivered: boolean;
  isCancelled: boolean;
  ageOfLatestMs: number;
  t: TFunction;
  reduce: boolean;
}) {
  const origin = t('journey_origin');
  const destination = t('journey_destination');
  const waypoints = useMemo(() => buildWaypoints(events, origin, destination), [events, origin, destination]);

  // Progress 0..1 along the arc based on current stage
  const progress = isCancelled ? 0 : Math.max(0, Math.min(1, stageIdx / (STAGES.length - 1)));
  const glyphPos = useMemo(() => bezierAt(progress), [progress]);
  const isSleeping = !isDelivered && !isCancelled && stageIdx >= 2 && ageOfLatestMs > 90 * 60_000;

  return (
    <div className={`relative w-full ${isCancelled ? 'opacity-40 grayscale' : ''}`} aria-hidden>
      <svg
        viewBox="0 0 320 130"
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="journeyProgressGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--tracking-accent-soft, #3B82F633)" />
            <stop offset="100%" stopColor="var(--tracking-accent, #3B82F6)" />
          </linearGradient>
        </defs>

        {/* Muted base path */}
        <path
          d="M 20 80 Q 160 15 300 80"
          fill="none"
          stroke="currentColor"
          className="text-muted-foreground/20"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        {/* Animated progress overlay */}
        <motion.path
          d="M 20 80 Q 160 15 300 80"
          fill="none"
          stroke="url(#journeyProgressGrad)"
          strokeWidth="3"
          strokeLinecap="round"
          initial={reduce ? { pathLength: progress } : { pathLength: 0 }}
          animate={{ pathLength: progress }}
          transition={reduce ? { duration: 0 } : { duration: 1.2, ease: 'easeOut' }}
        />

        {/* Waypoint dots + labels */}
        {waypoints.map((wp, i) => {
          const isPassed = wp.t <= progress + 0.01;
          const labelHidden = wp.intermediate ? 'hidden sm:block' : '';
          const dy = wp.intermediate ? -10 : 18;
          return (
            <g key={`${wp.label}-${i}`}>
              <motion.circle
                cx={wp.x}
                cy={wp.y}
                r={wp.intermediate ? 3 : 5}
                fill={isPassed ? 'var(--tracking-accent, #3B82F6)' : 'currentColor'}
                className={isPassed ? '' : 'text-muted-foreground/40'}
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={reduce ? undefined : { ...spring.snappy, delay: i * 0.08 }}
              />
              <text
                x={wp.x}
                y={wp.y + dy}
                textAnchor="middle"
                className={`text-[9px] sm:text-[10px] fill-muted-foreground font-medium ${labelHidden}`}
              >
                {wp.label}
              </text>
            </g>
          );
        })}

        {/* Package glyph riding the path */}
        {!isCancelled && (
          <motion.g
            animate={{ x: glyphPos.x, y: glyphPos.y }}
            transition={reduce ? { duration: 0 } : spring.gentle}
          >
            {/* tiny box */}
            <motion.g
              animate={
                reduce || isDelivered || isSleeping
                  ? undefined
                  : { y: [0, -2, 0] }
              }
              transition={
                reduce || isDelivered || isSleeping
                  ? undefined
                  : { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
              }
            >
              <rect x="-7" y="-7" width="14" height="14" rx="2" fill="var(--tracking-accent, #3B82F6)" />
              <path d="M -7 -1 L 7 -1" stroke="white" strokeWidth="1" opacity="0.6" />
              <path d="M 0 -7 L 0 7" stroke="white" strokeWidth="1" opacity="0.4" />
            </motion.g>
            {/* sleep "z" */}
            {isSleeping && (
              <text x="9" y="-9" className="text-[9px] fill-muted-foreground" fontStyle="italic">z</text>
            )}
            {/* delivered sparkle */}
            {isDelivered && !reduce && (
              <motion.text
                x="0"
                y="-12"
                textAnchor="middle"
                className="text-[12px]"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 1] }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              >
                ✨
              </motion.text>
            )}
          </motion.g>
        )}
      </svg>
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
          const lineLeft = !isCancelled && idx > i - 1; // line to the left of this dot is "filled"
          return (
            <div key={s} className="flex flex-1 flex-col items-center gap-2 min-w-0">
              <div className="relative flex items-center justify-center w-full h-9">
                {/* connector lines */}
                {i > 0 && (
                  <div className="absolute right-1/2 left-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full origin-left"
                      style={{ background: 'linear-gradient(to right, var(--tracking-accent-soft, #3B82F633), var(--tracking-accent, #3B82F6))' }}
                      initial={reduce ? { scaleX: lineLeft ? 1 : 0 } : { scaleX: 0 }}
                      animate={{ scaleX: lineLeft ? 1 : 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                )}
                {i < STAGES.length - 1 && (
                  <div className="absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full origin-left"
                      style={{ background: 'linear-gradient(to right, var(--tracking-accent, #3B82F6), var(--tracking-accent-soft, #3B82F633))' }}
                      initial={reduce ? { scaleX: isPast ? 1 : 0 } : { scaleX: 0 }}
                      animate={{ scaleX: isPast ? 1 : 0 }}
                      transition={reduce ? { duration: 0 } : { duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                )}

                {/* current stage pulse ring */}
                {isCurrent && !reduce && (
                  <motion.div
                    className="absolute h-9 w-9 rounded-full"
                    style={{ background: 'var(--tracking-accent-soft, #3B82F633)' }}
                    animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    aria-hidden
                  />
                )}

                {/* dot/icon */}
                <motion.div
                  initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                  animate={{ scale: isCurrent ? 1 : 1, opacity: 1 }}
                  transition={reduce ? { duration: 0 } : spring.snappy}
                  className={`relative z-10 flex items-center justify-center rounded-full transition-colors duration-300 ${
                    isPast
                      ? 'h-7 w-7 text-white'
                      : isCurrent
                        ? 'h-9 w-9 text-white shadow-lg'
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
                  ) : isCurrent ? (
                    <Icon className="h-4 w-4" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 opacity-70" />
                  )}
                </motion.div>
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
/*  CONFETTI BURST (radial, anchored)                                         */
/* -------------------------------------------------------------------------- */

interface ConfettiPiece {
  angle: number;
  distance: number;
  duration: number;
  delay: number;
  color: string;
  rotate: number;
  size: number;
}

function makeConfettiPieces(count: number): ConfettiPiece[] {
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444'];
  return Array.from({ length: count }, (_, i) => ({
    angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
    distance: 200 + Math.random() * 200,
    duration: 2 + Math.random() * 1.4,
    delay: Math.random() * 0.2,
    color: colors[i % colors.length],
    rotate: Math.random() * 720 - 360,
    size: 6 + Math.random() * 6,
  }));
}

function ConfettiBurst({ active, anchor }: { active: boolean; anchor: { x: number; y: number } }) {
  const [pieces] = useState(() => makeConfettiPieces(48));
  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute block rounded-sm"
          style={{
            top: anchor.y,
            left: anchor.x,
            width: p.size,
            height: p.size * 1.4,
            background: p.color,
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: Math.cos(p.angle) * p.distance,
            y: Math.sin(p.angle) * p.distance + 220, // gravity pull
            scale: [0, 1, 0.85],
            opacity: [1, 1, 0],
            rotate: p.rotate,
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  STATUS-CHANGE RIPPLE                                                       */
/* -------------------------------------------------------------------------- */

interface Ripple { id: number }

function StatusRipples({ ripples }: { ripples: Ripple[] }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.div
            key={r.id}
            className="absolute top-1/3 left-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--tracking-accent, #3B82F6)' }}
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 8, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  LIVE EVENT TIMELINE                                                       */
/* -------------------------------------------------------------------------- */

function LiveTimeline({ events, locale, t, now, reduce }: {
  events: PublicTrackingEvent[];
  locale: 'de' | 'en';
  t: TFunction;
  now: number;
  reduce: boolean;
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
      <motion.div
        className="relative space-y-3 pl-6"
        variants={reduce ? undefined : staggerContainer}
        initial={reduce ? false : 'initial'}
        animate="animate"
      >
        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent" />
        {visible.map((ev, i) => {
          const date = ev.timestamp ? new Date(ev.timestamp) : null;
          const isLatest = i === 0;
          const ago = formatTimeAgo(ev.timestamp, now, t);
          const cityClean = titleCaseCity(ev.location);
          return (
            <motion.div
              key={`${ev.timestamp}-${i}`}
              variants={reduce ? undefined : staggerItem}
              layout
              className="relative"
            >
              <div className="absolute -left-[22px] top-1.5">
                <motion.div
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                    isLatest ? '' : 'bg-muted-foreground/40'
                  }`}
                  style={isLatest ? { background: 'var(--tracking-accent, #3B82F6)' } : undefined}
                  animate={isLatest && !reduce ? { boxShadow: ['0 0 0 0 var(--tracking-accent-soft)', '0 0 0 10px transparent'] } : undefined}
                  transition={isLatest && !reduce ? { duration: 1.8, repeat: Infinity, ease: 'easeOut' } : undefined}
                >
                  {isLatest && <span className="block h-1.5 w-1.5 rounded-full bg-background" />}
                </motion.div>
              </div>
              <div className={`text-sm ${isLatest ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {ev.description}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground/80">
                {ago && (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 font-normal">
                    <Clock className="h-2.5 w-2.5" />
                    {ago}
                  </Badge>
                )}
                {cityClean && (
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-1 font-normal">
                    <MapPin className="h-2.5 w-2.5" />
                    {cityClean}
                  </Badge>
                )}
                {date && (
                  <span className="text-muted-foreground/50">
                    {date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: 'short' })}
                    {' · '}
                    {date.toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
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
/*  DPP PREVIEW (3D tilt + reveal-on-progress + animated stats)               */
/* -------------------------------------------------------------------------- */

interface DPPCardProps {
  item: PublicShipmentItem;
  revealed: boolean;
  reduce: boolean;
  t: TFunction;
}

function DPPCard({ item, revealed, reduce, t }: DPPCardProps) {
  const dppUrl = item.productGtin && item.productSerial
    ? `/p/${item.productGtin}/${item.productSerial}`
    : null;
  const blurStyle = revealed ? { filter: 'blur(0px)', opacity: 1 } : { filter: 'blur(10px)', opacity: 0.65 };

  const content = (
    <div className="relative group">
      <motion.div
        whileHover={reduce ? undefined : { y: -2, transition: spring.snappy }}
        className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-shadow hover:border-primary/50 hover:shadow-md"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
          <motion.div
            className="h-full w-full"
            animate={blurStyle}
            transition={reduce ? { duration: 0 } : spring.gentle}
          >
            {item.productImageUrl ? (
              <img src={item.productImageUrl} alt={item.productName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
            )}
          </motion.div>
        </div>
        <div className="min-w-0 flex-1">
          <motion.div
            animate={blurStyle}
            transition={reduce ? { duration: 0 } : spring.gentle}
          >
            <div className="truncate text-sm font-medium text-foreground">{item.productName}</div>
            <div className="text-xs text-muted-foreground">
              {item.productManufacturer && <span>{item.productManufacturer} · </span>}
              {item.quantity > 1 ? `${item.quantity}× ` : ''}
              {item.productCategory || ''}
            </div>
          </motion.div>
        </div>
        {!revealed && (
          <Badge variant="outline" className="absolute right-2 top-2 h-5 gap-1 px-1.5 text-[10px] bg-background/90 backdrop-blur-sm">
            <Lock className="h-2.5 w-2.5" />
            <span className="hidden sm:inline">{t('Unlocks at delivery')}</span>
          </Badge>
        )}
        {revealed && dppUrl && (
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        )}
      </motion.div>
    </div>
  );

  if (revealed && dppUrl) {
    return (
      <a href={dppUrl} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }
  return (
    <div aria-label={revealed ? undefined : t('dpp_locked_aria')}>
      {content}
    </div>
  );
}

function AnimatedStat({ value, suffix, decimals = 0, reduce }: {
  value: number;
  suffix?: string;
  decimals?: number;
  reduce: boolean;
}) {
  const animated = useAnimatedNumber(value, { duration: reduce ? 0 : 1200, decimals });
  const display = reduce ? value : animated;
  return (
    <span className="tabular-nums">
      {display.toFixed(decimals)}
      {suffix && <span className="text-xs font-normal ml-0.5">{suffix}</span>}
    </span>
  );
}

function DPPPreview({ items, revealedCount, t, reduce }: {
  items: PublicShipmentItem[];
  revealedCount: number;
  t: TFunction;
  reduce: boolean;
}) {
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
      <div className="mb-3 flex items-center gap-2">
        <motion.span
          animate={reduce ? undefined : { rotate: [0, 12, -12, 0] }}
          transition={reduce ? undefined : { duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-flex"
        >
          <Sparkles className="h-4 w-4" style={{ color: 'var(--tracking-accent, #3B82F6)' }} />
        </motion.span>
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
                <AnimatedStat value={totalCarbon} suffix={carbonUnit} decimals={1} reduce={reduce} />
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
                <AnimatedStat value={avgRecycle} suffix="%" reduce={reduce} />
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/40">
                <motion.div
                  className="h-full bg-blue-500"
                  initial={reduce ? { width: `${avgRecycle}%` } : { width: 0 }}
                  animate={{ width: `${avgRecycle}%` }}
                  transition={reduce ? { duration: 0 } : { duration: 1.2, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <motion.div
        className="space-y-2"
        variants={reduce ? undefined : gridStagger}
        initial={reduce ? false : 'initial'}
        animate="animate"
      >
        {items.map((item, i) => (
          <motion.div key={item.productId} variants={reduce ? undefined : gridItem}>
            <DPPCard
              item={item}
              revealed={i < revealedCount}
              reduce={reduce}
              t={t}
            />
          </motion.div>
        ))}
      </motion.div>
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
  const now = useNowTicker(30_000);

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
  const [confettiAnchor, setConfettiAnchor] = useState({ x: 200, y: 300 });
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const confettiFiredRef = useRef(false);
  const lastStageRef = useRef<ShipmentStage | null>(null);
  const heroCardRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Reset CSS vars on unmount ---------- */
  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.style.removeProperty('--tracking-accent');
      root.style.removeProperty('--tracking-accent-soft');
      root.style.removeProperty('--tracking-accent-glow');
    };
  }, []);

  /* ---------- Confetti anchor: hero card center ---------- */
  const captureConfettiAnchor = () => {
    const r = heroCardRef.current?.getBoundingClientRect();
    if (r) {
      setConfettiAnchor({ x: r.left + r.width / 2, y: r.top + r.height * 0.4 });
    } else {
      setConfettiAnchor({ x: window.innerWidth / 2, y: window.innerHeight * 0.35 });
    }
  };

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

      if (bundle.shipment.deliveredAt && !confettiFiredRef.current) {
        confettiFiredRef.current = true;
        // small delay so the page can paint first
        setTimeout(() => {
          captureConfettiAnchor();
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4500);
        }, 300);
      }
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
    const priorStage = lastStageRef.current;
    const bundle = await getPublicShipmentByToken(token);
    if (bundle) {
      const newStage = mapToStage(bundle.shipment.status);
      setShipment(bundle.shipment);
      setItems(bundle.items);
      // Trigger ripple if stage changed mid-session
      if (priorStage !== null && priorStage !== newStage) {
        const id = Date.now();
        setRipples((rs) => [...rs, { id }]);
        setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 1800);
      }
      lastStageRef.current = newStage;
      // Confetti on first transition into delivered
      if (bundle.shipment.deliveredAt && !confettiFiredRef.current) {
        confettiFiredRef.current = true;
        captureConfettiAnchor();
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4500);
      }
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

  /* ---------- Not-found state ---------- */
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

  /* ---------- Loading state ---------- */
  if (loading || !shipment || !branding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---------- Derived view state ---------- */
  const isDelivered = !!shipment.deliveredAt;
  const isCancelled = shipment.status === 'cancelled';
  const stageIdx = STAGES.indexOf(mapToStage(shipment.status));
  const progress = stageIdx / (STAGES.length - 1);
  const revealedCount = isDelivered
    ? items.length
    : Math.max(stageIdx >= 1 ? 1 : 0, Math.ceil(progress * items.length));
  const ageOfLatestMs = events[0]?.timestamp ? Date.now() - new Date(events[0].timestamp).getTime() : Infinity;
  const carrierLink = shipment.carrier === 'DHL' && shipment.trackingNumber
    ? `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(shipment.trackingNumber)}`
    : null;
  const narration = narrate(events, shipment.status, t);

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-muted/40 via-background to-background overflow-x-hidden">
      <ConfettiBurst active={showConfetti} anchor={confettiAnchor} />
      <StatusRipples ripples={ripples} />

      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <motion.div
            className="flex items-center gap-3 min-w-0"
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={reduce ? undefined : spring.gentle}
          >
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
              <div className="truncate text-xs text-muted-foreground">{t('Live tracking')}</div>
            </div>
          </motion.div>
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

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8 space-y-5 relative">
        {/* HERO */}
        <motion.div
          ref={heroCardRef}
          variants={reduce ? undefined : blurIn}
          initial={reduce ? false : 'initial'}
          animate="animate"
        >
          <Card className="overflow-hidden relative">
            <AuroraBackground reduce={reduce} />
            <CardContent className="relative pt-7 pb-6 sm:pt-9 sm:pb-7 px-5 sm:px-7">
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                {shipment.recipientFirstName
                  ? t('Hi {{name}}, your package is on the way').replace('{{name}}', shipment.recipientFirstName)
                  : t('Your package is on the way')}
              </div>
              <div className="mt-3">
                <ETACountdown
                  shipment={shipment}
                  eventCount={events.length}
                  locale={locale}
                  t={t}
                  reduce={reduce}
                />
              </div>
              {narration && (
                <motion.p
                  key={narration}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={reduce ? undefined : { ...spring.gentle, delay: 0.2 }}
                  className="mt-3 text-sm sm:text-base text-foreground/80 italic max-w-prose"
                >
                  {narration}
                </motion.p>
              )}
              {isDelivered && (
                <motion.div
                  variants={microInteraction.successPulse}
                  initial="initial"
                  animate="animate"
                  className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300"
                >
                  <PackageCheck className="h-4 w-4" />
                  {t('Your package has been delivered. Enjoy!')}
                </motion.div>
              )}
              {isCancelled && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                  <PackageX className="h-4 w-4" />
                  {t('This shipment was cancelled')}
                </div>
              )}
            </CardContent>

            {/* Journey Arc */}
            <div className="relative px-5 sm:px-7 pb-3 pt-1">
              <JourneyArc
                events={events}
                stageIdx={stageIdx}
                isDelivered={isDelivered}
                isCancelled={isCancelled}
                ageOfLatestMs={ageOfLatestMs}
                t={t}
                reduce={reduce}
              />
            </div>

            {/* Status Pipeline */}
            <div className="relative border-t bg-muted/20 px-4 sm:px-7 py-4">
              <StatusPipeline status={shipment.status} t={t} reduce={reduce} />
            </div>
          </Card>
        </motion.div>

        {/* TRACKING + EVENTS */}
        <motion.div
          variants={reduce ? undefined : cardEntrance}
          initial={reduce ? false : 'initial'}
          animate="animate"
          transition={reduce ? undefined : { ...spring.snappy, delay: 0.1 }}
        >
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
              <LiveTimeline events={events} locale={locale} t={t} now={now} reduce={reduce} />
              {shipment.trackingPolledAt && (
                <div className="mt-3 text-[10px] text-muted-foreground/60 text-right">
                  {t('Last update')}: {new Date(shipment.trackingPolledAt).toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* DPP PREVIEW */}
        {items.length > 0 && (
          <motion.div
            variants={reduce ? undefined : cardEntrance}
            initial={reduce ? false : 'initial'}
            animate="animate"
            transition={reduce ? undefined : { ...spring.snappy, delay: 0.2 }}
          >
            <Card>
              <CardContent className="pt-5 pb-5 px-5 sm:px-7">
                <DPPPreview items={items} revealedCount={revealedCount} t={t} reduce={reduce} />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* DELIVERY ISSUE */}
        {isDelivered && (
          <motion.div
            variants={reduce ? undefined : cardEntrance}
            initial={reduce ? false : 'initial'}
            animate="animate"
          >
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
          </motion.div>
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
