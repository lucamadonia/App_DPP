/**
 * Datenbank-Typen für DPP Manager
 *
 * Diese Datei enthält alle TypeScript-Interfaces für die NoCodeBackend-Tabellen.
 * Unterteilt in Master-Daten (shared) und Tenant-Daten (mandantenspezifisch).
 */

// ============================================
// TENANT (Mandant)
// ============================================

export interface Tenant {
  id: string;
  name: string;
  slug: string; // URL-freundlich, unique
  logo?: string;
  address?: string;
  country?: string;
  eori?: string; // EORI-Nummer
  vat?: string; // USt-IdNr
  settings?: TenantSettings;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

// ============================================
// BRANDING SETTINGS (Tenant-Daten)
// ============================================

export interface BrandingSettings {
  appName?: string;           // Ersetzt "DPP Manager"
  primaryColor?: string;      // Hex-Code z.B. "#3B82F6"
  logo?: string;              // URL zum Logo
  favicon?: string;           // URL zum Favicon
  poweredByText?: string;     // Footer-Text
}

// ============================================
// QR-CODE DOMAIN SETTINGS (Tenant-Daten)
// ============================================

export interface QRCodeDomainSettings {
  customDomain?: string;      // z.B. "dpp.meinefirma.de"
  pathPrefix?: string;        // z.B. "/passport"
  useHttps?: boolean;         // Default: true
  resolver?: 'local' | 'gs1' | 'custom';
  foregroundColor?: string;   // QR-Code Vordergrundfarbe
  backgroundColor?: string;   // QR-Code Hintergrundfarbe
  dppTemplate?: 'modern' | 'classic' | 'compact'; // Public DPP page template
}

export interface TenantSettings {
  defaultLanguage?: string;
  qrCodeStyle?: 'standard' | 'branded';
  publicDomain?: string;
  branding?: BrandingSettings;
  qrCode?: QRCodeDomainSettings;
}

// ============================================
// PRODUKTKATEGORIEN (Master-Daten)
// ============================================

export interface Category {
  id: string;
  parent_id?: string; // null = Hauptkategorie
  name: string;
  description?: string;
  icon?: string;
  regulations?: string[]; // Array von Regulierungs-IDs oder -Namen
  sort_order?: number;
  subcategories?: string[]; // Für hierarchische Darstellung
}

// ============================================
// LÄNDER (Master-Daten)
// ============================================

export interface Country {
  id: string;
  code: string; // DE, FR, AT, ...
  name: string;
  flag: string; // Emoji
  regulations: number;
  checklists: number;
  authorities: string[];
  description: string;
}

// ============================================
// REGULIERUNGEN (Master-Daten)
// ============================================

export interface EURegulation {
  id: string;
  name: string;
  fullName: string;
  description: string;
  category: 'environment' | 'chemicals' | 'recycling' | 'safety' | 'energy';
  status: 'active' | 'upcoming';
  effectiveDate: string;
  applicationDate: string;
  keyRequirements: string[];
  affectedProducts: string[];
  dppDeadlines: Record<string, string>; // Produktkategorie -> Datum
  link?: string;
}

export interface NationalRegulation {
  id: string;
  country_code: string;
  name: string;
  description: string;
  category: string; // Recycling, Verpackung, Sicherheit, Chemie, Nachhaltigkeit, Kennzeichnung, Energie
  mandatory: boolean;
  effectiveDate: string;
  authority: string;
  penalties: string;
  products: string[]; // Betroffene Produkttypen
  link?: string;
}

// ============================================
// PIKTOGRAMME (Master-Daten)
// ============================================

export interface Pictogram {
  id: string;
  symbol: string; // Emoji oder Icon-Code
  name: string;
  description: string;
  mandatory: boolean;
  countries: string[]; // Array von Ländercodes oder 'EU'
  category: 'safety' | 'recycling' | 'chemicals' | 'energy' | 'durability';
  dimensions: string;
  placement: string;
}

// ============================================
// RECYCLING-CODES (Master-Daten)
// ============================================

export interface RecyclingCode {
  id: string;
  code: string; // 1-7, 20-22, 40-41, 70-72
  symbol: string;
  name: string;
  fullName: string;
  examples: string;
  recyclable: boolean;
}

// ============================================
// CHECKLISTEN-TEMPLATES (Master-Daten)
// ============================================

export interface ChecklistTemplate {
  id: string;
  country_code: string;
  category_key: string; // electronics, textiles, etc.
  title: string;
  description: string;
  detailedDescription?: string;
  mandatory: boolean;
  category: string; // z.B. "Sicherheit & CE-Konformität"
  subcategory?: string;
  documentRequired: boolean;
  documentTypes?: string[];
  legalBasis?: string;
  authority?: string;
  deadline?: string;
  penalties?: string;
  tips?: string[];
  links?: { title: string; url: string }[];
  applicableProducts?: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  sort_order?: number;
}

// ============================================
// NEWS (Master-Daten)
// ============================================

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'regulation' | 'deadline' | 'update' | 'warning';
  countries: string[];
  publishedAt: string;
  effectiveDate?: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  link?: string;
}

// ============================================
// DOKUMENTE (Tenant-Daten)
// ============================================

