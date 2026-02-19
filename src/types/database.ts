/**
 * Datenbank-Typen für DPP Manager
 *
 * Diese Datei enthält alle TypeScript-Interfaces für die NoCodeBackend-Tabellen.
 * Unterteilt in Master-Daten (shared) und Tenant-Daten (mandantenspezifisch).
 */

import type { ReturnsHubSettings } from './returns-hub';
import type { MasterLabelTemplate } from './master-label-editor';
import type { SupplierPortalSettings } from './supplier-portal';

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
  stripeCustomerId?: string;
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

export type DPPTemplateName =
  | 'modern' | 'classic' | 'compact'
  | 'minimal' | 'technical' | 'eco-friendly' | 'premium'
  | 'government' | 'retail' | 'scientific' | 'accessible'
  | 'custom';

export type DomainVerificationStatus = 'pending' | 'verified' | 'failed';

export interface QRCodeDomainSettings {
  customDomain?: string;      // z.B. "dpp.meinefirma.de"
  pathPrefix?: string;        // z.B. "/passport"
  useHttps?: boolean;         // Default: true
  resolver?: 'local' | 'gs1' | 'custom';
  foregroundColor?: string;   // QR-Code Vordergrundfarbe
  backgroundColor?: string;   // QR-Code Hintergrundfarbe
  dppTemplate?: DPPTemplateName; // Public DPP page template (legacy, fallback)
  dppTemplateCustomer?: DPPTemplateName; // Template for customer/consumer view
  dppTemplateCustoms?: DPPTemplateName;  // Template for customs/authority view
  domainStatus?: DomainVerificationStatus;
  domainVerifiedAt?: string;
}

// ============================================
// DPP DESIGN SETTINGS (Tenant-Daten)
// ============================================

export type DPPFontFamily = 'system' | 'Inter' | 'Roboto' | 'Poppins' | 'Merriweather' | 'Playfair Display';
export type DPPFontSize = 'small' | 'medium' | 'large';
export type DPPFontWeight = 'normal' | 'semibold' | 'bold' | 'extrabold';
export type DPPHeroStyle = 'gradient' | 'solid' | 'image' | 'minimal';
export type DPPHeroHeight = 'compact' | 'normal' | 'tall';
export type DPPBorderRadius = 'none' | 'small' | 'medium' | 'large' | 'full';
export type DPPShadowDepth = 'none' | 'subtle' | 'medium' | 'strong';
export type DPPBorderStyle = 'none' | 'thin' | 'thick';
export type DPPCustomLayoutMode = 'single-column' | 'two-column' | 'sidebar';
export type DPPCustomSectionStyle = 'card' | 'flat' | 'accordion';
export type DPPCustomHeaderStyle = 'icon-left' | 'simple' | 'centered' | 'underlined';
export type DPPSectionId = 'materials' | 'packaging' | 'carbonFootprint' | 'recycling' | 'certifications' | 'supplyChain' | 'support' | 'components';

// Content Display Modes per Section
export type DPPMaterialsDisplayMode = 'table' | 'cards' | 'horizontal-bars' | 'donut-chart';
export type DPPCarbonDisplayMode = 'gauge' | 'stat-cards' | 'comparison-bar' | 'infographic';
export type DPPCertificationsDisplayMode = 'list' | 'grid-cards' | 'badge-row' | 'timeline';
export type DPPSupplyChainDisplayMode = 'numbered-list' | 'vertical-timeline' | 'horizontal-timeline' | 'map-cards' | 'table';
export type DPPRecyclingDisplayMode = 'progress-bar' | 'donut' | 'info-cards';
export type DPPSupportDisplayMode = 'stacked' | 'tabbed' | 'accordion';

// Visual Options
export type DPPIconStyle = 'filled-circle' | 'outlined' | 'square' | 'none' | 'gradient-blob';
export type DPPSectionAccent = 'none' | 'left-border' | 'top-border' | 'gradient-top' | 'corner-dot' | 'icon-watermark';
export type DPPSectionSpacing = 'tight' | 'normal' | 'relaxed' | 'spacious';
export type DPPContentWidth = 'narrow' | 'medium' | 'wide' | 'full';
export type DPPImageDisplayStyle = 'rounded' | 'square' | 'circle' | 'hero-banner' | 'side-panel';
export type DPPRatingVisualization = 'circle-badge' | 'letter-grade' | 'progress-bar' | 'stars' | 'speedometer';
export type DPPEntryAnimation = 'none' | 'fade-in' | 'slide-up' | 'slide-left' | 'scale';
export type DPPBackgroundPattern = 'none' | 'dots' | 'grid' | 'diagonal-lines' | 'subtle-noise';
export type DPPHeroContentAlignment = 'left' | 'center' | 'right';
export type DPPFooterStyle = 'simple' | 'centered' | 'two-column' | 'dark-band';
export type DPPProductHeaderLayout = 'horizontal' | 'stacked' | 'overlay' | 'minimal';
export type DPPCustomsLayoutMode = 'single-column' | 'two-column' | 'tabbed';

