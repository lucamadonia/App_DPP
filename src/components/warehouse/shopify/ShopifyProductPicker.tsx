import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { createShopifyProductMap } from '@/services/supabase/shopify-integration';
import type { ShopifyProduct, ShopifyProductMap } from '@/types/shopify';
import { useToast } from '@/hooks/use-toast';

interface Props {
  products: ShopifyProduct[];
  existingMaps: ShopifyProductMap[];
  onClose: () => void;
  onMapped: () => void;
}

interface TBProduct { id: string; name: string; gtin?: string; }

export function ShopifyProductPicker({ products, existingMaps, onClose, onMapped }: Props) {
  const { t } = useTranslation('warehouse');
  const { toast } = useToast();

  const [tbProducts, setTbProducts] = useState<TBProduct[]>([]);
  const [saving, setSaving] = useState(false);
  const [selectedProductMap, setSelectedProductMap] = useState<Record<number, string>>({});

  const mappedVariantIds = new Set(existingMaps.map(m => m.shopifyVariantId));

  // Count how many unmapped variants have a product selected
  const pendingCount = Object.entries(selectedProductMap).filter(
    ([variantId, productId]) => productId && !mappedVariantIds.has(Number(variantId))
  ).length;

  useEffect(() => {
    loadTBProducts();
  }, []);

  async function loadTBProducts() {
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return;
    const { data } = await supabase
      .from('products')
      .select('id, name, gtin')
      .eq('tenant_id', tenantId)
      .order('name');
    setTbProducts(data || []);
  }

  async function handleSaveAll() {
    const entries = Object.entries(selectedProductMap).filter(
      ([variantId, productId]) => productId && !mappedVariantIds.has(Number(variantId))
    );
    if (entries.length === 0) return;

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const [variantIdStr, productId] of entries) {
      const variantId = Number(variantIdStr);

      // Find the variant and product info
      let foundVariant: ShopifyProduct['variants'][0] | undefined;
      let foundProduct: ShopifyProduct | undefined;
      for (const p of products) {
        const v = p.variants.find(v => v.id === variantId);
        if (v) { foundVariant = v; foundProduct = p; break; }
      }
      if (!foundVariant || !foundProduct) continue;

      try {
        await createShopifyProductMap({
          shopifyProductId: foundProduct.id,
          shopifyVariantId: foundVariant.id,
          shopifyInventoryItemId: foundVariant.inventory_item_id,
          shopifyProductTitle: foundProduct.title,
          shopifyVariantTitle: foundVariant.title,
          shopifySku: foundVariant.sku || undefined,
          shopifyBarcode: foundVariant.barcode || undefined,
          productId,
        });
        successCount++;
      } catch {
        errorCount++;
      }
    }

    setSaving(false);

    if (successCount > 0) {
      toast({ title: `${successCount} Mapping${successCount > 1 ? 's' : ''} erstellt` });
      onMapped();
    }
    if (errorCount > 0) {
      toast({ title: `${errorCount} Fehler`, variant: 'destructive' });
    }

    // Clear saved selections
    setSelectedProductMap(prev => {
      const next = { ...prev };
      for (const [variantIdStr] of entries) {
        delete next[Number(variantIdStr)];
      }
      return next;
    });
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[80vh] overflow-auto px-3 sm:px-6">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base">{t('Shopify Products')}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t('Select product...')} — Wähle für mehrere Varianten ein Trackbliss-Produkt, dann klicke unten auf Speichern.
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Product')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Variant')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('SKU')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('Barcode')}</TableHead>
                <TableHead>{t('Trackbliss Product')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.flatMap(product =>
                product.variants.map(variant => {
                  const isMapped = mappedVariantIds.has(variant.id);
                  const isSelected = !!selectedProductMap[variant.id];
                  return (
                    <TableRow key={variant.id} className={isMapped ? 'opacity-50' : isSelected ? 'bg-green-50 dark:bg-green-950/20' : ''}>
                      <TableCell className="font-medium text-xs sm:text-sm">{product.title}</TableCell>
                      <TableCell className="hidden md:table-cell text-xs sm:text-sm">{variant.title !== 'Default Title' ? variant.title : '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs font-mono">{variant.sku || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-xs font-mono">{variant.barcode || '—'}</TableCell>
                      <TableCell>
                        {isMapped ? (
                          <Badge variant="secondary"><Check className="mr-1 h-3 w-3" />{t('mapped')}</Badge>
                        ) : (
                          <Select
                            value={selectedProductMap[variant.id] || ''}
                            onValueChange={v => setSelectedProductMap(prev => ({ ...prev, [variant.id]: v }))}
                          >
                            <SelectTrigger className="w-full sm:w-48 h-8 text-xs">
                              <SelectValue placeholder={t('Select product...')} />
                            </SelectTrigger>
                            <SelectContent>
                              {tbProducts.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} {p.gtin ? `(${p.gtin})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('Close', { ns: 'translation' })}</Button>
          <Button onClick={handleSaveAll} disabled={pendingCount === 0 || saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {pendingCount > 0 ? `${pendingCount} Mapping${pendingCount > 1 ? 's' : ''} speichern` : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
