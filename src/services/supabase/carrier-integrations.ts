/**
 * Carrier Integrations Hub Service (Phase 1)
 *
 * Static carrier catalog (capabilities, tracking URL patterns, credential
 * fields) merged with per-tenant connection state from
 * `wh_carrier_integrations`.
 *
 * Security: this table holds NO secrets — only account references and
 * display preferences. DHL credentials stay server-side (dhl-shipping
 * Edge Function, see dhl-carrier.ts); DHL status is derived from there
 * and the DHL connection itself is managed on its dedicated page.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Catalog types
// ---------------------------------------------------------------------------

export interface CarrierCapabilities {
  /** Label creation available in Trackbliss */
  labels: boolean;
  /** Tracking links (and for DHL: live tracking events) */
  tracking: boolean;
  /** Return label creation */
  returns: boolean;
  /** Address validation (dry-run) */
  addressValidation: boolean;
}

export interface CarrierCredentialField {
  /** Key inside the settings JSONB (non-secret values only) */
  key: string;
  /** i18n label key (warehouse namespace, English text = key) */
  labelKey: string;
  placeholder?: string;
}

export interface CarrierCatalogEntry {
  carrierId: string;
  name: string;
  /** i18n description key (warehouse namespace) */
  descriptionKey: string;
  capabilities: CarrierCapabilities;
  /** `{tracking}` is replaced with the URL-encoded tracking number */
  trackingUrlPattern: string;
  /** Non-secret account reference fields shown in the connect dialog */
  credentialFields: CarrierCredentialField[];
}

// ---------------------------------------------------------------------------
// Carrier catalog
// ---------------------------------------------------------------------------

export const CARRIER_CATALOG: CarrierCatalogEntry[] = [
  {
    carrierId: 'dhl',
    name: 'DHL',
    descriptionKey: 'Create labels, track parcels and manage returns with DHL Parcel DE.',
    capabilities: { labels: true, tracking: true, returns: true, addressValidation: true },
    trackingUrlPattern:
      'https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode={tracking}',
    // Connection is managed on the dedicated DHL page (credentials are
    // stored server-side via Edge Function) — no fields in the hub dialog.
    credentialFields: [],
  },
  {
    carrierId: 'dhl_express',
    name: 'DHL Express',
    descriptionKey: 'International express shipping. Tracking links available, label creation coming soon.',
    capabilities: { labels: false, tracking: true, returns: false, addressValidation: false },
    trackingUrlPattern: 'https://www.dhl.com/de-de/home/tracking.html?tracking-id={tracking}',
    credentialFields: [
      { key: 'accountNumber', labelKey: 'Account Number', placeholder: '140123456' },
    ],
  },
  {
    carrierId: 'ups',
    name: 'UPS',
    descriptionKey: 'Track UPS parcels via tracking links. Label creation coming soon.',
    capabilities: { labels: false, tracking: true, returns: false, addressValidation: false },
    trackingUrlPattern: 'https://www.ups.com/track?tracknum={tracking}',
    credentialFields: [
      { key: 'accountNumber', labelKey: 'Account Number', placeholder: 'A1B2C3' },
    ],
  },
  {
    carrierId: 'gls',
    name: 'GLS',
    descriptionKey: 'Track GLS parcels via tracking links. Label creation coming soon.',
    capabilities: { labels: false, tracking: true, returns: false, addressValidation: false },
    trackingUrlPattern: 'https://gls-group.eu/DE/de/paketverfolgung?match={tracking}',
    credentialFields: [
      { key: 'customerId', labelKey: 'Customer Number', placeholder: '276xxxxxxx' },
    ],
  },
  {
    carrierId: 'dpd',
    name: 'DPD',
    descriptionKey: 'Track DPD parcels via tracking links. Label creation coming soon.',
    capabilities: { labels: false, tracking: true, returns: false, addressValidation: false },
    trackingUrlPattern: 'https://tracking.dpd.de/status/de_DE/parcel/{tracking}',
    credentialFields: [
      { key: 'delisId', labelKey: 'Customer Number', placeholder: 'Delis-ID' },
    ],
  },
  {
    carrierId: 'hermes',
    name: 'Hermes',
    descriptionKey: 'Track Hermes parcels via tracking links. Label creation coming soon.',
    capabilities: { labels: false, tracking: true, returns: false, addressValidation: false },
    trackingUrlPattern:
      'https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation#{tracking}',
    credentialFields: [
      { key: 'customerId', labelKey: 'Customer Number', placeholder: '5012345678' },
    ],
  },
];

export function getCarrierCatalogEntry(carrierId: string): CarrierCatalogEntry | undefined {
  return CARRIER_CATALOG.find((c) => c.carrierId === carrierId);
}

/** Build a tracking URL from the catalog pattern. */
export function getCarrierTrackingUrl(carrierId: string, trackingNumber: string): string | null {
  const entry = getCarrierCatalogEntry(carrierId);
  if (!entry || !trackingNumber) return null;
  return entry.trackingUrlPattern.replace('{tracking}', encodeURIComponent(trackingNumber));
}

