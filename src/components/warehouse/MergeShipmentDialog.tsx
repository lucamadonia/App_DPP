import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Merge, Package, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { getMergeCandidates, mergeShipments } from '@/services/supabase/wh-shipments';
import type { WhShipment } from '@/types/warehouse';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The current shipment whose items will be moved INTO the chosen target. */
  source: WhShipment;
  /** Called after a successful merge with the target shipment so the parent
   * can either navigate to the target or refresh state. */
  onMerged: (target: WhShipment) => void;
}

/**
 * Lets the user fold the current shipment into another open shipment (typical
 * case: a customer placed a second order before the first one shipped). The
 * candidate list is ranked: same recipient email first, then same name, then
 * any other open shipment. Source becomes `cancelled` with an audit note.
 */
export function MergeShipmentDialog({ open, onOpenChange, source, onMerged }: Props) {
  const { t } = useTranslation('warehouse');

  const [candidates, setCandidates] = useState<WhShipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setCandidates([]);
      return;
    }
    setLoading(true);
    getMergeCandidates(source.id)
      .then(setCandidates)
      .finally(() => setLoading(false));
  }, [open, source.id]);

  const srcEmail = (source.recipientEmail || '').trim().toLowerCase();
  const srcName = (source.recipientName || '').trim().toLowerCase();

  function matchLevel(c: WhShipment): 'email' | 'name' | 'other' {
    if (srcEmail && (c.recipientEmail || '').trim().toLowerCase() === srcEmail) return 'email';
    if (srcName && (c.recipientName || '').trim().toLowerCase() === srcName) return 'name';
    return 'other';
  }

  async function handleMerge() {
    if (!selectedId) return;
    setMerging(true);
    try {
      const target = await mergeShipments(source.id, selectedId);
      toast.success(t('Shipments merged into {{number}}', { number: target.shipmentNumber }));
      onMerged(target);
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setMerging(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="h-5 w-5 shrink-0" />
            <span>{t('Merge into another shipment')}</span>
          </DialogTitle>
          <DialogDescription className="space-y-1">
            <span className="block">
              {t('All positions from this shipment will move into the selected target. This shipment will then be cancelled.')}
            </span>
            <span className="block text-xs">
              {t('Current shipment: {{number}} ({{name}})', {
                number: source.shipmentNumber,
                name: source.recipientName,
              })}
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            <ShimmerSkeleton className="h-16 w-full" />
            <ShimmerSkeleton className="h-16 w-full" />
            <ShimmerSkeleton className="h-16 w-full" />
          </div>
        ) : candidates.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
            {t('No other open shipments to merge with.')}
          </div>
        ) : (
          <div className="rounded-lg border divide-y">
            {candidates.map((c) => {
              const level = matchLevel(c);
              const selected = selectedId === c.id;
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left p-3 transition-colors ${
                    selected
                      ? 'bg-primary/10 ring-2 ring-primary ring-inset'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-sm">{c.shipmentNumber}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{t(c.status)}</Badge>
                        {level === 'email' && (
                          <Badge variant="outline" className="text-[10px] bg-green-50 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-200">
                            {t('Same email')}
                          </Badge>
                        )}
                        {level === 'name' && (
                          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200">
                            {t('Same name')}
                          </Badge>
                        )}
                        {level === 'other' && (
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200">
                            <AlertTriangle className="h-3 w-3 mr-0.5" />
                            {t('Different recipient')}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground break-words">
                        {c.recipientName}
                        {c.recipientEmail ? ` · ${c.recipientEmail}` : ''}
                      </div>
                      <div className="text-xs text-muted-foreground break-words">
                        {c.shippingStreet}, {c.shippingPostalCode} {c.shippingCity}
                      </div>
                      {c.orderReference && (
                        <div className="text-xs text-muted-foreground">
                          {t('Order')}: {c.orderReference}
                        </div>
                      )}
                    </div>
                    <div className="text-right text-xs tabular-nums shrink-0">
                      <div className="font-semibold">{c.totalItems}</div>
                      <div className="text-muted-foreground">{t('Positions')}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={merging}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleMerge} disabled={!selectedId || merging}>
            <Merge className="mr-1 h-4 w-4" />
            {merging ? t('Merging...') : t('Merge')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
