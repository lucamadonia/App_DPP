import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockInvoke = vi.fn()
vi.mock('@/lib/edge-function', () => ({
  invokeEdgeFunction: (...args: unknown[]) => mockInvoke(...args),
}))

// Fail loudly if anything still calls DNS-over-HTTPS from the browser
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { verifyDomainCNAME } from './domain-verification'

describe('Domain Verification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyDomainCNAME', () => {
    it('delegates the lookup to the manage-vercel-domain edge function', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: true, result: { status: 'pending', cnameFound: false } },
        error: null,
      })

      await verifyDomainCNAME('test.example.com')

      expect(mockInvoke).toHaveBeenCalledWith('manage-vercel-domain', {
        action: 'verify',
        domain: 'test.example.com',
      })
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('returns the server result when verified', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          result: { status: 'verified', cnameFound: true, cnameValue: 'cname.vercel-dns.com' },
        },
        error: null,
      })

      const result = await verifyDomainCNAME('returns.acme.com')

      expect(result.status).toBe('verified')
      expect(result.cnameFound).toBe(true)
      expect(result.cnameValue).toBe('cname.vercel-dns.com')
      expect(result.error).toBeUndefined()
    })

    it('passes through a failed result with the server error', async () => {
      mockInvoke.mockResolvedValue({
        data: {
          success: true,
          result: {
            status: 'failed',
            cnameFound: true,
            cnameValue: 'other-host.example.com',
            error: 'CNAME record found but points to "other-host.example.com" instead of "cname.vercel-dns.com".',
          },
        },
        error: null,
      })

      const result = await verifyDomainCNAME('returns.acme.com')

      expect(result.status).toBe('failed')
      expect(result.cnameValue).toBe('other-host.example.com')
      expect(result.error).toContain('instead of')
    })

    it('returns failed when the edge function call errors', async () => {
      mockInvoke.mockResolvedValue({ data: null, error: new Error('HTTP 500') })

      const result = await verifyDomainCNAME('returns.acme.com')

      expect(result.status).toBe('failed')
      expect(result.cnameFound).toBe(false)
      expect(result.error).toContain('HTTP 500')
    })

    it('returns failed when the edge function rejects the request', async () => {
      mockInvoke.mockResolvedValue({
        data: { success: false, error: 'Invalid domain' },
        error: null,
      })

      const result = await verifyDomainCNAME('bad..domain')

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Invalid domain')
    })

    it('returns failed when the call throws', async () => {
      mockInvoke.mockRejectedValue(new Error('Network unreachable'))

      const result = await verifyDomainCNAME('returns.acme.com')

      expect(result.status).toBe('failed')
      expect(result.cnameFound).toBe(false)
      expect(result.error).toBe('Network unreachable')
    })
  })
})
