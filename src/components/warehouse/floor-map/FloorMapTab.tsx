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
} from '@/types/warehouse';
import { FloorMapCanvas } from './FloorMapCanvas';
import { FloorMapToolbar } from './FloorMapToolbar';
import { FloorMapLegend } from './FloorMapLegend';
import { FloorMapKPIBar } from './FloorMapKPIBar';
import { FloorMapZoneDetail } from './FloorMapZoneDetail';
import { autoLayoutZones, fitAllViewport } from './floor-map-utils';
import { useFloorMapInteraction } from './useFloorMapInteraction';
import { CANVAS_HEIGHT_NORMAL, CANVAS_HEIGHT_FULLSCREEN, type FloorMapViewMode } from './floor-map-constants';

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

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v);
  }, []);

  const handleOpenDetail = useCallback(() => {
    if (interaction.selectedZoneIdx >= 0) {
      setDetailZoneIdx(interaction.selectedZoneIdx);
    }
  }, []);

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

  const handleToggleEdit = useCallback(() => {
    if (isEditing && isDirty) {
      if (!confirm(t('Unsaved changes will be lost. Continue?'))) return;
      setZones(location.zones);
      setIsDirty(false);
    }
    setIsEditing((v) => !v);
    interaction.setSelectedZoneIdx(-1);
  }, [isEditing, isDirty, location.zones, t, interaction]);

  const handleFitAll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const vp = fitAllViewport(zones, container.clientWidth, container.clientHeight);
    interaction.setViewport(vp);
  }, [zones, interaction]);

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

  const content = (
    <div className="space-y-3" ref={containerRef}>
      {/* KPI Bar */}
      <FloorMapKPIBar zones={zones} stock={stock} />

      {/* Toolbar */}
      <FloorMapToolbar
        isEditing={isEditing}
        isDirty={isDirty}
        hasUnplaced={hasUnplaced}
        zoom={interaction.viewport.zoom}
        viewMode={viewMode}
        zoneCount={zones.length}
        isFullscreen={isFullscreen}
        searchQuery={searchQuery}
        onToggleEdit={handleToggleEdit}
        onZoomIn={interaction.zoomIn}
        onZoomOut={interaction.zoomOut}
        onZoomChange={handleZoomChange}
        onFitAll={handleFitAll}
        onAutoLayout={handleAutoLayout}
        onSave={handleSave}
        onViewModeChange={handleViewModeChange}
        onToggleFullscreen={handleToggleFullscreen}
        onSearchChange={setSearchQuery}
      />

      {/* Canvas */}
      <FloorMapCanvas
        zones={zones}
        stock={stock}
        isEditing={isEditing}
        viewMode={viewMode}
        canvasHeight={canvasHeight}
        highlightedType={highlightedType}
        searchQuery={searchQuery}
        onZoneClick={handleZoneClick}
        interaction={interaction}
      />

      {/* Legend */}
      <FloorMapLegend
        visibleTypes={visibleTypes}
        viewMode={viewMode}
        highlightedType={highlightedType}
        onToggleHighlight={handleToggleHighlight}
      />

      {/* Zone Detail Sheet */}
      <FloorMapZoneDetail
        zone={detailZoneIdx >= 0 ? zones[detailZoneIdx] : null}
        stock={stock}
        allZones={zones}
        locationId={location.id}
        onClose={() => setDetailZoneIdx(-1)}
      />
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
