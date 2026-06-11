import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Plus,
  Warehouse,
  Search,
  Map,
  ArrowRight,
  ArrowUpDown,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { LocationCard } from '@/components/warehouse/location-card';
import { getLocations, createLocation, getLocationStats } from '@/services/supabase/wh-locations';
import { gridStagger, blurIn } from '@/lib/motion';
import { cn } from '@/lib/utils';
import type { WhLocation, WhLocationInput, WarehouseLocationType, LocationStats } from '@/types/warehouse';

const LOCATION_TYPES: WarehouseLocationType[] = ['main', 'external', 'dropship', 'consignment', 'returns'];

const EMPTY_STATS: LocationStats = {
  totalItems: 0,
  totalBatches: 0,
  zoneCount: 0,
  binLocationCount: 0,
  lowStockCount: 0,
};

type SortMode = 'utilization' | 'name';

/* ------------------------------------------------------------------ */
/* Floor map hero                                                      */
/* ------------------------------------------------------------------ */

/** Stylized mini floor-map preview: CSS grid with hinted shelf racks. */
function FloorMapMiniPreview({ animated }: { animated: boolean }) {
  return (
    <div className="relative hidden h-24 w-36 shrink-0 overflow-hidden rounded-lg border border-primary/20 bg-background/60 sm:block" aria-hidden="true">
      <div className={cn('absolute inset-0 hub-grid-bg [background-size:12px_12px]', animated && 'animate-grid-drift')} />
      {/* hinted racks */}
      <div className="absolute left-2 top-2 h-3 w-12 rounded-sm bg-primary/30" />
      <div className="absolute left-2 top-7 h-3 w-12 rounded-sm bg-primary/20" />
      <div className="absolute left-2 top-12 h-3 w-8 rounded-sm bg-primary/25" />
      <div className="absolute right-3 top-3 h-10 w-3 rounded-sm bg-cyan-500/30" />
      <div className="absolute right-8 top-3 h-14 w-3 rounded-sm bg-cyan-500/20" />
      <div className="absolute bottom-3 right-3 h-3 w-10 rounded-sm bg-emerald-500/30" />
      {/* pulsing stock dot */}
      <span className="absolute left-12 top-12 flex h-2 w-2">
        {animated && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
    </div>
  );
}

function FloorMapHero({ location }: { location: WhLocation }) {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      variants={prefersReduced ? undefined : blurIn}
      whileTap={prefersReduced ? undefined : { scale: 0.97 }}
    >
      <Link
        to={`/warehouse/locations/${location.id}`}
        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Card className="relative block gap-0 overflow-hidden border-primary/20 p-4 transition-shadow duration-300 group-hover:shadow-lg sm:p-5">
          <div className={cn('absolute inset-0 hub-grid-bg opacity-60', !prefersReduced && 'animate-grid-drift')} />
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-md">
              <Map className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold leading-tight sm:text-lg">{t('Open Floor Map')}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                {t('Plan zones, shelves and stock visually on the interactive floor map')}
              </p>
            </div>
            <FloorMapMiniPreview animated={!prefersReduced} />
            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading / error / empty states                                      */
/* ------------------------------------------------------------------ */

function LocationCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card p-4 sm:p-5">
      <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-muted/50 to-transparent" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/3 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <div className="h-20 w-20 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-16 rounded bg-muted" />
          <div className="h-3 w-3/4 rounded bg-muted" />
        </div>
      </div>
      <div className="mt-4 h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation('warehouse');
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive/60" />
        <p className="mt-3 text-sm text-muted-foreground">{t('Failed to load locations')}</p>
        <Button variant="outline" className="mt-4 min-h-11 sm:min-h-9" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('Try again')}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function LocationsPage() {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();
  const [locs, setLocs] = useState<WhLocation[]>([]);
  const [stats, setStats] = useState<Record<string, LocationStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<WhLocationInput>({ name: '', type: 'main' });

  // toolbar state
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<WarehouseLocationType | 'all'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('utilization');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getLocations();
      setLocs(data);
      const statsMap: Record<string, LocationStats> = {};
      await Promise.all(data.map(async (l) => {
        // One failing stats query must not break the whole page
        statsMap[l.id] = await getLocationStats(l.id).catch(() => EMPTY_STATS);
      }));
      setStats(statsMap);
    } catch (err) {
      console.error('Failed to load warehouse locations:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const presentTypes = useMemo(
    () => LOCATION_TYPES.filter((type) => locs.some((l) => l.type === type)),
    [locs],
  );

  const visibleLocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = locs.filter((l) => {
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      if (!q) return true;
      return [l.name, l.code, l.city, l.country]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q));
    });
    return [...filtered].sort((a, b) => {
      if (sortMode === 'utilization') {
        const pa = stats[a.id]?.capacityUsedPercent ?? -1;
        const pb = stats[b.id]?.capacityUsedPercent ?? -1;
        if (pb !== pa) return pb - pa;
      }
      return a.name.localeCompare(b.name);
    });
  }, [locs, stats, query, typeFilter, sortMode]);

  const heroLocation = useMemo(
    () => locs.find((l) => l.isActive) ?? locs[0],
    [locs],
  );

  const hasActiveFilters = query.trim() !== '' || typeFilter !== 'all';

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        variants={prefersReduced ? undefined : blurIn}
        initial="initial"
        animate="animate"
        className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center sm:gap-0"
      >
        <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl">
          {t('Warehouse Locations')}
        </h1>
        <Button onClick={openCreate} className="min-h-11 w-full sm:min-h-9 sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          {t('Create Location')}
        </Button>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <LocationCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <ErrorState onRetry={load} />
      ) : locs.length === 0 ? (
        <motion.div variants={prefersReduced ? undefined : blurIn} initial="initial" animate="animate">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/15 to-cyan-500/15">
                <Warehouse className="h-8 w-8 text-primary" />
              </div>
              <p className="mt-4 font-medium">{t('No locations configured')}</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {t('Set up your first warehouse location to start tracking stock and capacity.')}
              </p>
              <Button className="mt-5 min-h-11 sm:min-h-9" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                {t('Create your first location')}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          variants={prefersReduced ? undefined : gridStagger}
          initial="initial"
          animate="animate"
          className="space-y-4 sm:space-y-6"
        >
          {/* Floor map entry */}
          {heroLocation && <FloorMapHero location={heroLocation} />}

          {/* Search / filter / sort toolbar */}
          <motion.div variants={prefersReduced ? undefined : blurIn} className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('Search locations...')}
                  className="h-11 pl-9 sm:h-9"
                  aria-label={t('Search locations...')}
                />
              </div>
              <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
                <SelectTrigger className="h-11! w-full sm:h-9! sm:w-48" aria-label={t('Sort by')}>
                  <ArrowUpDown className="mr-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utilization">{t('Utilization')}</SelectItem>
                  <SelectItem value="name">{t('Name')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {presentTypes.length > 1 && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('Location Type')}>
                {(['all', ...presentTypes] as const).map((type) => (
                  <motion.button
                    key={type}
                    type="button"
                    whileTap={prefersReduced ? undefined : { scale: 0.97 }}
                    onClick={() => setTypeFilter(type as WarehouseLocationType | 'all')}
                    className={cn(
                      'min-h-11 rounded-full border px-4 text-sm transition-colors sm:min-h-8 sm:px-3 sm:text-xs',
                      typeFilter === type
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                  >
                    {type === 'all' ? t('All Types') : t(type)}
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Cards grid */}
          {visibleLocs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="h-8 w-8 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">{t('No locations found')}</p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 min-h-11 sm:min-h-8"
                    onClick={() => { setQuery(''); setTypeFilter('all'); }}
                  >
                    <X className="mr-2 h-3.5 w-3.5" />
                    {t('Clear filters', { ns: 'common' })}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <motion.div
              variants={prefersReduced ? undefined : gridStagger}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
            >
              {visibleLocs.map((loc) => (
                <LocationCard
                  key={loc.id}
                  location={loc}
                  stats={stats[loc.id] || EMPTY_STATS}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
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
