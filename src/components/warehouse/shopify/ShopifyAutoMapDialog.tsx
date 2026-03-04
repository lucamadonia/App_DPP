import { useTranslation } from 'react-i18next';
import { Check, X, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AutoMapResult } from '@/types/shopify';

interface Props {
  result: AutoMapResult;
  onClose: () => void;
}

export function ShopifyAutoMapDialog({ result, onClose }: Props) {
  const { t } = useTranslation('warehouse');

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

        <div className="overflow-x-auto -mx-3 sm:-mx-6 px-3 sm:px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Shopify Products')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('Variant')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('Barcode')}</TableHead>
                <TableHead>{t('Trackbliss Product')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.details.map((d, i) => (
                <TableRow key={i}>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="font-medium text-xs sm:text-sm">{d.shopifyProductTitle}</TableCell>
                  <TableCell className="hidden md:table-cell text-xs sm:text-sm">{d.shopifyVariantTitle}</TableCell>
                  <TableCell className="hidden lg:table-cell text-xs font-mono">{d.shopifyBarcode || '—'}</TableCell>
                  <TableCell className="text-xs sm:text-sm">{d.matchedProductName || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
