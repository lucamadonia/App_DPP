import { useTranslation } from 'react-i18next';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  LayoutGrid,
  Pencil,
  Eye,
  Save,
  Box,
  Layers,
  Flame,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { MIN_ZOOM, MAX_ZOOM, type FloorMapViewMode } from './floor-map-constants';

interface FloorMapToolbarProps {
  isEditing: boolean;
  isDirty: boolean;
  hasUnplaced: boolean;
  zoom: number;
  viewMode: FloorMapViewMode;
  zoneCount: number;
  isFullscreen: boolean;
  searchQuery: string;
  onToggleEdit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (value: number) => void;
  onFitAll: () => void;
  onAutoLayout: () => void;
  onSave: () => void;
  onViewModeChange: (mode: FloorMapViewMode) => void;
  onToggleFullscreen: () => void;
  onSearchChange: (query: string) => void;
}

export function FloorMapToolbar({
  isEditing,
  isDirty,
  hasUnplaced,
  zoom,
  viewMode,
  zoneCount,
  isFullscreen,
  searchQuery,
  onToggleEdit,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onFitAll,
  onAutoLayout,
  onSave,
  onViewModeChange,
  onToggleFullscreen,
  onSearchChange,
}: FloorMapToolbarProps) {
  const { t } = useTranslation('warehouse');

  const viewModes: { key: FloorMapViewMode; icon: typeof Layers; label: string }[] = [
    { key: 'flat', icon: Layers, label: '2D' },
    { key: '3d', icon: Box, label: '3D' },
    { key: 'heatmap', icon: Flame, label: t('Heatmap') },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 shadow-lg"
      style={{
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.5)',
      }}
    >
      {/* View mode switcher */}
      <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
        {viewModes.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
              viewMode === key
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onViewModeChange(key)}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {/* Zoom slider group */}
      <div className="flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2 py-0.5">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onZoomOut}>
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Slider
          value={[zoom]}
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.05}
          className="w-20"
          onValueChange={([v]) => onZoomChange(v)}
        />
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onZoomIn}>
          <ZoomIn className="h-3 w-3" />
        </Button>
        <span className="text-[10px] tabular-nums min-w-[2.5rem] text-center text-muted-foreground font-medium">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Fullscreen */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onToggleFullscreen}
        title={isFullscreen ? t('Exit Fullscreen') : t('Fullscreen')}
      >
        {isFullscreen ? (
          <Minimize2 className="h-3.5 w-3.5" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Fit All */}
      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onFitAll}>
        {t('Fit All')}
      </Button>

      {isEditing && (
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onAutoLayout}>
          <LayoutGrid className="h-3 w-3 mr-1" />
          {t('Auto Layout')}
        </Button>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('Search zones...')}
          className="h-7 w-36 text-xs pl-7 bg-transparent border-muted"
        />
      </div>

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
        className={`h-7 text-xs shadow-sm ${isEditing ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
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
