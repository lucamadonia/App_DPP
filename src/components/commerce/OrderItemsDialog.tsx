import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Link2Off, Loader2, PackageSearch, Truck } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  getOrderWithItems, linkOrderItemToProduct, createShipmentFromOrder,
} from '@/services/supabase/commerce-orders';
import { getProducts, type ProductListItem } from '@/services/supabase/products';
import type { CommerceOrder, CommerceOrderItem } from '@/types/commerce-channels';
import { toast } from 'sonner';

interface OrderItemsDialogProps {
  orderId: string | null;
  onClose: () => void;
  /** Called after a link changed, so the caller can refresh its list. */
  onChanged?: () => void;
}

/**
 * Line items of one marketplace order, each assignable to a Trackbliss product.
 *
 * Automatic matching needs an exact SKU or GTIN hit.  Etsy sends no GTIN and
 * sellers often leave the SKU blank, so without manual assignment those lines
 * stay unlinked forever — and an unlinked line cannot become a shipment item.
 */
export function OrderItemsDialog({ orderId, onClose, onChanged }: OrderItemsDialogProps) {
  const { t } = useTranslation('commerce');
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [items, setItems] = useState<CommerceOrderItem[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [creatingShipment, setCreatingShipment] = useState(false);

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [detail, prods] = await Promise.all([getOrderWithItems(orderId), getProducts()]);
      if (detail) {
        setOrder(detail.order);
        setItems(detail.items);
      }
      setProducts(prods);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const assign = async (itemId: string, productId: string | null) => {
    if (!orderId) return;
    setSavingId(itemId);
    try {
      await linkOrderItemToProduct(itemId, orderId, productId);
      setItems((prev) => prev.map((i) => (
        i.id === itemId
          ? { ...i, productId: productId ?? undefined, matchMethod: productId ? 'manual' : null }
          : i
      )));
      toast.success(productId ? t('Product linked') : t('Link removed'));
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  };

  const createShipment = async () => {
    if (!orderId) return;
    setCreatingShipment(true);
    try {
      const res = await createShipmentFromOrder(orderId);
      toast.success(t(res.reused ? 'Shipment {{number}} updated with {{n}} new items' : 'Shipment {{number}} created with {{n}} items', {
        number: res.shipmentNumber, n: res.itemsCreated,
      }));
      if ((res.itemCount ?? res.itemsCreated) === 0) {
        toast.warning(t('No items on the shipment — assign the lines to products first.'));
      }
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? t(e.message) : t('Shipment failed'));
    } finally {
      setCreatingShipment(false);
    }
  };

  const term = search.trim().toLowerCase();
  const visible = term
    ? products.filter((p) => p.name.toLowerCase().includes(term) || (p.gtin || '').toLowerCase().includes(term))
    : products;

  return (
    <Dialog open={Boolean(orderId)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[85dvh] min-w-0 overflow-y-auto sm:max-w-3xl [&>*]:min-w-0">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="break-words">
            {t('Order')} {order?.externalOrderNumber || order?.externalOrderId || ''}
          </DialogTitle>
          <DialogDescription>
            {t('Assign each line to a product so it can be fulfilled and carry a DPP.')}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="min-w-0 space-y-4">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('Filter products by name or GTIN')}
            />

            {items.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">{t('No line items')}</p>
            )}

            {items.map((item) => (
              <div key={item.id} className="min-w-0 rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 basis-48">
                    <div className="break-words font-medium [overflow-wrap:anywhere]">{item.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {item.sku ? `SKU ${item.sku}` : t('no SKU')} · {item.quantity}×
                    </div>
                  </div>
                  {item.productId ? (
                    <Badge className="gap-1 border-emerald-400/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                      <Link2 className="h-3 w-3" />
                      {item.matchMethod === 'manual' ? t('Linked manually') : t('Linked automatically')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <PackageSearch className="h-3 w-3" />
                      {t('Not linked')}
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <select
                    aria-label={t('Product for {{item}}', { item: item.title })}
                    className="h-11 w-full min-w-0 max-w-full shrink-0 rounded-md border border-input bg-background px-2 text-sm sm:flex-1"
                    value={item.productId ?? ''}
                    disabled={savingId === item.id}
                    onChange={(e) => assign(item.id, e.target.value || null)}
                  >
                    <option value="">{t('— not linked —')}</option>
                    {visible.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.gtin ? ` · ${p.gtin}` : ''}
                      </option>
                    ))}
                  </select>
                  {item.productId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={savingId === item.id}
                      onClick={() => assign(item.id, null)}
                    >
                      <Link2Off className="mr-1 h-3.5 w-3.5" />
                      {t('Unlink')}
                    </Button>
                  )}
                  {savingId === item.id && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                {t('Creates a warehouse shipment you can pack and label with DHL.')}
              </p>
              <Button onClick={createShipment} disabled={creatingShipment || items.length === 0}>
                {creatingShipment
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Truck className="mr-2 h-4 w-4" />}
                {t('Create shipment')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
