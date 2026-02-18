/**
 * Quota Enforcement Integration Tests
 *
 * Tests the interaction between billing entitlements, quota checks,
 * and service operations (product creation, returns, AI credits).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockSupabase,
  mockSupabaseTable,
  mockSupabaseAuth,
  clearSupabaseMocks,
  mockGetCurrentTenantId,
} from '@/test/mocks/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAnon: mockSupabase,
  getCurrentTenantId: mockGetCurrentTenantId,
}))

// Mock notification triggers
vi.mock('@/services/supabase/rh-notification-trigger', () => ({
  triggerEmailNotification: vi.fn(async () => {}),
  triggerPublicEmailNotification: vi.fn(async () => {}),
}))

// Mock workflow engine
vi.mock('@/services/supabase/rh-workflow-engine', () => ({
  executeWorkflowsForEvent: vi.fn(async () => {}),
}))

import {
  checkQuota,
  consumeCredits,
  invalidateEntitlementCache,
} from '@/services/supabase/billing'
import { createReturn } from '@/services/supabase/returns'

describe('Quota Enforcement Integration', () => {
  beforeEach(() => {
    clearSupabaseMocks()
    vi.clearAllMocks()
    invalidateEntitlementCache()
    mockGetCurrentTenantId.mockResolvedValue('test-tenant-id')
  })

  // ==========================================
  // Free Plan Product Quota
  // ==========================================
  describe('Free Plan - Product Quota', () => {
    it('allows product creation when under limit (3/5)', async () => {
      // Arrange - Free plan with 3 products
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('products', { data: null, error: null, count: 3 })

      // Act
      const quota = await checkQuota('product', { tenantId: 'test-tenant-id' })

      // Assert
      expect(quota.allowed).toBe(true)
      expect(quota.current).toBe(3)
      expect(quota.limit).toBe(5)
    })

    it('blocks product creation at limit (5/5)', async () => {
      // Arrange - Free plan with 5 products (at limit)
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('products', { data: null, error: null, count: 5 })

      // Act
      const quota = await checkQuota('product', { tenantId: 'test-tenant-id' })

      // Assert
      expect(quota.allowed).toBe(false)
      expect(quota.current).toBe(5)
      expect(quota.limit).toBe(5)
      expect(quota.resource).toBe('product')
    })

    it('allows product creation on Pro plan with higher limit', async () => {
      // Arrange - Pro plan with 5 products (well under 50 limit)
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('products', { data: null, error: null, count: 5 })

      // Act
      invalidateEntitlementCache()
      const quota = await checkQuota('product', { tenantId: 'test-tenant-id' })

      // Assert
      expect(quota.allowed).toBe(true)
      expect(quota.limit).toBe(50)
    })
  })

  // ==========================================
  // Returns Hub Module Enforcement
  // ==========================================
  describe('Returns Hub - Module Enforcement', () => {
    it('allows createReturn when Returns Hub module active + under quota', async () => {
      // Arrange - Pro plan with Returns Hub Professional
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', {
        data: [{ module_id: 'returns_hub_professional' }],
        error: null,
      })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('rh_returns', {
        data: { id: 'new-return', return_number: 'RET-20260210-TEST1' },
        error: null,
        count: 10,
      })

      // Act
      invalidateEntitlementCache()
      const result = await createReturn({
        reasonCategory: 'defective',
        reasonText: 'Item broken',
        desiredSolution: 'refund',
      })

      // Assert
      expect(result.success).toBe(true)
      expect(result.id).toBe('new-return')
    })

    it('blocks createReturn when Returns Hub module NOT active', async () => {
      // Arrange - Pro plan WITHOUT Returns Hub module
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', {
        data: [{ module_id: 'supplier_portal' }], // Only supplier portal, no returns hub
        error: null,
      })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      invalidateEntitlementCache()
      const result = await createReturn({ reasonText: 'test' })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('Returns Hub module not active')
    })

    it('blocks createReturn when monthly return quota exceeded', async () => {
      // Arrange - Returns Hub Starter (50/month limit) at quota
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', {
        data: [{ module_id: 'returns_hub_starter' }],
        error: null,
      })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('rh_returns', {
        data: null,
        error: null,
        count: 50, // At limit
      })

      // Act
      invalidateEntitlementCache()
      const result = await createReturn({ reasonText: 'test' })

      // Assert
      expect(result.success).toBe(false)
      expect(result.error).toContain('limit reached')
    })
  })

  // ==========================================
  // AI Credit Enforcement
  // ==========================================
  describe('AI Credits - Enforcement', () => {
    it('blocks AI operation when 0 credits available', async () => {
      // Arrange - No monthly or purchased credits
      mockSupabaseTable('billing_credits', {
        data: {
          monthly_allowance: 3,
          monthly_used: 3,
          purchased_balance: 0,
          total_consumed: 3,
        },
        error: null,
      })

      // Act - Try to consume 3 credits for compliance check
      const result = await consumeCredits(3, 'compliance_check')

      // Assert
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('allows AI operation when sufficient monthly credits', async () => {
      // Arrange - 20 monthly credits remaining
      mockSupabaseTable('billing_credits', {
        data: {
          monthly_allowance: 25,
          monthly_used: 5,
          purchased_balance: 0,
          total_consumed: 5,
        },
        error: null,
      })
      mockSupabaseTable('billing_credit_transactions', { data: null, error: null })
      mockSupabaseAuth('getUser', { data: { user: { id: 'u-1' } } })

      // Act
      const result = await consumeCredits(3, 'compliance_check')

      // Assert
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(17) // 20 - 3
    })

    it('uses purchased credits when monthly exhausted', async () => {
      // Arrange - 0 monthly, 100 purchased
      mockSupabaseTable('billing_credits', {
        data: {
          monthly_allowance: 3,
          monthly_used: 3,
          purchased_balance: 100,
          total_consumed: 3,
        },
        error: null,
      })
      mockSupabaseTable('billing_credit_transactions', { data: null, error: null })
      mockSupabaseAuth('getUser', { data: { user: { id: 'u-1' } } })

      // Act
      const result = await consumeCredits(3, 'compliance_check')

      // Assert
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(97) // 0 monthly + 97 purchased
    })

    it('blocks when requesting more credits than total available', async () => {
      // Arrange - 2 monthly + 1 purchased = 3 total, requesting 5
      mockSupabaseTable('billing_credits', {
        data: {
          monthly_allowance: 25,
          monthly_used: 23,
          purchased_balance: 1,
          total_consumed: 23,
        },
        error: null,
      })

      // Act
      const result = await consumeCredits(5, 'compliance_check')

      // Assert
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(3) // 2 monthly + 1 purchased
    })
  })

  // ==========================================
  // Document Quota
  // ==========================================
  describe('Document Quota', () => {
    it('allows document creation under free plan limit', async () => {
      // Arrange - Free plan: 10 documents max
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('documents', { data: null, error: null, count: 7 })

      // Act
      invalidateEntitlementCache()
      const quota = await checkQuota('document', { tenantId: 'test-tenant-id' })

      // Assert
      expect(quota.allowed).toBe(true)
      expect(quota.current).toBe(7)
      expect(quota.limit).toBe(10)
    })

    it('blocks document creation at free plan limit', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('documents', { data: null, error: null, count: 10 })

      // Act
      invalidateEntitlementCache()
      const quota = await checkQuota('document', { tenantId: 'test-tenant-id' })

      // Assert
      expect(quota.allowed).toBe(false)
      expect(quota.current).toBe(10)
      expect(quota.limit).toBe(10)
    })
  })

  // ==========================================
  // Admin User Quota
  // ==========================================
  describe('Admin User Quota', () => {
    it('allows admin user on free plan when under limit', async () => {
      // Arrange - Free plan: 1 admin max
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('profiles', { data: null, error: null, count: 0 })

      // Act
      invalidateEntitlementCache()
      const quota = await checkQuota('admin_user', { tenantId: 'test-tenant-id' })

      // Assert
      expect(quota.allowed).toBe(true)
      expect(quota.limit).toBe(1)
    })

    it('Pro plan allows 5 admin users', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('profiles', { data: null, error: null, count: 3 })

      // Act
      invalidateEntitlementCache()
      const quota = await checkQuota('admin_user', { tenantId: 'test-tenant-id' })

      // Assert
      expect(quota.allowed).toBe(true)
      expect(quota.limit).toBe(5)
    })
  })
})
