/**
 * DHL Carrier Service
 * Client-side wrapper for the dhl-shipping Edge Function
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  DHLSettingsPublic,
  DHLLabelResponse,
  DHLTrackingEvent,
} from '@/types/dhl';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function callDHL(action: string, params?: Record<string, unknown>): Promise<any> {
  const { data, error } = await supabase.functions.invoke('dhl-shipping', {
    body: { action, params },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
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
