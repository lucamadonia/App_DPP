import { useTranslation } from 'react-i18next';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  LayoutGrid,
  Pencil,
  Eye,
  Save,
  Box,
  Layers,
  Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FloorMapViewMode } from './floor-map-constants';

interface FloorMapToolbarProps {
  isEditing: boolean;
  isDirty: boolean;
  hasUnplaced: boolean;
  zoom: number;
  viewMode: FloorMapViewMode;
  zoneCount: number;
  onToggleEdit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitAll: () => void;
  onAutoLayout: () => void;
  onSave: () => void;
  onViewModeChange: (mode: FloorMapViewMode) => void;
}

export function FloorMapToolbar({
  isEditing,
  isDirty,
  hasUnplaced,
  zoom,
  viewMode,
  zoneCount,
  onToggleEdit,
  onZoomIn,
  onZoomOut,
  onFitAll,
  onAutoLayout,
  onSave,
  onViewModeChange,
}: FloorMapToolbarProps) {
  const { t } = useTranslation('warehouse');

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* View mode switcher */}
      <div className="flex items-center rounded-lg border bg-background p-0.5 shadow-sm">
        <button
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
            viewMode === 'flat'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onViewModeChange('flat')}
        >
          <Layers className="h-3 w-3" />
          2D
        </button>
        <button
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
            viewMode === '3d'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onViewModeChange('3d')}
        >
          <Box className="h-3 w-3" />
          3D
        </button>
        <button
          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
            viewMode === 'heatmap'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onViewModeChange('heatmap')}
        >
          <Flame className="h-3 w-3" />
          {t('Heatmap')}
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 rounded-lg border bg-background p-0.5 shadow-sm">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomOut}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs tabular-nums min-w-[3.2rem] text-center text-muted-foreground font-medium">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onZoomIn}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Button variant="outline" size="sm" className="h-7 text-xs shadow-sm" onClick={onFitAll}>
        <Maximize className="h-3 w-3 mr-1" />
        {t('Fit All')}
      </Button>

      {isEditing && (
        <Button variant="outline" size="sm" className="h-7 text-xs shadow-sm" onClick={onAutoLayout}>
          <LayoutGrid className="h-3 w-3 mr-1" />
          {t('Auto Layout')}
        </Button>
      )}

      <div className="flex-1" />

      {/* Zone count badge */}
      <Badge variant="secondary" className="text-xs font-medium">
        {zoneCount} {t('Zones')}
      </Badge>

      {hasUnplaced && !isEditing && (
        <span className="text-xs text-amber-600 dark:text-amber-400 max-w-[200px] truncate">
          {t('Some zones have no position. Switch to Edit mode to place them.')}
        </span>
      )}

      <Button
        variant={isEditing ? 'default' : 'outline'}
        size="sm"
        className="h-7 text-xs shadow-sm"
        onClick={onToggleEdit}
      >
        {isEditing ? (
          <><Eye className="h-3 w-3 mr-1" />{t('View Mode')}</>
        ) : (
          <><Pencil className="h-3 w-3 mr-1" />{t('Edit Layout')}</>
        )}
      </Button>

      {isEditing && isDirty && (
        <Button
          size="sm"
          className="h-7 text-xs shadow-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
          onClick={onSave}
        >
          <Save className="h-3 w-3 mr-1" />
          {t('Save Layout')}
        </Button>
      )}
    </div>
  );
}
