import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the dns-providers module
vi.mock('@/lib/dns-providers', () => ({
  CNAME_TARGET: 'cname.vercel-dns.com',
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { verifyDomainCNAME } from './domain-verification'

describe('Domain Verification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyDomainCNAME', () => {
    it('returns verified when CNAME points to correct target', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [
            { name: 'returns.acme.com.', type: 5, TTL: 3600, data: 'cname.vercel-dns.com.' },
          ],
        }),
      })

      // Act
      const result = await verifyDomainCNAME('returns.acme.com')

      // Assert
      expect(result.status).toBe('verified')
      expect(result.cnameFound).toBe(true)
      expect(result.cnameValue).toBe('cname.vercel-dns.com')
      expect(result.error).toBeUndefined()
    })

    it('returns failed when CNAME points to wrong target', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [
            { name: 'returns.acme.com.', type: 5, TTL: 3600, data: 'other-host.example.com.' },
          ],
        }),
      })

      // Act
      const result = await verifyDomainCNAME('returns.acme.com')

      // Assert
      expect(result.status).toBe('failed')
      expect(result.cnameFound).toBe(true)
      expect(result.cnameValue).toBe('other-host.example.com')
      expect(result.error).toContain('instead of')
      expect(result.error).toContain('cname.vercel-dns.com')
    })

    it('returns pending when no CNAME record found', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [
            { name: 'returns.acme.com.', type: 1, TTL: 3600, data: '1.2.3.4' }, // A record, not CNAME
          ],
        }),
      })

      // Act
      const result = await verifyDomainCNAME('returns.acme.com')

      // Assert
      expect(result.status).toBe('pending')
      expect(result.cnameFound).toBe(false)
      expect(result.error).toContain('No CNAME record found')
    })

    it('returns pending when no DNS records found at all', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 3, // NXDOMAIN
        }),
      })

      // Act
      const result = await verifyDomainCNAME('nonexistent.example.com')

      // Assert
      expect(result.status).toBe('pending')
      expect(result.cnameFound).toBe(false)
      expect(result.error).toContain('not have propagated')
    })

    it('returns failed when DNS lookup HTTP fails', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      })

      // Act
      const result = await verifyDomainCNAME('returns.acme.com')

      // Assert
      expect(result.status).toBe('failed')
      expect(result.cnameFound).toBe(false)
      expect(result.error).toContain('HTTP 500')
    })

    it('returns failed when fetch throws network error', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network unreachable'))

      // Act
      const result = await verifyDomainCNAME('returns.acme.com')

      // Assert
      expect(result.status).toBe('failed')
      expect(result.cnameFound).toBe(false)
      expect(result.error).toBe('Network unreachable')
    })

    it('handles CNAME value with trailing dot normalization', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [
            { name: 'portal.corp.de.', type: 5, TTL: 3600, data: 'CNAME.VERCEL-DNS.COM.' },
          ],
        }),
      })

      // Act
      const result = await verifyDomainCNAME('portal.corp.de')

      // Assert
      expect(result.status).toBe('verified')
      expect(result.cnameFound).toBe(true)
      expect(result.cnameValue).toBe('CNAME.VERCEL-DNS.COM')
    })

    it('calls Google DNS API with correct URL', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ Status: 0, Answer: [] }),
      })

      // Act
      await verifyDomainCNAME('test.example.com')

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dns.google/resolve?name=test.example.com&type=CNAME',
        expect.objectContaining({
          headers: { Accept: 'application/dns-json' },
        }),
      )
    })

    it('returns pending when Answer array is empty', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          Status: 0,
          Answer: [],
        }),
      })

      // Act
      const result = await verifyDomainCNAME('empty.example.com')

      // Assert
      expect(result.status).toBe('pending')
      expect(result.cnameFound).toBe(false)
    })
  })
})
