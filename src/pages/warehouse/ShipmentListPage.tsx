import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Truck, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getShipments } from '@/services/supabase/wh-shipments';
import type { WhShipment, ShipmentStatus } from '@/types/warehouse';

const STATUS_COLORS: Record<ShipmentStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  picking: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  packed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  label_created: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  in_transit: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export function ShipmentListPage() {
  const { t } = useTranslation('warehouse');
  const [shipments, setShipments] = useState<WhShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getShipments(search ? { search } : undefined);
        setShipments(data);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('Shipments')}</h1>
        <Button asChild>
          <Link to="/warehouse/shipments/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('Create Shipment')}
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('Search recipients...')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Shipment Number')}</TableHead>
                <TableHead>{t('Status')}</TableHead>
                <TableHead>{t('Recipient')}</TableHead>
                <TableHead>{t('Carrier')}</TableHead>
                <TableHead className="text-right">{t('Items')}</TableHead>
                <TableHead>{t('Tracking Number')}</TableHead>
                <TableHead>{t('Created', { ns: 'common' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {t('Loading...', { ns: 'common' })}
                  </TableCell>
                </TableRow>
              ) : shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <Truck className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    {t('No shipments yet')}
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link to={`/warehouse/shipments/${s.id}`} className="font-medium text-primary hover:underline">
                        {s.shipmentNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[s.status]}>{t(s.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>{s.recipientName}</div>
                      {s.recipientCompany && <div className="text-xs text-muted-foreground">{s.recipientCompany}</div>}
                    </TableCell>
                    <TableCell>{s.carrier || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.totalItems}</TableCell>
                    <TableCell className="font-mono text-xs">{s.trackingNumber || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(s.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
