import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users, Instagram, Youtube, Music2, Twitter, Globe,
  MoreHorizontal, ChevronDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCampaignInfluencers, updateInfluencerStatus } from '@/services/supabase/wh-campaign-influencers';
import {
  CAMPAIGN_INFLUENCER_STATUS_COLORS,
  SOCIAL_PLATFORM_CONFIG,
} from '@/lib/warehouse-constants';
import type { WhCampaignInfluencer, CampaignInfluencerStatus } from '@/types/warehouse';

const PLATFORM_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  youtube: Youtube,
  tiktok: Music2,
  twitter: Twitter,
  other: Globe,
  pinterest: Globe,
};

const STATUS_OPTIONS: CampaignInfluencerStatus[] = [
  'invited', 'accepted', 'negotiating', 'contracted',
  'sample_sent', 'content_pending', 'content_delivered',
  'completed', 'declined', 'cancelled',
];

interface CampaignInfluencerRosterProps {
  campaignId: string;
  className?: string;
}

export function CampaignInfluencerRoster({ campaignId, className = '' }: CampaignInfluencerRosterProps) {
  const { t } = useTranslation('warehouse');
  const [influencers, setInfluencers] = useState<WhCampaignInfluencer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCampaignInfluencers(campaignId);
      setInfluencers(data);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (inf: WhCampaignInfluencer, newStatus: CampaignInfluencerStatus) => {
    try {
      await updateInfluencerStatus(inf.id, newStatus, campaignId);
      toast.success(t('Status updated'));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            {t('Influencer Roster')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4" />
          {t('Influencer Roster')}
          {influencers.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{influencers.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {influencers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm font-medium text-muted-foreground">{t('No influencers assigned')}</p>
            <p className="text-xs text-muted-foreground">{t('Add influencers to this campaign')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead>{t('Platform')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Compensation')}</TableHead>
                  <TableHead className="text-right">{t('Content')}</TableHead>
                  <TableHead className="text-right">{t('Budget')}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {influencers.map((inf) => {
                  const name = inf.contact?.contactName ?? '—';
                  const platform = inf.contact?.primaryPlatform ?? 'other';
                  const PlatformIcon = PLATFORM_ICONS[platform] ?? Globe;
                  const platformConfig = SOCIAL_PLATFORM_CONFIG[platform];
                  const sym = inf.currency === 'EUR' ? '\u20AC' : inf.currency === 'USD' ? '$' : inf.currency;

                  return (
                    <TableRow key={inf.id}>
                      {/* Avatar + Name */}
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-xs font-bold text-white">
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-sm">{name}</span>
                        </div>
                      </TableCell>

                      {/* Platform */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon className={`h-4 w-4 ${platformConfig?.color ?? ''}`} />
                          <span className="text-xs">{platformConfig?.labelEn ?? platform}</span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge className={`${CAMPAIGN_INFLUENCER_STATUS_COLORS[inf.status] || ''} border-0 text-xs`}>
                          {t(inf.status)}
                        </Badge>
                      </TableCell>

                      {/* Compensation */}
                      <TableCell className="text-xs capitalize">
                        {t(inf.compensationType.replace('_', ' '))}
                      </TableCell>

                      {/* Content delivered */}
                      <TableCell className="text-right text-sm">
                        0
                      </TableCell>

                      {/* Budget */}
                      <TableCell className="text-right text-sm">
                        <span className="text-muted-foreground">{sym}{inf.budgetSpent.toLocaleString()}</span>
                        {' / '}
                        <span className="font-medium">{sym}{inf.budgetAllocated.toLocaleString()}</span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {STATUS_OPTIONS.filter((s) => s !== inf.status).map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => handleStatusChange(inf, s)}
                              >
                                <ChevronDown className="mr-2 h-3 w-3" />
                                {t(s)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
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
