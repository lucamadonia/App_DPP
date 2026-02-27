import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, RefreshCw, Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  deleteShopifyProductMap,
  updateShopifyProductMap,
  fetchShopifyProducts,
  autoMapByGtin,
} from '@/services/supabase/shopify-integration';
import type { ShopifyProductMap, ShopifyProduct, ShopifySyncDirection } from '@/types/shopify';
import { useToast } from '@/hooks/use-toast';
import { ShopifyProductPicker } from './ShopifyProductPicker';
import { ShopifyAutoMapDialog } from './ShopifyAutoMapDialog';

interface Props {
  maps: ShopifyProductMap[];
  onRefresh: () => void;
}

export function ShopifyProductMappingTable({ maps, onRefresh }: Props) {
  const { t } = useTranslation('warehouse');
  const { toast } = useToast();

  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [fetching, setFetching] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showAutoMap, setShowAutoMap] = useState(false);
  const [autoMapping, setAutoMapping] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [autoMapResult, setAutoMapResult] = useState<any>(null);

  async function handleFetchProducts() {
    setFetching(true);
    try {
      const products = await fetchShopifyProducts();
      setShopifyProducts(products);
      setShowPicker(true);
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setFetching(false);
    }
  }

  async function handleAutoMap() {
    if (shopifyProducts.length === 0) {
      toast({ title: t('No Shopify products loaded'), variant: 'destructive' });
      return;
    }
    setAutoMapping(true);
    try {
      const result = await autoMapByGtin(shopifyProducts);
      setAutoMapResult(result);
      setShowAutoMap(true);
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setAutoMapping(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteShopifyProductMap(id);
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  }

  async function handleDirectionChange(id: string, direction: ShopifySyncDirection) {
    try {
      await updateShopifyProductMap(id, { syncDirection: direction });
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleFetchProducts} disabled={fetching}>
          {fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {t('Fetch Products')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleAutoMap} disabled={autoMapping || shopifyProducts.length === 0}>
          {autoMapping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {t('Auto-Map by GTIN')}
        </Button>
        {shopifyProducts.length > 0 && (
          <Badge variant="secondary">{shopifyProducts.length} {t('Shopify Products')}</Badge>
        )}
      </div>

      {maps.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          {t('No product mappings')}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Shopify Products')}</TableHead>
                <TableHead>{t('Variant')}</TableHead>
                <TableHead>{t('SKU')}</TableHead>
                <TableHead>{t('Trackbliss Product')}</TableHead>
                <TableHead>{t('Trackbliss Batch')}</TableHead>
                <TableHead>{t('Sync Direction')}</TableHead>
                <TableHead>{t('Last Synced')}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {maps.map(map => (
                <TableRow key={map.id}>
                  <TableCell className="font-medium">{map.shopifyProductTitle || `#${map.shopifyProductId}`}</TableCell>
                  <TableCell>{map.shopifyVariantTitle || '—'}</TableCell>
                  <TableCell className="text-xs font-mono">{map.shopifySku || '—'}</TableCell>
                  <TableCell>{map.productName || map.productId}</TableCell>
                  <TableCell>{map.batchSerialNumber || '—'}</TableCell>
                  <TableCell>
                    <Select
                      value={map.syncDirection}
                      onValueChange={v => handleDirectionChange(map.id, v as ShopifySyncDirection)}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">{t('both')}</SelectItem>
                        <SelectItem value="import_only">{t('import_only')}</SelectItem>
                        <SelectItem value="export_only">{t('export_only')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {map.lastSyncedAt ? new Date(map.lastSyncedAt).toLocaleString() : t('Never')}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(map.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showPicker && (
        <ShopifyProductPicker
          products={shopifyProducts}
          existingMaps={maps}
          onClose={() => setShowPicker(false)}
          onMapped={onRefresh}
        />
      )}

      {showAutoMap && autoMapResult && (
        <ShopifyAutoMapDialog
          result={autoMapResult}
          onClose={() => setShowAutoMap(false)}
        />
      )}
    </div>
  );
}
