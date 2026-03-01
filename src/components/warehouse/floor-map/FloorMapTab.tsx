import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LayoutGrid, Sparkles, Warehouse } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  WhLocation,
  WarehouseZone,
  WhStockLevel,
  WarehouseZoneType,
  ZoneFurniture,
} from '@/types/warehouse';
import { FloorMapCanvas } from './FloorMapCanvas';
import { FloorMapToolbar } from './FloorMapToolbar';
import { FloorMapLegend } from './FloorMapLegend';
import { FloorMapKPIBar } from './FloorMapKPIBar';
import { FloorMapZoneDetail } from './FloorMapZoneDetail';
import { FloorMapBreadcrumb } from './FloorMapBreadcrumb';
import { FloorMapFurnitureDetail } from './FloorMapFurnitureDetail';
import { FloorMapFurniturePalette } from './FloorMapFurniturePalette';
import { FloorMapFurnitureContextMenu } from './FloorMapFurnitureContextMenu';
import { FloorMapFurnitureTooltip } from './FloorMapFurnitureTooltip';
import { autoLayoutZones, fitAllViewport, zoomToZoneInterior, searchStockInFurniture } from './floor-map-utils';
import { useFloorMapInteraction } from './useFloorMapInteraction';
import { CANVAS_HEIGHT_NORMAL, CANVAS_HEIGHT_FULLSCREEN, type FloorMapViewMode, type FloorMapLevel } from './floor-map-constants';

interface FloorMapTabProps {
  location: WhLocation;
  stock: WhStockLevel[];
  loading?: boolean;
  onSaveZones: (zones: WarehouseZone[]) => Promise<void>;
}

