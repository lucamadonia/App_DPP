import { useState, useCallback, useRef, type RefObject } from 'react';
import type { ZoneMapPosition } from '@/types/warehouse';
import {
  GRID_CELL,
  MIN_ZOOM,
  MAX_ZOOM,
  ZOOM_STEP,
  MIN_ZONE_SIZE,
} from './floor-map-constants';
import { snapPositionToGrid } from './floor-map-utils';

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
  isDragging: boolean;
}

export function useFloorMapInteraction(
  svgRef: RefObject<SVGSVGElement | null>,
  isEditing: boolean,
  onZoneMove?: (zoneIdx: number, pos: ZoneMapPosition) => void,
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
    isDragging,
  };
}
