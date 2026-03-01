import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Camera, RotateCcw, AlertTriangle, CheckCircle, Megaphone, Truck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getSampleShipments, getSampleDashboardStats, getOverdueSamples } from '@/services/supabase/wh-samples';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { SampleStatusBadge } from '@/components/warehouse/SampleStatusBadge';
import { ContentStatusBadge } from '@/components/warehouse/ContentStatusBadge';
import type { WhShipment, SampleDashboardStats, SampleStatus } from '@/types/warehouse';

/** Sample statuses that are considered "final" (not shown in active table) */
const FINAL_SAMPLE_STATUSES: SampleStatus[] = ['returned', 'kept'];

export function SampleDashboardPage() {
  const { t } = useTranslation('warehouse');

  // -- State ------------------------------------------------------------------
  const [stats, setStats] = useState<SampleDashboardStats | null>(null);
  const [activeSamples, setActiveSamples] = useState<WhShipment[]>([]);
  const [overdueSamples, setOverdueSamples] = useState<WhShipment[]>([]);
  const [loading, setLoading] = useState(true);

  // -- Animated KPIs ----------------------------------------------------------
  const animatedSamplesOut = useAnimatedNumber(stats?.samplesOut ?? 0);
  const animatedAwaitingContent = useAnimatedNumber(stats?.awaitingContent ?? 0);
  const animatedReturnsPending = useAnimatedNumber(stats?.returnsPending ?? 0);
  const animatedOverdue = useAnimatedNumber(stats?.overdue ?? 0);
  const animatedContentReceived = useAnimatedNumber(stats?.contentReceived ?? 0);
  const animatedCampaigns = useAnimatedNumber(stats?.totalCampaigns ?? 0);

  // -- Load data --------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [st, allSamples, overdue] = await Promise.all([
          getSampleDashboardStats(),
          getSampleShipments(),
          getOverdueSamples(),
        ]);
        if (cancelled) return;
        setStats(st);
        setOverdueSamples(overdue);

        // Filter active samples: exclude final statuses
        const active = allSamples.filter(
          (s) => s.sampleMeta && !FINAL_SAMPLE_STATUSES.includes(s.sampleMeta.sampleStatus)
        );
        setActiveSamples(active);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  /** Calculate days overdue for a given deadline */
  function daysOverdue(deadline: string | undefined): number {
    if (!deadline) return 0;
    const diff = Date.now() - new Date(deadline).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }

  // -- Loading ----------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* -- Header ---------------------------------------------------------- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {t('Sample Dashboard')}
        </h1>
      </div>

      {/* -- KPI Row --------------------------------------------------------- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-blue-100 p-2.5 dark:bg-blue-900/30">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Samples Out')}</p>
              <p className="text-2xl font-bold">{animatedSamplesOut}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-amber-100 p-2.5 dark:bg-amber-900/30">
              <Camera className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Awaiting Content')}</p>
              <p className="text-2xl font-bold">{animatedAwaitingContent}</p>
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
            <div className="rounded-lg bg-red-100 p-2.5 dark:bg-red-900/30">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Overdue')}</p>
              <p className="text-2xl font-bold">{animatedOverdue}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-green-100 p-2.5 dark:bg-green-900/30">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Content Received')}</p>
              <p className="text-2xl font-bold">{animatedContentReceived}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-all duration-200">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900/30">
              <Megaphone className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('Active Campaigns')}</p>
              <p className="text-2xl font-bold">{animatedCampaigns}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* -- Active Samples -------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Active Samples')}</CardTitle>
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
                  <TableHead>{t('Return Deadline')}</TableHead>
                  <TableHead>{t('Content Deadline')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeSamples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />
                      {t('No active samples')}
                    </TableCell>
                  </TableRow>
                ) : (
                  activeSamples.map((s) => (
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
                        {s.sampleMeta?.returnDeadline
                          ? new Date(s.sampleMeta.returnDeadline).toLocaleDateString()
                          : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.sampleMeta?.contentDeadline
                          ? new Date(s.sampleMeta.contentDeadline).toLocaleDateString()
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))
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
                  <TableHead>{t('Recipient')}</TableHead>
                  <TableHead>{t('Sample Status')}</TableHead>
                  <TableHead>{t('Content Status')}</TableHead>
                  <TableHead>{t('Return Deadline')}</TableHead>
                  <TableHead>{t('Content Deadline')}</TableHead>
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
                        <TableCell className="text-sm">{s.recipientName}</TableCell>
                        <TableCell>
                          {meta?.sampleStatus && (
                            <SampleStatusBadge status={meta.sampleStatus} />
                          )}
                        </TableCell>
                        <TableCell>
                          {meta?.contentStatus && (
                            <ContentStatusBadge status={meta.contentStatus} />
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {meta?.returnDeadline ? (
                            <span className={returnDays > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              {new Date(meta.returnDeadline).toLocaleDateString()}
                              {returnDays > 0 && (
                                <span className="ml-1 text-xs">
                                  ({t('Return overdue')})
                                </span>
                              )}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {meta?.contentDeadline ? (
                            <span className={contentDays > 0 ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
                              {new Date(meta.contentDeadline).toLocaleDateString()}
                              {contentDays > 0 && (
                                <span className="ml-1 text-xs">
                                  ({t('Content overdue')})
                                </span>
                              )}
                            </span>
                          ) : '—'}
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
