/**
 * Supabase Invitations Service
 *
 * CRUD for tenant user invitations
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edge-function';
import type { Invitation } from '@/types/database';

type WriteResult = { success: boolean; error?: string };
type InviteResult = WriteResult & {
  emailSent?: boolean;
  userAlreadyExists?: boolean;
  /** Interpolation values for `error` when it is a translation key (settings ns). */
  errorParams?: Record<string, number | string>;
};

export const SEAT_LIMIT_ERROR = 'User limit reached ({{current}}/{{limit}}). Upgrade your plan to invite more users.';
export const INVITE_RATE_LIMIT_ERROR = 'Too many invitations. Please try again later.';

/** Map structured invite-user errors (403 seat_limit, 429 rate_limited). */
function mapInviteError(fnError: Error): InviteResult | null {
  const body = (fnError as Error & { body?: unknown }).body as
    | { error?: string; current?: number; limit?: number }
    | null
    | undefined;
  const code = body?.error ?? fnError.message;
  if (code === 'seat_limit') {
    return {
      success: false,
      error: SEAT_LIMIT_ERROR,
      errorParams: { current: body?.current ?? 0, limit: body?.limit ?? 0 },
    };
  }
  if (code === 'rate_limited') {
    return { success: false, error: INVITE_RATE_LIMIT_ERROR };
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformInvitation(row: any): Invitation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    email: row.email,
    role: row.role || 'viewer',
    name: row.name || undefined,
    message: row.message || undefined,
    status: row.status || 'pending',
    invitedBy: row.invited_by || undefined,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export async function getInvitations(): Promise<Invitation[]> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return [];

  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load invitations:', error);
    return [];
  }

  return (data || []).map(transformInvitation);
}

export async function createInvitation(invitation: {
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  name?: string;
  message?: string;
}): Promise<InviteResult> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return { success: false, error: 'No tenant set' };

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase.from('invitations').insert({
    tenant_id: tenantId,
    email: invitation.email,
    role: invitation.role,
    name: invitation.name || null,
    message: invitation.message || null,
    invited_by: user?.id || null,
    status: 'pending',
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'An invitation for this email already exists.' };
    }
    return { success: false, error: error.message };
  }

  // Call Edge Function to create auth user + send invitation email
  const { data: fnData, error: fnError } = await invokeEdgeFunction<{ emailSent?: boolean; userAlreadyExists?: boolean }>(
    'invite-user',
    {
      email: invitation.email,
      role: invitation.role,
      name: invitation.name || undefined,
    },
  );

  if (fnError) {
    const mapped = mapInviteError(fnError);
    if (mapped) {
      // The server refused the invitation (seat limit / rate limit): withdraw
      // the row we just inserted so it does not linger as "pending".
      if (mapped.error === SEAT_LIMIT_ERROR) {
        await supabase
          .from('invitations')
          .update({ status: 'cancelled' })
          .eq('tenant_id', tenantId)
          .eq('email', invitation.email)
          .eq('status', 'pending');
      }
      return mapped;
    }
    // Invitation record exists but email failed — still return success with warning
    console.error('invite-user edge function error:', fnError);
    return { success: true, emailSent: false, userAlreadyExists: false };
  }

  return {
    success: true,
    emailSent: fnData?.emailSent ?? false,
    userAlreadyExists: fnData?.userAlreadyExists ?? false,
  };
}

