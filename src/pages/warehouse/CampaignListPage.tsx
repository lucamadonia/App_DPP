import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Megaphone, Search, Trash2, Calendar, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getCampaigns, deleteCampaign } from '@/services/supabase/wh-campaigns';
import { CAMPAIGN_STATUS_COLORS } from '@/lib/warehouse-constants';
import type { WhCampaign, CampaignStatus } from '@/types/warehouse';

type StatusTab = 'all' | CampaignStatus;

export function CampaignListPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<WhCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');

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

  const statusTabs: { key: StatusTab; label: string }[] = [
    { key: 'all', label: t('All') },
    { key: 'draft', label: t('draft') },
    { key: 'active', label: t('active') },
    { key: 'completed', label: t('completed') },
    { key: 'cancelled', label: t('cancelled') },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
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

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead className="text-right">{t('Products')}</TableHead>
                  <TableHead className="text-right">{t('Budget')}</TableHead>
                  <TableHead>{t('Start Date')}</TableHead>
                  <TableHead>{t('End Date')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Tags')}</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      {t('Loading...', { ns: 'common' })}
                    </TableCell>
                  </TableRow>
                ) : campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                      <Megaphone className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      <p>{t('No campaigns yet')}</p>
                      <p className="text-xs mt-1">{t('Create your first campaign to start tracking influencer collaborations')}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => (
                    <TableRow
                      key={campaign.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors duration-150"
                      onClick={() => navigate(`/warehouse/campaigns/${campaign.id}`)}
                    >
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <Badge className={`${CAMPAIGN_STATUS_COLORS[campaign.status]} border-0`}>
                          {t(campaign.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {campaign.productIds.length}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatBudget(campaign.budget, campaign.currency)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {campaign.startDate ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(campaign.startDate)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(campaign.endDate)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {campaign.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
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
                          </div>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(campaign.id, e)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
