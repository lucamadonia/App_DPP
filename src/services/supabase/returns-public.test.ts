import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockSupabase,
  mockSupabaseAnon,
  clearSupabaseMocks,
  mockGetCurrentTenantId,
} from '@/test/mocks/supabase'

const rpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAnon: { ...mockSupabaseAnon, rpc: (...args: unknown[]) => rpc(...args) },
  getCurrentTenantId: mockGetCurrentTenantId,
}))

vi.mock('./billing', () => ({
  hasAnyReturnsHubModule: vi.fn(async () => true),
  checkQuota: vi.fn(async () => ({ allowed: true, current: 0, limit: 50, resource: 'return' })),
}))

vi.mock('./rh-notification-trigger', () => ({
  triggerEmailNotification: vi.fn(async () => {}),
  triggerPublicEmailNotification: vi.fn(async () => ({ success: true })),
}))

vi.mock('./rh-workflow-engine', () => ({
  executeWorkflowsForEvent: vi.fn(async () => {}),
}))

import {
  publicCreateReturn,
  publicTrackReturn,
  publicCancelReturn,
  publicGetReturnItems,
  publicResolveReturnId,
} from './returns'
import { triggerPublicEmailNotification } from './rh-notification-trigger'

describe('Public returns (RPC-based)', () => {
  beforeEach(() => {
    clearSupabaseMocks()
    vi.clearAllMocks()
    rpc.mockReset()
  })

  describe('publicCreateReturn', () => {
    it('calls public_create_return with the slug and never touches tables', async () => {
      rpc.mockResolvedValue({
        data: { success: true, return_id: 'r-1', return_number: 'RET-20261001-ABCD5', tenant_id: 't-1' },
        error: null,
      })

      const result = await publicCreateReturn('acme', {
        email: 'a@b.de',
        desiredSolution: 'refund',
        shippingMethod: 'dhl',
        items: [{ name: 'Shirt', quantity: 1 }, { name: '  ', quantity: 1 }],
      })

      expect(result).toEqual({ success: true, returnNumber: 'RET-20261001-ABCD5' })
      expect(rpc).toHaveBeenCalledWith('public_create_return', expect.objectContaining({
        p_tenant_id: null,
        p_payload: expect.objectContaining({ tenantSlug: 'acme', email: 'a@b.de' }),
      }))
      const payload = rpc.mock.calls[0][1].p_payload
      expect(payload.items).toHaveLength(1)
      expect(payload).not.toHaveProperty('status')
      expect(mockSupabaseAnon.from).not.toHaveBeenCalled()
      expect(mockSupabase.from).not.toHaveBeenCalled()
      expect(triggerPublicEmailNotification).toHaveBeenCalledWith('t-1', 'return_confirmed', expect.objectContaining({ returnId: 'r-1' }))
    })

    it('maps server error codes', async () => {
      rpc.mockResolvedValue({ data: { success: false, error: 'rate_limited' }, error: null })
      const result = await publicCreateReturn('acme', {
        email: 'a@b.de', desiredSolution: 'refund', shippingMethod: 'dhl', items: [],
      })
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Too many/)
      expect(triggerPublicEmailNotification).not.toHaveBeenCalled()
    })
  })

  describe('publicTrackReturn', () => {
    it('requires an e-mail and does not call the RPC without one', async () => {
      const result = await publicTrackReturn('RET-1')
      expect(result.returnData).toBeNull()
      expect(rpc).not.toHaveBeenCalled()
    })

    it('maps the minimal projection, timeline and items', async () => {
      rpc.mockResolvedValue({
        data: {
          id: 'r-1', tenant_id: 't-1', tenant_slug: 'acme', return_number: 'RET-1', status: 'CREATED',
          priority: 'normal', created_at: '2026-10-01', updated_at: '2026-10-01',
          items: [{ id: 'i-1', name: 'Shirt', quantity: 2, condition: null, photos: [] }],
          timeline: [{ id: 'tl-1', status: 'CREATED', comment: null, actor_type: 'customer', created_at: '2026-10-01' }],
        },
        error: null,
      })

      const result = await publicTrackReturn(' RET-1 ', ' a@b.de ')

      expect(rpc).toHaveBeenCalledWith('public_track_return', { p_return_number: 'RET-1', p_email: 'a@b.de' })
      expect(result.returnData?.returnNumber).toBe('RET-1')
      expect(result.returnData?.internalNotes).toBeUndefined()
      expect(result.returnData?.metadata).toEqual({})
      expect(result.timeline[0]).toMatchObject({ returnId: 'r-1', actorType: 'customer' })
      expect(result.tenantSlug).toBe('acme')
      expect(await publicGetReturnItems('RET-1')).toEqual([
        { id: 'i-1', name: 'Shirt', quantity: 2, condition: undefined, photos: [] },
      ])
    })

    it('returns null when the RPC finds nothing', async () => {
      rpc.mockResolvedValue({ data: null, error: null })
      const result = await publicTrackReturn('RET-404', 'x@y.de')
      expect(result.returnData).toBeNull()
    })
  })

  describe('publicResolveReturnId', () => {
    it('resolves the id through public_track_return (no table access)', async () => {
      rpc.mockResolvedValue({
        data: { id: 'r-9', tenant_id: 't-1', return_number: 'RET-9', status: 'CREATED', items: [], timeline: [] },
        error: null,
      })
      expect(await publicResolveReturnId('RET-9', 'a@b.de', 't-1')).toBe('r-9')
      expect(rpc).toHaveBeenCalledWith('public_track_return', { p_return_number: 'RET-9', p_email: 'a@b.de' })
      expect(mockSupabaseAnon.from).not.toHaveBeenCalledWith('rh_returns')
    })

    it('rejects a return of another tenant or an unknown return', async () => {
      rpc.mockResolvedValueOnce({
        data: { id: 'r-9', tenant_id: 't-2', return_number: 'RET-9', status: 'CREATED', items: [], timeline: [] },
        error: null,
      })
      expect(await publicResolveReturnId('RET-9', 'a@b.de', 't-1')).toBeUndefined()
      rpc.mockResolvedValueOnce({ data: null, error: null })
      expect(await publicResolveReturnId('RET-0', 'a@b.de')).toBeUndefined()
    })
  })

  describe('publicCancelReturn', () => {
    it('cancels through the RPC and notifies', async () => {
      rpc.mockResolvedValue({ data: { success: true, tenant_id: 't-1', customer_name: 'Max M' }, error: null })

      const result = await publicCancelReturn('RET-1', 'a@b.de', 'Changed mind')

      expect(result.success).toBe(true)
      expect(rpc).toHaveBeenCalledWith('public_cancel_return', {
        p_return_number: 'RET-1', p_email: 'a@b.de', p_reason: 'Changed mind',
      })
      expect(triggerPublicEmailNotification).toHaveBeenCalledWith('t-1', 'return_cancelled', expect.objectContaining({ firstName: 'Max' }))
    })

    it('reports not cancellable without notifying', async () => {
      rpc.mockResolvedValue({ data: { success: false, error: 'not_cancellable' }, error: null })
      const result = await publicCancelReturn('RET-1', 'a@b.de', 'x')
      expect(result).toEqual({ success: false, error: 'Return cannot be cancelled in current status' })
      expect(triggerPublicEmailNotification).not.toHaveBeenCalled()
    })
  })
})
