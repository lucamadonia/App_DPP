import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Megaphone, Search, Trash2, Calendar, Tag, List, LayoutGrid } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';
import { getCampaigns, deleteCampaign, updateCampaign } from '@/services/supabase/wh-campaigns';
import { CAMPAIGN_STATUS_COLORS } from '@/lib/warehouse-constants';
import { CampaignKanbanBoard } from '@/components/warehouse/influencer/CampaignKanbanBoard';
import { CampaignCalendarView } from '@/components/warehouse/influencer/CampaignCalendarView';
import type { WhCampaign, CampaignStatus } from '@/types/warehouse';

type StatusTab = 'all' | CampaignStatus;
type ViewMode = 'list' | 'board' | 'calendar';

export function CampaignListPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<WhCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const load = async () => {
    try {
      const data = await getCampaigns({
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setCampaigns(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(t('Are you sure you want to delete this campaign?'))) return;
    try {
      await deleteCampaign(id);
      toast.success(t('Campaign deleted'));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleStatusChange = async (id: string, status: CampaignStatus) => {
    try {
      await updateCampaign(id, { status });
      toast.success(t('Status updated'));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatBudget = (budget?: number, currency?: string) => {
    if (budget == null) return '—';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(budget);
  };

  // Real table on md+, stacked cards below — the raw <Table> forced pinch-zoom
  // scrolling on a phone.
  const columns: ResponsiveTableColumn<WhCampaign>[] = [
    {
      id: 'name',
      header: t('Name'),
      mobilePriority: 'title',
      cell: (campaign) => (
        <span className="font-medium block max-w-[180px] sm:max-w-none truncate">{campaign.name}</span>
      ),
    },
    {
      id: 'status',
      header: t('Status'),
      mobilePriority: 'badge',
      cell: (campaign) => (
        <Badge className={`${CAMPAIGN_STATUS_COLORS[campaign.status]} border-0`}>
          {t(campaign.status)}
        </Badge>
      ),
    },
    {
      id: 'products',
      header: t('Products'),
      hideBelow: 'sm',
      className: 'text-right',
      mobilePriority: 'meta',
      mobileLabel: t('Products'),
      cell: (campaign) => <span className="font-mono text-sm">{campaign.productIds.length}</span>,
    },
    {
      id: 'budget',
      header: t('Budget'),
      hideBelow: 'sm',
      className: 'text-right',
      mobilePriority: 'meta',
      mobileLabel: t('Budget'),
      cell: (campaign) => (
        <span className="text-sm">{formatBudget(campaign.budget, campaign.currency)}</span>
      ),
    },
    {
      id: 'startDate',
      header: t('Start Date'),
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Start Date'),
      cell: (campaign) =>
        campaign.startDate ? (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(campaign.startDate)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      id: 'endDate',
      header: t('End Date'),
      hideBelow: 'lg',
      cell: (campaign) => (
        <span className="text-sm text-muted-foreground">{formatDate(campaign.endDate)}</span>
      ),
    },
    {
      id: 'tags',
      header: t('Tags'),
      hideBelow: 'lg',
      cell: (campaign) =>
        campaign.tags.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {campaign.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                <Tag className="mr-0.5 h-2.5 w-2.5" />
                {tag}
              </Badge>
            ))}
            {campaign.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                +{campaign.tags.length - 3}
              </Badge>
            )}
          </span>
        ) : (
          '—'
        ),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-12 sm:w-16',
      mobilePriority: 'meta',
      cell: (campaign) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => handleDelete(campaign.id, e)}
          className="text-destructive"
          title={t('Delete Campaign')}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      ),
    },
  ];

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: 'all', label: t('All') },
    { key: 'draft', label: t('draft') },
    { key: 'active', label: t('active') },
    { key: 'completed', label: t('completed') },
    { key: 'cancelled', label: t('cancelled') },
  ];

  const viewModes: { key: ViewMode; icon: typeof List; label: string }[] = [
    { key: 'list', icon: List, label: t('List') },
    { key: 'board', icon: LayoutGrid, label: t('Board') },
    { key: 'calendar', icon: Calendar, label: t('Calendar') },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {t('Campaigns')}
        </h1>
        <Button onClick={() => navigate('/warehouse/campaigns/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Create Campaign')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('Search campaigns...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {statusTabs.map((tab) => (
          <Button
            key={tab.key}
            variant={statusFilter === tab.key ? 'default' : 'ghost'}
            size="sm"
            className={statusFilter !== tab.key ? 'hover:bg-muted transition-colors' : ''}
            onClick={() => setStatusFilter(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1">
        {viewModes.map(({ key, icon: Icon, label }) => (
          <Button
            key={key}
            variant="ghost"
            size="sm"
            title={label}
            className={viewMode === key ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted'}
            onClick={() => setViewMode(key)}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'board' ? (
        <CampaignKanbanBoard
          campaigns={campaigns}
          onStatusChange={handleStatusChange}
        />
      ) : viewMode === 'calendar' ? (
        <CampaignCalendarView campaigns={campaigns} />
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <ResponsiveTable
              data={campaigns}
              columns={columns}
              rowKey={(campaign) => campaign.id}
              onRowClick={(campaign) => navigate(`/warehouse/campaigns/${campaign.id}`)}
              loading={loading}
              loadingRows={6}
              className="border-0 bg-transparent rounded-none"
              emptyState={
                <div className="text-muted-foreground">
                  <Megaphone className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>{t('No campaigns yet')}</p>
                  <p className="text-xs mt-1">
                    {t('Create your first campaign to start tracking influencer collaborations')}
                  </p>
                </div>
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
