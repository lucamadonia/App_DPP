import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Camera, RotateCcw, AlertTriangle, CheckCircle, Megaphone, Truck, CheckSquare, Square,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSampleShipments, getSampleDashboardStats, getOverdueSamples, updateSampleStatus, updateContentStatus } from '@/services/supabase/wh-samples';
import { getContentPosts } from '@/services/supabase/wh-content';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { SampleStatusBadge } from '@/components/warehouse/SampleStatusBadge';
import { ContentStatusBadge } from '@/components/warehouse/ContentStatusBadge';
import type { WhShipment, SampleDashboardStats, SampleStatus, WhContentPost } from '@/types/warehouse';

/** Sample statuses that are considered "final" (not shown in active table) */
const FINAL_SAMPLE_STATUSES: SampleStatus[] = ['returned', 'kept'];

function DeadlineCountdownBadge({ deadline }: { deadline: string | undefined }) {
  const { t } = useTranslation('warehouse');
  if (!deadline) return <span className="text-muted-foreground">—</span>;

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return (
      <Badge variant="destructive" className="text-xs">
        {Math.abs(days)}d {t('overdue')}
      </Badge>
    );
  }
  if (days <= 3) {
    return (
      <Badge className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        {days}d {t('days left')}
      </Badge>
    );
  }
  if (days <= 7) {
    return (
      <Badge className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
        {days}d {t('days left')}
      </Badge>
    );
  }
  return (
    <span className="text-sm text-muted-foreground">
      {dl.toLocaleDateString()}
    </span>
  );
}

