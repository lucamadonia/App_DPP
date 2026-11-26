import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Gift, Loader2, Plus, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/adaptive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormActions, FormField, FormToggleRow, InputAffix } from '@/components/ui/form-layout';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { addShipmentItem } from '@/services/supabase/wh-shipments';
import { getProducts, getProductById, type ProductListItem } from '@/services/supabase/products';
import { getStockLevels } from '@/services/supabase/wh-stock';
import type { WhStockLevel } from '@/types/warehouse';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipmentId: string;
  /** Pre-select source location of the shipment so the picker filters there first. */
  preferredLocationId?: string;
  /**
   * Optional: pre-select this product when the dialog opens. Used by the
   * pick/pack flow when the user scans a code that's already fully confirmed
   * and confirms they want to add it again (e.g. as a gift).
   */
  prefilledProductId?: string;
  /** Called after a successful insert so the parent can refetch its items list. */
  onAdded: () => void;
}

/**
 * Lets a packer/picker add an extra position (e.g. a free gift) to a shipment
 * that already has its initial items. Uses available stock to constrain the
 * choice of batch + location and to cap the quantity. When `is_gift` is on,
 * the unit price is forced to 0 server-side.
 */
export function AddShipmentItemDialog({ open, onOpenChange, shipmentId, preferredLocationId, prefilledProductId, onAdded }: Props) {
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
    setSelectedProductId(prefilledProductId || '');
    setStockOptions([]);
    setSelectedStockId('');
    setQuantity(1);
    setIsGift(true);
    setGiftNote('');
    setNotes('');
  }, [open, prefilledProductId]);

  // Debounced product search. If a prefilled product is set, make sure it
  // appears in the visible list even when the search filter wouldn't match it.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setProductsLoading(true);
    const handle = setTimeout(async () => {
      try {
        const list = await getProducts(search.trim() || undefined);
        let final = list.slice(0, 50);
        if (prefilledProductId && !final.some(p => p.id === prefilledProductId)) {
          const prefetch = await getProductById(prefilledProductId);
          if (prefetch) {
            const asListItem: ProductListItem = {
              id: prefetch.id,
              name: prefetch.name,
              manufacturer: prefetch.manufacturer || '',
              gtin: prefetch.gtin || '',
              serial: prefetch.serialNumber || '',
              serialNumber: prefetch.serialNumber || '',
              category: prefetch.category || '',
              imageUrl: prefetch.imageUrl,
              batchCount: 0,
              status: 'live',
            };
            final = [asListItem, ...final];
          }
        }
        if (!cancelled) setProducts(final);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }, 200);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [open, search, prefilledProductId]);

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
      <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2 min-w-0">
            <Plus className="h-5 w-5 shrink-0" />
            <span className="truncate">{t('Produkt zur Sendung hinzufügen')}</span>
          </DialogTitle>
          <DialogDescription className="break-words">
            {t('Fügen Sie eine zusätzliche Position zur Sendung hinzu — z. B. ein Werbegeschenk, eine Beigabe oder ein Goodie. Bestand wird automatisch reserviert.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-4 sm:px-6 py-4 min-w-0">
          {/* Step 1 — Product search */}
          <FormField label={t('Produkt suchen')} htmlFor="product-search">
            <InputAffix prefix={<Search className="h-4 w-4" />}>
              <Input
                id="product-search"
                type="search"
                enterKeyHint="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('Name, GTIN oder Hersteller...')}
                autoFocus
              />
            </InputAffix>
          </FormField>
          <div
            role="listbox"
            aria-label={t('Produkt suchen')}
            className="-mt-3 rounded-lg border max-h-44 sm:max-h-48 overflow-y-auto divide-y"
          >
            {productsLoading ? (
              <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> {t('Lade Produkte...')}
              </div>
            ) : products.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">
                {t('Keine Produkte gefunden')}
              </div>
            ) : products.map(p => {
              const selected = selectedProductId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => setSelectedProductId(p.id)}
                  className={cn(
                    'flex min-h-11 w-full min-w-0 items-center gap-3 px-3 py-2 text-left transition-colors duration-150 ease-out hover:bg-muted/50',
                    selected && 'bg-primary/5'
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm font-medium leading-tight', selected && 'text-primary')}>{p.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.gtin || t('Keine GTIN')} · {p.manufacturer || t('Kein Hersteller')}
                    </span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {/* Step 2 — Batch / location with stock */}
          {selectedProductId && (
            stockLoading ? (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" /> {t('Lade Bestand...')}
              </div>
            ) : stockOptions.length === 0 ? (
              <div role="status" className="rounded-lg border border-dashed bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground break-words">
                {t('Kein verfügbarer Bestand für dieses Produkt')}
              </div>
            ) : (
              <FormField label={t('Bestand & Standort')} htmlFor="stock-pick">
                <Select value={selectedStockId} onValueChange={setSelectedStockId}>
                  <SelectTrigger id="stock-pick" className="w-full">
                    <SelectValue placeholder={t('Bestand wählen')} />
                  </SelectTrigger>
                  <SelectContent>
                    {stockOptions.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="truncate">
                          {(s.locationName || '?')}
                          {s.batchSerialNumber ? ` · ${s.batchSerialNumber}` : ''}
                          {s.binLocation ? ` · ${s.binLocation}` : ''}
                          {' — '}
                          {s.quantityAvailable} {t('verfügbar')}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )
          )}

          {/* Step 3 — Quantity */}
          {selectedStock && (
            <FormField
              label={t('Menge')}
              htmlFor="qty"
              labelAside={<span className="tabular-nums">{t('max. {{n}}', { n: maxQty })}</span>}
            >
              <InputAffix suffix={t('Stk.')} className="w-36">
                <Input
                  id="qty"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxQty}
                  value={quantity}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    setQuantity(isNaN(v) ? 1 : Math.max(1, Math.min(maxQty, v)));
                  }}
                  className="tabular-nums"
                />
              </InputAffix>
            </FormField>
          )}

          {/* Step 4 — Gift flag + note */}
          {selectedStock && (
            <div className="space-y-3 min-w-0">
              <FormToggleRow
                htmlFor="item-gift"
                controlPosition="start"
                label={
                  <span className="inline-flex items-center gap-2">
                    <Gift className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {t('Als Beigabe / Geschenk markieren')}
                  </span>
                }
                description={t('Position wird mit 0,00 € verrechnet und auf dem Lieferschein als Beigabe ausgewiesen.')}
              >
                <Checkbox
                  id="item-gift"
                  aria-describedby="item-gift-description"
                  checked={isGift}
                  onCheckedChange={v => setIsGift(!!v)}
                />
              </FormToggleRow>

              {isGift ? (
                <FormField label={t('Notiz zur Beigabe (optional)')} htmlFor="gift-note" hint={t('Wird auf Lieferschein hinterlegt')}>
                  <Textarea
                    id="gift-note"
                    value={giftNote}
                    onChange={e => setGiftNote(e.target.value)}
                    placeholder={t('z. B. "Geburtstagsgeschenk" oder "Goodie zur Treuekampagne"')}
                    rows={2}
                    className="w-full resize-none"
                  />
                </FormField>
              ) : (
                <FormField label={t('Interne Notiz (optional)')} htmlFor="item-note">
                  <Textarea
                    id="item-note"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={t('Notiz für interne Zwecke')}
                    rows={2}
                    className="w-full resize-none"
                  />
                </FormField>
              )}
            </div>
          )}

          {/* Summary */}
          {selectedProduct && selectedStock && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3 text-sm min-w-0">
              <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-md bg-background px-2 text-sm font-semibold tabular-nums">
                {quantity}×
              </span>
              <div className="min-w-0">
                <div className="font-medium truncate">{selectedProduct.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {selectedStock.locationName}
                  {selectedStock.batchSerialNumber ? ` · ${selectedStock.batchSerialNumber}` : ''}
                  {isGift ? ` · ${t('Beigabe')}` : ''}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <FormActions>
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t('Abbrechen')}
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>
              {submitting ? (
                <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> {t('Speichert...')}</>
              ) : (
                <><Plus className="mr-1 h-4 w-4" /> {t('Hinzufügen')}</>
              )}
            </Button>
          </FormActions>
        </div>
      </DialogContent>
    </Dialog>
  );
}
