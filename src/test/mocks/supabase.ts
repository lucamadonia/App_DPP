/**
 * Supabase Client Mock for Service-Layer Tests
 *
 * Provides a chainable mock that mirrors the Supabase PostgREST query builder.
 * Each test can configure the mock's return values via mockResolvedData/mockResolvedError.
 */
import { vi } from 'vitest'

// Chainable query builder mock - each method returns `this` to support chaining
function createQueryBuilder(resolvedValue: { data: unknown; error: unknown; count?: number | null } = { data: null, error: null }) {
  const builder: Record<string, unknown> = {}
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike',
    'in', 'is', 'or', 'and', 'not', 'filter',
    'order', 'range', 'limit', 'offset',
    'single', 'maybeSingle',
    'head',
  ]

  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder)
  }

  // Terminal: when awaited, return the resolved value
  builder.then = (resolve: (val: unknown) => void) => {
    resolve(resolvedValue)
    return builder
  }

  return builder
}

// Store per-table resolved values so tests can configure them
const tableResolvedValues = new Map<string, { data: unknown; error: unknown; count?: number | null }>()

export function mockSupabaseTable(table: string, value: { data: unknown; error: unknown; count?: number | null }) {
  tableResolvedValues.set(table, value)
}

export function clearSupabaseMocks() {
  tableResolvedValues.clear()
  mockAuthResponses.clear()
}

// Auth mock responses
const mockAuthResponses = new Map<string, unknown>()

export function mockSupabaseAuth(method: string, response: unknown) {
  mockAuthResponses.set(method, response)
}

// Create the mock supabase auth object
const authMethods = [
  'signInWithPassword', 'signUp', 'signOut', 'signInWithOAuth', 'signInWithOtp',
  'verifyOtp', 'resetPasswordForEmail', 'updateUser', 'getUser', 'getSession',
  'onAuthStateChange',
]

const mockAuth: Record<string, ReturnType<typeof vi.fn>> = {}

for (const method of authMethods) {
  if (method === 'onAuthStateChange') {
    // onAuthStateChange is synchronous in the real Supabase client
    mockAuth[method] = vi.fn(() => {
      const configured = mockAuthResponses.get(method)
      if (configured) return configured
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
  } else {
    mockAuth[method] = vi.fn(async () => {
      const configured = mockAuthResponses.get(method)
      if (configured) return configured
      // Default returns
      if (method === 'getUser') return { data: { user: null }, error: null }
      if (method === 'getSession') return { data: { session: null }, error: null }
      if (method === 'signOut') return { error: null }
      return { data: { user: null, session: null }, error: null }
    })
  }
}

// Mock functions invoke
const mockFunctions = {
  invoke: vi.fn(async () => ({ data: null, error: null })),
}

// Mock storage
const mockStorage = {
  from: vi.fn(() => ({
    upload: vi.fn(async () => ({ data: null, error: null })),
    download: vi.fn(async () => ({ data: null, error: null })),
    getPublicUrl: vi.fn(() => ({ data: { publicUrl: '' } })),
  })),
}

// The main mock supabase client
export const mockSupabase = {
  from: vi.fn((table: string) => {
    const configured = tableResolvedValues.get(table)
    return createQueryBuilder(configured || { data: null, error: null })
  }),
  auth: mockAuth,
  functions: mockFunctions,
  storage: mockStorage,
}

// The mock for supabaseAnon (same API, separate instance)
export const mockSupabaseAnon = {
  from: vi.fn((table: string) => {
    const configured = tableResolvedValues.get(table)
    return createQueryBuilder(configured || { data: null, error: null })
  }),
  auth: mockAuth,
  storage: mockStorage,
}

// Mock getCurrentTenantId
export const mockGetCurrentTenantId = vi.fn(async () => 'test-tenant-id')
