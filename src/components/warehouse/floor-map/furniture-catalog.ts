import type { FurnitureType, FurnitureSection } from '@/types/warehouse';

/**
 * Furniture Catalog — 12 types with visual config, default sections, and SVG shape data.
 * Used by FloorMapFurniturePalette and FloorMapFurniture for rendering.
 */

export interface FurnitureCatalogEntry {
  type: FurnitureType;
  labelEn: string;
  labelDe: string;
  category: 'shelving' | 'floor' | 'work' | 'special';
  categoryLabelEn: string;
  categoryLabelDe: string;
  icon: string; // Lucide icon name
  defaultSize: { w: number; h: number };
  defaultSections: FurnitureSection[];
  /** Whether this furniture can hold stock/products */
  isStorage: boolean;
  /** Base fill color for flat mode */
  color: string;
  /** Darker shade for 3D faces */
  colorDark: string;
  /** Stroke color */
  stroke: string;
  /** Text/label color */
  textColor: string;
  /** Optional accent (e.g. blue tint for cold_unit) */
  accent?: string;
}

export const FURNITURE_CATALOG: Record<FurnitureType, FurnitureCatalogEntry> = {
  shelf: {
    type: 'shelf',
    labelEn: 'Shelf',
    labelDe: 'Regal',
    category: 'shelving',
    categoryLabelEn: 'Shelving',
    categoryLabelDe: 'Regale',
    icon: 'LayoutGrid',
    defaultSize: { w: 3, h: 1 },
    isStorage: true,
    defaultSections: [
      { id: 'A1', label: 'A1' },
      { id: 'A2', label: 'A2' },
      { id: 'A3', label: 'A3' },
      { id: 'A4', label: 'A4' },
    ],
    color: '#E0E7FF',
    colorDark: '#A5B4FC',
    stroke: '#6366F1',
    textColor: '#3730A3',
  },
  heavy_rack: {
    type: 'heavy_rack',
    labelEn: 'Heavy Rack',
    labelDe: 'Schwerlast-Regal',
    category: 'shelving',
    categoryLabelEn: 'Shelving',
    categoryLabelDe: 'Regale',
    icon: 'Container',
    defaultSize: { w: 4, h: 2 },
    isStorage: true,
    defaultSections: [
      { id: 'L1', label: 'Level 1' },
      { id: 'L2', label: 'Level 2' },
      { id: 'L3', label: 'Level 3' },
    ],
    color: '#FEE2E2',
    colorDark: '#FCA5A5',
    stroke: '#DC2626',
    textColor: '#991B1B',
  },
  pallet_rack: {
    type: 'pallet_rack',
    labelEn: 'Pallet Rack',
    labelDe: 'Palettenregal',
    category: 'shelving',
    categoryLabelEn: 'Shelving',
    categoryLabelDe: 'Regale',
    icon: 'Layers',
    defaultSize: { w: 5, h: 2 },
    isStorage: true,
    defaultSections: [
      { id: 'P1', label: 'Pallet 1' },
      { id: 'P2', label: 'Pallet 2' },
      { id: 'P3', label: 'Pallet 3' },
    ],
    color: '#FEF3C7',
    colorDark: '#FCD34D',
    stroke: '#D97706',
    textColor: '#92400E',
  },
  cabinet: {
    type: 'cabinet',
    labelEn: 'Cabinet',
    labelDe: 'Schrank',
    category: 'shelving',
    categoryLabelEn: 'Shelving',
    categoryLabelDe: 'Regale',
    icon: 'DoorClosed',
    defaultSize: { w: 2, h: 1 },
    isStorage: true,
    defaultSections: [
      { id: 'TOP', label: 'Top' },
      { id: 'MID', label: 'Middle' },
      { id: 'BOT', label: 'Bottom' },
    ],
    color: '#F3E8FF',
    colorDark: '#D8B4FE',
    stroke: '#9333EA',
    textColor: '#6B21A8',
  },
  drawer_unit: {
    type: 'drawer_unit',
    labelEn: 'Drawer Unit',
    labelDe: 'Schubladenschrank',
    category: 'shelving',
    categoryLabelEn: 'Shelving',
    categoryLabelDe: 'Regale',
    icon: 'Archive',
    defaultSize: { w: 2, h: 1 },
    isStorage: true,
    defaultSections: [
      { id: 'D1', label: 'Drawer 1' },
      { id: 'D2', label: 'Drawer 2' },
      { id: 'D3', label: 'Drawer 3' },
      { id: 'D4', label: 'Drawer 4' },
      { id: 'D5', label: 'Drawer 5' },
    ],
    color: '#FCE7F3',
    colorDark: '#F9A8D4',
    stroke: '#DB2777',
    textColor: '#9D174D',
  },
  flow_rack: {
    type: 'flow_rack',
    labelEn: 'Flow Rack',
    labelDe: 'Durchlaufregal',
    category: 'shelving',
    categoryLabelEn: 'Shelving',
    categoryLabelDe: 'Regale',
    icon: 'ArrowRightLeft',
    defaultSize: { w: 4, h: 1 },
    isStorage: true,
    defaultSections: [
      { id: 'L1', label: 'Lane 1' },
      { id: 'L2', label: 'Lane 2' },
      { id: 'L3', label: 'Lane 3' },
      { id: 'L4', label: 'Lane 4' },
    ],
    color: '#DBEAFE',
    colorDark: '#93C5FD',
    stroke: '#2563EB',
    textColor: '#1E40AF',
  },
  table: {
    type: 'table',
    labelEn: 'Worktable',
    labelDe: 'Arbeitstisch',
    category: 'work',
    categoryLabelEn: 'Work Surfaces',
    categoryLabelDe: 'Arbeitsflächen',
    icon: 'Table2',
    defaultSize: { w: 3, h: 2 },
    isStorage: false,
    defaultSections: [
      { id: 'SURFACE', label: 'Surface' },
    ],
    color: '#ECFDF5',
    colorDark: '#6EE7B7',
    stroke: '#059669',
    textColor: '#065F46',
  },
  bin_wall: {
    type: 'bin_wall',
    labelEn: 'Bin Wall',
    labelDe: 'Kleinteile-Wand',
    category: 'special',
    categoryLabelEn: 'Special',
    categoryLabelDe: 'Spezial',
    icon: 'Grid3x3',
    defaultSize: { w: 2, h: 2 },
    isStorage: true,
    defaultSections: [
      { id: 'A1', label: 'A1' }, { id: 'A2', label: 'A2' },
      { id: 'A3', label: 'A3' }, { id: 'A4', label: 'A4' },
      { id: 'B1', label: 'B1' }, { id: 'B2', label: 'B2' },
      { id: 'B3', label: 'B3' }, { id: 'B4', label: 'B4' },
      { id: 'C1', label: 'C1' }, { id: 'C2', label: 'C2' },
      { id: 'C3', label: 'C3' }, { id: 'C4', label: 'C4' },
      { id: 'D1', label: 'D1' }, { id: 'D2', label: 'D2' },
      { id: 'D3', label: 'D3' }, { id: 'D4', label: 'D4' },
    ],
    color: '#FFF7ED',
    colorDark: '#FDBA74',
    stroke: '#EA580C',
    textColor: '#9A3412',
  },
  cold_unit: {
    type: 'cold_unit',
    labelEn: 'Cold Storage Unit',
    labelDe: 'Kühlregal',
    category: 'special',
    categoryLabelEn: 'Special',
    categoryLabelDe: 'Spezial',
    icon: 'Snowflake',
    defaultSize: { w: 3, h: 1 },
    isStorage: true,
    defaultSections: [
      { id: 'C1', label: 'Section 1' },
      { id: 'C2', label: 'Section 2' },
      { id: 'C3', label: 'Section 3' },
    ],
    color: '#CFFAFE',
    colorDark: '#67E8F9',
    stroke: '#0891B2',
    textColor: '#155E75',
    accent: '#06B6D4',
  },
  pallet_spot: {
    type: 'pallet_spot',
    labelEn: 'Pallet Spot',
    labelDe: 'Bodenstellplatz',
    category: 'floor',
    categoryLabelEn: 'Floor Spots',
    categoryLabelDe: 'Bodenstellen',
    icon: 'Square',
    defaultSize: { w: 2, h: 2 },
    isStorage: true,
    defaultSections: [
      { id: 'FLOOR', label: 'Floor' },
    ],
    color: '#F1F5F9',
    colorDark: '#CBD5E1',
    stroke: '#64748B',
    textColor: '#334155',
  },
  staging_area: {
    type: 'staging_area',
    labelEn: 'Staging Area',
    labelDe: 'Bereitstellfläche',
    category: 'floor',
    categoryLabelEn: 'Floor Spots',
    categoryLabelDe: 'Bodenstellen',
    icon: 'Maximize2',
    defaultSize: { w: 4, h: 3 },
    isStorage: false,
    defaultSections: [
      { id: 'AREA', label: 'Area' },
    ],
    color: '#FEF9C3',
    colorDark: '#FDE047',
    stroke: '#CA8A04',
    textColor: '#854D0E',
  },
  conveyor: {
    type: 'conveyor',
    labelEn: 'Conveyor',
    labelDe: 'Förderband',
    category: 'special',
    categoryLabelEn: 'Special',
    categoryLabelDe: 'Spezial',
    icon: 'MoveHorizontal',
    defaultSize: { w: 6, h: 1 },
    isStorage: false,
    defaultSections: [],
    color: '#F0FDF4',
    colorDark: '#86EFAC',
    stroke: '#16A34A',
    textColor: '#166534',
  },
};

/** All furniture types as array */
export const FURNITURE_TYPES = Object.keys(FURNITURE_CATALOG) as FurnitureType[];

/** Category grouping for the palette */
export const FURNITURE_CATEGORIES = [
  { key: 'shelving', labelEn: 'Shelving', labelDe: 'Regale' },
  { key: 'floor', labelEn: 'Floor Spots', labelDe: 'Bodenstellen' },
  { key: 'work', labelEn: 'Work Surfaces', labelDe: 'Arbeitsflächen' },
  { key: 'special', labelEn: 'Special', labelDe: 'Spezial' },
] as const;

/** Get catalog entry for a furniture type */
export function getFurnitureCatalogEntry(type: FurnitureType): FurnitureCatalogEntry {
  return FURNITURE_CATALOG[type];
}

/** Get localized label for a furniture type */
export function getFurnitureLabel(type: FurnitureType, locale: string): string {
  const entry = FURNITURE_CATALOG[type];
  return locale.startsWith('de') ? entry.labelDe : entry.labelEn;
}

/** Check if a furniture type can hold stock/products */
export function isStorageFurniture(type: FurnitureType): boolean {
  return FURNITURE_CATALOG[type].isStorage;
}
