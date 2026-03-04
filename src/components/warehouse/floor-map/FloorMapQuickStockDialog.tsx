import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Package, ArrowRightLeft, Pencil, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { QuantityStepper } from '@/components/warehouse/QuantityStepper';
import type { ZoneFurniture, WhStockLevel } from '@/types/warehouse';
import { isStorageFurniture } from './furniture-catalog';

export type QuickStockMode = 'add' | 'adjust' | 'move' | 'remove';

interface FloorMapQuickStockDialogProps {
  open: boolean;
  onClose: () => void;
  mode: QuickStockMode;
  furniture: ZoneFurniture;
  sectionId?: string;
  stockItem?: WhStockLevel;
  locationId: string;
  zoneName: string;
  allFurniture: ZoneFurniture[];
  onStockChanged?: () => void;
}

interface ProductOption {
  id: string;
  name: string;
}

interface BatchOption {
  id: string;
  serialNumber: string;
  productId: string;
}

const MODE_CONFIG = {
  add: { icon: Package, color: 'text-green-600', variant: 'default' as const },
  adjust: { icon: Pencil, color: 'text-blue-600', variant: 'default' as const },
  move: { icon: ArrowRightLeft, color: 'text-amber-600', variant: 'default' as const },
  remove: { icon: Trash2, color: 'text-red-600', variant: 'destructive' as const },
};

