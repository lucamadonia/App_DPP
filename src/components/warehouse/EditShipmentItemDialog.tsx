import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateShipmentItem } from '@/services/supabase/wh-shipments';
import { getStockLevels } from '@/services/supabase/wh-stock';
import type { WhShipmentItem, WhStockLevel } from '@/types/warehouse';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: WhShipmentItem | null;
  /** Source location of the parent shipment, used to filter stock candidates. */
  sourceLocationId?: string;
  onSaved: () => void;
}

/**
 * Inline editor for an existing shipment position. Lets the operator fix
 * the batch (e.g. when Shopify import left it NULL) and the quantity. The
 * service applies the reservation diff automatically.
 */
export function EditShipmentItemDialog({ open, onOpenChange, item, sourceLocationId, onSaved }: Props) {
  const { t } = useTranslation('warehouse');

  const [stockOptions, setStockOptions] = useState<WhStockLevel[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [allowNoStock, setAllowNoStock] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Initialize state from the item every time the dialog opens.
  useEffect(() => {
    if (!open || !item) return;
    setQuantity(item.quantity);
    setAllowNoStock(false);
    setSelectedStockId('');
  }, [open, item]);

  // Load stock levels for the item's product.
  useEffect(() => {
    if (!open || !item) return;
    let cancelled = false;
    setStockLoading(true);
    (async () => {
      try {
        const all = await getStockLevels({ productId: item.productId, pageSize: 200 });
        if (cancelled) return;
        setStockOptions(all);

        // Pre-select: stock row matching current item, else preferred location, else first usable.
        const usable = all.filter(s => allowNoStock || s.quantityAvailable > 0);
        const matching = all.find(s => s.batchId === item.batchId && s.locationId === item.locationId);
        const preferred = matching
          || usable.find(s => s.locationId === sourceLocationId)
          || usable[0];
        setSelectedStockId(preferred?.id || '');
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, item, sourceLocationId, allowNoStock]);

  const visibleStockOptions = useMemo(
    () => allowNoStock ? stockOptions : stockOptions.filter(s => s.quantityAvailable > 0),
    [stockOptions, allowNoStock],
  );
  const selectedStock = useMemo(
    () => stockOptions.find(s => s.id === selectedStockId),
    [stockOptions, selectedStockId],
  );

  // Cap quantity by available stock unless override is on.
  const maxQty = selectedStock
    ? (allowNoStock
        ? Math.max(item?.quantity || 1, selectedStock.quantityAvailable + (selectedStock.batchId === item?.batchId ? item.quantity : 0))
        : selectedStock.quantityAvailable + (selectedStock.batchId === item?.batchId ? item.quantity : 0))
    : 1;

  const canSubmit = !!item && !!selectedStock && quantity > 0 && quantity <= maxQty && !submitting;

  async function handleSave() {
    if (!item || !selectedStock) return;
    setSubmitting(true);
    try {
      await updateShipmentItem(item.id, {
        batchId: selectedStock.batchId,
        locationId: selectedStock.locationId,
        quantity,
      });
      toast.success(t('Position aktualisiert'));
      onSaved();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <Pencil className="h-5 w-5 shrink-0" />
            <span className="truncate">{t('Position bearbeiten')}</span>
          </DialogTitle>
          <DialogDescription className="break-words">
            {t('Charge oder Menge dieser Sendungsposition anpassen. Reservierter Bestand wird automatisch angepasst.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-4 sm:px-6 py-4 min-w-0">
          {/* Read-only product header */}
          <div className="rounded-lg border bg-muted/30 p-3 min-w-0">
            <div className="font-medium text-sm break-words">{item.productName || item.productId.slice(0, 8)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t('Aktuelle Charge')}: <span className="font-mono">{item.batchSerialNumber || '—'}</span>
            </div>
          </div>

          {/* Stock picker */}
          <div className="space-y-2 min-w-0">
            <Label htmlFor="edit-stock-pick">{t('Bestand & Standort')}</Label>
            {stockLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" /> {t('Lade Bestand...')}
              </div>
            ) : visibleStockOptions.length === 0 ? (
              <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-2.5 break-words flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  {t('Keine Charge mit verfügbarem Bestand. Aktiviere unten "Charge ohne Bestand zulassen", um trotzdem zuzuweisen.')}
                </div>
              </div>
            ) : (
              <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                <SelectTrigger id="edit-stock-pick" className="w-full">
                  <SelectValue placeholder={t('Bestand wählen')} />
                </SelectTrigger>
                <SelectContent>
                  {visibleStockOptions.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="truncate">
                        {(s.locationName || '?')}
                        {s.batchSerialNumber ? ` · ${s.batchSerialNumber}` : ` · ${t('Keine Charge')}`}
                        {s.binLocation ? ` · ${s.binLocation}` : ''}
                        {' — '}
                        {s.quantityAvailable} {t('verfügbar')}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <label className="flex items-start gap-2 cursor-pointer mt-2 text-xs">
              <Checkbox
                checked={allowNoStock}
                onCheckedChange={v => setAllowNoStock(!!v)}
                className="mt-0.5 shrink-0"
              />
              <span className="text-muted-foreground break-words">
                {t('Charge ohne Bestand zulassen (für Sonderfälle / Backorder)')}
              </span>
            </label>
          </div>

          {/* Quantity */}
          {selectedStock && (
            <div className="space-y-2 min-w-0">
              <Label htmlFor="edit-qty">
                {t('Menge')}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t('max. {{n}}', { n: maxQty })})
                </span>
              </Label>
              <Input
                id="edit-qty"
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setQuantity(isNaN(v) ? 1 : Math.max(1, allowNoStock ? v : Math.min(maxQty, v)));
                }}
                className="w-24 sm:w-32"
              />
            </div>
          )}
        </div>

        <DialogFooter className="sticky bottom-0 bg-background border-t px-4 sm:px-6 py-3 flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {t('Abbrechen')}
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit} className="w-full sm:w-auto">
            {submitting ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t('Speichert...')}</>
            ) : (
              t('Speichern')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
