import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CAMPAIGN_EVENT_ICONS } from '@/lib/warehouse-constants';
import { relativeTime } from '@/lib/animations';
import type { ActivityItem } from '@/types/warehouse';
import type { CampaignEventType } from '@/types/warehouse';
import {
  Plus, Pencil, RefreshCw, UserPlus, UserMinus, UserCheck,
  Truck, PackageCheck, RotateCcw, Camera, CheckCircle,
  Banknote, Clock, Flag, MessageSquare, Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Plus,
  Pencil,
  RefreshCw,
  UserPlus,
  UserMinus,
  UserCheck,
  Truck,
  PackageCheck,
  RotateCcw,
  Camera,
  CheckCircle,
  Banknote,
  Clock,
  Flag,
  MessageSquare,
};

function getEventIcon(eventType: CampaignEventType): LucideIcon {
  const iconName = CAMPAIGN_EVENT_ICONS[eventType];
  return ICON_MAP[iconName] || Activity;
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  const { t, i18n } = useTranslation('warehouse');

  if (activities.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('Recent Activity')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">{t('No activity yet')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('Recent Activity')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
          {activities.map((activity) => {
            const Icon = getEventIcon(activity.eventType);

            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.campaignName && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {activity.campaignName}
                      </Badge>
                    )}
                    <span className="text-[11px] text-muted-foreground">
                      {relativeTime(activity.createdAt, i18n.language)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
