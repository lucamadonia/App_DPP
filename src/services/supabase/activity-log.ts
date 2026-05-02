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

export interface ActivityLogFilter {
  search?: string;
  action?: string;
  entityType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface PaginatedActivityLog {
  data: ActivityLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  distinctActions: string[];
  distinctEntityTypes: string[];
  distinctUsers: { userId: string; email?: string }[];
}

/**
 * Paginated, filtered activity log for the audit viewer.
 *
 * Joins to profiles via user_id so the UI can show "who" without
 * a second round-trip. Distinct values for filter dropdowns are
 * computed from the most recent 1000 entries — covers practical use.
 */
export async function getActivityLogPaginated(filter?: ActivityLogFilter): Promise<PaginatedActivityLog> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { data: [], total: 0, page: 1, pageSize: 50, distinctActions: [], distinctEntityTypes: [], distinctUsers: [] };
  }

  const page = filter?.page || 1;
  const pageSize = filter?.pageSize || 50;

  let query = supabase
    .from('activity_log')
    .select('*, profiles(email, full_name)', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (filter?.action) query = query.eq('action', filter.action);
  if (filter?.entityType) query = query.eq('entity_type', filter.entityType);
  if (filter?.userId) query = query.eq('user_id', filter.userId);
  if (filter?.dateFrom) query = query.gte('created_at', filter.dateFrom);
  if (filter?.dateTo) query = query.lte('created_at', filter.dateTo);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('Failed to load activity log:', error);
    return { data: [], total: 0, page, pageSize, distinctActions: [], distinctEntityTypes: [], distinctUsers: [] };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results = (data || []).map((row: any) => ({
    ...transformActivityLogEntry(row),
    actorEmail: row.profiles?.email || undefined,
    actorName: row.profiles?.full_name || undefined,
  })) as ActivityLogEntry[];

  if (filter?.search) {
    const q = filter.search.toLowerCase();
    results = results.filter(e =>
      e.action.toLowerCase().includes(q) ||
      e.entityType.toLowerCase().includes(q) ||
      JSON.stringify(e.details).toLowerCase().includes(q),
    );
  }

  // Distinct values — sample wider window so dropdowns aren't empty after filtering
  const { data: sample } = await supabase
    .from('activity_log')
    .select('action, entity_type, user_id, profiles(email)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1000);

  const distinctActionsSet = new Set<string>();
  const distinctEntityTypesSet = new Set<string>();
  const distinctUsersMap = new Map<string, string | undefined>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (sample || []) as any[]) {
    if (row.action) distinctActionsSet.add(row.action);
    if (row.entity_type) distinctEntityTypesSet.add(row.entity_type);
    if (row.user_id) distinctUsersMap.set(row.user_id, row.profiles?.email);
  }

  return {
    data: results,
    total: count || 0,
    page,
    pageSize,
    distinctActions: [...distinctActionsSet].sort(),
    distinctEntityTypes: [...distinctEntityTypesSet].sort(),
    distinctUsers: [...distinctUsersMap.entries()].map(([userId, email]) => ({ userId, email })),
  };
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
