/**
 * Additional tests for auth API functions (GDPR + account flows)
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  getGoogleLoginUrl,
  exportUserData,
  deleteUserAccount,
  getCurrentUser,
  createGuestAccount,
  upgradeGuestAccount,
} from './auth'

describe('getGoogleLoginUrl', () => {
  it('returns path to google login', () => {
    const url = getGoogleLoginUrl()
    expect(url).toContain('/api/auth/google/login')
  })
})

describe('exportUserData', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('calls GET /auth/me/export', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ user: {}, resumes: [], exported_at: '2024-01-01' }),
    })

    const data = await exportUserData()
    expect(data).toHaveProperty('user')
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/auth/me/export',
      expect.objectContaining({ method: 'GET' }),
    )
  })
})

describe('deleteUserAccount', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('calls DELETE /auth/me', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
    })

    await deleteUserAccount()
    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]
    expect(callArgs[1].method).toBe('DELETE')
    expect(callArgs[0]).toBe('/api/auth/me')
  })
})

describe('getCurrentUser', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('calls GET /auth/me', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, email: 'test@test.com', is_guest: false }),
    })

    const user = await getCurrentUser()
    expect(user.id).toBe(1)
  })
})

describe('createGuestAccount', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('calls POST /auth/guest', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: 'Guest session established' }),
    })

    const result = await createGuestAccount()
    expect(result.message).toBe('Guest session established')
  })
})

describe('upgradeGuestAccount', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('calls POST /auth/upgrade with email and password', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, email: 'new@test.com', is_guest: false }),
    })

    const user = await upgradeGuestAccount('new@test.com', 'StrongPass123!')
    expect(user.email).toBe('new@test.com')
    const callArgs = vi.mocked(globalThis.fetch).mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.email).toBe('new@test.com')
    expect(body.password).toBe('StrongPass123!')
  })
})
