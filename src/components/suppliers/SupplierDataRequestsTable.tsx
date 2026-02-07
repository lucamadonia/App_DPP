import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, XCircle, Trash2, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
