import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  const [creating, setCreating] = useState<number | null>(null);
  const [selectedProductMap, setSelectedProductMap] = useState<Record<number, string>>({});

  const mappedVariantIds = new Set(existingMaps.map(m => m.shopifyVariantId));

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

  async function handleMap(variant: ShopifyProduct['variants'][0], product: ShopifyProduct) {
    const productId = selectedProductMap[variant.id];
    if (!productId) return;

    setCreating(variant.id);
    try {
      await createShopifyProductMap({
        shopifyProductId: product.id,
        shopifyVariantId: variant.id,
        shopifyInventoryItemId: variant.inventory_item_id,
        shopifyProductTitle: product.title,
        shopifyVariantTitle: variant.title,
        shopifySku: variant.sku || undefined,
        shopifyBarcode: variant.barcode || undefined,
        productId,
      });
      onMapped();
      toast({ title: t('Add Mapping') });
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setCreating(null);
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>{t('Shopify Products')}</DialogTitle>
          <DialogDescription>{t('Select product...')}</DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Product')}</TableHead>
              <TableHead>{t('Variant')}</TableHead>
              <TableHead>{t('SKU')}</TableHead>
              <TableHead>{t('Barcode')}</TableHead>
              <TableHead>{t('Trackbliss Product')}</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.flatMap(product =>
              product.variants.map(variant => {
                const isMapped = mappedVariantIds.has(variant.id);
                return (
                  <TableRow key={variant.id} className={isMapped ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{product.title}</TableCell>
                    <TableCell>{variant.title !== 'Default Title' ? variant.title : '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{variant.sku || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{variant.barcode || '—'}</TableCell>
                    <TableCell>
                      {isMapped ? (
                        <Badge variant="secondary"><Check className="mr-1 h-3 w-3" />{t('mapped')}</Badge>
                      ) : (
                        <Select
                          value={selectedProductMap[variant.id] || ''}
                          onValueChange={v => setSelectedProductMap(prev => ({ ...prev, [variant.id]: v }))}
                        >
                          <SelectTrigger className="w-48 h-8 text-xs">
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
                    <TableCell>
                      {!isMapped && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={!selectedProductMap[variant.id] || creating === variant.id}
                          onClick={() => handleMap(variant, product)}
                        >
                          {creating === variant.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
