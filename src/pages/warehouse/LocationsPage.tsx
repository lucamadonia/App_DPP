import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Warehouse, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getLocations, createLocation, getLocationStats } from '@/services/supabase/wh-locations';
import type { WhLocation, WhLocationInput, WarehouseLocationType, LocationStats } from '@/types/warehouse';

const LOCATION_TYPES: WarehouseLocationType[] = ['main', 'external', 'dropship', 'consignment', 'returns'];

function capacityColor(percent: number): string {
  if (percent > 90) return 'bg-red-500';
  if (percent >= 70) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function LocationsPage() {
  const { t } = useTranslation('warehouse');
  const [locs, setLocs] = useState<WhLocation[]>([]);
  const [stats, setStats] = useState<Record<string, LocationStats>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<WhLocationInput>({ name: '', type: 'main' });

  const load = async () => {
    try {
      const data = await getLocations();
      setLocs(data);
      const statsMap: Record<string, LocationStats> = {};
      await Promise.all(data.map(async (l) => {
        statsMap[l.id] = await getLocationStats(l.id);
      }));
      setStats(statsMap);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ name: '', type: 'main' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      await createLocation(form);
      setDialogOpen(false);
      toast.success(t('Create Location'));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">{t('Warehouse Locations')}</h1>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Create Location')}
        </Button>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : locs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Warehouse className="h-12 w-12 mb-4 opacity-50" />
            <p>{t('No locations configured')}</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Create Location')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locs.map((loc) => {
            const locStats = stats[loc.id] || { totalItems: 0, totalBatches: 0, zoneCount: 0, binLocationCount: 0, lowStockCount: 0 };
            const usedPercent = locStats.capacityUsedPercent || 0;
            return (
              <Link key={loc.id} to={`/warehouse/locations/${loc.id}`}>
                <Card className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5${!loc.isActive ? ' opacity-60' : ''}`}>
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{loc.name}</CardTitle>
                      {loc.code && <p className="text-xs text-muted-foreground font-mono">{loc.code}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline">{locStats.zoneCount} {t('Zones')}</Badge>
                      <Badge variant="secondary">{t(loc.type)}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(loc.city || loc.country) && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {[loc.city, loc.country].filter(Boolean).join(', ')}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">{t('Stock')}:</span> <span className="font-medium">{locStats.totalItems}</span></div>
                      <div><span className="text-muted-foreground">{t('Batch', { count: locStats.totalBatches })}:</span> <span className="font-medium">{locStats.totalBatches}</span></div>
                      {loc.areaM2 && (
                        <div><span className="text-muted-foreground">{t('Area (m²)')}:</span> <span className="font-medium">{loc.areaM2} m²</span></div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t('Capacity')}</span>
                        <span>{Math.round(usedPercent)}%</span>
                      </div>
                      <div className="relative h-2 w-full overflow-hidden rounded-full bg-primary/20">
                        <div
                          className={`h-full transition-all duration-500 ${capacityColor(usedPercent)}`}
                          style={{ width: `${Math.min(usedPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('Create Location')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('Location Name')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Location Code')}</Label>
                <Input value={form.code || ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="WH-01" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Location Type')}</Label>
              <Select value={form.type || 'main'} onValueChange={(v) => setForm({ ...form, type: v as WarehouseLocationType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOCATION_TYPES.map((type) => <SelectItem key={type} value={type}>{t(type)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('City')}</Label>
                <Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>{t('Country')}</Label>
                <Input value={form.country || ''} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Facility Identifier')}</Label>
              <Input value={form.facilityIdentifier || ''} onChange={(e) => setForm({ ...form, facilityIdentifier: e.target.value })} placeholder="GLN" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>{t('Capacity Units')}</Label>
                <Input
                  type="number"
                  value={form.capacityUnits || ''}
                  onChange={(e) => setForm({ ...form, capacityUnits: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Capacity Volume')}</Label>
                <Input
                  type="number"
                  value={form.capacityVolumeM3 || ''}
                  onChange={(e) => setForm({ ...form, capacityVolumeM3: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('Area (m²)')}</Label>
                <Input
                  type="number"
                  value={form.areaM2 || ''}
                  onChange={(e) => setForm({ ...form, areaM2: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button onClick={handleSave} disabled={!form.name}>{t('Save', { ns: 'common' })}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
