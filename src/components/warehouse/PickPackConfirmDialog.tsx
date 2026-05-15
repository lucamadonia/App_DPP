import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanBarcode, Check, X, Package, Plus, Gift, AlertTriangle, PackageX } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { confirmItemPick, confirmItemPack } from '@/services/supabase/wh-shipments';
import type { WhShipmentItem } from '@/types/warehouse';
import { AddShipmentItemDialog } from '@/components/warehouse/AddShipmentItemDialog';
import { parseBarcode } from '@/lib/barcode-parser';
import { toast } from 'sonner';

type ScanAlert =
  | { kind: 'duplicate'; scannedCode: string; matchedItem: WhShipmentItem; override: boolean }
  | { kind: 'unknown'; scannedCode: string; override: boolean };

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
  // Warning banner for duplicate / unknown scans + override flow
  const [scanAlert, setScanAlert] = useState<ScanAlert | null>(null);
  // Product id to pre-select when AddShipmentItemDialog opens (duplicate case)
  const [prefilledProductId, setPrefilledProductId] = useState<string | undefined>(undefined);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      const initial: Record<string, number> = {};
      for (const it of items) {
        initial[it.id] = mode === 'pick' ? (it.quantityPicked || 0) : (it.quantityPacked || 0);
      }
      setConfirmed(initial);
      setScanValue('');
      setScanAlert(null);
      setPrefilledProductId(undefined);
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
    // Normalize scanned code: strip GS1-128 AI prefix, derive EAN-13/GTIN-14 variants
    const parsed = parseBarcode(code);
    const candidates = new Set<string>(parsed.gtinCandidates);
    candidates.add(code);
    // Find item whose product barcode matches any candidate form
    const match = items.find(it => {
      const bc = productBarcodeMap?.[it.productId];
      return bc && candidates.has(bc);
    });
    if (!match) {
      // Unknown code — show prominent banner with override option
      setScanAlert({ kind: 'unknown', scannedCode: code, override: false });
    } else if ((confirmed[match.id] || 0) >= match.quantity) {
      // Already fully confirmed — show prominent banner with override option
      setScanAlert({ kind: 'duplicate', scannedCode: code, matchedItem: match, override: false });
    } else {
      setScanAlert(null);
      incrementItem(match);
      toast.success(t('{{name}}: {{count}} von {{total}}', {
        name: match.productName || '?',
        count: (confirmed[match.id] || 0) + 1,
        total: match.quantity,
      }));
    }
    setScanValue('');
  }

  function dismissAlert() {
    setScanAlert(null);
  }

  function openAddDialogFromAlert() {
    if (!scanAlert) return;
    setPrefilledProductId(scanAlert.kind === 'duplicate' ? scanAlert.matchedItem.productId : undefined);
    setScanAlert(null);
    setAddOpen(true);
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

        {scanAlert && (
          <div
            role="alert"
            className={
              scanAlert.kind === 'duplicate'
                ? 'rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-600 p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200'
                : 'rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-900/30 dark:border-red-600 p-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200'
            }
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  scanAlert.kind === 'duplicate'
                    ? 'rounded-full bg-amber-500 p-2 shrink-0'
                    : 'rounded-full bg-red-500 p-2 shrink-0'
                }
              >
                {scanAlert.kind === 'duplicate' ? (
                  <AlertTriangle className="h-5 w-5 text-white" />
                ) : (
                  <PackageX className="h-5 w-5 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div>
                  <div
                    className={
                      scanAlert.kind === 'duplicate'
                        ? 'text-sm font-bold text-amber-900 dark:text-amber-100'
                        : 'text-sm font-bold text-red-900 dark:text-red-100'
                    }
                  >
                    {scanAlert.kind === 'duplicate'
                      ? t('Produkt bereits vollständig bestätigt')
                      : t('Unbekannter Code – keine passende Position')}
                  </div>
                  <div
                    className={
                      scanAlert.kind === 'duplicate'
                        ? 'text-sm text-amber-800 dark:text-amber-200 mt-1 break-words'
                        : 'text-sm text-red-800 dark:text-red-200 mt-1 break-words'
                    }
                  >
                    {scanAlert.kind === 'duplicate'
                      ? t('{{name}} steht nur 1× auf der Sendung und wurde bereits bestätigt.', {
                          name: scanAlert.matchedItem.productName || '?',
                        })
                      : t('Kein Produkt mit GTIN {{gtin}} in dieser Sendung.', {
                          gtin: scanAlert.scannedCode,
                        })}
                  </div>
                </div>

                <label className="flex items-start gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={scanAlert.override}
                    onCheckedChange={v =>
                      setScanAlert(a => (a ? { ...a, override: !!v } : a))
                    }
                    className="mt-0.5 shrink-0"
                  />
                  <span
                    className={
                      scanAlert.kind === 'duplicate'
                        ? 'text-amber-900 dark:text-amber-100 font-medium break-words'
                        : 'text-red-900 dark:text-red-100 font-medium break-words'
                    }
                  >
                    {t('Ich möchte dieses Produkt trotzdem als zusätzliche Position hinzufügen (z. B. als Beigabe).')}
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={openAddDialogFromAlert}
                    disabled={!scanAlert.override || !shipmentId}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    {t('Position hinzufügen…')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={dismissAlert}
                  >
                    {t('Schließen')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

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
            onOpenChange={(v) => {
              setAddOpen(v);
              if (!v) setPrefilledProductId(undefined);
            }}
            shipmentId={shipmentId}
            preferredLocationId={sourceLocationId}
            prefilledProductId={prefilledProductId}
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
