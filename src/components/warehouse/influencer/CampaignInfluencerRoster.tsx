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
  ResponsiveTable, type ResponsiveTableColumn,
} from '@/components/ui/responsive-table';
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

  const influencerName = (inf: WhCampaignInfluencer) => inf.contact?.contactName ?? '—';

  const currencySymbol = (inf: WhCampaignInfluencer) =>
    (inf.currency === 'EUR' ? '€' : inf.currency === 'USD' ? '$' : inf.currency);

  const columns: ResponsiveTableColumn<WhCampaignInfluencer>[] = [
    {
      id: 'name',
      header: t('Name'),
      mobilePriority: 'title',
      cell: (inf) => {
        const name = influencerName(inf);
        return (
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-xs font-bold text-white">
              {name.charAt(0).toUpperCase()}
            </div>
            <span className="font-medium text-sm">{name}</span>
          </div>
        );
      },
    },
    {
      id: 'platform',
      header: t('Platform'),
      hideBelow: 'sm',
      mobilePriority: 'subtitle',
      cell: (inf) => {
        const platform = inf.contact?.primaryPlatform ?? 'other';
        const PlatformIcon = PLATFORM_ICONS[platform] ?? Globe;
        const platformConfig = SOCIAL_PLATFORM_CONFIG[platform];
        return (
          <div className="flex items-center gap-1.5">
            <PlatformIcon className={`h-4 w-4 ${platformConfig?.color ?? ''}`} />
            <span className="text-xs">{platformConfig?.labelEn ?? platform}</span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: t('Status'),
      mobilePriority: 'badge',
      cell: (inf) => (
        <Badge className={`${CAMPAIGN_INFLUENCER_STATUS_COLORS[inf.status] || ''} border-0 text-xs`}>
          {t(inf.status)}
        </Badge>
      ),
    },
    {
      id: 'compensation',
      header: t('Compensation'),
      className: 'text-xs capitalize',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Compensation'),
      cell: (inf) => t(inf.compensationType.replace('_', ' ')),
    },
    {
      id: 'content',
      header: t('Content'),
      className: 'text-right text-sm',
      hideBelow: 'lg',
      mobilePriority: 'meta',
      mobileLabel: t('Content'),
      cell: () => 0,
    },
    {
      id: 'budget',
      header: t('Budget'),
      className: 'text-right text-sm',
      mobilePriority: 'meta',
      mobileLabel: t('Budget'),
      cell: (inf) => {
        const sym = currencySymbol(inf);
        return (
          <>
            <span className="text-muted-foreground">{sym}{inf.budgetSpent.toLocaleString()}</span>
            {' / '}
            <span className="font-medium">{sym}{inf.budgetAllocated.toLocaleString()}</span>
          </>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      mobilePriority: 'meta',
      cell: (inf) => (
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
      ),
    },
  ];

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="px-3 sm:px-6">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            {t('Influencer Roster')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
          <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          {t('Influencer Roster')}
          {influencers.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">{influencers.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveTable
          data={influencers}
          columns={columns}
          rowKey={(inf) => inf.id}
          emptyState={
            <div className="flex flex-col items-center gap-2 text-center">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">{t('No influencers assigned')}</p>
              <p className="text-xs text-muted-foreground">{t('Add influencers to this campaign')}</p>
            </div>
          }
        />
      </CardContent>
    </Card>
  );
}
