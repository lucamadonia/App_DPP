import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockSupabase,
  mockSupabaseAnon,
  mockSupabaseTable,
  clearSupabaseMocks,
  mockGetCurrentTenantId,
} from '@/test/mocks/supabase'

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAnon: mockSupabaseAnon,
  getCurrentTenantId: mockGetCurrentTenantId,
}))

// Mock billing service (used by createReturn)
vi.mock('./billing', () => ({
  hasAnyReturnsHubModule: vi.fn(async () => true),
  checkQuota: vi.fn(async () => ({ allowed: true, current: 5, limit: 50, resource: 'return' })),
}))

// Mock notification trigger (fire-and-forget)
vi.mock('./rh-notification-trigger', () => ({
  triggerEmailNotification: vi.fn(async () => {}),
  triggerPublicEmailNotification: vi.fn(async () => {}),
}))

// Mock workflow engine (dynamic import in createReturn)
vi.mock('./rh-workflow-engine', () => ({
  executeWorkflowsForEvent: vi.fn(async () => {}),
}))

import {
  getReturns,
  getReturn,
  createReturn,
  updateReturn,
  updateReturnStatus,
  cancelReturn,
  approveReturn,
  rejectReturn,
} from './returns'

import { hasAnyReturnsHubModule, checkQuota } from './billing'

