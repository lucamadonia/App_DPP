/**
 * Supabase Return Timeline Service
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type { RhReturnTimeline } from '@/types/returns-hub';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTimelineEntry(row: any): RhReturnTimeline {
  return {
    id: row.id,
    returnId: row.return_id,
    tenantId: row.tenant_id,
    status: row.status,
    comment: row.comment || undefined,
    actorId: row.actor_id || undefined,
    actorType: row.actor_type || 'system',
    metadata: row.metadata || {},
    createdAt: row.created_at,
  };
}

export async function getReturnTimeline(returnId: string): Promise<RhReturnTimeline[]> {
  const { data, error } = await supabase
    .from('rh_return_timeline')
    .select('*')
    .eq('return_id', returnId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load return timeline:', error);
    return [];
  }

  return (data || []).map((row: any) => transformTimelineEntry(row));
}

export async function addTimelineEntry(
  entry: Omit<RhReturnTimeline, 'id' | 'tenantId' | 'createdAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data, error } = await supabase
    .from('rh_return_timeline')
    .insert({
      return_id: entry.returnId,
      tenant_id: tenantId,
      status: entry.status,
      comment: entry.comment || null,
      actor_id: entry.actorId || null,
      actor_type: entry.actorType || 'system',
      metadata: entry.metadata || {},
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to add timeline entry:', error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data.id };
}
