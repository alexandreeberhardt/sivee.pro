/**
 * Additional tests for auth API functions (the ones not covered by auth.test.ts)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  registerUser,
  loginUser,
  getCurrentUser,
  exportUserData,
  deleteUserAccount,
  createGuestAccount,
  upgradeGuestAccount,
  loginWithGoogle,
} from './auth'

// Mock the api client
vi.mock('./client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postForm: vi.fn(),
  },
}))

import { api } from './client'

describe('registerUser', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls POST /auth/register with credentials', async () => {
    const mockUser = { id: 1, email: 'a@b.com', is_guest: false }
    vi.mocked(api.post).mockResolvedValue(mockUser)

    const result = await registerUser({ email: 'a@b.com', password: 'pass' })

    expect(api.post).toHaveBeenCalledWith('/auth/register', {
      email: 'a@b.com',
      password: 'pass',
    })
    expect(result).toEqual(mockUser)
  })
})

describe('loginUser', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls postForm /auth/login with email as username', async () => {
    const mockResponse = { access_token: 'jwt', token_type: 'bearer' }
    vi.mocked(api.postForm).mockResolvedValue(mockResponse)

    const result = await loginUser({ email: 'user@test.com', password: 'mypass' })

    expect(api.postForm).toHaveBeenCalledWith(
      '/auth/login',
      expect.any(URLSearchParams),
    )
    // Check the form data was built correctly
    const formData = vi.mocked(api.postForm).mock.calls[0][1] as URLSearchParams
    expect(formData.get('username')).toBe('user@test.com')
    expect(formData.get('password')).toBe('mypass')
    expect(result).toEqual(mockResponse)
  })
})

describe('getCurrentUser', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls GET /auth/me', async () => {
    const mockUser = { id: 1, email: 'me@test.com' }
    vi.mocked(api.get).mockResolvedValue(mockUser)

    const result = await getCurrentUser()

    expect(api.get).toHaveBeenCalledWith('/auth/me')
    expect(result).toEqual(mockUser)
  })
})

describe('exportUserData', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls GET /auth/me/export', async () => {
    const mockExport = { user: {}, resumes: [], exported_at: '2024-01-01' }
    vi.mocked(api.get).mockResolvedValue(mockExport)

    const result = await exportUserData()

    expect(api.get).toHaveBeenCalledWith('/auth/me/export')
    expect(result).toEqual(mockExport)
  })
})

describe('deleteUserAccount', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls DELETE /auth/me', async () => {
    vi.mocked(api.delete).mockResolvedValue(undefined)

    await deleteUserAccount()

    expect(api.delete).toHaveBeenCalledWith('/auth/me')
  })
})

describe('createGuestAccount', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls POST /auth/guest', async () => {
    const mockResponse = { access_token: 'guest-jwt', token_type: 'bearer' }
    vi.mocked(api.post).mockResolvedValue(mockResponse)

    const result = await createGuestAccount()

    expect(api.post).toHaveBeenCalledWith('/auth/guest', {})
    expect(result).toEqual(mockResponse)
  })
})

describe('upgradeGuestAccount', () => {
  afterEach(() => vi.clearAllMocks())

  it('calls POST /auth/upgrade with email and password', async () => {
    const mockUser = { id: 1, email: 'new@test.com', is_guest: false }
    vi.mocked(api.post).mockResolvedValue(mockUser)

    const result = await upgradeGuestAccount('new@test.com', 'StrongPass1!')

    expect(api.post).toHaveBeenCalledWith('/auth/upgrade', {
      email: 'new@test.com',
      password: 'StrongPass1!',
    })
    expect(result).toEqual(mockUser)
  })
})

describe('loginWithGoogle', () => {
  it('redirects to Google OAuth URL', () => {
    // Mock window.location.href setter
    const originalLocation = window.location
    const mockLocation = { ...originalLocation, href: '' }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })

    loginWithGoogle()

    expect(mockLocation.href).toBe('/api/auth/google/login')

    // Restore
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    })
  })
})