// ---------------------------------------------------------------------------
// Integration state
// ---------------------------------------------------------------------------

export type CarrierIntegrationStatus = 'disconnected' | 'connected' | 'error';

export interface CarrierIntegrationView {
  catalog: CarrierCatalogEntry;
  status: CarrierIntegrationStatus;
  settings: Record<string, unknown>;
  accountHint: string | null;
  connectedAt: string | null;
  /** True when the connection lives outside this table (DHL → Edge Function) */
  managedExternally: boolean;
}

interface WhCarrierIntegrationRow {
  carrier_id: string;
  status: string;
  settings: Record<string, unknown> | null;
  account_hint: string | null;
  connected_at: string | null;
}

function catalogFallback(): CarrierIntegrationView[] {
  return CARRIER_CATALOG.map((catalog) => ({
    catalog,
    status: 'disconnected' as const,
    settings: {},
    accountHint: null,
    connectedAt: null,
    managedExternally: catalog.carrierId === 'dhl',
  }));
}

/**
 * List all catalog carriers merged with the tenant's connection state.
 *
 * Resilient by design: if the `wh_carrier_integrations` table does not
 * exist yet (migration not applied) or any query fails, the full catalog
 * is returned with everything 'disconnected' — the hub page never crashes.
 */
export async function listCarrierIntegrations(): Promise<CarrierIntegrationView[]> {
  const views = catalogFallback();

  // Tenant rows from wh_carrier_integrations (graceful when table missing)
  try {
    const tenantId = await getCurrentTenantId();
    if (tenantId) {
      const { data, error } = await supabase
        .from('wh_carrier_integrations')
        .select('carrier_id, status, settings, account_hint, connected_at')
        .eq('tenant_id', tenantId);
      if (!error && Array.isArray(data)) {
        for (const row of data as WhCarrierIntegrationRow[]) {
          const view = views.find((v) => v.catalog.carrierId === row.carrier_id);
          if (!view || view.managedExternally) continue;
          view.status = (['disconnected', 'connected', 'error'].includes(row.status)
            ? row.status
            : 'disconnected') as CarrierIntegrationStatus;
          view.settings = row.settings || {};
          view.accountHint = row.account_hint;
          view.connectedAt = row.connected_at;
        }
      }
    }
  } catch (err) {
    console.warn('[carrier-integrations] listCarrierIntegrations fallback to catalog:', err);
  }

  // DHL status is derived from the Edge-Function-managed settings
  try {
    const { getDHLSettings } = await import('./dhl-carrier');
    const dhl = await getDHLSettings();
    const view = views.find((v) => v.catalog.carrierId === 'dhl');
    if (view && dhl) {
      view.status = dhl.hasCredentials && dhl.enabled ? 'connected' : 'disconnected';
      view.connectedAt = dhl.connectedAt || null;
      view.accountHint = dhl.billingNumber ? `EKP ${dhl.billingNumber.slice(0, 10)}` : null;
    }
  } catch (err) {
    console.warn('[carrier-integrations] DHL status lookup failed:', err);
  }

  return views;
}

/**
 * Save (connect) a carrier integration. Settings must be non-secret
 * account references only. Marks the carrier as 'connected'.
 */
export async function saveCarrierIntegration(
  carrierId: string,
  settings: Record<string, unknown>,
  accountHint?: string,
): Promise<void> {
  const entry = getCarrierCatalogEntry(carrierId);
  if (!entry) throw new Error(`Unknown carrier: ${carrierId}`);
  if (carrierId === 'dhl') {
    throw new Error('DHL is managed on its dedicated integration page');
  }

  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { error } = await supabase
    .from('wh_carrier_integrations')
    .upsert(
      {
        tenant_id: tenantId,
        carrier_id: carrierId,
        status: 'connected',
        settings,
        account_hint: accountHint || null,
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,carrier_id' },
    );
  if (error) throw error;
}

/** Disconnect a carrier — clears settings and account reference. */
export async function disconnectCarrierIntegration(carrierId: string): Promise<void> {
  if (carrierId === 'dhl') {
    throw new Error('DHL is managed on its dedicated integration page');
  }
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { error } = await supabase
    .from('wh_carrier_integrations')
    .update({
      status: 'disconnected',
      settings: {},
      account_hint: null,
      connected_at: null,
    })
    .eq('tenant_id', tenantId)
    .eq('carrier_id', carrierId);
  if (error) throw error;
}

/**
 * Test a carrier connection.
 * DHL delegates to the real Edge-Function test; for all other carriers
 * (tracking-link-only in Phase 1) a successful save IS the test.
 */
export async function testCarrierConnection(
  carrierId: string,
): Promise<{ success: boolean; error?: string }> {
  if (carrierId === 'dhl') {
    const { testDHLConnection } = await import('./dhl-carrier');
    return await testDHLConnection();
  }
  return { success: true };
}
