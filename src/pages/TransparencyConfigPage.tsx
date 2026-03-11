import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Save,
  ChevronUp,
  ChevronDown,
  Package,
  Loader2,
  Globe,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { getProducts, type ProductListItem } from '@/services/supabase/products';
import { getTransparencyConfig, saveTransparencyConfig } from '@/services/supabase/transparency';
import type { TransparencyPageConfig, TransparencyProductEntry } from '@/types/transparency';

interface MergedProduct {
  product: ProductListItem;
  enabled: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  draft: { label: 'Draft', className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  archived: { label: 'Archived', className: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
};

export function TransparencyConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TransparencyPageConfig | null>(null);
  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]);
  const [mergedProducts, setMergedProducts] = useState<MergedProduct[]>([]);
  const [pageTitle, setPageTitle] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load data on mount
  useEffect(() => {
    async function load() {
      try {
        const [products, cfg] = await Promise.all([
          getProducts(),
          getTransparencyConfig(),
        ]);

        setAllProducts(products);
        setConfig(cfg);

        if (cfg) {
          setPageTitle(cfg.pageTitle ?? '');
          setPageDescription(cfg.pageDescription ?? '');
          setHeroImageUrl(cfg.heroImageUrl ?? '');
        }

        // Merge products with config
        const configMap = new Map<string, boolean>();
        const configOrder = new Map<string, number>();
        (cfg?.products ?? []).forEach((entry, idx) => {
          configMap.set(entry.product_id, entry.enabled);
          configOrder.set(entry.product_id, idx);
        });

        const merged: MergedProduct[] = products.map((p) => ({
          product: p,
          enabled: configMap.get(p.id) ?? false,
        }));

        // Sort: enabled first (in config order), then disabled (alphabetically)
        merged.sort((a, b) => {
          if (a.enabled && !b.enabled) return -1;
          if (!a.enabled && b.enabled) return 1;
          if (a.enabled && b.enabled) {
            return (configOrder.get(a.product.id) ?? 0) - (configOrder.get(b.product.id) ?? 0);
          }
          return a.product.name.localeCompare(b.product.name);
        });

        setMergedProducts(merged);
      } catch (err) {
        console.error('Failed to load transparency config:', err);
        toast.error('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const markChanged = useCallback(() => setHasChanges(true), []);

  const handleToggle = useCallback((productId: string, enabled: boolean) => {
    setMergedProducts((prev) => {
      const updated = prev.map((m) =>
        m.product.id === productId ? { ...m, enabled } : m
      );
      // Re-sort: enabled first in current relative order, disabled alphabetically
      const enabledItems = updated.filter((m) => m.enabled);
      const disabledItems = updated
        .filter((m) => !m.enabled)
        .sort((a, b) => a.product.name.localeCompare(b.product.name));
      return [...enabledItems, ...disabledItems];
    });
    markChanged();
  }, [markChanged]);

  const handleMoveUp = useCallback((productId: string) => {
    setMergedProducts((prev) => {
      const enabledItems = prev.filter((m) => m.enabled);
      const disabledItems = prev.filter((m) => !m.enabled);
      const idx = enabledItems.findIndex((m) => m.product.id === productId);
      if (idx <= 0) return prev;
      [enabledItems[idx - 1], enabledItems[idx]] = [enabledItems[idx], enabledItems[idx - 1]];
      return [...enabledItems, ...disabledItems];
    });
    markChanged();
  }, [markChanged]);

  const handleMoveDown = useCallback((productId: string) => {
    setMergedProducts((prev) => {
      const enabledItems = prev.filter((m) => m.enabled);
      const disabledItems = prev.filter((m) => !m.enabled);
      const idx = enabledItems.findIndex((m) => m.product.id === productId);
      if (idx < 0 || idx >= enabledItems.length - 1) return prev;
      [enabledItems[idx], enabledItems[idx + 1]] = [enabledItems[idx + 1], enabledItems[idx]];
      return [...enabledItems, ...disabledItems];
    });
    markChanged();
  }, [markChanged]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);

    const enabledProducts: TransparencyProductEntry[] = mergedProducts
      .filter((m) => m.enabled)
      .map((m) => ({ product_id: m.product.id, enabled: true }));

    const updatedConfig: TransparencyPageConfig = {
      ...config,
      pageTitle: pageTitle.trim() || null,
      pageDescription: pageDescription.trim() || null,
      heroImageUrl: heroImageUrl.trim() || null,
      products: enabledProducts,
    };

    const result = await saveTransparencyConfig(updatedConfig);

    if (result.success) {
      toast.success('Configuration saved');
      setHasChanges(false);
      // Reload to get the ID if it was a new insert
      const refreshed = await getTransparencyConfig();
      if (refreshed) setConfig(refreshed);
    } else {
      toast.error(`Failed to save: ${result.error}`);
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const enabledCount = mergedProducts.filter((m) => m.enabled).length;
  const enabledItems = mergedProducts.filter((m) => m.enabled);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Transparency Page</h1>
            <p className="text-sm text-muted-foreground">
              Configure the public product transparency page
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>

      {/* Page Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Page Settings</CardTitle>
          <CardDescription>
            Override the default title and description shown on the transparency page.
            Leave empty to use defaults.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="page-title">Page Title</Label>
            <Input
              id="page-title"
              value={pageTitle}
              onChange={(e) => { setPageTitle(e.target.value); markChanged(); }}
              placeholder="e.g. Product Transparency"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-desc">Page Description</Label>
            <Textarea
              id="page-desc"
              value={pageDescription}
              onChange={(e) => { setPageDescription(e.target.value); markChanged(); }}
              placeholder="e.g. Materials, certificates & packaging — everything at a glance"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-img">Hero Image URL</Label>
            <Input
              id="hero-img"
              value={heroImageUrl}
              onChange={(e) => { setHeroImageUrl(e.target.value); markChanged(); }}
              placeholder="https://..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Products</CardTitle>
          <CardDescription>
            {enabledCount} of {allProducts.length} products enabled for the transparency page
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No products found. Create products first.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border">
              {mergedProducts.map((item) => {
                const { product, enabled } = item;
                const status = STATUS_CONFIG[product.status ?? 'draft'] ?? STATUS_CONFIG.draft;
                const enabledIdx = enabledItems.findIndex((e) => e.product.id === product.id);
                const isFirst = enabledIdx === 0;
                const isLast = enabledIdx === enabledItems.length - 1;

                return (
                  <div
                    key={product.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      enabled ? 'bg-card' : 'bg-muted/30'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/50">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>

                    {/* Name + GTIN */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      {product.gtin && (
                        <p className="truncate text-xs text-muted-foreground">{product.gtin}</p>
                      )}
                    </div>

                    {/* Status */}
                    <Badge variant="outline" className={`shrink-0 text-[11px] ${status.className}`}>
                      {status.label}
                    </Badge>

                    {/* Reorder (only for enabled) */}
                    <div className="flex w-14 shrink-0 justify-end gap-0.5">
                      {enabled ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isFirst}
                            onClick={() => handleMoveUp(product.id)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isLast}
                            onClick={() => handleMoveDown(product.id)}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="h-7 w-14" />
                      )}
                    </div>

                    {/* Toggle */}
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => handleToggle(product.id, checked)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
