import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getReturnPhotoUrl } from '@/services/supabase';
import type { RhReturnItem } from '@/types/returns-hub';

function PhotoThumbnails({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const loaded: string[] = [];
      for (const path of paths.slice(0, 3)) {
        const url = await getReturnPhotoUrl(path);
        if (url) loaded.push(url);
      }
      if (!cancelled) setUrls(loaded);
    }
    if (paths.length > 0) load();
    return () => { cancelled = true; };
  }, [paths]);

  if (paths.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex items-center gap-1">
      {urls.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          className="h-8 w-8 rounded object-cover border"
        />
      ))}
      {paths.length > 3 && (
        <span className="text-xs text-muted-foreground">+{paths.length - 3}</span>
      )}
      {urls.length === 0 && paths.length > 0 && (
        <ImageIcon className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}

interface ReturnItemsTableProps {
  items: RhReturnItem[];
  onRemove?: (id: string) => void;
  readonly?: boolean;
}

export function ReturnItemsTable({ items, onRemove, readonly }: ReturnItemsTableProps) {
  const { t } = useTranslation('returns');

  if (!items.length) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">{t('No data available')}</p>
    );
  }

  const conditionColors: Record<string, string> = {
    new: 'bg-green-100 text-green-800',
    like_new: 'bg-emerald-100 text-emerald-800',
    used: 'bg-yellow-100 text-yellow-800',
    damaged: 'bg-orange-100 text-orange-800',
    defective: 'bg-red-100 text-red-800',
  };

  // Footer totals: prefer explicit refund amounts, else estimate from
  // qty × unit price. Show nothing if we have no monetary data at all.
  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const hasExplicitRefund = items.some((i) => i.refundAmount != null);
  const lineValues = items
    .map((i) => (i.refundAmount != null ? i.refundAmount : i.unitPrice != null ? i.unitPrice * (i.quantity || 1) : null))
    .filter((v): v is number => v != null);
  const totalValue = lineValues.length ? lineValues.reduce((a, b) => a + b, 0) : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 font-medium">{t('Product')}</th>
            <th className="pb-2 font-medium">{t('SKU')}</th>
            <th className="pb-2 font-medium text-center">{t('Quantity')}</th>
            <th className="pb-2 font-medium text-right">{t('Unit Price')}</th>
            <th className="pb-2 font-medium">{t('Condition')}</th>
            <th className="pb-2 font-medium">{t('Photos')}</th>
            <th className="pb-2 font-medium text-right">{t('Refund Amount')}</th>
            {!readonly && <th className="pb-2 font-medium w-10" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            // Effective value per line: explicit refund, else qty × unit price.
            const lineValue = item.refundAmount != null
              ? item.refundAmount
              : item.unitPrice != null
                ? item.unitPrice * (item.quantity || 1)
                : null;
            return (
            <tr key={item.id} className="border-b last:border-0">
              <td className="py-2">
                <div>
                  <span className="font-medium">{item.name}</span>
                  {item.serialNumber && (
                    <span className="block text-xs text-muted-foreground">
                      SN: {item.serialNumber}
                    </span>
                  )}
                </div>
              </td>
              <td className="py-2 text-muted-foreground">{item.sku || '—'}</td>
              <td className="py-2 text-center">{item.quantity}</td>
              <td className="py-2 text-right">
                {item.unitPrice != null ? `€${item.unitPrice.toFixed(2)}` : '—'}
              </td>
              <td className="py-2">
                {item.condition && (
                  <Badge variant="outline" className={conditionColors[item.condition] || ''}>
                    {t(item.condition === 'like_new' ? 'Like New' : item.condition.charAt(0).toUpperCase() + item.condition.slice(1))}
                  </Badge>
                )}
              </td>
              <td className="py-2">
                <PhotoThumbnails paths={item.photos} />
              </td>
              <td className="py-2 text-right font-medium">
                {item.refundAmount != null
                  ? `€${item.refundAmount.toFixed(2)}`
                  : lineValue != null
                    ? <span className="text-muted-foreground font-normal">≈ €{lineValue.toFixed(2)}</span>
                    : '—'}
              </td>
              {!readonly && (
                <td className="py-2">
                  {onRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => onRemove(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </td>
              )}
            </tr>
            );
          })}
        </tbody>
        {totalValue != null && (
          <tfoot>
            <tr className="border-t-2">
              <td className="pt-2 font-medium" colSpan={2}>{t('Total')}</td>
              <td className="pt-2 text-center font-medium">{totalQuantity}</td>
              <td className="pt-2" />
              <td className="pt-2" colSpan={2} />
              <td className="pt-2 text-right font-semibold">
                {hasExplicitRefund ? '' : '≈ '}€{totalValue.toFixed(2)}
              </td>
              {!readonly && <td className="pt-2" />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
