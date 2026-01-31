import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SupplyChainEntry, Supplier } from '@/types/database';
import { type ProductListItem } from '@/services/supabase';
import {
  PROCESS_TYPE_CONFIG,
  STATUS_CONFIG,
  TRANSPORT_CONFIG,
  getProcessTypeClasses,
} from '@/lib/supply-chain-constants';

export interface SupplyChainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  entry?: SupplyChainEntry | null;
  products: ProductListItem[];
  suppliers: Supplier[];
  supplyChainLength: number;
  selectedProductId?: string;
  onSave: (data: Partial<SupplyChainEntry>) => Promise<void>;
  isLoading: boolean;
}

export function SupplyChainDialog({
  open,
  onOpenChange,
  mode,
  entry,
  products,
  suppliers,
  supplyChainLength,
  selectedProductId,
  onSave,
  isLoading,
}: SupplyChainDialogProps) {
  const { t } = useTranslation('settings');
  const [activeFormTab, setActiveFormTab] = useState('basic');
  const [formData, setFormData] = useState<Partial<SupplyChainEntry>>({});

  // Reset form when dialog opens or entry changes
  useEffect(() => {
    if (open) {
      setActiveFormTab('basic');
      if (mode === 'edit' && entry) {
        setFormData({ ...entry });
      } else {
        setFormData({
          product_id: (selectedProductId && selectedProductId !== 'all') ? selectedProductId : (products[0]?.id || ''),
          step: supplyChainLength + 1,
          location: '',
          country: 'DE',
          date: new Date().toISOString().split('T')[0],
          description: '',
          supplier: '',
          supplier_id: '',
          risk_level: 'low',
          verified: false,
          coordinates: '',
          process_type: undefined,
          transport_mode: undefined,
          status: 'completed',
          emissions_kg: undefined,
          duration_days: undefined,
          cost: undefined,
          currency: 'EUR',
          notes: '',
        });
      }
    }
  }, [open, mode, entry, products, supplyChainLength]);

  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? t('New Supply Chain Entry') : t('Edit Entry')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? t('Add a new step to the supply chain.')
              : t('Edit the details of this supply chain step.')}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">{t('Basic Data')}</TabsTrigger>
            <TabsTrigger value="process">{t('Process')}</TabsTrigger>
            <TabsTrigger value="logistics">{t('Logistics')}</TabsTrigger>
          </TabsList>

          {/* Tab 1: Basic Data */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div>
              <Label>{t('Product')}</Label>
              <Select
                value={formData.product_id || ''}
                onValueChange={v => updateForm('product_id', v)}
                disabled={mode === 'edit'}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('Select product')} />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('Step')}</Label>
                <Input
                  type="number"
                  value={formData.step || 1}
                  onChange={e => updateForm('step', parseInt(e.target.value))}
                  min={1}
                />
              </div>
              <div>
                <Label>{t('Country')}</Label>
                <Select
                  value={formData.country || 'DE'}
                  onValueChange={v => updateForm('country', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="AT">Austria</SelectItem>
                    <SelectItem value="CH">Switzerland</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="NL">Netherlands</SelectItem>
                    <SelectItem value="BE">Belgium</SelectItem>
                    <SelectItem value="PL">Poland</SelectItem>
                    <SelectItem value="CZ">Czech Republic</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="US">USA</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('Location')}</Label>
              <Input
                value={formData.location || ''}
                onChange={e => updateForm('location', e.target.value)}
                placeholder={t('e.g. Production Plant Munich')}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('Date')}</Label>
                <Input
                  type="date"
                  value={formData.date || ''}
                  onChange={e => updateForm('date', e.target.value)}
                />
              </div>
              <div>
                <Label>{t('Supplier (optional)')}</Label>
                <Select
                  value={formData.supplier_id || formData.supplier || 'none'}
                  onValueChange={v => {
                    const val = v === 'none' ? '' : v;
                    updateForm('supplier_id', val);
                    updateForm('supplier', val);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select supplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- {t('No Supplier')} --</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.country})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('Description')}</Label>
              <Input
                value={formData.description || ''}
                onChange={e => updateForm('description', e.target.value)}
                placeholder={t('Describe this supply chain step...')}
              />
            </div>
          </TabsContent>

          {/* Tab 2: Process */}
          <TabsContent value="process" className="space-y-4 mt-4">
            <div>
              <Label>{t('Process Type (optional)')}</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {Object.entries(PROCESS_TYPE_CONFIG).map(([key, config]) => {
                  const classes = getProcessTypeClasses(config.color);
                  const Icon = config.icon;
                  const isSelected = formData.process_type === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateForm('process_type', isSelected ? undefined : key)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs ${
                        isSelected
                          ? `${classes.bg} ${classes.text} ${classes.border}`
                          : 'border-transparent bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-center leading-tight">{t(config.label)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('Status')}</Label>
                <Select
                  value={formData.status || 'completed'}
                  onValueChange={v => updateForm('status', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {t(config.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('Duration (days)')}</Label>
                <Input
                  type="number"
                  value={formData.duration_days || ''}
                  onChange={e =>
                    updateForm('duration_days', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  min={0}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('Risk Level')}</Label>
                <Select
                  value={formData.risk_level || 'low'}
                  onValueChange={v => updateForm('risk_level', v as 'low' | 'medium' | 'high')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('Low')}</SelectItem>
                    <SelectItem value="medium">{t('Medium')}</SelectItem>
                    <SelectItem value="high">{t('High')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="verified"
                  checked={formData.verified || false}
                  onCheckedChange={v => updateForm('verified', v)}
                />
                <Label htmlFor="verified">{t('Verified')}</Label>
              </div>
            </div>

            <div>
              <Label>{t('Coordinates (optional)')}</Label>
              <Input
                value={formData.coordinates || ''}
                onChange={e => updateForm('coordinates', e.target.value)}
                placeholder={t('e.g. 48.1351,11.5820')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('Format: Latitude,Longitude')}
              </p>
            </div>
          </TabsContent>

          {/* Tab 3: Logistics */}
          <TabsContent value="logistics" className="space-y-4 mt-4">
            <div>
              <Label>{t('Transport Mode (optional)')}</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {Object.entries(TRANSPORT_CONFIG).map(([key, config]) => {
                  const Icon = config.icon;
                  const isSelected = formData.transport_mode === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateForm('transport_mode', isSelected ? undefined : key)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs ${
                        isSelected
                          ? 'bg-primary/10 text-primary border-primary'
                          : 'border-transparent bg-muted/30 hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{t(config.label)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t('Cost (optional)')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.cost ?? ''}
                  onChange={e =>
                    updateForm('cost', e.target.value ? parseFloat(e.target.value) : undefined)
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>{t('Currency')}</Label>
                <Select
                  value={formData.currency || 'EUR'}
                  onValueChange={v => updateForm('currency', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CHF">CHF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{t('Emissions kg CO₂ (optional)')}</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.emissions_kg ?? ''}
                onChange={e =>
                  updateForm('emissions_kg', e.target.value ? parseFloat(e.target.value) : undefined)
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>{t('Notes (optional)')}</Label>
              <Textarea
                value={formData.notes || ''}
                onChange={e => updateForm('notes', e.target.value)}
                placeholder={t('Notes (optional)')}
                rows={3}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t('Save', { ns: 'common' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
