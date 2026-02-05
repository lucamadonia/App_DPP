import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, GripVertical, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getProductPackaging,
  createPackaging,
  updatePackaging,
  deletePackaging,
} from '@/services/supabase';
import type { ProductPackaging, PackagingLayerType, PackagingType } from '@/types/product';

interface PackagingLayersEditorProps {
  productId: string;
  readOnly?: boolean;
}

const LAYER_TYPES: { value: PackagingLayerType; labelKey: string; descKey: string }[] = [
  { value: 'primary', labelKey: 'layer.primary', descKey: 'layer.primary.desc' },
  { value: 'secondary', labelKey: 'layer.secondary', descKey: 'layer.secondary.desc' },
  { value: 'tertiary', labelKey: 'layer.tertiary', descKey: 'layer.tertiary.desc' },
  { value: 'transport', labelKey: 'layer.transport', descKey: 'layer.transport.desc' },
];

const PACKAGING_TYPES: PackagingType[] = [
  'box', 'blister', 'bottle', 'pouch', 'can', 'tube', 'bag', 'clamshell', 'wrap', 'pallet', 'other'
];

export function PackagingLayersEditor({ productId, readOnly = false }: PackagingLayersEditorProps) {
  const { t } = useTranslation('products');
  const [layers, setLayers] = useState<ProductPackaging[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  useEffect(() => {
    loadLayers();
  }, [productId]);

  const loadLayers = async () => {
    setIsLoading(true);
    const data = await getProductPackaging(productId);
    setLayers(data);
    setIsLoading(false);
  };

  const handleAddLayer = async () => {
    // Find next available layer type
    const usedTypes = new Set(layers.map(l => l.layerType));
    const nextType = LAYER_TYPES.find(lt => !usedTypes.has(lt.value))?.value || 'primary';

    setIsSaving('new');
    const result = await createPackaging({
      productId,
      layerType: nextType,
    });
    if (result.success) {
      await loadLayers();
    }
    setIsSaving(null);
  };

  const handleUpdateLayer = async (id: string, field: keyof ProductPackaging, value: unknown) => {
    // Optimistic update
    setLayers(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));

    setIsSaving(id);
    await updatePackaging(id, { [field]: value });
    setIsSaving(null);
  };

  const handleDeleteLayer = async (id: string) => {
    setIsSaving(id);
    const result = await deletePackaging(id);
    if (result.success) {
      setLayers(prev => prev.filter(l => l.id !== id));
    }
    setIsSaving(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          {t('Packaging Layers')}
        </h3>
        {!readOnly && (
          <Button variant="outline" size="sm" onClick={handleAddLayer} disabled={isSaving === 'new'}>
            {isSaving === 'new' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {t('Add Packaging Layer')}
          </Button>
        )}
      </div>

      {layers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('No packaging layers yet')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('Add packaging layers to define all packaging components')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {layers.map((layer) => (
            <Card key={layer.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {!readOnly && (
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    )}
                    <Badge variant="outline" className="font-normal">
                      {t(LAYER_TYPES.find(lt => lt.value === layer.layerType)?.labelKey || layer.layerType)}
                    </Badge>
                    {isSaving === layer.id && (
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteLayer(layer.id)}
                      disabled={!!isSaving}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {t(LAYER_TYPES.find(lt => lt.value === layer.layerType)?.descKey || '')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Layer Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Layer Type')}</label>
                    <Select
                      value={layer.layerType}
                      onValueChange={(v) => handleUpdateLayer(layer.id, 'layerType', v as PackagingLayerType)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LAYER_TYPES.map(lt => (
                          <SelectItem key={lt.value} value={lt.value}>
                            {t(lt.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Packaging Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Packaging Type')}</label>
                    <Select
                      value={layer.packagingType || ''}
                      onValueChange={(v) => handleUpdateLayer(layer.id, 'packagingType', v as PackagingType)}
                      disabled={readOnly}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('Select packaging type...')} />
                      </SelectTrigger>
                      <SelectContent>
                        {PACKAGING_TYPES.map(pt => (
                          <SelectItem key={pt} value={pt}>
                            {t(`packaging.${pt}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Material */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Main Material')}</label>
                    <Input
                      className="h-9"
                      placeholder={t('e.g. Cardboard')}
                      value={layer.material || ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'material', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>

                  {/* Recycling Code */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">{t('Recycling Code')}</label>
                    <Input
                      className="h-9"
                      placeholder={t('e.g. PAP 21')}
                      value={layer.recyclingCode || ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'recyclingCode', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                </div>

                {/* Dimensions Row */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('Height (cm)')}</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      className="h-9"
                      placeholder={t('e.g. 10')}
                      value={layer.heightCm ?? ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'heightCm', e.target.value ? parseFloat(e.target.value) : undefined)}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('Width (cm)')}</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      className="h-9"
                      placeholder={t('e.g. 20')}
                      value={layer.widthCm ?? ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'widthCm', e.target.value ? parseFloat(e.target.value) : undefined)}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('Depth (cm)')}</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      className="h-9"
                      placeholder={t('e.g. 5')}
                      value={layer.depthCm ?? ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'depthCm', e.target.value ? parseFloat(e.target.value) : undefined)}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t('Packaging Weight (g)')}</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      className="h-9"
                      placeholder={t('e.g. 50')}
                      value={layer.weightG ?? ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'weightG', e.target.value ? parseFloat(e.target.value) : undefined)}
                      disabled={readOnly}
                    />
                  </div>
                  <div className="space-y-1 flex items-end">
                    <label className="flex items-center gap-2 h-9">
                      <input
                        type="checkbox"
                        checked={layer.recyclable ?? false}
                        onChange={(e) => handleUpdateLayer(layer.id, 'recyclable', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                        disabled={readOnly}
                      />
                      <span className="text-sm">{t('Recyclable')}</span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">{t('Packaging Description')}</label>
                  <textarea
                    className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder={t('Describe the packaging...')}
                    value={layer.packagingDescription || ''}
                    onChange={(e) => handleUpdateLayer(layer.id, 'packagingDescription', e.target.value)}
                    disabled={readOnly}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
