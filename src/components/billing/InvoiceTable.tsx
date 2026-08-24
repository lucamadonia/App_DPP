/**
 * InvoiceTable — Displays Stripe invoice history with download links.
 */

import { useTranslation } from 'react-i18next';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveTable,
  type ResponsiveTableColumn,
} from '@/components/ui/responsive-table';
import { cn } from '@/lib/utils';
import type { BillingInvoice } from '@/types/billing';

interface InvoiceTableProps {
  invoices: BillingInvoice[];
  isLoading?: boolean;
}

export function InvoiceTable({ invoices, isLoading }: InvoiceTableProps) {
  const { t } = useTranslation('billing');

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 animate-pulse rounded bg-muted" />
        ))}
      </div>
    );
  }

  const columns: ResponsiveTableColumn<BillingInvoice>[] = [
    {
      id: 'date',
      header: t('Date'),
      className: 'font-medium',
      mobilePriority: 'title',
      cell: (invoice) => formatDate(invoice.createdAt),
    },
    {
      id: 'amount',
      header: t('Amount'),
      className: 'tabular-nums',
      mobilePriority: 'meta',
      mobileLabel: t('Amount'),
      cell: (invoice) => formatAmount(invoice.amountPaid || invoice.amountDue, invoice.currency),
    },
    {
      id: 'status',
      header: t('Status'),
      mobilePriority: 'badge',
      cell: (invoice) => <InvoiceStatusBadge status={invoice.status} />,
    },
    {
      id: 'actions',
      header: t('Actions'),
      className: 'text-right',
      mobilePriority: 'meta',
      cell: (invoice) => (
        <div className="flex items-center justify-end gap-1">
          {invoice.stripePdfUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <a href={invoice.stripePdfUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
            </Button>
          )}
          {invoice.stripeInvoiceUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              asChild
            >
              <a href={invoice.stripeInvoiceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <ResponsiveTable
      data={invoices}
      columns={columns}
      rowKey={(invoice) => invoice.id}
      emptyState={
        <div className="flex flex-col items-center justify-center text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t('No invoices yet')}</p>
        </div>
      }
    />
  );
}

function InvoiceStatusBadge({ status }: { status: BillingInvoice['status'] }) {
  const { t } = useTranslation('billing');

  const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    paid: { label: t('Paid'), variant: 'default' },
    open: { label: t('Open'), variant: 'secondary' },
    draft: { label: t('Draft'), variant: 'outline' },
    void: { label: t('Void'), variant: 'outline' },
    uncollectible: { label: t('Uncollectible'), variant: 'destructive' },
  };

  const c = config[status] || { label: status, variant: 'outline' as const };

  return (
    <Badge
      variant={c.variant}
      className={cn(
        status === 'paid' && 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200',
      )}
    >
      {c.label}
    </Badge>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
