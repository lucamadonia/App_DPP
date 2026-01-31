/**
 * Supabase Activity Log Service
 *
 * Audit trail for tenant actions
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { ActivityLogEntry } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformActivityLogEntry(row: any): ActivityLogEntry {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id || undefined,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id || undefined,
    details: row.details || {},
    createdAt: row.created_at,
  };
}

export async function getActivityLog(options?: {
  limit?: number;
  entityType?: string;
  entityId?: string;
}): Promise<ActivityLogEntry[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let query = supabase
    .from('activity_log')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (options?.entityType) {
    query = query.eq('entity_type', options.entityType);
  }
  if (options?.entityId) {
    query = query.eq('entity_id', options.entityId);
  }
  if (options?.limit) {
    query = query.limit(options.limit);
  } else {
    query = query.limit(100);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to load activity log:', error);
    return [];
  }

  return (data || []).map(transformActivityLogEntry);
}

export async function logActivity(entry: {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return;

  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('activity_log').insert({
    tenant_id: tenantId,
    user_id: user?.id || null,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId || null,
    details: entry.details || {},
  });
}
