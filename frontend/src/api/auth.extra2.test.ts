/**
 * Additional tests for auth API functions - decodeToken, isTokenExpired, GDPR
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  decodeToken,
  isTokenExpired,
  getGoogleLoginUrl,
  exportUserData,
  deleteUserAccount,
  getCurrentUser,
  createGuestAccount,
  upgradeGuestAccount,
} from './auth'

// Helper to create a JWT-like token
function makeToken(payload: object): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.signature`
}

describe('decodeToken', () => {
  it('decodes a valid token', () => {
    const token = makeToken({ sub: '1', email: 'test@example.com', exp: 9999999999 })
    const decoded = decodeToken(token)
    expect(decoded?.sub).toBe('1')
    expect(decoded?.email).toBe('test@example.com')
  })

  it('returns null for invalid token', () => {
    expect(decodeToken('not.a.jwt')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeToken('')).toBeNull()
  })

  it('returns null for malformed base64', () => {
    expect(decodeToken('header.!!!invalid!!!.sig')).toBeNull()
  })

  it('extracts is_guest flag', () => {
    const token = makeToken({ sub: '1', email: 'guest@local', exp: 999999, is_guest: true })
    const decoded = decodeToken(token)
    expect(decoded?.is_guest).toBe(true)
  })
})

describe('isTokenExpired', () => {
  it('returns false for future expiry', () => {
    const token = makeToken({ sub: '1', email: 'a@b.com', exp: Math.floor(Date.now() / 1000) + 3600 })
    expect(isTokenExpired(token)).toBe(false)
  })

  it('returns true for past expiry', () => {
    const token = makeToken({ sub: '1', email: 'a@b.com', exp: Math.floor(Date.now() / 1000) - 100 })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns true for invalid token', () => {
    expect(isTokenExpired('invalid')).toBe(true)
  })
})

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
    const callArgs = (globalThis.fetch as any).mock.calls[0]
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
      json: () => Promise.resolve({ access_token: 'guest-token', token_type: 'bearer' }),
    })

    const result = await createGuestAccount()
    expect(result.access_token).toBe('guest-token')
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
    const callArgs = (globalThis.fetch as any).mock.calls[0]
    const body = JSON.parse(callArgs[1].body)
    expect(body.email).toBe('new@test.com')
    expect(body.password).toBe('StrongPass123!')
  })
})
