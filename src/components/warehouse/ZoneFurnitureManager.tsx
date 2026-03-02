import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Package,
  Pencil,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  FURNITURE_CATALOG,
  FURNITURE_CATEGORIES,
  type FurnitureCatalogEntry,
} from '@/components/warehouse/floor-map/furniture-catalog';
import {
  getStockByFurniture,
  getStockBySection,
} from '@/components/warehouse/floor-map/floor-map-utils';
import type {
  WarehouseZone,
  ZoneFurniture,
  FurnitureSection,
  FurnitureType,
  WhStockLevel,
} from '@/types/warehouse';

interface ZoneFurnitureManagerProps {
  zone: WarehouseZone;
  stock: WhStockLevel[];
  onUpdateZone: (zone: WarehouseZone) => void;
}

function generateFurnitureName(
  zoneCode: string,
  type: FurnitureType,
  existing: ZoneFurniture[],
): string {
  const catalog = FURNITURE_CATALOG[type];
  const prefix =
    catalog.category === 'shelving'
      ? zoneCode
      : type === 'table'
        ? 'T'
        : type === 'pallet_spot'
          ? 'P'
          : zoneCode;
  let idx = 1;
  const baseName = (n: number) =>
    `${catalog.labelEn} ${prefix}-${String(n).padStart(2, '0')}`;
  while (existing.some((f) => f.name === baseName(idx))) {
    idx++;
  }
  return baseName(idx);
}

