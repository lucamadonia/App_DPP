import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus, X, Pencil, ArrowRightLeft, PackageMinus, Check } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import type { ZoneFurniture, WhStockLevel, FurnitureSection } from '@/types/warehouse';
import { getFurnitureCatalogEntry, isStorageFurniture } from './furniture-catalog';
import { getStockByFurniture, getStockBySection, getFurnitureFillRatio, getSectionFillRatio, getFillLevel } from './floor-map-utils';
import { FURNITURE_FILL_STROKES } from './floor-map-constants';
import { FloorMapQuickStockDialog, type QuickStockMode } from './FloorMapQuickStockDialog';

interface FloorMapFurnitureDetailProps {
  furniture: ZoneFurniture | null;
  stock: WhStockLevel[];
  isEditing: boolean;
  onClose: () => void;
  onUpdateFurniture: (id: string, updates: Partial<ZoneFurniture>) => void;
  onDeleteFurniture: (id: string) => void;
  locationId?: string;
  zoneName?: string;
  allFurniture?: ZoneFurniture[];
  onStockChanged?: () => void;
  zoneBounds?: { width: number; height: number };
}

export function FloorMapFurnitureDetail({
  furniture,
  stock,
  isEditing,
  onClose,
  onUpdateFurniture,
  onDeleteFurniture,
  locationId,
  zoneName,
  allFurniture,
  onStockChanged,
  zoneBounds,
}: FloorMapFurnitureDetailProps) {
  const { t, i18n } = useTranslation('warehouse');
  const [editName, setEditName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  // Inline section editing
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionLabel, setEditSectionLabel] = useState('');
  const [editSectionCapacity, setEditSectionCapacity] = useState('');

  // New section inline form
  const [addingSectionInline, setAddingSectionInline] = useState(false);
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [newSectionCapacity, setNewSectionCapacity] = useState('');

  // Quick stock dialog
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockDialogMode, setStockDialogMode] = useState<QuickStockMode>('add');
  const [stockDialogSectionId, setStockDialogSectionId] = useState<string | undefined>();
  const [stockDialogItem, setStockDialogItem] = useState<WhStockLevel | undefined>();

  const catalog = furniture ? getFurnitureCatalogEntry(furniture.type) : null;
  const label = catalog
    ? (i18n.language.startsWith('de') ? catalog.labelDe : catalog.labelEn)
    : '';

  const stockData = useMemo(() => {
    if (!furniture) return { totalUnits: 0, totalBatches: 0, reserved: 0, items: [] };
    return getStockByFurniture(stock, furniture.id);
  }, [furniture, stock]);

  const fillRatio = useMemo(() => {
    if (!furniture) return 0;
    return getFurnitureFillRatio(stock, furniture);
  }, [furniture, stock]);

  const fillPercent = Math.round(fillRatio * 100);

  const ringSize = 70;
  const ringStroke = 7;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (fillRatio * ringCircumference);
  const ringColor = fillPercent > 90 ? '#EF4444' : fillPercent > 70 ? '#F59E0B' : '#22C55E';

  const handleSaveName = () => {
    if (furniture && editName.trim()) {
      onUpdateFurniture(furniture.id, { name: editName.trim() });
    }
    setIsEditingName(false);
  };

  // Section inline editing handlers
  const startEditSection = (section: FurnitureSection) => {
    setEditingSectionId(section.id);
    setEditSectionLabel(section.label);
    setEditSectionCapacity(section.capacity != null ? String(section.capacity) : '');
  };

  const saveEditSection = () => {
    if (!furniture || !editingSectionId) return;
    const updatedSections = furniture.sections.map((s) => {
      if (s.id !== editingSectionId) return s;
      return {
        ...s,
        label: editSectionLabel.trim() || s.label,
        capacity: editSectionCapacity ? parseInt(editSectionCapacity, 10) || undefined : undefined,
      };
    });
    onUpdateFurniture(furniture.id, { sections: updatedSections });
    setEditingSectionId(null);
  };

  const cancelEditSection = () => {
    setEditingSectionId(null);
  };

  // Add section with custom label + capacity
  const handleAddSection = () => {
    if (!furniture) return;
    if (!addingSectionInline) {
      setAddingSectionInline(true);
      setNewSectionLabel(`S${furniture.sections.length + 1}`);
      setNewSectionCapacity('');
      return;
    }
    const sectionLabel = newSectionLabel.trim() || `S${furniture.sections.length + 1}`;
    const sectionId = sectionLabel.replace(/\s+/g, '_');
    const newSection: FurnitureSection = {
      id: sectionId,
      label: sectionLabel,
      capacity: newSectionCapacity ? parseInt(newSectionCapacity, 10) || undefined : undefined,
    };
    onUpdateFurniture(furniture.id, {
      sections: [...furniture.sections, newSection],
    });
    setAddingSectionInline(false);
    setNewSectionLabel('');
    setNewSectionCapacity('');
  };

  const cancelAddSection = () => {
    setAddingSectionInline(false);
    setNewSectionLabel('');
    setNewSectionCapacity('');
  };

  const handleRemoveSection = (sectionId: string) => {
    if (!furniture) return;
    onUpdateFurniture(furniture.id, {
      sections: furniture.sections.filter((s) => s.id !== sectionId),
    });
  };

  const handleNotesChange = (notes: string) => {
    if (!furniture) return;
    onUpdateFurniture(furniture.id, { notes });
  };

  // Stock action openers
  const openStockDialog = (mode: QuickStockMode, sectionId?: string, item?: WhStockLevel) => {
    setStockDialogMode(mode);
    setStockDialogSectionId(sectionId);
    setStockDialogItem(item);
    setStockDialogOpen(true);
  };

  return (
    <Sheet open={!!furniture} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[420px] sm:max-w-[420px] p-0">
        <SheetHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
          <div className="flex items-center gap-3">
            {catalog && (
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ background: catalog.stroke }}
              />
            )}
            <div className="min-w-0 flex-1">
              {isEditingName ? (
                <div className="flex gap-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-7 text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                    autoFocus
                  />
                  <Button size="sm" className="h-7" onClick={handleSaveName}>OK</Button>
                </div>
              ) : (
                <SheetTitle
                  className="text-base truncate cursor-pointer hover:text-primary"
                  onClick={() => {
                    if (isEditing && furniture) {
                      setEditName(furniture.name);
                      setIsEditingName(true);
                    }
                  }}
                >
                  {furniture?.name}
                </SheetTitle>
              )}
            </div>
            {catalog && (
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px]"
                style={{
                  background: catalog.color,
                  color: catalog.textColor,
                  border: `1px solid ${catalog.stroke}40`,
                }}
              >
                {label}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* Capacity Ring */}
            <section className="flex flex-col items-center">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 self-start">
                {t('Fill Level')}
              </h4>
              <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  className="text-muted"
                  strokeWidth={ringStroke}
                />
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={ringStroke}
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="text-lg font-bold mt-2 tabular-nums">{fillPercent}%</div>
              <div className="text-xs text-muted-foreground">
                {stockData.totalUnits.toLocaleString()} {t('units in stock')}
              </div>
            </section>

            {/* Section Overview */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t('Sections')} ({furniture?.sections.length ?? 0})
                </h4>
                <div className="flex items-center gap-1">
                  {locationId && furniture && isStorageFurniture(furniture.type) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => openStockDialog('add')}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t('Add Stock')}
                    </Button>
                  )}
                  {isEditing && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAddSection}>
                      <Plus className="h-3 w-3 mr-1" />
                      {t('Add Section')}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {furniture?.sections.map((section) => {
                  const sectionStock = getStockBySection(stock, furniture.id, section.id);
                  const sectionFill = getSectionFillRatio(stock, furniture.id, section);
                  const sectionLevel = getFillLevel(sectionFill);
                  const sectionColor = FURNITURE_FILL_STROKES[sectionLevel];
                  const sectionPercent = Math.round(sectionFill * 100);
                  const isEditingThis = editingSectionId === section.id;

                  return (
                    <div key={section.id} className="rounded-lg border p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ background: sectionColor }}
                          />
                          {isEditingThis ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editSectionLabel}
                                onChange={(e) => setEditSectionLabel(e.target.value)}
                                className="h-6 text-xs w-16"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditSection();
                                  if (e.key === 'Escape') cancelEditSection();
                                }}
                              />
                              <Input
                                value={editSectionCapacity}
                                onChange={(e) => setEditSectionCapacity(e.target.value)}
                                className="h-6 text-xs w-14"
                                type="number"
                                placeholder={t('Cap.')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditSection();
                                  if (e.key === 'Escape') cancelEditSection();
                                }}
                              />
                              <button
                                className="h-5 w-5 rounded hover:bg-primary/10 flex items-center justify-center text-primary"
                                onClick={saveEditSection}
                              >
                                <Check className="h-3 w-3" />
                              </button>
                              <button
                                className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"
                                onClick={cancelEditSection}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <span
                                className={`text-xs font-semibold ${isEditing ? 'cursor-pointer hover:text-primary' : ''}`}
                                onClick={() => { if (isEditing) startEditSection(section); }}
                              >
                                {section.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {section.id}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs tabular-nums font-medium">
                            {sectionStock.totalUnits.toLocaleString()}
                            {section.capacity ? ` / ${section.capacity}` : ''}
                          </span>
                          {isEditing && !isEditingThis && (
                            <button
                              className="h-4 w-4 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveSection(section.id)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {section.capacity && !isEditingThis && (
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${sectionPercent}%`, background: sectionColor }}
                          />
                        </div>
                      )}
                      {/* Stock items in this section */}
                      {sectionStock.items.length > 0 && (
                        <div className="mt-1.5 space-y-0.5">
                          {sectionStock.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-[10px] text-muted-foreground group/stock-item">
                              <span className="truncate max-w-[120px] sm:max-w-[150px]">
                                {item.productName ?? 'Unknown Product'}
                              </span>
                              <span className="flex items-center gap-1 tabular-nums shrink-0 ml-2">
                                {item.quantityAvailable}
                                {item.batchSerialNumber && (
                                  <span className="text-muted-foreground/60">
                                    #{item.batchSerialNumber}
                                  </span>
                                )}
                                {locationId && (
                                  <span className="hidden group-hover/stock-item:inline-flex items-center gap-0.5 ml-1">
                                    <button
                                      className="h-4 w-4 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                                      onClick={() => openStockDialog('adjust', section.id, item)}
                                      title={t('Adjust Quantity')}
                                    >
                                      <Pencil className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      className="h-4 w-4 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                                      onClick={() => openStockDialog('move', section.id, item)}
                                      title={t('Move Stock')}
                                    >
                                      <ArrowRightLeft className="h-2.5 w-2.5" />
                                    </button>
                                    <button
                                      className="h-4 w-4 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                                      onClick={() => openStockDialog('remove', section.id, item)}
                                      title={t('Remove Stock')}
                                    >
                                      <PackageMinus className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {sectionStock.items.length === 0 && (
                        <div className="text-[10px] text-muted-foreground/50 mt-1">
                          {locationId ? (
                            <button
                              className="hover:text-primary transition-colors"
                              onClick={() => openStockDialog('add', section.id)}
                            >
                              + {t('Add Stock')}
                            </button>
                          ) : (
                            t('No stock assigned')
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* No-storage hint */}
                {furniture && !isStorageFurniture(furniture.type) && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/30 p-2.5 text-xs text-muted-foreground">
                    {t('No storage — stock cannot be placed on this furniture type')}
                  </div>
                )}

                {/* Inline add section form */}
                {addingSectionInline && (
                  <div className="rounded-lg border border-dashed border-primary/30 p-2.5 bg-primary/5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={newSectionLabel}
                        onChange={(e) => setNewSectionLabel(e.target.value)}
                        className="h-7 text-xs flex-1"
                        placeholder={t('Label')}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSection();
                          if (e.key === 'Escape') cancelAddSection();
                        }}
                      />
                      <Input
                        value={newSectionCapacity}
                        onChange={(e) => setNewSectionCapacity(e.target.value)}
                        className="h-7 text-xs w-20"
                        type="number"
                        placeholder={t('Cap.')}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddSection();
                          if (e.key === 'Escape') cancelAddSection();
                        }}
                      />
                      <Button size="sm" className="h-7 px-2" onClick={handleAddSection}>
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 px-2" onClick={cancelAddSection}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Furniture Properties */}
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('Furniture Properties')}
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Type')}</span>
                  <span className="font-semibold">{label}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{t('Size')}</span>
                  {isEditing && furniture ? (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground text-[10px]">{t('Width')}:</span>
                      <Input
                        type="number"
                        min={1}
                        max={zoneBounds?.width ?? 50}
                        value={furniture.size.w}
                        onChange={(e) => {
                          const w = Math.max(1, Math.min(zoneBounds?.width ?? 50, parseInt(e.target.value, 10) || 1));
                          onUpdateFurniture(furniture.id, { size: { w, h: furniture.size.h } });
                        }}
                        className="h-6 w-12 text-xs text-center tabular-nums px-1"
                      />
                      <span className="text-muted-foreground mx-0.5">x</span>
                      <span className="text-muted-foreground text-[10px]">{t('Height')}:</span>
                      <Input
                        type="number"
                        min={1}
                        max={zoneBounds?.height ?? 50}
                        value={furniture.size.h}
                        onChange={(e) => {
                          const h = Math.max(1, Math.min(zoneBounds?.height ?? 50, parseInt(e.target.value, 10) || 1));
                          onUpdateFurniture(furniture.id, { size: { w: furniture.size.w, h } });
                        }}
                        className="h-6 w-12 text-xs text-center tabular-nums px-1"
                      />
                    </div>
                  ) : (
                    <span className="font-semibold tabular-nums">
                      {furniture?.size.w} x {furniture?.size.h}
                    </span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Position')}</span>
                  <span className="font-semibold tabular-nums">
                    ({furniture?.position.x}, {furniture?.position.y})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Rotation')}</span>
                  <span className="font-semibold tabular-nums">{furniture?.rotation ?? 0}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Batches')}</span>
                  <span className="font-semibold tabular-nums">{stockData.totalBatches}</span>
                </div>
              </div>
            </section>

            {/* Notes (edit mode) */}
            {isEditing && furniture && (
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t('Notes')}
                </h4>
                <Textarea
                  value={furniture.notes ?? ''}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  placeholder={t('Notes')}
                  className="text-xs min-h-[60px]"
                />
              </section>
            )}

            {/* Notes display (view mode) */}
            {!isEditing && furniture?.notes && (
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {t('Notes')}
                </h4>
                <p className="text-xs text-muted-foreground">{furniture.notes}</p>
              </section>
            )}

            {/* Delete button (edit mode) */}
            {isEditing && furniture && (
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (confirm(t('Delete furniture?'))) {
                    onDeleteFurniture(furniture.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                {t('Delete Furniture')}
              </Button>
            )}
          </div>
        </ScrollArea>
      </SheetContent>

      {/* Quick Stock Dialog */}
      {furniture && locationId && (
        <FloorMapQuickStockDialog
          open={stockDialogOpen}
          onClose={() => setStockDialogOpen(false)}
          mode={stockDialogMode}
          furniture={furniture}
          sectionId={stockDialogSectionId}
          stockItem={stockDialogItem}
          locationId={locationId}
          zoneName={zoneName ?? ''}
          allFurniture={allFurniture ?? []}
          onStockChanged={onStockChanged}
        />
      )}
    </Sheet>
  );
}
