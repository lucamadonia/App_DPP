/**
 * Shared constants and pure helpers for the Suppliers module.
 * Used by SuppliersPage and all supplier sub-components.
 */
import type { Supplier, SupplierContact, SupplierProduct } from '@/types/database';
import { Factory, Building2, Truck, Users, type LucideIcon } from 'lucide-react';

// Available certifications (industry standards, not translated)
export const CERTIFICATIONS = [
  'ISO 9001', 'ISO 14001', 'ISO 45001', 'ISO 27001', 'ISO 50001',
  'BSCI', 'SA8000', 'GOTS', 'OEKO-TEX', 'FSC', 'PEFC',
  'REACH', 'RoHS', 'CE', 'IATF 16949', 'AS9100',
  'GMP', 'HACCP', 'BRC', 'IFS', 'Fairtrade',
];

// Supplier types — labelKey is translated via the 'settings' namespace
export const SUPPLIER_TYPES: { value: NonNullable<Supplier['supplier_type']>; labelKey: string; icon: LucideIcon }[] = [
  { value: 'manufacturer', labelKey: 'Manufacturer', icon: Factory },
  { value: 'wholesaler', labelKey: 'Wholesaler', icon: Building2 },
  { value: 'distributor', labelKey: 'Distributor', icon: Truck },
  { value: 'service_provider', labelKey: 'Service Provider', icon: Users },
];

// Legal forms (proper names, not translated)
export const LEGAL_FORMS = [
  'GmbH', 'AG', 'GmbH & Co. KG', 'KG', 'OHG', 'GbR', 'e.K.',
  'Ltd.', 'Inc.', 'Corp.', 'LLC', 'S.A.', 'S.r.l.', 'B.V.',
];

// Roles for supplier-product assignment — labelKey translated via 'settings'
export const SUPPLIER_ROLES: { value: SupplierProduct['role']; labelKey: string }[] = [
  { value: 'manufacturer', labelKey: 'Manufacturer' },
  { value: 'importeur', labelKey: 'Importer' },
  { value: 'component', labelKey: 'Component' },
  { value: 'raw_material', labelKey: 'Raw material' },
  { value: 'packaging', labelKey: 'Packaging' },
  { value: 'logistics', labelKey: 'Logistics' },
];

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

// Status traffic light (Ampel) dot colors
export const STATUS_DOT_CLASS: Record<Supplier['status'], string> = {
  active: 'bg-emerald-500',
  pending_approval: 'bg-amber-500',
  inactive: 'bg-slate-400',
  blocked: 'bg-red-500',
};

// Gradient palette for initials avatars (full class strings so Tailwind picks them up)
const AVATAR_GRADIENTS = [
  'bg-gradient-to-br from-emerald-500 to-teal-600',
  'bg-gradient-to-br from-blue-500 to-indigo-600',
  'bg-gradient-to-br from-amber-500 to-orange-600',
  'bg-gradient-to-br from-violet-500 to-purple-600',
  'bg-gradient-to-br from-rose-500 to-pink-600',
  'bg-gradient-to-br from-cyan-500 to-sky-600',
];

export function getAvatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** ISO-3166 alpha-2 code -> flag emoji (empty string for invalid codes) */
export function countryFlag(code?: string): string {
  if (!code || !/^[A-Za-z]{2}$/.test(code)) return '';
  return String.fromCodePoint(
    ...code.toUpperCase().split('').map(c => 127397 + c.charCodeAt(0))
  );
}

export function maskIban(iban?: string): string {
  if (!iban) return '-';
  if (iban.length <= 8) return iban;
  return iban.substring(0, 4) + ' **** **** **** ' + iban.substring(iban.length - 4);
}

/** Days from now until the given date (negative = in the past) */
export function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

/** Contract status: returns a translation key + tailwind classes, or null when no end date */
export function getContractStatus(supplier: Supplier): { labelKey: string; color: string; bg: string } | null {
  if (!supplier.contract_end) return null;
  const daysUntilEnd = Math.ceil((new Date(supplier.contract_end).getTime() - Date.now()) / 86_400_000);
  if (daysUntilEnd < 0) return { labelKey: 'Contract Expired', color: 'text-red-600', bg: 'bg-red-100' };
  if (daysUntilEnd < 30) return { labelKey: 'Contract Expiring Soon', color: 'text-yellow-600', bg: 'bg-yellow-100' };
  return { labelKey: 'Contract Active', color: 'text-green-600', bg: 'bg-green-100' };
}

/** Contract progress percentage (0-100) */
export function getContractProgress(supplier: Supplier): number {
  if (!supplier.contract_start || !supplier.contract_end) return 0;
  const start = new Date(supplier.contract_start).getTime();
  const end = new Date(supplier.contract_end).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

/** Audit traffic-light dot color class */
export function getAuditIndicator(dateStr?: string, isNext?: boolean): string | null {
  if (!dateStr) return null;
  const diffDays = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (isNext) {
    if (diffDays < 0) return 'bg-red-500';
    if (diffDays < 30) return 'bg-yellow-500';
    return 'bg-green-500';
  }
  const monthsAgo = Math.ceil(-diffDays / 30);
  if (monthsAgo > 12) return 'bg-red-500';
  if (monthsAgo > 6) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function getEmptySupplierForm(): Partial<Supplier> {
  return {
    name: '',
    code: '',
    legal_form: 'GmbH',
    contact_person: '',
    contact_position: '',
    email: '',
    phone: '',
    mobile: '',
    fax: '',
    additional_contacts: [],
    website: '',
    linkedin: '',
    address: '',
    address_line2: '',
    city: '',
    state: '',
    country: 'DE',
    postal_code: '',
    shipping_address: '',
    shipping_city: '',
    shipping_country: '',
    shipping_postal_code: '',
    tax_id: '',
    vat_id: '',
    duns_number: '',
    registration_number: '',
    bank_name: '',
    iban: '',
    bic: '',
    payment_terms: 'Net 30',
    risk_level: 'low',
    quality_rating: undefined,
    delivery_rating: undefined,
    verified: false,
    certifications: [],
    compliance_status: 'pending',
    supplier_type: 'manufacturer',
    industry: '',
    product_categories: [],
    contract_start: '',
    contract_end: '',
    min_order_value: undefined,
    currency: 'EUR',
    notes: '',
    internal_notes: '',
    tags: [],
    status: 'active',
  };
}

export function getEmptyProductForm(): Partial<SupplierProduct> {
  return {
    product_id: '',
    role: 'component',
    is_primary: false,
    lead_time_days: undefined,
    price_per_unit: undefined,
    currency: 'EUR',
    min_order_quantity: undefined,
    notes: '',
  };
}

export function getEmptyContactForm(): Partial<SupplierContact> {
  return {
    name: '',
    position: '',
    department: '',
    email: '',
    phone: '',
    mobile: '',
    is_primary: false,
    notes: '',
  };
}

/** Build the public registration URL for an invitation code */
export function buildInvitationUrl(invitationCode: string): string {
  return `${window.location.origin}/suppliers/register/${invitationCode}`;
}
