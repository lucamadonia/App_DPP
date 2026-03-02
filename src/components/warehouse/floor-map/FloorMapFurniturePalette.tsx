import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ZoneFurniture } from '@/types/warehouse';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, type FurnitureCatalogEntry } from './furniture-catalog';

interface FloorMapFurniturePaletteProps {
  onAddFurniture: (furniture: ZoneFurniture) => void;
  zoneWidth: number;
  zoneHeight: number;
}

export function FloorMapFurniturePalette({
  onAddFurniture,
  zoneWidth,
  zoneHeight,
}: FloorMapFurniturePaletteProps) {
  const { t, i18n } = useTranslation('warehouse');
  const [search, setSearch] = useState('');
  const isDE = i18n.language.startsWith('de');

  const createFurniture = useCallback((entry: FurnitureCatalogEntry) => {
    // Place at a random position that fits within the zone
    const maxX = Math.max(0, zoneWidth - entry.defaultSize.w);
    const maxY = Math.max(0, zoneHeight - entry.defaultSize.h);
    const x = Math.min(Math.floor(Math.random() * (maxX + 1)), maxX);
    const y = Math.min(Math.floor(Math.random() * (maxY + 1)), maxY);

    const furniture: ZoneFurniture = {
      id: crypto.randomUUID(),
      type: entry.type,
      name: isDE ? entry.labelDe : entry.labelEn,
      position: { x, y },
      size: { ...entry.defaultSize },
      rotation: 0,
      sections: entry.defaultSections.map((s) => ({ ...s })),
    };
    onAddFurniture(furniture);
  }, [onAddFurniture, zoneWidth, zoneHeight, isDE]);

  const filteredEntries = Object.values(FURNITURE_CATALOG).filter((entry) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      entry.labelEn.toLowerCase().includes(q) ||
      entry.labelDe.toLowerCase().includes(q) ||
      entry.type.includes(q)
    );
  });

  const groupedByCategory = FURNITURE_CATEGORIES.map((cat) => ({
    ...cat,
    label: isDE ? cat.labelDe : cat.labelEn,
    items: filteredEntries.filter((e) => e.category === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div
      className="w-full sm:w-[220px] shrink-0 rounded-xl border shadow-sm overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b">
        <div className="text-xs font-semibold mb-2">{t('Furniture')}</div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search...')}
            className="h-7 text-xs pl-7 bg-transparent border-muted"
          />
        </div>
      </div>

      {/* Catalog items */}
      <ScrollArea className="h-[calc(100%-72px)] max-h-[200px] sm:max-h-[500px]">
        <div className="p-2 space-y-3">
          {groupedByCategory.map((group) => (
            <div key={group.key}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-1.5">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((entry) => (
                  <PaletteItem
                    key={entry.type}
                    entry={entry}
                    isDE={isDE}
                    onAdd={() => createFurniture(entry)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function PaletteItem({
  entry,
  isDE,
  onAdd,
}: {
  entry: FurnitureCatalogEntry;
  isDE: boolean;
  onAdd: () => void;
}) {
  const label = isDE ? entry.labelDe : entry.labelEn;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(
      'application/floor-map-furniture',
      JSON.stringify({
        type: entry.type,
        defaultSize: entry.defaultSize,
        defaultSections: entry.defaultSections,
      }),
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-muted/60 transition-colors group cursor-grab active:cursor-grabbing"
      onClick={onAdd}
      title={`${label} (${entry.defaultSize.w}×${entry.defaultSize.h})`}
    >
      <div
        className="h-7 w-7 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: entry.color,
          border: `1px solid ${entry.stroke}30`,
        }}
      >
        <div
          className="h-4 w-4 rounded-sm"
          style={{
            background: entry.stroke,
            opacity: 0.4,
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate group-hover:text-primary transition-colors">
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {entry.defaultSize.w}×{entry.defaultSize.h} · {entry.defaultSections.length}s
        </div>
      </div>
    </button>
  );
}
