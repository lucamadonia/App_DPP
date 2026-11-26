import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
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
  Lock,
  Unlock,
} from 'lucide-react';
import { FormSection, FormGrid, FormField, FormToggleRow, FormActions, FormSectionNav } from '@/components/ui/form-layout';
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
import type { TransparencyPageConfig, TransparencyProductEntry, TransparencyDesignSettings, TransparencyThemePreset, TransparencyFontFamily, TransparencyHeroStyle, TransparencyCardStyle, TransparencyColorScheme, TransparencyAccessControl } from '@/types/transparency';
import { DEFAULT_TRANSPARENCY_DESIGN, TRANSPARENCY_THEME_PRESETS, DEFAULT_TRANSPARENCY_ACCESS_CONTROL } from '@/types/transparency';
import { getPublicBaseUrl } from '@/lib/platform';

interface MergedProduct {
  product: ProductListItem;
  enabled: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  live: { label: 'Live', className: 'bg-success/10 text-success border-success/20' },
  draft: { label: 'Draft', className: 'bg-warning/10 text-warning border-warning/20' },
  archived: { label: 'Archived', className: 'bg-muted text-muted-foreground border-border' },
};

export function TransparencyConfigPage() {
  const { t } = useTranslation('dpp');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<TransparencyPageConfig | null>(null);
  const [allProducts, setAllProducts] = useState<ProductListItem[]>([]);
  const [mergedProducts, setMergedProducts] = useState<MergedProduct[]>([]);
  const [pageTitle, setPageTitle] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [section, setSection] = useState('page');
  const [design, setDesign] = useState<TransparencyDesignSettings>({ ...DEFAULT_TRANSPARENCY_DESIGN });
  const [accessControl, setAccessControl] = useState<TransparencyAccessControl>({ ...DEFAULT_TRANSPARENCY_ACCESS_CONTROL });
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
          if (cfg.accessControl) setAccessControl({ ...DEFAULT_TRANSPARENCY_ACCESS_CONTROL, ...cfg.accessControl });
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
        toast.error(i18n.t('Failed to load configuration', { ns: 'dpp' }));
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
      accessControl,
    };

    const result = await saveTransparencyConfig(updatedConfig);

    if (result.success) {
      toast.success(t('Configuration saved'));
      setHasChanges(false);
      // Reload to get the ID if it was a new insert
      const refreshed = await getTransparencyConfig();
      if (refreshed) setConfig(refreshed);
    } else {
      toast.error(t('Failed to save: {{error}}', { error: result.error }));
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{t('Transparency Page')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('Configure the public product transparency page')}
            </p>
          </div>
        </div>
      </div>

      <FormSectionNav
        label={t('Transparency Page')}
        value={section}
        onValueChange={setSection}
        sections={[
          { id: 'page', label: t('Page'), icon: Globe },
          { id: 'access', label: t('Access'), icon: accessControl.enabled ? Lock : Unlock },
          { id: 'products', label: t('Products'), icon: Package, badge: undefined },
          { id: 'design', label: t('Design'), icon: Palette },
          ...(tenantSlug ? [{ id: 'share', label: t('Share & Embed'), icon: Code }] : []),
        ]}
      >
      {/* Page Settings */}
      {section === 'page' && (
      <FormSection
        layout="stacked"
        title={t('Page Settings')}
        description={t('Override the default title and description shown on the transparency page. Leave empty to use defaults.')}
      >
        <FormGrid cols={2}>
          <FormField label={t('Page Title')} htmlFor="page-title" optional span="full">
            <Input
              id="page-title"
              value={pageTitle}
              onChange={(e) => { setPageTitle(e.target.value); markChanged(); }}
              placeholder={t('e.g. Product Transparency')}
            />
          </FormField>
          <FormField label={t('Page Description')} htmlFor="page-desc" optional span="full">
            <Textarea
              id="page-desc"
              value={pageDescription}
              onChange={(e) => { setPageDescription(e.target.value); markChanged(); }}
              placeholder={t('e.g. Materials, certificates & packaging — everything at a glance')}
              rows={3}
            />
          </FormField>
          <FormField label={t('Hero Image URL')} htmlFor="hero-img" optional span="full">
            <Input
              id="hero-img"
              type="url"
              inputMode="url"
              value={heroImageUrl}
              onChange={(e) => { setHeroImageUrl(e.target.value); markChanged(); }}
              placeholder="https://..."
            />
          </FormField>
        </FormGrid>
      </FormSection>
      )}

      {/* Access Control */}
      {section === 'access' && (
      <FormSection
        layout="stacked"
        icon={accessControl.enabled ? Lock : Unlock}
        title={t('Access Control')}
        description={t('Restrict access to the transparency page by requiring a valid order number.')}
      >
        <div className="space-y-5">
          <FormToggleRow
            htmlFor="require-order"
            label={t('Require Order Number')}
            description={accessControl.enabled
              ? t('Visitors must enter a valid order number to view products')
              : t('Anyone with the link can view the transparency page')}
          >
            <Switch
              id="require-order"
              aria-describedby="require-order-description"
              checked={accessControl.enabled}
              onCheckedChange={(checked) => {
                setAccessControl((prev) => ({ ...prev, enabled: checked }));
                markChanged();
              }}
            />
          </FormToggleRow>
          {accessControl.enabled && (
            <>
              <FormField
                label={t('Order Number Prefix')}
                htmlFor="order-prefix"
                hint={t('The visitor\'s order number must start with this prefix. E.g. if you set "FB", order numbers like "FB-20240301-001" or "FB12345" will be accepted.')}
              >
                <Input
                  id="order-prefix"
                  value={accessControl.orderPrefix}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    setAccessControl((prev) => ({ ...prev, orderPrefix: val }));
                    markChanged();
                  }}
                  placeholder={t('e.g. 1234 or FB')}
                  maxLength={10}
                  className="font-mono"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </FormField>
              {accessControl.orderPrefix && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('Preview')}</p>
                  <p className="text-sm">
                    {t('Accepted:')} <code className="bg-success/10 text-success px-1.5 py-0.5 rounded text-xs font-mono">{accessControl.orderPrefix}20240301-001</code>
                  </p>
                  <p className="text-sm mt-1">
                    {t('Rejected:')} <code className="bg-destructive/10 text-destructive px-1.5 py-0.5 rounded text-xs font-mono">XX9999</code>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </FormSection>
      )}

      {/* Products */}
      {section === 'products' && (
      <FormSection
        layout="stacked"
        title={t('Products')}
        description={t('{{enabled}} of {{total}} products enabled for the transparency page', { enabled: enabledCount, total: allProducts.length })}
      >
          {allProducts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('No products found. Create products first.')}
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
                    <Badge variant="outline" className={`shrink-0 text-xs ${status.className}`}>
                      {t(status.label)}
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
                            aria-label={t('Move up')}
                            onClick={() => handleMoveUp(product.id)}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            disabled={isLast}
                            aria-label={t('Move down')}
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
                      aria-label={t('Show {{name}} on the transparency page', { name: product.name })}
                    />
                  </div>
                );
              })}
            </div>
          )}
      </FormSection>
      )}

      {/* Design */}
      {section === 'design' && (
      <FormSection
        layout="stacked"
        icon={Palette}
        title={t('Design')}
        description={t('Customize the look and feel of your transparency page.')}
      >
        <div className="space-y-6">
          {/* Theme Presets */}
          <div className="space-y-2">
            <Label>{t('Theme Preset')}</Label>
            <div className="grid grid-cols-3 min-[400px]:grid-cols-4 sm:grid-cols-7 gap-2">
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
                  <span className="text-xs font-medium">{t(preset.label)}</span>
                  {design.preset === key && (
                    <Check className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground p-0.5" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color Scheme */}
          <div className="space-y-2">
            <Label>{t('Color Scheme')}</Label>
            <div className="flex flex-wrap gap-2">
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
                  {t(label)}
                </button>
              ))}
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="design-primary">{t('Primary Color')}</Label>
              <div className="flex flex-wrap gap-2">
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
                  placeholder={t('Tenant default')}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="design-accent">{t('Accent Color')}</Label>
              <div className="flex flex-wrap gap-2">
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
                  placeholder={t('Auto')}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="design-bg">{t('Page Background')}</Label>
              <div className="flex flex-wrap gap-2">
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
                  placeholder={t('Default')}
                  className="font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="design-card-bg">{t('Card Background')}</Label>
              <div className="flex flex-wrap gap-2">
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
                  placeholder={t('Default')}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label>{t('Font Family')}</Label>
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
                  <p className="text-xs text-muted-foreground mt-0.5">{value === 'system' ? t(label) : label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Hero Style */}
          <div className="space-y-2">
            <Label>{t('Hero Style')}</Label>
            <div className="flex flex-wrap gap-2">
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
                  {t(label)}
                </button>
              ))}
            </div>
          </div>

          {/* Hero Overlay Opacity */}
          {(design.heroStyle === 'gradient' || design.heroStyle === 'image') && (
            <div className="space-y-2">
              <Label>{t('Hero Overlay Opacity: {{value}}%', { value: design.heroOverlayOpacity })}</Label>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Card Corners')}</Label>
              <div className="flex flex-wrap gap-2">
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
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Card Shadow')}</Label>
              <div className="flex flex-wrap gap-2">
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
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Show Powered By */}
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label>{t('Show "Powered by Trackbliss"')}</Label>
              <p className="text-xs text-muted-foreground">{t('Display branding in the footer')}</p>
            </div>
            <Switch
              checked={design.showPoweredBy}
              onCheckedChange={(checked) => { setDesign((d) => ({ ...d, showPoweredBy: checked })); markChanged(); }}
            />
          </div>
        </div>
      </FormSection>
      )}

      {/* Share & Embed */}
      {section === 'share' && tenantSlug && (
        <FormSection
          layout="stacked"
          icon={Code}
          title={t('Share & Embed')}
          description={t('Preview your transparency page or embed it on your website.')}
        >
          <div className="space-y-4">
            {/* Public URL */}
            <div className="space-y-2">
              <Label>{t('Public URL')}</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  readOnly
                  value={`${getPublicBaseUrl()}/transparency/${tenantSlug}`}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${getPublicBaseUrl()}/transparency/${tenantSlug}`);
                    toast.success(t('URL copied'));
                  }}
                  aria-label={t('Copy URL')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  asChild
                >
                  <a href={`/transparency/${tenantSlug}`} target="_blank" rel="noopener noreferrer" aria-label={t('Open public page')}>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            {/* Embed Code */}
            <div className="space-y-2">
              <Label>{t('Embed Code')}</Label>
              <div className="relative">
                <pre className="rounded-lg border bg-muted/30 p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                  {`<iframe\n  src="${getPublicBaseUrl()}/embed/transparency/${tenantSlug}?lang=de"\n  width="100%"\n  height="800"\n  frameborder="0"\n  style="border:none; border-radius:12px;"\n></iframe>`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `<iframe src="${getPublicBaseUrl()}/embed/transparency/${tenantSlug}?lang=de" width="100%" height="800" frameborder="0" style="border:none; border-radius:12px;"></iframe>`
                    );
                    toast.success(t('Embed code copied'));
                  }}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  {t('Copy')}
                </Button>
              </div>
            </div>

            {/* API Endpoint */}
            <div className="space-y-2">
              <Label>{t('API Endpoint (JSON)')}</Label>
              <div className="flex flex-wrap gap-2">
                <Input
                  readOnly
                  value={`${getPublicBaseUrl()}/api/v1/public/products?tenant=${tenantSlug}`}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(`${getPublicBaseUrl()}/api/v1/public/products?tenant=${tenantSlug}`);
                    toast.success(t('API URL copied'));
                  }}
                  aria-label={t('Copy API URL')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </FormSection>
      )}
      </FormSectionNav>

      <FormActions sticky="page" dirty={hasChanges}>
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {t('Save')}
        </Button>
      </FormActions>
    </div>
  );
}
