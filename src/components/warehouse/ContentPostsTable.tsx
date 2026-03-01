import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, ExternalLink, Eye, Heart, MessageCircle,
  Instagram, Youtube, Music2, Globe, Twitter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ContentPostForm } from './ContentPostForm';
import { deleteContentPost } from '@/services/supabase/wh-content';
import { SOCIAL_PLATFORM_CONFIG } from '@/lib/warehouse-constants';
import type { WhContentPost } from '@/types/warehouse';

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  twitter: Twitter,
  other: Globe,
  pinterest: Globe,
};

interface ContentPostsTableProps {
  posts: WhContentPost[];
  shipmentId: string;
  campaignId?: string;
  contactId?: string;
  onRefresh: () => void;
}

function formatNumber(n: number | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function ContentPostsTable({ posts, shipmentId, campaignId, contactId, onRefresh }: ContentPostsTableProps) {
  const { t } = useTranslation('warehouse');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<WhContentPost | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm(t('Are you sure?', { ns: 'common' }))) return;
    try {
      await deleteContentPost(id);
      toast.success(t('Content post deleted'));
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t('Content Posts')}</CardTitle>
          <Button
            size="sm"
            onClick={() => { setEditing(null); setFormOpen(true); }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('Add Content Post')}
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Primary Platform')}</TableHead>
                  <TableHead>{t('Post URL')}</TableHead>
                  <TableHead>{t('Posted At')}</TableHead>
                  <TableHead className="text-right">{t('Views')}</TableHead>
                  <TableHead className="text-right">{t('Likes')}</TableHead>
                  <TableHead className="text-right">{t('Comments')}</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                      {t('No content posts yet')}
                    </TableCell>
                  </TableRow>
                ) : (
                  posts.map((post) => {
                    const PlatformIcon = PLATFORM_ICONS[post.platform] || Globe;
                    const platformCfg = SOCIAL_PLATFORM_CONFIG[post.platform];
                    return (
                      <TableRow key={post.id}>
                        <TableCell>
                          <Badge variant="outline" className="gap-1.5">
                            <PlatformIcon className={`h-3 w-3 ${platformCfg?.color || ''}`} />
                            {platformCfg?.labelEn || post.platform}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <a
                            href={post.postUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 text-sm max-w-[200px] truncate"
                          >
                            {post.postUrl.replace(/^https?:\/\//, '').slice(0, 40)}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {post.postedAt ? new Date(post.postedAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Eye className="h-3 w-3 text-muted-foreground" />
                            {formatNumber(post.views)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1 text-sm">
                            <Heart className="h-3 w-3 text-pink-400" />
                            {formatNumber(post.likes)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex items-center gap-1 text-sm">
                            <MessageCircle className="h-3 w-3 text-blue-400" />
                            {formatNumber(post.comments)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setEditing(post); setFormOpen(true); }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDelete(post.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ContentPostForm
        open={formOpen}
        onOpenChange={setFormOpen}
        shipmentId={shipmentId}
        campaignId={campaignId}
        contactId={contactId}
        editing={editing}
        onSaved={onRefresh}
      />
    </>
  );
}
