import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Box, Boxes, Plus, Pencil, Trash2, Check, PackagePlus, AlertTriangle, Package, LayoutGrid, Table as TableIcon, Scale } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/adaptive-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { KPIGrid, type KPIItem } from '@/components/ui/kpi-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { EmptyState } from '@/components/ui/state-feedback';
import { recordPackagingReceipt, adjustPackagingStock, updatePackagingTracking } from '@/services/supabase/wh-shipments';
import {
  getPackagingTypes,
  createPackagingType,
  updatePackagingType,
  deletePackagingType,
  setPackagingTypeActive,
  type WhPackagingType,
  type WhPackagingTypeInput,
} from '@/services/supabase/wh-packaging-types';
import { getPackagingUsage } from '@/services/supabase/wh-packaging-usage';
import { EMPTY_PACKAGING_FORM, PackagingTypeCreateWizard, PackagingTypeEditSections, type PackagingFormState } from '@/components/warehouse/PackagingTypeFormFields';
import { FormActions, FormField } from '@/components/ui/form-layout';
import { PackagingTypeCard, PackagingTypeCardSkeleton } from '@/components/warehouse/packaging-type-card';
import { gridStagger, useMotionVariants } from '@/lib/motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { PageContainer } from '@/components/layout/page-container';

const VIEW_STORAGE_KEY = 'wh-packaging-types-view';
type ViewMode = 'table' | 'cards';
/** Low-stock chips shown before "Show all". */
const LOW_STOCK_PREVIEW = 4;

