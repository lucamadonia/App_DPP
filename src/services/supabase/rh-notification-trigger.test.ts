import { describe, it, expect, vi, beforeEach } from 'vitest'

const anonRpc = vi.fn()
const anonFrom = vi.fn()
const authInsert = vi.fn()
const getSession = vi.fn()
const getCurrentTenantId = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { getSession: (...a: unknown[]) => getSession(...a) },
    from: () => ({ insert: (...a: unknown[]) => authInsert(...a) }),
  },
  supabaseAnon: {
    rpc: (...a: unknown[]) => anonRpc(...a),
    from: (...a: unknown[]) => anonFrom(...a),
  },
  getCurrentTenantId: (...a: unknown[]) => getCurrentTenantId(...a),
}))

vi.mock('./rh-settings', () => ({
  getReturnsHubSettings: vi.fn(async () => ({
    notifications: { senderName: 'Acme', emailLocale: 'de' },
  })),
}))

vi.mock('./rh-email-templates', () => ({
  getRhEmailTemplate: vi.fn(async () => null),
  getRhEmailTemplateByTenantId: vi.fn(async () => null),
}))

import { triggerPublicEmailNotification, sendCustomerEmail } from './rh-notification-trigger'

describe('triggerPublicEmailNotification (anonymous visitor)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSession.mockResolvedValue({ data: { session: null } })
    getCurrentTenantId.mockResolvedValue(null)
  })

  it('queues via public_enqueue_notification and never sends recipient or HTML', async () => {
    anonRpc.mockResolvedValue({ data: { ok: true, id: 'n-1' }, error: null })

    const result = await triggerPublicEmailNotification('t-1', 'return_confirmed', {
      recipientEmail: 'victim@example.com',
      customerName: '<a href="https://evil">x</a>',
      returnNumber: 'RET-1',
      returnId: 'r-1',
    })

    expect(result).toEqual({ success: true, skipped: false })
    expect(anonRpc).toHaveBeenCalledTimes(1)
    const [fn, args] = anonRpc.mock.calls[0]
    expect(fn).toBe('public_enqueue_notification')
    expect(args).toEqual({
      p_tenant_id: 't-1',
      p_event_type: 'return_confirmed',
      p_return_id: 'r-1',
      p_return_number: null,
      p_ticket_id: null,
      p_ticket_number: null,
    })
    expect(JSON.stringify(args)).not.toContain('victim@example.com')
    expect(anonFrom).not.toHaveBeenCalled()
    expect(authInsert).not.toHaveBeenCalled()
  })

  it('falls back to the ticket number when no ticket id is known', async () => {
    anonRpc.mockResolvedValue({ data: { ok: true, id: 'n-2' }, error: null })

    await triggerPublicEmailNotification('t-1', 'ticket_created', {
      recipientEmail: 'c@example.com',
      ticketNumber: 'TKT-1',
    })

    expect(anonRpc.mock.calls[0][1]).toMatchObject({ p_ticket_id: null, p_ticket_number: 'TKT-1' })
  })

  it('skips events that are not allowed without a session', async () => {
    const result = await triggerPublicEmailNotification('t-1', 'shipment_shipped', {
      recipientEmail: 'c@example.com',
    })

    expect(result).toEqual({ success: true, skipped: true })
    expect(anonRpc).not.toHaveBeenCalled()
  })

  it('reports server-side rejections (e.g. rate limit) as failure', async () => {
    anonRpc.mockResolvedValue({ data: { ok: false, reason: 'rate_limited' }, error: null })

    const result = await triggerPublicEmailNotification('t-1', 'return_cancelled', {
      recipientEmail: 'c@example.com',
      returnNumber: 'RET-9',
    })

    expect(result).toEqual({ success: false, error: 'rate_limited' })
    expect(anonRpc.mock.calls[0][1]).toMatchObject({ p_return_id: null, p_return_number: 'RET-9' })
  })

  it('uses the RPC for a session that belongs to another tenant (customer portal)', async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: 'u' } } } })
    getCurrentTenantId.mockResolvedValue('other-tenant')
    anonRpc.mockResolvedValue({ data: { ok: true, id: 'n-3' }, error: null })

    await triggerPublicEmailNotification('t-1', 'ticket_created', { recipientEmail: 'c@example.com', ticketId: 'k-1' })

    expect(anonRpc).toHaveBeenCalledTimes(1)
    expect(authInsert).not.toHaveBeenCalled()
  })
})

describe('sendCustomerEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getCurrentTenantId.mockResolvedValue('t-1')
    authInsert.mockResolvedValue({ error: null })
  })

  it('queues a plain-text custom_message row with the recipient set', async () => {
    const result = await sendCustomerEmail({
      customerId: 'c-1',
      recipientEmail: ' kunde@example.com ',
      subject: ' Hallo ',
      message: 'Text',
      template: 'welcome',
    })

    expect(result.success).toBe(true)
    expect(result.notificationId).toBeTruthy()
    const row = authInsert.mock.calls[0][0]
    expect(row).toMatchObject({
      tenant_id: 't-1',
      customer_id: 'c-1',
      channel: 'email',
      template: 'custom_message',
      recipient_email: 'kunde@example.com',
      subject: 'Hallo',
      content: 'Text',
      status: 'pending',
    })
    expect(row.metadata).toMatchObject({ isHtml: false, crmTemplate: 'welcome' })
  })

  it('rejects empty subject or message without inserting', async () => {
    const result = await sendCustomerEmail({
      customerId: 'c-1',
      recipientEmail: 'kunde@example.com',
      subject: ' ',
      message: 'Text',
    })

    expect(result.success).toBe(false)
    expect(authInsert).not.toHaveBeenCalled()
  })
})
