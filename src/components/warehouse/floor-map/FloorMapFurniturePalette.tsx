import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ZoneFurniture } from '@/types/warehouse';
import { FURNITURE_CATALOG, FURNITURE_CATEGORIES, type FurnitureCatalogEntry } from './furniture-catalog';
import { findNonOverlappingPosition } from './floor-map-utils';

interface FloorMapFurniturePaletteProps {
  onAddFurniture: (furniture: ZoneFurniture) => void;
  zoneWidth: number;
  zoneHeight: number;
  viewport?: { x: number; y: number; zoom: number };
  containerRect?: DOMRect | null;
  zonePosition?: { x: number; y: number };
  existingFurniture?: { position: { x: number; y: number }; size: { w: number; h: number } }[];
}

export function FloorMapFurniturePalette({
  onAddFurniture,
  zoneWidth,
  zoneHeight,
  viewport,
  containerRect,
  zonePosition,
  existingFurniture,
}: FloorMapFurniturePaletteProps) {
  const { t, i18n } = useTranslation('warehouse');
  const [search, setSearch] = useState('');
  const isDE = i18n.language.startsWith('de');

  const createFurniture = useCallback((entry: FurnitureCatalogEntry) => {
    // Calculate viewport center in zone grid coordinates
    let preferredX = Math.floor(zoneWidth / 2 - entry.defaultSize.w / 2);
    let preferredY = Math.floor(zoneHeight / 2 - entry.defaultSize.h / 2);

    if (viewport && containerRect && zonePosition) {
      const GRID_CELL = 20;
      const centerScreenX = containerRect.left + containerRect.width / 2;
      const centerScreenY = containerRect.top + containerRect.height / 2;
      const svgX = (centerScreenX - containerRect.left - viewport.x) / viewport.zoom;
      const svgY = (centerScreenY - containerRect.top - viewport.y) / viewport.zoom;
      const zoneOriginX = zonePosition.x * GRID_CELL;
      const zoneOriginY = zonePosition.y * GRID_CELL;
      preferredX = Math.round((svgX - zoneOriginX) / GRID_CELL - entry.defaultSize.w / 2);
      preferredY = Math.round((svgY - zoneOriginY) / GRID_CELL - entry.defaultSize.h / 2);
    }

    const pos = findNonOverlappingPosition(
      { x: preferredX, y: preferredY },
      entry.defaultSize,
      existingFurniture ?? [],
      zoneWidth,
      zoneHeight,
    );

    const furniture: ZoneFurniture = {
      id: crypto.randomUUID(),
      type: entry.type,
      name: isDE ? entry.labelDe : entry.labelEn,
      position: pos,
      size: { ...entry.defaultSize },
      rotation: 0,
      sections: entry.defaultSections.map((s) => ({ ...s })),
    };
    onAddFurniture(furniture);
  }, [onAddFurniture, zoneWidth, zoneHeight, isDE, viewport, containerRect, zonePosition, existingFurniture]);

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
      className="w-full sm:w-[280px] shrink-0 rounded-xl border shadow-sm overflow-hidden"
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
  const { t } = useTranslation('warehouse');
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

  // Calculate proportional swatch dimensions (max 40px)
  const maxDim = 40;
  const scale = Math.min(maxDim / entry.defaultSize.w, maxDim / entry.defaultSize.h, 10);
  const swatchW = Math.max(16, Math.round(entry.defaultSize.w * scale));
  const swatchH = Math.max(16, Math.round(entry.defaultSize.h * scale));

  return (
    <button
      draggable
      onDragStart={handleDragStart}
      className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted/60 border border-transparent hover:border-muted-foreground/15 transition-all group cursor-grab active:cursor-grabbing"
      onClick={onAdd}
      title={`${label} (${entry.defaultSize.w}×${entry.defaultSize.h})`}
    >
      <div
        className="rounded-md flex items-center justify-center shrink-0"
        style={{
          width: `${Math.max(swatchW, 32)}px`,
          height: `${Math.max(swatchH, 28)}px`,
          background: entry.color,
          border: `1.5px solid ${entry.stroke}40`,
        }}
      >
        <div
          className="rounded-sm"
          style={{
            width: `${Math.round(swatchW * 0.6)}px`,
            height: `${Math.round(swatchH * 0.55)}px`,
            background: entry.stroke,
            opacity: 0.35,
          }}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium truncate group-hover:text-primary transition-colors">
          {label}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {entry.defaultSize.w}×{entry.defaultSize.h} · {entry.defaultSections.length} {t('Sections').toLowerCase()}
        </div>
      </div>
    </button>
  );
}
