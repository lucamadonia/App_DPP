import { useState, useCallback, useRef, useEffect, type RefObject } from 'react';
import type { WarehouseZone, ZoneMapPosition } from '@/types/warehouse';
import {
  GRID_CELL,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  MIN_ZONE_SIZE,
  PAN_STEP,
} from './floor-map-constants';
import { snapPositionToGrid, panToZoneViewport } from './floor-map-utils';
import type { FloorMapViewMode } from './floor-map-constants';

export type HandleDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

interface DragState {
  type: 'move' | 'resize';
  zoneIdx: number;
  startMouseX: number;
  startMouseY: number;
  startPos: ZoneMapPosition;
  handle?: HandleDirection;
}

interface PanState {
  startMouseX: number;
  startMouseY: number;
  startVpX: number;
  startVpY: number;
}

export interface FloorMapViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface FloorMapInteraction {
  viewport: FloorMapViewport;
  setViewport: React.Dispatch<React.SetStateAction<FloorMapViewport>>;
  selectedZoneIdx: number;
  setSelectedZoneIdx: (idx: number) => void;
  hoveredZoneIdx: number;
  setHoveredZoneIdx: (idx: number) => void;
  handleZoneDragStart: (
    e: React.PointerEvent,
    zoneIdx: number,
    pos: ZoneMapPosition,
  ) => void;
  handleResizeStart: (
    e: React.PointerEvent,
    zoneIdx: number,
    pos: ZoneMapPosition,
    handle: HandleDirection,
  ) => void;
  handleCanvasPointerDown: (e: React.PointerEvent) => void;
  handleCanvasPointerMove: (e: React.PointerEvent) => void;
  handleCanvasPointerUp: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  pendingMove: { zoneIdx: number; pos: ZoneMapPosition } | null;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (zoom: number) => void;
  isDragging: boolean;
  panTo: (x: number, y: number) => void;
}

interface UseFloorMapInteractionOptions {
  zones?: WarehouseZone[];
  containerRef?: RefObject<HTMLDivElement | null>;
  viewMode?: FloorMapViewMode;
  isFullscreen?: boolean;
  onViewModeChange?: (mode: FloorMapViewMode) => void;
  onToggleFullscreen?: () => void;
  onOpenDetail?: () => void;
}

