import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

import { UpgradePrompt } from './UpgradePrompt'

describe('UpgradePrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders quota variant with warning icon and message', () => {
    // Act
    render(
      <UpgradePrompt variant="quota" message="You have reached your product limit (5/5)" />
    )

    // Assert
    expect(screen.getByText('You have reached your product limit (5/5)')).toBeInTheDocument()
    expect(screen.getByText('View Plans')).toBeInTheDocument()
  })

  it('renders module variant with lock icon', () => {
    // Act
    render(
      <UpgradePrompt variant="module" message="Returns Hub requires a Pro plan" />
    )

    // Assert
    expect(screen.getByText('Returns Hub requires a Pro plan')).toBeInTheDocument()
  })

  it('renders credits variant with sparkles icon', () => {
    // Act
    render(
      <UpgradePrompt variant="credits" message="No AI credits remaining" />
    )

    // Assert
    expect(screen.getByText('No AI credits remaining')).toBeInTheDocument()
  })

  it('renders feature variant with lock icon', () => {
    // Act
    render(
      <UpgradePrompt variant="feature" message="Custom branding requires Pro plan" />
    )

    // Assert
    expect(screen.getByText('Custom branding requires Pro plan')).toBeInTheDocument()
  })

  it('navigates to billing on default action click', async () => {
    // Arrange
    const user = userEvent.setup()
    render(
      <UpgradePrompt variant="quota" message="Limit reached" />
    )

    // Act
    await user.click(screen.getByText('View Plans'))

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('/settings/billing')
  })

  it('calls custom onAction when provided', async () => {
    // Arrange
    const customAction = vi.fn()
    const user = userEvent.setup()
    render(
      <UpgradePrompt
        variant="credits"
        message="Buy more credits"
        onAction={customAction}
        actionLabel="Buy Credits"
      />
    )

    // Act
    await user.click(screen.getByText('Buy Credits'))

    // Assert
    expect(customAction).toHaveBeenCalled()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('uses custom action label when provided', () => {
    // Act
    render(
      <UpgradePrompt variant="module" message="Upgrade needed" actionLabel="Upgrade Now" />
    )

    // Assert
    expect(screen.getByText('Upgrade Now')).toBeInTheDocument()
  })

  it('renders inline variant with compact layout', () => {
    // Act
    render(
      <UpgradePrompt variant="quota" message="Limit reached" inline />
    )

    // Assert
    expect(screen.getByText('Limit reached')).toBeInTheDocument()
    // Inline uses link variant button
    const button = screen.getByText('View Plans')
    expect(button).toBeInTheDocument()
  })

  it('applies custom className', () => {
    // Act
    const { container } = render(
      <UpgradePrompt variant="quota" message="Test" className="my-custom-class" />
    )

    // Assert - the outermost div should have the custom class
    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})
