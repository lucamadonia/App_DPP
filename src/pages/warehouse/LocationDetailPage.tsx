import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  Package,
  Layers,
  Ruler,
  Box,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  getLocation,
  getLocationStats,
  updateLocation,
} from '@/services/supabase/wh-locations';
import {
  getStockForLocation,
  getTransactionHistory,
} from '@/services/supabase/wh-stock';
import { ZoneDialog } from '@/components/warehouse/ZoneDialog';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { relativeTime } from '@/lib/animations';
import { ZONE_TYPE_CONFIG } from '@/lib/warehouse-constants';
import type {
  WhLocation,
  WhLocationInput,
  WarehouseZone,
  LocationStats,
  WhStockLevel,
  WhStockTransaction,
  WarehouseLocationType,
} from '@/types/warehouse';

const LOCATION_TYPES: WarehouseLocationType[] = [
  'main',
  'external',
  'dropship',
  'consignment',
  'returns',
];

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

function KPICard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  const animated = useAnimatedNumber(value);
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="rounded-lg bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">
            {animated.toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LocationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation('warehouse');

  // Data
  const [location, setLocation] = useState<WhLocation | null>(null);
  const [stats, setStats] = useState<LocationStats | null>(null);
  const [stock, setStock] = useState<WhStockLevel[]>([]);
  const [transactions, setTransactions] = useState<WhStockTransaction[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [zoneDialogOpen, setZoneDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<WarehouseZone | undefined>(
    undefined,
  );
  const [editingZoneIdx, setEditingZoneIdx] = useState<number>(-1);
  const [editForm, setEditForm] = useState<WhLocationInput>({ name: '' });

  // ------- Load -------
  const loadAll = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [loc, locStats, locStock, locTx] = await Promise.all([
        getLocation(id),
        getLocationStats(id),
        getStockForLocation(id),
        getTransactionHistory({ locationId: id }),
      ]);
      if (!loc) {
        setError('Location not found');
        return;
      }
      setLocation(loc);
      setStats(locStats);
      setStock(locStock);
      setTransactions(locTx);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ------- Edit dialog helpers -------
  const openEditDialog = () => {
    if (!location) return;
    setEditForm({
      name: location.name,
      code: location.code,
      type: location.type,
      street: location.street,
      city: location.city,
      postalCode: location.postalCode,
      country: location.country,
      facilityIdentifier: location.facilityIdentifier,
      capacityUnits: location.capacityUnits,
      capacityVolumeM3: location.capacityVolumeM3,
      areaM2: location.areaM2,
      isActive: location.isActive,
      notes: location.notes,
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!id) return;
    try {
      const updated = await updateLocation(id, editForm);
      setLocation(updated);
      setEditOpen(false);
      toast.success(t('Edit Location'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  // ------- Zone helpers -------
  const openAddZone = () => {
    setEditingZone(undefined);
    setEditingZoneIdx(-1);
    setZoneDialogOpen(true);
  };

  const openEditZone = (zone: WarehouseZone, idx: number) => {
    setEditingZone(zone);
    setEditingZoneIdx(idx);
    setZoneDialogOpen(true);
  };

  const handleSaveZone = async (zone: WarehouseZone) => {
    if (!location || !id) return;
    const zones = [...location.zones];
    if (editingZoneIdx >= 0) {
      zones[editingZoneIdx] = zone;
    } else {
      zones.push(zone);
    }
    try {
      const updated = await updateLocation(id, { zones });
      setLocation(updated);
      setZoneDialogOpen(false);
      toast.success(
        editingZoneIdx >= 0 ? t('Edit Zone') : t('Add Zone'),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDeleteZone = async (idx: number) => {
    if (!location || !id) return;
    if (!confirm(t('Are you sure?', { ns: 'common' }))) return;
    const zones = location.zones.filter((_, i) => i !== idx);
    try {
      const updated = await updateLocation(id, { zones });
      setLocation(updated);
      toast.success(t('Delete Zone'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  // ------- Derived data -------
  const allBins: { zoneName: string; bin: string; stockCount: number }[] = [];
  if (location) {
    for (const zone of location.zones) {
      for (const bin of zone.binLocations ?? []) {
        const stockCount = stock.filter(
          (s) => s.binLocation === bin,
        ).length;
        allBins.push({ zoneName: zone.name, bin, stockCount });
      }
    }
  }

  const totalArea = location?.areaM2 ?? 0;
  const totalVolume = location?.capacityVolumeM3 ?? 0;

  // ------- Render -------
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground">{error || 'Location not found'}</p>
        <Button asChild variant="outline">
          <Link to="/warehouse/locations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('Back to Locations')}
          </Link>
        </Button>
      </div>
    );
  }

  const capacityPercent =
    location.capacityUnits && location.capacityUnits > 0
      ? Math.round(
          ((stats?.totalItems ?? 0) / location.capacityUnits) * 100,
        )
      : undefined;

  const volumeUsed =
    stock.length > 0 && totalVolume > 0
      ? Math.min(
          Math.round((stock.length / (totalVolume * 10)) * 100),
          100,
        )
      : undefined;

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/warehouse/locations">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {location.name}
              </h1>
              {location.code && (
                <span className="text-sm text-muted-foreground font-mono">
                  ({location.code})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{t(location.type)}</Badge>
              <Badge
                variant={location.isActive ? 'default' : 'outline'}
                className={
                  location.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : ''
                }
              >
                {location.isActive ? t('Active') : t('Inactive')}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={openEditDialog}>
          <Pencil className="mr-2 h-4 w-4" />
          {t('Edit Location')}
        </Button>
      </div>

      {/* ---- KPI Row ---- */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          icon={Package}
          label={t('Units')}
          value={stats?.totalItems ?? 0}
        />
        <KPICard
          icon={Layers}
          label={t('Batches')}
          value={stats?.totalBatches ?? 0}
        />
        <KPICard
          icon={Ruler}
          label={t('Area (m\u00B2)')}
          value={totalArea}
        />
        <KPICard
          icon={Box}
          label={t('Volume (m\u00B3)')}
          value={totalVolume}
        />
      </div>

      {/* ---- Tabs ---- */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="zones">{t('Zones')}</TabsTrigger>
          <TabsTrigger value="bins">{t('Bin Locations')}</TabsTrigger>
          <TabsTrigger value="stock">{t('Stock')}</TabsTrigger>
          <TabsTrigger value="activity">{t('Activity')}</TabsTrigger>
        </TabsList>

        {/* ========== Overview ========== */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Location Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('Location')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {(location.street || location.city || location.postalCode || location.country) && (
                  <div>
                    <p className="text-muted-foreground mb-1">{t('Address')}</p>
                    {location.street && <p>{location.street}</p>}
                    <p>
                      {[location.postalCode, location.city]
                        .filter(Boolean)
                        .join(' ')}
                    </p>
                    {location.country && <p>{location.country}</p>}
                  </div>
                )}
                {location.facilityIdentifier && (
                  <div>
                    <p className="text-muted-foreground">{t('Facility Identifier')}</p>
                    <p className="font-mono">{location.facilityIdentifier}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">{t('Location Type')}</p>
                  <p>{t(location.type)}</p>
                </div>
                {location.notes && (
                  <div>
                    <p className="text-muted-foreground">{t('Notes')}</p>
                    <p className="whitespace-pre-wrap">{location.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Capacity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Capacity Units')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Unit capacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('Units')}</span>
                    <span className="tabular-nums">
                      {(stats?.totalItems ?? 0).toLocaleString()}
                      {location.capacityUnits != null &&
                        ` / ${location.capacityUnits.toLocaleString()}`}
                    </span>
                  </div>
                  {capacityPercent != null && (
                    <Progress
                      value={Math.min(capacityPercent, 100)}
                      className="h-2"
                    />
                  )}
                </div>
                {/* Volume capacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('Volume (m\u00B3)')}</span>
                    <span className="tabular-nums">
                      {totalVolume > 0
                        ? `${totalVolume.toLocaleString()} m\u00B3`
                        : '\u2014'}
                    </span>
                  </div>
                  {volumeUsed != null && (
                    <Progress
                      value={Math.min(volumeUsed, 100)}
                      className="h-2"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========== Zones ========== */}
        <TabsContent value="zones" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={openAddZone} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              {t('Add Zone')}
            </Button>
          </div>

          {location.zones.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Layers className="h-10 w-10 mb-3 opacity-50" />
                <p>{t('No zones configured')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {location.zones.map((zone, idx) => {
                const cfg = zone.type
                  ? ZONE_TYPE_CONFIG[zone.type]
                  : ZONE_TYPE_CONFIG.other;
                const zoneLabel =
                  zone.type
                    ? i18n.language.startsWith('de')
                      ? cfg.labelDe
                      : cfg.labelEn
                    : '';
                return (
                  <Card key={zone.code}>
                    <CardHeader className="pb-3 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {zone.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-mono">
                          {zone.code}
                        </p>
                      </div>
                      {zone.type && (
                        <Badge className={`${cfg.bgColor} ${cfg.color} border-0`}>
                          {zoneLabel}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {zone.areaM2 != null && (
                          <div>
                            <span className="text-muted-foreground">
                              {t('Area (m\u00B2)')}:
                            </span>{' '}
                            <span className="font-medium">{zone.areaM2}</span>
                          </div>
                        )}
                        {zone.volumeM3 != null && (
                          <div>
                            <span className="text-muted-foreground">
                              {t('Volume (m\u00B3)')}:
                            </span>{' '}
                            <span className="font-medium">{zone.volumeM3}</span>
                          </div>
                        )}
                      </div>
                      {zone.binLocations && zone.binLocations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {zone.binLocations.map((bin) => (
                            <Badge key={bin} variant="outline" className="text-xs">
                              {bin}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditZone(zone, idx)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          {t('Edit Zone')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => handleDeleteZone(idx)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ========== Bin Locations ========== */}
        <TabsContent value="bins" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Zone')}</TableHead>
                    <TableHead>{t('Bin Code')}</TableHead>
                    <TableHead className="text-right">
                      {t('Stock Count')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allBins.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {t('No bin locations')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    allBins.map((b) => (
                      <TableRow key={`${b.zoneName}-${b.bin}`}>
                        <TableCell>{b.zoneName}</TableCell>
                        <TableCell className="font-mono">{b.bin}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {b.stockCount}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Stock ========== */}
        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Product')}</TableHead>
                    <TableHead>{t('Batch')}</TableHead>
                    <TableHead>{t('Bin Location')}</TableHead>
                    <TableHead className="text-right">
                      {t('Available Quantity')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('Reserved Quantity')}
                    </TableHead>
                    <TableHead className="text-right">
                      {t('Reorder Point')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stock.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        {t('No stock data')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    stock.map((s) => {
                      const isLow =
                        s.reorderPoint != null &&
                        s.quantityAvailable <= s.reorderPoint;
                      return (
                        <TableRow
                          key={s.id}
                          className={
                            isLow
                              ? 'bg-orange-50/50 dark:bg-orange-950/10'
                              : ''
                          }
                        >
                          <TableCell className="font-medium">
                            {s.productName || s.productId.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {s.batchSerialNumber || s.batchId.slice(0, 8)}
                          </TableCell>
                          <TableCell>{s.binLocation || '\u2014'}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.quantityAvailable.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {s.quantityReserved.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {s.reorderPoint != null
                              ? s.reorderPoint.toLocaleString()
                              : '\u2014'}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Activity ========== */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Type')}</TableHead>
                    <TableHead>{t('Product')}</TableHead>
                    <TableHead className="text-right">{t('Quantity')}</TableHead>
                    <TableHead className="text-right">{t('Date')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                        {t('No activity yet')}
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <Badge variant="outline">{t(tx.type)}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {tx.productName || tx.productId.slice(0, 8)}
                        </TableCell>
                        <TableCell
                          className={`text-right tabular-nums font-medium ${
                            tx.quantity >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {tx.quantity >= 0 ? '+' : ''}
                          {tx.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                          {relativeTime(tx.createdAt, i18n.language)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ---- Zone Dialog ---- */}
      <ZoneDialog
        open={zoneDialogOpen}
        onOpenChange={setZoneDialogOpen}
        zone={editingZone}
        existingCodes={location.zones.map((z) => z.code)}
        onSave={handleSaveZone}
      />

      {/* ---- Edit Location Dialog ---- */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Edit Location')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Location Name')}</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Location Code')}</Label>
                <Input
                  value={editForm.code || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, code: e.target.value })
                  }
                  placeholder="WH-01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Location Type')}</Label>
              <Select
                value={editForm.type || 'main'}
                onValueChange={(v) =>
                  setEditForm({
                    ...editForm,
                    type: v as WarehouseLocationType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Street')}</Label>
                <Input
                  value={editForm.street || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, street: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('City')}</Label>
                <Input
                  value={editForm.city || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, city: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Postal Code')}</Label>
                <Input
                  value={editForm.postalCode || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, postalCode: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Country')}</Label>
                <Input
                  value={editForm.country || ''}
                  onChange={(e) =>
                    setEditForm({ ...editForm, country: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Facility Identifier')}</Label>
              <Input
                value={editForm.facilityIdentifier || ''}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    facilityIdentifier: e.target.value,
                  })
                }
                placeholder="GLN"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('Capacity Units')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={editForm.capacityUnits ?? ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      capacityUnits: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Area (m\u00B2)')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={editForm.areaM2 ?? ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      areaM2: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Volume (m\u00B3)')}</Label>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={editForm.capacityVolumeM3 ?? ''}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      capacityVolumeM3: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea
                value={editForm.notes || ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editForm.isActive !== false}
                onCheckedChange={(v) =>
                  setEditForm({ ...editForm, isActive: v })
                }
              />
              <Label>{t('Active')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleEditSave} disabled={!editForm.name}>
              {t('Save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
