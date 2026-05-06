/**
 * Public Shipment Tracking Service
 *
 * Anonymous-callable wrappers around the get_public_shipment_by_token /
 * get_public_shipment_items_by_token / get_public_tenant_branding_by_token
 * SECURITY DEFINER functions added in migration 20260506.
 *
 * The 10-character `tracking_token` IS the auth — no JWT, no return number,
 * no email needed.  Use supabaseAnon so a logged-in admin's session does not
 * leak into the tracking page.
 */

import { supabaseAnon } from '@/lib/supabase';

export interface PublicShipmentSummary {
  id: string;
  tenantId: string;
  shipmentNumber: string;
  status: string;
  recipientFirstName: string;
  recipientCompany: string | null;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
  carrier: string | null;
  trackingNumber: string | null;
  estimatedDelivery: string | null;
  trackingPredictedArrivalAt: string | null;
  trackingLastStatus: string | null;
  trackingLastDescription: string | null;
  trackingLastEventAt: string | null;
  trackingLastLocation: string | null;
  trackingPolledAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  totalItems: number;
}

export interface PublicShipmentItem {
  productId: string;
  productName: string;
  productImageUrl: string | null;
  productGtin: string | null;
  productSerial: string | null;
  productManufacturer: string | null;
  productCategory: string | null;
  quantity: number;
  carbonFootprintTotal: number | null;
  carbonFootprintUnit: string;
  recyclabilityPct: number | null;
}

export interface PublicShipmentBranding {
  tenantId: string;
  tenantName: string;
  tenantSlug: string | null;
  primaryColor: string | null;
  logoUrl: string | null;
  appName: string;
  supportEmail: string | null;
}

export interface PublicTrackingEvent {
  timestamp: string;
  description: string;
  location?: string;
  statusCode?: string;
}

export interface PublicShipmentBundle {
  shipment: PublicShipmentSummary;
  items: PublicShipmentItem[];
  branding: PublicShipmentBranding;
  events: PublicTrackingEvent[];
}

/* -------------------------------------------------------------------------- */
/*  RPC helpers                                                                */
/* -------------------------------------------------------------------------- */

interface PublicShipmentRow {
  id: string;
  tenant_id: string;
  shipment_number: string;
  status: string;
  recipient_first_name: string;
  recipient_company: string | null;
  shipping_city: string;
  shipping_postal_code: string;
  shipping_country: string;
  carrier: string | null;
  tracking_number: string | null;
  estimated_delivery: string | null;
  tracking_predicted_arrival_at: string | null;
  tracking_last_status: string | null;
  tracking_last_description: string | null;
  tracking_last_event_at: string | null;
  tracking_last_location: string | null;
  tracking_polled_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  total_items: number;
}

interface PublicShipmentItemRow {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  product_gtin: string | null;
  product_serial: string | null;
  product_manufacturer: string | null;
  product_category: string | null;
  quantity: number;
  carbon_footprint_total: number | null;
  carbon_footprint_unit: string;
  recyclability_pct: number | null;
}

interface PublicBrandingRow {
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string | null;
  primary_color: string | null;
  logo_url: string | null;
  app_name: string;
  support_email: string | null;
}

function transformShipment(row: PublicShipmentRow): PublicShipmentSummary {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    shipmentNumber: row.shipment_number,
    status: row.status,
    recipientFirstName: row.recipient_first_name,
    recipientCompany: row.recipient_company,
    shippingCity: row.shipping_city,
    shippingPostalCode: row.shipping_postal_code,
    shippingCountry: row.shipping_country,
    carrier: row.carrier,
    trackingNumber: row.tracking_number,
    estimatedDelivery: row.estimated_delivery,
    trackingPredictedArrivalAt: row.tracking_predicted_arrival_at,
    trackingLastStatus: row.tracking_last_status,
    trackingLastDescription: row.tracking_last_description,
    trackingLastEventAt: row.tracking_last_event_at,
    trackingLastLocation: row.tracking_last_location,
    trackingPolledAt: row.tracking_polled_at,
    shippedAt: row.shipped_at,
    deliveredAt: row.delivered_at,
    createdAt: row.created_at,
    totalItems: row.total_items,
  };
}

