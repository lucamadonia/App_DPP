import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Package, AlertTriangle, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getStockLevels } from '@/services/supabase/wh-stock';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import type { WhStockLevel, WhLocation } from '@/types/warehouse';

export function InventoryListPage() {
  const { t } = useTranslation('warehouse');
  const [searchParams] = useSearchParams();
  const [stock, setStock] = useState<WhStockLevel[]>([]);
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(searchParams.get('lowStock') === 'true');

  useEffect(() => {
    async function load() {
      try {
        const [s, l] = await Promise.all([
          getStockLevels({
            locationId: locationFilter !== 'all' ? locationFilter : undefined,
            lowStockOnly,
          }),
          getActiveLocations(),
        ]);
        setStock(s);
        setLocations(l);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [locationFilter, lowStockOnly]);

  const totalAvailable = stock.reduce((sum, s) => sum + s.quantityAvailable, 0);
  const totalReserved = stock.reduce((sum, s) => sum + s.quantityReserved, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('Inventory')}</h1>
          <p className="text-muted-foreground">
            {totalAvailable.toLocaleString()} {t('Available Quantity')} · {totalReserved.toLocaleString()} {t('Reserved Quantity')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder={t('All Locations', { ns: 'common' })} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Locations', { ns: 'common' })}</SelectItem>
                {locations.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={lowStockOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setLowStockOnly(!lowStockOnly)}
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              {t('Low Stock Alerts')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Product')}</TableHead>
                <TableHead>{t('Batch')}</TableHead>
                <TableHead>{t('Location')}</TableHead>
                <TableHead>{t('Bin Location')}</TableHead>
                <TableHead className="text-right">{t('Available Quantity')}</TableHead>
                <TableHead className="text-right">{t('Reserved Quantity')}</TableHead>
                <TableHead className="text-right">{t('Reorder Point')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {t('Loading...', { ns: 'common' })}
                  </TableCell>
                </TableRow>
              ) : stock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    {t('No stock data')}
                  </TableCell>
                </TableRow>
              ) : (
                stock.map((s) => {
                  const isLow = s.reorderPoint != null && s.quantityAvailable <= s.reorderPoint;
                  return (
                    <TableRow key={s.id} className={isLow ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}>
                      <TableCell className="font-medium">{s.productName || s.productId.slice(0, 8)}</TableCell>
                      <TableCell>{s.batchSerialNumber || s.batchId.slice(0, 8)}</TableCell>
                      <TableCell>
                        <span>{s.locationName}</span>
                        {s.locationCode && <span className="text-muted-foreground ml-1">({s.locationCode})</span>}
                      </TableCell>
                      <TableCell>{s.binLocation || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {isLow && <AlertTriangle className="inline mr-1 h-3 w-3 text-orange-500" />}
                        {s.quantityAvailable.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.quantityReserved.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {s.reorderPoint != null ? s.reorderPoint.toLocaleString() : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
