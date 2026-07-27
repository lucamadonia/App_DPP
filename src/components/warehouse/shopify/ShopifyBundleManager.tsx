import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, Plus, Trash2, Loader2, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  getShopifyBundles,
  saveShopifyBundle,
  setShopifyBundleActive,
  deleteShopifyBundle,
  fetchShopifyProducts,
  type ShopifyBundleComponentInput,
} from '@/services/supabase/shopify-integration';
import { getProducts, type ProductListItem } from '@/services/supabase/products';
import { getBatches } from '@/services/supabase/batches';
import type { ShopifyBundleMap, ShopifyProduct } from '@/types/shopify';
import type { BatchListItem } from '@/types/product';
import { useToast } from '@/hooks/use-toast';

/**
 * Manage Shopify "Sets": variants that arrive as a single line item but ship as
 * several articles.
 *
 * Without a definition here the import cannot resolve such a variant at all —
 * it lands as an unmapped line and the order shows up with missing (or zero)
 * positions. Defining the components makes the import explode the Set into
 * individual, scannable positions.
 */

interface DraftComponent extends ShopifyBundleComponentInput {
  /** Cached so the batch dropdown can be populated per row. */
  batches?: BatchListItem[];
}

export function ShopifyBundleManager() {
  const { t } = useTranslation('warehouse');
  const { toast } = useToast();

  const [bundles, setBundles] = useState<ShopifyBundleMap[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [fetchingShopify, setFetchingShopify] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ShopifyBundleMap | null>(null);
  const [variantKey, setVariantKey] = useState<string>('');
  const [components, setComponents] = useState<DraftComponent[]>([]);

  async function reload() {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([getShopifyBundles(), getProducts()]);
      setBundles(b);
      setProducts(p);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  /** Flat list of every Shopify variant, for the "which variant is a Set?" picker. */
  const variantOptions = shopifyProducts.flatMap(p =>
    (p.variants || []).map(v => ({
      key: `${p.id}:${v.id}`,
      productId: p.id,
      variantId: v.id,
      productTitle: p.title,
      variantTitle: v.title,
      sku: v.sku || undefined,
      barcode: v.barcode || undefined,
    })),
  );

  async function loadShopifyProducts() {
    setFetchingShopify(true);
    try {
      setShopifyProducts(await fetchShopifyProducts());
    } catch (err) {
      toast({ title: t('Error'), description: String(err), variant: 'destructive' });
    } finally {
      setFetchingShopify(false);
    }
  }

  async function openEditor(bundle?: ShopifyBundleMap) {
    if (shopifyProducts.length === 0) await loadShopifyProducts();
    setEditing(bundle || null);
    setVariantKey(bundle ? `${bundle.shopifyProductId}:${bundle.shopifyVariantId}` : '');
    if (bundle) {
      const drafts = await Promise.all(bundle.components.map(async c => ({
        componentProductId: c.componentProductId,
        componentBatchId: c.componentBatchId ?? null,
        quantity: c.quantity,
        autoBatch: c.autoBatch,
        batches: await getBatches(c.componentProductId),
      })));
      setComponents(drafts);
    } else {
      setComponents([]);
    }
    setEditorOpen(true);
  }

  /**
   * Copy another Set's components. Colour variants of the same Set usually
   * differ in a single pinned batch, so copying and swapping one row beats
   * re-entering eight components by hand.
   */
  async function copyFrom(bundleId: string) {
    const src = bundles.find(b => b.id === bundleId);
    if (!src) return;
    const drafts = await Promise.all(src.components.map(async c => ({
      componentProductId: c.componentProductId,
      componentBatchId: c.componentBatchId ?? null,
      quantity: c.quantity,
      autoBatch: c.autoBatch,
      batches: await getBatches(c.componentProductId),
    })));
    setComponents(drafts);
  }

  async function setComponentProduct(index: number, productId: string) {
    const batches = await getBatches(productId);
    setComponents(prev => prev.map((c, i) => i === index
      ? { ...c, componentProductId: productId, componentBatchId: null, batches }
      : c));
  }

  async function handleSave() {
    const opt = variantOptions.find(v => v.key === variantKey);
    if (!opt) {
      toast({ title: t('Please select a Shopify variant'), variant: 'destructive' });
      return;
    }
    if (components.length === 0 || components.some(c => !c.componentProductId)) {
      toast({ title: t('Every component needs a product'), variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await saveShopifyBundle({
        shopifyProductId: opt.productId,
        shopifyVariantId: opt.variantId,
        shopifyProductTitle: opt.productTitle,
        shopifyVariantTitle: opt.variantTitle,
        shopifySku: opt.sku,
        shopifyBarcode: opt.barcode,
        isActive: editing?.isActive ?? true,
        // Strip the cached batch list — it is UI state, not part of the payload.
        components: components.map((c) => ({
          componentProductId: c.componentProductId,
          componentBatchId: c.componentBatchId,
          quantity: c.quantity,
          autoBatch: c.autoBatch,
        })),
      });
      toast({ title: t('Set saved') });
      setEditorOpen(false);
      await reload();
    } catch (err) {
      toast({ title: t('Error'), description: String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(bundle: ShopifyBundleMap) {
    try {
      await deleteShopifyBundle(bundle.id);
      toast({ title: t('Set deleted') });
      await reload();
    } catch (err) {
      toast({ title: t('Error'), description: String(err), variant: 'destructive' });
    }
  }

  async function handleToggle(bundle: ShopifyBundleMap, active: boolean) {
    try {
      await setShopifyBundleActive(bundle.id, active);
      await reload();
    } catch (err) {
      toast({ title: t('Error'), description: String(err), variant: 'destructive' });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('Sets / Bundles')}
          </CardTitle>
          <CardDescription>
            {t('A Shopify Set arrives as one line item but ships as several articles. Define its components so each one becomes its own scannable position.')}
          </CardDescription>
        </div>
        <Button onClick={() => void openEditor()} disabled={fetchingShopify} className="shrink-0">
          {fetchingShopify ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">{t('Define Set')}</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {loading && <div className="text-sm text-muted-foreground">{t('Loading…')}</div>}

        {!loading && bundles.length === 0 && (
          <div className="text-sm text-muted-foreground py-6 text-center">
            {t('No Sets defined yet.')}
          </div>
        )}

        {bundles.map(b => (
          <div key={b.id} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-sm break-words">{b.shopifyProductTitle}</div>
                <div className="text-xs text-muted-foreground">
                  {b.shopifyVariantTitle} · {t('Variant')} {b.shopifyVariantId}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={b.isActive} onCheckedChange={v => void handleToggle(b, v)} />
                <Button variant="ghost" size="sm" onClick={() => void openEditor(b)}>{t('Edit')}</Button>
                <Button variant="ghost" size="sm" onClick={() => void handleDelete(b)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {b.components.length === 0 ? (
              <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t('No components — orders with this Set will arrive without positions')}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {b.components.map(c => (
                  <Badge key={c.id} variant="secondary" className="font-normal">
                    {c.quantity}× {c.productName || c.componentProductId.slice(0, 8)}
                    {c.batchSerialNumber && (
                      <span className="ml-1 opacity-60">· {c.batchSerialNumber}</span>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? t('Edit Set') : t('Define Set')}</DialogTitle>
            <DialogDescription>
              {t('Pick the Shopify variant that is sold as a Set, then list what physically goes in the box.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('Shopify variant')}</label>
              <Select value={variantKey} onValueChange={setVariantKey} disabled={!!editing}>
                <SelectTrigger><SelectValue placeholder={t('Select a variant')} /></SelectTrigger>
                <SelectContent>
                  {variantOptions.map(v => (
                    <SelectItem key={v.key} value={v.key}>
                      {v.productTitle}{v.variantTitle && v.variantTitle !== 'Default Title' ? ` — ${v.variantTitle}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {bundles.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('Copy components from')}</label>
                <Select onValueChange={v => void copyFrom(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Optional — start from an existing Set')} />
                  </SelectTrigger>
                  <SelectContent>
                    {bundles.map(b => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.shopifyProductTitle} — {b.shopifyVariantTitle} ({b.components.length})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('Components')}</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setComponents(prev => [
                    ...prev,
                    { componentProductId: '', componentBatchId: null, quantity: 1, autoBatch: true },
                  ])}
                >
                  <Plus className="h-4 w-4 mr-1" />{t('Add component')}
                </Button>
              </div>

              {components.length === 0 && (
                <div className="text-xs text-muted-foreground py-3 text-center border rounded-md border-dashed">
                  {t('No components yet.')}
                </div>
              )}

              {components.map((c, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-center border rounded-md p-2">
                  <Select value={c.componentProductId} onValueChange={v => void setComponentProduct(i, v)}>
                    <SelectTrigger><SelectValue placeholder={t('Product')} /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={c.componentBatchId || 'auto'}
                    onValueChange={v => setComponents(prev => prev.map((x, xi) =>
                      xi === i ? { ...x, componentBatchId: v === 'auto' ? null : v } : x))}
                  >
                    <SelectTrigger><SelectValue placeholder={t('Batch')} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">{t('Automatic (FEFO)')}</SelectItem>
                      {(c.batches || []).map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.serialNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    type="number"
                    min={1}
                    value={c.quantity}
                    onChange={e => setComponents(prev => prev.map((x, xi) =>
                      xi === i ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x))}
                    className="w-20"
                  />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setComponents(prev => prev.filter((_, xi) => xi !== i))}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}

              <p className="text-xs text-muted-foreground">
                {t('Pin a batch whenever the batch carries the variant — e.g. the wall panel is one product with a beige and a rose batch, and the Set colour decides which one ships.')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