export function SampleDashboardPage() {
  const { t } = useTranslation('warehouse');

  // -- State ------------------------------------------------------------------
  const [stats, setStats] = useState<SampleDashboardStats | null>(null);
  const [activeSamples, setActiveSamples] = useState<WhShipment[]>([]);
  const [overdueSamples, setOverdueSamples] = useState<WhShipment[]>([]);
  const [contentPosts, setContentPosts] = useState<WhContentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // -- Animated KPIs ----------------------------------------------------------
  const animatedSamplesOut = useAnimatedNumber(stats?.samplesOut ?? 0);
  const animatedAwaitingContent = useAnimatedNumber(stats?.awaitingContent ?? 0);
  const animatedReturnsPending = useAnimatedNumber(stats?.returnsPending ?? 0);
  const animatedOverdue = useAnimatedNumber(stats?.overdue ?? 0);
  const animatedContentReceived = useAnimatedNumber(stats?.contentReceived ?? 0);
  const animatedCampaigns = useAnimatedNumber(stats?.totalCampaigns ?? 0);

  // -- Load data --------------------------------------------------------------
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [st, allSamples, overdue, posts] = await Promise.all([
        getSampleDashboardStats(),
        getSampleShipments(),
        getOverdueSamples(),
        getContentPosts(),
      ]);
      setStats(st);
      setOverdueSamples(overdue);
      setContentPosts(posts);

      // Filter active samples: exclude final statuses
      const active = allSamples.filter(
        (s) => s.sampleMeta && !FINAL_SAMPLE_STATUSES.includes(s.sampleMeta.sampleStatus)
      );
      setActiveSamples(active);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /** Calculate days overdue for a given deadline */
  function daysOverdue(deadline: string | undefined): number {
    if (!deadline) return 0;
    const diff = Date.now() - new Date(deadline).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  // -- Bulk selection helpers --------------------------------------------------
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === activeSamples.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(activeSamples.map(s => s.id)));
    }
  };

  const handleBulkStatusUpdate = async (status: SampleStatus) => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => updateSampleStatus(id, status))
      );
      setSelectedIds(new Set());
      await load();
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleBulkContentUpdate = async (status: 'received' | 'verified') => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => updateContentStatus(id, status))
      );
      setSelectedIds(new Set());
      await load();
    } finally {
      setBulkUpdating(false);
    }
  };

  // Find content post linked to a shipment
  const getContentLink = (shipmentId: string) => {
    return contentPosts.find(p => p.shipmentId === shipmentId);
  };

  // -- Loading ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* -- Header ---------------------------------------------------------- */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {t('Sample Dashboard')}
        </h1>
      </div>

      {/* -- KPI Row --------------------------------------------------------- */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:pt-6 sm:px-6">
            <div className="rounded-lg bg-blue-100 p-2 sm:p-2.5 dark:bg-blue-900/30">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">{t('Samples Out')}</p>
              <p className="text-lg sm:text-2xl font-bold">{animatedSamplesOut}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:pt-6 sm:px-6">
            <div className="rounded-lg bg-amber-100 p-2 sm:p-2.5 dark:bg-amber-900/30">
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">{t('Awaiting Content')}</p>
              <p className="text-lg sm:text-2xl font-bold">{animatedAwaitingContent}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:pt-6 sm:px-6">
            <div className="rounded-lg bg-orange-100 p-2 sm:p-2.5 dark:bg-orange-900/30">
              <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">{t('Returns Pending')}</p>
              <p className="text-lg sm:text-2xl font-bold">{animatedReturnsPending}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:pt-6 sm:px-6">
            <div className="rounded-lg bg-red-100 p-2 sm:p-2.5 dark:bg-red-900/30">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">{t('Overdue')}</p>
              <p className="text-lg sm:text-2xl font-bold">{animatedOverdue}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:pt-6 sm:px-6">
            <div className="rounded-lg bg-green-100 p-2 sm:p-2.5 dark:bg-green-900/30">
              <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">{t('Content Received')}</p>
              <p className="text-lg sm:text-2xl font-bold">{animatedContentReceived}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-2 sm:gap-3 p-3 sm:pt-6 sm:px-6">
            <div className="rounded-lg bg-purple-100 p-2 sm:p-2.5 dark:bg-purple-900/30">
              <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">{t('Active Campaigns')}</p>
              <p className="text-lg sm:text-2xl font-bold">{animatedCampaigns}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -- Active Samples with Bulk Actions -------------------------------- */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base">{t('Active Samples')}</CardTitle>
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground">
                {selectedIds.size} {t('selected')}
              </span>
              <Select
                onValueChange={(v) => handleBulkStatusUpdate(v as SampleStatus)}
                disabled={bulkUpdating}
              >
                <SelectTrigger className="h-8 w-[150px] sm:w-[180px] text-xs">
                  <SelectValue placeholder={t('Bulk Update Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="awaiting_content">{t('awaiting_content')}</SelectItem>
                  <SelectItem value="content_received">{t('content_received')}</SelectItem>
                  <SelectItem value="return_pending">{t('return_pending')}</SelectItem>
                  <SelectItem value="returned">{t('returned')}</SelectItem>
                  <SelectItem value="kept">{t('kept')}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => handleBulkContentUpdate('received')}
                disabled={bulkUpdating}
              >
                {t('Mark Content Received')}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <button onClick={toggleSelectAll} className="p-1 hover:bg-muted rounded">
                      {selectedIds.size === activeSamples.length && activeSamples.length > 0
                        ? <CheckSquare className="h-4 w-4" />
                        : <Square className="h-4 w-4 text-muted-foreground" />
                      }
                    </button>
                  </TableHead>
                  <TableHead>{t('Shipment Number')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('Recipient')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('Sample Type')}</TableHead>
                  <TableHead>{t('Sample Status')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Content Status')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Return Deadline')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('Content Deadline')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('Content')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSamples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      {t('No active samples')}
                    </TableCell>
                  </TableRow>
                ) : (
                  activeSamples.map((s) => {
                    const contentPost = getContentLink(s.id);
                    return (
                      <TableRow key={s.id} className={selectedIds.has(s.id) ? 'bg-primary/5' : ''}>
                        <TableCell>
                          <button onClick={() => toggleSelect(s.id)} className="p-1 hover:bg-muted rounded">
                            {selectedIds.has(s.id)
                              ? <CheckSquare className="h-4 w-4 text-primary" />
                              : <Square className="h-4 w-4 text-muted-foreground" />
                            }
                          </button>
                        </TableCell>
                        <TableCell>
                          <Link
                            to={`/warehouse/shipments/${s.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {s.shipmentNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{s.recipientName}</TableCell>
                        <TableCell className="hidden lg:table-cell">
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
                        <TableCell className="hidden md:table-cell">
                          <DeadlineCountdownBadge deadline={s.sampleMeta?.returnDeadline} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <DeadlineCountdownBadge deadline={s.sampleMeta?.contentDeadline} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {contentPost ? (
                            <a
                              href={contentPost.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline truncate max-w-[120px] block"
                            >
                              {contentPost.platform}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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

      {/* -- Overdue Samples ------------------------------------------------- */}
      <Card className="border-red-200 dark:border-red-900/40">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            {t('Overdue Samples')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Shipment Number')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('Recipient')}</TableHead>
                  <TableHead>{t('Sample Status')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Content Status')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Return Deadline')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('Content Deadline')}</TableHead>
                  <TableHead className="text-right">{t('Overdue')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueSamples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-50 text-green-500" />
                      {t('No overdue samples')}
                    </TableCell>
                  </TableRow>
                ) : (
                  overdueSamples.map((s) => {
                    const meta = s.sampleMeta;
                    const returnDays = daysOverdue(meta?.returnDeadline);
                    const contentDays = daysOverdue(meta?.contentDeadline);
                    const maxOverdue = Math.max(returnDays, contentDays);

                    return (
                      <TableRow key={s.id} className="bg-red-50/50 dark:bg-red-950/10">
                        <TableCell>
                          <Link
                            to={`/warehouse/shipments/${s.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {s.shipmentNumber}
                          </Link>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{s.recipientName}</TableCell>
                        <TableCell>
                          {meta?.sampleStatus && (
                            <SampleStatusBadge status={meta.sampleStatus} />
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {meta?.contentStatus && (
                            <ContentStatusBadge status={meta.contentStatus} />
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <DeadlineCountdownBadge deadline={meta?.returnDeadline} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <DeadlineCountdownBadge deadline={meta?.contentDeadline} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="destructive" className="text-xs">
                            {maxOverdue} {t('days overdue')}
                          </Badge>
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
    </div>
  );
}
