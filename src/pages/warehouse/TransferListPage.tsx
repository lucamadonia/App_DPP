import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowRightLeft, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { getTransactionHistory, createStockTransfer, getStockLevels } from '@/services/supabase/wh-stock';
import { getActiveLocations } from '@/services/supabase/wh-locations';
import { getProducts } from '@/services/supabase/products';
import { getBatches } from '@/services/supabase/batches';
import type { WhStockTransaction, WhLocation } from '@/types/warehouse';

const TYPE_COLORS: Record<string, string> = {
  transfer_out: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  transfer_in: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  goods_receipt: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  shipment: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  adjustment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  damage: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  write_off: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  return_receipt: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  reservation: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  release: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

export function TransferListPage() {
  const { t } = useTranslation('warehouse');
  const [transactions, setTransactions] = useState<WhStockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [locations, setLocations] = useState<WhLocation[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [batches, setBatches] = useState<{ id: string; serial_number: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Transfer form
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [maxAvailable, setMaxAvailable] = useState(0);
  const [notes, setNotes] = useState('');

  const load = async () => {
    try {
      const data = await getTransactionHistory({ type: ['transfer_out', 'transfer_in'] });
      setTransactions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openDialog = async () => {
    const [l, p] = await Promise.all([getActiveLocations(), getProducts()]);
    setLocations(l);
    setProducts(p.map((pr: { id: string; name: string }) => ({ id: pr.id, name: pr.name })));
    setFromLocationId('');
    setToLocationId('');
    setProductId('');
    setBatchId('');
    setQuantity(1);
    setMaxAvailable(0);
    setNotes('');
    setDialogOpen(true);
  };

  useEffect(() => {
    if (productId) {
      getBatches(productId).then((b) =>
        setBatches(b.map((batch: { id: string; serialNumber: string }) => ({
          id: batch.id,
          serial_number: batch.serialNumber,
        })))
      );
    }
  }, [productId]);

  // Look up available stock when source location + batch selected
  useEffect(() => {
    if (fromLocationId && batchId) {
      getStockLevels({ locationId: fromLocationId, batchId }).then((stock) => {
        setMaxAvailable(stock[0]?.quantityAvailable || 0);
      });
    }
  }, [fromLocationId, batchId]);

  const handleTransfer = async () => {
    if (!fromLocationId || !toLocationId || !productId || !batchId || quantity <= 0) return;
    if (fromLocationId === toLocationId) {
      toast.error(t('Source and destination must differ'));
      return;
    }
    setSaving(true);
    try {
      await createStockTransfer({
        fromLocationId,
        toLocationId,
        productId,
        batchId,
        quantity,
        notes: notes || undefined,
      });
      toast.success(t('Transfer completed'));
      setDialogOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('Stock Transfers')}</h1>
        <Button onClick={openDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('New Transfer')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('Transaction Number')}</TableHead>
                <TableHead>{t('Type')}</TableHead>
                <TableHead>{t('Product')}</TableHead>
                <TableHead>{t('Location')}</TableHead>
                <TableHead className="text-right">{t('Quantity')}</TableHead>
                <TableHead>{t('Date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t('Loading...', { ns: 'common' })}
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    <ArrowRightLeft className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    {t('No transfers yet')}
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-mono text-xs">{tx.transactionNumber}</TableCell>
                    <TableCell>
                      <Badge className={TYPE_COLORS[tx.type] || 'bg-gray-100 text-gray-800'}>
                        {t(tx.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{tx.productName || tx.productId.slice(0, 8)}</TableCell>
                    <TableCell>{tx.locationName || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      <span className={tx.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {tx.quantity > 0 ? '+' : ''}{tx.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('New Transfer')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Product')}</Label>
              <Select value={productId} onValueChange={(v) => { setProductId(v); setBatchId(''); }}>
                <SelectTrigger><SelectValue placeholder={t('Select Product')} /></SelectTrigger>
                <SelectContent>
                  {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {productId && (
              <div className="space-y-2">
                <Label>{t('Batch')}</Label>
                <Select value={batchId} onValueChange={setBatchId}>
                  <SelectTrigger><SelectValue placeholder={t('Select Batch')} /></SelectTrigger>
                  <SelectContent>
                    {batches.map((b) => <SelectItem key={b.id} value={b.id}>{b.serial_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('From Location')}</Label>
                <Select value={fromLocationId} onValueChange={setFromLocationId}>
                  <SelectTrigger><SelectValue placeholder={t('Select Warehouse')} /></SelectTrigger>
                  <SelectContent>
                    {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('To Location')}</Label>
                <Select value={toLocationId} onValueChange={setToLocationId}>
                  <SelectTrigger><SelectValue placeholder={t('Select Warehouse')} /></SelectTrigger>
                  <SelectContent>
                    {locations.filter(l => l.id !== fromLocationId).map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Quantity')} {maxAvailable > 0 && `(max: ${maxAvailable})`}</Label>
              <Input
                type="number"
                min={1}
                max={maxAvailable || undefined}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button
              onClick={handleTransfer}
              disabled={saving || !fromLocationId || !toLocationId || !productId || !batchId || quantity <= 0}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              {t('Transfer')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
