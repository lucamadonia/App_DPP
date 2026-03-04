import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Truck,
  MapPin,
  Clock,
  Package,
  CheckCircle2,
  RefreshCw,
  Loader2,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getPublicDHLTracking } from '@/services/supabase/dhl-carrier';
import type { DHLTrackingEvent } from '@/types/dhl';

interface ShipmentTrackerProps {
  trackingNumber: string;
  returnNumber: string;
  carrier?: string;
  translationNamespace?: string;
}

const DHL_TRACKING_URL = 'https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=';

function getEventIcon(statusCode: string | undefined, isFirst: boolean) {
  if (!statusCode) return isFirst ? Truck : Package;

  const code = statusCode.toLowerCase();
  if (code === 'delivered') return CheckCircle2;
  if (code === 'transit') return Truck;
  if (code === 'out-for-delivery' || code === 'delivery') return Truck;
  return isFirst ? Truck : Package;
}

function getStatusLabel(statusCode: string | undefined, t: (key: string) => string): string | null {
  if (!statusCode) return null;
  const code = statusCode.toLowerCase();
  if (code === 'delivered') return t('Delivered');
  if (code === 'transit') return t('In Transit');
  if (code === 'out-for-delivery' || code === 'delivery') return t('Out for Delivery');
  return null;
}

export function ShipmentTracker({ trackingNumber, returnNumber, translationNamespace = 'returns' }: ShipmentTrackerProps) {
  const { t } = useTranslation(translationNamespace);
  const [events, setEvents] = useState<DHLTrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  const loadTracking = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await getPublicDHLTracking(trackingNumber, returnNumber);
      setEvents(result);
      setLastUpdated(new Date());
      setError(result.length === 0);
    } catch {
      setEvents([]);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [trackingNumber, returnNumber]);

  // Load on mount
  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(loadTracking, 60_000);
    return () => clearInterval(interval);
  }, [loadTracking]);

  const topStatus = events[0]?.statusCode;
  const statusLabel = getStatusLabel(topStatus, t);
  const isDelivered = topStatus?.toLowerCase() === 'delivered';

  return (
    <Card className="overflow-hidden border-border/60 bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2.5">
            {/* DHL logo square */}
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-400 text-[10px] font-extrabold tracking-tight text-red-600 leading-none">
              DHL
            </div>
            {t('Shipment Tracking')}
          </CardTitle>

          <div className="flex items-center gap-2">
            {statusLabel && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isDelivered
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {isDelivered ? <CheckCircle2 className="h-3 w-3" /> : <Truck className="h-3 w-3" />}
                {statusLabel}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={loadTracking}
              disabled={loading}
              className="h-8 px-2"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Tracking number + DHL link */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground font-mono">{trackingNumber}</span>
          <a
            href={`${DHL_TRACKING_URL}${trackingNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t('Track on DHL')}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>

      <CardContent>
        {/* Loading skeleton */}
        {loading && events.length === 0 ? (
          <div className="space-y-4 py-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-5 w-5 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-1/2 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : error && events.length === 0 ? (
          /* Error / no data fallback */
          <div className="text-center py-6 space-y-2">
            <AlertCircle className="h-8 w-8 text-muted-foreground/50 mx-auto" />
            <p className="text-sm text-muted-foreground">{t('Tracking data unavailable')}</p>
            <a
              href={`${DHL_TRACKING_URL}${trackingNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {t('Track on DHL')}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        ) : (
          /* Event timeline */
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-[9px] top-1 bottom-1 w-px bg-border" />

            {events.map((event, idx) => {
              const Icon = getEventIcon(event.statusCode, idx === 0);
              const isTop = idx === 0;

              return (
                <div key={idx} className="relative flex gap-3">
                  <div className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full border ${
                    isTop
                      ? isDelivered
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-600'
                        : 'bg-yellow-100 border-yellow-300 text-yellow-600'
                      : 'bg-background border-border text-muted-foreground'
                  }`}>
                    {isTop ? (
                      <Icon className="h-3 w-3" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${isTop ? 'font-medium' : 'text-foreground/80'}`}>
                      {event.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-0.5">
                      {event.timestamp && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(event.timestamp).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      )}
                      {event.location && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        {lastUpdated && events.length > 0 && (
          <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t text-center">
            {t('Last updated')}: {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {t('Auto-refreshes every minute')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
