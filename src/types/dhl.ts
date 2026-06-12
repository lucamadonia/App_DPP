/**
 * DHL Parcel DE Shipping API v2 — Types
 */

export type DHLParcelProduct = 'V01PAK' | 'V62KP' | 'V53WPAK' | 'V54EPAK' | 'V62WP' | 'V66WPI';
export type DHLLabelFormat = 'PDF_A4' | 'PDF_910-300-700';

export interface DHLSettings {
  enabled: boolean;
  sandbox: boolean;
  apiKey: string;
  username: string;
  password: string;
  /** Domestic billing number (V01PAK). DHL embeds the product code in
   *  positions 11–12, so each product needs its own activated participation. */
  billingNumber: string;
  /** Optional billing number for DHL Paket International (V53WPAK). Required
   *  if you ship outside the home country. Format: EKP(10) + "53" + Teilnahme(2). */
  billingNumberInternational?: string;
  /** Optional billing number for DHL Kleinpaket (V62KP), the successor to
   *  Warenpost national. Required to ship Kleinpaket. Format: EKP(10) + "62" + Teilnahme(2). */
  billingNumberKleinpaket?: string;
  defaultProduct: DHLParcelProduct;
  labelFormat: DHLLabelFormat;
  shipper: DHLAddress;
  connectedAt?: string;
}

/** Public subset of DHL settings (no credentials) */
export interface DHLSettingsPublic {
  enabled: boolean;
  sandbox: boolean;
  billingNumber: string;
  billingNumberInternational?: string;
  billingNumberKleinpaket?: string;
  defaultProduct: DHLParcelProduct;
  labelFormat: DHLLabelFormat;
  shipper: DHLAddress;
  connectedAt?: string;
  hasCredentials: boolean;
}

export interface DHLAddress {
  name1: string;
  name2?: string;
  addressStreet: string;
  postalCode: string;
  city: string;
  country: string; // ISO 3166-1 alpha-3: DEU, AUT, CHE...
  email?: string;
  phone?: string;
}

export interface DHLLabelResponse {
  success: boolean;
  trackingNumber: string;
  labelPdf: string; // base64
  shipmentNumber: string;
  labelUrl: string; // signed storage URL
  /** The DHL product the label was actually created with (after auto-detection,
   *  e.g. 'V62KP' when the package fit the Kleinpaket envelope). */
  product?: DHLParcelProduct;
  validationMessages?: { property: string; message: string; state: 'Warning' | 'Error' }[];
}

export interface DHLTrackingEvent {
  timestamp: string;
  location?: string;
  description: string;
  statusCode?: string;
}

export interface CarrierLabelData {
  carrier: string;
  dhlShipmentNumber?: string;
  dhlProduct?: string;
  labelFormat?: string;
  labelStoragePath?: string;
  createdAt: string;
  cancelledAt?: string;
}

export const DHL_PRODUCT_LABELS: Record<DHLParcelProduct, string> = {
  V01PAK: 'Paket National',
  V62KP: 'Kleinpaket',
  V53WPAK: 'Paket International',
  V54EPAK: 'Europaket',
  V62WP: 'Warenpost (discontinued)',
  V66WPI: 'Warenpost International',
};

// Selectable products. V62WP (Warenpost national) is intentionally omitted —
// DHL replaced it with V62KP (Kleinpaket) on 2025-01-01 and deactivated the
// automatic V62WP→V62KP conversion on 2026-05-31. V62WP stays in the type union
// only so historical carrier_label_data still type-checks.
export const DHL_PRODUCTS: DHLParcelProduct[] = [
  'V01PAK', 'V62KP', 'V53WPAK', 'V54EPAK', 'V66WPI',
];

/** DHL Parcel DE Returns API settings */
export interface DHLReturnsSettings {
  enabled: boolean;
  receiverId: string; // DHL Retoure receiver ID (from DHL business portal)
  billingNumber?: string; // Separate billing number for returns (optional, falls back to main)
}

/** Response from return label creation */
export interface DHLReturnLabelResponse {
  success: boolean;
  trackingNumber: string;
  shipmentNumber: string;
  labelUrl: string; // signed storage URL
  labelStoragePath: string;
}
