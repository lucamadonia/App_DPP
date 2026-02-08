import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, XCircle, Trash2, ExternalLink, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cancelSupplierDataRequest, deleteSupplierDataRequest } from '@/services/supabase/supplier-data-portal';
import type { SupplierDataRequest } from '@/types/supplier-data-portal';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  in_progress: 'secondary',
  submitted: 'default',
  expired: 'outline',
  cancelled: 'destructive',
};

interface SupplierDataRequestsTableProps {
  requests: SupplierDataRequest[];
  onRefresh: () => void;
}

function ProductsCell({ req }: { req: SupplierDataRequest }) {
  const names = req.productNames || (req.productName ? [req.productName] : []);
  const count = names.length || req.productIds.length;

  if (count === 0) return <span className="text-muted-foreground">—</span>;

  if (count === 1) {
    return (
      <div className="flex items-center gap-1.5">
        <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="truncate max-w-[200px]">{names[0] || req.productIds[0]?.slice(0, 8)}</span>
      </div>
    );
  }

  // Multiple products — show first 2 names + tooltip with full list
  const displayNames = names.slice(0, 2);
  const remaining = count - 2;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[200px]">
              {displayNames.join(', ')}
              {remaining > 0 && (
                <span className="text-muted-foreground"> +{remaining}</span>
              )}
            </span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
              {count}
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <div className="space-y-0.5">
            {names.map((name, i) => (
              <div key={i} className="text-xs">{name}</div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SupplierDataRequestsTable({ requests, onRefresh }: SupplierDataRequestsTableProps) {
  const { t } = useTranslation('supplier-data-portal');
  const { toast } = useToast();
  const locale = useLocale();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyLink = async (accessCode: string, id: string) => {
    const url = `${window.location.origin}/suppliers/data/${accessCode}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: t('Link copied') });
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelSupplierDataRequest(id);
      toast({ title: t('Request cancelled') });
      onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSupplierDataRequest(id);
      toast({ title: t('Request deleted') });
      onRefresh();
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' });
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ExternalLink className="mx-auto h-12 w-12 opacity-30 mb-2" />
        <p className="font-medium">{t('No data requests')}</p>
        <p className="text-sm">{t('No data requests created for this product yet')}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('Products')}</TableHead>
          <TableHead>{t('Supplier')}</TableHead>
          <TableHead>{t('Status')}</TableHead>
          <TableHead>{t('Created')}</TableHead>
          <TableHead>{t('Expires')}</TableHead>
          <TableHead className="text-right">{t('Actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((req) => (
          <TableRow key={req.id}>
            <TableCell className="font-medium">
              <ProductsCell req={req} />
            </TableCell>
            <TableCell>
              {req.supplierName || '—'}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANTS[req.status] || 'outline'}>
                {t(req.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(req.createdAt, locale)}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDate(req.expiresAt, locale)}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyLink(req.accessCode, req.id)}
                  title={t('Copy Link')}
                >
                  {copiedId === req.id ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                {(req.status === 'pending' || req.status === 'in_progress') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancel(req.id)}
                    title={t('Cancel Request')}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                )}
                {(req.status === 'cancelled' || req.status === 'submitted' || req.status === 'expired') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(req.id)}
                    title={t('Delete Request')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
