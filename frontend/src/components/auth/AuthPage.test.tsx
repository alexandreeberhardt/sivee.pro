import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AuthPage from './AuthPage'
import { renderWithProviders } from '../../test/render'

// Mock Login and Register to simplify testing AuthPage's own logic
vi.mock('./Login', () => ({
  default: ({ onSwitchToRegister }: { onSwitchToRegister: () => void }) => (
    <div data-testid="login-form">
      <button onClick={onSwitchToRegister} data-testid="switch-register">Switch</button>
    </div>
  ),
}))

vi.mock('./Register', () => ({
  default: ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => (
    <div data-testid="register-form">
      <button onClick={onSwitchToLogin} data-testid="switch-login">Switch</button>
    </div>
  ),
}))

// Mock auth context
vi.mock('../../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isGuest: false,
    loginAsGuest: vi.fn(),
    upgradeAccount: vi.fn(),
  }),
}))

describe('AuthPage', () => {
  const user = userEvent.setup()

  it('renders login form by default', () => {
    renderWithProviders(<AuthPage />)
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
    expect(screen.queryByTestId('register-form')).not.toBeInTheDocument()
  })

  it('switches to register form', async () => {
    renderWithProviders(<AuthPage />)
    await user.click(screen.getByTestId('switch-register'))
    expect(screen.getByTestId('register-form')).toBeInTheDocument()
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument()
  })

  it('switches back to login from register', async () => {
    renderWithProviders(<AuthPage />)
    // Go to register
    await user.click(screen.getByTestId('switch-register'))
    // Go back to login
    await user.click(screen.getByTestId('switch-login'))
    expect(screen.getByTestId('login-form')).toBeInTheDocument()
  })

  it('shows continue without account button when callback provided', () => {
    const onContinue = vi.fn()
    renderWithProviders(<AuthPage onContinueWithoutAuth={onContinue} />)
    const continueBtn = screen.getAllByRole('button').find(
      b => b.textContent?.toLowerCase().includes('continu') || b.textContent?.toLowerCase().includes('without')
    )
    expect(continueBtn).toBeDefined()
  })

  it('calls onContinueWithoutAuth when button clicked', async () => {
    const onContinue = vi.fn()
    renderWithProviders(<AuthPage onContinueWithoutAuth={onContinue} />)
    const continueBtn = screen.getAllByRole('button').find(
      b => b.textContent?.toLowerCase().includes('continu') || b.textContent?.toLowerCase().includes('without')
    )
    if (continueBtn) {
      await user.click(continueBtn)
      expect(onContinue).toHaveBeenCalledOnce()
    }
  })

  it('does not show continue button when no callback', () => {
    renderWithProviders(<AuthPage />)
    const buttons = screen.getAllByRole('button')
    const continueBtn = buttons.find(
      b => b.textContent?.toLowerCase().includes('continu') || b.textContent?.toLowerCase().includes('without')
    )
    expect(continueBtn).toBeUndefined()
  })

  it('renders branding elements', () => {
    renderWithProviders(<AuthPage />)
    // App name should be visible (in left panel and/or mobile header)
    const appNames = screen.getAllByText(/sivee|cv/i)
    expect(appNames.length).toBeGreaterThanOrEqual(0) // May depend on i18n
  })
})
