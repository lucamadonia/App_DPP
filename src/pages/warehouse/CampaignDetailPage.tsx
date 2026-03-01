import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft, Pencil, Trash2, Package, Camera, RotateCcw, Eye,
  FileText, Truck, Tag, Calendar, Target, DollarSign,
  Heart, Clock, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getCampaign, getCampaignStats, deleteCampaign } from '@/services/supabase/wh-campaigns';
import { getSampleShipments } from '@/services/supabase/wh-samples';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { SampleStatusBadge } from '@/components/warehouse/SampleStatusBadge';
import { ContentStatusBadge } from '@/components/warehouse/ContentStatusBadge';
import { CampaignStatusPipeline } from '@/components/warehouse/influencer/CampaignStatusPipeline';
import { BudgetTrackingWidget } from '@/components/warehouse/influencer/BudgetTrackingWidget';
import { CampaignInfluencerRoster } from '@/components/warehouse/influencer/CampaignInfluencerRoster';
import { CampaignTimeline } from '@/components/warehouse/influencer/CampaignTimeline';
import { ContentGalleryGrid } from '@/components/warehouse/influencer/ContentGalleryGrid';
import type { WhCampaign, CampaignStats, WhShipment } from '@/types/warehouse';

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  // -- State ------------------------------------------------------------------
  const [campaign, setCampaign] = useState<WhCampaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [shipments, setShipments] = useState<WhShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // -- Animated KPIs ----------------------------------------------------------
  const animatedSamples = useAnimatedNumber(stats?.totalSamples ?? 0);
  const animatedContentReceived = useAnimatedNumber(stats?.contentReceived ?? 0);
  const animatedContentPending = useAnimatedNumber(stats?.contentPending ?? 0);
  const animatedReturnsPending = useAnimatedNumber(stats?.returnsPending ?? 0);
  const animatedViews = useAnimatedNumber(stats?.totalViews ?? 0);
  const animatedEngagement = useAnimatedNumber(stats?.totalEngagement ?? 0);
  const kpiVisible = useStaggeredList(6);

  // -- Load data --------------------------------------------------------------
  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, st, sh] = await Promise.all([
        getCampaign(id),
        getCampaignStats(id),
        getSampleShipments({ campaignId: id }),
      ]);
      setCampaign(c);
      setStats(st);
      setShipments(sh);
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

  // -- Loading ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-xl bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5 px-4 py-4 sm:px-6 sm:py-5">
          <Skeleton className="h-7 sm:h-8 w-48 sm:w-64 mb-2" />
          <Skeleton className="h-4 w-64 sm:w-96" />
          <div className="mt-4">
            <Skeleton className="h-10 w-full max-w-lg" />
          </div>
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 sm:h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 sm:h-96 rounded-lg" />
      </div>
    );
  }

  // -- Not found --------------------------------------------------------------
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

  // -- KPI data ---------------------------------------------------------------
  const kpiCards = [
    { label: 'Samples', value: animatedSamples, icon: Package, color: 'blue' },
    { label: 'Content Received', value: animatedContentReceived, icon: Camera, color: 'green' },
    { label: 'Content Pending', value: animatedContentPending, icon: Clock, color: 'amber' },
    { label: 'Returns Pending', value: animatedReturnsPending, icon: RotateCcw, color: 'orange' },
    { label: 'Total Views', value: animatedViews, icon: Eye, color: 'purple', format: true },
    { label: 'Total Engagement', value: animatedEngagement, icon: Heart, color: 'pink', format: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* -- Premium Header ---------------------------------------------------- */}
      <div className="rounded-xl bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-blue-500/5 px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" asChild className="mt-1 flex-shrink-0 hidden sm:flex">
            <Link to="/warehouse/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-2 sm:hidden">
            <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
              <Link to="/warehouse/campaigns">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold tracking-tight truncate">
              {campaign.name}
            </h1>
          </div>
          <div className="flex-1 min-w-0 hidden sm:block">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {campaign.name}
            </h1>
            {campaign.description && (
              <p className="text-muted-foreground text-sm mt-0.5 truncate">{campaign.description}</p>
            )}
          </div>
          {campaign.description && (
            <p className="text-muted-foreground text-xs sm:hidden truncate">{campaign.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/warehouse/campaigns/${id}/edit`}>
                <Pencil className="mr-1.5 sm:mr-2 h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('Edit Campaign')}</span>
                <span className="sm:hidden">{t('Edit', { ns: 'common' })}</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1.5 sm:mr-2 h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Delete Campaign')}</span>
              <span className="sm:hidden">{t('Delete', { ns: 'common' })}</span>
            </Button>
          </div>
        </div>

        {/* Pipeline */}
        <div className="mt-5">
          <CampaignStatusPipeline currentStatus={campaign.status} />
        </div>
      </div>

      {/* -- KPI Row ----------------------------------------------------------- */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={kpi.label}
              className={`transition-all duration-500 hover:-translate-y-0.5 hover:shadow-md ${
                kpiVisible[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:pt-6 sm:px-6 sm:pb-6">
                <div className={`rounded-lg bg-${kpi.color}-100 p-2 sm:p-2.5 dark:bg-${kpi.color}-900/30`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${kpi.color}-600`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{t(kpi.label)}</p>
                  <p className="text-xl sm:text-2xl font-bold">
                    {kpi.format ? kpi.value.toLocaleString() : kpi.value}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* -- Tabs --------------------------------------------------------------- */}
      <Tabs defaultValue="overview">
        <div className="overflow-x-auto">
          <TabsList>
            <TabsTrigger value="overview">
              <FileText className="mr-1.5 h-4 w-4" />
              {t('Overview')}
            </TabsTrigger>
            <TabsTrigger value="roster">
              <Users className="mr-1.5 h-4 w-4" />
              {t('Influencer Roster')}
            </TabsTrigger>
            <TabsTrigger value="content">
              <Camera className="mr-1.5 h-4 w-4" />
              {t('Content Gallery')}
            </TabsTrigger>
            <TabsTrigger value="shipments">
              <Truck className="mr-1.5 h-4 w-4" />
              {t('Shipments')}
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <Clock className="mr-1.5 h-4 w-4" />
              {t('Timeline')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* -- Tab: Overview ---------------------------------------------------- */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Campaign details card */}
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
                        : '\u2014'}
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
                        : '\u2014'}
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
                        : '\u2014'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Target className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('Goals')}</p>
                    <p className="text-sm font-medium whitespace-pre-wrap">
                      {campaign.goals || '\u2014'}
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
                      <span className="text-sm text-muted-foreground">{'\u2014'}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Budget widget */}
            <BudgetTrackingWidget
              budget={campaign.budget}
              budgetSpent={campaign.budgetSpent}
              currency={campaign.currency}
            />
          </div>
        </TabsContent>

        {/* -- Tab: Influencer Roster ------------------------------------------- */}
        <TabsContent value="roster" className="mt-4">
          {id && <CampaignInfluencerRoster campaignId={id} />}
        </TabsContent>

        {/* -- Tab: Content Gallery --------------------------------------------- */}
        <TabsContent value="content" className="mt-4">
          {id && <ContentGalleryGrid campaignId={id} />}
        </TabsContent>

        {/* -- Tab: Shipments --------------------------------------------------- */}
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
                      <TableHead className="hidden sm:table-cell">{t('Sample Type')}</TableHead>
                      <TableHead>{t('Sample Status')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('Content Status')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('Date')}</TableHead>
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
                          <TableCell className="hidden sm:table-cell">
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
                          <TableCell className="hidden md:table-cell">
                            {s.sampleMeta?.contentStatus && (
                              <ContentStatusBadge status={s.sampleMeta.contentStatus} />
                            )}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
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

        {/* -- Tab: Timeline ---------------------------------------------------- */}
        <TabsContent value="timeline" className="mt-4">
          {id && <CampaignTimeline campaignId={id} />}
        </TabsContent>
      </Tabs>

      {/* -- Delete Confirmation Dialog ----------------------------------------- */}
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
