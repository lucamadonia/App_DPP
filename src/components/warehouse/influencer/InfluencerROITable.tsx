import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';
import { Users } from 'lucide-react';
import { Instagram, Music2, Youtube, Twitter, Pin, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getInfluencerContacts } from '@/services/supabase/wh-influencer-hub';
import { getContentPosts } from '@/services/supabase/wh-content';
import { SOCIAL_PLATFORM_CONFIG } from '@/lib/warehouse-constants';
import type { WhContact, WhContentPost } from '@/types/warehouse';

const PLATFORM_ICONS: Record<string, LucideIcon> = {
  Instagram: Instagram,
  Music2: Music2,
  Youtube: Youtube,
  Twitter: Twitter,
  Pin: Pin,
  Globe: Globe,
};

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

interface InfluencerROITableProps {
  className?: string;
}

interface InfluencerROI {
  rank: number;
  contactId: string;
  contactName: string;
  platform: string;
  followers: number;
  contentCount: number;
  totalViews: number;
}

export function InfluencerROITable({ className }: InfluencerROITableProps) {
  const { t } = useTranslation('warehouse');
  const [contacts, setContacts] = useState<WhContact[]>([]);
  const [posts, setPosts] = useState<WhContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getInfluencerContacts(),
      getContentPosts(),
    ])
      .then(([c, p]) => {
        setContacts(c);
        setPosts(p);
      })
      .finally(() => setLoading(false));
  }, []);

  const ranked = useMemo<InfluencerROI[]>(() => {
    const viewsByContact = new Map<string, { views: number; count: number }>();
    for (const p of posts) {
      if (!p.contactId) continue;
      const existing = viewsByContact.get(p.contactId) || { views: 0, count: 0 };
      existing.views += p.views ?? 0;
      existing.count++;
      viewsByContact.set(p.contactId, existing);
    }

    return contacts
      .map((c) => {
        const data = viewsByContact.get(c.id) || { views: 0, count: 0 };
        return {
          rank: 0,
          contactId: c.id,
          contactName: c.contactName,
          platform: c.primaryPlatform || 'other',
          followers: c.followerCount ?? 0,
          contentCount: data.count,
          totalViews: data.views,
        };
      })
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10)
      .map((r, idx) => ({ ...r, rank: idx + 1 }));
  }, [contacts, posts]);

  const platformIcon = (inf: InfluencerROI) => {
    const cfg = SOCIAL_PLATFORM_CONFIG[inf.platform as keyof typeof SOCIAL_PLATFORM_CONFIG];
    const PIcon = cfg ? PLATFORM_ICONS[cfg.icon] || Globe : Globe;
    return <PIcon className={`h-4 w-4 ${cfg?.color || 'text-gray-500'}`} />;
  };

  const columns: ResponsiveTableColumn<InfluencerROI>[] = [
    {
      id: 'rank',
      header: '#',
      className: 'w-10 font-medium text-muted-foreground',
      cell: inf => inf.rank,
    },
    {
      id: 'name',
      header: t('Name'),
      className: 'font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[120px]',
      mobilePriority: 'title',
      cell: inf => inf.contactName,
    },
    {
      id: 'platform',
      header: t('Platform'),
      className: 'w-10',
      hideBelow: 'sm',
      cell: platformIcon,
    },
    {
      id: 'followers',
      header: t('Followers'),
      className: 'text-right text-xs',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Followers'),
      cell: inf => formatCompact(inf.followers),
    },
    {
      id: 'content',
      header: t('Content'),
      className: 'text-right text-xs',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Content'),
      cell: inf => inf.contentCount,
    },
    {
      id: 'views',
      header: t('Total Views'),
      className: 'text-right text-xs font-medium',
      mobilePriority: 'meta',
      mobileLabel: t('Total Views'),
      cell: inf => formatCompact(inf.totalViews),
    },
  ];

  if (!loading && ranked.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="px-3 sm:px-6 pb-2">
          <CardTitle className="text-sm sm:text-base">{t('Influencer ROI')}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-muted-foreground">
            <Users className="h-8 w-8 sm:h-10 sm:w-10 mb-2 opacity-40" />
            <p className="text-sm">{t('No data available')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="px-3 sm:px-6 pb-2">
        <CardTitle className="text-sm sm:text-base">{t('Influencer ROI')}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <ResponsiveTable
          data={ranked}
          columns={columns}
          rowKey={inf => inf.contactId}
          loading={loading}
          loadingRows={5}
          mobileCardTitle={inf => (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{inf.rank}.</span>
              {platformIcon(inf)}
              <span className="truncate">{inf.contactName}</span>
            </span>
          )}
        />
      </CardContent>
    </Card>
  );
}
