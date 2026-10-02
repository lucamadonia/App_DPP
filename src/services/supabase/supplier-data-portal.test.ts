import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
  getCurrentTenantId: vi.fn(),
}))

vi.mock('@/lib/platform', () => ({ getPublicBaseUrl: () => 'https://app.test' }))

import {
  getSupplierDataRequestByCode,
  verifySupplierDataRequestPassword,
  publicGetProductForDataRequest,
  publicSubmitProductData,
  publicCreateBatch,
  publicMarkDataRequestSubmitted,
} from './supplier-data-portal'

describe('Supplier data portal (public RPCs)', () => {
  beforeEach(() => {
    rpc.mockReset()
  })

  it('never exposes a password hash in the public request info', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        dataRequest: { id: 'r1', status: 'pending', product_ids: ['p1'], password_hash: 'leak' },
        tenant: { id: 't1', name: 'Acme', slug: 'acme' },
        branding: { logoUrl: null, primaryColor: '#123456' },
        products: [{ id: 'p1', name: 'Chair' }],
      },
      error: null,
    })

    const result = await getSupplierDataRequestByCode('code-1')

    expect(rpc).toHaveBeenCalledWith('get_supplier_data_request_public', { p_access_code: 'code-1' })
    expect(result?.dataRequest.passwordHash).toBe('')
    expect(result?.products).toEqual([{ id: 'p1', name: 'Chair' }])
    expect(result?.branding.primaryColor).toBe('#123456')
  })

  it('returns null for unknown codes', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: null })
    expect(await getSupplierDataRequestByCode('nope')).toBeNull()
  })

  it('does not load product data before the password was verified', async () => {
    expect(await publicGetProductForDataRequest('code-unverified', 'p1')).toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('verifies server-side and reuses the verified hash for reads and submit', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })
    expect(await verifySupplierDataRequestPassword('code-2', 'hash-2')).toBe('ok')
    expect(rpc).toHaveBeenLastCalledWith('verify_supplier_data_request_password', {
      p_access_code: 'code-2',
      p_password_hash: 'hash-2',
    })

    rpc.mockResolvedValueOnce({ data: { ok: true, product: { id: 'p1' }, batches: [] }, error: null })
    const loaded = await publicGetProductForDataRequest('code-2', 'p1')
    expect(loaded).toEqual({ product: { id: 'p1' }, batches: [] })
    expect(rpc).toHaveBeenLastCalledWith('get_supplier_data_request_product', {
      p_access_code: 'code-2',
      p_password_hash: 'hash-2',
      p_product_id: 'p1',
    })

    rpc.mockResolvedValueOnce({ data: { ok: true }, error: null })
    await publicMarkDataRequestSubmitted('code-2')
    expect(rpc).toHaveBeenLastCalledWith('mark_supplier_data_request_submitted', {
      p_access_code: 'code-2',
      p_password_hash: 'hash-2',
    })
  })

  it('returns false when the password is wrong', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null })
    expect(await verifySupplierDataRequestPassword('code-3', 'bad')).toBe('invalid')
  })

  it('reports a lockout distinctly instead of a wrong password', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'locked' } })
    expect(await verifySupplierDataRequestPassword('code-6', 'correct')).toBe('locked')
    expect(await publicGetProductForDataRequest('code-6', 'p1')).toBeNull()

    rpc.mockResolvedValueOnce({ data: null, error: { message: 'expired' } })
    expect(await verifySupplierDataRequestPassword('code-6', 'correct')).toBe('expired')

    rpc.mockResolvedValueOnce({ data: null, error: { message: 'network down' } })
    expect(await verifySupplierDataRequestPassword('code-6', 'correct')).toBe('error')
  })

  it('maps server error codes to readable errors', async () => {
    rpc.mockResolvedValueOnce({ data: { ok: false, error: 'invalid_password' }, error: null })
    await expect(publicSubmitProductData('code-4', 'h', { name: 'x' }, 'p1')).rejects.toThrow('Invalid password')

    rpc.mockResolvedValueOnce({ data: null, error: { message: 'product_not_in_request' } })
    await expect(publicSubmitProductData('code-4', 'h', { name: 'x' }, 'p9')).rejects.toThrow(
      'Product not part of this data request',
    )
  })

  it('returns the new batch id from the server', async () => {
    rpc.mockResolvedValueOnce({ data: { ok: true, batchId: 'b-1' }, error: null })
    await expect(publicCreateBatch('code-5', 'h', { batchNumber: 'B1' }, 'p1')).resolves.toBe('b-1')
  })
})
