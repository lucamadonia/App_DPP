import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';
import { ExternalLink, FileText } from 'lucide-react';
import { Instagram, Music2, Youtube, Twitter, Pin, Globe } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getContentPosts } from '@/services/supabase/wh-content';
import { SOCIAL_PLATFORM_CONFIG } from '@/lib/warehouse-constants';
import type { WhContentPost } from '@/types/warehouse';

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

interface TopContentTableProps {
  className?: string;
}

export function TopContentTable({ className }: TopContentTableProps) {
  const { t } = useTranslation('warehouse');
  const [posts, setPosts] = useState<WhContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getContentPosts()
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) =>
            ((b.views ?? 0) + (b.likes ?? 0) + (b.comments ?? 0)) -
            ((a.views ?? 0) + (a.likes ?? 0) + (a.comments ?? 0))
        );
        setPosts(sorted.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  const platformIcon = (post: WhContentPost) => {
    const cfg = SOCIAL_PLATFORM_CONFIG[post.platform];
    const PIcon = cfg ? PLATFORM_ICONS[cfg.icon] || Globe : Globe;
    return <PIcon className={`h-4 w-4 ${cfg?.color || 'text-gray-500'}`} />;
  };

  const postLink = (post: WhContentPost) => (
    <a
      href={post.postUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[100px] sm:max-w-[140px]"
    >
      <ExternalLink className="h-3 w-3 shrink-0" />
      <span className="truncate">{post.postUrl.replace(/^https?:\/\//, '').slice(0, 30)}</span>
    </a>
  );

  const columns: ResponsiveTableColumn<WhContentPost>[] = [
    {
      id: 'platform',
      header: t('Platform'),
      className: 'w-10',
      cell: platformIcon,
    },
    {
      id: 'post',
      header: t('Post'),
      mobilePriority: 'title',
      cell: postLink,
    },
    {
      id: 'views',
      header: t('Views'),
      className: 'text-right text-xs',
      hideBelow: 'sm',
      mobilePriority: 'meta',
      mobileLabel: t('Views'),
      cell: post => formatCompact(post.views ?? 0),
    },
    {
      id: 'likes',
      header: t('Likes'),
      className: 'text-right text-xs',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Likes'),
      cell: post => formatCompact(post.likes ?? 0),
    },
    {
      id: 'comments',
      header: t('Comments'),
      className: 'text-right text-xs',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Comments'),
      cell: post => formatCompact(post.comments ?? 0),
    },
    {
      id: 'total',
      header: t('Total'),
      className: 'text-right text-xs font-medium',
      mobilePriority: 'meta',
      mobileLabel: t('Total'),
      cell: post => formatCompact((post.views ?? 0) + (post.likes ?? 0) + (post.comments ?? 0)),
    },
  ];

  if (!loading && posts.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="px-3 sm:px-6 pb-2">
          <CardTitle className="text-sm sm:text-base">{t('Top Performing Content')}</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          <div className="flex flex-col items-center justify-center py-6 sm:py-8 text-muted-foreground">
            <FileText className="h-8 w-8 sm:h-10 sm:w-10 mb-2 opacity-40" />
            <p className="text-sm">{t('No content posts found')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="px-3 sm:px-6 pb-2">
        <CardTitle className="text-sm sm:text-base">{t('Top Performing Content')}</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <ResponsiveTable
          data={posts}
          columns={columns}
          rowKey={post => post.id}
          loading={loading}
          loadingRows={5}
          mobileCardTitle={post => (
            <span className="flex items-center gap-1.5">
              {platformIcon(post)}
              {postLink(post)}
            </span>
          )}
        />
      </CardContent>
    </Card>
  );
}
