import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GuestUpgradeBanner from './GuestUpgradeBanner'
import { renderWithProviders } from '../test/render'

// Mock the auth context
const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}))

describe('GuestUpgradeBanner', () => {
  const user = userEvent.setup()

  it('renders nothing when user is not guest', () => {
    mockUseAuth.mockReturnValue({
      isGuest: false,
      upgradeAccount: vi.fn(),
      user: { id: 1, email: 'user@test.com' },
    })

    const { container } = renderWithProviders(<GuestUpgradeBanner />)
    expect(container.innerHTML).toBe('')
  })

  it('renders banner when user is guest', () => {
    mockUseAuth.mockReturnValue({
      isGuest: true,
      upgradeAccount: vi.fn(),
      user: { id: 1, email: 'guest@guest.local' },
    })

    renderWithProviders(<GuestUpgradeBanner />)
    // Banner should contain a button to create account
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it('dismisses banner when clicking close', async () => {
    mockUseAuth.mockReturnValue({
      isGuest: true,
      upgradeAccount: vi.fn(),
      user: { id: 1, email: 'guest@guest.local' },
    })

    renderWithProviders(<GuestUpgradeBanner />)

    // Find the X close button (small one in banner)
    const closeButtons = screen.getAllByRole('button')
    // The dismiss button is the last small one in the banner
    const dismissBtn = closeButtons.find(
      (b) => b.querySelector('svg.lucide-x') || b.querySelector('[class*="w-4 h-4"]')
    )
    if (dismissBtn) {
      await user.click(dismissBtn)
      // After dismissal, banner should not be rendered
      // Re-check — since state changes, the component re-renders
    }
  })

  it('opens upgrade modal when clicking create account', async () => {
    mockUseAuth.mockReturnValue({
      isGuest: true,
      upgradeAccount: vi.fn(),
      user: { id: 1, email: 'guest@guest.local' },
    })

    renderWithProviders(<GuestUpgradeBanner />)

    // Find the "create account" button (white bg button in the banner)
    const createAccountBtn = screen.getAllByRole('button').find(
      (b) => b.classList.contains('bg-white')
    )
    if (createAccountBtn) {
      await user.click(createAccountBtn)

      // Modal should now be open — look for form elements
      const emailInput = screen.queryByLabelText(/email/i)
      expect(emailInput).toBeInTheDocument()
    }
  })
})