export function FloorMapTab({ location, stock, loading, onSaveZones }: FloorMapTabProps) {
  const { t } = useTranslation('warehouse');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zones, setZones] = useState<WarehouseZone[]>(location.zones);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<FloorMapViewMode>('3d');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedType, setHighlightedType] = useState<WarehouseZoneType | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailZoneIdx, setDetailZoneIdx] = useState(-1);

  // Level 2: Zone Interior state
  const [level, setLevel] = useState<FloorMapLevel>('zone-overview');
  const [interiorZoneIdx, setInteriorZoneIdx] = useState(-1);
  const [selectedFurnitureId, setSelectedFurnitureId] = useState<string | null>(null);
  const [hoveredFurnitureId, setHoveredFurnitureId] = useState<string | null>(null);
  const [detailFurnitureId, setDetailFurnitureId] = useState<string | null>(null);
  const [showEmpty, setShowEmpty] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; furniture: ZoneFurniture;
  } | null>(null);

  useEffect(() => {
    setZones(location.zones);
    setIsDirty(false);
  }, [location.zones]);

  const hasUnplaced = useMemo(() => zones.some((z) => !z.mapPosition), [zones]);

  const visibleTypes = useMemo(() => {
    const types = new Set<WarehouseZoneType>();
    for (const z of zones) {
      if (z.type) types.add(z.type);
    }
    return Array.from(types);
  }, [zones]);

  // Product search across furniture
  const searchHighlightIds = useMemo(() => {
    if (!productSearch.trim()) return new Set<string>();
    const results = searchStockInFurniture(zones, stock, productSearch);
    return new Set(results.map((r) => r.furnitureId));
  }, [zones, stock, productSearch]);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v);
  }, []);

  const selectedZoneIdxRef = useRef(-1);

  const handleOpenDetail = useCallback(() => {
    if (level === 'zone-interior' && selectedFurnitureId) {
      setDetailFurnitureId(selectedFurnitureId);
    } else if (selectedZoneIdxRef.current >= 0) {
      setDetailZoneIdx(selectedZoneIdxRef.current);
    }
  }, [level, selectedFurnitureId]);

  const interaction = useFloorMapInteraction(
    svgRef,
    isEditing,
    (zoneIdx, pos) => {
      setZones((prev) => {
        const next = [...prev];
        next[zoneIdx] = { ...next[zoneIdx], mapPosition: pos };
        return next;
      });
      setIsDirty(true);
    },
    {
      zones,
      containerRef,
      viewMode,
      isFullscreen,
      onViewModeChange: setViewMode,
      onToggleFullscreen: handleToggleFullscreen,
      onOpenDetail: handleOpenDetail,
    },
  );

  // Keep ref in sync for stable handleOpenDetail callback
  selectedZoneIdxRef.current = interaction.selectedZoneIdx;

  // === Zone Interior Navigation ===
  const handleEnterZoneInterior = useCallback((zoneIdx: number) => {
    setInteriorZoneIdx(zoneIdx);
    setLevel('zone-interior');
    setSelectedFurnitureId(null);
    setHoveredFurnitureId(null);
    setDetailFurnitureId(null);
    setContextMenu(null);
    // Zoom into the zone
    const container = containerRef.current;
    if (container && zones[zoneIdx]) {
      const vp = zoomToZoneInterior(zones[zoneIdx], container.clientWidth, container.clientHeight);
      interaction.setViewport(vp);
    }
  }, [zones, interaction]);

  const handleBackToOverview = useCallback(() => {
    setLevel('zone-overview');
    setInteriorZoneIdx(-1);
    setSelectedFurnitureId(null);
    setHoveredFurnitureId(null);
    setDetailFurnitureId(null);
    setContextMenu(null);
    setProductSearch('');
    setShowEmpty(false);
    // Fit all zones
    const container = containerRef.current;
    if (container) {
      const vp = fitAllViewport(zones, container.clientWidth, container.clientHeight);
      interaction.setViewport(vp);
    }
  }, [zones, interaction]);

  // === Furniture Interaction ===
  const handleFurniturePointerDown = useCallback((e: React.PointerEvent, furniture: ZoneFurniture) => {
    e.stopPropagation();
    setSelectedFurnitureId(furniture.id);
  }, []);

  const handleFurnitureDoubleClick = useCallback((furniture: ZoneFurniture) => {
    setDetailFurnitureId(furniture.id);
  }, []);

  const handleFurnitureContextMenu = useCallback((e: React.MouseEvent, furniture: ZoneFurniture) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFurnitureId(furniture.id);
    setContextMenu({ x: e.clientX, y: e.clientY, furniture });
  }, []);

  // === Furniture CRUD ===
  const updateInteriorZoneFurniture = useCallback((updater: (furniture: ZoneFurniture[]) => ZoneFurniture[]) => {
    if (interiorZoneIdx < 0) return;
    setZones((prev) => {
      const next = [...prev];
      const zone = { ...next[interiorZoneIdx] };
      zone.furniture = updater(zone.furniture ?? []);
      next[interiorZoneIdx] = zone;
      return next;
    });
    setIsDirty(true);
  }, [interiorZoneIdx]);

  const handleAddFurniture = useCallback((furniture: ZoneFurniture) => {
    updateInteriorZoneFurniture((prev) => [...prev, furniture]);
  }, [updateInteriorZoneFurniture]);

  const handleDeleteFurniture = useCallback((furnitureId: string) => {
    updateInteriorZoneFurniture((prev) => prev.filter((f) => f.id !== furnitureId));
    if (selectedFurnitureId === furnitureId) setSelectedFurnitureId(null);
    if (detailFurnitureId === furnitureId) setDetailFurnitureId(null);
    setContextMenu(null);
  }, [updateInteriorZoneFurniture, selectedFurnitureId, detailFurnitureId]);

  const handleDuplicateFurniture = useCallback((furnitureId: string) => {
    updateInteriorZoneFurniture((prev) => {
      const original = prev.find((f) => f.id === furnitureId);
      if (!original) return prev;
      const dup: ZoneFurniture = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (Copy)`,
        position: { x: original.position.x + 1, y: original.position.y + 1 },
        sections: original.sections.map((s) => ({ ...s })),
      };
      return [...prev, dup];
    });
    setContextMenu(null);
  }, [updateInteriorZoneFurniture]);

  const handleRotateFurniture = useCallback((furnitureId: string) => {
    updateInteriorZoneFurniture((prev) =>
      prev.map((f) => {
        if (f.id !== furnitureId) return f;
        const nextRotation = ((f.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        return { ...f, rotation: nextRotation };
      }),
    );
    setContextMenu(null);
  }, [updateInteriorZoneFurniture]);

  const handleUpdateFurniture = useCallback((furnitureId: string, updates: Partial<ZoneFurniture>) => {
    updateInteriorZoneFurniture((prev) =>
      prev.map((f) => (f.id === furnitureId ? { ...f, ...updates } : f)),
    );
  }, [updateInteriorZoneFurniture]);

  // === Keyboard shortcuts for interior mode ===
  useEffect(() => {
    if (level !== 'zone-interior') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) return;

      switch (e.key) {
        case 'Escape':
          if (contextMenu) {
            setContextMenu(null);
          } else if (detailFurnitureId) {
            setDetailFurnitureId(null);
          } else {
            handleBackToOverview();
          }
          break;
        case 'r':
        case 'R':
          if (selectedFurnitureId && isEditing) {
            handleRotateFurniture(selectedFurnitureId);
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (selectedFurnitureId && isEditing) {
            handleDeleteFurniture(selectedFurnitureId);
          }
          break;
        case 'd':
          if ((e.ctrlKey || e.metaKey) && selectedFurnitureId && isEditing) {
            e.preventDefault();
            handleDuplicateFurniture(selectedFurnitureId);
          }
          break;
        case 'Enter':
          if (selectedFurnitureId) {
            setDetailFurnitureId(selectedFurnitureId);
          }
          break;
        case 'Tab': {
          e.preventDefault();
          const furniture = zones[interiorZoneIdx]?.furniture ?? [];
          if (furniture.length === 0) break;
          const currentIdx = furniture.findIndex((f) => f.id === selectedFurnitureId);
          const dir = e.shiftKey ? -1 : 1;
          const nextIdx = currentIdx < 0 ? 0 : (currentIdx + dir + furniture.length) % furniture.length;
          setSelectedFurnitureId(furniture[nextIdx].id);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [level, selectedFurnitureId, detailFurnitureId, contextMenu, isEditing, interiorZoneIdx, zones, handleBackToOverview, handleRotateFurniture, handleDeleteFurniture, handleDuplicateFurniture]);

  const handleToggleEdit = useCallback(() => {
    if (isEditing && isDirty) {
      if (!confirm(t('Unsaved changes will be lost. Continue?'))) return;
      setZones(location.zones);
      setIsDirty(false);
    }
    setIsEditing((v) => !v);
    interaction.setSelectedZoneIdx(-1);
    setSelectedFurnitureId(null);
  }, [isEditing, isDirty, location.zones, t, interaction]);

  const handleFitAll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (level === 'zone-interior' && interiorZoneIdx >= 0 && zones[interiorZoneIdx]) {
      const vp = zoomToZoneInterior(zones[interiorZoneIdx], container.clientWidth, container.clientHeight);
      interaction.setViewport(vp);
    } else {
      const vp = fitAllViewport(zones, container.clientWidth, container.clientHeight);
      interaction.setViewport(vp);
    }
  }, [zones, interaction, level, interiorZoneIdx]);

  const handleAutoLayout = useCallback(() => {
    const laid = autoLayoutZones(zones);
    setZones(laid);
    setIsDirty(true);
    setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const vp = fitAllViewport(laid, container.clientWidth, container.clientHeight);
      interaction.setViewport(vp);
    }, 50);
  }, [zones, interaction]);

  const handleSave = useCallback(async () => {
    try {
      await onSaveZones(zones);
      setIsDirty(false);
      toast.success(t('Layout saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }, [zones, onSaveZones, t]);

  const handleViewModeChange = useCallback((mode: FloorMapViewMode) => {
    setViewMode(mode);
  }, []);

  const handleZoomChange = useCallback((value: number) => {
    interaction.setZoom(value);
  }, [interaction]);

  const handleToggleHighlight = useCallback((type: WarehouseZoneType) => {
    setHighlightedType((prev) => (prev === type ? null : type));
  }, []);

  const handleZoneClick = useCallback((idx: number) => {
    setDetailZoneIdx(idx);
  }, []);

  const handleZoneDoubleClick = useCallback((idx: number) => {
    handleEnterZoneInterior(idx);
  }, [handleEnterZoneInterior]);

  // Get the current furniture for detail panel
  const detailFurniture = useMemo(() => {
    if (!detailFurnitureId || interiorZoneIdx < 0) return null;
    return zones[interiorZoneIdx]?.furniture?.find((f) => f.id === detailFurnitureId) ?? null;
  }, [detailFurnitureId, interiorZoneIdx, zones]);

  // Get the hovered furniture for tooltip
  const hoveredFurniture = useMemo(() => {
    if (!hoveredFurnitureId || interiorZoneIdx < 0) return null;
    return zones[interiorZoneIdx]?.furniture?.find((f) => f.id === hoveredFurnitureId) ?? null;
  }, [hoveredFurnitureId, interiorZoneIdx, zones]);

  // Fit + auto-layout on initial mount if zones lack positions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (zones.length > 0 && zones.every((z) => !z.mapPosition)) {
        const laid = autoLayoutZones(zones);
        setZones(laid);
        const container = containerRef.current;
        if (container) {
          const vp = fitAllViewport(laid, container.clientWidth, container.clientHeight);
          interaction.setViewport(vp);
        }
      } else if (zones.some((z) => z.mapPosition)) {
        handleFitAll();
      }
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Skeleton loading state
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-[400px] rounded-xl" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-20 rounded" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state — no zones
  if (zones.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <div className="relative mb-6">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #BFDBFE 100%)',
              }}
            >
              <Warehouse className="h-10 w-10 text-blue-400" />
            </div>
            <div
              className="absolute -top-2 -right-2 h-8 w-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
              }}
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
          </div>
          <p className="font-bold text-lg text-foreground">{t('No zones configured yet')}</p>
          <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">
            {t('Add zones to bring your floor map to life')}
          </p>
          <Button variant="default" size="sm" className="mt-6" asChild>
            <span>
              <LayoutGrid className="h-4 w-4 mr-2" />
              {t('Configure Zones')}
            </span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const canvasHeight = isFullscreen ? CANVAS_HEIGHT_FULLSCREEN : CANVAS_HEIGHT_NORMAL;
  const interiorZone = interiorZoneIdx >= 0 ? zones[interiorZoneIdx] : null;
  const isInterior = level === 'zone-interior';

  const content = (
    <div className="space-y-3" ref={containerRef}>
      {/* KPI Bar */}
      <FloorMapKPIBar zones={zones} stock={stock} />

      {/* Breadcrumb (interior mode only) */}
      {isInterior && interiorZone && (
        <FloorMapBreadcrumb
          locationName={location.name}
          zoneName={interiorZone.name}
          onBackToOverview={handleBackToOverview}
        />
      )}

      {/* Toolbar */}
      <FloorMapToolbar
        isEditing={isEditing}
        isDirty={isDirty}
        hasUnplaced={hasUnplaced}
        zoom={interaction.viewport.zoom}
        viewMode={viewMode}
        zoneCount={zones.length}
        isFullscreen={isFullscreen}
        searchQuery={isInterior ? productSearch : searchQuery}
        level={level}
        showEmpty={showEmpty}
        onToggleEdit={handleToggleEdit}
        onZoomIn={interaction.zoomIn}
        onZoomOut={interaction.zoomOut}
        onZoomChange={handleZoomChange}
        onFitAll={handleFitAll}
        onAutoLayout={handleAutoLayout}
        onSave={handleSave}
        onViewModeChange={handleViewModeChange}
        onToggleFullscreen={handleToggleFullscreen}
        onSearchChange={isInterior ? setProductSearch : setSearchQuery}
        onToggleShowEmpty={isInterior ? () => setShowEmpty((v) => !v) : undefined}
        onBackToOverview={isInterior ? handleBackToOverview : undefined}
      />

      {/* Main content area with optional palette sidebar */}
      <div className="flex gap-3">
        {/* Furniture Palette (interior edit mode only) */}
        {isInterior && isEditing && (
          <FloorMapFurniturePalette
            onAddFurniture={handleAddFurniture}
            zoneWidth={interiorZone?.mapPosition?.width ?? 10}
            zoneHeight={interiorZone?.mapPosition?.height ?? 10}
          />
        )}

        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <FloorMapCanvas
            zones={zones}
            stock={stock}
            isEditing={isEditing}
            viewMode={viewMode}
            canvasHeight={canvasHeight}
            highlightedType={highlightedType}
            searchQuery={searchQuery}
            level={level}
            interiorZoneIdx={interiorZoneIdx}
            showEmpty={showEmpty}
            searchHighlightIds={searchHighlightIds}
            selectedFurnitureId={selectedFurnitureId}
            hoveredFurnitureId={hoveredFurnitureId}
            onZoneDoubleClick={handleZoneDoubleClick}
            onZoneClick={handleZoneClick}
            onFurnitureSelect={setSelectedFurnitureId}
            onFurnitureHover={setHoveredFurnitureId}
            onFurniturePointerDown={handleFurniturePointerDown}
            onFurnitureDoubleClick={handleFurnitureDoubleClick}
            onFurnitureContextMenu={handleFurnitureContextMenu}
            interaction={interaction}
          />
        </div>
      </div>

      {/* Legend (overview mode only) */}
      {!isInterior && (
        <FloorMapLegend
          visibleTypes={visibleTypes}
          viewMode={viewMode}
          highlightedType={highlightedType}
          onToggleHighlight={handleToggleHighlight}
        />
      )}

      {/* Zone Detail Sheet (overview mode) */}
      <FloorMapZoneDetail
        zone={detailZoneIdx >= 0 ? zones[detailZoneIdx] : null}
        stock={stock}
        allZones={zones}
        locationId={location.id}
        onClose={() => setDetailZoneIdx(-1)}
      />

      {/* Furniture Detail Sheet (interior mode) */}
      {isInterior && (
        <FloorMapFurnitureDetail
          furniture={detailFurniture}
          stock={stock}
          isEditing={isEditing}
          onClose={() => setDetailFurnitureId(null)}
          onUpdateFurniture={handleUpdateFurniture}
          onDeleteFurniture={handleDeleteFurniture}
        />
      )}

      {/* Furniture Tooltip (interior mode, on hover) */}
      {isInterior && hoveredFurniture && !interaction.isDragging && !detailFurnitureId && (
        <FloorMapFurnitureTooltip
          furniture={hoveredFurniture}
          stock={stock.filter((s) => s.zone === interiorZone?.name)}
          viewport={interaction.viewport}
          containerRect={containerRef.current?.getBoundingClientRect() ?? null}
          zoneOffset={interiorZone?.mapPosition ?? { x: 0, y: 0, width: 0, height: 0 }}
        />
      )}

      {/* Furniture Context Menu */}
      {contextMenu && (
        <FloorMapFurnitureContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          furniture={contextMenu.furniture}
          onRotate={() => handleRotateFurniture(contextMenu.furniture.id)}
          onDuplicate={() => handleDuplicateFurniture(contextMenu.furniture.id)}
          onDelete={() => handleDeleteFurniture(contextMenu.furniture.id)}
          onOpenDetail={() => {
            setDetailFurnitureId(contextMenu.furniture.id);
            setContextMenu(null);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );

  // Fullscreen overlay
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 bg-background"
        style={{
          animation: 'fade-in 0.2s ease',
        }}
      >
        <div className="p-4 h-full overflow-hidden">
          {content}
        </div>
      </div>
    );
  }

  return content;
}
