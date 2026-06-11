import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Plus, Pencil, Trash2, Check, X, PackagePlus, AlertTriangle, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
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
import { PackagingMaterialFields } from '@/components/compliance/PackagingMaterialFields';
import type { LucidMaterial, MaterialSplitEntry } from '@/types/compliance';
import { toast } from 'sonner';

function stockTone(row: WhPackagingType): { tone: string; label: string } {
  if (!row.stockTracked) return { tone: 'text-muted-foreground', label: '—' };
  const qty = row.stockOnHand ?? 0;
  const thr = row.stockThreshold ?? 10;
  if (qty <= 0) return { tone: 'text-red-700 bg-red-50 dark:bg-red-950/30', label: 'Leer' };
  if (qty <= thr) return { tone: 'text-amber-700 bg-amber-50 dark:bg-amber-950/30', label: 'Niedrig' };
  return { tone: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30', label: 'OK' };
}

interface FormState {
  id?: string;
  name: string;
  description: string;
  tare_weight_grams: string;
  inner_length_cm: string;
  inner_width_cm: string;
  inner_height_cm: string;
  max_load_grams: string;
  is_active: boolean;
  is_default: boolean;
  sort_order: string;
  stock_tracked: boolean;
  stock_threshold: string;
  primary_material: LucidMaterial | null;
  material_split: MaterialSplitEntry[] | null;
}

const EMPTY: FormState = {
  name: '',
  description: '',
  tare_weight_grams: '0',
  inner_length_cm: '',
  inner_width_cm: '',
  inner_height_cm: '',
  max_load_grams: '',
  is_active: true,
  is_default: false,
  sort_order: '0',
  stock_tracked: false,
  stock_threshold: '10',
  primary_material: null,
  material_split: null,
};

export function PackagingTypesPage() {
  const { t } = useTranslation('warehouse');
  const [rows, setRows] = useState<WhPackagingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
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

  return (
    <div className="px-4 py-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Box className="h-5 w-5 sm:h-6 sm:w-6" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t('Umverpackung')}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('Kartons und Versandumschläge, die beim Shipment als Umverpackung zusätzlich zum Produktgewicht addiert werden.')}
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Neue Umverpackung')}
        </Button>
      </div>

      {lowStockRows.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  {t('{{count}} Umverpackung(en) unter Schwelle', { count: lowStockRows.length })}
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStockRows.map(r => {
                    const st = stockTone(r);
                    return (
                      <div key={r.id} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${st.tone}`}>
                        <Package className="h-3 w-3" />
                        <span className="font-medium">{r.name}</span>
                        <span className="tabular-nums">{r.stockOnHand} / {r.stockThreshold}</span>
                        <Button size="sm" variant="ghost" className="h-auto py-0.5 px-2 text-xs" onClick={() => openReceipt(r)}>
                          <PackagePlus className="h-3 w-3 mr-1" />
                          {t('Nachbestellen')}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? t('Umverpackung bearbeiten') : t('Neue Umverpackung')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label htmlFor="name">{t('Name')} *</Label>
              <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('z.B. Versandkarton M')} />
            </div>
            <div>
              <Label htmlFor="desc">{t('Beschreibung')}</Label>
              <Input id="desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder={t('Kurze Erklärung wofür')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="tare">{t('Tara (g)')} *</Label>
                <Input id="tare" type="number" value={form.tare_weight_grams} onChange={e => setForm({ ...form, tare_weight_grams: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="maxload">{t('Max Last (g)')}</Label>
                <Input id="maxload" type="number" value={form.max_load_grams} onChange={e => setForm({ ...form, max_load_grams: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>{t('Innenmaße (cm)')}</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input type="number" step="0.5" placeholder={t('Länge')} value={form.inner_length_cm} onChange={e => setForm({ ...form, inner_length_cm: e.target.value })} />
                <Input type="number" step="0.5" placeholder={t('Breite')} value={form.inner_width_cm} onChange={e => setForm({ ...form, inner_width_cm: e.target.value })} />
                <Input type="number" step="0.5" placeholder={t('Höhe')} value={form.inner_height_cm} onChange={e => setForm({ ...form, inner_height_cm: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch id="active" checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
                <Label htmlFor="active">{t('Aktiv')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="default" checked={form.is_default} onCheckedChange={v => setForm({ ...form, is_default: v })} />
                <Label htmlFor="default">{t('Default bei Auto-Vorschlag')}</Label>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Label htmlFor="sort">{t('Sortierung')}</Label>
                <Input id="sort" type="number" className="w-16" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} />
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <Switch id="tracked" checked={form.stock_tracked} onCheckedChange={v => setForm({ ...form, stock_tracked: v })} />
                <Label htmlFor="tracked" className="font-medium">{t('Bestand tracken')}</Label>
              </div>
              {form.stock_tracked && (
                <div className="grid grid-cols-[1fr_1fr] gap-3">
                  <div>
                    <Label htmlFor="threshold">{t('Warnschwelle')}</Label>
                    <Input
                      id="threshold"
                      type="number"
                      min="0"
                      value={form.stock_threshold}
                      onChange={e => setForm({ ...form, stock_threshold: e.target.value })}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {t('Ab diesem Stand kommt eine Warnung')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mt-2">
              <PackagingMaterialFields
                primaryMaterial={form.primary_material}
                materialSplit={form.material_split}
                tareWeightGrams={parseInt(form.tare_weight_grams) || 0}
                onChange={(patch) => setForm({
                  ...form,
                  ...(patch.primaryMaterial !== undefined ? { primary_material: patch.primaryMaterial } : {}),
                  ...(patch.materialSplit !== undefined ? { material_split: patch.materialSplit } : {}),
                })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="mr-1 h-4 w-4" />{t('Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              <Check className="mr-1 h-4 w-4" />{saving ? t('Saving...') : t('Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wareneingang buchen */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <PackagePlus className="h-5 w-5 text-emerald-600" />
                {t('Wareneingang buchen')}
              </span>
            </DialogTitle>
          </DialogHeader>
          {receiptTarget && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                <div className="font-medium">{receiptTarget.name}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {t('Aktueller Bestand')}: {receiptTarget.stockOnHand}
                </div>
              </div>
              <div>
                <Label htmlFor="receipt-qty">{t('Menge neuer Karton(s)')} *</Label>
                <Input
                  id="receipt-qty"
                  type="number"
                  min="1"
                  autoFocus
                  value={receiptQty}
                  onChange={e => setReceiptQty(e.target.value)}
                  placeholder="z.B. 50"
                />
              </div>
              <div>
                <Label htmlFor="receipt-notes">{t('Notiz')} ({t('optional')})</Label>
                <Textarea
                  id="receipt-notes"
                  value={receiptNotes}
                  onChange={e => setReceiptNotes(e.target.value)}
                  placeholder={t('z.B. Lieferschein-Nr. oder Lieferant')}
                  rows={2}
                />
              </div>
              {receiptQty && parseInt(receiptQty) > 0 && (
                <div className="text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 rounded-lg">
                  {t('Neuer Bestand')}: <span className="font-semibold tabular-nums">{receiptTarget.stockOnHand + parseInt(receiptQty)}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              <X className="mr-1 h-4 w-4" />{t('Cancel')}
            </Button>
            <Button onClick={handleReceiptSave} disabled={!receiptQty || parseInt(receiptQty) <= 0}>
              <Check className="mr-1 h-4 w-4" />{t('Buchen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventur-Korrektur */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('Inventur-Korrektur')}</DialogTitle>
          </DialogHeader>
          {adjustTarget && (
            <div className="space-y-3">
              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                <div className="font-medium">{adjustTarget.name}</div>
                <div className="text-xs text-muted-foreground tabular-nums">
                  {t('Bisheriger Bestand')}: {adjustTarget.stockOnHand}
                </div>
              </div>
              <div>
                <Label htmlFor="adjust-qty">{t('Tatsächlicher Bestand')} *</Label>
                <Input
                  id="adjust-qty"
                  type="number"
                  min="0"
                  autoFocus
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t('Wird als „adjustment"-Transaktion protokolliert')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              <X className="mr-1 h-4 w-4" />{t('Cancel')}
            </Button>
            <Button onClick={handleAdjustSave}>
              <Check className="mr-1 h-4 w-4" />{t('Speichern')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
