import { describe, it, expect, vi, beforeEach } from 'vitest'

const { anonRpcMock } = vi.hoisted(() => ({ anonRpcMock: vi.fn() }))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn() },
  supabaseAnon: { rpc: anonRpcMock },
}))

import {
  lookupPublicTenantBySlug,
  lookupPublicTenantById,
  getReturnsPortalBranding,
  getCustomerPortalBrandingFromTenant,
  getTenantLegalUrls,
} from './public-tenant-lookup'
import type { PublicTenantInfo } from './public-tenant'

const TENANT_ID = '522f6254-f73c-4a26-b1e9-662035194bc5'

function tenant(settings: Record<string, unknown> = {}): PublicTenantInfo {
  return { id: TENANT_ID, name: 'Acme', slug: 'acme', logo: null, settings }
}

describe('public-tenant-lookup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('returns found with the tenant for a known slug via the RPC', async () => {
    anonRpcMock.mockResolvedValue({ data: { id: TENANT_ID, name: 'Acme', slug: 'acme', settings: {} }, error: null })
    const result = await lookupPublicTenantBySlug('acme')
    expect(anonRpcMock).toHaveBeenCalledWith('get_public_tenant_by_slug', { p_slug: 'acme' })
    expect(result).toEqual({ status: 'found', tenant: expect.objectContaining({ id: TENANT_ID, name: 'Acme' }) })
  })

  it('returns not_found only for a definite empty result', async () => {
    anonRpcMock.mockResolvedValue({ data: null, error: null })
    expect(await lookupPublicTenantBySlug('nope')).toEqual({ status: 'not_found' })
  })

  it('treats an RPC error as error, not as not_found', async () => {
    anonRpcMock.mockResolvedValue({ data: null, error: { message: 'upstream 503' } })
    expect(await lookupPublicTenantBySlug('acme')).toEqual({ status: 'error' })
  })

  it('treats a thrown network failure as error', async () => {
    anonRpcMock.mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await lookupPublicTenantBySlug('acme')).toEqual({ status: 'error' })
  })

  it('rejects empty slugs and malformed ids without calling the RPC', async () => {
    expect(await lookupPublicTenantBySlug('')).toEqual({ status: 'not_found' })
    expect(await lookupPublicTenantById('not-a-uuid')).toEqual({ status: 'not_found' })
    expect(anonRpcMock).not.toHaveBeenCalled()
  })

  it('looks up by id through get_public_tenant_by_id', async () => {
    anonRpcMock.mockResolvedValue({ data: { id: TENANT_ID, name: 'Acme', slug: 'acme' }, error: null })
    const result = await lookupPublicTenantById(TENANT_ID)
    expect(anonRpcMock).toHaveBeenCalledWith('get_public_tenant_by_id', { p_tenant_id: TENANT_ID })
    expect(result.status).toBe('found')
  })

  it('maps returns-portal branding with defaults', () => {
    expect(getReturnsPortalBranding(tenant())).toEqual({ name: 'Acme', primaryColor: '#3B82F6', logoUrl: '' })
    expect(
      getReturnsPortalBranding(tenant({ returnsHub: { branding: { primaryColor: '#FF0000', logoUrl: 'https://x/logo.png' } } }))
    ).toEqual({ name: 'Acme', primaryColor: '#FF0000', logoUrl: 'https://x/logo.png' })
  })

  it('inherits Returns Hub colours in the customer-portal branding when configured', () => {
    const branding = getCustomerPortalBrandingFromTenant(
      tenant({
        returnsHub: {
          branding: { primaryColor: '#123456', logoUrl: 'https://x/l.png' },
          customerPortal: { branding: { inheritFromReturnsHub: true } },
        },
      })
    )
    expect(branding.primaryColor).toBe('#123456')
    expect(branding.logoUrl).toBe('https://x/l.png')
  })

  it('reads tenant legal URLs from the DPP footer and ignores blanks', () => {
    expect(
      getTenantLegalUrls(tenant({ dppDesign: { footer: { legalNoticeUrl: 'https://shop/impressum', privacyPolicyUrl: '  ' } } }))
    ).toEqual({ imprintUrl: 'https://shop/impressum', privacyUrl: undefined })
    expect(getTenantLegalUrls(null)).toEqual({ imprintUrl: undefined, privacyUrl: undefined })
  })
})
