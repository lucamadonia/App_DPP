import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
                  <TableHead className="w-10">{t('Platform')}</TableHead>
                  <TableHead>{t('Post')}</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">{t('Views')}</TableHead>
                  <TableHead className="hidden md:table-cell text-right">{t('Likes')}</TableHead>
                  <TableHead className="hidden md:table-cell text-right">{t('Comments')}</TableHead>
                  <TableHead className="text-right">{t('Total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => {
                  const cfg = SOCIAL_PLATFORM_CONFIG[post.platform];
                  const PIcon = cfg ? PLATFORM_ICONS[cfg.icon] || Globe : Globe;
                  const total = (post.views ?? 0) + (post.likes ?? 0) + (post.comments ?? 0);

                  return (
                    <TableRow key={post.id}>
                      <TableCell>
                        <PIcon className={`h-4 w-4 ${cfg?.color || 'text-gray-500'}`} />
                      </TableCell>
                      <TableCell>
                        <a
                          href={post.postUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate max-w-[100px] sm:max-w-[140px]"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{post.postUrl.replace(/^https?:\/\//, '').slice(0, 30)}</span>
                        </a>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-right text-xs">{formatCompact(post.views ?? 0)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right text-xs">{formatCompact(post.likes ?? 0)}</TableCell>
                      <TableCell className="hidden md:table-cell text-right text-xs">{formatCompact(post.comments ?? 0)}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{formatCompact(total)}</TableCell>
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
