import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from './Login'
import { renderWithProviders } from '../../test/render'

// Mock AuthContext
const mockLogin = vi.fn()
vi.mock('../../context/AuthContext', async () => {
  const actual = await vi.importActual('../../context/AuthContext')
  return {
    ...actual,
    useAuth: () => ({
      login: mockLogin,
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      isGuest: false,
      register: vi.fn(),
      logout: vi.fn(),
      loginAsGuest: vi.fn(),
      upgradeAccount: vi.fn(),
    }),
  }
})

// Mock loginWithGoogle
const mockLoginWithGoogle = vi.fn()
vi.mock('../../api/auth', () => ({
  loginWithGoogle: () => mockLoginWithGoogle(),
}))

describe('Login', () => {
  const onSwitchToRegister = vi.fn()
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderLogin() {
    return renderWithProviders(<Login onSwitchToRegister={onSwitchToRegister} />)
  }

  it('renders email and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('renders sign in button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders google login button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
  })

  it('toggles password visibility', async () => {
    renderLogin()
    const passwordInput = screen.getByLabelText(/password/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    // Find the toggle button (it's the button inside the password field area)
    const toggleButton = passwordInput.parentElement!.querySelector('button')!
    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')

    await user.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('calls login on form submit', async () => {
    mockLogin.mockResolvedValue(undefined)
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'MyPassword123!')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'MyPassword123!',
    })
  })

  it('shows error on login failure', async () => {
    const { ApiError } = await import('../../api/client')
    const error = new ApiError('Unauthorized', 401, 'Bad credentials')
    mockLogin.mockRejectedValue(error)
    renderLogin()

    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Bad credentials')).toBeInTheDocument()
  })

  it('calls onSwitchToRegister when clicking register link', async () => {
    renderLogin()
    await user.click(screen.getByRole('button', { name: /create an account/i }))
    expect(onSwitchToRegister).toHaveBeenCalled()
  })

  it('calls loginWithGoogle when clicking google button', async () => {
    renderLogin()
    await user.click(screen.getByRole('button', { name: /google/i }))
    expect(mockLoginWithGoogle).toHaveBeenCalled()
  })
})