describe('Returns Service', () => {
  beforeEach(() => {
    clearSupabaseMocks()
    vi.clearAllMocks()
    mockGetCurrentTenantId.mockResolvedValue('test-tenant-id')
    vi.mocked(hasAnyReturnsHubModule).mockResolvedValue(true)
    vi.mocked(checkQuota).mockResolvedValue({ allowed: true, current: 5, limit: 50, resource: 'return' })
  })

  // ==========================================
  // getReturns
  // ==========================================
  describe('getReturns', () => {
    it('returns paginated results', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: [
          { id: 'r-1', return_number: 'RET-20260210-ABC1', status: 'CREATED', tenant_id: 'test-tenant-id', priority: 'normal', metadata: {}, created_at: '2026-02-10', updated_at: '2026-02-10' },
          { id: 'r-2', return_number: 'RET-20260210-DEF2', status: 'APPROVED', tenant_id: 'test-tenant-id', priority: 'high', metadata: {}, created_at: '2026-02-10', updated_at: '2026-02-10' },
        ],
        error: null,
        count: 25,
      })

      // Act
      const result = await getReturns(undefined, 1, 20)

      // Assert
      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(25)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.totalPages).toBe(2) // ceil(25/20)
    })

    it('transforms snake_case to camelCase', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: [{
          id: 'r-1',
          tenant_id: 't-1',
          return_number: 'RET-001',
          status: 'CREATED',
          customer_id: 'c-1',
          order_id: 'ORD-100',
          reason_category: 'defective',
          reason_text: 'Broken screen',
          desired_solution: 'refund',
          shipping_method: 'DHL',
          tracking_number: 'TRACK123',
          priority: 'high',
          assigned_to: 'agent-1',
          internal_notes: 'VIP customer',
          refund_amount: 99.99,
          metadata: { source: 'web' },
          created_at: '2026-02-10T10:00:00Z',
          updated_at: '2026-02-10T12:00:00Z',
        }],
        error: null,
        count: 1,
      })

      // Act
      const result = await getReturns()

      // Assert
      const ret = result.data[0]
      expect(ret.tenantId).toBe('t-1')
      expect(ret.returnNumber).toBe('RET-001')
      expect(ret.customerId).toBe('c-1')
      expect(ret.orderId).toBe('ORD-100')
      expect(ret.reasonCategory).toBe('defective')
      expect(ret.reasonText).toBe('Broken screen')
      expect(ret.desiredSolution).toBe('refund')
      expect(ret.shippingMethod).toBe('DHL')
      expect(ret.trackingNumber).toBe('TRACK123')
      expect(ret.assignedTo).toBe('agent-1')
      expect(ret.internalNotes).toBe('VIP customer')
      expect(ret.refundAmount).toBe(99.99)
    })

    it('returns empty result when no tenant ID', async () => {
      // Arrange
      mockGetCurrentTenantId.mockResolvedValue(null as unknown as string)

      // Act
      const result = await getReturns()

      // Assert
      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
      expect(result.totalPages).toBe(0)
    })

    it('returns empty result on database error', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: null,
        error: { message: 'Database connection failed' },
        count: null,
      })

      // Act
      const result = await getReturns()

      // Assert
      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })

    it('applies status filter', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', { data: [], error: null, count: 0 })

      // Act
      await getReturns({ status: ['CREATED', 'APPROVED'] })

      // Assert - verify that .from('rh_returns') was called
      expect(mockSupabase.from).toHaveBeenCalledWith('rh_returns')
    })
  })

  // ==========================================
  // getReturn
  // ==========================================
  describe('getReturn', () => {
    it('returns a single transformed return', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: {
          id: 'r-1',
          tenant_id: 't-1',
          return_number: 'RET-001',
          status: 'APPROVED',
          priority: 'normal',
          metadata: {},
          created_at: '2026-02-10',
          updated_at: '2026-02-10',
        },
        error: null,
      })

      // Act
      const result = await getReturn('r-1')

      // Assert
      expect(result).toBeTruthy()
      expect(result?.id).toBe('r-1')
      expect(result?.returnNumber).toBe('RET-001')
      expect(result?.status).toBe('APPROVED')
    })

    it('returns null when not found', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', { data: null, error: { message: 'Not found' } })

      // Act
      const result = await getReturn('nonexistent')

      // Assert
      expect(result).toBeNull()
    })
  })

  // ==========================================
  // createReturn
  // ==========================================
  describe('createReturn', () => {
    it('creates a return with generated return number', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: { id: 'new-r-1', return_number: 'RET-20260210-XYZ1' },
        error: null,
      })

      // Act
      const result = await createReturn({
        reasonCategory: 'defective',
        reasonText: 'Product arrived damaged',
        desiredSolution: 'refund',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.id).toBe('new-r-1')
      expect(result.returnNumber).toBeTruthy()
    })

    it('uses provided return number when given', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: { id: 'new-r-2', return_number: 'CUSTOM-001' },
        error: null,
      })

      // Act
      const result = await createReturn({
        returnNumber: 'CUSTOM-001',
        reasonText: 'Wrong size',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.returnNumber).toBe('CUSTOM-001')
    })

    it('fails when no tenant ID', async () => {
      // Arrange
      mockGetCurrentTenantId.mockResolvedValue(null as unknown as string)

      // Act
      const result = await createReturn({ reasonText: 'test' })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('No tenant set')
    })

    it('fails when Returns Hub module is not active', async () => {
      // Arrange
      vi.mocked(hasAnyReturnsHubModule).mockResolvedValue(false)

      // Act
      const result = await createReturn({ reasonText: 'test' })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Returns Hub module not active')
    })

    it('fails when monthly return quota exceeded', async () => {
      // Arrange
      vi.mocked(checkQuota).mockResolvedValue({
        allowed: false,
        current: 50,
        limit: 50,
        resource: 'return',
      })

      // Act
      const result = await createReturn({ reasonText: 'test' })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('limit reached')
    })

    it('fails on database insert error', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: null,
        error: { message: 'duplicate key violation' },
      })

      // Act
      const result = await createReturn({ reasonText: 'test' })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('duplicate key violation')
    })
  })

  // ==========================================
  // updateReturn
  // ==========================================
  describe('updateReturn', () => {
    it('updates return fields successfully', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', { data: null, error: null })

      // Act
      const result = await updateReturn('r-1', {
        status: 'APPROVED',
        priority: 'high',
        assignedTo: 'agent-1',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('rh_returns')
    })

    it('returns error on database failure', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: null,
        error: { message: 'Row not found' },
      })

      // Act
      const result = await updateReturn('nonexistent', { status: 'APPROVED' })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toBe('Row not found')
    })
  })

  // ==========================================
  // updateReturnStatus
  // ==========================================
  describe('updateReturnStatus', () => {
    it('updates status and adds timeline entry', async () => {
      // Arrange - mock getReturn (for previous status capture) and update
      mockSupabaseTable('rh_returns', {
        data: { id: 'r-1', status: 'CREATED', tenant_id: 'test-tenant-id', return_number: 'RET-001', priority: 'normal', metadata: {}, created_at: '2026-02-10', updated_at: '2026-02-10' },
        error: null,
      })
      mockSupabaseTable('rh_return_timeline', { data: null, error: null })

      // Act
      const result = await updateReturnStatus('r-1', 'APPROVED', 'Looks good', 'agent-1')

      // Assert
      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('rh_return_timeline')
    })
  })

  // ==========================================
  // approveReturn / rejectReturn / cancelReturn
  // ==========================================
  describe('approveReturn', () => {
    it('calls updateReturnStatus with APPROVED', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: { id: 'r-1', status: 'CREATED', tenant_id: 'test-tenant-id', return_number: 'RET-001', priority: 'normal', metadata: {}, created_at: '2026-02-10', updated_at: '2026-02-10' },
        error: null,
      })
      mockSupabaseTable('rh_return_timeline', { data: null, error: null })

      // Act
      const result = await approveReturn('r-1', 'agent-1')

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe('rejectReturn', () => {
    it('calls updateReturnStatus with REJECTED and reason', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: { id: 'r-1', status: 'CREATED', tenant_id: 'test-tenant-id', return_number: 'RET-001', priority: 'normal', metadata: { email: 'customer@test.com' }, created_at: '2026-02-10', updated_at: '2026-02-10' },
        error: null,
      })
      mockSupabaseTable('rh_return_timeline', { data: null, error: null })

      // Act
      const result = await rejectReturn('r-1', 'Outside return window', 'agent-1')

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe('cancelReturn', () => {
    it('calls updateReturnStatus with CANCELLED', async () => {
      // Arrange
      mockSupabaseTable('rh_returns', {
        data: { id: 'r-1', status: 'CREATED', tenant_id: 'test-tenant-id', return_number: 'RET-001', priority: 'normal', metadata: {}, created_at: '2026-02-10', updated_at: '2026-02-10' },
        error: null,
      })
      mockSupabaseTable('rh_return_timeline', { data: null, error: null })

      // Act
      const result = await cancelReturn('r-1', 'Customer changed mind', 'agent-1')

      // Assert
      expect(result.success).toBe(true)
    })
  })
})
