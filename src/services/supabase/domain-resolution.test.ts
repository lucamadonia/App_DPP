import { describe, it, expect, vi, beforeEach } from 'vitest'

const { rpcMock, anonRpcMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(),
  anonRpcMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: rpcMock },
  supabaseAnon: { rpc: anonRpcMock },
}))

import { resolveTenantByDomain, isDomainAvailable } from './domain-resolution'

describe('Domain Resolution Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================
  // resolveTenantByDomain
  // ==========================================
  describe('resolveTenantByDomain', () => {
    it('resolves a verified custom domain via the public RPC', async () => {
      anonRpcMock.mockResolvedValue({
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

      const result = await resolveTenantByDomain('Returns.Acme.com')

      expect(anonRpcMock).toHaveBeenCalledWith('get_public_tenant_by_domain', { p_domain: 'returns.acme.com' })
      expect(result).toEqual({
        tenantId: 'tenant-1',
        tenantSlug: 'acme',
        tenantName: 'Acme Corp',
        portalType: 'returns',
        primaryColor: '#FF5500',
        logoUrl: 'https://cdn.acme.com/logo.png',
      })
    })

    it('never queries the tenants table directly', async () => {
      anonRpcMock.mockResolvedValue({ data: null, error: null })
      const lib = await import('@/lib/supabase')
      await resolveTenantByDomain('returns.acme.com')
      expect((lib.supabase as unknown as { from?: unknown }).from).toBeUndefined()
    })

    it('returns null when domain not found', async () => {
      anonRpcMock.mockResolvedValue({ data: null, error: null })
      expect(await resolveTenantByDomain('unknown.example.com')).toBeNull()
    })

    it('returns null on RPC error', async () => {
      anonRpcMock.mockResolvedValue({ data: null, error: { message: 'DB error' } })
      expect(await resolveTenantByDomain('returns.acme.com')).toBeNull()
    })

    it('rejects invalid hostnames without calling the RPC', async () => {
      expect(await resolveTenantByDomain("evil.com'; drop")).toBeNull()
      expect(anonRpcMock).not.toHaveBeenCalled()
    })

    it('returns null when portalDomain settings are missing', async () => {
      anonRpcMock.mockResolvedValue({
        data: { id: 'tenant-1', name: 'Acme', slug: 'acme', settings: { returnsHub: {} } },
        error: null,
      })
      expect(await resolveTenantByDomain('returns.acme.com')).toBeNull()
    })

    it('uses default branding when none configured', async () => {
      anonRpcMock.mockResolvedValue({
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

      const result = await resolveTenantByDomain('portal.basic.com')

      expect(result?.primaryColor).toBe('#3B82F6') // default blue
      expect(result?.logoUrl).toBe('')
      expect(result?.portalType).toBe('both')
    })
  })

  // ==========================================
  // isDomainAvailable
  // ==========================================
  describe('isDomainAvailable', () => {
    it('returns true when the RPC reports the domain as free', async () => {
      rpcMock.mockResolvedValue({ data: true, error: null })
      expect(await isDomainAvailable('New-Domain.example.com')).toBe(true)
      expect(rpcMock).toHaveBeenCalledWith('is_portal_domain_available', { p_domain: 'new-domain.example.com' })
    })

    it('returns false when domain is already used', async () => {
      rpcMock.mockResolvedValue({ data: false, error: null })
      expect(await isDomainAvailable('taken-domain.example.com')).toBe(false)
    })

    it('fails closed on RPC error', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'Forbidden' } })
      expect(await isDomainAvailable('my-domain.example.com', 'tenant-1')).toBe(false)
    })

    it('rejects invalid domains without calling the RPC', async () => {
      expect(await isDomainAvailable('bad domain')).toBe(false)
      expect(rpcMock).not.toHaveBeenCalled()
    })
  })
})
