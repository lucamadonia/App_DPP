import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return key.replace('{{count}}', String(opts.count))
      if (opts?.plan) return key.replace('{{plan}}', String(opts.plan))
      if (opts?.percent !== undefined) return key.replace('{{percent}}', String(opts.percent))
      return key
    },
    i18n: { language: 'en' },
  }),
}))

import { PlanCard } from './PlanCard'

describe('PlanCard', () => {
  const onSelect = vi.fn()

  it('renders Free plan with correct price and limits', () => {
    // Act
    render(<PlanCard plan="free" currentPlan="free" onSelect={onSelect} />)

    // Assert - use getAllByText since "Free" may appear multiple times (plan name + price)
    const freeTexts = screen.getAllByText('Free')
    expect(freeTexts.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Get started with the basics')).toBeInTheDocument()
    expect(screen.getByText('Current Plan')).toBeInTheDocument()
    expect(screen.getByText('5 Products')).toBeInTheDocument()
    expect(screen.getByText('1 Admin Users')).toBeInTheDocument()
    expect(screen.getByText('3 AI Credits/month')).toBeInTheDocument()
  })

  it('renders Pro plan with upgrade button when on free', () => {
    // Act
    render(<PlanCard plan="pro" currentPlan="free" onSelect={onSelect} />)

    // Assert
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('For growing businesses')).toBeInTheDocument()
    // Monthly price for Pro is 49
    expect(screen.getByText('€49')).toBeInTheDocument()
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument()
    expect(screen.getByText('50 Products')).toBeInTheDocument()
    expect(screen.getByText('Custom Branding')).toBeInTheDocument()
  })

  it('renders Enterprise plan with all features', () => {
    // Act
    render(<PlanCard plan="enterprise" currentPlan="free" onSelect={onSelect} />)

    // Assert
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
    expect(screen.getByText('For large-scale operations')).toBeInTheDocument()
    expect(screen.getByText('€149')).toBeInTheDocument()
    expect(screen.getByText('Full White-Label')).toBeInTheDocument()
    expect(screen.getByText('Full Compliance Access')).toBeInTheDocument()
  })

  it('shows "Current Plan" button when plan matches current', () => {
    // Act
    render(<PlanCard plan="pro" currentPlan="pro" onSelect={onSelect} />)

    // Assert
    const button = screen.getByText('Current Plan')
    expect(button).toBeInTheDocument()
    expect(button.closest('button')).toBeDisabled()
  })

  it('shows "Downgrade" button when viewing lower plan', () => {
    // Act
    render(<PlanCard plan="free" currentPlan="pro" onSelect={onSelect} />)

    // Assert
    expect(screen.getByText('Downgrade')).toBeInTheDocument()
  })

  it('calls onSelect with plan when upgrade button clicked', async () => {
    // Arrange
    const handleSelect = vi.fn()
    const user = userEvent.setup()

    // Act
    render(<PlanCard plan="pro" currentPlan="free" onSelect={handleSelect} />)
    await user.click(screen.getByText('Upgrade to Pro'))

    // Assert
    expect(handleSelect).toHaveBeenCalledWith('pro')
  })

  it('calls onSelect with plan when downgrade button clicked', async () => {
    // Arrange
    const handleSelect = vi.fn()
    const user = userEvent.setup()

    // Act
    render(<PlanCard plan="free" currentPlan="enterprise" onSelect={handleSelect} />)
    await user.click(screen.getByText('Downgrade'))

    // Assert
    expect(handleSelect).toHaveBeenCalledWith('free')
  })

  it('disables upgrade button when isLoading', () => {
    // Act
    render(<PlanCard plan="pro" currentPlan="free" onSelect={onSelect} isLoading />)

    // Assert
    expect(screen.getByText('Upgrade to Pro').closest('button')).toBeDisabled()
  })

  it('shows "Most Popular" badge on Pro plan', () => {
    // Act
    render(<PlanCard plan="pro" currentPlan="free" onSelect={onSelect} />)

    // Assert
    expect(screen.getByText('Most Popular')).toBeInTheDocument()
  })

  it('shows "Full Power" badge on Enterprise plan', () => {
    // Act
    render(<PlanCard plan="enterprise" currentPlan="free" onSelect={onSelect} />)

    // Assert
    expect(screen.getByText('Full Power')).toBeInTheDocument()
  })

  it('shows yearly savings message with yearly interval', () => {
    // Act
    render(<PlanCard plan="pro" currentPlan="free" onSelect={onSelect} interval="yearly" />)

    // Assert
    expect(screen.getByText('Save 20% annually')).toBeInTheDocument()
    // Yearly price: 468/12 = 39
    expect(screen.getByText('€39')).toBeInTheDocument()
  })
})
