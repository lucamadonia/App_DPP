import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus, X } from 'lucide-react';
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
import { getFurnitureCatalogEntry } from './furniture-catalog';
import { getStockByFurniture, getStockBySection, getFurnitureFillRatio, getSectionFillRatio, getFillLevel } from './floor-map-utils';
import { FURNITURE_FILL_STROKES } from './floor-map-constants';

interface FloorMapFurnitureDetailProps {
  furniture: ZoneFurniture | null;
  stock: WhStockLevel[];
  isEditing: boolean;
  onClose: () => void;
  onUpdateFurniture: (id: string, updates: Partial<ZoneFurniture>) => void;
  onDeleteFurniture: (id: string) => void;
}

export function FloorMapFurnitureDetail({
  furniture,
  stock,
  isEditing,
  onClose,
  onUpdateFurniture,
  onDeleteFurniture,
}: FloorMapFurnitureDetailProps) {
  const { t, i18n } = useTranslation('warehouse');
  const [editName, setEditName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

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

  const handleAddSection = () => {
    if (!furniture) return;
    const nextId = `S${furniture.sections.length + 1}`;
    const newSection: FurnitureSection = { id: nextId, label: nextId };
    onUpdateFurniture(furniture.id, {
      sections: [...furniture.sections, newSection],
    });
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

  return (
    <Sheet open={!!furniture} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
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
          <div className="p-6 space-y-6">
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
                {isEditing && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleAddSection}>
                    <Plus className="h-3 w-3 mr-1" />
                    {t('Add Section')}
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {furniture?.sections.map((section) => {
                  const sectionStock = getStockBySection(stock, furniture.id, section.id);
                  const sectionFill = getSectionFillRatio(stock, furniture.id, section);
                  const sectionLevel = getFillLevel(sectionFill);
                  const sectionColor = FURNITURE_FILL_STROKES[sectionLevel];
                  const sectionPercent = Math.round(sectionFill * 100);

                  return (
                    <div key={section.id} className="rounded-lg border p-2.5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ background: sectionColor }}
                          />
                          <span className="text-xs font-semibold">{section.label}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {section.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs tabular-nums font-medium">
                            {sectionStock.totalUnits.toLocaleString()}
                            {section.capacity ? ` / ${section.capacity}` : ''}
                          </span>
                          {isEditing && (
                            <button
                              className="h-4 w-4 rounded hover:bg-destructive/10 flex items-center justify-center text-muted-foreground hover:text-destructive"
                              onClick={() => handleRemoveSection(section.id)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {section.capacity && (
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
                            <div key={item.id} className="flex justify-between text-[10px] text-muted-foreground">
                              <span className="truncate max-w-[180px]">
                                {item.productName ?? 'Unknown Product'}
                              </span>
                              <span className="tabular-nums shrink-0 ml-2">
                                {item.quantityAvailable}
                                {item.batchSerialNumber && (
                                  <span className="text-muted-foreground/60 ml-1">
                                    #{item.batchSerialNumber}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {sectionStock.items.length === 0 && (
                        <div className="text-[10px] text-muted-foreground/50 mt-1">
                          {t('No stock assigned')}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Size')}</span>
                  <span className="font-semibold tabular-nums">
                    {furniture?.size.w} x {furniture?.size.h}
                  </span>
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
    </Sheet>
  );
}
