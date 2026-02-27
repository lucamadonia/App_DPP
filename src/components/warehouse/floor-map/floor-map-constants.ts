import type { WarehouseZoneType } from '@/types/warehouse';

/** Size of one grid cell in SVG units */
export const GRID_CELL = 20;

/** Default grid dimensions (in grid units) */
export const GRID_COLS = 40;
export const GRID_ROWS = 30;

/** Zoom limits */
export const MIN_ZOOM = 0.3;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.15;

/** Default zone size (grid units) when auto-laying out */
export const DEFAULT_ZONE_WIDTH = 6;
export const DEFAULT_ZONE_HEIGHT = 4;
export const MIN_ZONE_SIZE = 2;

/** Handle size in SVG units */
export const HANDLE_SIZE = 6;

/** Minimap size */
export const MINIMAP_WIDTH = 180;
export const MINIMAP_HEIGHT = 130;

/** 3D extrusion — max depth in SVG px for tallest zone */
export const MAX_EXTRUSION = 18;
export const MIN_EXTRUSION = 4;

/** Isometric skew offsets for 3D faces */
export const ISO_DX = 0.7; // horizontal shift per extrusion unit
export const ISO_DY = 0.5; // vertical shift per extrusion unit

/** View modes */
export type FloorMapViewMode = 'flat' | '3d' | 'heatmap';

/** Zone fill colors for SVG — gradient pairs (light → medium) + stroke + text */
export const ZONE_FILL_COLORS: Record<
  WarehouseZoneType,
  {
    fill: string;
    fillEnd: string;
    stroke: string;
    text: string;
    glow: string;
    front: string;
    side: string;
  }
> = {
  receiving: {
    fill: '#DBEAFE', fillEnd: '#BFDBFE', stroke: '#3B82F6', text: '#1E40AF',
    glow: 'rgba(59,130,246,0.35)', front: '#93C5FD', side: '#60A5FA',
  },
  storage: {
    fill: '#F1F5F9', fillEnd: '#E2E8F0', stroke: '#64748B', text: '#334155',
    glow: 'rgba(100,116,139,0.25)', front: '#CBD5E1', side: '#94A3B8',
  },
  picking: {
    fill: '#FEF3C7', fillEnd: '#FDE68A', stroke: '#F59E0B', text: '#92400E',
    glow: 'rgba(245,158,11,0.35)', front: '#FCD34D', side: '#FBBF24',
  },
  packing: {
    fill: '#DCFCE7', fillEnd: '#BBF7D0', stroke: '#22C55E', text: '#166534',
    glow: 'rgba(34,197,94,0.35)', front: '#86EFAC', side: '#4ADE80',
  },
  shipping: {
    fill: '#F3E8FF', fillEnd: '#E9D5FF', stroke: '#A855F7', text: '#6B21A8',
    glow: 'rgba(168,85,247,0.35)', front: '#D8B4FE', side: '#C084FC',
  },
  cold_storage: {
    fill: '#CFFAFE', fillEnd: '#A5F3FC', stroke: '#06B6D4', text: '#155E75',
    glow: 'rgba(6,182,212,0.35)', front: '#67E8F9', side: '#22D3EE',
  },
  hazmat: {
    fill: '#FEE2E2', fillEnd: '#FECACA', stroke: '#EF4444', text: '#991B1B',
    glow: 'rgba(239,68,68,0.4)', front: '#FCA5A5', side: '#F87171',
  },
  returns: {
    fill: '#FFEDD5', fillEnd: '#FED7AA', stroke: '#F97316', text: '#9A3412',
    glow: 'rgba(249,115,22,0.35)', front: '#FDBA74', side: '#FB923C',
  },
  other: {
    fill: '#F3F4F6', fillEnd: '#E5E7EB', stroke: '#9CA3AF', text: '#4B5563',
    glow: 'rgba(156,163,175,0.2)', front: '#D1D5DB', side: '#9CA3AF',
  },
};

/** Heatmap gradient stops (cold → hot) */
export const HEATMAP_COLORS = [
  '#22D3EE', // 0% — cyan
  '#34D399', // 20% — emerald
  '#A3E635', // 40% — lime
  '#FACC15', // 60% — yellow
  '#FB923C', // 80% — orange
  '#EF4444', // 100% — red
];
