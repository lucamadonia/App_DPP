/**
 * DHL Carrier Service
 * Client-side wrapper for the dhl-shipping Edge Function
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function';
import type {
  DHLSettingsPublic,
  DHLLabelResponse,
  DHLTrackingEvent,
  DHLReturnLabelResponse,
} from '@/types/dhl';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callDHL(action: string, params?: Record<string, unknown>): Promise<any> {
  const { data, error } = await invokeEdgeFunction<Record<string, unknown>>('dhl-shipping', { action, params });
  if (error) {
    console.error(`[DHL] ${action} error:`, error.message);
    throw error;
  }
  if (data?.error) {
    if (data.dhlRequest) console.error(`[DHL] Request payload:`, JSON.stringify(data.dhlRequest, null, 2));
    if (data.dhlResponse) console.error(`[DHL] DHL response:`, JSON.stringify(data.dhlResponse, null, 2));
    throw new Error(data.error as string);
  }
  return data;
}

/**
 * Get DHL settings for the current tenant (without credentials).
 * Reads from tenants.settings.warehouse.dhl directly.
 */
export async function getDHLSettings(): Promise<DHLSettingsPublic | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;

  const { data } = await supabase
    .from('tenants')
    .select('settings')
    .eq('id', tenantId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dhl = (data?.settings as any)?.warehouse?.dhl;
  if (!dhl) return null;

  // Strip sensitive credentials
  return {
    enabled: dhl.enabled ?? false,
    sandbox: dhl.sandbox ?? true,
    billingNumber: dhl.billingNumber || '',
    billingNumberInternational: dhl.billingNumberInternational || '',
    defaultProduct: dhl.defaultProduct || 'V01PAK',
    labelFormat: dhl.labelFormat || 'PDF_A4',
    shipper: dhl.shipper || {},
    connectedAt: dhl.connectedAt,
    hasCredentials: !!(dhl.apiKey && dhl.username && dhl.password),
  };
}

/**
 * Save DHL credentials and settings (via Edge Function for security).
 */
export async function saveDHLCredentials(creds: {
  enabled: boolean;
  sandbox: boolean;
  apiKey: string;
  username: string;
  password: string;
  billingNumber: string;
  billingNumberInternational?: string;
  defaultProduct: string;
  labelFormat: string;
  shipper: Record<string, unknown>;
}): Promise<void> {
  await callDHL('save_credentials', creds);
}

/**
 * Test DHL API connection with stored credentials.
 */
export async function testDHLConnection(): Promise<{ success: boolean; error?: string }> {
  return await callDHL('test_connection');
}

/**
 * Create a DHL shipping label for a shipment.
 * Includes billing gate (Warehouse Professional required).
 *
 * @param weightGramsOverride Optional. When set, DHL is billed for this weight
 *   and the shipment's `total_weight_grams` is updated to match. Use to tweak
 *   the weight right before printing (e.g. after weighing the packed box).
 */
export async function createDHLLabel(
  shipmentId: string,
  product?: string,
  weightGramsOverride?: number,
): Promise<DHLLabelResponse> {
  // Client-side billing gate
  const { hasModule } = await import('./billing');
  const hasPro = await hasModule('warehouse_professional') || await hasModule('warehouse_business');
  if (!hasPro) throw new Error('Warehouse Professional or Business module required');

  return await callDHL('create_label', { shipmentId, product, weightGramsOverride });
}

/**
 * Cancel a DHL shipping label.
 */
export async function cancelDHLLabel(shipmentId: string): Promise<void> {
  await callDHL('cancel_label', { shipmentId });
}

/**
 * Get DHL tracking events for a tracking number.
 */
export async function getDHLTracking(trackingNumber: string): Promise<DHLTrackingEvent[]> {
  const data = await callDHL('get_tracking', { trackingNumber });
  return data?.events || [];
}

/**
 * Create a DHL return label for a return.
 * Calls Edge Function which handles DHL API, stores label, updates return record.
 */
export async function createReturnLabel(
  returnId: string,
  senderAddress?: Record<string, unknown>
): Promise<DHLReturnLabelResponse> {
  // Client-side billing gate: requires any Returns Hub module
  const { hasAnyReturnsHubModule } = await import('./billing');
  const hasRH = await hasAnyReturnsHubModule();
  if (!hasRH) throw new Error('Returns Hub module required');

  return await callDHL('create_return_label', { returnId, senderAddress });
}

/**
 * Cancel a DHL return label.
 */
export async function cancelReturnLabel(returnId: string): Promise<void> {
  await callDHL('cancel_return_label', { returnId });
}

/**
 * Get DHL tracking events (authenticated, for admin pages).
 */
export async function getReturnDHLTracking(trackingNumber: string): Promise<DHLTrackingEvent[]> {
  const data = await callDHL('get_tracking', { trackingNumber });
  return data?.events || [];
}

/**
 * Get DHL tracking events publicly (no auth required).
 * Requires both trackingNumber and returnNumber for validation.
 */
export async function getPublicDHLTracking(
  trackingNumber: string,
  returnNumber: string
): Promise<DHLTrackingEvent[]> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dhl-shipping`;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ action: 'get_public_tracking', params: { trackingNumber, returnNumber } }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (data?.error) return [];
    return data?.events || [];
  } catch {
    return [];
  }
}
