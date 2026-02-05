/**
 * Supplier Portal Types
 * Self-registration portal for suppliers via invitation links
 */

// Invitation status
export type SupplierInvitationStatus = 'pending' | 'completed' | 'expired' | 'cancelled';

// Supplier invitation record
export interface SupplierInvitation {
  id: string;
  tenantId: string;
  email: string;
  contactName?: string;
  companyName?: string;
  invitationCode: string;
  status: SupplierInvitationStatus;
  invitedBy?: string;
  createdAt: string;
  expiresAt: string;
  completedAt?: string;
  supplierId?: string;
}

// Registration form data (matches 4-step wizard)
export interface SupplierRegistrationData {
  // Step 1: Company Basics
  companyName: string;
  legalForm?: string;
  contactName: string;
  contactPosition?: string;
  email: string;
  phone?: string;
  mobile?: string;
  website?: string;
  linkedin?: string;

  // Step 2: Address
  street: string;
  addressLine2?: string;
  city: string;
  state?: string;
  country: string;
  postalCode: string;

  // Shipping address (if different)
  shippingAddressDifferent?: boolean;
  shippingStreet?: string;
  shippingAddressLine2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingCountry?: string;
  shippingPostalCode?: string;

  // Step 3: Legal & Banking
  taxNumber: string;
  vatNumber: string;
  commercialRegisterNumber?: string;
  bankName?: string;
  iban: string;
  bic: string;
  paymentTerms?: string;

  // Step 4: Business Details
  supplierType?: 'manufacturer' | 'wholesaler' | 'distributor' | 'service_provider';
  industry?: string;
  productCategories?: string;
  certifications?: string;
  notes?: string;

  // Terms acceptance
  termsAccepted: boolean;
}

// Supplier portal context (public pages)
export interface SupplierPortalContext {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  invitationCode: string;
  invitation: SupplierInvitation;
  portalSettings: SupplierPortalSettings;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
    companyName: string;
  };
  isExpired: boolean;
}

// Portal settings (stored in tenants.settings.supplierPortal)
export interface SupplierPortalSettings {
  enabled: boolean;
  invitationExpiryDays: number; // Default: 14
  welcomeMessage?: string;
  successMessage?: string;
}

// Default portal settings
export const DEFAULT_SUPPLIER_PORTAL_SETTINGS: SupplierPortalSettings = {
  enabled: false,
  invitationExpiryDays: 14,
  welcomeMessage: undefined,
  successMessage: undefined,
};

// Form validation errors
export interface SupplierRegistrationValidationErrors {
  companyName?: string;
  contactName?: string;
  email?: string;
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
  taxNumber?: string;
  vatNumber?: string;
  iban?: string;
  bic?: string;
  termsAccepted?: string;
}

// Public invitation lookup result
export interface PublicSupplierInvitationResult {
  invitation: SupplierInvitation;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  portalSettings: SupplierPortalSettings;
  branding: {
    logoUrl?: string;
    primaryColor?: string;
  };
}