function stockTone(row: WhPackagingType): { tone: string; label: string } {
  if (!row.stockTracked) return { tone: 'text-muted-foreground', label: '—' };
  const qty = row.stockOnHand ?? 0;
  const thr = row.stockThreshold ?? 10;
  if (qty <= 0) return { tone: 'text-red-700 bg-red-50 dark:bg-red-950/30', label: 'Leer' };
  if (qty <= thr) return { tone: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30', label: 'Niedrig' };
  return { tone: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30', label: 'OK' };
}

type FormState = PackagingFormState;
const EMPTY: FormState = EMPTY_PACKAGING_FORM;

export function PackagingTypesPage() {
  const { t } = useTranslation('warehouse');
  const isMobile = useIsMobile();
  const cardsContainerVariants = useMotionVariants(gridStagger);
  const [rows, setRows] = useState<WhPackagingType[]>([]);
  const [loading, setLoading] = useState(true);
  // The low-stock banner lists a few chips; the rest open on request so a
  // long list never pushes the actual table off screen.
  const [showAllLowStock, setShowAllLowStock] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_STORAGE_KEY);
    if (stored === 'table' || stored === 'cards') return stored;
    return 'cards';
  });
  const [usageKg, setUsageKg] = useState<number | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const updateForm = (updates: Partial<FormState>) => setForm((prev) => ({ ...prev, ...updates }));
  const [saving, setSaving] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<WhPackagingType | null>(null);
  const [receiptQty, setReceiptQty] = useState('');
  const [receiptNotes, setReceiptNotes] = useState('');
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<WhPackagingType | null>(null);
  const [adjustQty, setAdjustQty] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getPackagingTypes());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Persist view mode (desktop only — mobile always renders cards)
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

  // Consumed outer-packaging kg over the last 30 days (KPI)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const to = new Date();
        to.setHours(23, 59, 59, 999);
        const from = new Date();
        from.setDate(from.getDate() - 30);
        from.setHours(0, 0, 0, 0);
        const result = await getPackagingUsage({ from: from.toISOString(), to: to.toISOString() });
        if (!cancelled) setUsageKg(result.totals.outerKg);
      } catch (e) {
        console.error('Failed to load packaging usage:', e);
        if (!cancelled) setUsageKg(null);
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function openCreate() {
    setForm({ ...EMPTY, sort_order: String((rows.at(-1)?.sortOrder ?? 0) + 1) });
    setDialogOpen(true);
  }

  function openEdit(r: WhPackagingType) {
    setForm({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      tare_weight_grams: String(r.tareWeightGrams ?? 0),
      inner_length_cm: r.innerLengthCm != null ? String(r.innerLengthCm) : '',
      inner_width_cm: r.innerWidthCm != null ? String(r.innerWidthCm) : '',
      inner_height_cm: r.innerHeightCm != null ? String(r.innerHeightCm) : '',
      max_load_grams: r.maxLoadGrams != null ? String(r.maxLoadGrams) : '',
      is_active: r.isActive,
      is_default: r.isDefault,
      sort_order: String(r.sortOrder ?? 0),
      stock_tracked: r.stockTracked ?? false,
      stock_threshold: String(r.stockThreshold ?? 10),
      primary_material: r.primaryMaterial ?? null,
      material_split: r.materialSplit ?? null,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error(t('Name required')); return; }
    setSaving(true);
    try {
      const input: WhPackagingTypeInput = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        tareWeightGrams: parseInt(form.tare_weight_grams) || 0,
        innerLengthCm: form.inner_length_cm ? parseFloat(form.inner_length_cm) : null,
        innerWidthCm: form.inner_width_cm ? parseFloat(form.inner_width_cm) : null,
        innerHeightCm: form.inner_height_cm ? parseFloat(form.inner_height_cm) : null,
        maxLoadGrams: form.max_load_grams ? parseInt(form.max_load_grams) : null,
        isActive: form.is_active,
        isDefault: form.is_default,
        sortOrder: parseInt(form.sort_order) || 0,
        stockTracked: form.stock_tracked,
        stockThreshold: parseInt(form.stock_threshold) || 10,
        primaryMaterial: form.primary_material,
        materialSplit: form.material_split,
      };

      if (form.id) {
        await updatePackagingType(form.id, input);
        toast.success(t('Updated'));
      } else {
        await createPackagingType(input);
        toast.success(t('Created'));
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deletePackagingType(id);
      toast.success(t('Deleted'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleToggleActive(r: WhPackagingType) {
    try {
      await setPackagingTypeActive(r.id, !r.isActive);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleToggleTracked(r: WhPackagingType) {
    try {
      await updatePackagingTracking(r.id, !r.stockTracked, r.stockThreshold);
      toast.success(r.stockTracked ? t('Tracking disabled') : t('Tracking enabled'));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  function openReceipt(r: WhPackagingType) {
    setReceiptTarget(r);
    setReceiptQty('');
    setReceiptNotes('');
    setReceiptOpen(true);
  }

  async function handleReceiptSave() {
    if (!receiptTarget) return;
    const qty = parseInt(receiptQty);
    if (!qty || qty <= 0) { toast.error(t('Menge muss > 0 sein')); return; }
    try {
      await recordPackagingReceipt(receiptTarget.id, qty, receiptNotes || undefined);
      toast.success(t('{{qty}} Stück gebucht', { qty }));
      setReceiptOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  function openAdjust(r: WhPackagingType) {
    setAdjustTarget(r);
    setAdjustQty(String(r.stockOnHand ?? 0));
    setAdjustOpen(true);
  }

  async function handleAdjustSave() {
    if (!adjustTarget) return;
    const qty = parseInt(adjustQty);
    if (isNaN(qty) || qty < 0) { toast.error(t('Ungültige Menge')); return; }
    try {
      await adjustPackagingStock(adjustTarget.id, qty, 'Manuelle Inventur');
      toast.success(t('Bestand aktualisiert'));
      setAdjustOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  }

  const lowStockRows = rows.filter(r => r.stockTracked && (r.stockOnHand ?? 0) <= (r.stockThreshold ?? 10));
  const activeCount = rows.filter(r => r.isActive).length;
  const trackedRows = rows.filter(r => r.stockTracked);
  const totalStock = trackedRows.reduce((sum, r) => sum + (r.stockOnHand ?? 0), 0);
  const showCards = isMobile || viewMode === 'cards';

  const kpiSkeleton = <ShimmerSkeleton className="h-7 w-14" />;
  const kpiItems: KPIItem[] = [
    {
      id: 'active-types',
      label: t('Active types'),
      icon: <Box className="h-4 w-4" />,
      value: loading ? kpiSkeleton : <AnimatedCounter value={activeCount} />,
      sublabel: loading ? undefined : t('of {{total}} total', { total: rows.length }),
    },
    {
      id: 'total-stock',
      label: t('Total stock'),
      icon: <Boxes className="h-4 w-4" />,
      value: loading ? kpiSkeleton : <AnimatedCounter value={totalStock} />,
      sublabel: loading ? undefined : t('{{n}} tracked', { n: trackedRows.length }),
    },
    {
      id: 'low-stock',
      label: t('Below threshold'),
      icon: <AlertTriangle className="h-4 w-4" />,
      value: loading ? kpiSkeleton : <AnimatedCounter value={lowStockRows.length} />,
      accentClassName: !loading && lowStockRows.length > 0 ? 'text-amber-600 dark:text-amber-500' : undefined,
    },
    {
      id: 'usage-30d',
      label: t('Consumed kg (30 days)'),
      icon: <Scale className="h-4 w-4" />,
      value: usageLoading
        ? kpiSkeleton
        : usageKg == null
          ? '—'
          : <AnimatedCounter value={usageKg} decimals={1} suffix=" kg" />,
      sublabel: t('Outer packaging (tare)'),
    },
  ];

  const viewToggle = (
    <div className="hidden md:flex items-center border rounded-md">
      <Button
        variant={viewMode === 'cards' ? 'default' : 'ghost'}
        size="icon"
        className="h-9 w-9 rounded-r-none"
        onClick={() => setViewMode('cards')}
        title={t('Card View')}
        aria-label={t('Card View')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        size="icon"
        className="h-9 w-9 rounded-l-none"
        onClick={() => setViewMode('table')}
        title={t('Table View')}
        aria-label={t('Table View')}
      >
        <TableIcon className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <PageContainer
      size="full"
      padding={false}
      className="px-4 py-4 sm:p-6"
      onRefresh={load}
      title={
        <span className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Box className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
          <span className="truncate">{t('Umverpackung')}</span>
        </span>
      }
      description={t('Kartons und Versandumschläge, die beim Shipment als Umverpackung zusätzlich zum Produktgewicht addiert werden.')}
      actions={
        <>
          {viewToggle}
          <Button onClick={openCreate} className="min-h-11 sm:min-h-9">
            <Plus className="mr-2 h-4 w-4" />
            {t('Neue Umverpackung')}
          </Button>
        </>
      }
    >
      <div className="space-y-4 sm:space-y-6">
      <KPIGrid items={kpiItems} cols={{ base: 2, lg: 4 }} compact />

      {lowStockRows.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-900">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  {t('{{count}} Umverpackung(en) unter Schwelle', { count: lowStockRows.length })}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(showAllLowStock ? lowStockRows : lowStockRows.slice(0, LOW_STOCK_PREVIEW)).map(r => {
                    const st = stockTone(r);
                    return (
                      <div key={r.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${st.tone}`}>
                        <Package className="h-3 w-3" />
                        <span className="font-medium">{r.name}</span>
                        <span className="tabular-nums">{r.stockOnHand} / {r.stockThreshold}</span>
                        <Button size="sm" variant="ghost" className="h-auto min-h-8 py-0.5 px-2 text-xs" onClick={() => openReceipt(r)}>
                          <PackagePlus className="h-3 w-3 mr-1" />
                          {t('Nachbestellen')}
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {lowStockRows.length > LOW_STOCK_PREVIEW && (
                  <Button
                    size="sm"
                    variant="link"
                    className="mt-2 h-auto min-h-8 px-0 text-amber-900 dark:text-amber-100"
                    aria-expanded={showAllLowStock}
                    onClick={() => setShowAllLowStock(v => !v)}
                  >
                    {showAllLowStock
                      ? t('Show less')
                      : t('Show all ({{count}})', { count: lowStockRows.length })}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showCards ? (
        loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PackagingTypeCardSkeleton key={i} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={Box}
                title={t('Keine Umverpackungen angelegt')}
                description={t('Create cartons and mailers — their tare weight is added to shipments automatically.')}
                actionLabel={t('Create first packaging type')}
                onAction={openCreate}
              />
            </CardContent>
          </Card>
        ) : (
          <motion.div
            variants={cardsContainerVariants}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3"
          >
            {rows.map(r => (
              <PackagingTypeCard
                key={r.id}
                row={r}
                onEdit={openEdit}
                onDelete={handleDelete}
                onReceipt={openReceipt}
                onAdjust={openAdjust}
                onToggleActive={handleToggleActive}
              />
            ))}
          </motion.div>
        )
      ) : (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Alle Typen')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Name')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Beschreibung')}</TableHead>
                  <TableHead className="text-right">{t('Tara')}</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">{t('Innenmaße')} (cm)</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">{t('Max Last')}</TableHead>
                  <TableHead className="text-right">{t('Bestand')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('Tracked')}</TableHead>
                  <TableHead>{t('Aktiv')}</TableHead>
                  <TableHead className="text-right">{t('Aktionen')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('Loading...')}</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">{t('Keine Umverpackungen angelegt')}</TableCell></TableRow>
                ) : rows.map(r => {
                  const st = stockTone(r);
                  return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.isDefault && <Badge variant="secondary" className="mt-1 text-xs">{t('Default')}</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[240px] truncate">{r.description || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.tareWeightGrams} g</TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums text-xs">
                      {r.innerLengthCm && r.innerWidthCm && r.innerHeightCm
                        ? `${r.innerLengthCm} × ${r.innerWidthCm} × ${r.innerHeightCm}`
                        : '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums">
                      {r.maxLoadGrams ? `${r.maxLoadGrams} g` : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.stockTracked ? (
                        <button
                          type="button"
                          onClick={() => openAdjust(r)}
                          className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold tabular-nums transition-colors hover:opacity-80 cursor-pointer ${st.tone}`}
                          title={t('Inventur-Korrektur')}
                        >
                          {r.stockOnHand}
                          <span className="opacity-60">/ {r.stockThreshold}</span>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Switch checked={r.stockTracked} onCheckedChange={() => handleToggleTracked(r)} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={r.isActive} onCheckedChange={() => handleToggleActive(r)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {r.stockTracked && (
                          <Button size="icon" variant="ghost" onClick={() => openReceipt(r)} aria-label={t('Wareneingang buchen')} title={t('Wareneingang buchen')}>
                            <PackagePlus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label={t('Edit')}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" aria-label={t('Delete')}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('Umverpackung löschen?')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('„{{name}}" wird aus der Liste entfernt. Shipments, die diesen Typ nutzen, verlieren die Zuordnung.', { name: r.name })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)}>{t('Delete')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto pb-0">
          <DialogHeader>
            <DialogTitle>{form.id ? t('Umverpackung bearbeiten') : t('Neue Umverpackung')}</DialogTitle>
          </DialogHeader>
          {form.id ? (
            <>
              <PackagingTypeEditSections form={form} onChange={updateForm} />
              <FormActions sticky="dialog">
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  {t('Cancel')}
                </Button>
                <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
                  <Check className="mr-1 h-4 w-4" />{saving ? t('Saving...') : t('Save')}
                </Button>
              </FormActions>
            </>
          ) : (
            <PackagingTypeCreateWizard
              form={form}
              onChange={updateForm}
              onCancel={() => setDialogOpen(false)}
              onFinish={handleSave}
              finishing={saving}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Wareneingang buchen */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md pb-0">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-primary" />
                {t('Wareneingang buchen')}
              </span>
            </DialogTitle>
          </DialogHeader>
          {receiptTarget && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate font-medium">{receiptTarget.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t('Aktueller Bestand')}: {receiptTarget.stockOnHand}
                </span>
              </div>
              <FormField
                label={t('Menge neuer Karton(s)')}
                htmlFor="receipt-qty"
                required
                hint={receiptQty && parseInt(receiptQty) > 0 ? (
                  <>
                    {t('Neuer Bestand')}: <span className="font-semibold text-foreground tabular-nums">{receiptTarget.stockOnHand + parseInt(receiptQty)}</span>
                  </>
                ) : undefined}
              >
                <Input
                  id="receipt-qty"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  autoFocus
                  value={receiptQty}
                  onChange={e => setReceiptQty(e.target.value)}
                  placeholder="z.B. 50"
                />
              </FormField>
              <FormField label={t('Notiz')} htmlFor="receipt-notes" optional>
                <Textarea
                  id="receipt-notes"
                  value={receiptNotes}
                  onChange={e => setReceiptNotes(e.target.value)}
                  placeholder={t('z.B. Lieferschein-Nr. oder Lieferant')}
                  rows={2}
                />
              </FormField>
            </div>
          )}
          <FormActions sticky="dialog">
            <Button variant="ghost" onClick={() => setReceiptOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleReceiptSave} disabled={!receiptQty || parseInt(receiptQty) <= 0}>
              <Check className="mr-1 h-4 w-4" />{t('Buchen')}
            </Button>
          </FormActions>
        </DialogContent>
      </Dialog>

      {/* Inventur-Korrektur */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-md pb-0">
          <DialogHeader>
            <DialogTitle>{t('Inventur-Korrektur')}</DialogTitle>
          </DialogHeader>
          {adjustTarget && (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate font-medium">{adjustTarget.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {t('Bisheriger Bestand')}: {adjustTarget.stockOnHand}
                </span>
              </div>
              <FormField
                label={t('Tatsächlicher Bestand')}
                htmlFor="adjust-qty"
                required
                hint={t('Wird als „adjustment"-Transaktion protokolliert')}
              >
                <Input
                  id="adjust-qty"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  autoFocus
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                />
              </FormField>
            </div>
          )}
          <FormActions sticky="dialog">
            <Button variant="ghost" onClick={() => setAdjustOpen(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleAdjustSave}>
              <Check className="mr-1 h-4 w-4" />{t('Speichern')}
            </Button>
          </FormActions>
        </DialogContent>
      </Dialog>
      </div>
    </PageContainer>
  );
}
