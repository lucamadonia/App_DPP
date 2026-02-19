import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { CreditBalance as CreditBalanceType } from '@/types/billing'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return key.replace('{{count}}', String(opts.count))
      return key
    },
    i18n: { language: 'en' },
  }),
}))

import { CreditBadge, CreditBalanceCard } from './CreditBalance'

describe('CreditBadge', () => {
  it('displays total available credits', () => {
    // Arrange
    const credits: CreditBalanceType = {
      monthlyAllowance: 25,
      monthlyUsed: 5,
      monthlyResetAt: null,
      purchasedBalance: 10,
      totalAvailable: 30,
    }

    // Act
    render(<CreditBadge credits={credits} />)

    // Assert
    expect(screen.getByText('30')).toBeInTheDocument()
    expect(screen.getByText('Credits')).toBeInTheDocument()
  })

  it('shows destructive styling when credits are empty', () => {
    // Arrange
    const credits: CreditBalanceType = {
      monthlyAllowance: 3,
      monthlyUsed: 3,
      monthlyResetAt: null,
      purchasedBalance: 0,
      totalAvailable: 0,
    }

    // Act
    const { container } = render(<CreditBadge credits={credits} />)

    // Assert
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(container.querySelector('button')).toHaveClass('text-destructive')
  })

  it('shows warning styling when credits are low (1-3)', () => {
    // Arrange
    const credits: CreditBalanceType = {
      monthlyAllowance: 25,
      monthlyUsed: 24,
      monthlyResetAt: null,
      purchasedBalance: 0,
      totalAvailable: 1,
    }

    // Act
    const { container } = render(<CreditBadge credits={credits} />)

    // Assert
    expect(screen.getByText('1')).toBeInTheDocument()
    // Low credit state uses amber color
    const button = container.querySelector('button')
    expect(button?.className).toContain('text-amber')
  })

  it('shows normal styling when credits are sufficient', () => {
    // Arrange
    const credits: CreditBalanceType = {
      monthlyAllowance: 25,
      monthlyUsed: 0,
      monthlyResetAt: null,
      purchasedBalance: 50,
      totalAvailable: 75,
    }

    // Act
    const { container } = render(<CreditBadge credits={credits} />)

    // Assert
    const button = container.querySelector('button')
    expect(button).not.toHaveClass('text-destructive')
    expect(button?.className).not.toContain('text-amber')
  })

  it('calls onClick when clicked', async () => {
    // Arrange
    const handleClick = vi.fn()
    const user = userEvent.setup()
    const credits: CreditBalanceType = {
      monthlyAllowance: 25, monthlyUsed: 0, monthlyResetAt: null,
      purchasedBalance: 0, totalAvailable: 25,
    }

    // Act
    render(<CreditBadge credits={credits} onClick={handleClick} />)
    await user.click(screen.getByRole('button'))

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})

describe('CreditBalanceCard', () => {
  const onPurchase = vi.fn()

  it('displays total available credits prominently', () => {
    // Arrange
    const credits: CreditBalanceType = {
      monthlyAllowance: 25,
      monthlyUsed: 10,
      monthlyResetAt: null,
      purchasedBalance: 30,
      totalAvailable: 45,
    }

    // Act
    render(<CreditBalanceCard credits={credits} onPurchase={onPurchase} />)

    // Assert
    expect(screen.getByText('45')).toBeInTheDocument()
    expect(screen.getByText('AI Credits')).toBeInTheDocument()
  })

  it('shows monthly usage breakdown', () => {
    // Arrange
    const credits: CreditBalanceType = {
      monthlyAllowance: 25,
      monthlyUsed: 10,
      monthlyResetAt: null,
      purchasedBalance: 0,
      totalAvailable: 15,
    }

    // Act
    render(<CreditBalanceCard credits={credits} onPurchase={onPurchase} />)

    // Assert
    expect(screen.getByText('10 / 25 used')).toBeInTheDocument()
    expect(screen.getByText('15 monthly credits remaining')).toBeInTheDocument()
  })

  it('shows monthly credits used up message when exhausted', () => {
    // Arrange
    const credits: CreditBalanceType = {
      monthlyAllowance: 3,
      monthlyUsed: 3,
      monthlyResetAt: null,
      purchasedBalance: 10,
      totalAvailable: 10,
    }

    // Act
    render(<CreditBalanceCard credits={credits} onPurchase={onPurchase} />)

    // Assert
    expect(screen.getByText('Monthly credits used up')).toBeInTheDocument()
  })

  it('displays purchased credits balance', () => {
    // Arrange
    const credits: CreditBalanceType = {
      monthlyAllowance: 25,
      monthlyUsed: 0,
      monthlyResetAt: null,
      purchasedBalance: 200,
      totalAvailable: 225,
    }

    // Act
    render(<CreditBalanceCard credits={credits} onPurchase={onPurchase} />)

    // Assert
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('Purchased Credits')).toBeInTheDocument()
    expect(screen.getByText('Never expire')).toBeInTheDocument()
  })

  it('calls onPurchase when Buy Credits button is clicked', async () => {
    // Arrange
    const handlePurchase = vi.fn()
    const user = userEvent.setup()
    const credits: CreditBalanceType = {
      monthlyAllowance: 3, monthlyUsed: 3, monthlyResetAt: null,
      purchasedBalance: 0, totalAvailable: 0,
    }

    // Act
    render(<CreditBalanceCard credits={credits} onPurchase={handlePurchase} />)
    await user.click(screen.getByText('Buy Credits'))

    // Assert
    expect(handlePurchase).toHaveBeenCalledTimes(1)
  })

  it('renders with zero credits', () => {
    // Arrange
    const credits: CreditBalanceType = {
      monthlyAllowance: 0,
      monthlyUsed: 0,
      monthlyResetAt: null,
      purchasedBalance: 0,
      totalAvailable: 0,
    }

    // Act
    render(<CreditBalanceCard credits={credits} onPurchase={onPurchase} />)

    // Assert
    expect(screen.getByText('0 / 0 used')).toBeInTheDocument()
  })
})
