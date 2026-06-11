import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  Clipboard,
  Eye,
  MinusCircle,
  Move,
  Pencil,
} from 'lucide-react';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import type { WhStockLevel } from '@/types/warehouse';

export interface InventoryRowActionsProps {
  stock: WhStockLevel;
  onAdjust: (s: WhStockLevel) => void;
  onMoveShelf: (s: WhStockLevel) => void;
  onTransfer: (s: WhStockLevel) => void;
  onWriteOff: (s: WhStockLevel) => void;
}

/**
 * Shared dropdown menu items for an inventory stock row.
 * Used by the table row action button, the right-click context menu,
 * and the mobile card grid. Must be rendered inside a DropdownMenuContent.
 */
export function InventoryRowActions({
  stock: s,
  onAdjust,
  onMoveShelf,
  onTransfer,
  onWriteOff,
}: InventoryRowActionsProps) {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();

  const copySKU = () => {
    navigator.clipboard.writeText(s.batchSerialNumber ?? s.batchId);
    toast.success(t('Copied!'));
  };

  return (
    <>
      <DropdownMenuItem onClick={() => onAdjust(s)}>
        <Pencil className="mr-2 h-4 w-4" />
        {t('Adjust Stock')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onMoveShelf(s)}>
        <Move className="mr-2 h-4 w-4" />
        {t('Move to Another Shelf')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onTransfer(s)}>
        <ArrowRightLeft className="mr-2 h-4 w-4" />
        {t('Transfer Stock')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => onWriteOff(s)} className="text-red-600 focus:text-red-700 focus:bg-red-50">
        <MinusCircle className="mr-2 h-4 w-4" />
        {t('Write off stock')}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate(`/products/${s.productId}`)}>
        <Eye className="mr-2 h-4 w-4" />
        {t('View Product')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate(`/products/${s.productId}/batches/${s.batchId}`)}>
        <Eye className="mr-2 h-4 w-4" />
        {t('View Batch')}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate(`/warehouse/locations/${s.locationId}`)}>
        <Eye className="mr-2 h-4 w-4" />
        {t('View Location')}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={copySKU}>
        <Clipboard className="mr-2 h-4 w-4" />
        {t('Copy SKU')}
      </DropdownMenuItem>
    </>
  );
}
