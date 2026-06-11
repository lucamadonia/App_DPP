import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Package, Plus, Trash2, Save, Loader2, Layers, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  getSupplierProducts, assignProductToSupplier, removeProductFromSupplier, updateSupplierProduct,
  type ProductListItem,
} from '@/services/supabase';
import { SUPPLIER_ROLES, CURRENCIES, getEmptyProductForm } from './supplier-helpers';
import type { Supplier, SupplierProduct, PriceTier } from '@/types/database';

type SupplierProductWithName = SupplierProduct & { product_name?: string };

interface ProductAssignmentDialogProps {
  supplier: Supplier | null;
  products: ProductListItem[];
  onOpenChange: (open: boolean) => void;
  /** Called whenever assignments change so the caller can refresh counts/detail */
  onChanged: () => void;
}

/** Assign products to a supplier incl. volume pricing tier editor */
export function ProductAssignmentDialog({ supplier, products, onOpenChange, onChanged }: ProductAssignmentDialogProps) {
  const { t } = useTranslation('settings');

  const [supplierProducts, setSupplierProducts] = useState<SupplierProductWithName[]>([]);
  const [formData, setFormData] = useState<Partial<SupplierProduct>>(getEmptyProductForm());
  const [isBusy, setIsBusy] = useState(false);

  // Price tiers editor
  const [expandedPriceTiers, setExpandedPriceTiers] = useState<string | null>(null);
  const [editingTiers, setEditingTiers] = useState<PriceTier[]>([]);
  const [savingTiers, setSavingTiers] = useState(false);

  const supplierId = supplier?.id;

  const loadSupplierProducts = useCallback(async () => {
    if (!supplierId) return;
    try {
      const data = await getSupplierProducts(supplierId);
      setSupplierProducts(data);
    } catch (error) {
      console.error('Error loading supplier products:', error);
    }
  }, [supplierId]);

  useEffect(() => {
    if (supplierId) {
      setFormData(getEmptyProductForm());
      setExpandedPriceTiers(null);
      loadSupplierProducts();
    } else {
      setSupplierProducts([]);
    }
  }, [supplierId, loadSupplierProducts]);

  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getProductName = (sp: SupplierProductWithName) =>
    sp.product_name || products.find(p => p.id === sp.product_id)?.name || '—';

  const handleAssign = async () => {
    if (!supplier || !formData.product_id) return;
    setIsBusy(true);
    try {
      const result = await assignProductToSupplier({
        supplier_id: supplier.id,
        product_id: formData.product_id,
        role: formData.role || 'component',
        is_primary: formData.is_primary || false,
        lead_time_days: formData.lead_time_days,
        price_per_unit: formData.price_per_unit,
        currency: formData.currency || 'EUR',
        min_order_quantity: formData.min_order_quantity,
        notes: formData.notes,
      });
      if (!result.success) throw new Error(result.error || 'Assignment failed');
      await loadSupplierProducts();
      setFormData(getEmptyProductForm());
      onChanged();
    } catch (error) {
      console.error('Error assigning product:', error);
      toast.error(t('Error assigning product'));
    }
    setIsBusy(false);
  };

  const handleRemove = async (id: string) => {
    setIsBusy(true);
    try {
      const result = await removeProductFromSupplier(id);
      if (!result.success) throw new Error(result.error || 'Removal failed');
      await loadSupplierProducts();
      onChanged();
    } catch (error) {
      console.error('Error removing product:', error);
      toast.error(t('Error removing product'));
    }
    setIsBusy(false);
  };

  const handleSaveTiers = async (sp: SupplierProductWithName) => {
    // Validation: positive prices, ascending contiguous quantity ranges
    const valid = editingTiers.every((tier, i) => {
      if (tier.pricePerUnit <= 0) return false;
      if (tier.minQty < 1) return false;
      if (i > 0 && editingTiers[i - 1].maxQty !== null && tier.minQty !== editingTiers[i - 1].maxQty! + 1) return false;
      return true;
    });
    if (!valid && editingTiers.length > 0) {
      toast.error(t('Price tiers have gaps or invalid values'));
      return;
    }
    setSavingTiers(true);
    const result = await updateSupplierProduct(sp.id, {
      price_tiers: editingTiers.length > 0 ? editingTiers : null,
    });
    setSavingTiers(false);
    if (result.success) {
      toast.success(t('Tiers saved'));
      await loadSupplierProducts();
      setExpandedPriceTiers(null);
      onChanged();
    } else {
      toast.error(t('Failed to save tiers'));
    }
  };

  const availableProducts = products.filter(p => !supplierProducts.some(sp => sp.product_id === p.id));

  return (
    <Dialog open={!!supplier} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Assign Products')}</DialogTitle>
          <DialogDescription>{t('Supplier')}: {supplier?.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('Assign New Product')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>{t('Product')}</Label>
                <Select value={formData.product_id || ''} onValueChange={v => updateForm('product_id', v)}>
                  <SelectTrigger><SelectValue placeholder={t('Select product')} /></SelectTrigger>
                  <SelectContent>
                    {availableProducts.map(product => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>{t('Role')}</Label>
                  <Select value={formData.role || 'component'} onValueChange={v => updateForm('role', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPLIER_ROLES.map(role => (
                        <SelectItem key={role.value} value={role.value}>{t(role.labelKey)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('Lead Time (Days)')}</Label>
                  <Input type="number" value={formData.lead_time_days || ''} onChange={e => updateForm('lead_time_days', parseInt(e.target.value) || undefined)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <Label>{t('Price per Unit')}</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={formData.price_per_unit ?? ''} onChange={e => updateForm('price_per_unit', e.target.value ? parseFloat(e.target.value) : undefined)} />
                </div>
                <div>
                  <Label>{t('Currency')}</Label>
                  <Select value={formData.currency || 'EUR'} onValueChange={v => updateForm('currency', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('Min. Order Qty')}</Label>
                  <Input type="number" min="1" placeholder={t('e.g. 100')} value={formData.min_order_quantity ?? ''} onChange={e => updateForm('min_order_quantity', e.target.value ? parseInt(e.target.value) : undefined)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="assignment-is-primary" checked={formData.is_primary || false} onCheckedChange={v => updateForm('is_primary', v)} />
                <Label htmlFor="assignment-is-primary">{t('Primary Supplier')}</Label>
              </div>
              <Button onClick={handleAssign} disabled={!formData.product_id || isBusy} className="min-h-[44px] w-full sm:min-h-10">
                {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                {t('Assign')}
              </Button>
            </CardContent>
          </Card>

          <div>
            <h4 className="mb-2 text-sm font-medium tabular-nums">
              {t('Assigned Products ({{count}})', { count: supplierProducts.length })}
            </h4>
            {supplierProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No products assigned yet')}</p>
            ) : (
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {supplierProducts.map(sp => (
                  <div key={sp.id} className="rounded border bg-card">
                    <div className="flex items-center justify-between p-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{getProductName(sp)}</div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{t(SUPPLIER_ROLES.find(r => r.value === sp.role)?.labelKey || sp.role)}</span>
                            {sp.price_per_unit != null && (
                              <span className="tabular-nums">{sp.price_per_unit.toFixed(2)} {sp.currency || 'EUR'}</span>
                            )}
                            {sp.min_order_quantity != null && (
                              <span className="tabular-nums">{t('Min')}: {sp.min_order_quantity}</span>
                            )}
                            {sp.is_primary && <Badge variant="secondary" className="text-xs">{t('Primary Supplier')}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            if (expandedPriceTiers === sp.id) {
                              setExpandedPriceTiers(null);
                            } else {
                              setExpandedPriceTiers(sp.id);
                              setEditingTiers(sp.price_tiers ? [...sp.price_tiers] : []);
                            }
                          }}
                        >
                          <Layers className="mr-1 h-3 w-3" />
                          {t('Tiers')} ({sp.price_tiers?.length || 0})
                          {expandedPriceTiers === sp.id ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemove(sp.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Inline price tiers editor */}
                    {expandedPriceTiers === sp.id && (
                      <div className="space-y-2 border-t bg-muted/30 p-2">
                        <h5 className="text-xs font-medium">{t('Volume Pricing Tiers')}</h5>
                        {editingTiers.length === 0 ? (
                          <p className="text-xs text-muted-foreground">{t('No volume pricing configured')}</p>
                        ) : (
                          <div className="space-y-1.5">
                            {editingTiers.map((tier, i) => (
                              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-1.5">
                                <div>
                                  {i === 0 && <Label className="text-[10px]">{t('From Qty')}</Label>}
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-7 text-xs"
                                    value={tier.minQty}
                                    onChange={e => {
                                      const updated = [...editingTiers];
                                      updated[i] = { ...updated[i], minQty: parseInt(e.target.value) || 1 };
                                      setEditingTiers(updated);
                                    }}
                                  />
                                </div>
                                <div>
                                  {i === 0 && <Label className="text-[10px]">{t('To Qty')}</Label>}
                                  <Input
                                    type="number"
                                    min={1}
                                    className="h-7 text-xs"
                                    placeholder={t('unlimited')}
                                    value={tier.maxQty ?? ''}
                                    onChange={e => {
                                      const updated = [...editingTiers];
                                      updated[i] = { ...updated[i], maxQty: e.target.value ? parseInt(e.target.value) : null };
                                      setEditingTiers(updated);
                                    }}
                                  />
                                </div>
                                <div>
                                  {i === 0 && <Label className="text-[10px]">{t('Price/Unit')}</Label>}
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min={0.01}
                                    className="h-7 text-xs"
                                    value={tier.pricePerUnit}
                                    onChange={e => {
                                      const updated = [...editingTiers];
                                      updated[i] = { ...updated[i], pricePerUnit: parseFloat(e.target.value) || 0 };
                                      setEditingTiers(updated);
                                    }}
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => setEditingTiers(editingTiers.filter((_, idx) => idx !== i))}
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const lastTier = editingTiers[editingTiers.length - 1];
                              const newMinQty = lastTier ? (lastTier.maxQty ? lastTier.maxQty + 1 : lastTier.minQty + 100) : 1;
                              setEditingTiers([
                                // Set maxQty on previous last tier if it was unlimited
                                ...editingTiers.map((tier, i) =>
                                  i === editingTiers.length - 1 && tier.maxQty === null
                                    ? { ...tier, maxQty: newMinQty - 1 }
                                    : tier
                                ),
                                { minQty: newMinQty, maxQty: null, pricePerUnit: lastTier?.pricePerUnit || 1, currency: sp.currency || 'EUR' },
                              ]);
                            }}
                          >
                            <Plus className="mr-1 h-3 w-3" />{t('Add Tier')}
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={savingTiers}
                            onClick={() => handleSaveTiers(sp)}
                          >
                            {savingTiers ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
                            {t('Save Tiers')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Close', { ns: 'common' })}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
