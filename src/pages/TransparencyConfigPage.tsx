import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Save,
  ChevronUp,
  ChevronDown,
  Package,
  Loader2,
  Globe,
  Copy,
  ExternalLink,
  Code,
  Palette,
  Check,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { getProducts, type ProductListItem } from '@/services/supabase/products';
import { getTransparencyConfig, saveTransparencyConfig } from '@/services/supabase/transparency';
import { getCurrentTenant } from '@/services/supabase/tenants';
import type { TransparencyPageConfig, TransparencyProductEntry, TransparencyDesignSettings, TransparencyThemePreset, TransparencyFontFamily, TransparencyHeroStyle, TransparencyCardStyle, TransparencyColorScheme } from '@/types/transparency';
import { DEFAULT_TRANSPARENCY_DESIGN, TRANSPARENCY_THEME_PRESETS } from '@/types/transparency';

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
  const [design, setDesign] = useState<TransparencyDesignSettings>({ ...DEFAULT_TRANSPARENCY_DESIGN });
  const [hasChanges, setHasChanges] = useState(false);
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    async function load() {
      try {
        const [products, cfg, tenant] = await Promise.all([
          getProducts(),
          getTransparencyConfig(),
          getCurrentTenant(),
        ]);

        if (tenant?.slug) setTenantSlug(tenant.slug);

        setAllProducts(products);
        setConfig(cfg);

        if (cfg) {
          setPageTitle(cfg.pageTitle ?? '');
          setPageDescription(cfg.pageDescription ?? '');
          setHeroImageUrl(cfg.heroImageUrl ?? '');
          if (cfg.design) setDesign({ ...DEFAULT_TRANSPARENCY_DESIGN, ...cfg.design });
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
      design,
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

      {/* Design */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Design
          </CardTitle>
          <CardDescription>
            Customize the look and feel of your transparency page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Presets */}
          <div className="space-y-2">
            <Label>Theme Preset</Label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {(Object.entries(TRANSPARENCY_THEME_PRESETS) as [TransparencyThemePreset, typeof TRANSPARENCY_THEME_PRESETS[TransparencyThemePreset]][]).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => {
                    const d: TransparencyDesignSettings = {
                      ...design,
                      preset: key,
                      ...(key !== 'default' ? {
                        primaryColor: preset.primaryColor,
                        accentColor: preset.accentColor,
                        pageBackground: preset.pageBackground,
                        cardBackground: preset.cardBackground,
                        colorScheme: preset.colorScheme,
                      } : {
                        primaryColor: null,
                        accentColor: null,
                        pageBackground: null,
                        cardBackground: null,
                        colorScheme: 'light',
                      }),
                    };
                    setDesign(d);
                    markChanged();
                  }}
                  className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-2 text-xs transition-colors ${
                    design.preset === key ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <div className="flex gap-0.5">
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: preset.primaryColor || '#3B82F6' }} />
                    <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: preset.pageBackground }} />
                  </div>
                  <span className="text-[10px] font-medium">{preset.label}</span>
                  {design.preset === key && (
                    <Check className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground p-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color Scheme */}
          <div className="space-y-2">
            <Label>Color Scheme</Label>
            <div className="flex gap-2">
              {([
                { value: 'light' as TransparencyColorScheme, icon: Sun, label: 'Light' },
                { value: 'dark' as TransparencyColorScheme, icon: Moon, label: 'Dark' },
                { value: 'auto' as TransparencyColorScheme, icon: Monitor, label: 'Auto' },
              ]).map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => { setDesign((d) => ({ ...d, colorScheme: value })); markChanged(); }}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    design.colorScheme === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="design-primary">Primary Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={design.primaryColor || '#3B82F6'}
                  onChange={(e) => { setDesign((d) => ({ ...d, primaryColor: e.target.value, preset: 'default' as TransparencyThemePreset })); markChanged(); }}
                  className="h-9 w-9 cursor-pointer rounded border p-0.5"
                />
                <Input
                  id="design-primary"
                  value={design.primaryColor || ''}
                  onChange={(e) => { setDesign((d) => ({ ...d, primaryColor: e.target.value || null, preset: 'default' as TransparencyThemePreset })); markChanged(); }}
                  placeholder="Tenant default"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="design-accent">Accent Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={design.accentColor || '#06B6D4'}
                  onChange={(e) => { setDesign((d) => ({ ...d, accentColor: e.target.value, preset: 'default' as TransparencyThemePreset })); markChanged(); }}
                  className="h-9 w-9 cursor-pointer rounded border p-0.5"
                />
                <Input
                  id="design-accent"
                  value={design.accentColor || ''}
                  onChange={(e) => { setDesign((d) => ({ ...d, accentColor: e.target.value || null, preset: 'default' as TransparencyThemePreset })); markChanged(); }}
                  placeholder="Auto"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="design-bg">Page Background</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={design.pageBackground || '#fafaf9'}
                  onChange={(e) => { setDesign((d) => ({ ...d, pageBackground: e.target.value, preset: 'default' as TransparencyThemePreset })); markChanged(); }}
                  className="h-9 w-9 cursor-pointer rounded border p-0.5"
                />
                <Input
                  id="design-bg"
                  value={design.pageBackground || ''}
                  onChange={(e) => { setDesign((d) => ({ ...d, pageBackground: e.target.value || null, preset: 'default' as TransparencyThemePreset })); markChanged(); }}
                  placeholder="Default"
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="design-card-bg">Card Background</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={design.cardBackground || '#ffffff'}
                  onChange={(e) => { setDesign((d) => ({ ...d, cardBackground: e.target.value, preset: 'default' as TransparencyThemePreset })); markChanged(); }}
                  className="h-9 w-9 cursor-pointer rounded border p-0.5"
                />
                <Input
                  id="design-card-bg"
                  value={design.cardBackground || ''}
                  onChange={(e) => { setDesign((d) => ({ ...d, cardBackground: e.target.value || null, preset: 'default' as TransparencyThemePreset })); markChanged(); }}
                  placeholder="Default"
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label>Font Family</Label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {([
                { value: 'dm-serif' as TransparencyFontFamily, label: 'DM Serif', preview: 'font-serif' },
                { value: 'system' as TransparencyFontFamily, label: 'System', preview: 'font-sans' },
                { value: 'inter' as TransparencyFontFamily, label: 'Inter', preview: 'font-sans' },
                { value: 'poppins' as TransparencyFontFamily, label: 'Poppins', preview: 'font-sans' },
                { value: 'playfair' as TransparencyFontFamily, label: 'Playfair', preview: 'font-serif' },
                { value: 'merriweather' as TransparencyFontFamily, label: 'Merriw.', preview: 'font-serif' },
              ]).map(({ value, label, preview }) => (
                <button
                  key={value}
                  onClick={() => { setDesign((d) => ({ ...d, fontFamily: value })); markChanged(); }}
                  className={`rounded-lg border px-2 py-2 text-center transition-colors ${
                    design.fontFamily === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  <span className={`text-lg ${preview}`}>Aa</span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Hero Style */}
          <div className="space-y-2">
            <Label>Hero Style</Label>
            <div className="flex gap-2">
              {([
                { value: 'gradient' as TransparencyHeroStyle, label: 'Gradient' },
                { value: 'solid' as TransparencyHeroStyle, label: 'Solid' },
                { value: 'image' as TransparencyHeroStyle, label: 'Image' },
                { value: 'minimal' as TransparencyHeroStyle, label: 'Minimal' },
              ]).map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => { setDesign((d) => ({ ...d, heroStyle: value })); markChanged(); }}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    design.heroStyle === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Hero Overlay Opacity */}
          {(design.heroStyle === 'gradient' || design.heroStyle === 'image') && (
            <div className="space-y-2">
              <Label>Hero Overlay Opacity: {design.heroOverlayOpacity}%</Label>
              <Slider
                value={[design.heroOverlayOpacity]}
                onValueChange={([v]) => { setDesign((d) => ({ ...d, heroOverlayOpacity: v })); markChanged(); }}
                min={0}
                max={80}
                step={5}
              />
            </div>
          )}

          {/* Card Style */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Card Corners</Label>
              <div className="flex gap-2">
                {([
                  { value: 'sharp' as TransparencyCardStyle, label: 'Sharp' },
                  { value: 'rounded' as TransparencyCardStyle, label: 'Rounded' },
                  { value: 'soft' as TransparencyCardStyle, label: 'Soft' },
                ]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setDesign((d) => ({ ...d, cardStyle: value })); markChanged(); }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      design.cardStyle === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Card Shadow</Label>
              <div className="flex gap-2">
                {([
                  { value: 'none' as const, label: 'None' },
                  { value: 'subtle' as const, label: 'Subtle' },
                  { value: 'medium' as const, label: 'Medium' },
                  { value: 'strong' as const, label: 'Strong' },
                ]).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => { setDesign((d) => ({ ...d, cardShadow: value })); markChanged(); }}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                      design.cardShadow === value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Show Powered By */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Show &quot;Powered by Trackbliss&quot;</Label>
              <p className="text-xs text-muted-foreground">Display branding in the footer</p>
            </div>
            <Switch
              checked={design.showPoweredBy}
              onCheckedChange={(checked) => { setDesign((d) => ({ ...d, showPoweredBy: checked })); markChanged(); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Share & Embed */}
      {tenantSlug && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Code className="h-4 w-4" />
              Share & Embed
            </CardTitle>
            <CardDescription>
              Preview your transparency page or embed it on your website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Public URL */}
            <div className="space-y-2">
              <Label>Public URL</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/transparency/${tenantSlug}`}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/transparency/${tenantSlug}`);
                    toast.success('URL copied');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a href={`/transparency/${tenantSlug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Embed Code */}
            <div className="space-y-2">
              <Label>Embed Code</Label>
              <div className="relative">
                <pre className="rounded-lg border bg-muted/30 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                  {`<iframe\n  src="${window.location.origin}/embed/transparency/${tenantSlug}?lang=de"\n  width="100%"\n  height="800"\n  frameborder="0"\n  style="border:none; border-radius:12px;"\n></iframe>`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<iframe src="${window.location.origin}/embed/transparency/${tenantSlug}?lang=de" width="100%" height="800" frameborder="0" style="border:none; border-radius:12px;"></iframe>`
                    );
                    toast.success('Embed code copied');
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </Button>
              </div>
            </div>

            {/* API Endpoint */}
            <div className="space-y-2">
              <Label>API Endpoint (JSON)</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/api/v1/public/products?tenant=${tenantSlug}`}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/v1/public/products?tenant=${tenantSlug}`);
                    toast.success('API URL copied');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
