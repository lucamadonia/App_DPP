/**
 * Commerce Channels Service
 *
 * CRUD for sales-channel connections + sync events.
 * Credentials live encrypted in tenants.settings.commerceHubCredentials,
 * never in commerce_channel_connections rows.
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  CommerceChannelConnection,
  CommerceConnectionStatus,
  CommercePlatform,
  CommerceSyncEvent,
  CommerceSyncEventType,
  CommerceSyncSeverity,
} from '@/types/commerce-channels';

// ============================================
// TRANSFORMS (snake_case → camelCase)
// ============================================

function transformConnection(row: Record<string, unknown>): CommerceChannelConnection {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    platform: row.platform as CommercePlatform,
    status: row.status as CommerceConnectionStatus,
    accountLabel: row.account_label as string,
    accountUrl: (row.account_url as string) || undefined,
    accountExternalId: (row.account_external_id as string) || undefined,
    accountCurrency: (row.account_currency as string) || 'EUR',
    accountCountry: (row.account_country as string) || undefined,
    iconColor: (row.icon_color as string) || undefined,
    canReadOrders: row.can_read_orders as boolean,
    canReadProducts: row.can_read_products as boolean,
    canWriteInventory: row.can_write_inventory as boolean,
    canWriteFulfillment: row.can_write_fulfillment as boolean,
    credentialRef: (row.credential_ref as string) || undefined,
    scopes: (row.scopes as string[]) || [],
    webhookSubscriptionIds: (row.webhook_subscription_ids as string[]) || [],
    lastFullSyncAt: (row.last_full_sync_at as string) || undefined,
    lastIncrementalSyncAt: (row.last_incremental_sync_at as string) || undefined,
    lastErrorMessage: (row.last_error_message as string) || undefined,
    lastErrorAt: (row.last_error_at as string) || undefined,
    nextSyncAfter: (row.next_sync_after as string) || undefined,
    syncCursor: (row.sync_cursor as string) || undefined,
    autoSyncEnabled: row.auto_sync_enabled as boolean,
    syncIntervalMinutes: (row.sync_interval_minutes as number) || 15,
    autoMatchByGtin: row.auto_match_by_gtin as boolean,
    autoMatchBySku: row.auto_match_by_sku as boolean,
    autoMatchThreshold: (row.auto_match_threshold as number) || 0.85,
    metadata: (row.metadata as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformSyncEvent(row: Record<string, unknown>): CommerceSyncEvent {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    connectionId: (row.connection_id as string) || undefined,
    platform: row.platform as CommercePlatform,
    eventType: row.event_type as CommerceSyncEventType,
    severity: row.severity as CommerceSyncSeverity,
    title: row.title as string,
    description: (row.description as string) || undefined,
    durationMs: (row.duration_ms as number) || undefined,
    itemsProcessed: (row.items_processed as number) || 0,
    itemsCreated: (row.items_created as number) || 0,
    itemsUpdated: (row.items_updated as number) || 0,
    itemsFailed: (row.items_failed as number) || 0,
    payload: (row.payload as Record<string, unknown>) || {},
    createdAt: row.created_at as string,
  };
}

// ============================================
// CONNECTIONS — CRUD
// ============================================

export async function listConnections(): Promise<CommerceChannelConnection[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('commerce_channel_connections')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load commerce connections:', error);
    return [];
  }
  return (data || []).map(transformConnection);
}

export async function getConnection(id: string): Promise<CommerceChannelConnection | null> {
  const { data, error } = await supabase
    .from('commerce_channel_connections')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return transformConnection(data);
}

export interface CreateConnectionInput {
  platform: CommercePlatform;
  accountLabel: string;
  accountUrl?: string;
  accountExternalId?: string;
  accountCurrency?: string;
  accountCountry?: string;
  iconColor?: string;
  scopes?: string[];
  status?: CommerceConnectionStatus;
  autoSyncEnabled?: boolean;
  syncIntervalMinutes?: number;
}

export async function createConnection(input: CreateConnectionInput): Promise<CommerceChannelConnection> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  // Quota check via dynamic import to avoid circular dependency
  const billing = await import('./billing');
  const entitlements = await billing.getTenantEntitlements();
  const limits = entitlements.limits as unknown as { maxCommerceConnections?: number };
  const limit = limits.maxCommerceConnections ?? 0;
  const { count: currentCount = 0 } = await supabase
    .from('commerce_channel_connections')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if ((currentCount ?? 0) >= limit) {
    throw new Error(
      `Commerce Hub connection limit reached (${currentCount}/${limit}). Upgrade your plan to add more channels.`,
    );
  }

  const { data, error } = await supabase
    .from('commerce_channel_connections')
    .insert({
      tenant_id: tenantId,
      platform: input.platform,
      status: input.status ?? 'pending',
      account_label: input.accountLabel,
      account_url: input.accountUrl ?? null,
      account_external_id: input.accountExternalId ?? null,
      account_currency: input.accountCurrency ?? 'EUR',
      account_country: input.accountCountry ?? null,
      icon_color: input.iconColor ?? null,
      scopes: input.scopes ?? [],
      auto_sync_enabled: input.autoSyncEnabled ?? true,
      sync_interval_minutes: input.syncIntervalMinutes ?? 15,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Failed to create connection: ${error.message}`);

  await logSyncEvent({
    connectionId: data.id,
    platform: input.platform,
    eventType: 'connection_created',
    severity: 'success',
    title: `Connected ${input.platform} — ${input.accountLabel}`,
  });

  return transformConnection(data);
}

export async function updateConnection(
  id: string,
  updates: Partial<CreateConnectionInput & { status: CommerceConnectionStatus }>,
): Promise<CommerceChannelConnection> {
  const update: Record<string, unknown> = {};
  if (updates.status !== undefined) update.status = updates.status;
  if (updates.accountLabel !== undefined) update.account_label = updates.accountLabel;
  if (updates.accountUrl !== undefined) update.account_url = updates.accountUrl;
  if (updates.accountCurrency !== undefined) update.account_currency = updates.accountCurrency;
  if (updates.accountCountry !== undefined) update.account_country = updates.accountCountry;
  if (updates.scopes !== undefined) update.scopes = updates.scopes;
  if (updates.autoSyncEnabled !== undefined) update.auto_sync_enabled = updates.autoSyncEnabled;
  if (updates.syncIntervalMinutes !== undefined) update.sync_interval_minutes = updates.syncIntervalMinutes;

  const { data, error } = await supabase
    .from('commerce_channel_connections')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(`Failed to update connection: ${error.message}`);
  return transformConnection(data);
}

export async function disconnectConnection(id: string): Promise<void> {
  const conn = await getConnection(id);
  await supabase
    .from('commerce_channel_connections')
    .update({ status: 'disconnected', auto_sync_enabled: false })
    .eq('id', id);

  if (conn) {
    await logSyncEvent({
      connectionId: id,
      platform: conn.platform,
      eventType: 'connection_disconnected',
      severity: 'warning',
      title: `${conn.platform} disconnected`,
    });
  }
}

export async function deleteConnection(id: string): Promise<void> {
  const { error } = await supabase
    .from('commerce_channel_connections')
    .delete()
    .eq('id', id);
  if (error) throw new Error(`Failed to delete connection: ${error.message}`);
}

// ============================================
// SYNC EVENTS
// ============================================

export interface LogSyncEventInput {
  connectionId?: string;
  platform: CommercePlatform;
  eventType: CommerceSyncEventType;
  severity?: CommerceSyncSeverity;
  title: string;
  description?: string;
  durationMs?: number;
  itemsProcessed?: number;
  itemsCreated?: number;
  itemsUpdated?: number;
  itemsFailed?: number;
  payload?: Record<string, unknown>;
}

export async function logSyncEvent(input: LogSyncEventInput): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return;

  await supabase.from('commerce_sync_events').insert({
    tenant_id: tenantId,
    connection_id: input.connectionId ?? null,
    platform: input.platform,
    event_type: input.eventType,
    severity: input.severity ?? 'info',
    title: input.title,
    description: input.description ?? null,
    duration_ms: input.durationMs ?? null,
    items_processed: input.itemsProcessed ?? 0,
    items_created: input.itemsCreated ?? 0,
    items_updated: input.itemsUpdated ?? 0,
    items_failed: input.itemsFailed ?? 0,
    payload: input.payload ?? {},
  });
}

export async function listRecentSyncEvents(limit = 50): Promise<CommerceSyncEvent[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('commerce_sync_events')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to load sync events:', error);
    return [];
  }
  return (data || []).map(transformSyncEvent);
}

// ============================================
// HEALTH SUMMARY
// ============================================

export interface CommerceHealthSummary {
  totalConnections: number;
  connected: number;
  errors: number;
  awaitingReauth: number;
  lastSyncAt?: string;
}

export async function getHealthSummary(): Promise<CommerceHealthSummary> {
  const connections = await listConnections();
  const errors = connections.filter((c) => c.status === 'error').length;
  const connected = connections.filter((c) => c.status === 'connected').length;
  const awaitingReauth = connections.filter((c) => c.status === 'reauth_required').length;
  const lastSyncAt = connections
    .map((c) => c.lastIncrementalSyncAt || c.lastFullSyncAt)
    .filter((s): s is string => Boolean(s))
    .sort()
    .at(-1);

  return {
    totalConnections: connections.length,
    connected,
    errors,
    awaitingReauth,
    lastSyncAt,
  };
}
