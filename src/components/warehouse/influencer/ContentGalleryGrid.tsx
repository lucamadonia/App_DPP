import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Heart, MessageCircle, ExternalLink, Image } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getContentPosts } from '@/services/supabase/wh-content';
import { SOCIAL_PLATFORM_CONFIG } from '@/lib/warehouse-constants';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import type { WhContentPost, SocialPlatform } from '@/types/warehouse';

interface ContentGalleryGridProps {
  campaignId?: string;
  platformFilter?: SocialPlatform | 'all';
  className?: string;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

const PLATFORM_GRADIENTS: Record<SocialPlatform, string> = {
  instagram: 'from-pink-500 via-purple-500 to-orange-400',
  tiktok: 'from-gray-900 via-gray-800 to-gray-700',
  youtube: 'from-red-600 via-red-500 to-red-400',
  twitter: 'from-sky-500 via-sky-400 to-blue-400',
  pinterest: 'from-red-700 via-red-600 to-red-500',
  other: 'from-gray-500 via-gray-400 to-gray-300',
};

export function ContentGalleryGrid({ campaignId, platformFilter, className }: ContentGalleryGridProps) {
  const { t, i18n } = useTranslation('warehouse');
  const isDE = i18n.language.startsWith('de');
  const [posts, setPosts] = useState<WhContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getContentPosts({ campaignId: campaignId || undefined })
      .then((data) => {
        setPosts(data);
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  const filteredPosts = platformFilter && platformFilter !== 'all'
    ? posts.filter((p) => p.platform === platformFilter)
    : posts;

  const visible = useStaggeredList(filteredPosts.length, { interval: 60, initialDelay: 80 });

  if (loading) {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ${className ?? ''}`}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card overflow-hidden">
            <Skeleton className="h-32 sm:h-40 w-full" />
            <div className="p-2.5 sm:p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredPosts.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-10 sm:py-16 text-muted-foreground ${className ?? ''}`}>
        <Image className="h-10 w-10 sm:h-12 sm:w-12 mb-3 opacity-40" />
        <p className="text-sm">{t('No content posts found')}</p>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 ${className ?? ''}`}>
      {filteredPosts.map((post, idx) => {
        const platformCfg = SOCIAL_PLATFORM_CONFIG[post.platform];
        const platformLabel = isDE ? platformCfg?.labelDe : platformCfg?.labelEn;
        const gradient = PLATFORM_GRADIENTS[post.platform] || PLATFORM_GRADIENTS.other;
        const engagement = post.engagementRate ?? 0;

        return (
          <div
            key={post.id}
            className={`group rounded-lg border bg-card overflow-hidden cursor-pointer transition-all duration-500 hover:shadow-md hover:-translate-y-0.5 ${
              visible[idx] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            onClick={() => window.open(post.postUrl, '_blank', 'noopener')}
          >
            {/* Thumbnail placeholder */}
            <div className={`relative h-32 sm:h-40 bg-gradient-to-br ${gradient}`}>
              <Badge
                variant="secondary"
                className="absolute top-2 left-2 text-[10px]"
              >
                {platformLabel || post.platform}
              </Badge>
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white">
                  <ExternalLink className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="p-2.5 sm:p-3 space-y-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {formatCompact(post.views ?? 0)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {formatCompact(post.likes ?? 0)}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {formatCompact(post.comments ?? 0)}
                </span>
              </div>

              {/* Engagement bar */}
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${Math.min(engagement * 10, 100)}%` }}
                />
              </div>

              {/* Posted date */}
              {post.postedAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(post.postedAt).toLocaleDateString(isDE ? 'de-DE' : 'en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
