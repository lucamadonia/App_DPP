import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanBarcode, Check, X, Package, Plus, Gift } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { confirmItemPick, confirmItemPack } from '@/services/supabase/wh-shipments';
import type { WhShipmentItem } from '@/types/warehouse';
import { AddShipmentItemDialog } from '@/components/warehouse/AddShipmentItemDialog';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'pick' | 'pack';
  items: WhShipmentItem[];
  productBarcodeMap?: Record<string, string>;
  onConfirmed: () => void;
  /** Required to add extra positions during picking/packing. */
  shipmentId?: string;
  /** Source location of the shipment, used to pre-select stock in the picker. */
  sourceLocationId?: string;
  /** Called after a new position was added so the parent can refetch items. */
  onItemsChanged?: () => void;
}

/**
 * Verifiziert vor Status-Transition Kommissionierung/Verpackt.
 * Jede Position muss bestätigt werden (Checkbox oder Barcode-Scan im
 * Eingabefeld). Erst wenn alle Positionen vollständig sind, wird
 * onConfirmed() ausgelöst — typischerweise ruft dann die parent
 * updateShipmentStatus().
 */
export function PickPackConfirmDialog({ open, onOpenChange, mode, items, productBarcodeMap, onConfirmed, shipmentId, sourceLocationId, onItemsChanged }: Props) {
  const { t } = useTranslation('warehouse');
  // Map item.id → confirmed quantity
  const [confirmed, setConfirmed] = useState<Record<string, number>>({});
  const [scanValue, setScanValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      for (const it of items) {
        initial[it.id] = mode === 'pick' ? (it.quantityPicked || 0) : (it.quantityPacked || 0);
      }
      setConfirmed(initial);
      setScanValue('');
    }
  }, [open, items, mode]);

  const allConfirmed = items.every(it => (confirmed[it.id] || 0) >= it.quantity);
  const totalConfirmedQty = Object.values(confirmed).reduce((a, b) => a + b, 0);
  const totalRequiredQty = items.reduce((a, b) => a + b.quantity, 0);

  function toggleFullItem(item: WhShipmentItem) {
    setConfirmed(c => ({
      ...c,
      [item.id]: (c[item.id] || 0) >= item.quantity ? 0 : item.quantity,
    }));
  }

  function incrementItem(item: WhShipmentItem) {
    setConfirmed(c => ({
      ...c,
      [item.id]: Math.min(item.quantity, (c[item.id] || 0) + 1),
    }));
  }

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    const code = scanValue.trim();
    if (!code) return;
    // Find item whose product barcode matches
    const match = items.find(it => {
      const bc = productBarcodeMap?.[it.productId];
      return bc && bc === code;
    });
    if (!match) {
      toast.error(t('Kein Produkt mit GTIN {{gtin}} in dieser Sendung', { gtin: code }));
    } else {
      if ((confirmed[match.id] || 0) >= match.quantity) {
        toast.info(t('{{name}} bereits vollständig bestätigt', { name: match.productName || '?' }));
      } else {
        incrementItem(match);
        toast.success(t('{{name}}: {{count}} von {{total}}', {
          name: match.productName || '?',
          count: (confirmed[match.id] || 0) + 1,
          total: match.quantity,
        }));
      }
    }
    setScanValue('');
  }

  async function handleConfirm() {
    setBusy(true);
    try {
      for (const it of items) {
        const qty = confirmed[it.id] || 0;
        if (mode === 'pick') await confirmItemPick(it.id, qty);
        else await confirmItemPack(it.id, qty);
      }
      onConfirmed();
      onOpenChange(false);
      toast.success(mode === 'pick' ? t('Kommissionierung bestätigt') : t('Verpackt bestätigt'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 shrink-0" />
            <span className="truncate">{mode === 'pick' ? t('Kommissionierung bestätigen') : t('Verpackung bestätigen')}</span>
          </DialogTitle>
          <DialogDescription className="break-words">
            {mode === 'pick'
              ? t('Haken Sie jede Position ab, wenn sie aus dem Lager entnommen wurde. Oder scannen Sie die GTIN.')
              : t('Kontrolle vor Versand: Haken Sie jede Position ab, wenn sie im Karton liegt.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleScan} className="flex gap-2">
          <ScanBarcode className="h-5 w-5 text-muted-foreground self-center shrink-0" />
          <Input
            value={scanValue}
            onChange={e => setScanValue(e.target.value)}
            placeholder={t('GTIN/Barcode scannen oder eintippen...')}
            autoFocus
            className="font-mono"
          />
          <Button type="submit" variant="outline" disabled={!scanValue.trim()} className="shrink-0">
            {t('Scan')}
          </Button>
        </form>

        {shipmentId && (
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setAddOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" /> {t('Produkt hinzufügen')}
            </Button>
          </div>
        )}

        <div className="rounded-lg border divide-y">
          {items.map(item => {
            const qty = confirmed[item.id] || 0;
            const full = qty >= item.quantity;
            return (
              <div key={item.id} className={`p-3 ${full ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={full}
                    onCheckedChange={() => toggleFullItem(item)}
                    aria-label={t('Vollständig bestätigen')}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="font-medium text-sm leading-tight break-words flex flex-wrap items-center gap-1.5">
                      {item.productName || item.productId.slice(0, 8)}
                      {item.isGift && (
                        <Badge variant="secondary" className="gap-1 bg-pink-100 text-pink-800 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-200">
                          <Gift className="h-3 w-3" /> {t('Beigabe')}
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground break-words">
                      {item.batchSerialNumber || t('Keine Charge')} · {item.locationName || t('Unbekannter Standort')}
                    </div>
                    {item.isGift && item.giftNote && (
                      <div className="text-xs text-pink-700 dark:text-pink-300 italic break-words">
                        {item.giftNote}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <div className="flex items-center gap-1 text-sm tabular-nums">
                      <span className={full ? 'font-semibold text-green-700' : 'text-muted-foreground'}>{qty}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="font-semibold">{item.quantity}</span>
                    </div>
                    {!full && qty < item.quantity && (
                      <Button size="sm" variant="ghost" onClick={() => incrementItem(item)} className="h-7 px-2">+1</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {shipmentId && (
          <AddShipmentItemDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            shipmentId={shipmentId}
            preferredLocationId={sourceLocationId}
            onAdded={() => onItemsChanged?.()}
          />
        )}

        <div className="flex items-center justify-between text-sm pt-2">
          <span className="text-muted-foreground">
            {t('Gesamt')}: <span className="font-semibold tabular-nums">{totalConfirmedQty} / {totalRequiredQty}</span>
          </span>
          {allConfirmed && (
            <span className="flex items-center gap-1 text-green-700 font-medium">
              <Check className="h-4 w-4" /> {t('Alle Positionen vollständig')}
            </span>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            <X className="mr-1 h-4 w-4" /> {t('Abbrechen')}
          </Button>
          <Button onClick={handleConfirm} disabled={!allConfirmed || busy}>
            {busy ? t('Speichert...') : (mode === 'pick' ? t('Kommissionierung abschließen') : t('Verpackt abschließen'))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
