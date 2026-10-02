import { describe, it, expect, vi, beforeEach } from 'vitest'

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
  getCurrentTenantId: vi.fn(),
}))
vi.mock('@/lib/edge-function', () => ({ invokeEdgeFunction: vi.fn() }))

import { acceptInvitation, listMyPendingInvitations } from './invitations'

const leaveRaw = {
  has_profile: true,
  tenant_id: 't-old',
  tenant_name: 'Old GmbH',
  role: 'admin',
  is_sole_admin: true,
  other_members: 0,
  paid_subscription: false,
  data_tables: ['products', 'documents'],
  outcome: 'confirm_required',
}

describe('accept-invitation service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists pending invitations and the leave assessment', async () => {
    rpcMock.mockResolvedValue({
      data: {
        invitations: [{ id: 'i1', tenant_id: 't1', tenant_name: 'Acme', role: 'owner', invited_by_name: '', created_at: 'x', expires_at: null }],
        leave: leaveRaw,
      },
      error: null,
    })
    const res = await listMyPendingInvitations()
    expect(rpcMock).toHaveBeenCalledWith('list_my_pending_invitations')
    expect(res.invitations).toEqual([
      { id: 'i1', tenantId: 't1', tenantName: 'Acme', role: 'viewer', invitedByName: null, createdAt: 'x', expiresAt: null },
    ])
    expect(res.leave).toMatchObject({ currentTenantName: 'Old GmbH', isSoleAdmin: true, outcome: 'confirm_required', dataTables: ['products', 'documents'] })
  })

  it('returns an empty list on RPC error', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await listMyPendingInvitations()).toEqual({ invitations: [], leave: null })
  })

  it('passes the confirmation flag and maps accepted', async () => {
    rpcMock.mockResolvedValue({
      data: { status: 'accepted', tenant_id: 't1', tenant_name: 'Acme', role: 'editor', left_tenant_deleted: true },
      error: null,
    })
    const res = await acceptInvitation('i1', true)
    expect(rpcMock).toHaveBeenCalledWith('accept_invitation', { p_invitation_id: 'i1', p_confirm_leave: true })
    expect(res).toEqual({ status: 'accepted', tenantId: 't1', tenantName: 'Acme', role: 'editor', leftTenantDeleted: true })
  })

  it('maps confirmation_required with the assessment', async () => {
    rpcMock.mockResolvedValue({ data: { status: 'confirmation_required', leave: leaveRaw }, error: null })
    const res = await acceptInvitation('i1')
    expect(rpcMock).toHaveBeenCalledWith('accept_invitation', { p_invitation_id: 'i1', p_confirm_leave: false })
    expect(res.status).toBe('confirmation_required')
  })

  it('maps known and unknown server errors', async () => {
    rpcMock.mockResolvedValueOnce({ data: { status: 'error', error: 'expired' }, error: null })
    expect(await acceptInvitation('i1')).toMatchObject({ status: 'error', error: 'expired' })
    rpcMock.mockResolvedValueOnce({ data: { status: 'error', error: 'seat_limit', limit: 1 }, error: null })
    expect(await acceptInvitation('i1')).toMatchObject({ status: 'error', error: 'seat_limit' })
    rpcMock.mockResolvedValueOnce({ data: { status: 'error', error: 'weird' }, error: null })
    expect(await acceptInvitation('i1')).toMatchObject({ status: 'error', error: 'unknown' })
  })
})
