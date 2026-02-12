import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderHook } from '@testing-library/react'
import { renderWithProviders } from '../test/render'

// Shared state for the mock token store
let storedToken: string | null = null
const mockSetOnUnauthorized = vi.fn()

// Mock the API client
vi.mock('../api/client', () => ({
  getStoredToken: () => storedToken,
  setStoredToken: (t: string) => { storedToken = t },
  removeStoredToken: () => { storedToken = null },
  setOnUnauthorized: (...args: unknown[]) => mockSetOnUnauthorized(...args),
  api: {
    post: vi.fn(),
    get: vi.fn(),
    postForm: vi.fn(),
  },
}))

// Mock the auth API
const mockLoginUser = vi.fn()
const mockRegisterUser = vi.fn()
const mockDecodeToken = vi.fn()
const mockIsTokenExpired = vi.fn()
const mockCreateGuestAccount = vi.fn()
const mockUpgradeGuestAccount = vi.fn()

vi.mock('../api/auth', () => ({
  loginUser: (...args: unknown[]) => mockLoginUser(...args),
  registerUser: (...args: unknown[]) => mockRegisterUser(...args),
  decodeToken: (t: string) => mockDecodeToken(t),
  isTokenExpired: (t: string) => mockIsTokenExpired(t),
  createGuestAccount: () => mockCreateGuestAccount(),
  upgradeGuestAccount: (...args: unknown[]) => mockUpgradeGuestAccount(...args),
}))

// Import after mocks
import { AuthProvider, useAuth } from './AuthContext'

function TestConsumer() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="authenticated">{auth.isAuthenticated ? 'yes' : 'no'}</span>
      <span data-testid="loading">{auth.isLoading ? 'yes' : 'no'}</span>
      <span data-testid="guest">{auth.isGuest ? 'yes' : 'no'}</span>
      <span data-testid="email">{auth.user?.email || 'none'}</span>
      <button data-testid="login" onClick={() => auth.login({ email: 'a@b.com', password: 'pass' })}>Login</button>
      <button data-testid="register" onClick={() => auth.register({ email: 'a@b.com', password: 'pass' })}>Register</button>
      <button data-testid="logout" onClick={auth.logout}>Logout</button>
      <button data-testid="guest-login" onClick={auth.loginAsGuest}>Guest</button>
    </div>
  )
}

describe('AuthContext', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    storedToken = null
    mockIsTokenExpired.mockReturnValue(true)
    mockDecodeToken.mockReturnValue(null)
    window.history.replaceState({}, '', '/')
  })

  it('throws when useAuth is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within an AuthProvider')
    spy.mockRestore()
  })

  it('starts with loading then resolves to not loading', async () => {
    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no')
    })
  })

  it('initializes as unauthenticated with no stored token', async () => {
    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no')
    })
    expect(screen.getByTestId('authenticated').textContent).toBe('no')
    expect(screen.getByTestId('email').textContent).toBe('none')
  })

  it('initializes from stored valid token', async () => {
    storedToken = 'stored-jwt'
    mockIsTokenExpired.mockReturnValue(false)
    mockDecodeToken.mockReturnValue({
      sub: '5',
      email: 'stored@test.com',
      exp: 9999999999,
      is_guest: false,
    })

    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no')
    })
    expect(screen.getByTestId('authenticated').textContent).toBe('yes')
    expect(screen.getByTestId('email').textContent).toBe('stored@test.com')
  })

  it('logs out when stored token is expired', async () => {
    storedToken = 'expired-jwt'
    mockIsTokenExpired.mockReturnValue(true)

    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no')
    })
    expect(screen.getByTestId('authenticated').textContent).toBe('no')
  })

  it('logs out when stored token cannot be decoded', async () => {
    storedToken = 'bad-jwt'
    mockIsTokenExpired.mockReturnValue(false)
    mockDecodeToken.mockReturnValue(null)

    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no')
    })
    expect(screen.getByTestId('authenticated').textContent).toBe('no')
  })

  it('login sets user and token', async () => {
    mockLoginUser.mockResolvedValue({ access_token: 'new-jwt', token_type: 'bearer' })
    mockDecodeToken.mockReturnValue({
      sub: '10',
      email: 'login@test.com',
      exp: 9999999999,
      is_guest: false,
    })

    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no')
    })

    await user.click(screen.getByTestId('login'))

    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('yes')
    })
    expect(screen.getByTestId('email').textContent).toBe('login@test.com')
    expect(screen.getByTestId('guest').textContent).toBe('no')
  })

  it('register calls registerUser but does not auto-login', async () => {
    mockRegisterUser.mockResolvedValue({ id: 1, email: 'new@test.com' })

    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no')
    })

    await user.click(screen.getByTestId('register'))

    await waitFor(() => {
      expect(mockRegisterUser).toHaveBeenCalled()
    })
    expect(screen.getByTestId('authenticated').textContent).toBe('no')
  })

  it('logout clears user and token', async () => {
    storedToken = 'valid-jwt'
    mockIsTokenExpired.mockReturnValue(false)
    mockDecodeToken.mockReturnValue({
      sub: '1',
      email: 'user@test.com',
      exp: 9999999999,
      is_guest: false,
    })

    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('authenticated').textContent).toBe('yes')
    })

    await user.click(screen.getByTestId('logout'))

    expect(screen.getByTestId('authenticated').textContent).toBe('no')
    expect(screen.getByTestId('email').textContent).toBe('none')
  })

  it('loginAsGuest sets isGuest to true', async () => {
    mockCreateGuestAccount.mockResolvedValue({ access_token: 'guest-jwt', token_type: 'bearer' })
    mockDecodeToken.mockReturnValue({
      sub: '99',
      email: 'guest@guest.local',
      exp: 9999999999,
      is_guest: true,
    })

    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no')
    })

    await user.click(screen.getByTestId('guest-login'))

    await waitFor(() => {
      expect(screen.getByTestId('guest').textContent).toBe('yes')
    })
    expect(screen.getByTestId('authenticated').textContent).toBe('yes')
    expect(screen.getByTestId('email').textContent).toBe('guest@guest.local')
  })

  it('sets onUnauthorized callback to logout', async () => {
    renderWithProviders(<TestConsumer />)
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('no')
    })
    expect(mockSetOnUnauthorized).toHaveBeenCalled()
  })
})