export interface Document {
  id: string;
  tenant_id: string;
  product_id?: string;
  name: string;
  type: 'pdf' | 'image' | 'other';
  category: 'Konformität' | 'Zertifikat' | 'Bericht' | 'Datenblatt' | 'Testbericht';
  url?: string;
  size?: string;
  validUntil?: string;
  uploadedAt: string;
  uploadedBy?: string;
  status: 'valid' | 'expiring' | 'expired';
}

// ============================================
// SUPPLY CHAIN (Tenant-Daten)
// ============================================

export interface SupplyChainEntry {
  id: string;
  tenant_id: string;
  product_id: string;
  step: number;
  location: string;
  country: string;
  date: string;
  description: string;
  supplier?: string;
  supplier_id?: string;
  risk_level?: 'low' | 'medium' | 'high';
  verified?: boolean;
  coordinates?: string; // lat,lng
}

// ============================================
// CHECKLISTEN-FORTSCHRITT (Tenant-Daten)
// ============================================

export interface ChecklistProgress {
  id: string;
  tenant_id: string;
  product_id?: string;
  checklist_item_id: string;
  checked: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
  notes?: string;
  updatedAt: string;
  updatedBy?: string;
}

// ============================================
// LIEFERANTEN (Tenant-Daten)
// ============================================

export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  code?: string; // Lieferanten-Kurzel/Code
  legal_form?: string; // GmbH, AG, Ltd, etc.

  // Hauptkontakt
  contact_person?: string;
  contact_position?: string; // Position/Funktion
  email?: string;
  phone?: string;
  mobile?: string;
  fax?: string;

  // Weitere Ansprechpartner (JSON Array)
  additional_contacts?: SupplierContact[];

  // Online-Prasenz
  website?: string;
  linkedin?: string;

  // Firmenadresse
  address?: string;
  address_line2?: string;
  city?: string;
  state?: string; // Bundesland
  country: string;
  postal_code?: string;

  // Lieferadresse (falls abweichend)
  shipping_address?: string;
  shipping_city?: string;
  shipping_country?: string;
  shipping_postal_code?: string;

  // Rechtliche Informationen
  tax_id?: string; // Steuernummer
  vat_id?: string; // USt-IdNr
  duns_number?: string; // D-U-N-S Nummer
  registration_number?: string; // Handelsregisternummer

  // Bankverbindung
  bank_name?: string;
  iban?: string;
  bic?: string;
  payment_terms?: string; // z.B. "30 Tage netto"

  // Bewertung & Status
  risk_level: 'low' | 'medium' | 'high';
  quality_rating?: number; // 1-5 Sterne
  delivery_rating?: number; // 1-5 Sterne
  verified: boolean;
  verification_date?: string;
  verified_by?: string;

  // Zertifizierungen & Compliance
  certifications?: string[]; // ISO, BSCI, etc.
  audit_date?: string;
  next_audit_date?: string;
  compliance_status?: 'compliant' | 'pending' | 'non_compliant';

  // Kategorisierung
  supplier_type?: 'manufacturer' | 'wholesaler' | 'distributor' | 'service_provider';
  industry?: string;
  product_categories?: string[];

  // Vertragliches
  contract_start?: string;
  contract_end?: string;
  min_order_value?: number;
  currency?: string;

  // Interne Felder
  notes?: string;
  internal_notes?: string; // Nur fur interne Nutzung
  tags?: string[];
  status: 'active' | 'inactive' | 'blocked' | 'pending_approval';
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

// Zusatzliche Ansprechpartner beim Lieferanten
export interface SupplierContact {
  id?: string;
  name: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  is_primary?: boolean;
  notes?: string;
}

// Verknüpfung Lieferant <-> Produkt
export interface SupplierProduct {
  id: string;
  tenant_id: string;
  supplier_id: string;
  product_id: string;
  role: 'manufacturer' | 'importeur' | 'component' | 'raw_material' | 'packaging' | 'logistics';
  is_primary: boolean; // Hauptlieferant für dieses Produkt
  lead_time_days?: number; // Lieferzeit in Tagen
  price_per_unit?: number;
  currency?: string;
  min_order_quantity?: number;
  notes?: string;
  createdAt: string;
}

// ============================================
// MATERIALIEN (Tenant-Daten)
// ============================================

export interface Material {
  id?: string;
  product_id: string;
  name: string;
  percentage: number;
  recyclable: boolean;
  origin?: string;
  supplier?: string;
}

// ============================================
// ZERTIFIZIERUNGEN (Tenant-Daten)
// ============================================

export interface Certification {
  id?: string;
  tenant_id?: string;
  product_id: string;
  name: string;
  issuedBy: string;
  validUntil: string;
  certificateUrl?: string;
}

// ============================================
// USER SETTINGS (Tenant-Daten)
// ============================================

export interface UserSettings {
  id: string;
  tenant_id: string;
  user_id: string;
  qr_settings?: QRSettings;
  domain_settings?: DomainSettings;
}

export interface QRSettings {
  style: 'standard' | 'branded';
  logoUrl?: string;
  foregroundColor?: string;
  backgroundColor?: string;
}

export interface DomainSettings {
  customDomain?: string;
  sslEnabled?: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface ApiListResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
}

// ============================================
// CACHE TYPES
// ============================================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Re-export from product.ts for convenience (Material is defined locally, so we only export the others)
export type { Product, CarbonFootprint, RecyclabilityInfo } from './product';
export type { SupplyChainEntry as ProductSupplyChainEntry } from './product';
