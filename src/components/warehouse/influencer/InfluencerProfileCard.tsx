import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Instagram, Youtube, Music2, Twitter, Pin, Globe, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { INFLUENCER_TIER_CONFIG, SOCIAL_PLATFORM_CONFIG } from '@/lib/warehouse-constants';
import type { WhContact, SocialPlatform } from '@/types/warehouse';

interface InfluencerProfileCardProps {
  contact: WhContact;
  isVisible: boolean;
  className?: string;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

const PLATFORM_ICONS: Record<SocialPlatform, typeof Instagram> = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  twitter: Twitter,
  pinterest: Pin,
  other: Globe,
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getSocialHandle(contact: WhContact): { platform: SocialPlatform; handle: string } | null {
  if (contact.instagramHandle) return { platform: 'instagram', handle: contact.instagramHandle };
  if (contact.tiktokHandle) return { platform: 'tiktok', handle: contact.tiktokHandle };
  if (contact.youtubeHandle) return { platform: 'youtube', handle: contact.youtubeHandle };
  if (contact.primaryPlatform) return { platform: contact.primaryPlatform, handle: contact.contactName };
  return null;
}

export function InfluencerProfileCard({ contact, isVisible, className }: InfluencerProfileCardProps) {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  const tierConfig = contact.influencerTier ? INFLUENCER_TIER_CONFIG[contact.influencerTier] : null;
  const social = getSocialHandle(contact);
  const PlatformIcon = social ? PLATFORM_ICONS[social.platform] : null;
  const platformConfig = social ? SOCIAL_PLATFORM_CONFIG[social.platform] : null;

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ${className || ''}`}
    >
      {/* Gradient header band */}
      <div className="h-16 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20" />

      {/* Tier badge */}
      {tierConfig && (
        <Badge
          variant="secondary"
          className={`absolute top-2 right-2 text-[10px] px-1.5 py-0 ${tierConfig.color}`}
        >
          {t(tierConfig.labelEn)}
        </Badge>
      )}

      <CardContent className="p-4 pt-0">
        {/* Avatar */}
        <div className="-mt-8 mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 ring-4 ring-background flex items-center justify-center text-white text-lg font-semibold">
          {getInitials(contact.contactName)}
        </div>

        {/* Name */}
        <p className="font-semibold text-center mt-2 truncate">{contact.contactName}</p>

        {/* Niche tag */}
        {contact.niche && (
          <p className="text-xs text-muted-foreground text-center">{contact.niche}</p>
        )}

        {/* Social handle */}
        {social && PlatformIcon && platformConfig && (
          <div className={`flex items-center justify-center gap-1 mt-1.5 text-xs ${platformConfig.color}`}>
            <PlatformIcon className="h-3 w-3" />
            <span className="truncate max-w-[120px]">@{social.handle.replace(/^@/, '')}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <Users className="h-3 w-3" />
            </div>
            <p className="text-sm font-semibold">
              {contact.followerCount != null ? formatCompact(contact.followerCount) : '--'}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('Followers')}</p>
          </div>
          <div className="text-center p-2 rounded-md bg-muted/50">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">
              <TrendingUp className="h-3 w-3" />
            </div>
            <p className="text-sm font-semibold">
              {contact.engagementRate != null ? `${contact.engagementRate.toFixed(1)}%` : '--'}
            </p>
            <p className="text-[10px] text-muted-foreground">{t('Engagement')}</p>
          </div>
        </div>

        {/* Action buttons (hover reveal) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-card via-card to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs h-7"
            onClick={() => navigate('/warehouse/contacts')}
          >
            {t('View Profile')}
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs h-7"
            onClick={() => navigate('/warehouse/campaigns')}
          >
            {t('Add to Campaign')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
