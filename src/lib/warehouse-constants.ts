/**
 * Warehouse zone type configuration with icons, colors, and labels.
 */

import type { WarehouseZoneType, ShipmentStatus } from '@/types/warehouse';

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

export const SHIPMENT_STATUS_COLORS: Record<ShipmentStatus, string> = {
  draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  picking: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  packed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  label_created: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  in_transit: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export const SHIPMENT_STATUS_ICON_COLORS: Record<ShipmentStatus, { color: string; bg: string }> = {
  draft: { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  picking: { color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  packed: { color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  label_created: { color: 'text-indigo-600', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  shipped: { color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  in_transit: { color: 'text-orange-600', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  delivered: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  cancelled: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const TRACKING_URL_TEMPLATES: Record<string, string> = {
  DHL: 'https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={tracking}',
  DPD: 'https://tracking.dpd.de/parcelstatus?query={tracking}',
  UPS: 'https://www.ups.com/track?tracknum={tracking}',
  GLS: 'https://gls-group.eu/DE/de/paketverfolgung?match={tracking}',
  Hermes: 'https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/{tracking}',
  FedEx: 'https://www.fedex.com/fedextrack/?trknbr={tracking}',
};

export function getTrackingUrl(carrier: string | undefined, trackingNumber: string): string | null {
  if (!carrier || !trackingNumber) return null;
  const template = TRACKING_URL_TEMPLATES[carrier];
  if (!template) return null;
  return template.replace('{tracking}', encodeURIComponent(trackingNumber));
}

export const CONTACT_TYPE_CONFIG: Record<string, { color: string; bgColor: string; labelEn: string; labelDe: string }> = {
  b2b: { color: 'text-blue-700', bgColor: 'bg-blue-100 dark:bg-blue-900/30', labelEn: 'B2B', labelDe: 'B2B' },
  b2c: { color: 'text-green-700', bgColor: 'bg-green-100 dark:bg-green-900/30', labelEn: 'B2C', labelDe: 'B2C' },
  supplier: { color: 'text-purple-700', bgColor: 'bg-purple-100 dark:bg-purple-900/30', labelEn: 'Supplier', labelDe: 'Lieferant' },
  other: { color: 'text-gray-700', bgColor: 'bg-gray-100 dark:bg-gray-900/30', labelEn: 'Other', labelDe: 'Sonstige' },
};
