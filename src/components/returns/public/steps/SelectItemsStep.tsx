import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Minus, X, Package, Check, ChevronsUpDown, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useReturnsPortal } from '@/hooks/useReturnsPortal';
import type { ItemCondition } from '@/types/returns-hub';

export interface WizardItem {
  name: string;
  productId?: string;
  quantity: number;
  condition: ItemCondition;
}

interface SelectItemsStepProps {
  items: WizardItem[];
  onItemsChange: (items: WizardItem[]) => void;
}

function ProductCombobox({
  value,
  productId,
  onChange,
  autoFocus,
}: {
  value: string;
  productId?: string;
  onChange: (name: string, productId?: string) => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation('returns');
  const { products } = useReturnsPortal();
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(!productId && value.length > 0);

  if (customMode) {
    return (
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value, undefined)}
          placeholder={t('Item name')}
          autoFocus={autoFocus}
          className="flex-1"
        />
        {products.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => { setCustomMode(false); setOpen(true); }}
            title={t('Search product...')}
          >
            <Package className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value, undefined)}
        placeholder={t('Item name')}
        autoFocus={autoFocus}
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          autoFocus={autoFocus}
        >
          <span className="truncate">
            {value || t('Search product...')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('Search product...')} />
          <CommandList>
            <CommandEmpty>{t('No products found')}</CommandEmpty>
            <CommandGroup>
              {products.map((product) => (
                <CommandItem
                  key={product.id}
                  value={product.name}
                  onSelect={() => {
                    onChange(product.name, product.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      productId === product.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex-1 truncate">
                    <span>{product.name}</span>
                    {product.gtin && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {product.gtin}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setCustomMode(true);
                  onChange('', undefined);
                  setOpen(false);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {t('Or type custom name')}
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function SelectItemsStep({ items, onItemsChange }: SelectItemsStepProps) {
  const { t } = useTranslation('returns');

  const addItem = () => {
    onItemsChange([...items, { name: '', quantity: 1, condition: 'used' }]);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof WizardItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onItemsChange(updated);
  };

  const updateItemProduct = (index: number, name: string, productId?: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], name, productId };
    onItemsChange(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t('Select Items')}</h2>
        <p className="text-sm text-muted-foreground">{t('Select the items you want to return')}</p>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed rounded-lg">
            <Package className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('No items added yet')}</p>
          </div>
        )}

        {items.map((item, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border bg-white animate-scale-in"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <ProductCombobox
                  value={item.name}
                  productId={item.productId}
                  onChange={(name, productId) => updateItemProduct(i, name, productId)}
                  autoFocus={i === items.length - 1}
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 border rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateItem(i, 'quantity', Math.max(1, item.quantity - 1))}
                      className="p-2 hover:bg-muted rounded-l-lg transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateItem(i, 'quantity', item.quantity + 1)}
                      className="p-2 hover:bg-muted rounded-r-lg transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <Select value={item.condition} onValueChange={(v) => updateItem(i, 'condition', v)}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder={t('Select condition')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">{t('New')}</SelectItem>
                      <SelectItem value="like_new">{t('Like New')}</SelectItem>
                      <SelectItem value="used">{t('Used')}</SelectItem>
                      <SelectItem value="damaged">{t('Damaged')}</SelectItem>
                      <SelectItem value="defective">{t('Defective')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button variant="outline" onClick={addItem} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        {t('Add Item')}
      </Button>
    </div>
  );
}
