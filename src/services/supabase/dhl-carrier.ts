/**
 * DHL Carrier Service
 * Client-side wrapper for the dhl-shipping Edge Function
 */

import { supabase, getCurrentTenantId, supabaseAnon } from '@/lib/supabase';
import type {
  DHLSettingsPublic,
  DHLLabelResponse,
  DHLTrackingEvent,
  DHLReturnLabelResponse,
} from '@/types/dhl';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callDHL(action: string, params?: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('dhl-shipping', {
    body: { action, params },
  });
  if (error) {
    // Extract real error from response context (FunctionsHttpError)
    let detail = error.message;
    if (typeof data === 'object' && data?.error) {
      detail = data.error;
    } else if ('context' in error) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ctx = (error as any).context;
        if (ctx?.status === 401) {
          detail = 'DHL service not available — the edge function may not be deployed. Contact support.';
        } else if (ctx?.json) {
          const body = await ctx.json();
          detail = body?.error || body?.message || JSON.stringify(body);
        } else if (ctx?.text) {
          detail = await ctx.text();
        }
      } catch {
        // fallback to original message
      }
    }
    // Detect 401 from error message as fallback
    if (detail.includes('401') || detail.includes('Unauthorized')) {
      detail = 'DHL service not available — the edge function may not be deployed. Contact support.';
    }
    console.error(`[DHL] ${action} error:`, detail, { data, error });
    throw new Error(detail);
  }
  if (data?.error) {
    if (data.dhlRequest) console.error(`[DHL] Request payload:`, JSON.stringify(data.dhlRequest, null, 2));
    if (data.dhlResponse) console.error(`[DHL] DHL response:`, JSON.stringify(data.dhlResponse, null, 2));
    throw new Error(data.error);
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
 */
export async function createDHLLabel(shipmentId: string, product?: string): Promise<DHLLabelResponse> {
  // Client-side billing gate
  const { hasModule } = await import('./billing');
  const hasPro = await hasModule('warehouse_professional') || await hasModule('warehouse_business');
  if (!hasPro) throw new Error('Warehouse Professional or Business module required');

  return await callDHL('create_label', { shipmentId, product });
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
  const { data, error } = await supabaseAnon.functions.invoke('dhl-shipping', {
    body: { action: 'get_public_tracking', params: { trackingNumber, returnNumber } },
  });
  if (error) {
    console.warn('Public DHL tracking error:', error.message);
    return [];
  }
  if (data?.error) {
    console.warn('Public DHL tracking:', data.error);
    return [];
  }
  return data?.events || [];
}