export interface DPPColorSettings {
  secondaryColor?: string;
  accentColor?: string;
  pageBackground?: string;
  cardBackground?: string;
  textColor?: string;
  headingColor?: string;
}

export interface DPPTypographySettings {
  fontFamily?: DPPFontFamily;
  headingFontSize?: DPPFontSize;
  bodyFontSize?: DPPFontSize;
  headingFontWeight?: DPPFontWeight;
}

export interface DPPHeroSettings {
  visible?: boolean;
  style?: DPPHeroStyle;
  height?: DPPHeroHeight;
  backgroundImage?: string;
  overlayOpacity?: number;
}

export interface DPPCardSettings {
  borderRadius?: DPPBorderRadius;
  shadowDepth?: DPPShadowDepth;
  borderStyle?: DPPBorderStyle;
  backgroundOpacity?: number;
}

export interface DPPSectionConfig {
  visible?: boolean;
  defaultCollapsed?: boolean;
}

export interface DPPSectionSettings {
  order?: DPPSectionId[];
  configs?: Partial<Record<DPPSectionId, DPPSectionConfig>>;
}

export interface DPPCustomLayoutSettings {
  // === EXISTING (5) ===
  layoutMode?: DPPCustomLayoutMode;
  sectionStyle?: DPPCustomSectionStyle;
  headerStyle?: DPPCustomHeaderStyle;
  showSectionDividers?: boolean;
  compactMode?: boolean;

  // === SPACING & WIDTH (3) ===
  sectionSpacing?: DPPSectionSpacing;
  contentWidth?: DPPContentWidth;
  sectionInnerPadding?: DPPSectionSpacing;

  // === CONTENT DISPLAY MODES (6) ===
  materialsDisplayMode?: DPPMaterialsDisplayMode;
  carbonDisplayMode?: DPPCarbonDisplayMode;
  certificationsDisplayMode?: DPPCertificationsDisplayMode;
  supplyChainDisplayMode?: DPPSupplyChainDisplayMode;
  recyclingDisplayMode?: DPPRecyclingDisplayMode;
  supportDisplayMode?: DPPSupportDisplayMode;

  // === VISUAL ACCENTS (4) ===
  iconStyle?: DPPIconStyle;
  sectionAccent?: DPPSectionAccent;
  sectionAccentColor?: string;
  showSectionDescription?: boolean;

  // === PRODUCT HEADER (3) ===
  productHeaderLayout?: DPPProductHeaderLayout;
  imageDisplayStyle?: DPPImageDisplayStyle;
  showProductBadges?: boolean;

  // === HERO (3) ===
  heroContentAlignment?: DPPHeroContentAlignment;
  heroShowDescription?: boolean;
  heroShowBadges?: boolean;

  // === RATING & DATA VIZ (2) ===
  ratingVisualization?: DPPRatingVisualization;
  showDataLabels?: boolean;

  // === ANIMATIONS (2) ===
  entryAnimation?: DPPEntryAnimation;
  animationStagger?: boolean;

  // === BACKGROUND (2) ===
  backgroundPattern?: DPPBackgroundPattern;
  sectionBackgroundAlternate?: boolean;

  // === FOOTER (1) ===
  footerStyle?: DPPFooterStyle;

  // === CUSTOMS VIEW (5) ===
  customsLayoutMode?: DPPCustomsLayoutMode;
  customsSectionStyle?: DPPCustomSectionStyle;
  customsHeaderStyle?: DPPCustomHeaderStyle;
  customsCompactMode?: boolean;
  customsShowSectionDividers?: boolean;
}

export interface DPPFooterSettings {
  legalNoticeUrl?: string;
  privacyPolicyUrl?: string;
  showPoweredBy?: boolean;
  socialLinks?: {
    website?: string;
    instagram?: string;
    linkedin?: string;
    twitter?: string;
  };
}

export interface DPPDesignSettings {
  colors?: DPPColorSettings;
  typography?: DPPTypographySettings;
  hero?: DPPHeroSettings;
  cards?: DPPCardSettings;
  sections?: DPPSectionSettings;
  footer?: DPPFooterSettings;
  preset?: string;
  customLayout?: DPPCustomLayoutSettings;
}

