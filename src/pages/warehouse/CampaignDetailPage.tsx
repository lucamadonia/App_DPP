import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft, Pencil, Trash2, Package, Camera, RotateCcw, Eye,
  FileText, Truck, Tag, Calendar, Target, DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getCampaign, getCampaignStats, deleteCampaign } from '@/services/supabase/wh-campaigns';
import { getSampleShipments } from '@/services/supabase/wh-samples';
import { getContentPosts } from '@/services/supabase/wh-content';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { CAMPAIGN_STATUS_COLORS } from '@/lib/warehouse-constants';
import { SampleStatusBadge } from '@/components/warehouse/SampleStatusBadge';
import { ContentStatusBadge } from '@/components/warehouse/ContentStatusBadge';
import { ContentPostsTable } from '@/components/warehouse/ContentPostsTable';
import type { WhCampaign, CampaignStats, WhShipment, WhContentPost } from '@/types/warehouse';

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  // -- State ------------------------------------------------------------------
  const [campaign, setCampaign] = useState<WhCampaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [shipments, setShipments] = useState<WhShipment[]>([]);
  const [contentPosts, setContentPosts] = useState<WhContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // -- Animated KPIs ----------------------------------------------------------
  const animatedSamples = useAnimatedNumber(stats?.totalSamples ?? 0);
  const animatedContentReceived = useAnimatedNumber(stats?.contentReceived ?? 0);
  const animatedReturnsPending = useAnimatedNumber(stats?.returnsPending ?? 0);
  const animatedViews = useAnimatedNumber(stats?.totalViews ?? 0);

  // -- Load data --------------------------------------------------------------
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, st, sh, cp] = await Promise.all([
        getCampaign(id),
        getCampaignStats(id),
        getSampleShipments({ campaignId: id }),
        getContentPosts({ campaignId: id }),
      ]);
      setCampaign(c);
      setStats(st);
      setShipments(sh);
      setContentPosts(cp);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -- Delete handler ---------------------------------------------------------
  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteCampaign(id);
      toast.success(t('Campaign deleted'));
      navigate('/warehouse/campaigns');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  // -- Loading / Not found ----------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4 text-center py-12">
        <p className="text-muted-foreground">{t('No campaigns yet')}</p>
        <Button variant="outline" asChild>
          <Link to="/warehouse/campaigns">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('Campaigns')}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* -- Header ---------------------------------------------------------- */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild className="mt-1">
          <Link to="/warehouse/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {campaign.name}
          </h1>
          {campaign.description && (
            <p className="text-muted-foreground text-sm truncate">{campaign.description}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={`${CAMPAIGN_STATUS_COLORS[campaign.status] || ''} border-0`}>
            {t(campaign.status)}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/warehouse/campaigns/${id}/edit`}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              {t('Edit Campaign')}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            {t('Delete Campaign')}
          </Button>
        </div>
      </div>

      {/* -- KPI Row --------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Samples')}</p>
              <p className="text-2xl font-bold">{animatedSamples}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
              <Camera className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Content Received')}</p>
              <p className="text-2xl font-bold">{animatedContentReceived}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-orange-100 p-2.5 dark:bg-orange-900/30">
              <RotateCcw className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Returns Pending')}</p>
              <p className="text-2xl font-bold">{animatedReturnsPending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Total Views')}</p>
              <p className="text-2xl font-bold">{animatedViews.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -- Tabs ------------------------------------------------------------- */}
      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">
              <FileText className="mr-1.5 h-4 w-4" />
              {t('Overview')}
            </TabsTrigger>
            <TabsTrigger value="shipments">
              <Truck className="mr-1.5 h-4 w-4" />
              {t('Shipments')}
            </TabsTrigger>
            <TabsTrigger value="content">
              <Camera className="mr-1.5 h-4 w-4" />
              {t('Content Posts')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* -- Tab: Overview -------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card className="transition-shadow hover:shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('Campaign Details')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {campaign.description && (
                <div className="sm:col-span-2 flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('Campaign Description')}</p>
                    <p className="text-sm font-medium whitespace-pre-wrap">{campaign.description}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Start Date')}</p>
                  <p className="text-sm font-medium">
                    {campaign.startDate
                      ? new Date(campaign.startDate).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('End Date')}</p>
                  <p className="text-sm font-medium">
                    {campaign.endDate
                      ? new Date(campaign.endDate).toLocaleDateString()
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Budget')}</p>
                  <p className="text-sm font-medium">
                    {campaign.budget != null
                      ? `${campaign.budget.toLocaleString()} ${campaign.currency}`
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Target className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{t('Goals')}</p>
                  <p className="text-sm font-medium whitespace-pre-wrap">
                    {campaign.goals || '—'}
                  </p>
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground mb-1">{t('Tags')}</p>
                <div className="flex flex-wrap gap-1">
                  {campaign.tags.length > 0 ? (
                    campaign.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="mr-1 h-3 w-3" />
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- Tab: Shipments ------------------------------------------------- */}
        <TabsContent value="shipments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Sample Shipments')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Shipment Number')}</TableHead>
                      <TableHead>{t('Recipient')}</TableHead>
                      <TableHead>{t('Sample Type')}</TableHead>
                      <TableHead>{t('Sample Status')}</TableHead>
                      <TableHead>{t('Content Status')}</TableHead>
                      <TableHead>{t('Date')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shipments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />
                          {t('No shipments yet')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      shipments.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Link
                              to={`/warehouse/shipments/${s.id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              {s.shipmentNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="text-sm">{s.recipientName}</TableCell>
                          <TableCell>
                            {s.sampleMeta?.sampleType && (
                              <Badge variant="outline" className="text-xs">
                                {t(s.sampleMeta.sampleType === 'gift' ? 'Gift' : 'Loan')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {s.sampleMeta?.sampleStatus && (
                              <SampleStatusBadge status={s.sampleMeta.sampleStatus} />
                            )}
                          </TableCell>
                          <TableCell>
                            {s.sampleMeta?.contentStatus && (
                              <ContentStatusBadge status={s.sampleMeta.contentStatus} />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(s.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- Tab: Content --------------------------------------------------- */}
        <TabsContent value="content" className="mt-4">
          <ContentPostsTable
            posts={contentPosts}
            shipmentId=""
            campaignId={id}
            onRefresh={loadData}
          />
        </TabsContent>
      </Tabs>

      {/* -- Delete Confirmation Dialog --------------------------------------- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Campaign')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to delete this campaign?')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('Delete Campaign')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
