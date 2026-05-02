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

  // No FK between activity_log.user_id and profiles.id, so we can't use
  // PostgREST's embedded select. Fetch the rows and join client-side.
  let query = supabase
    .from('activity_log')
    .select('*', { count: 'exact' })
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

  // Resolve profile info separately
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = [...new Set((data || []).map((r: any) => r.user_id).filter(Boolean))];
  const profileMap = new Map<string, { email?: string; name?: string }>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, name')
      .in('id', userIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (profiles || []) as any[]) {
      profileMap.set(p.id, { email: p.email, name: p.name });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let results = (data || []).map((row: any) => {
    const prof = row.user_id ? profileMap.get(row.user_id) : undefined;
    return {
      ...transformActivityLogEntry(row),
      actorEmail: prof?.email,
      actorName: prof?.name,
    };
  }) as ActivityLogEntry[];

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
    .select('action, entity_type, user_id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1000);

  const distinctActionsSet = new Set<string>();
  const distinctEntityTypesSet = new Set<string>();
  const distinctUserIds = new Set<string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of (sample || []) as any[]) {
    if (row.action) distinctActionsSet.add(row.action);
    if (row.entity_type) distinctEntityTypesSet.add(row.entity_type);
    if (row.user_id) distinctUserIds.add(row.user_id);
  }

  // Resolve emails for the distinct user list
  const distinctUsersMap = new Map<string, string | undefined>();
  if (distinctUserIds.size > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .in('id', [...distinctUserIds]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const p of (profiles || []) as any[]) {
      distinctUsersMap.set(p.id, p.email);
    }
    for (const id of distinctUserIds) {
      if (!distinctUsersMap.has(id)) distinctUsersMap.set(id, undefined);
    }
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
