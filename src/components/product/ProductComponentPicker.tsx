import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getProducts, type ProductListItem } from '@/services/supabase';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { ChevronsUpDown, Package } from 'lucide-react';

interface ProductComponentPickerProps {
  onSelect: (product: ProductListItem) => void;
  excludeIds: string[];
  parentProductId?: string;
}

export function ProductComponentPicker({ onSelect, excludeIds, parentProductId }: ProductComponentPickerProps) {
  const { t } = useTranslation('products');
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getProducts().then(setProducts).catch(console.error);
  }, []);

  const filteredProducts = products.filter(p => {
    // Exclude self, already-added components
    if (excludeIds.includes(p.id)) return false;
    if (parentProductId && p.id === parentProductId) return false;
    // Search filter
    if (search) {
      const s = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(s) ||
        p.gtin.toLowerCase().includes(s) ||
        p.manufacturer.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            {t('Add Component')}
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t('Search products...')}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t('No products found')}</CommandEmpty>
            <CommandGroup>
              {filteredProducts.slice(0, 20).map(product => (
                <CommandItem
                  key={product.id}
                  value={product.id}
                  onSelect={() => {
                    onSelect(product);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.gtin} &middot; {product.manufacturer}</p>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
