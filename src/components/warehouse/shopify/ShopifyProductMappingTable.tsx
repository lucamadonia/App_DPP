import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, RefreshCw, Wand2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
} from '@/components/ui/responsive-table';
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

  const columns: ResponsiveTableColumn<ShopifyProductMap>[] = [
    {
      id: 'shopifyProduct',
      header: t('Shopify Products'),
      className: 'font-medium text-xs sm:text-sm',
      mobilePriority: 'title',
      cell: map => map.shopifyProductTitle || `#${map.shopifyProductId}`,
    },
    {
      id: 'variant',
      header: t('Variant'),
      className: 'text-xs sm:text-sm',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Variant'),
      cell: map => map.shopifyVariantTitle || '—',
    },
    {
      id: 'sku',
      header: t('SKU'),
      className: 'text-xs font-mono',
      hideBelow: 'lg',
      mobilePriority: 'meta',
      mobileLabel: t('SKU'),
      cell: map => map.shopifySku || '—',
    },
    {
      id: 'tbProduct',
      header: t('Trackbliss Product'),
      className: 'text-xs sm:text-sm',
      mobilePriority: 'subtitle',
      cell: map => map.productName || map.productId,
    },
    {
      id: 'tbBatch',
      header: t('Trackbliss Batch'),
      className: 'text-xs sm:text-sm',
      hideBelow: 'lg',
      mobilePriority: 'meta',
      mobileLabel: t('Trackbliss Batch'),
      cell: map => map.batchSerialNumber || '—',
    },
    {
      id: 'direction',
      header: t('Sync Direction'),
      hideBelow: 'sm',
      mobilePriority: 'meta',
      cell: map => (
        <Select
          value={map.syncDirection}
          onValueChange={v => handleDirectionChange(map.id, v as ShopifySyncDirection)}
        >
          <SelectTrigger className="w-full sm:w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="both">{t('both')}</SelectItem>
            <SelectItem value="import_only">{t('import_only')}</SelectItem>
            <SelectItem value="export_only">{t('export_only')}</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'lastSynced',
      header: t('Last Synced'),
      className: 'text-xs text-muted-foreground whitespace-nowrap',
      hideBelow: 'md',
      mobilePriority: 'meta',
      mobileLabel: t('Last Synced'),
      cell: map => (map.lastSyncedAt ? new Date(map.lastSyncedAt).toLocaleString() : t('Never')),
    },
    {
      id: 'actions',
      header: '',
      className: 'w-10',
      mobilePriority: 'meta',
      cell: map => (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(map.id)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleFetchProducts} disabled={fetching}>
          {fetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {t('Fetch Products')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleAutoMap} disabled={autoMapping || shopifyProducts.length === 0}>
          {autoMapping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
          {t('Auto-Map by GTIN')}
        </Button>
        {shopifyProducts.length > 0 && (
          <Badge variant="secondary" className="self-start sm:self-auto">{shopifyProducts.length} {t('Shopify Products')}</Badge>
        )}
      </div>

      <ResponsiveTable
        data={maps}
        columns={columns}
        rowKey={map => map.id}
        emptyState={
          <div className="rounded-lg border border-dashed p-6 sm:p-8 text-center text-xs sm:text-sm text-muted-foreground">
            {t('No product mappings')}
          </div>
        }
      />

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
