import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SOCIAL_PLATFORM_CONFIG } from '@/lib/warehouse-constants';
import type { InfluencerRanking } from '@/types/warehouse';
import {
  Instagram, Music2, Youtube, Twitter, Pin, Globe, Trophy,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface InfluencerLeaderboardProps {
  influencers: InfluencerRanking[];
  className?: string;
}

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  Instagram: Instagram,
  Music2: Music2,
  Youtube: Youtube,
  Twitter: Twitter,
  Pin: Pin,
  Globe: Globe,
};

const RANK_STYLES: Record<number, string> = {
  1: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white',
  2: 'bg-gray-300 text-gray-800 dark:bg-gray-500 dark:text-white',
  3: 'bg-amber-600 text-white',
};

export function InfluencerLeaderboard({ influencers, className }: InfluencerLeaderboardProps) {
  const { t } = useTranslation('warehouse');

  if (influencers.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('Top Influencers')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Trophy className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">{t('No influencers yet')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('Top Influencers')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {influencers.slice(0, 5).map((inf, idx) => {
          const rank = idx + 1;
          const rankStyle = RANK_STYLES[rank] || 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
          const platformCfg = SOCIAL_PLATFORM_CONFIG[inf.platform];
          const PlatformIcon = platformCfg ? PLATFORM_ICONS[platformCfg.icon] : Globe;
          const initials = inf.contactName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();

          return (
            <div
              key={inf.contactId}
              className="flex items-center gap-3"
            >
              {/* Rank badge */}
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankStyle}`}
              >
                {rank}
              </span>

              {/* Avatar */}
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-500 text-white text-xs font-medium">
                {initials}
              </span>

              {/* Name + platform */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{inf.contactName}</span>
                  {PlatformIcon && (
                    <PlatformIcon className={`h-3.5 w-3.5 shrink-0 ${platformCfg?.color || 'text-gray-500'}`} />
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {inf.followerCount.toLocaleString()} {t('followers')}
                </p>
              </div>

              {/* Engagement badge */}
              <Badge variant="secondary" className="text-xs shrink-0">
                {inf.engagementRate.toFixed(1)}%
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
