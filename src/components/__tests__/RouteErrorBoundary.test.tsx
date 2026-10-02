import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Link, Outlet } from 'react-router-dom'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { ErrorFallbackContent } from '@/components/ErrorBoundary'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))

let shouldThrow = true

function Boom(): never {
  throw new Error('secret internals: relation "rh_returns" does not exist')
}

function MaybeBoom() {
  if (shouldThrow) throw new Error('flaky render')
  return <p>recovered content</p>
}

function Layout() {
  return (
    <div>
      <nav>
        <Link to="/ok">go ok</Link>
      </nav>
      <RouteErrorBoundary name="test" variant="section">
        <Outlet />
      </RouteErrorBoundary>
    </div>
  )
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="boom" element={<Boom />} />
          <Route path="maybe" element={<MaybeBoom />} />
          <Route path="ok" element={<p>ok page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RouteErrorBoundary', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    shouldThrow = true
    // React logs caught render errors; keep the test output readable.
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleError.mockRestore()
    vi.unstubAllEnvs()
  })

  it('renders the fallback inside the layout and keeps the layout usable', () => {
    renderAt('/boom')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    // Layout chrome (navigation) survives the page crash.
    expect(screen.getByRole('link', { name: 'go ok' })).toBeInTheDocument()
  })

  it('logs the error with the boundary name', () => {
    renderAt('/boom')
    expect(
      consoleError.mock.calls.some((args: unknown[]) => String(args[0]).includes('[RouteErrorBoundary:test]')),
    ).toBe(true)
  })

  it('resets when the pathname changes', () => {
    renderAt('/boom')
    fireEvent.click(screen.getByRole('link', { name: 'go ok' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByText('ok page')).toBeInTheDocument()
  })

  it('"Try again" re-renders the children', () => {
    renderAt('/maybe')
    expect(screen.getByRole('alert')).toBeInTheDocument()
    shouldThrow = false
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('recovered content')).toBeInTheDocument()
  })
})

describe('ErrorFallbackContent', () => {
  it('shows the raw error message in development builds', () => {
    render(<ErrorFallbackContent error={new Error('detail-xyz')} onRetry={() => {}} />)
    expect(screen.getByTestId('error-details')).toHaveTextContent('detail-xyz')
  })

  it('hides the raw error message in production builds', async () => {
    vi.stubEnv('DEV', false)
    vi.resetModules()
    const mod = await import('@/components/ErrorBoundary')
    render(<mod.ErrorFallbackContent error={new Error('detail-xyz')} onRetry={() => {}} />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.queryByTestId('error-details')).toBeNull()
    expect(screen.queryByText('detail-xyz')).toBeNull()
    vi.unstubAllEnvs()
  })

  it('section variant does not take the full screen', () => {
    render(<ErrorFallbackContent error={null} onRetry={() => {}} variant="section" />)
    expect(screen.getByRole('alert').className).not.toContain('min-h-screen')
  })
})