function transformItem(row: PublicShipmentItemRow): PublicShipmentItem {
  return {
    productId: row.product_id,
    productName: row.product_name,
    productImageUrl: row.product_image_url,
    productGtin: row.product_gtin,
    productSerial: row.product_serial,
    productManufacturer: row.product_manufacturer,
    productCategory: row.product_category,
    quantity: row.quantity,
    carbonFootprintTotal: row.carbon_footprint_total,
    carbonFootprintUnit: row.carbon_footprint_unit,
    recyclabilityPct: row.recyclability_pct,
  };
}

function transformBranding(row: PublicBrandingRow): PublicShipmentBranding {
  return {
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    tenantSlug: row.tenant_slug,
    primaryColor: row.primary_color,
    logoUrl: row.logo_url,
    appName: row.app_name,
    supportEmail: row.support_email,
  };
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Fetch the full public bundle (shipment + items + branding) in parallel.
 * Returns null if the token is invalid.
 *
 * Also fires increment_shipment_tracking_view in the background so the
 * tenant gets engagement metrics on their tracking links.
 */
export async function getPublicShipmentByToken(
  token: string,
): Promise<{ shipment: PublicShipmentSummary; items: PublicShipmentItem[]; branding: PublicShipmentBranding } | null> {
  const cleanToken = token.trim().toLowerCase();
  if (!cleanToken) return null;

  const [shipmentResult, itemsResult, brandingResult] = await Promise.all([
    supabaseAnon.rpc('get_public_shipment_by_token', { p_token: cleanToken }),
    supabaseAnon.rpc('get_public_shipment_items_by_token', { p_token: cleanToken }),
    supabaseAnon.rpc('get_public_tenant_branding_by_token', { p_token: cleanToken }),
  ]);

  if (shipmentResult.error) {
    console.error('[shipment-tracking] shipment RPC failed:', shipmentResult.error.message);
    return null;
  }

  const shipmentRows = (shipmentResult.data as PublicShipmentRow[] | null) || [];
  if (shipmentRows.length === 0) return null;

  const itemRows = (itemsResult.data as PublicShipmentItemRow[] | null) || [];
  const brandingRows = (brandingResult.data as PublicBrandingRow[] | null) || [];

  // Fire-and-forget engagement counter
  void supabaseAnon.rpc('increment_shipment_tracking_view', { p_token: cleanToken });

  return {
    shipment: transformShipment(shipmentRows[0]),
    items: itemRows.map(transformItem),
    branding: brandingRows[0] ? transformBranding(brandingRows[0]) : {
      tenantId: shipmentRows[0].tenant_id,
      tenantName: '',
      tenantSlug: null,
      primaryColor: null,
      logoUrl: null,
      appName: 'Trackbliss',
      supportEmail: null,
    },
  };
}

/**
 * Fetch live DHL tracking events for a token via the Edge Function.
 * Returns an empty list on any failure (the page degrades to the cached
 * `tracking_last_*` snapshot).
 */
export async function getPublicShipmentTrackingEvents(token: string): Promise<PublicTrackingEvent[]> {
  const cleanToken = token.trim().toLowerCase();
  if (!cleanToken) return [];

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dhl-shipping`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        action: 'get_public_shipment_tracking',
        params: { token: cleanToken },
      }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (data?.error) return [];
    return (data?.events || []) as PublicTrackingEvent[];
  } catch {
    return [];
  }
}

/**
 * Customer reports a non-delivery. Marks the shipment as priority=urgent and
 * appends a timestamped note to internal_notes for the operator to triage.
 */
export async function reportShipmentNotReceived(
  token: string,
  message: string,
): Promise<boolean> {
  const cleanToken = token.trim().toLowerCase();
  if (!cleanToken) return false;

  const { data, error } = await supabaseAnon.rpc('report_shipment_not_received', {
    p_token: cleanToken,
    p_message: message.slice(0, 500),
  });
  if (error) {
    console.error('[shipment-tracking] report failed:', error.message);
    return false;
  }
  return Boolean(data);
}

/**
 * Build the full magic-link URL for an admin to share with a customer.
 * Used by the admin shipment detail page.
 */
export function buildTrackingUrl(token: string, origin?: string): string {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/t/${token}`;
}
