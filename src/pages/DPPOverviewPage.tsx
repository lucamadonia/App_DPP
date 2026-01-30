import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  QrCode,
  ExternalLink,
  CheckCircle2,
  Clock,
  Archive,
  Download,
  Loader2,
  Package,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getAllBatches } from '@/services/supabase/batches';
import type { BatchListItem } from '@/types/product';

interface DPPBatchItem extends BatchListItem {
  productName: string;
  gtin: string;
}

const statusConfig = {
  live: {
    label: 'Published',
    icon: CheckCircle2,
    className: 'bg-success text-success-foreground',
  },
  draft: {
    label: 'Draft',
    icon: Clock,
    className: '',
  },
  archived: {
    label: 'Archived',
    icon: Archive,
    className: 'bg-muted text-muted-foreground',
  },
};

export function DPPOverviewPage() {
  const { t } = useTranslation('dpp');
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dpps, setDpps] = useState<DPPBatchItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadBatches() {
      setIsLoading(true);
      const batches = await getAllBatches();
      setDpps(batches);
      setIsLoading(false);
    }

    loadBatches();
  }, []);

  const filteredDpps = dpps.filter((dpp) => {
    const matchesSearch =
      dpp.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dpp.gtin.includes(searchQuery) ||
      dpp.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (dpp.batchNumber || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || dpp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: dpps.length,
    live: dpps.filter((d) => d.status === 'live').length,
    draft: dpps.filter((d) => d.status === 'draft').length,
    archived: dpps.filter((d) => d.status === 'archived').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Digital Product Passports')}</h1>
          <p className="text-muted-foreground">
            {t('Overview of all DPPs by batch')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dpp/qr-generator">
              <QrCode className="mr-2 h-4 w-4" />
              {t('QR-Generator')}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/products/new">
              {t('Create New DPP')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Total DPPs')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Published')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.live}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Drafts')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Archived')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.archived}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('Search by product, GTIN, serial or batch number...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  {t('Status', { ns: 'common' })}
                  {statusFilter && (
                    <Badge variant="secondary" className="ml-2">
                      {statusConfig[statusFilter as keyof typeof statusConfig]?.label}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  {t('All Statuses')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                    <config.icon className="mr-2 h-4 w-4" />
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              {t('Export', { ns: 'common' })}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredDpps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">{t('No DPPs found')}</h3>
              <p className="text-muted-foreground mt-1">
                {dpps.length === 0
                  ? t('Create a product and add batches to generate DPPs.')
                  : t('No batches match your search criteria.')}
              </p>
              {dpps.length === 0 && (
                <Button className="mt-4" asChild>
                  <Link to="/products/new">{t('Create First Product')}</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Product', { ns: 'products' })}</TableHead>
                  <TableHead>{t('GTIN', { ns: 'products' })}</TableHead>
                  <TableHead>{t('Serial Number')}</TableHead>
                  <TableHead>{t('Batch')}</TableHead>
                  <TableHead>{t('Status', { ns: 'common' })}</TableHead>
                  <TableHead>{t('Created')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDpps.map((dpp) => {
                  const status = statusConfig[dpp.status];
                  return (
                    <TableRow key={dpp.id}>
                      <TableCell>
                        <Link
                          to={`/products/${dpp.productId}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {dpp.productName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-sm">{dpp.gtin}</code>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/products/${dpp.productId}/batches/${dpp.id}`}
                          className="font-mono text-sm hover:text-primary hover:underline"
                        >
                          {dpp.serialNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {dpp.batchNumber || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={status.className}>
                          <status.icon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(dpp.createdAt, locale)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/products/${dpp.productId}/batches/${dpp.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                {t('Batch Details')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/products/${dpp.productId}`}>
                                <Layers className="mr-2 h-4 w-4" />
                                {t('Product', { ns: 'products' })}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/dpp/qr-generator">
                                <QrCode className="mr-2 h-4 w-4" />
                                {t('QR-Code')}
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={`/p/${dpp.gtin}/${dpp.serialNumber}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                {t('Public View')}
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
