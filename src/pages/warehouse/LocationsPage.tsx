import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Warehouse, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { getLocations, createLocation, updateLocation, deleteLocation, getLocationStats } from '@/services/supabase/wh-locations';
import type { WhLocation, WhLocationInput, WarehouseLocationType, LocationStats } from '@/types/warehouse';

const LOCATION_TYPES: WarehouseLocationType[] = ['main', 'external', 'dropship', 'consignment', 'returns'];

export function LocationsPage() {
  const { t } = useTranslation('warehouse');
  const [locs, setLocs] = useState<WhLocation[]>([]);
  const [stats, setStats] = useState<Record<string, LocationStats>>({});
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WhLocation | null>(null);
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
    setEditing(null);
    setForm({ name: '', type: 'main' });
    setDialogOpen(true);
  };

  const openEdit = (loc: WhLocation) => {
    setEditing(loc);
    setForm({
      name: loc.name,
      code: loc.code,
      type: loc.type,
      street: loc.street,
      city: loc.city,
      postalCode: loc.postalCode,
      country: loc.country,
      facilityIdentifier: loc.facilityIdentifier,
      capacityUnits: loc.capacityUnits,
      isActive: loc.isActive,
      notes: loc.notes,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await updateLocation(editing.id, form);
      } else {
        await createLocation(form);
      }
      setDialogOpen(false);
      toast.success(editing ? t('Location updated', { ns: 'common' }) : t('Create Location'));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('Are you sure?', { ns: 'common' }))) return;
    try {
      await deleteLocation(id);
      toast.success(t('Deleted', { ns: 'common' }));
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('Warehouse Locations')}</h1>
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
            const locStats = stats[loc.id] || { totalItems: 0, totalBatches: 0 };
            return (
              <Card key={loc.id} className={!loc.isActive ? 'opacity-60' : ''}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                    {loc.code && <p className="text-xs text-muted-foreground font-mono">{loc.code}</p>}
                  </div>
                  <Badge variant="secondary">{t(loc.type)}</Badge>
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
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}>
                      <Pencil className="h-3 w-3 mr-1" /> {t('Edit', { ns: 'common' })}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(loc.id)} className="text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('Edit Location') : t('Create Location')}</DialogTitle>
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
            <div className="space-y-2">
              <Label>{t('Notes')}</Label>
              <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive !== false} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                <Label>{t('Active')}</Label>
              </div>
            )}
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
