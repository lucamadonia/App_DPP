import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Package, Plus, Trash2, Save, Loader2, Layers, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormSections, FormSection, FormGrid, FormField, InputAffix, FormToggleRow, FormActions } from '@/components/ui/form-layout';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
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
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto pb-0">
        <DialogHeader>
          <DialogTitle>{t('Assign Products')}</DialogTitle>
          <DialogDescription>{t('Supplier')}: {supplier?.name}</DialogDescription>
        </DialogHeader>

        <FormSections>
          <FormSection
            title={t('Assign New Product')}
            icon={Plus}
            layout="stacked"
          >
            <FormGrid cols={6}>
              <FormField label={t('Product')} required span="full" htmlFor="assign-product">
                <Select value={formData.product_id || ''} onValueChange={v => updateForm('product_id', v)}>
                  <SelectTrigger id="assign-product" className="w-full"><SelectValue placeholder={t('Select product')} /></SelectTrigger>
                  <SelectContent>
                    {availableProducts.map(product => (
                      <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t('Role')} span={3} htmlFor="assign-role">
                <Select value={formData.role || 'component'} onValueChange={v => updateForm('role', v)}>
                  <SelectTrigger id="assign-role" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_ROLES.map(role => (
                      <SelectItem key={role.value} value={role.value}>{t(role.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t('Lead Time')} optional span={3}>
                <InputAffix suffix={t('days')}>
                  <Input type="number" inputMode="numeric" min="0" value={formData.lead_time_days || ''} onChange={e => updateForm('lead_time_days', parseInt(e.target.value) || undefined)} />
                </InputAffix>
              </FormField>
              <FormField label={t('Price per Unit')} optional span={2}>
                <InputAffix suffix={formData.currency || 'EUR'}>
                  <Input type="number" inputMode="decimal" step="0.01" placeholder="0.00" value={formData.price_per_unit ?? ''} onChange={e => updateForm('price_per_unit', e.target.value ? parseFloat(e.target.value) : undefined)} />
                </InputAffix>
              </FormField>
              <FormField label={t('Currency')} span={2} htmlFor="assign-currency">
                <Select value={formData.currency || 'EUR'} onValueChange={v => updateForm('currency', v)}>
                  <SelectTrigger id="assign-currency" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label={t('Min. Order Qty')} optional span={2}>
                <Input type="number" inputMode="numeric" min="1" placeholder={t('e.g. 100')} value={formData.min_order_quantity ?? ''} onChange={e => updateForm('min_order_quantity', e.target.value ? parseInt(e.target.value) : undefined)} />
              </FormField>
            </FormGrid>
            <FormToggleRow label={t('Primary Supplier')} htmlFor="assignment-is-primary" controlPosition="start">
              <Checkbox id="assignment-is-primary" checked={formData.is_primary || false} onCheckedChange={v => updateForm('is_primary', v)} />
            </FormToggleRow>
            <Button onClick={handleAssign} disabled={!formData.product_id || isBusy} className="w-full pointer-coarse:min-h-11">
              {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {t('Assign')}
            </Button>
          </FormSection>

          <FormSection
            title={<span className="tabular-nums">{t('Assigned Products ({{count}})', { count: supplierProducts.length })}</span>}
            icon={Package}
            layout="stacked"
            variant="plain"
          >
            {supplierProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('No products assigned yet')}</p>
            ) : (
              <div className="space-y-2">
                {supplierProducts.map(sp => (
                  <div key={sp.id} className="rounded-lg border bg-card">
                    <div className="flex items-center justify-between gap-2 p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Package className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{getProductName(sp)}</div>
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
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 text-xs pointer-coarse:min-h-11"
                          aria-expanded={expandedPriceTiers === sp.id}
                          onClick={() => {
                            if (expandedPriceTiers === sp.id) {
                              setExpandedPriceTiers(null);
                            } else {
                              setExpandedPriceTiers(sp.id);
                              setEditingTiers(sp.price_tiers ? [...sp.price_tiers] : []);
                            }
                          }}
                        >
                          <Layers className="mr-1 size-3.5" />
                          <span className="tabular-nums">{t('Tiers')} ({sp.price_tiers?.length || 0})</span>
                          {expandedPriceTiers === sp.id ? <ChevronUp className="ml-1 size-3.5" /> : <ChevronDown className="ml-1 size-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="pointer-coarse:size-11" aria-label={t('Delete', { ns: 'common' })} onClick={() => handleRemove(sp.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>

                    {/* Inline price tiers editor */}
                    {expandedPriceTiers === sp.id && (
                      <div className="space-y-3 border-t bg-muted/30 p-3">
                        <h5 className="text-xs font-medium">{t('Volume Pricing Tiers')}</h5>
                        {editingTiers.length === 0 ? (
                          <p className="text-xs text-muted-foreground">{t('No volume pricing configured')}</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-[1fr_1fr_1fr_2.25rem] gap-2 text-xs text-muted-foreground pointer-coarse:grid-cols-[1fr_1fr_1fr_2.75rem]" aria-hidden="true">
                              <span>{t('From Qty')}</span>
                              <span>{t('To Qty')}</span>
                              <span>{t('Price/Unit')}</span>
                              <span />
                            </div>
                            {editingTiers.map((tier, i) => (
                              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_2.25rem] items-center gap-2 pointer-coarse:grid-cols-[1fr_1fr_1fr_2.75rem] pointer-coarse:[&_[data-slot=input]]:h-11">
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  aria-label={t('From Qty')}
                                  className="tabular-nums"
                                  value={tier.minQty}
                                  onChange={e => {
                                    const updated = [...editingTiers];
                                    updated[i] = { ...updated[i], minQty: parseInt(e.target.value) || 1 };
                                    setEditingTiers(updated);
                                  }}
                                />
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  min={1}
                                  aria-label={t('To Qty')}
                                  className="tabular-nums"
                                  placeholder={t('unlimited')}
                                  value={tier.maxQty ?? ''}
                                  onChange={e => {
                                    const updated = [...editingTiers];
                                    updated[i] = { ...updated[i], maxQty: e.target.value ? parseInt(e.target.value) : null };
                                    setEditingTiers(updated);
                                  }}
                                />
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.01"
                                  min={0.01}
                                  aria-label={t('Price/Unit')}
                                  className="tabular-nums"
                                  value={tier.pricePerUnit}
                                  onChange={e => {
                                    const updated = [...editingTiers];
                                    updated[i] = { ...updated[i], pricePerUnit: parseFloat(e.target.value) || 0 };
                                    setEditingTiers(updated);
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="pointer-coarse:size-11"
                                  aria-label={t('Delete', { ns: 'common' })}
                                  onClick={() => setEditingTiers(editingTiers.filter((_, idx) => idx !== i))}
                                >
                                  <Trash2 className="size-4 text-destructive" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="pointer-coarse:min-h-11"
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
                            <Plus className="mr-1 size-3.5" />{t('Add Tier')}
                          </Button>
                          <Button
                            size="sm"
                            className="pointer-coarse:min-h-11"
                            disabled={savingTiers}
                            onClick={() => handleSaveTiers(sp)}
                          >
                            {savingTiers ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Save className="mr-1 size-3.5" />}
                            {t('Save Tiers')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </FormSection>
        </FormSections>

        <FormActions sticky="dialog">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('Close', { ns: 'common' })}</Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  );
}