export interface TenantSettings {
  defaultLanguage?: string;
  qrCodeStyle?: 'standard' | 'branded';
  publicDomain?: string;
  branding?: BrandingSettings;
  qrCode?: QRCodeDomainSettings;
  dppDesign?: DPPDesignSettings;
  returnsHub?: ReturnsHubSettings;
  supplierPortal?: SupplierPortalSettings;
  productLanguages?: string[];
  masterLabelTemplates?: MasterLabelTemplate[];
  onboardingCompleted?: boolean;
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
  tenant_id?: string; // null = global seed, set = tenant-specific
  translations?: Record<string, string>; // { en: "Electronics", de: "Elektronik" }
  subcategory_translations?: Record<string, Record<string, string>>; // { "Phones": { en: "Phones", de: "Telefone" } }
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
  category: 'environment' | 'chemicals' | 'recycling' | 'safety' | 'energy' | 'sustainability' | 'digital' | 'trade' | 'labeling';
  status: 'active' | 'upcoming';
  effectiveDate: string;
  applicationDate: string;
  keyRequirements: string[];
  affectedProducts: string[];
  dppDeadlines: Record<string, string>; // Produktkategorie -> Datum
  link?: string;
  penalties?: string;
  enforcementBody?: string;
  officialReference?: string;
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
  regulationId?: string;
  requiredDocumentCategories?: string[];
}

// ============================================
// NEWS (Master-Daten)
// ============================================

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: 'regulation' | 'deadline' | 'update' | 'warning' | 'recall' | 'standard' | 'guidance' | 'consultation';
  countries: string[];
  publishedAt: string;
  effectiveDate?: string;
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  link?: string;
  imageUrl?: string;
  source?: string;
}

// ============================================
// DOKUMENTE (Tenant-Daten)
// ============================================

export interface Document {
  id: string;
  tenant_id: string;
  product_id?: string;
  supplier_id?: string;
  folder_id?: string;
  name: string;
  type: 'pdf' | 'image' | 'other';
  category: string;
  url?: string;
  size?: string;
  validUntil?: string;
  uploadedAt: string;
  uploadedBy?: string;
  status: 'valid' | 'expiring' | 'expired';
  visibility: 'internal' | 'customs' | 'consumer';
}

// ============================================
// DOCUMENT FOLDERS (Tenant-Daten)
// ============================================

export interface DocumentFolder {
  id: string;
  tenantId: string;
  name: string;
  parentId?: string;
  sortOrder: number;
  createdAt: string;
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
  process_type?: 'raw_material_sourcing' | 'manufacturing' | 'assembly' | 'quality_control' | 'packaging' | 'warehousing' | 'transport' | 'distribution' | 'customs_clearance';
  transport_mode?: 'road' | 'rail' | 'sea' | 'air' | 'multimodal';
  status?: 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  document_ids?: string[];
  emissions_kg?: number;
  duration_days?: number;
  notes?: string;
  cost?: number;
  currency?: string;
  facility_identifier?: string; // GLN (Global Location Number)
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

// Staffelpreis-Stufe (Volume Pricing Tier)
export interface PriceTier {
  minQty: number;
  maxQty: number | null;  // null = unbegrenzt
  pricePerUnit: number;
  currency: string;
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
  price_tiers?: PriceTier[];
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

// ============================================
// PRODUCT REGISTRATIONS
// ============================================

export interface ProductRegistrations {
  weeeNumber?: string;
  eprelNumber?: string;
  reachNumber?: string;
  clpClassification?: string[];
  scipNumber?: string;
  ceDeclarationRef?: string;
  rohsDeclarationRef?: string;
  lucidNumber?: string;
  eprNumbers?: Record<string, string>;
  udi?: string;
  energyLabelClass?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
}

// ============================================
// PRODUCT SUPPORT RESOURCES
// ============================================

export interface VideoLink {
  title: string;
  url: string;
  type: 'youtube' | 'vimeo' | 'direct';
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface WarrantyInfo {
  durationMonths?: number;
  terms?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface RepairInfo {
  repairGuide?: string;
  serviceCenters?: string[];
  repairabilityScore?: number;
}

export interface SparePart {
  name: string;
  partNumber?: string;
  price?: number;
  currency?: string;
  available?: boolean;
}

export interface SupportResources {
  instructions?: string;
  assemblyGuide?: string;
  videos?: VideoLink[];
  faq?: FAQItem[];
  warranty?: WarrantyInfo;
  repairInfo?: RepairInfo;
  spareParts?: SparePart[];
}

// ============================================
// PRODUCT IMAGES
// ============================================

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  storagePath?: string;
  caption?: string;
  sortOrder: number;
  isPrimary: boolean;
}

// ============================================
// INVITATIONS
// ============================================

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  name?: string;
  message?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  invitedBy?: string;
  createdAt: string;
  expiresAt: string;
}

// ============================================
// ACTIVITY LOG
// ============================================

export interface ActivityLogEntry {
  id: string;
  tenantId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// TENANT PICTOGRAMS (Tenant-Daten)
// ============================================

export interface TenantPictogram {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: string;
  regulationYear: string;
  fileUrl: string;
  fileType: 'svg' | 'png' | 'jpg' | 'jpeg';
  fileSize: number;
  tags: string[];
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// Re-export from product.ts for convenience (Material is defined locally, so we only export the others)
export type { Product, CarbonFootprint, RecyclabilityInfo } from './product';
export type { SupplyChainEntry as ProductSupplyChainEntry } from './product';
export type { ReturnsHubSettings } from './returns-hub';
