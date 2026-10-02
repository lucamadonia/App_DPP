import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { renderHook, waitFor } from '@testing-library/react'

const { anonRpcMock, tenantByIdMock } = vi.hoisted(() => ({
  anonRpcMock: vi.fn(),
  tenantByIdMock: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc: vi.fn(), from: vi.fn(() => { throw new Error('public DPP code must not read tables') }) },
  supabaseAnon: { rpc: anonRpcMock, from: vi.fn(() => { throw new Error('public DPP code must not read tables') }) },
  getCurrentTenantId: vi.fn(),
}))
vi.mock('./public-tenant', () => ({ getPublicTenantById: tenantByIdMock }))

import { getPublicDppProduct, transformPublicDppPayload } from './products'
import { getPublicVisibilitySettings } from './visibility'
import { resolvePublicDppTenantId, getPublicTenantDPPDesign } from './tenants'
import { usePublicProduct } from '@/hooks/use-public-product'
import { defaultVisibilityConfigV2, defaultVisibilityConfigV3, fieldDefinitions } from '@/types/visibility'

const TENANT_ID = '522f6254-f73c-4a26-b1e9-662035194bc5'
const MIGRATION = readFileSync(
  resolve(__dirname, '../../../supabase/migrations/20261001i_public_dpp_visibility.sql'),
  'utf8',
)

function payload(overrides: Record<string, unknown> = {}) {
  return {
    tenant_id: TENANT_ID,
    view: 'consumer',
    visibility: { version: 3, fields: { ...defaultVisibilityConfigV3.fields } },
    product: {
      id: 'p1', tenant_id: TENANT_ID, gtin: '4006381333931', serial_number: 'SN-1', product_type: 'single',
      name: 'Lampe', materials: [{ name: 'Steel' }], image_url: 'https://img/p.png',
    },
    batch: { serial_number: 'SN-1', description_override: 'Batch desc' },
    supply_chain: [{ step: 1, location: 'Berlin', country: 'DE', description: 'Assembly', process_type: 'assembly', emissions_kg: '12' }],
    components: [],
    ...overrides,
  }
}

describe('20261001i SQL stays in sync with src/types/visibility.ts', () => {
  const jsonBlocks = [...MIGRATION.matchAll(/\$json\$([\s\S]*?)\$json\$/g)].map((m) => JSON.parse(m[1]))

  it('embeds the V3 defaults unchanged', () => {
    expect(jsonBlocks[0]).toEqual(defaultVisibilityConfigV3.fields)
  })

  it('embeds the V2 defaults unchanged', () => {
    expect(jsonBlocks[1]).toEqual(defaultVisibilityConfigV2.fields)
  })

  it('maps every visibility field to columns or a dedicated rule (no silent drops)', () => {
    const columnsJson = MIGRATION.match(/_dpp_field_columns\(\)[\s\S]*?SELECT '(\{[\s\S]*?\})'::jsonb/)
    expect(columnsJson).not.toBeNull()
    const mapped = Object.keys(JSON.parse(columnsJson![1]))
    const special = ['gtin', 'serialNumber', 'supplyChainSimple', 'supplyChainFull', 'supplyChainProcessType',
      'supplyChainTransport', 'supplyChainEmissions', 'supplyChainCost', 'setComponents', 'supportWarranty',
      'supportFaq', 'supportVideos', 'supportRepair', 'supportSpareParts']
    const all = new Set([...Object.keys(defaultVisibilityConfigV3.fields), ...fieldDefinitions.map((f) => f.key)])
    const unhandled = [...all].filter((k) => !mapped.includes(k) && !special.includes(k))
    expect(unhandled).toEqual([])
  })
})

