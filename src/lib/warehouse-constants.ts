/**
 * Warehouse zone type configuration with icons, colors, and labels.
 */

import type { WarehouseZoneType } from '@/types/warehouse';

export interface ZoneTypeConfig {
  icon: string;
  color: string;
  bgColor: string;
  labelEn: string;
  labelDe: string;
}

export const ZONE_TYPE_CONFIG: Record<WarehouseZoneType, ZoneTypeConfig> = {
  receiving: {
    icon: 'PackagePlus',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    labelEn: 'Receiving',
    labelDe: 'Wareneingang',
  },
  storage: {
    icon: 'Archive',
    color: 'text-slate-600',
    bgColor: 'bg-slate-100 dark:bg-slate-900/30',
    labelEn: 'Storage',
    labelDe: 'Lager',
  },
  picking: {
    icon: 'HandMetal',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    labelEn: 'Picking',
    labelDe: 'Kommissionierung',
  },
  packing: {
    icon: 'PackageCheck',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    labelEn: 'Packing',
    labelDe: 'Verpackung',
  },
  shipping: {
    icon: 'Truck',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    labelEn: 'Shipping',
    labelDe: 'Versand',
  },
  cold_storage: {
    icon: 'Snowflake',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    labelEn: 'Cold Storage',
    labelDe: 'Kühllager',
  },
  hazmat: {
    icon: 'AlertTriangle',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    labelEn: 'Hazardous Materials',
    labelDe: 'Gefahrstoffe',
  },
  returns: {
    icon: 'RotateCcw',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    labelEn: 'Returns',
    labelDe: 'Retouren',
  },
  other: {
    icon: 'LayoutGrid',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    labelEn: 'Other',
    labelDe: 'Sonstige',
  },
};

export const ZONE_TYPES: WarehouseZoneType[] = [
  'receiving', 'storage', 'picking', 'packing', 'shipping',
  'cold_storage', 'hazmat', 'returns', 'other',
];

export const CONTACT_TYPE_CONFIG: Record<string, { color: string; bgColor: string; labelEn: string; labelDe: string }> = {
  b2b: { color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30', labelEn: 'B2B', labelDe: 'B2B' },
  b2c: { color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30', labelEn: 'B2C', labelDe: 'B2C' },
  supplier: { color: 'text-purple-700', bgColor: 'bg-purple-100 dark:bg-purple-900/30', labelEn: 'Supplier', labelDe: 'Lieferant' },
  other: { color: 'text-gray-700', bgColor: 'bg-gray-100 dark:bg-gray-900/30', labelEn: 'Other', labelDe: 'Sonstige' },
};
