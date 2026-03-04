import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
          contactId: c.id,
          contactName: c.contactName,
          platform: c.primaryPlatform || 'other',
          followers: c.followerCount ?? 0,
          contentCount: data.count,
          totalViews: data.views,
        };
      })
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10);
  }, [contacts, posts]);

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
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead className="hidden sm:table-cell w-10">{t('Platform')}</TableHead>
                  <TableHead className="hidden md:table-cell text-right">{t('Followers')}</TableHead>
                  <TableHead className="hidden md:table-cell text-right">{t('Content')}</TableHead>
                  <TableHead className="text-right">{t('Total Views')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ranked.map((inf, idx) => {
                  const cfg = SOCIAL_PLATFORM_CONFIG[inf.platform as keyof typeof SOCIAL_PLATFORM_CONFIG];
                  const PIcon = cfg ? PLATFORM_ICONS[cfg.icon] || Globe : Globe;

                  return (
                    <TableRow key={inf.contactId}>
                      <TableCell className="font-medium text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[120px]">{inf.contactName}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <PIcon className={`h-4 w-4 ${cfg?.color || 'text-gray-500'}`} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-xs">{formatCompact(inf.followers)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right text-xs">{inf.contentCount}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{formatCompact(inf.totalViews)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
