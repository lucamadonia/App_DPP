import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Package, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FormSection, FormGrid, FormField, InputAffix, FormToggleRow } from '@/components/ui/form-layout';
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

  const loadLayers = useCallback(async () => {
    setIsLoading(true);
    const data = await getProductPackaging(productId);
    setLayers(data);
    setIsLoading(false);
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await getProductPackaging(productId);
      if (cancelled) return;
      setLayers(data);
      setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

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
    <FormSection
      title={t('Packaging Layers')}
      description={t('Add packaging layers to define all packaging components')}
      icon={Package}
      layout="stacked"
      variant="plain"
      aside={!readOnly && (
        <Button variant="outline" size="sm" className="pointer-coarse:min-h-11" onClick={handleAddLayer} disabled={isSaving === 'new'}>
          {isSaving === 'new' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          {t('Add Packaging Layer')}
        </Button>
      )}
    >
      {layers.length === 0 ? (
        <div className="rounded-lg border border-dashed py-8 text-center">
          <Package className="mx-auto mb-2 size-6 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">{t('No packaging layers yet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {layers.map((layer) => (
            <div key={layer.id} className="rounded-lg border bg-card p-4">
              <div className="mb-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-normal">
                      {t(LAYER_TYPES.find(lt => lt.value === layer.layerType)?.labelKey || layer.layerType)}
                    </Badge>
                    {isSaving === layer.id && (
                      <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-label={t('Saving...')} />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-pretty text-muted-foreground">
                    {t(LAYER_TYPES.find(lt => lt.value === layer.layerType)?.descKey || '')}
                  </p>
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 pointer-coarse:size-11"
                    aria-label={t('Delete', { ns: 'common' })}
                    onClick={() => handleDeleteLayer(layer.id)}
                    disabled={!!isSaving}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>

              <FormGrid cols={6}>
                <FormField label={t('Layer Type')} span={3} htmlFor={`layer-layer-type-${layer.id}`}>
                  <Select
                    value={layer.layerType}
                    onValueChange={(v) => handleUpdateLayer(layer.id, 'layerType', v as PackagingLayerType)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id={`layer-layer-type-${layer.id}`} className="w-full">
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
                </FormField>

                <FormField label={t('Packaging Type')} span={3} htmlFor={`layer-packaging-type-${layer.id}`}>
                  <Select
                    value={layer.packagingType || ''}
                    onValueChange={(v) => handleUpdateLayer(layer.id, 'packagingType', v as PackagingType)}
                    disabled={readOnly}
                  >
                    <SelectTrigger id={`layer-packaging-type-${layer.id}`} className="w-full">
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
                </FormField>

                <FormField label={t('Main Material')} span={3}>
                  <Input
                    placeholder={t('e.g. Cardboard')}
                    value={layer.material || ''}
                    onChange={(e) => handleUpdateLayer(layer.id, 'material', e.target.value)}
                    disabled={readOnly}
                  />
                </FormField>

                <FormField label={t('Recycling Code')} optional span={3}>
                  <Input
                    placeholder={t('e.g. PAP 21')}
                    value={layer.recyclingCode || ''}
                    onChange={(e) => handleUpdateLayer(layer.id, 'recyclingCode', e.target.value)}
                    disabled={readOnly}
                  />
                </FormField>

                <FormField label={t('Height')} optional span={2}>
                  <InputAffix suffix="cm">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="10"
                      value={layer.heightCm ?? ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'heightCm', e.target.value ? parseFloat(e.target.value) : undefined)}
                      disabled={readOnly}
                    />
                  </InputAffix>
                </FormField>
                <FormField label={t('Width')} optional span={2}>
                  <InputAffix suffix="cm">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="20"
                      value={layer.widthCm ?? ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'widthCm', e.target.value ? parseFloat(e.target.value) : undefined)}
                      disabled={readOnly}
                    />
                  </InputAffix>
                </FormField>
                <FormField label={t('Depth')} optional span={2}>
                  <InputAffix suffix="cm">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="5"
                      value={layer.depthCm ?? ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'depthCm', e.target.value ? parseFloat(e.target.value) : undefined)}
                      disabled={readOnly}
                    />
                  </InputAffix>
                </FormField>

                <FormField label={t('Weight')} optional span={3}>
                  <InputAffix suffix="g">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      placeholder="50"
                      value={layer.weightG ?? ''}
                      onChange={(e) => handleUpdateLayer(layer.id, 'weightG', e.target.value ? parseFloat(e.target.value) : undefined)}
                      disabled={readOnly}
                    />
                  </InputAffix>
                </FormField>
                <div className="flex items-end @md:col-span-3">
                  <FormToggleRow label={t('Recyclable')} htmlFor={`layer-recyclable-${layer.id}`} className="w-full">
                    <Switch
                      id={`layer-recyclable-${layer.id}`}
                      checked={layer.recyclable ?? false}
                      onCheckedChange={(v) => handleUpdateLayer(layer.id, 'recyclable', v)}
                      disabled={readOnly}
                    />
                  </FormToggleRow>
                </div>

                <FormField label={t('Packaging Description')} optional span="full">
                  <Textarea
                    placeholder={t('Describe the packaging...')}
                    value={layer.packagingDescription || ''}
                    onChange={(e) => handleUpdateLayer(layer.id, 'packagingDescription', e.target.value)}
                    disabled={readOnly}
                    rows={2}
                  />
                </FormField>
              </FormGrid>
            </div>
          ))}
        </div>
      )}
    </FormSection>
  );
}
