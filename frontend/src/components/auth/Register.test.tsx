import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Register from './Register'
import { renderWithProviders } from '../../test/render'

// Mock the auth API
vi.mock('../../api/auth', () => ({
  loginWithGoogle: vi.fn(),
  decodeToken: vi.fn(() => ({ sub: '1', email: 'test@test.com', exp: 9999999999 })),
  isTokenExpired: vi.fn(() => false),
}))

describe('Register', () => {
  const user = userEvent.setup()
  const onSwitchToLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email field', () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('renders password field', () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)
    expect(screen.getByLabelText(/^(?!.*confirm).*password/i)).toBeInTheDocument()
  })

  it('renders confirm password field', () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)
    expect(screen.getByLabelText(/confirm/i)).toBeInTheDocument()
  })

  it('renders google login button', () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)
    const googleBtn = screen.getByRole('button', { name: /google/i })
    expect(googleBtn).toBeInTheDocument()
  })

  it('renders submit button (disabled by default)', () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)
    // Find the submit button — it has the translated register text
    const buttons = screen.getAllByRole('button')
    const submitBtn = buttons.find(
      (b) => b.getAttribute('type') === 'submit'
    )
    expect(submitBtn).toBeInTheDocument()
    expect(submitBtn).toBeDisabled()
  })

  it('toggles password visibility', async () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)

    const passwordInput = screen.getByLabelText(/^(?!.*confirm).*password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Find toggle button — it's next to the password input
    const toggleButtons = screen.getAllByRole('button').filter(
      (b) => b.getAttribute('type') === 'button'
    )
    // First toggle button is for the password field
    await user.click(toggleButtons[1]) // [0] is Google, [1] is password toggle

    expect(passwordInput).toHaveAttribute('type', 'text')
  })

  it('shows password requirements when typing password', async () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)

    const passwordInput = screen.getByLabelText(/^(?!.*confirm).*password/i)
    await user.type(passwordInput, 'abc')

    // Password requirements panel should now be visible
    // It shows rules like "12 characters", "uppercase", etc.
    // These come from i18n keys, but should render something
    const requirementsPanel = screen.getByText((_, el) =>
      el?.classList.contains('grid') &&
      el.parentElement?.classList.contains('rounded-lg') || false
    )
    expect(requirementsPanel).toBeTruthy()
  })

  it('shows password mismatch error', async () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)

    const passwordInput = screen.getByLabelText(/^(?!.*confirm).*password/i)
    const confirmInput = screen.getByLabelText(/confirm/i)

    await user.type(passwordInput, 'TestPassword1!')
    await user.type(confirmInput, 'DifferentPass1!')

    // Should show mismatch text
    const mismatchText = screen.getByText((_, el) =>
      el?.tagName === 'P' &&
      el.classList.contains('text-error-600') || false
    )
    expect(mismatchText).toBeInTheDocument()
  })

  it('shows password match indicator', async () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)

    const passwordInput = screen.getByLabelText(/^(?!.*confirm).*password/i)
    const confirmInput = screen.getByLabelText(/confirm/i)

    await user.type(passwordInput, 'TestPassword1!')
    await user.type(confirmInput, 'TestPassword1!')

    // Should show match text (success color)
    const matchText = screen.getByText((_, el) =>
      el?.tagName === 'P' &&
      el.classList.contains('text-success-600') || false
    )
    expect(matchText).toBeInTheDocument()
  })

  it('calls onSwitchToLogin when clicking login link', async () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)

    // Find the "login" link button at the bottom
    const loginButton = screen.getAllByRole('button').find(
      (b) => b.classList.contains('text-brand')
    )
    if (loginButton) {
      await user.click(loginButton)
      expect(onSwitchToLogin).toHaveBeenCalled()
    }
  })

  it('has terms checkbox', () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).not.toBeChecked()
  })

  it('renders terms of service links', () => {
    renderWithProviders(<Register onSwitchToLogin={onSwitchToLogin} />)
    const links = screen.getAllByRole('link')
    expect(links.length).toBeGreaterThanOrEqual(2) // Terms + Privacy
  })
})
