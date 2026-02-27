import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Loader2, ArrowDownToLine, ArrowUpFromLine, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  syncShopifyOrders,
  syncInventoryImport,
  syncInventoryExport,
  runFullSync,
} from '@/services/supabase/shopify-integration';
import type { ShopifySyncLog } from '@/types/shopify';
import { useToast } from '@/hooks/use-toast';
import { ShopifySyncLogTable } from './ShopifySyncLogTable';

interface Props {
  logs: ShopifySyncLog[];
  onRefresh: () => void;
}

type SyncAction = 'orders' | 'inv_import' | 'inv_export' | 'full';

export function ShopifySyncDashboard({ logs, onRefresh }: Props) {
  const { t } = useTranslation('warehouse');
  const { toast } = useToast();
  const [running, setRunning] = useState<SyncAction | null>(null);

  // Latest sync per type
  const latestByType: Record<string, ShopifySyncLog | undefined> = {};
  for (const log of logs) {
    const key = `${log.syncType}_${log.direction}`;
    if (!latestByType[key]) latestByType[key] = log;
  }

  async function handleSync(action: SyncAction) {
    setRunning(action);
    try {
      switch (action) {
        case 'orders':
          await syncShopifyOrders();
          break;
        case 'inv_import':
          await syncInventoryImport();
          break;
        case 'inv_export':
          await syncInventoryExport();
          break;
        case 'full':
          await runFullSync();
          break;
      }
      toast({ title: t('Sync completed') });
      onRefresh();
    } catch (err) {
      toast({ title: t('Sync failed'), description: String(err), variant: 'destructive' });
      onRefresh();
    } finally {
      setRunning(null);
    }
  }

  function SyncButton({ action, label, icon: Icon }: { action: SyncAction; label: string; icon: typeof RefreshCw }) {
    const isRunning = running === action;
    const latest = latestByType[
      action === 'orders' ? 'orders_import' :
      action === 'inv_import' ? 'inventory_import' :
      action === 'inv_export' ? 'inventory_export' :
      'full_import'
    ];

    return (
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                {t('Last Sync')}: {latest?.startedAt
                  ? new Date(latest.startedAt).toLocaleString()
                  : t('Never')
                }
              </p>
              {latest && (
                <div className="flex gap-1">
                  <StatusBadge status={latest.status} />
                  {latest.createdCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{latest.createdCount} {t('Created')}</Badge>
                  )}
                  {latest.skippedCount > 0 && (
                    <Badge variant="outline" className="text-xs">{latest.skippedCount} {t('Skipped')}</Badge>
                  )}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSync(action)}
              disabled={running !== null}
            >
              {isRunning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icon className="mr-2 h-4 w-4" />
              )}
              {isRunning ? t('Running...') : t('Sync Now')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sync actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SyncButton action="orders" label={t('Sync Orders')} icon={ArrowDownToLine} />
        <SyncButton action="inv_import" label={t('Sync Inventory (Import)')} icon={ArrowDownToLine} />
        <SyncButton action="inv_export" label={t('Sync Inventory (Export)')} icon={ArrowUpFromLine} />
        <SyncButton action="full" label={t('Full Sync')} icon={Play} />
      </div>

      {/* Sync log table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('Sync Log')}</CardTitle>
              <CardDescription>{t('No sync logs yet').replace('No sync logs yet. Run a sync to see the history.', '')}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ShopifySyncLogTable logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation('warehouse');

  const variants: Record<string, string> = {
    running: 'bg-blue-500/10 text-blue-600 border-blue-200',
    completed: 'bg-green-500/10 text-green-600 border-green-200',
    partial: 'bg-amber-500/10 text-amber-600 border-amber-200',
    failed: 'bg-red-500/10 text-red-600 border-red-200',
  };

  return (
    <Badge className={`text-xs ${variants[status] || ''}`}>
      {t(status)}
    </Badge>
  );
}
