import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockSupabase,
  mockSupabaseTable,
  mockSupabaseAuth,
  clearSupabaseMocks,
  mockGetCurrentTenantId,
} from '@/test/mocks/supabase'

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAnon: mockSupabase,
  getCurrentTenantId: mockGetCurrentTenantId,
}))

import {
  getTenantEntitlements,
  checkQuota,
  hasModule,
  hasAnyReturnsHubModule,
  canUseFeature,
  consumeCredits,
  refundCredits,
  invalidateEntitlementCache,
  createCheckoutSession,
  createPortalSession,
  getInvoices,
  getUsageSummary,
  getCreditTransactions,
  getCreditBalance,
} from './billing'

import { PLAN_CONFIGS } from '@/types/billing'

describe('Billing Service', () => {
  beforeEach(() => {
    clearSupabaseMocks()
    vi.clearAllMocks()
    invalidateEntitlementCache()
    mockGetCurrentTenantId.mockResolvedValue('test-tenant-id')
  })

  // ==========================================
  // getTenantEntitlements
  // ==========================================
  describe('getTenantEntitlements', () => {
    it('returns free plan defaults when no subscription exists', async () => {
      // Arrange - no subscription, no modules, no credits
      mockSupabaseTable('billing_subscriptions', { data: null, error: null })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      const result = await getTenantEntitlements('test-tenant-id', true)

      // Assert
      expect(result.plan).toBe('free')
      expect(result.status).toBe('active')
      expect(result.limits.maxProducts).toBe(PLAN_CONFIGS.free.limits.maxProducts)
      expect(result.limits.maxProducts).toBe(5)
      expect(result.credits.monthlyAllowance).toBe(PLAN_CONFIGS.free.limits.monthlyAICredits)
      expect(result.features.customBranding).toBe(false)
    })

    it('returns pro plan with correct limits', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false, current_period_end: '2026-03-01' },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', {
        data: { monthly_allowance: 25, monthly_used: 5, purchased_balance: 10, total_consumed: 5, monthly_reset_at: null },
        error: null,
      })

      // Act
      const result = await getTenantEntitlements('test-tenant-id', true)

      // Assert
      expect(result.plan).toBe('pro')
      expect(result.limits.maxProducts).toBe(50)
      expect(result.limits.maxAdminUsers).toBe(5)
      expect(result.features.customBranding).toBe(true)
      expect(result.features.whiteLabel).toBe(false)
      expect(result.credits.monthlyAllowance).toBe(25)
      expect(result.credits.monthlyUsed).toBe(5)
      expect(result.credits.purchasedBalance).toBe(10)
      expect(result.credits.totalAvailable).toBe(30) // (25-5) + 10
    })

    it('returns enterprise plan with all features enabled', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'enterprise', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', {
        data: { monthly_allowance: 100, monthly_used: 0, purchased_balance: 0, total_consumed: 0 },
        error: null,
      })

      // Act
      const result = await getTenantEntitlements('test-tenant-id', true)

      // Assert
      expect(result.plan).toBe('enterprise')
      expect(result.features.whiteLabel).toBe(true)
      expect(result.features.customCSS).toBe(true)
      expect(result.limits.maxProducts).toBe(Infinity)
    })

    it('throws error when no tenant ID available', async () => {
      // Arrange
      mockGetCurrentTenantId.mockResolvedValue(null as unknown as string)

      // Act & Assert
      await expect(getTenantEntitlements(undefined, true)).rejects.toThrow('No tenant ID available')
    })

    it('includes active modules from subscriptions', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', {
        data: [
          { module_id: 'returns_hub_professional' },
          { module_id: 'supplier_portal' },
        ],
        error: null,
      })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      const result = await getTenantEntitlements('test-tenant-id', true)

      // Assert
      expect(result.modules.has('returns_hub_professional')).toBe(true)
      expect(result.modules.has('supplier_portal')).toBe(true)
      expect(result.modules.has('custom_domain')).toBe(false)
    })

    it('uses cache on second call within TTL', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act - first call populates cache
      const result1 = await getTenantEntitlements('test-tenant-id', true)
      // Clear mocks to detect if a second DB call is made
      vi.clearAllMocks()
      const result2 = await getTenantEntitlements('test-tenant-id', false)

      // Assert - second call should not query DB
      expect(mockSupabase.from).not.toHaveBeenCalled()
      expect(result2.plan).toBe(result1.plan)
    })
  })

  // ==========================================
  // checkQuota
  // ==========================================
  describe('checkQuota', () => {
    it('returns allowed=true when under limit', async () => {
      // Arrange - set up entitlements (free plan: 5 products)
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      // Product count query returns count=3
      mockSupabaseTable('products', { data: null, error: null, count: 3 })

      // Act
      invalidateEntitlementCache()
      const result = await checkQuota('product', { tenantId: 'test-tenant-id' })

      // Assert
      expect(result.allowed).toBe(true)
      expect(result.current).toBe(3)
      expect(result.limit).toBe(5) // free plan limit
      expect(result.resource).toBe('product')
    })

    it('returns allowed=false when at limit', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('products', { data: null, error: null, count: 5 })

      // Act
      invalidateEntitlementCache()
      const result = await checkQuota('product', { tenantId: 'test-tenant-id' })

      // Assert
      expect(result.allowed).toBe(false)
      expect(result.current).toBe(5)
      expect(result.limit).toBe(5)
    })

    it('returns allowed=false when no tenant ID', async () => {
      // Arrange
      mockGetCurrentTenantId.mockResolvedValue(null as unknown as string)

      // Act
      const result = await checkQuota('product')

      // Assert
      expect(result.allowed).toBe(false)
    })
  })

  // ==========================================
  // hasModule
  // ==========================================
  describe('hasModule', () => {
    it('returns true for active module', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', {
        data: [{ module_id: 'returns_hub_starter' }],
        error: null,
      })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      invalidateEntitlementCache()
      const result = await hasModule('returns_hub_starter', 'test-tenant-id')

      // Assert
      expect(result).toBe(true)
    })

    it('returns false for inactive module', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      invalidateEntitlementCache()
      const result = await hasModule('returns_hub_starter', 'test-tenant-id')

      // Assert
      expect(result).toBe(false)
    })
  })

  // ==========================================
  // hasAnyReturnsHubModule
  // ==========================================
  describe('hasAnyReturnsHubModule', () => {
    it('returns true when any returns hub module is active', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', {
        data: [{ module_id: 'returns_hub_professional' }],
        error: null,
      })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      invalidateEntitlementCache()
      const result = await hasAnyReturnsHubModule('test-tenant-id')

      // Assert
      expect(result).toBe(true)
    })

    it('returns false when no returns hub module is active', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', {
        data: [{ module_id: 'supplier_portal' }],
        error: null,
      })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      invalidateEntitlementCache()
      const result = await hasAnyReturnsHubModule('test-tenant-id')

      // Assert
      expect(result).toBe(false)
    })
  })

  // ==========================================
  // canUseFeature
  // ==========================================
  describe('canUseFeature', () => {
    it('returns false for free plan premium features', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'free', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      invalidateEntitlementCache()
      const result = await canUseFeature('customBranding', 'test-tenant-id')

      // Assert
      expect(result).toBe(false)
    })

    it('returns true for pro plan with customBranding', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      invalidateEntitlementCache()
      const result = await canUseFeature('customBranding', 'test-tenant-id')

      // Assert
      expect(result).toBe(true)
    })
  })

  // ==========================================
  // consumeCredits
  // ==========================================
  describe('consumeCredits', () => {
    it('deducts from monthly credits first', async () => {
      // Arrange
      mockSupabaseTable('billing_credits', {
        data: {
          monthly_allowance: 25,
          monthly_used: 10,
          purchased_balance: 50,
          total_consumed: 10,
        },
        error: null,
      })
      mockSupabaseTable('billing_credit_transactions', { data: null, error: null })
      mockSupabaseAuth('getUser', { data: { user: { id: 'u-1' } } })

      // Act
      const result = await consumeCredits(5, 'compliance_check')

      // Assert
      expect(result.success).toBe(true)
      // monthly remaining was 15, after consuming 5 -> 10 remaining
      // total = 10 monthly remaining + 50 purchased = 60
      expect(result.remaining).toBe(60)
    })

    it('falls back to purchased when monthly exhausted', async () => {
      // Arrange
      mockSupabaseTable('billing_credits', {
        data: {
          monthly_allowance: 25,
          monthly_used: 23,
          purchased_balance: 50,
          total_consumed: 23,
        },
        error: null,
      })
      mockSupabaseTable('billing_credit_transactions', { data: null, error: null })
      mockSupabaseAuth('getUser', { data: { user: { id: 'u-1' } } })

      // Act - consuming 5: 2 from monthly, 3 from purchased
      const result = await consumeCredits(5, 'compliance_check')

      // Assert
      expect(result.success).toBe(true)
      // monthly remaining was 2, purchased was 50 -> after: 0 monthly + 47 purchased = 47
      expect(result.remaining).toBe(47)
    })

    it('returns failure when not enough credits', async () => {
      // Arrange
      mockSupabaseTable('billing_credits', {
        data: {
          monthly_allowance: 3,
          monthly_used: 3,
          purchased_balance: 0,
          total_consumed: 3,
        },
        error: null,
      })

      // Act
      const result = await consumeCredits(5, 'compliance_check')

      // Assert
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('returns failure when no tenant ID', async () => {
      // Arrange
      mockGetCurrentTenantId.mockResolvedValue(null as unknown as string)

      // Act
      const result = await consumeCredits(1, 'test')

      // Assert
      expect(result.success).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('returns failure when no credit record exists', async () => {
      // Arrange
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act
      const result = await consumeCredits(1, 'test')

      // Assert
      expect(result.success).toBe(false)
    })
  })

  // ==========================================
  // refundCredits
  // ==========================================
  describe('refundCredits', () => {
    it('refunds to monthly first when monthly was used', async () => {
      // Arrange
      mockSupabaseTable('billing_credits', {
        data: {
          monthly_allowance: 25,
          monthly_used: 10,
          purchased_balance: 50,
          total_consumed: 10,
        },
        error: null,
      })
      mockSupabaseTable('billing_credit_transactions', { data: null, error: null })
      mockSupabaseAuth('getUser', { data: { user: { id: 'u-1' } } })

      // Act - refund 3: all to monthly since monthly_used=10
      await refundCredits(3, 'failed_ai_call')

      // Assert - verify update was called on billing_credits
      expect(mockSupabase.from).toHaveBeenCalledWith('billing_credits')
    })

    it('does nothing when no tenant ID', async () => {
      // Arrange
      mockGetCurrentTenantId.mockResolvedValue(null as unknown as string)

      // Act & Assert - should not throw
      await refundCredits(5, 'test')
    })

    it('does nothing when no credit record', async () => {
      // Arrange
      mockSupabaseTable('billing_credits', { data: null, error: null })

      // Act & Assert - should not throw
      await refundCredits(5, 'test')
    })
  })

  // ==========================================
  // createCheckoutSession
  // ==========================================
  describe('createCheckoutSession', () => {
    it('returns checkout URL on success (subscription mode)', async () => {
      // Arrange
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_123' },
        error: null,
      })

      // Act
      const result = await createCheckoutSession({
        priceId: 'price_pro_monthly',
        mode: 'subscription',
        successUrl: 'https://app.trackbliss.com/billing?success=true',
        cancelUrl: 'https://app.trackbliss.com/billing',
      })

      // Assert
      expect(result.url).toBe('https://checkout.stripe.com/session_123')
      expect('error' in result && result.error).toBeFalsy()
    })

    it('returns checkout URL on success (payment mode for credits)', async () => {
      // Arrange
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { url: 'https://checkout.stripe.com/session_456' },
        error: null,
      })

      // Act
      const result = await createCheckoutSession({
        priceId: 'price_credits_50',
        mode: 'payment',
        successUrl: 'https://app.trackbliss.com/billing?credits=true',
        cancelUrl: 'https://app.trackbliss.com/billing',
        metadata: { pack: 'small' },
      })

      // Assert
      expect(result.url).toBe('https://checkout.stripe.com/session_456')
    })

    it('returns error when edge function fails', async () => {
      // Arrange
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Edge function error', context: { error: 'Stripe Tax not enabled' } },
      })

      // Act
      const result = await createCheckoutSession({
        priceId: 'price_pro',
        mode: 'subscription',
        successUrl: 'https://app.trackbliss.com',
        cancelUrl: 'https://app.trackbliss.com',
      })

      // Assert
      expect(result.error).toBeTruthy()
      expect(result.url).toBeUndefined()
    })

    it('returns error when no URL returned', async () => {
      // Arrange
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { error: 'Missing Stripe customer' },
        error: null,
      })

      // Act
      const result = await createCheckoutSession({
        priceId: 'price_pro',
        mode: 'subscription',
        successUrl: 'https://app.trackbliss.com',
        cancelUrl: 'https://app.trackbliss.com',
      })

      // Assert
      expect(result.error).toBe('Missing Stripe customer')
    })
  })

  // ==========================================
  // createPortalSession
  // ==========================================
  describe('createPortalSession', () => {
    it('returns portal URL on success', async () => {
      // Arrange
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { url: 'https://billing.stripe.com/portal_123' },
        error: null,
      })

      // Act
      const result = await createPortalSession('https://app.trackbliss.com/billing')

      // Assert
      expect(result.url).toBe('https://billing.stripe.com/portal_123')
    })

    it('returns error when no stripe customer', async () => {
      // Arrange
      mockSupabase.functions.invoke.mockResolvedValue({
        data: { error: 'No Stripe customer found for this tenant' },
        error: null,
      })

      // Act
      const result = await createPortalSession('https://app.trackbliss.com/billing')

      // Assert
      expect(result.error).toBe('No Stripe customer found for this tenant')
    })
  })

  // ==========================================
  // getInvoices
  // ==========================================
  describe('getInvoices', () => {
    it('returns transformed invoices', async () => {
      // Arrange
      mockSupabaseTable('billing_invoices', {
        data: [
          {
            id: 'inv-1',
            tenant_id: 'test-tenant-id',
            stripe_invoice_id: 'in_stripe_1',
            stripe_invoice_url: 'https://invoice.stripe.com/1',
            stripe_pdf_url: 'https://pdf.stripe.com/1',
            amount_due: 4900,
            amount_paid: 4900,
            currency: 'eur',
            status: 'paid',
            period_start: '2026-01-01',
            period_end: '2026-02-01',
            created_at: '2026-01-01T00:00:00Z',
          },
        ],
        error: null,
      })

      // Act
      const invoices = await getInvoices()

      // Assert
      expect(invoices).toHaveLength(1)
      expect(invoices[0].stripeInvoiceId).toBe('in_stripe_1')
      expect(invoices[0].amountDue).toBe(4900)
      expect(invoices[0].status).toBe('paid')
    })

    it('returns empty array when no invoices', async () => {
      // Arrange
      mockSupabaseTable('billing_invoices', { data: [], error: null })

      // Act
      const invoices = await getInvoices()

      // Assert
      expect(invoices).toEqual([])
    })

    it('returns empty array when no tenant', async () => {
      // Arrange
      mockGetCurrentTenantId.mockResolvedValue(null)

      // Act
      const invoices = await getInvoices()

      // Assert
      expect(invoices).toEqual([])
    })
  })

  // ==========================================
  // getUsageSummary
  // ==========================================
  describe('getUsageSummary', () => {
    it('returns resource usage counts', async () => {
      // Arrange - need entitlements + count queries
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', { data: null, error: null })
      mockSupabaseTable('products', { data: null, error: null, count: 12 })
      mockSupabaseTable('documents', { data: null, error: null, count: 45 })
      mockSupabaseTable('profiles', { data: null, error: null, count: 3 })

      // Act
      invalidateEntitlementCache()
      const summary = await getUsageSummary()

      // Assert
      expect(summary.products).toBeDefined()
      expect(summary.documents).toBeDefined()
      expect(summary.adminUsers).toBeDefined()
    })

    it('returns empty object when no tenant', async () => {
      // Arrange
      mockGetCurrentTenantId.mockResolvedValue(null)

      // Act
      const summary = await getUsageSummary()

      // Assert
      expect(summary).toEqual({})
    })
  })

  // ==========================================
  // getCreditTransactions
  // ==========================================
  describe('getCreditTransactions', () => {
    it('returns transformed transactions', async () => {
      // Arrange
      mockSupabaseTable('billing_credit_transactions', {
        data: [
          {
            id: 'tx-1',
            tenant_id: 'test-tenant-id',
            type: 'consume',
            amount: -3,
            balance_after: 22,
            source: 'monthly',
            description: 'Compliance check',
            metadata: {},
            user_id: 'u-1',
            created_at: '2026-02-10T10:00:00Z',
          },
        ],
        error: null,
      })

      // Act
      const txns = await getCreditTransactions()

      // Assert
      expect(txns).toHaveLength(1)
      expect(txns[0].type).toBe('consume')
      expect(txns[0].amount).toBe(-3)
      expect(txns[0].balanceAfter).toBe(22)
    })

    it('returns empty array when no tenant', async () => {
      // Arrange
      mockGetCurrentTenantId.mockResolvedValue(null)

      // Act
      const txns = await getCreditTransactions()

      // Assert
      expect(txns).toEqual([])
    })
  })

  // ==========================================
  // getCreditBalance
  // ==========================================
  describe('getCreditBalance', () => {
    it('returns credit balance from entitlements', async () => {
      // Arrange
      mockSupabaseTable('billing_subscriptions', {
        data: { plan: 'pro', status: 'active', cancel_at_period_end: false },
        error: null,
      })
      mockSupabaseTable('billing_module_subscriptions', { data: [], error: null })
      mockSupabaseTable('billing_credits', {
        data: { monthly_allowance: 25, monthly_used: 10, purchased_balance: 30, total_consumed: 10 },
        error: null,
      })

      // Act
      invalidateEntitlementCache()
      const balance = await getCreditBalance('test-tenant-id')

      // Assert
      expect(balance.monthlyAllowance).toBe(25)
      expect(balance.monthlyUsed).toBe(10)
      expect(balance.purchasedBalance).toBe(30)
      expect(balance.totalAvailable).toBe(45) // (25-10) + 30
    })
  })
})