describe('public DPP services', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('calls get_public_dpp_product with GTIN candidates and the view', async () => {
    anonRpcMock.mockResolvedValue({ data: payload(), error: null })
    const result = await getPublicDppProduct('04006381333931', 'SN-1', 'customs')
    expect(anonRpcMock).toHaveBeenCalledWith('get_public_dpp_product', {
      p_gtins: expect.arrayContaining(['04006381333931', '4006381333931']),
      p_serial: 'SN-1',
      p_view: 'customs',
    })
    expect(result?.tenantId).toBe(TENANT_ID)
    expect(result?.product.description).toBe('Batch desc')
    expect(result?.product.supplyChain).toEqual([expect.objectContaining({ step: 1, processType: 'assembly', emissionsKg: 12 })])
    expect(result?.product.manufacturer).toBe('')
    expect(result?.product.customsValue).toBeUndefined()
  })

  it('never forwards an unknown view to the server', async () => {
    anonRpcMock.mockResolvedValue({ data: null, error: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await getPublicDppProduct('4006381333931', 'SN-1', 'internal' as any)
    expect(anonRpcMock.mock.calls[0][1].p_view).toBe('consumer')
  })

  it('returns null for not found, RPC errors and oversized serials', async () => {
    anonRpcMock.mockResolvedValueOnce({ data: null, error: null })
    expect(await getPublicDppProduct('4006381333931', 'NOPE')).toBeNull()
    anonRpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
    expect(await getPublicDppProduct('4006381333931', 'SN-1')).toBeNull()
    expect(await getPublicDppProduct('4006381333931', 'x'.repeat(201))).toBeNull()
    expect(anonRpcMock).toHaveBeenCalledTimes(2)
  })

  it('maps set components only for set products', () => {
    const comp = { id: 'c1', parent_product_id: 'p1', component_product_id: 'p2', quantity: 2, sort_order: 0,
      component_product: { id: 'p2', name: 'Comp', gtin: '1', materials: [{ name: 'Wood' }] } }
    const single = transformPublicDppPayload(payload({ components: [comp] }))
    expect(single?.product.components).toBeUndefined()
    const set = transformPublicDppPayload(payload({
      product: { ...payload().product, product_type: 'set' }, components: [comp],
    }))
    expect(set?.product.components?.[0]).toEqual(expect.objectContaining({
      quantity: 2, componentProduct: expect.objectContaining({ name: 'Comp', netWeight: undefined }),
    }))
    expect(set?.product.components?.[0]).not.toHaveProperty('notes', expect.anything())
  })

  it('getPublicVisibilitySettings returns the server-resolved map', async () => {
    const fields = { ...defaultVisibilityConfigV3.fields, hsCode: { consumer: true, customs: true } }
    anonRpcMock.mockResolvedValue({ data: payload({ visibility: { version: 3, fields } }), error: null })
    const v = await getPublicVisibilitySettings('4006381333931', 'SN-1')
    expect(v.fields.hsCode).toEqual({ consumer: true, customs: true })
  })

  it('resolves the tenant once per gtin/serial for layout lookups', async () => {
    anonRpcMock.mockResolvedValue({ data: { tenant_id: TENANT_ID, product_id: 'p1', batch_id: null }, error: null })
    tenantByIdMock.mockResolvedValue({ id: TENANT_ID, name: 'Acme', slug: 'acme', settings: { dppDesign: { preset: 'ocean' } } })
    expect(await resolvePublicDppTenantId('4006381339999', 'S-9')).toBe(TENANT_ID)
    expect(await getPublicTenantDPPDesign('4006381339999', 'S-9')).toEqual({ preset: 'ocean' })
    const resolveCalls = anonRpcMock.mock.calls.filter((c) => c[0] === 'resolve_public_dpp_product')
    expect(resolveCalls).toHaveLength(1)
    expect(resolveCalls[0][1]).toEqual({ p_gtins: expect.arrayContaining(['4006381339999']), p_serial: 'S-9' })
  })
})

describe('usePublicProduct (route data path)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    ['/p/:gtin/:serial consumer', '4006381333931', 'consumer' as const],
    ['/01/:gtin/21/:serial customs', '04006381333931', 'customs' as const],
  ])('%s loads product, visibility and tenant settings via RPCs only', async (_label, gtin, view) => {
    anonRpcMock.mockResolvedValue({ data: payload({ view }), error: null })
    tenantByIdMock.mockResolvedValue({
      id: TENANT_ID, name: 'Acme', slug: 'acme',
      settings: { qrCode: { dppTemplateCustomer: 'classic', dppTemplateCustoms: 'government' }, dppDesign: { preset: 'forest' } },
    })
    const { result } = renderHook(() => usePublicProduct(gtin, 'SN-1', view))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(anonRpcMock).toHaveBeenCalledWith('get_public_dpp_product', expect.objectContaining({ p_view: view, p_serial: 'SN-1' }))
    expect(tenantByIdMock).toHaveBeenCalledWith(TENANT_ID)
    expect(result.current.product?.name).toBe('Lampe')
    expect(result.current.tenantId).toBe(TENANT_ID)
    expect(result.current.visibilityV2?.version).toBe(3)
    expect(result.current.dppTemplateCustomer).toBe('classic')
    expect(result.current.dppTemplateCustoms).toBe('government')
    expect(result.current.dppDesign).toEqual({ preset: 'forest' })
  })

  it('renders not-found state when the RPC finds nothing', async () => {
    anonRpcMock.mockResolvedValue({ data: null, error: null })
    const { result } = renderHook(() => usePublicProduct('4006381333931', 'NOPE'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.product).toBeNull()
    expect(tenantByIdMock).not.toHaveBeenCalled()
  })
})
