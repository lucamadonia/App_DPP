/**
 * DriftCorrectionDialog — books a stock adjustment directly from an
 * inventory-drift row. Loads the live stock levels for the affected
 * product, lets the user pick the stock row + delta, and posts the
 * correction through the existing createStockAdjustment service.
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, PackageOpen, Wrench } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { getStockLevels, createStockAdjustment } from '@/services/supabase/wh-stock';
import type { WhStockLevel } from '@/types/warehouse';
import { toast } from 'sonner';

export interface DriftCorrectionTarget {
  productId: string;
  batchId?: string;
  productName?: string;
  shipmentNumber: string;
  /** Suggested quantity change (shipped − expected); user can override */
  defaultDelta: number;
}

export function DriftCorrectionDialog({ target, onClose, onBooked }: {
  target: DriftCorrectionTarget | null;
  onClose: () => void;
  onBooked?: () => void;
}) {
  const { t } = useTranslation('warehouse');
  const [stockRows, setStockRows] = useState<WhStockLevel[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockId, setStockId] = useState<string>('');
  const [delta, setDelta] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const productId = target?.productId;
  const batchId = target?.batchId;
  const defaultDelta = target?.defaultDelta ?? 0;

  useEffect(() => {
    if (!productId) return;
    let active = true;
    setLoadingStock(true);
    setStockRows([]);
    setStockId('');
    setDelta(String(defaultDelta));
    setNotes('');
    getStockLevels({ productId })
      .then((rows) => {
        if (!active) return;
        setStockRows(rows);
        // Preselect the batch the shipment actually used, else the first row
        const preferred = batchId ? rows.find((r) => r.batchId === batchId) : undefined;
        setStockId((preferred || rows[0])?.id || '');
      })
      .catch((e) => { if (active) toast.error(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (active) setLoadingStock(false); });
    return () => { active = false; };
  }, [productId, batchId, defaultDelta]);

  const selected = useMemo(() => stockRows.find((r) => r.id === stockId), [stockRows, stockId]);
  const deltaNum = Number.parseInt(delta, 10);
  const deltaValid = Number.isFinite(deltaNum) && deltaNum !== 0;
  const resulting = selected ? selected.quantityAvailable + (Number.isFinite(deltaNum) ? deltaNum : 0) : undefined;
  const wouldGoNegative = resulting !== undefined && resulting < 0;

  async function handleConfirm() {
    if (!target || !selected || !deltaValid || wouldGoNegative) return;
    setSaving(true);
    try {
      await createStockAdjustment({
        stockId: selected.id,
        quantityChange: deltaNum,
        reason: t('Inventory drift correction for {{shipment}}', { shipment: target.shipmentNumber }),
        notes: notes.trim() || undefined,
      });
      toast.success(t('Stock corrected by {{delta}}', { delta: deltaNum > 0 ? `+${deltaNum}` : deltaNum }));
      onBooked?.();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            {t('Book stock correction')}
          </DialogTitle>
          <DialogDescription>
            {target?.productName || t('Unknown product')}
            {' · '}
            {target?.shipmentNumber}
          </DialogDescription>
        </DialogHeader>

        {loadingStock ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('Loading stock...')}
          </div>
        ) : stockRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
            <PackageOpen className="h-8 w-8 opacity-50" />
            <p className="text-sm">{t('No stock found for this product')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="drift-stock-row">{t('Stock level')}</Label>
              <Select value={stockId} onValueChange={setStockId}>
                <SelectTrigger id="drift-stock-row" className="min-h-11">
                  <SelectValue placeholder={t('Stock level')} />
                </SelectTrigger>
                <SelectContent>
                  {stockRows.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {[r.locationName || r.locationCode, r.batchSerialNumber, r.binLocation]
                        .filter(Boolean).join(' · ')}
                      {` — ${r.quantityAvailable} ${t('available')}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="drift-delta">{t('Quantity change')}</Label>
              <Input
                id="drift-delta"
                type="number"
                inputMode="numeric"
                step={1}
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                className="min-h-11 font-mono tabular-nums"
              />
              {selected && (
                <p className={`text-xs ${wouldGoNegative ? 'text-rose-600 font-medium' : 'text-muted-foreground'}`}>
                  {wouldGoNegative
                    ? t('Adjustment would result in negative stock')
                    : `${selected.quantityAvailable} → ${resulting}`}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="drift-notes">{t('Notes (optional)')}</Label>
              <Input
                id="drift-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('e.g. recount confirmed missing unit')}
                className="min-h-11"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving} className="min-h-11 sm:min-h-9">
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={saving || !selected || !deltaValid || wouldGoNegative}
            className="min-h-11 sm:min-h-9 active:scale-[0.97] transition-transform"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('Book correction')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
