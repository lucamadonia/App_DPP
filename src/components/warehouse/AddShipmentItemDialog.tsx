import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gift, Loader2, Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { addShipmentItem } from '@/services/supabase/wh-shipments';
import { getProducts, type ProductListItem } from '@/services/supabase/products';
import { getStockLevels } from '@/services/supabase/wh-stock';
import type { WhStockLevel } from '@/types/warehouse';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  /** Pre-select source location of the shipment so the picker filters there first. */
  preferredLocationId?: string;
  /** Called after a successful insert so the parent can refetch its items list. */
  onAdded: () => void;
}

/**
 * Lets a packer/picker add an extra position (e.g. a free gift) to a shipment
 * that already has its initial items. Uses available stock to constrain the
 * choice of batch + location and to cap the quantity. When `is_gift` is on,
 * the unit price is forced to 0 server-side.
 */
export function AddShipmentItemDialog({ open, onOpenChange, shipmentId, preferredLocationId, onAdded }: Props) {
  const { t } = useTranslation('warehouse');

  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [stockOptions, setStockOptions] = useState<WhStockLevel[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string>('');

  const [quantity, setQuantity] = useState<number>(1);
  const [isGift, setIsGift] = useState<boolean>(true);
  const [giftNote, setGiftNote] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Reset everything when the dialog re-opens.
  useEffect(() => {
    if (!open) return;
    setSearch('');
    setSelectedProductId('');
    setStockOptions([]);
    setSelectedStockId('');
    setQuantity(1);
    setIsGift(true);
    setGiftNote('');
    setNotes('');
  }, [open]);

  // Debounced product search.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setProductsLoading(true);
    const handle = setTimeout(async () => {
      try {
        const list = await getProducts(search.trim() || undefined);
        if (!cancelled) setProducts(list.slice(0, 50));
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [open, search]);

  // When a product is selected, load its available stock rows.
  useEffect(() => {
    if (!selectedProductId) {
      setStockOptions([]);
      setSelectedStockId('');
      return;
    }
    let cancelled = false;
    setStockLoading(true);
    (async () => {
      try {
        const all = await getStockLevels({ productId: selectedProductId, pageSize: 200 });
        const usable = all.filter(s => s.quantityAvailable > 0);
        if (cancelled) return;
        setStockOptions(usable);
        // Auto-pick the preferred location's row if available, else the first row.
        const preferred = usable.find(s => s.locationId === preferredLocationId) || usable[0];
        setSelectedStockId(preferred?.id || '');
      } finally {
        if (!cancelled) setStockLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedProductId, preferredLocationId]);

  const selectedProduct = useMemo(
    () => products.find(p => p.id === selectedProductId),
    [products, selectedProductId],
  );
  const selectedStock = useMemo(
    () => stockOptions.find(s => s.id === selectedStockId),
    [stockOptions, selectedStockId],
  );
  const maxQty = selectedStock?.quantityAvailable ?? 0;
  const canSubmit =
    !!selectedProductId &&
    !!selectedStock &&
    quantity > 0 &&
    quantity <= maxQty &&
    !submitting;

  async function handleSubmit() {
    if (!selectedStock || !selectedProductId) return;
    setSubmitting(true);
    try {
      await addShipmentItem(shipmentId, {
        productId: selectedProductId,
        batchId: selectedStock.batchId,
        locationId: selectedStock.locationId,
        quantity,
        isGift,
        giftNote: isGift && giftNote.trim() ? giftNote.trim() : undefined,
        notes: !isGift && notes.trim() ? notes.trim() : undefined,
      });
      toast.success(isGift ? t('Beigabe hinzugefügt') : t('Position hinzugefügt'));
      onAdded();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 shrink-0" />
            <span className="truncate">{t('Produkt zur Sendung hinzufügen')}</span>
          </DialogTitle>
          <DialogDescription className="break-words">
            {t('Fügen Sie eine zusätzliche Position zur Sendung hinzu — z. B. ein Werbegeschenk, eine Beigabe oder ein Goodie. Bestand wird automatisch reserviert.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1 — Product search */}
          <div className="space-y-2">
            <Label htmlFor="product-search">{t('Produkt suchen')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="product-search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Name, GTIN oder Hersteller...')}
                className="pl-9"
                autoFocus
              />
            </div>
            <div className="rounded-lg border max-h-48 overflow-y-auto divide-y">
              {productsLoading ? (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('Lade Produkte...')}
                </div>
              ) : products.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">
                  {t('Keine Produkte gefunden')}
                </div>
              ) : products.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProductId(p.id)}
                  className={`w-full text-left p-2.5 hover:bg-muted/40 transition-colors ${
                    selectedProductId === p.id ? 'bg-primary/10' : ''
                  }`}
                >
                  <div className="font-medium text-sm leading-tight">{p.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.gtin || t('Keine GTIN')} · {p.manufacturer || t('Kein Hersteller')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2 — Batch / location with stock */}
          {selectedProductId && (
            <div className="space-y-2">
              <Label htmlFor="stock-pick">{t('Bestand & Standort')}</Label>
              {stockLoading ? (
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {t('Lade Bestand...')}
                </div>
              ) : stockOptions.length === 0 ? (
                <div className="text-sm text-amber-700 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-2.5">
                  {t('Kein verfügbarer Bestand für dieses Produkt')}
                </div>
              ) : (
                <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                  <SelectTrigger id="stock-pick">
                    <SelectValue placeholder={t('Bestand wählen')} />
                  </SelectTrigger>
                  <SelectContent>
                    {stockOptions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {(s.locationName || '?')}
                        {s.batchSerialNumber ? ` · ${s.batchSerialNumber}` : ''}
                        {s.binLocation ? ` · ${s.binLocation}` : ''}
                        {' — '}
                        {s.quantityAvailable} {t('verfügbar')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Step 3 — Quantity */}
          {selectedStock && (
            <div className="space-y-2">
              <Label htmlFor="qty">
                {t('Menge')}{' '}
                <span className="text-xs font-normal text-muted-foreground">
                  ({t('max. {{n}}', { n: maxQty })})
                </span>
              </Label>
              <Input
                id="qty"
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  setQuantity(isNaN(v) ? 1 : Math.max(1, Math.min(maxQty, v)));
                }}
                className="w-32"
              />
            </div>
          )}

          {/* Step 4 — Gift flag + note */}
          {selectedStock && (
            <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox
                  checked={isGift}
                  onCheckedChange={v => setIsGift(!!v)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Gift className="h-4 w-4 text-pink-600" />
                    {t('Als Beigabe / Geschenk markieren')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t('Position wird mit 0,00 € verrechnet und auf dem Lieferschein als Beigabe ausgewiesen.')}
                  </div>
                </div>
              </label>

              {isGift ? (
                <div className="space-y-2">
                  <Label htmlFor="gift-note" className="text-xs">
                    {t('Notiz zur Beigabe (optional)')}
                  </Label>
                  <Textarea
                    id="gift-note"
                    value={giftNote}
                    onChange={e => setGiftNote(e.target.value)}
                    placeholder={t('z. B. "Geburtstagsgeschenk" oder "Goodie zur Treuekampagne"')}
                    rows={2}
                  />
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Gift className="h-3 w-3" /> {t('Wird auf Lieferschein hinterlegt')}
                  </Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="item-note" className="text-xs">
                    {t('Interne Notiz (optional)')}
                  </Label>
                  <Textarea
                    id="item-note"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={t('Notiz für interne Zwecke')}
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {selectedProduct && selectedStock && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <div className="font-medium">{selectedProduct.name}</div>
              <div className="text-xs text-muted-foreground">
                {quantity}× · {selectedStock.locationName}
                {selectedStock.batchSerialNumber ? ` · ${selectedStock.batchSerialNumber}` : ''}
                {isGift ? ` · ${t('Beigabe')}` : ''}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('Abbrechen')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? (
              <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t('Speichert...')}</>
            ) : (
              <><Plus className="mr-1 h-4 w-4" /> {t('Hinzufügen')}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
