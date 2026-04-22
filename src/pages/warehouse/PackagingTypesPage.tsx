import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { toast } from 'sonner';

interface PackagingRow {
  id: string;
  name: string;
  description: string | null;
  tare_weight_grams: number;
  inner_length_cm: number | null;
  inner_width_cm: number | null;
  inner_height_cm: number | null;
  max_load_grams: number | null;
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
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
};

export function PackagingTypesPage() {
  const { t } = useTranslation('warehouse');
  const [rows, setRows] = useState<PackagingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const tenantId = await getCurrentTenantId();
    if (!tenantId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from('wh_packaging_types')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order', { ascending: true });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setRows((data || []) as PackagingRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ ...EMPTY, sort_order: String((rows.at(-1)?.sort_order ?? 0) + 1) });
    setDialogOpen(true);
  }

  function openEdit(r: PackagingRow) {
    setForm({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      tare_weight_grams: String(r.tare_weight_grams ?? 0),
      inner_length_cm: r.inner_length_cm != null ? String(r.inner_length_cm) : '',
      inner_width_cm: r.inner_width_cm != null ? String(r.inner_width_cm) : '',
      inner_height_cm: r.inner_height_cm != null ? String(r.inner_height_cm) : '',
      max_load_grams: r.max_load_grams != null ? String(r.max_load_grams) : '',
      is_active: r.is_active,
      is_default: r.is_default,
      sort_order: String(r.sort_order ?? 0),
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error(t('Name required')); return; }
    setSaving(true);
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) throw new Error('No tenant');
      const payload = {
        tenant_id: tenantId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        tare_weight_grams: parseInt(form.tare_weight_grams) || 0,
        inner_length_cm: form.inner_length_cm ? parseFloat(form.inner_length_cm) : null,
        inner_width_cm: form.inner_width_cm ? parseFloat(form.inner_width_cm) : null,
        inner_height_cm: form.inner_height_cm ? parseFloat(form.inner_height_cm) : null,
        max_load_grams: form.max_load_grams ? parseInt(form.max_load_grams) : null,
        is_active: form.is_active,
        is_default: form.is_default,
        sort_order: parseInt(form.sort_order) || 0,
      };

      if (form.is_default) {
        await supabase.from('wh_packaging_types').update({ is_default: false }).eq('tenant_id', tenantId);
      }

      if (form.id) {
        const { error } = await supabase.from('wh_packaging_types').update(payload).eq('id', form.id);
        if (error) throw error;
        toast.success(t('Updated'));
      } else {
        const { error } = await supabase.from('wh_packaging_types').insert(payload);
        if (error) throw error;
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
    const { error } = await supabase.from('wh_packaging_types').delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(t('Deleted')); await load(); }
  }

  async function handleToggleActive(r: PackagingRow) {
    const { error } = await supabase.from('wh_packaging_types').update({ is_active: !r.is_active }).eq('id', r.id);
    if (error) toast.error(error.message);
    else await load();
  }

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
                  <TableHead>{t('Aktiv')}</TableHead>
                  <TableHead className="text-right">{t('Aktionen')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('Loading...')}</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('Keine Umverpackungen angelegt')}</TableCell></TableRow>
                ) : rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      {r.is_default && <Badge variant="secondary" className="mt-1 text-xs">{t('Default')}</Badge>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[280px] truncate">{r.description || '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.tare_weight_grams} g</TableCell>
                    <TableCell className="hidden lg:table-cell text-right tabular-nums text-xs">
                      {r.inner_length_cm && r.inner_width_cm && r.inner_height_cm
                        ? `${r.inner_length_cm} × ${r.inner_width_cm} × ${r.inner_height_cm}`
                        : '—'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right tabular-nums">
                      {r.max_load_grams ? `${r.max_load_grams} g` : '—'}
                    </TableCell>
                    <TableCell>
                      <Switch checked={r.is_active} onCheckedChange={() => handleToggleActive(r)} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
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
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
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
    </div>
  );
}