export function FloorMapQuickStockDialog({
  open,
  onClose,
  mode,
  furniture,
  sectionId,
  stockItem,
  locationId,
  zoneName,
  allFurniture,
  onStockChanged,
}: FloorMapQuickStockDialogProps) {
  const { t } = useTranslation('warehouse');

  // Add mode state
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState(sectionId ?? '');
  const [quantity, setQuantity] = useState(1);

  // Adjust mode state
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');

  // Move mode state
  const [targetFurnitureId, setTargetFurnitureId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [moveQuantity, setMoveQuantity] = useState(1);

  // Remove mode state
  const [removeReason, setRemoveReason] = useState('');

  // Loading state
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Reset on open/mode change
  useEffect(() => {
    if (!open) return;
    setSelectedSectionId(sectionId ?? furniture.sections[0]?.id ?? '');
    setQuantity(1);
    setAdjustQuantity(stockItem?.quantityAvailable ?? 0);
    setAdjustReason('');
    setTargetFurnitureId('');
    setTargetSectionId('');
    setMoveQuantity(stockItem?.quantityAvailable ?? 1);
    setRemoveReason('');
    setSelectedProductId('');
    setSelectedBatchId('');
    setBatches([]);
  }, [open, mode, sectionId, furniture, stockItem]);

  // Load products for add mode
  useEffect(() => {
    if (!open || mode !== 'add') return;
    let cancelled = false;
    const load = async () => {
      setLoadingProducts(true);
      try {
        const { getProducts } = await import('@/services/supabase/products');
        const items = await getProducts();
        if (!cancelled) {
          setProducts(items.map((p) => ({ id: p.id, name: p.name })));
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [open, mode]);

  // Load batches when product selected
  useEffect(() => {
    if (!selectedProductId) {
      setBatches([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingBatches(true);
      try {
        const { getBatches } = await import('@/services/supabase/batches');
        const items = await getBatches(selectedProductId);
        if (!cancelled) {
          setBatches(items.map((b) => ({
            id: b.id,
            serialNumber: b.serialNumber || b.id.slice(0, 8),
            productId: selectedProductId,
          })));
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingBatches(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedProductId]);

  // Target furniture sections
  const targetFurniture = allFurniture.find((f) => f.id === targetFurnitureId);
  const targetSections = targetFurniture?.sections ?? [];

  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  const handleSubmit = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'add') {
        if (!selectedProductId || !selectedBatchId || !selectedSectionId) {
          toast.error(t('Please fill all required fields'));
          return;
        }
        const { createGoodsReceipt } = await import('@/services/supabase/wh-stock');
        await createGoodsReceipt({
          locationId,
          productId: selectedProductId,
          batchId: selectedBatchId,
          quantity,
          binLocation: `${furniture.id}:${selectedSectionId}`,
          zone: zoneName,
        });
        toast.success(t('Stock added successfully'));
      } else if (mode === 'adjust') {
        if (!stockItem) return;
        const diff = adjustQuantity - stockItem.quantityAvailable;
        if (diff === 0) {
          onClose();
          return;
        }
        const { createStockAdjustment } = await import('@/services/supabase/wh-stock');
        await createStockAdjustment({
          stockId: stockItem.id,
          quantityChange: diff,
          reason: adjustReason || 'manual_adjustment',
        });
        toast.success(t('Adjustment saved'));
      } else if (mode === 'move') {
        if (!stockItem || !targetFurnitureId || !targetSectionId) {
          toast.error(t('Please fill all required fields'));
          return;
        }
        const newBin = `${targetFurnitureId}:${targetSectionId}`;
        const { moveStockBinLocation } = await import('@/services/supabase/wh-stock');
        await moveStockBinLocation({
          stockId: stockItem.id,
          newBinLocation: newBin,
          quantity: moveQuantity < stockItem.quantityAvailable ? moveQuantity : undefined,
        });
        toast.success(t('Stock moved successfully'));
      } else if (mode === 'remove') {
        if (!stockItem) return;
        const { removeStockFromSection } = await import('@/services/supabase/wh-stock');
        await removeStockFromSection({
          stockId: stockItem.id,
          reason: removeReason || undefined,
        });
        toast.success(t('Stock removed'));
      }
      onStockChanged?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [mode, selectedProductId, selectedBatchId, selectedSectionId, quantity, stockItem, adjustQuantity, adjustReason, targetFurnitureId, targetSectionId, moveQuantity, removeReason, furniture, locationId, zoneName, onStockChanged, onClose, t]);

  const modeTitle: Record<QuickStockMode, string> = {
    add: t('Add Stock'),
    adjust: t('Adjust Quantity'),
    move: t('Move Stock'),
    remove: t('Remove Stock'),
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.color}`} />
            {modeTitle[mode]}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {furniture.name} — {zoneName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* ===== ADD MODE ===== */}
          {mode === 'add' && (
            <>
              <div className="space-y-2">
                <Label className="text-xs">{t('Select Product')}</Label>
                <Select value={selectedProductId} onValueChange={(v) => { setSelectedProductId(v); setSelectedBatchId(''); }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={loadingProducts ? '...' : t('Select Product')} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{t('No products available')}</div>
                    )}
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('Select Batch')}</Label>
                <Select value={selectedBatchId} onValueChange={setSelectedBatchId} disabled={!selectedProductId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={loadingBatches ? '...' : t('Select Batch')} />
                  </SelectTrigger>
                  <SelectContent>
                    {batches.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">{t('No batches available')}</div>
                    )}
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.serialNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('Target Section')}</Label>
                <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {furniture.sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}{s.capacity ? ` (${t('Cap.')} ${s.capacity})` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                min={1}
                variant="green"
                label={t('Quantity')}
              />
            </>
          )}

          {/* ===== ADJUST MODE ===== */}
          {mode === 'adjust' && stockItem && (
            <>
              <div className="text-sm">
                <span className="font-medium">{stockItem.productName}</span>
                {stockItem.batchSerialNumber && (
                  <span className="text-muted-foreground ml-1.5">#{stockItem.batchSerialNumber}</span>
                )}
              </div>
              <QuantityStepper
                value={adjustQuantity}
                onChange={setAdjustQuantity}
                min={0}
                variant="orange"
                label={t('Quantity')}
              />
              <div className="space-y-2">
                <Label className="text-xs">{t('Adjustment reason')}</Label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder={t('Adjustment reason')}
                  className="h-9 text-sm"
                />
              </div>
            </>
          )}

          {/* ===== MOVE MODE ===== */}
          {mode === 'move' && stockItem && (
            <>
              <div className="text-sm">
                <span className="font-medium">{stockItem.productName}</span>
                {stockItem.batchSerialNumber && (
                  <span className="text-muted-foreground ml-1.5">#{stockItem.batchSerialNumber}</span>
                )}
                <span className="text-muted-foreground ml-2">({stockItem.quantityAvailable} {t('available')})</span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">{t('Target Furniture')}</Label>
                <Select value={targetFurnitureId} onValueChange={(v) => { setTargetFurnitureId(v); setTargetSectionId(''); }}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t('Target Furniture')} />
                  </SelectTrigger>
                  <SelectContent>
                    {allFurniture.filter((f) => isStorageFurniture(f.type)).map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {targetSections.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">{t('Target Section')}</Label>
                  <Select value={targetSectionId} onValueChange={setTargetSectionId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t('Target Section')} />
                    </SelectTrigger>
                    <SelectContent>
                      {targetSections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}{s.capacity ? ` (${t('Cap.')} ${s.capacity})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <QuantityStepper
                value={moveQuantity}
                onChange={setMoveQuantity}
                min={1}
                max={stockItem.quantityAvailable}
                variant="orange"
                label={t('Quantity to move')}
              />
            </>
          )}

          {/* ===== REMOVE MODE ===== */}
          {mode === 'remove' && stockItem && (
            <>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <div className="font-medium">{stockItem.productName}</div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    {stockItem.quantityAvailable} {t('units')} — {t('All stock will be removed')}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{t('Remove reason')}</Label>
                <Textarea
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder={t('Remove reason')}
                  className="text-sm min-h-[60px]"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button
            variant={config.variant}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '...' : modeTitle[mode]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
