import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { gridStagger, gridItem, useReducedMotion } from '@/lib/motion';
import {
  Cpu,
  Shirt,
  ToyBrick,
  Armchair,
  FlaskConical,
  Package,
  BatteryCharging,
  Wifi,
  CircuitBoard,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { getProducts, type ProductListItem } from '@/services/supabase';
import type { MarketEntryCategory } from '@/services/supabase';
import type { MarketEntryFeatures } from '@/services/openrouter/market-entry-prompts';

const CATEGORY_OPTIONS: {
  id: MarketEntryCategory;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'electronics', labelKey: 'Electronics', icon: Cpu },
  { id: 'textiles', labelKey: 'Textiles', icon: Shirt },
  { id: 'toys', labelKey: 'Toys', icon: ToyBrick },
  { id: 'furniture', labelKey: 'Furniture', icon: Armchair },
  { id: 'cosmetics', labelKey: 'Cosmetics', icon: FlaskConical },
  { id: 'general', labelKey: 'General Goods', icon: Package },
];

const NONE_PRODUCT = '__none__';

interface CategoryFeatureStepProps {
  selectedCategory: MarketEntryCategory | null;
  onCategoryChange: (category: MarketEntryCategory) => void;
  selectedProductId: string | null;
  onProductChange: (productId: string | null, productName: string) => void;
  features: MarketEntryFeatures;
  onFeaturesChange: (features: MarketEntryFeatures) => void;
}

export function CategoryFeatureStep({
  selectedCategory,
  onCategoryChange,
  selectedProductId,
  onProductChange,
  features,
  onFeaturesChange,
}: CategoryFeatureStepProps) {
  const { t } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();
  const [products, setProducts] = useState<ProductListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    getProducts()
      .then((list) => {
        if (!cancelled) setProducts(list);
      })
      .catch(() => {
        /* product picker is optional — ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const GridWrapper = prefersReduced ? 'div' : motion.div;
  const gridProps = prefersReduced
    ? {}
    : { variants: gridStagger, initial: 'initial', animate: 'animate' };

  const featureToggles: {
    key: keyof MarketEntryFeatures;
    labelKey: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: 'hasElectronics', labelKey: 'Contains electronics', icon: CircuitBoard },
    { key: 'hasBattery', labelKey: 'Contains battery', icon: BatteryCharging },
    { key: 'hasWireless', labelKey: 'Contains wireless/radio', icon: Wifi },
  ];

  return (
    <div className="space-y-6">
      {/* Category chips */}
      <div>
        <Label className="mb-3 block text-sm font-medium">
          {t('Select Product Category')}
        </Label>
        <GridWrapper
          {...gridProps}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
        >
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const ItemWrapper = prefersReduced ? 'div' : motion.div;
            const itemProps = prefersReduced
              ? {}
              : { variants: gridItem, whileTap: { scale: 0.97 } };

            return (
              <ItemWrapper key={cat.id} {...itemProps}>
                <button
                  type="button"
                  onClick={() => onCategoryChange(cat.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'w-full min-h-[76px] flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3',
                    'transition-all duration-200 hover:border-primary/50 hover:shadow-sm',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card'
                  )}
                >
                  <cat.icon
                    className={cn(
                      'h-5 w-5',
                      isSelected ? 'text-primary' : 'text-muted-foreground'
                    )}
                  />
                  <span className="text-xs font-medium text-center leading-tight">
                    {t(cat.labelKey)}
                  </span>
                </button>
              </ItemWrapper>
            );
          })}
        </GridWrapper>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Optional product from catalog */}
        <div>
          <Label className="mb-2 block text-sm font-medium">
            {t('Product from your catalog (optional)')}
          </Label>
          <Select
            value={selectedProductId ?? NONE_PRODUCT}
            onValueChange={(value) => {
              if (value === NONE_PRODUCT) {
                onProductChange(null, '');
                return;
              }
              const product = products.find((p) => p.id === value);
              onProductChange(value, product?.name || '');
            }}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder={t('Select product...')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_PRODUCT}>{t('No product selected')}</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t('Used to tailor the AI deep-dive to your product.')}
          </p>
        </div>

        {/* Feature toggles */}
        <div>
          <Label className="mb-2 block text-sm font-medium">{t('Product Features')}</Label>
          <div className="space-y-2">
            {featureToggles.map((toggle) => (
              <label
                key={toggle.key}
                className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:border-primary/40"
              >
                <span className="flex items-center gap-2 text-sm">
                  <toggle.icon className="h-4 w-4 text-muted-foreground" />
                  {t(toggle.labelKey)}
                </span>
                <Switch
                  checked={features[toggle.key]}
                  onCheckedChange={(checked) =>
                    onFeaturesChange({ ...features, [toggle.key]: checked })
                  }
                  aria-label={t(toggle.labelKey)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
