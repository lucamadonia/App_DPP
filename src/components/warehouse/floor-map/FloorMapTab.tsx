import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { LayoutGrid, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type {
  WhLocation,
  WarehouseZone,
  WhStockLevel,
  WarehouseZoneType,
} from '@/types/warehouse';
import { FloorMapCanvas } from './FloorMapCanvas';
import { FloorMapToolbar } from './FloorMapToolbar';
import { FloorMapLegend } from './FloorMapLegend';
import { autoLayoutZones, fitAllViewport } from './floor-map-utils';
import { useFloorMapInteraction } from './useFloorMapInteraction';
import type { FloorMapViewMode } from './floor-map-constants';

interface FloorMapTabProps {
  location: WhLocation;
  stock: WhStockLevel[];
  onSaveZones: (zones: WarehouseZone[]) => Promise<void>;
}

export function FloorMapTab({ location, stock, onSaveZones }: FloorMapTabProps) {
  const { t } = useTranslation('warehouse');
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zones, setZones] = useState<WarehouseZone[]>(location.zones);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [viewMode, setViewMode] = useState<FloorMapViewMode>('3d');

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

  // Fit + auto-layout on initial mount if zones lack positions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (zones.length > 0 && zones.every((z) => !z.mapPosition)) {
        // All unplaced — auto-layout silently
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

  if (zones.length === 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <div className="relative">
            <LayoutGrid className="h-12 w-12 mb-4 opacity-30" />
            <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-amber-400 opacity-60" />
          </div>
          <p className="font-semibold text-foreground">{t('No zones configured')}</p>
          <p className="text-sm mt-1 max-w-xs text-center">
            {t('Add zones in the Zones tab to use the floor map.')}
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <span>{t('Add Zone')}</span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3" ref={containerRef}>
      <FloorMapToolbar
        isEditing={isEditing}
        isDirty={isDirty}
        hasUnplaced={hasUnplaced}
        zoom={interaction.viewport.zoom}
        viewMode={viewMode}
        zoneCount={zones.length}
        onToggleEdit={handleToggleEdit}
        onZoomIn={interaction.zoomIn}
        onZoomOut={interaction.zoomOut}
        onFitAll={handleFitAll}
        onAutoLayout={handleAutoLayout}
        onSave={handleSave}
        onViewModeChange={handleViewModeChange}
      />

      <FloorMapCanvas
        zones={zones}
        stock={stock}
        isEditing={isEditing}
        viewMode={viewMode}
        onZoneClick={(idx) => interaction.setSelectedZoneIdx(idx)}
        interaction={interaction}
      />

      <FloorMapLegend visibleTypes={visibleTypes} viewMode={viewMode} />
    </div>
  );
}