export async function cancelInvitation(id: string): Promise<WriteResult> {
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function resendInvitation(id: string): Promise<InviteResult> {
  // Load invitation data for the edge function call
  const { data: inv, error: loadError } = await supabase
    .from('invitations')
    .select('email, role, name')
    .eq('id', id)
    .single();

  if (loadError || !inv) {
    return { success: false, error: loadError?.message || 'Invitation not found' };
  }

  const { error } = await supabase
    .from('invitations')
    .update({
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  // Re-send via Edge Function
  const { data: fnData, error: fnError } = await invokeEdgeFunction<{ emailSent?: boolean; userAlreadyExists?: boolean }>(
    'invite-user',
    {
      email: inv.email,
      role: inv.role,
      name: inv.name || undefined,
    },
  );

  if (fnError) {
    const mapped = mapInviteError(fnError);
    if (mapped) return mapped;
    console.error('invite-user edge function error (resend):', fnError);
    return { success: true, emailSent: false, userAlreadyExists: false };
  }

  return {
    success: true,
    emailSent: fnData?.emailSent ?? false,
    userAlreadyExists: fnData?.userAlreadyExists ?? false,
  };
}

export async function deleteInvitation(id: string): Promise<WriteResult> {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ---------------------------------------------------------------------------
// Accept flow for people who already have an account (SEC-07).
// Backed by the SECURITY DEFINER RPCs from migration 20261001h. The server is
// the only authority: it checks the caller's confirmed email against the
// invitation, the role allowlist and what leaving the current tenant means.
// ---------------------------------------------------------------------------

export type InvitationRole = 'admin' | 'editor' | 'viewer';

/** What accepting an invitation does to the caller's current tenant membership. */
export type LeaveOutcome =
  | 'leave'                // member or one of several admins: just leaves
  | 'delete_empty_tenant'  // sole member of a tenant without data: tenant is removed
  | 'confirm_required'     // sole admin of a tenant with data: typed confirmation needed
  | 'promote_admin_first'  // sole admin, other members remain: blocked
  | 'active_subscription'; // sole admin with a paid plan/module: blocked

export interface LeaveAssessment {
  currentTenantId: string;
  currentTenantName: string;
  currentRole: InvitationRole;
  isSoleAdmin: boolean;
  otherMembers: number;
  paidSubscription: boolean;
  /** Tables of the current tenant that contain records (for the consequence list). */
  dataTables: string[];
  outcome: LeaveOutcome;
}

export interface MyPendingInvitation {
  id: string;
  tenantId: string;
  tenantName: string;
  role: InvitationRole;
  invitedByName: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface MyPendingInvitations {
  invitations: MyPendingInvitation[];
  leave: LeaveAssessment | null;
}

export type AcceptInvitationError =
  | 'not_found'
  | 'email_not_confirmed'
  | 'not_pending'
  | 'expired'
  | 'no_profile'
  | 'promote_admin_first'
  | 'active_subscription'
  | 'seat_limit' // joining tenant has no free seat on its plan
  | 'unknown';

export type AcceptInvitationResult =
  | { status: 'accepted'; tenantId: string; tenantName: string; role: InvitationRole; leftTenantDeleted: boolean }
  | { status: 'already_member'; tenantId: string; tenantName: string }
  | { status: 'confirmation_required'; leave: LeaveAssessment | null }
  | { status: 'error'; error: AcceptInvitationError; leave?: LeaveAssessment | null };

const ROLES: readonly InvitationRole[] = ['admin', 'editor', 'viewer'];
const LEAVE_OUTCOMES: readonly LeaveOutcome[] = [
  'leave', 'delete_empty_tenant', 'confirm_required', 'promote_admin_first', 'active_subscription',
];
const ACCEPT_ERRORS: readonly AcceptInvitationError[] = [
  'not_found', 'email_not_confirmed', 'not_pending', 'expired', 'no_profile', 'promote_admin_first', 'active_subscription', 'seat_limit',
];

function asRole(value: unknown): InvitationRole {
  return ROLES.includes(value as InvitationRole) ? (value as InvitationRole) : 'viewer';
}

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function transformLeaveAssessment(raw: unknown): LeaveAssessment | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (r.has_profile !== true) return null;
  const outcome = LEAVE_OUTCOMES.includes(r.outcome as LeaveOutcome) ? (r.outcome as LeaveOutcome) : 'confirm_required';
  return {
    currentTenantId: str(r.tenant_id),
    currentTenantName: str(r.tenant_name),
    currentRole: asRole(r.role),
    isSoleAdmin: r.is_sole_admin === true,
    otherMembers: typeof r.other_members === 'number' ? r.other_members : 0,
    paidSubscription: r.paid_subscription === true,
    dataTables: Array.isArray(r.data_tables) ? r.data_tables.filter((t): t is string => typeof t === 'string') : [],
    outcome,
  };
}

export function transformMyPendingInvitations(raw: unknown): MyPendingInvitations {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(r.invitations) ? r.invitations : [];
  return {
    invitations: list
      .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object' && typeof (i as Record<string, unknown>).id === 'string')
      .map((i) => ({
        id: str(i.id),
        tenantId: str(i.tenant_id),
        tenantName: str(i.tenant_name),
        role: asRole(i.role),
        invitedByName: typeof i.invited_by_name === 'string' && i.invited_by_name ? i.invited_by_name : null,
        createdAt: str(i.created_at),
        expiresAt: typeof i.expires_at === 'string' ? i.expires_at : null,
      })),
    leave: transformLeaveAssessment(r.leave),
  };
}

export function transformAcceptResult(raw: unknown): AcceptInvitationResult {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  switch (r.status) {
    case 'accepted':
      return {
        status: 'accepted',
        tenantId: str(r.tenant_id),
        tenantName: str(r.tenant_name),
        role: asRole(r.role),
        leftTenantDeleted: r.left_tenant_deleted === true,
      };
    case 'already_member':
      return { status: 'already_member', tenantId: str(r.tenant_id), tenantName: str(r.tenant_name) };
    case 'confirmation_required':
      return { status: 'confirmation_required', leave: transformLeaveAssessment(r.leave) };
    default: {
      const error = ACCEPT_ERRORS.includes(r.error as AcceptInvitationError)
        ? (r.error as AcceptInvitationError)
        : 'unknown';
      return { status: 'error', error, leave: transformLeaveAssessment(r.leave) };
    }
  }
}

/** Pending invitations addressed to the signed-in user's confirmed email. */
export async function listMyPendingInvitations(): Promise<MyPendingInvitations> {
  const { data, error } = await supabase.rpc('list_my_pending_invitations');
  if (error) {
    console.error('Failed to load pending invitations:', error);
    return { invitations: [], leave: null };
  }
  return transformMyPendingInvitations(data);
}

/**
 * Accept an invitation. `confirmLeave` must be true when the server answered
 * `confirmation_required` (sole admin leaving a tenant that holds data) and
 * the user typed the confirmation.
 */
export async function acceptInvitation(invitationId: string, confirmLeave = false): Promise<AcceptInvitationResult> {
  const { data, error } = await supabase.rpc('accept_invitation', {
    p_invitation_id: invitationId,
    p_confirm_leave: confirmLeave,
  });
  if (error) {
    console.error('accept_invitation failed:', error);
    return { status: 'error', error: 'unknown' };
  }
  return transformAcceptResult(data);
}
