import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, MapPin, Clock, Truck, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getDHLTracking } from '@/services/supabase/dhl-carrier';
import type { DHLTrackingEvent } from '@/types/dhl';

interface DHLTrackingPanelProps {
  trackingNumber: string;
}

export function DHLTrackingPanel({ trackingNumber }: DHLTrackingPanelProps) {
  const { t } = useTranslation('warehouse');
  const [events, setEvents] = useState<DHLTrackingEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadTracking = async () => {
    setLoading(true);
    try {
      const result = await getDHLTracking(trackingNumber);
      setEvents(result);
      setLoaded(true);
    } catch {
      // Silently handle — tracking may not be available yet
      setEvents([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingNumber]);

  return (
    <Card>
      <CardHeader className="pb-3 flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Truck className="h-4 w-4 text-yellow-600" /> {t('DHL Tracking')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={loadTracking} disabled={loading}>
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
          )}
          {t('Refresh Tracking')}
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !loaded ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('No tracking events')}
          </p>
        ) : (
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
            {events.map((event, idx) => (
              <div key={idx} className="relative flex gap-3">
                <div className={`absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full border ${
                  idx === 0
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-600 dark:bg-yellow-900/30 dark:border-yellow-700'
                    : 'bg-background border-border text-muted-foreground'
                }`}>
                  {idx === 0 ? (
                    <Truck className="h-3 w-3" />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${idx === 0 ? 'font-medium' : ''}`}>
                    {event.description}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {event.timestamp ? new Date(event.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''}
                    </span>
                    {event.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
