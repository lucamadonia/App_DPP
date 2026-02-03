import { useTranslation } from 'react-i18next';
import { Package, Trash2, GripVertical, Leaf, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProductComponentPicker } from './ProductComponentPicker';
import { aggregateFromComponents } from '@/lib/product-set-aggregation';
import type { ProductListItem } from '@/services/supabase';
import type { ProductComponent, AggregationOverrides } from '@/types/product';

export interface ComponentEntry {
  tempId: string;
  dbId?: string;
  productId: string;
  productName: string;
  productGtin: string;
  productManufacturer: string;
  productImageUrl?: string;
  productCategory: string;
  quantity: number;
  sortOrder: number;
  notes?: string;
  // Data for aggregation preview
  materials?: ProductComponent['componentProduct'];
}

interface ProductComponentsStepProps {
  components: ComponentEntry[];
  setComponents: React.Dispatch<React.SetStateAction<ComponentEntry[]>>;
  parentProductId?: string;
  aggregationOverrides: AggregationOverrides;
}

export function ProductComponentsStep({
  components,
  setComponents,
  parentProductId,
  aggregationOverrides,
}: ProductComponentsStepProps) {
  const { t } = useTranslation('products');

  const handleAddComponent = (product: ProductListItem) => {
    const existing = components.find(c => c.productId === product.id);
    if (existing) return;

    setComponents(prev => [
      ...prev,
      {
        tempId: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        productId: product.id,
        productName: product.name,
        productGtin: product.gtin,
        productManufacturer: product.manufacturer,
        productImageUrl: product.imageUrl,
        productCategory: product.category,
        quantity: 1,
        sortOrder: prev.length,
      },
    ]);
  };

  const handleRemoveComponent = (tempId: string) => {
    setComponents(prev => prev.filter(c => c.tempId !== tempId));
  };

  const handleQuantityChange = (tempId: string, quantity: number) => {
    if (quantity < 1) return;
    setComponents(prev =>
      prev.map(c => (c.tempId === tempId ? { ...c, quantity } : c))
    );
  };

  // Build mock components for aggregation preview
  const mockComponents: ProductComponent[] = components
    .filter(c => c.materials)
    .map(c => ({
      id: c.tempId,
      parentProductId: parentProductId || '',
      componentProductId: c.productId,
      quantity: c.quantity,
      sortOrder: c.sortOrder,
      componentProduct: c.materials,
    }));

  const aggregation = mockComponents.length > 0
    ? aggregateFromComponents(mockComponents, {}, aggregationOverrides)
    : null;

  const excludeIds = components.map(c => c.productId);

  return (
    <div className="space-y-6">
      {/* Component Picker */}
      <div>
        <Label className="mb-2 block">{t('Add Component')}</Label>
        <ProductComponentPicker
          onSelect={handleAddComponent}
          excludeIds={excludeIds}
          parentProductId={parentProductId}
        />
      </div>

      {/* Components List */}
      {components.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{t('No components added yet')}</p>
            <p className="text-sm mt-1">
              {t('Add products to this set to bundle them together.')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {components.map((comp) => (
            <Card key={comp.tempId} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0 cursor-grab" />

                  {comp.productImageUrl ? (
                    <img
                      src={comp.productImageUrl}
                      alt={comp.productName}
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{comp.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {comp.productGtin} &middot; {comp.productManufacturer}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Label className="text-xs text-muted-foreground sr-only">
                      {t('Quantity')}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={comp.quantity}
                      onChange={e => handleQuantityChange(comp.tempId, parseInt(e.target.value) || 1)}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <span className="text-xs text-muted-foreground">×</span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveComponent(comp.tempId)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Aggregation Preview */}
      {components.length > 0 && aggregation && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Leaf className="h-4 w-4 text-primary" />
              {t('Aggregated from {{count}} components', { count: components.length })}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {aggregation.netWeight != null && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t('Net Weight')}</span>
                  </div>
                  <p className="text-sm font-medium">{aggregation.netWeight} g</p>
                </div>
              )}
              {aggregation.grossWeight != null && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Scale className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{t('Gross Weight')}</span>
                  </div>
                  <p className="text-sm font-medium">{aggregation.grossWeight} g</p>
                </div>
              )}
              {aggregation.carbonFootprint && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Leaf className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">CO₂</span>
                  </div>
                  <p className="text-sm font-medium">
                    {aggregation.carbonFootprint.totalKgCO2} kg CO₂
                    <Badge variant="outline" className="ml-2 text-xs">
                      {aggregation.carbonFootprint.rating}
                    </Badge>
                  </p>
                </div>
              )}
              {aggregation.recyclability.recyclablePercentage > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground">{t('Recyclability')}</span>
                  </div>
                  <p className="text-sm font-medium">
                    {aggregation.recyclability.recyclablePercentage}%
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
