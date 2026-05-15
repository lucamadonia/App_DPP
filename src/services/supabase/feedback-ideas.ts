/**
 * Admin-side CRUD for partner idea-board.
 */
import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  FeedbackIdea,
  FeedbackIdeaFilter,
  FeedbackIdeaInvite,
  FeedbackIdeaStatus,
  FeedbackIdeaRoadmapStatus,
} from '@/types/feedback';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformIdea(row: any): FeedbackIdea {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    inviteId: row.invite_id || undefined,
    submitterEmail: row.submitter_email,
    submitterName: row.submitter_name,
    submitterDisplayName: row.submitter_display_name,
    area: row.area,
    category: row.category,
    title: row.title,
    body: row.body,
    rating: row.rating || undefined,
    isPublicRequested: !!row.is_public_requested,
    status: row.status,
    roadmapStatus: row.roadmap_status || undefined,
    adminResponse: row.admin_response || undefined,
    moderationNotes: row.moderation_notes || undefined,
    upvoteCount: row.upvote_count || 0,
    tags: row.tags || undefined,
    approvedAt: row.approved_at || undefined,
    approvedBy: row.approved_by || undefined,
    completedAt: row.completed_at || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformInvite(row: any): FeedbackIdeaInvite {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    partnerEmail: row.partner_email,
    partnerName: row.partner_name,
    token: row.token,
    shipmentId: row.shipment_id || undefined,
    status: row.status,
    sentAt: row.sent_at || undefined,
    openedAt: row.opened_at || undefined,
    lastUsedAt: row.last_used_at || undefined,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    createdBy: row.created_by || undefined,
  };
}

// ============================================
// IDEAS — Admin moderation
// ============================================

export async function getIdeas(filter?: FeedbackIdeaFilter): Promise<FeedbackIdea[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  let q = supabase
    .from('feedback_ideas')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (filter?.status) {
    if (Array.isArray(filter.status)) q = q.in('status', filter.status);
    else q = q.eq('status', filter.status);
  }
  if (filter?.area) q = q.eq('area', filter.area);
  if (filter?.category) q = q.eq('category', filter.category);
  if (filter?.search) q = q.or(`title.ilike.%${filter.search}%,body.ilike.%${filter.search}%`);
  if (filter?.limit) q = q.limit(filter.limit);

  const { data, error } = await q;
  if (error || !data) return [];
  return data.map(transformIdea);
}

export async function publishIdea(id: string, edits?: Partial<FeedbackIdea>): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');
  const { data: user } = await supabase.auth.getUser();

  const patch: Record<string, unknown> = {
    status: 'published',
    approved_at: new Date().toISOString(),
    approved_by: user.user?.id,
  };
  if (edits?.title !== undefined) patch.title = edits.title;
  if (edits?.body !== undefined) patch.body = edits.body;
  if (edits?.area !== undefined) patch.area = edits.area;
  if (edits?.category !== undefined) patch.category = edits.category;
  if (edits?.tags !== undefined) patch.tags = edits.tags;
  if (edits?.adminResponse !== undefined) patch.admin_response = edits.adminResponse;
  if (edits?.roadmapStatus !== undefined) patch.roadmap_status = edits.roadmapStatus;

  const { error } = await supabase
    .from('feedback_ideas')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
}

export async function setIdeaStatus(
  id: string,
  status: FeedbackIdeaStatus,
  roadmapStatus?: FeedbackIdeaRoadmapStatus,
): Promise<void> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const patch: Record<string, unknown> = { status };
  if (roadmapStatus !== undefined) patch.roadmap_status = roadmapStatus;
  if (status === 'done') patch.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from('feedback_ideas')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId);
  if (error) throw new Error(error.message);
}

export async function rejectIdea(id: string, reason?: string): Promise<void> {
  await supabase
    .from('feedback_ideas')
    .update({
      status: 'rejected',
      moderation_notes: reason || null,
    })
    .eq('id', id);
}

export async function setIdeaAdminResponse(id: string, response: string): Promise<void> {
  await supabase.from('feedback_ideas').update({ admin_response: response }).eq('id', id);
}

// ============================================
// INVITES — Send partner an idea-submission link
// ============================================

export async function getIdeaInvites(): Promise<FeedbackIdeaInvite[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('feedback_idea_invites')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(transformInvite);
}

export async function createIdeaInvite(params: {
  partnerEmail: string;
  partnerName: string;
  shipmentId?: string;
}): Promise<{ invite: FeedbackIdeaInvite; inviteUrl: string }> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) throw new Error('No tenant');

  const { hasModule } = await import('./billing');
  if (!(await hasModule('feedback_professional')) && !(await hasModule('feedback_business'))) {
    throw new Error('Idea board requires Feedback Professional or higher');
  }

  const { data: tokenData, error: tokenErr } = await supabase.rpc('generate_tracking_token');
  if (tokenErr || !tokenData) throw new Error(`Token generation failed: ${tokenErr?.message}`);
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('feedback_idea_invites')
    .insert({
      tenant_id: tenantId,
      partner_email: params.partnerEmail,
      partner_name: params.partnerName,
      shipment_id: params.shipmentId || null,
      token: tokenData as string,
      status: 'pending',
      sent_at: new Date().toISOString(),
      created_by: user.user?.id,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Insert failed');

  const invite = transformInvite(data);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteUrl = `${origin}/ideas/submit/${invite.token}`;

  // Fire email (best-effort)
  try {
    const mod = await import('./rh-notification-trigger');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trigger = (mod as any).triggerPublicEmailNotification;
    if (typeof trigger === 'function') {
      await trigger(tenantId, 'feedback_idea_invite', {
        customerName: params.partnerName,
        customerEmail: params.partnerEmail,
        feedbackUrl: inviteUrl,
      });
    }
  } catch (e) {
    console.warn('Idea invite email failed (non-fatal):', e);
  }

  return { invite, inviteUrl };
}

export async function cancelIdeaInvite(id: string): Promise<void> {
  await supabase.from('feedback_idea_invites').update({ status: 'cancelled' }).eq('id', id);
}

export interface IdeaStats {
  pending: number;
  published: number;
  inProgress: number;
  done: number;
  rejected: number;
  total: number;
}

export async function getIdeaStats(): Promise<IdeaStats> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) {
    return { pending: 0, published: 0, inProgress: 0, done: 0, rejected: 0, total: 0 };
  }
  const { data } = await supabase
    .from('feedback_ideas')
    .select('status')
    .eq('tenant_id', tenantId);
  const rows: Array<{ status: string }> = data || [];
  const stats = { pending: 0, published: 0, inProgress: 0, done: 0, rejected: 0, total: rows.length };
  for (const r of rows) {
    if (r.status === 'pending_review') stats.pending++;
    else if (r.status === 'published') stats.published++;
    else if (r.status === 'in_progress') stats.inProgress++;
    else if (r.status === 'done') stats.done++;
    else if (r.status === 'rejected') stats.rejected++;
  }
  return stats;
}