export function useFloorMapInteraction(
  svgRef: RefObject<SVGSVGElement | null>,
  isEditing: boolean,
  onZoneMove?: (zoneIdx: number, pos: ZoneMapPosition) => void,
  options?: UseFloorMapInteractionOptions,
): FloorMapInteraction {
  const [viewport, setViewport] = useState<FloorMapViewport>({
    x: 20,
    y: 20,
    zoom: 1,
  });
  const [selectedZoneIdx, setSelectedZoneIdx] = useState(-1);
  const [hoveredZoneIdx, setHoveredZoneIdx] = useState(-1);
  const [pendingMove, setPendingMove] = useState<{
    zoneIdx: number;
    pos: ZoneMapPosition;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<PanState | null>(null);

  // Keyboard navigation
  useEffect(() => {
    const zones = options?.zones;
    if (!zones || zones.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case 'Tab': {
          e.preventDefault();
          const dir = e.shiftKey ? -1 : 1;
          setSelectedZoneIdx((prev) => {
            const next = prev + dir;
            if (next < 0) return zones.length - 1;
            if (next >= zones.length) return 0;
            return next;
          });
          break;
        }
        case 'Escape':
          if (options?.isFullscreen) {
            options.onToggleFullscreen?.();
          } else {
            setSelectedZoneIdx(-1);
          }
          break;
        case '+':
        case '=':
          setViewport((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom + ZOOM_STEP) }));
          break;
        case '-':
          setViewport((v) => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom - ZOOM_STEP) }));
          break;
        case 'f':
        case 'F':
          options?.onToggleFullscreen?.();
          break;
        case '1':
          options?.onViewModeChange?.('flat');
          break;
        case '2':
          options?.onViewModeChange?.('3d');
          break;
        case '3':
          options?.onViewModeChange?.('heatmap');
          break;
        case 'Enter':
          if (selectedZoneIdx >= 0) {
            options?.onOpenDetail?.();
          }
          break;
        case 'ArrowUp':
          if (selectedZoneIdx < 0) {
            e.preventDefault();
            setViewport((v) => ({ ...v, y: v.y + PAN_STEP }));
          }
          break;
        case 'ArrowDown':
          if (selectedZoneIdx < 0) {
            e.preventDefault();
            setViewport((v) => ({ ...v, y: v.y - PAN_STEP }));
          }
          break;
        case 'ArrowLeft':
          if (selectedZoneIdx < 0) {
            e.preventDefault();
            setViewport((v) => ({ ...v, x: v.x + PAN_STEP }));
          }
          break;
        case 'ArrowRight':
          if (selectedZoneIdx < 0) {
            e.preventDefault();
            setViewport((v) => ({ ...v, x: v.x - PAN_STEP }));
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [options, selectedZoneIdx]);

  // Pan to selected zone
  useEffect(() => {
    const zones = options?.zones;
    const container = options?.containerRef?.current;
    if (!zones || selectedZoneIdx < 0 || !container) return;
    const zone = zones[selectedZoneIdx];
    if (!zone?.mapPosition) return;

    const target = panToZoneViewport(
      zone,
      container.clientWidth,
      container.clientHeight,
      viewport.zoom,
    );
    setViewport(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneIdx]);

  const handleZoneDragStart = useCallback(
    (e: React.PointerEvent, zoneIdx: number, pos: ZoneMapPosition) => {
      if (!isEditing) return;
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setSelectedZoneIdx(zoneIdx);
      setIsDragging(true);
      dragRef.current = {
        type: 'move',
        zoneIdx,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPos: { ...pos },
      };
    },
    [isEditing],
  );

  const handleResizeStart = useCallback(
    (
      e: React.PointerEvent,
      zoneIdx: number,
      pos: ZoneMapPosition,
      handle: HandleDirection,
    ) => {
      if (!isEditing) return;
      e.stopPropagation();
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setIsDragging(true);
      dragRef.current = {
        type: 'resize',
        zoneIdx,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startPos: { ...pos },
        handle,
      };
    },
    [isEditing],
  );

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) return;
      panRef.current = {
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startVpX: viewport.x,
        startVpY: viewport.y,
      };
      if (isEditing) setSelectedZoneIdx(-1);
    },
    [viewport, isEditing],
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragRef.current) {
        const drag = dragRef.current;
        const dx =
          (e.clientX - drag.startMouseX) / viewport.zoom / GRID_CELL;
        const dy =
          (e.clientY - drag.startMouseY) / viewport.zoom / GRID_CELL;

        if (drag.type === 'move') {
          const newPos = snapPositionToGrid({
            x: drag.startPos.x + dx,
            y: drag.startPos.y + dy,
            width: drag.startPos.width,
            height: drag.startPos.height,
          });
          setPendingMove({ zoneIdx: drag.zoneIdx, pos: newPos });
        } else if (drag.type === 'resize' && drag.handle) {
          const p = drag.startPos;
          let x = p.x;
          let y = p.y;
          let w = p.width;
          let h = p.height;

          if (drag.handle.includes('e')) w = p.width + dx;
          if (drag.handle.includes('w')) { x = p.x + dx; w = p.width - dx; }
          if (drag.handle.includes('s')) h = p.height + dy;
          if (drag.handle.includes('n')) { y = p.y + dy; h = p.height - dy; }

          const snapped = snapPositionToGrid({ x, y, width: w, height: h });
          if (snapped.width < MIN_ZONE_SIZE) {
            snapped.width = MIN_ZONE_SIZE;
            snapped.x = Math.round(p.x + p.width - MIN_ZONE_SIZE);
          }
          if (snapped.height < MIN_ZONE_SIZE) {
            snapped.height = MIN_ZONE_SIZE;
            snapped.y = Math.round(p.y + p.height - MIN_ZONE_SIZE);
          }
          setPendingMove({ zoneIdx: drag.zoneIdx, pos: snapped });
        }
        return;
      }

      if (panRef.current) {
        const pan = panRef.current;
        setViewport({
          ...viewport,
          x: pan.startVpX + (e.clientX - pan.startMouseX),
          y: pan.startVpY + (e.clientY - pan.startMouseY),
        });
      }
    },
    [viewport],
  );

  const handleCanvasPointerUp = useCallback(() => {
    if (dragRef.current && pendingMove) {
      onZoneMove?.(pendingMove.zoneIdx, pendingMove.pos);
      setPendingMove(null);
    }
    dragRef.current = null;
    panRef.current = null;
    setIsDragging(false);
  }, [pendingMove, onZoneMove]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const direction = e.deltaY < 0 ? 1 : -1;
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, viewport.zoom + direction * ZOOM_STEP),
      );
      const scale = newZoom / viewport.zoom;

      setViewport({
        zoom: newZoom,
        x: mouseX - (mouseX - viewport.x) * scale,
        y: mouseY - (mouseY - viewport.y) * scale,
      });
    },
    [svgRef, viewport],
  );

  const zoomIn = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom + ZOOM_STEP) }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewport((v) => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom - ZOOM_STEP) }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setViewport((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }));
  }, []);

  const panTo = useCallback((x: number, y: number) => {
    setViewport((v) => ({ ...v, x, y }));
  }, []);

  return {
    viewport,
    setViewport,
    selectedZoneIdx,
    setSelectedZoneIdx,
    hoveredZoneIdx,
    setHoveredZoneIdx,
    handleZoneDragStart,
    handleResizeStart,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleWheel,
    pendingMove,
    zoomIn,
    zoomOut,
    setZoom,
    isDragging,
    panTo,
  };
}
