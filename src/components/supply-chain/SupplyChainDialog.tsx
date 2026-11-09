import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Loader2, MapPin, Factory, Truck } from 'lucide-react';
import { FormWizard } from '@/components/ui/form-wizard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormGrid, FormField, InputAffix, ChoiceCards, FormToggleRow, FormActions } from '@/components/ui/form-layout';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/adaptive-dialog';
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
  /** Prefill for create mode (e.g. inline "+ station" between journey nodes) */
  prefill?: { productId?: string; step?: number } | null;
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
  prefill,
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
          product_id: prefill?.productId
            || ((selectedProductId && selectedProductId !== 'all') ? selectedProductId : (products[0]?.id || '')),
          step: prefill?.step ?? supplyChainLength + 1,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, entry, products, supplyChainLength, prefill]);

  const updateForm = (field: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await onSave(formData);
  };

  const toggleTileClass = (isSelected: boolean) => cn(
    'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs outline-none',
    'transition-[border-color,background-color,color] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/50',
    isSelected
      ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
      : 'border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground'
  );

  const basicStep = (
    <FormGrid cols={2}>
      <FormField label={t('Product')} required span="full" htmlFor="sc-product">
        <Select
          value={formData.product_id || ''}
          onValueChange={v => updateForm('product_id', v)}
          disabled={mode === 'edit'}
        >
          <SelectTrigger id="sc-product" className="w-full">
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
      </FormField>

      <FormField label={t('Location')} span="full">
        <Input
          value={formData.location || ''}
          onChange={e => updateForm('location', e.target.value)}
          placeholder={t('e.g. Production Plant Munich')}
        />
      </FormField>

      <FormField label={t('Country')} htmlFor="sc-country">
        <Select
          value={formData.country || 'DE'}
          onValueChange={v => updateForm('country', v)}
        >
          <SelectTrigger id="sc-country" className="w-full">
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
      </FormField>

      <FormField label={t('Date')}>
        <Input
          type="date"
          value={formData.date || ''}
          onChange={e => updateForm('date', e.target.value)}
        />
      </FormField>

      <FormField label={t('Step')} hint={t('Position in the supply chain')}>
        <Input
          type="number"
          inputMode="numeric"
          className="tabular-nums"
          value={formData.step || 1}
          onChange={e => updateForm('step', parseInt(e.target.value))}
          min={1}
        />
      </FormField>

      <FormField label={t('Supplier')} optional htmlFor="sc-supplier">
        <Select
          value={formData.supplier_id || formData.supplier || 'none'}
          onValueChange={v => {
            const val = v === 'none' ? '' : v;
            updateForm('supplier_id', val);
            updateForm('supplier', val);
          }}
        >
          <SelectTrigger id="sc-supplier" className="w-full">
            <SelectValue placeholder={t('Select supplier')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('No Supplier')}</SelectItem>
            {suppliers.map(supplier => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.name} ({supplier.country})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label={t('Description')} optional span="full">
        <Input
          value={formData.description || ''}
          onChange={e => updateForm('description', e.target.value)}
          placeholder={t('Describe this supply chain step...')}
        />
      </FormField>
    </FormGrid>
  );

  const processStep = (
    <FormGrid cols={2}>
      <div className="col-span-full" role="group" aria-labelledby="sc-process-type-label">
        <p id="sc-process-type-label" className="mb-2 flex items-center gap-1.5 text-sm font-medium leading-5">
          {t('Process Type')}
          <span className="text-xs font-normal text-muted-foreground">{t('Optional', { ns: 'common' })}</span>
        </p>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PROCESS_TYPE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const isSelected = formData.process_type === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => updateForm('process_type', isSelected ? undefined : key)}
                className={toggleTileClass(isSelected)}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="text-center leading-tight">{t(config.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <FormField label={t('Status')} htmlFor="sc-status">
        <Select
          value={formData.status || 'completed'}
          onValueChange={v => updateForm('status', v)}
        >
          <SelectTrigger id="sc-status" className="w-full">
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
      </FormField>

      <FormField label={t('Duration')} optional>
        <InputAffix suffix={t('days')}>
          <Input
            type="number"
            inputMode="numeric"
            className="tabular-nums"
            value={formData.duration_days || ''}
            onChange={e =>
              updateForm('duration_days', e.target.value ? parseInt(e.target.value) : undefined)
            }
            min={0}
          />
        </InputAffix>
      </FormField>

      <FormField label={t('Risk Level')} span="full">
        <ChoiceCards<'low' | 'medium' | 'high'>
          value={formData.risk_level || 'low'}
          onValueChange={v => updateForm('risk_level', v)}
          columns={3}
          options={[
            { value: 'low', label: t('Low') },
            { value: 'medium', label: t('Medium') },
            { value: 'high', label: t('High') },
          ]}
        />
      </FormField>

      <div className="col-span-full">
        <FormToggleRow label={t('Verified')} htmlFor="verified" controlPosition="start">
          <Checkbox
            id="verified"
            checked={formData.verified || false}
            onCheckedChange={v => updateForm('verified', v)}
          />
        </FormToggleRow>
      </div>

      <FormField label={t('Coordinates')} optional span="full" hint={t('Format: Latitude,Longitude')}>
        <Input
          inputMode="decimal"
          className="font-mono"
          value={formData.coordinates || ''}
          onChange={e => updateForm('coordinates', e.target.value)}
          placeholder={t('e.g. 48.1351,11.5820')}
        />
      </FormField>
    </FormGrid>
  );

  const logisticsStep = (
    <FormGrid cols={2}>
      <div className="col-span-full" role="group" aria-labelledby="sc-transport-label">
        <p id="sc-transport-label" className="mb-2 flex items-center gap-1.5 text-sm font-medium leading-5">
          {t('Transport Mode')}
          <span className="text-xs font-normal text-muted-foreground">{t('Optional', { ns: 'common' })}</span>
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {Object.entries(TRANSPORT_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            const isSelected = formData.transport_mode === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={isSelected}
                onClick={() => updateForm('transport_mode', isSelected ? undefined : key)}
                className={toggleTileClass(isSelected)}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span>{t(config.label)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <FormField label={t('Cost')} optional>
        <InputAffix suffix={formData.currency || 'EUR'}>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            className="tabular-nums"
            value={formData.cost ?? ''}
            onChange={e =>
              updateForm('cost', e.target.value ? parseFloat(e.target.value) : undefined)
            }
            placeholder="0.00"
          />
        </InputAffix>
      </FormField>

      <FormField label={t('Currency')} htmlFor="sc-currency">
        <Select
          value={formData.currency || 'EUR'}
          onValueChange={v => updateForm('currency', v)}
        >
          <SelectTrigger id="sc-currency" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
            <SelectItem value="CHF">CHF</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label={t('Emissions')} optional span="full">
        <InputAffix suffix="kg CO₂">
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            className="tabular-nums"
            value={formData.emissions_kg ?? ''}
            onChange={e =>
              updateForm('emissions_kg', e.target.value ? parseFloat(e.target.value) : undefined)
            }
            placeholder="0.00"
          />
        </InputAffix>
      </FormField>

      <FormField label={t('Notes')} optional span="full">
        <Textarea
          value={formData.notes || ''}
          onChange={e => updateForm('notes', e.target.value)}
          rows={3}
        />
      </FormField>
    </FormGrid>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto pb-0">
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

        {mode === 'create' ? (
          <FormWizard
            variant="dialog"
            steps={[
              { id: 'basic', title: t('Basic Data'), icon: MapPin, canNext: Boolean(formData.product_id), content: basicStep },
              { id: 'process', title: t('Process'), icon: Factory, content: processStep },
              { id: 'logistics', title: t('Logistics'), icon: Truck, content: logisticsStep },
            ]}
            showStepHeader={false}
            onCancel={() => onOpenChange(false)}
            onFinish={handleSave}
            finishing={isLoading}
            finishLabel={t('Save', { ns: 'common' })}
          />
        ) : (
          <>
        <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
            <TabsList className="flex w-full">
              <TabsTrigger value="basic" className="flex-1 min-w-0">{t('Basic Data')}</TabsTrigger>
              <TabsTrigger value="process" className="flex-1 min-w-0">{t('Process')}</TabsTrigger>
              <TabsTrigger value="logistics" className="flex-1 min-w-0">{t('Logistics')}</TabsTrigger>
            </TabsList>
  
            <TabsContent value="basic" className="mt-5">{basicStep}</TabsContent>
            <TabsContent value="process" className="mt-5">{processStep}</TabsContent>
            <TabsContent value="logistics" className="mt-5">{logisticsStep}</TabsContent>
          </Tabs>
  
          <FormActions sticky="dialog">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
          </FormActions>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
