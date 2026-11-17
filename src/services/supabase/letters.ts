/**
 * Letter mail service — standalone franked letters (Deutsche Post
 * INTERNETMARKE) that are not tied to a warehouse shipment, e.g. invoices.
 * Purchases and refunds go through the dhl-shipping Edge Function; history is
 * read from wh_letters (RLS: own tenant, read-only).
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function';
import type { CreateLetterResult, LetterRecipient, WhLetter } from '@/types/dhl';

const STAMP_URL_TTL_SECONDS = 60 * 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformLetter(row: any): WhLetter {
  return {
    id: row.id,
    reference: row.reference || undefined,
    recipientName: row.recipient_name,
    recipientAdditionalName: row.recipient_additional_name || undefined,
    recipientStreet: row.recipient_street,
    recipientPostalCode: row.recipient_postal_code,
    recipientCity: row.recipient_city,
    recipientCountry: row.recipient_country,
    productName: row.product_name,
    priceCents: row.price_cents,
    currency: row.currency || 'EUR',
    trackId: row.track_id || undefined,
    stampStoragePath: row.stamp_storage_path,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function callLetterAction<T>(action: string, params: Record<string, unknown>): Promise<T> {
  const { data, error } = await invokeEdgeFunction<Record<string, unknown>>('dhl-shipping', { action, params });
  if (error) throw error;
  if (data?.error) throw new Error(String(data.error));
  return data as T;
}

export async function getLetters(limit = 50): Promise<WhLetter[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];
  const { data, error } = await supabase
    // wh_letters is newer than the generated Database types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from('wh_letters' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(transformLetter);
}

/** Buys a letter stamp. Charges the connected Portokasse immediately. */
export async function createLetter(input: {
  recipient: LetterRecipient;
  productCode: string;
  reference?: string;
}): Promise<CreateLetterResult> {
  const { hasModule } = await import('./billing');
  const hasPro = await hasModule('warehouse_professional') || await hasModule('warehouse_business');
  if (!hasPro) throw new Error('Warehouse Professional or Business module required');
  return await callLetterAction<CreateLetterResult>('create_standalone_letter', input);
}

export async function refundLetter(letterId: string): Promise<void> {
  await callLetterAction('refund_standalone_letter', { letterId });
}

/** Downloads the stored stamp PDF of a letter. */
export async function downloadLetterStamp(storagePath: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, STAMP_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) throw error || new Error('Could not load the stamp PDF');
  return await fetchPdfBytes(data.signedUrl);
}

export async function fetchPdfBytes(url: string): Promise<Uint8Array> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Could not load the stamp PDF (${resp.status})`);
  return new Uint8Array(await resp.arrayBuffer());
}
