import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  mockSupabase,
  mockSupabaseTable,
  clearSupabaseMocks,
} from '@/test/mocks/supabase'

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

import { resolveTenantByDomain, isDomainAvailable } from './domain-resolution'

describe('Domain Resolution Service', () => {
  beforeEach(() => {
    clearSupabaseMocks()
    vi.clearAllMocks()
  })

  // ==========================================
  // resolveTenantByDomain
  // ==========================================
  describe('resolveTenantByDomain', () => {
    it('resolves a verified custom domain to tenant info', async () => {
      // Arrange
      mockSupabaseTable('tenants', {
        data: {
          id: 'tenant-1',
          name: 'Acme Corp',
          slug: 'acme',
          settings: {
            returnsHub: {
              portalDomain: {
                customDomain: 'returns.acme.com',
                domainStatus: 'verified',
                portalType: 'returns',
              },
              branding: {
                primaryColor: '#FF5500',
                logoUrl: 'https://cdn.acme.com/logo.png',
              },
            },
          },
        },
        error: null,
      })

      // Act
      const result = await resolveTenantByDomain('returns.acme.com')

      // Assert
      expect(result).toBeTruthy()
      expect(result?.tenantId).toBe('tenant-1')
      expect(result?.tenantSlug).toBe('acme')
      expect(result?.tenantName).toBe('Acme Corp')
      expect(result?.portalType).toBe('returns')
      expect(result?.primaryColor).toBe('#FF5500')
      expect(result?.logoUrl).toBe('https://cdn.acme.com/logo.png')
    })

    it('returns null when domain not found', async () => {
      // Arrange
      mockSupabaseTable('tenants', { data: null, error: null })

      // Act
      const result = await resolveTenantByDomain('unknown.example.com')

      // Assert
      expect(result).toBeNull()
    })

    it('returns null on database error', async () => {
      // Arrange
      mockSupabaseTable('tenants', { data: null, error: { message: 'DB error' } })

      // Act
      const result = await resolveTenantByDomain('returns.acme.com')

      // Assert
      expect(result).toBeNull()
    })

    it('returns null when portalDomain settings are missing', async () => {
      // Arrange
      mockSupabaseTable('tenants', {
        data: {
          id: 'tenant-1',
          name: 'Acme',
          slug: 'acme',
          settings: { returnsHub: {} },
        },
        error: null,
      })

      // Act
      const result = await resolveTenantByDomain('returns.acme.com')

      // Assert
      expect(result).toBeNull()
    })

    it('uses default branding when none configured', async () => {
      // Arrange
      mockSupabaseTable('tenants', {
        data: {
          id: 'tenant-2',
          name: 'Basic Corp',
          slug: 'basic',
          settings: {
            returnsHub: {
              portalDomain: {
                customDomain: 'portal.basic.com',
                domainStatus: 'verified',
                portalType: 'both',
              },
            },
          },
        },
        error: null,
      })

      // Act
      const result = await resolveTenantByDomain('portal.basic.com')

      // Assert
      expect(result?.primaryColor).toBe('#3B82F6') // default blue
      expect(result?.logoUrl).toBe('')
      expect(result?.portalType).toBe('both')
    })
  })

  // ==========================================
  // isDomainAvailable
  // ==========================================
  describe('isDomainAvailable', () => {
    it('returns true when domain is not used', async () => {
      // Arrange
      mockSupabaseTable('tenants', { data: [], error: null })

      // Act
      const result = await isDomainAvailable('new-domain.example.com')

      // Assert
      expect(result).toBe(true)
    })

    it('returns false when domain is already used', async () => {
      // Arrange
      mockSupabaseTable('tenants', { data: [{ id: 'tenant-1' }], error: null })

      // Act
      const result = await isDomainAvailable('taken-domain.example.com')

      // Assert
      expect(result).toBe(false)
    })

    it('returns true when domain is only used by excluded tenant', async () => {
      // Arrange - query with neq will filter out the excluded tenant
      mockSupabaseTable('tenants', { data: [], error: null })

      // Act
      const result = await isDomainAvailable('my-domain.example.com', 'tenant-1')

      // Assert
      expect(result).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('tenants')
    })
  })
})