export function ZoneFurnitureManager({
  zone,
  stock,
  onUpdateZone,
}: ZoneFurnitureManagerProps) {
  const { t, i18n } = useTranslation('warehouse');
  const furniture = zone.furniture ?? [];

  const [addOpen, setAddOpen] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Add/Edit dialog state
  const [dialogType, setDialogType] = useState<FurnitureType>('shelf');
  const [dialogName, setDialogName] = useState('');
  const [dialogSections, setDialogSections] = useState<FurnitureSection[]>([]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const openAddDialog = () => {
    const defaultType: FurnitureType = 'shelf';
    const catalog = FURNITURE_CATALOG[defaultType];
    setDialogType(defaultType);
    setDialogName(generateFurnitureName(zone.code, defaultType, furniture));
    setDialogSections(catalog.defaultSections.map((s) => ({ ...s })));
    setEditingIdx(null);
    setAddOpen(true);
  };

  const openEditDialog = (idx: number) => {
    const f = furniture[idx];
    setDialogType(f.type);
    setDialogName(f.name);
    setDialogSections(f.sections.map((s) => ({ ...s })));
    setEditingIdx(idx);
    setAddOpen(true);
  };

  const handleTypeChange = (type: FurnitureType) => {
    const catalog = FURNITURE_CATALOG[type];
    setDialogType(type);
    if (editingIdx === null) {
      setDialogName(generateFurnitureName(zone.code, type, furniture));
      setDialogSections(catalog.defaultSections.map((s) => ({ ...s })));
    }
  };

  const addSection = () => {
    const nextIdx = dialogSections.length + 1;
    setDialogSections([
      ...dialogSections,
      { id: `S${nextIdx}`, label: `S${nextIdx}` },
    ]);
  };

  const removeSection = (idx: number) => {
    setDialogSections(dialogSections.filter((_, i) => i !== idx));
  };

  const updateSection = (
    idx: number,
    patch: Partial<FurnitureSection>,
  ) => {
    setDialogSections(
      dialogSections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    );
  };

  const handleSaveDialog = () => {
    const catalog = FURNITURE_CATALOG[dialogType];
    const updated = [...furniture];

    if (editingIdx !== null) {
      // Edit existing
      updated[editingIdx] = {
        ...updated[editingIdx],
        type: dialogType,
        name: dialogName.trim(),
        sections: dialogSections,
      };
    } else {
      // Add new
      const newFurniture: ZoneFurniture = {
        id: crypto.randomUUID(),
        type: dialogType,
        name: dialogName.trim(),
        position: { x: 0, y: 0 },
        size: { ...catalog.defaultSize },
        rotation: 0,
        sections: dialogSections,
      };
      updated.push(newFurniture);
    }

    onUpdateZone({ ...zone, furniture: updated });
    setAddOpen(false);
  };

  const handleDelete = () => {
    if (deleteIdx === null) return;
    const updated = furniture.filter((_, i) => i !== deleteIdx);
    onUpdateZone({ ...zone, furniture: updated });
    setDeleteIdx(null);
  };

  const isDE = i18n.language.startsWith('de');
  const getLabel = (entry: FurnitureCatalogEntry) =>
    isDE ? entry.labelDe : entry.labelEn;

  const deleteHasStock =
    deleteIdx !== null &&
    getStockByFurniture(stock, furniture[deleteIdx].id).totalUnits > 0;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{t('Shelves & Racks')}</h4>
        <Button size="sm" variant="outline" onClick={openAddDialog}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {t('Add Shelf')}
        </Button>
      </div>

      {/* Furniture list */}
      {furniture.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          {t('No shelves configured')}
        </p>
      ) : (
        <div className="space-y-2">
          {furniture.map((f, idx) => {
            const catalog = FURNITURE_CATALOG[f.type];
            const fStock = getStockByFurniture(stock, f.id);
            const isOpen = expanded.has(f.id);

            return (
              <Collapsible
                key={f.id}
                open={isOpen}
                onOpenChange={() => toggle(f.id)}
              >
                <div className="rounded-lg border bg-card">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div
                        className="h-8 w-8 rounded-md flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: catalog.color,
                          color: catalog.textColor,
                        }}
                      >
                        <Package className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {f.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getLabel(catalog)} · {f.sections.length}{' '}
                          {t('sections')}
                        </p>
                      </div>
                      {fStock.totalUnits > 0 && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {fStock.totalUnits} {t('items')}
                        </Badge>
                      )}
                    </button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t px-3 pb-3 pt-2 space-y-2">
                      {/* Sections list */}
                      {f.sections.map((section) => {
                        const sStock = getStockBySection(
                          stock,
                          f.id,
                          section.id,
                        );
                        return (
                          <div
                            key={section.id}
                            className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                {section.label}
                              </span>
                              {section.capacity != null && (
                                <span className="text-xs text-muted-foreground">
                                  ({t('Capacity')}: {section.capacity})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {sStock.totalUnits > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {sStock.totalUnits} {t('units')}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {t('empty')}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Actions */}
                      <div className="flex gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(idx)}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          {t('Edit Shelf')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteIdx(idx)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          {t('Remove Shelf')}
                        </Button>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingIdx !== null ? t('Edit Shelf') : t('Add Shelf')}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Furniture Type */}
            <div className="grid gap-1.5">
              <Label>{t('Furniture Type')}</Label>
              <Select
                value={dialogType}
                onValueChange={(v) =>
                  handleTypeChange(v as FurnitureType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FURNITURE_CATEGORIES.map((cat) => {
                    const catLabel = isDE
                      ? cat.labelDe
                      : cat.labelEn;
                    const entries = Object.values(FURNITURE_CATALOG).filter(
                      (e) => e.category === cat.key,
                    );
                    return entries.map((entry) => (
                      <SelectItem key={entry.type} value={entry.type}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: entry.stroke }}
                          />
                          {getLabel(entry)}
                          <span className="text-xs text-muted-foreground">
                            ({catLabel})
                          </span>
                        </span>
                      </SelectItem>
                    ));
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="grid gap-1.5">
              <Label>{t('Shelf Name')}</Label>
              <Input
                value={dialogName}
                onChange={(e) => setDialogName(e.target.value)}
              />
            </div>

            {/* Sections */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label>{t('Sections')}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSection}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t('Add Section')}
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dialogSections.map((section, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2"
                  >
                    <Input
                      className="flex-1"
                      placeholder={t('Section Label')}
                      value={section.label}
                      onChange={(e) =>
                        updateSection(idx, {
                          id: e.target.value || section.id,
                          label: e.target.value,
                        })
                      }
                    />
                    <Input
                      className="w-20"
                      type="number"
                      min={0}
                      placeholder={t('Capacity')}
                      value={section.capacity ?? ''}
                      onChange={(e) =>
                        updateSection(idx, {
                          capacity: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => removeSection(idx)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button
              onClick={handleSaveDialog}
              disabled={!dialogName.trim() || dialogSections.length === 0}
            >
              {editingIdx !== null ? t('Edit Shelf') : t('Add Shelf')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteIdx !== null}
        onOpenChange={(open) => !open && setDeleteIdx(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Remove Shelf')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteHasStock
                ? t('Delete shelf warning')
                : t('Are you sure?', { ns: 'common' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('Remove Shelf')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
