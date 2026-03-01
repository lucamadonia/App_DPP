import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Pencil, RefreshCw, UserPlus, UserMinus, UserCheck,
  Truck, PackageCheck, RotateCcw, Camera, CheckCircle,
  Banknote, Clock, Flag, MessageSquare, History,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getCampaignEvents } from '@/services/supabase/wh-campaign-events';
import { CAMPAIGN_EVENT_ICONS } from '@/lib/warehouse-constants';
import { relativeTime } from '@/lib/animations';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import type { WhCampaignEvent, CampaignEventType } from '@/types/warehouse';

const EVENT_ICON_MAP: Record<string, typeof Plus> = {
  Plus, Pencil, RefreshCw, UserPlus, UserMinus, UserCheck,
  Truck, PackageCheck, RotateCcw, Camera, CheckCircle,
  Banknote, Clock, Flag, MessageSquare,
};

function getEventIcon(eventType: CampaignEventType) {
  const iconName = CAMPAIGN_EVENT_ICONS[eventType];
  return EVENT_ICON_MAP[iconName] ?? History;
}

interface CampaignTimelineProps {
  campaignId: string;
  className?: string;
}

export function CampaignTimeline({ campaignId, className = '' }: CampaignTimelineProps) {
  const { t, i18n } = useTranslation('warehouse');
  const [events, setEvents] = useState<WhCampaignEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const staggered = useStaggeredList(events.length);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCampaignEvents(campaignId);
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {t('Timeline')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          {t('Timeline')}
          {events.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{events.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <History className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('No timeline events')}</p>
          </div>
        ) : (
          <div className="relative ml-4 border-l-2 border-muted pl-6 space-y-6">
            {events.map((event, i) => {
              const Icon = getEventIcon(event.eventType);
              const visible = staggered[i] ?? false;

              return (
                <div
                  key={event.id}
                  className={`relative transition-all duration-300 ${
                    visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`}
                >
                  {/* Circle on the timeline line */}
                  <div className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-muted">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="space-y-1">
                    <p className="text-sm">
                      {event.description || t(event.eventType)}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {t(event.eventType)}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {relativeTime(event.createdAt, i18n.language)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
