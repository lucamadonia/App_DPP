import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { Package, PackageOpen, Users, MessageSquareText, BarChart3, Wrench } from 'lucide-react'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

import { EmptyState } from './state-feedback'

/** The illustrations are aria-hidden, so they are unreachable by role. */
function illustrationSources(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '')
}

const MOTIFS = ['packages', 'customers', 'tickets', 'reports', 'workflows', 'settings', 'search']

describe('EmptyState illustrations', () => {
  it('derives the motif from the icon the caller passes', () => {
    // Act
    const { container } = render(<EmptyState icon={Package} title="No products" />)

    // Assert — one light and one dark file, CSS decides which is visible
    expect(illustrationSources(container)).toEqual([
      '/images/empty-states/packages-light.webp',
      '/images/empty-states/packages-dark.webp',
    ])
  })

  it('maps related icons onto a shared motif so sibling screens match', () => {
    // Arrange / Act
    const open = render(<EmptyState icon={PackageOpen} title="No shipments" />)
    const users = render(<EmptyState icon={Users} title="No customers" />)
    const tickets = render(<EmptyState icon={MessageSquareText} title="No tickets" />)

    // Assert
    expect(illustrationSources(open.container)[0]).toContain('packages')
    expect(illustrationSources(users.container)[0]).toContain('customers')
    expect(illustrationSources(tickets.container)[0]).toContain('tickets')
  })

  /**
   * The regression this whole file exists for. Motifs are keyed by Lucide
   * `displayName`, which is not always the imported name: BarChart3 resolves
   * to "ChartColumn". A wrong key fails silently back to the glyph tile, so
   * nothing would look broken — the illustrations would just never appear.
   */
  it('resolves icons whose displayName differs from the imported alias', () => {
    // Arrange — guard the assumption itself, not just its consequence
    expect((BarChart3 as { displayName?: string }).displayName).toBe('ChartColumn')

    // Act
    const { container } = render(<EmptyState icon={BarChart3} title="No data" />)

    // Assert
    expect(illustrationSources(container)[0]).toBe('/images/empty-states/reports-light.webp')
  })

  it('falls back to the glyph tile for icons without a motif', () => {
    // Act — Wrench is deliberately unmapped: a new screen must still render
    const { container } = render(<EmptyState icon={Wrench} title="Nothing here" />)

    // Assert
    expect(illustrationSources(container)).toHaveLength(0)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('lets a caller force the glyph tile with illustration={false}', () => {
    // Act
    const { container } = render(
      <EmptyState icon={Package} title="No results" illustration={false} />,
    )

    // Assert
    expect(illustrationSources(container)).toHaveLength(0)
  })

  it('lets a caller override the motif the icon would pick', () => {
    // Act
    const { container } = render(
      <EmptyState icon={Package} title="No replies" illustration="tickets" />,
    )

    // Assert
    expect(illustrationSources(container)[0]).toBe('/images/empty-states/tickets-light.webp')
  })

  it('ships both theme files for every motif', () => {
    // Assert — catches a motif added in code without its artwork
    for (const motif of MOTIFS) {
      for (const theme of ['light', 'dark']) {
        const file = resolve(__dirname, `../../../public/images/empty-states/${motif}-${theme}.webp`)
        expect(existsSync(file), `missing ${motif}-${theme}.webp`).toBe(true)
      }
    }
  })
})
