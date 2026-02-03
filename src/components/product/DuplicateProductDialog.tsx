import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, GitBranch, Layers, ImageIcon, FileText, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  duplicateProduct,
  getDuplicateEntityCounts,
  type DuplicateProductOptions,
} from '@/services/supabase/products';

interface DuplicateProductDialogProps {
  productId: string;
  productName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DuplicateProductDialog({
  productId,
  productName,
  open,
  onOpenChange,
}: DuplicateProductDialogProps) {
  const { t } = useTranslation('products');
  const navigate = useNavigate();

  const [counts, setCounts] = useState({ supplyChain: 0, batches: 0, images: 0, documents: 0, suppliers: 0 });
  const [options, setOptions] = useState<DuplicateProductOptions>({
    includeSupplyChain: true,
    includeBatches: false,
    includeImages: true,
    includeDocuments: true,
    includeSuppliers: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCounts, setIsLoadingCounts] = useState(false);

  useEffect(() => {
    if (open && productId) {
      setIsLoadingCounts(true);
      getDuplicateEntityCounts(productId)
        .then(setCounts)
        .finally(() => setIsLoadingCounts(false));
    }
  }, [open, productId]);

  const handleDuplicate = async () => {
    setIsLoading(true);
    try {
      const result = await duplicateProduct(productId, options);
      if (result.success && result.id) {
        onOpenChange(false);
        navigate(`/products/${result.id}/edit`);
      } else {
        alert(t('Failed to duplicate product') + (result.error ? `: ${result.error}` : ''));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggle = (key: keyof DuplicateProductOptions) =>
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));

  const items: Array<{
    key: keyof DuplicateProductOptions;
    icon: typeof GitBranch;
    label: string;
    count: number;
  }> = [
    { key: 'includeSupplyChain', icon: GitBranch, label: t('{{count}} entries', { count: counts.supplyChain }), count: counts.supplyChain },
    { key: 'includeBatches', icon: Layers, label: t('{{count}} batches (serial numbers will be cleared)', { count: counts.batches }), count: counts.batches },
    { key: 'includeImages', icon: ImageIcon, label: t('{{count}} images', { count: counts.images }), count: counts.images },
    { key: 'includeDocuments', icon: FileText, label: t('{{count}} documents', { count: counts.documents }), count: counts.documents },
    { key: 'includeSuppliers', icon: Users, label: t('{{count}} suppliers', { count: counts.suppliers }), count: counts.suppliers },
  ];

  const LABELS: Record<keyof DuplicateProductOptions, string> = {
    includeSupplyChain: 'Supply Chain',
    includeBatches: t('Batches'),
    includeImages: t('Images'),
    includeDocuments: t('Documents'),
    includeSuppliers: t('Supplier Assignments'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Duplicate Product')}</DialogTitle>
          <DialogDescription>
            {t('Select what to include in the copy')}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border p-3 mb-4 bg-muted/50">
          <p className="text-sm font-medium truncate">{productName}</p>
        </div>

        <div className="space-y-3">
          {items.map(({ key, icon: Icon, label }) => (
            <div key={key} className="flex items-center gap-3">
              <Checkbox
                id={key}
                checked={options[key]}
                onCheckedChange={() => toggle(key)}
                disabled={isLoadingCounts}
              />
              <Label
                htmlFor={key}
                className="flex items-center gap-2 text-sm cursor-pointer flex-1"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-medium">{LABELS[key]}</span>
                <span className="text-muted-foreground ml-auto text-xs">
                  {isLoadingCounts ? '...' : label}
                </span>
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleDuplicate} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? t('Duplicating...') : t('Duplicate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
