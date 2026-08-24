import { useTranslation } from 'react-i18next';
import { Check, X, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/adaptive-dialog';
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
} from '@/components/ui/responsive-table';
import type { AutoMapResult } from '@/types/shopify';

/** result.details carries no id, so the list index becomes the row key. */
type AutoMapDetailRow = AutoMapResult['details'][number] & { rowIndex: number };

interface Props {
  result: AutoMapResult;
  onClose: () => void;
}

export function ShopifyAutoMapDialog({ result, onClose }: Props) {
  const { t } = useTranslation('warehouse');

  const columns: ResponsiveTableColumn<AutoMapDetailRow>[] = [
    {
      id: 'status',
      header: t('Status'),
      mobilePriority: 'badge',
      cell: d => (
        <>
          {d.status === 'mapped' && (
            <Badge className="bg-green-500/10 text-green-600 border-green-200">
              <Check className="mr-1 h-3 w-3" />{t('mapped')}
            </Badge>
          )}
          {d.status === 'skipped_no_match' && (
            <Badge variant="secondary">
              <X className="mr-1 h-3 w-3" />{t('skipped_no_match')}
            </Badge>
          )}
          {d.status === 'skipped_already_mapped' && (
            <Badge variant="outline">
              <Minus className="mr-1 h-3 w-3" />{t('skipped_already_mapped')}
            </Badge>
          )}
        </>
      ),
    },
    {
      id: 'product',
      header: t('Shopify Products'),
      className: 'font-medium text-xs sm:text-sm',
      mobilePriority: 'title',
      cell: d => d.shopifyProductTitle,
    },
    {
      id: 'variant',
      header: t('Variant'),
      className: 'text-xs sm:text-sm',
      hideBelow: 'md',
      mobilePriority: 'subtitle',
      cell: d => d.shopifyVariantTitle,
    },
    {
      id: 'barcode',
      header: t('Barcode'),
      className: 'text-xs font-mono',
      hideBelow: 'lg',
      mobilePriority: 'meta',
      mobileLabel: t('Barcode'),
      cell: d => d.shopifyBarcode || '—',
    },
    {
      id: 'matched',
      header: t('Trackbliss Product'),
      className: 'text-xs sm:text-sm',
      mobilePriority: 'meta',
      mobileLabel: t('Trackbliss Product'),
      cell: d => d.matchedProductName || '—',
    },
  ];

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[80vh] overflow-auto px-3 sm:px-6">
        <DialogHeader>
          <DialogTitle className="text-sm sm:text-base">{t('Auto-Map Results')}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {t('{{mapped}} mapped, {{skipped}} skipped', {
              mapped: result.mapped,
              skipped: result.skipped,
            })}
          </DialogDescription>
        </DialogHeader>

        <ResponsiveTable
          data={result.details.map((d, rowIndex) => ({ ...d, rowIndex }))}
          columns={columns}
          rowKey={d => String(d.rowIndex)}
        />
      </DialogContent>
    </Dialog>
  );
}
