import { describe, it, expect, vi } from 'vitest'
import { decodeToken, isTokenExpired, getGoogleLoginUrl } from './auth'

// Helper: create a fake JWT with a given payload
function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.fake-signature`
}

describe('decodeToken', () => {
  it('decodes a valid JWT payload', () => {
    const token = fakeJwt({ sub: '42', email: 'a@b.com', exp: 9999999999 })
    const decoded = decodeToken(token)
    expect(decoded).toEqual({ sub: '42', email: 'a@b.com', exp: 9999999999 })
  })

  it('returns is_guest field when present', () => {
    const token = fakeJwt({ sub: '1', email: 'g@g.com', exp: 9999999999, is_guest: true })
    const decoded = decodeToken(token)
    expect(decoded?.is_guest).toBe(true)
  })

  it('returns null for invalid token', () => {
    expect(decodeToken('not-a-jwt')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(decodeToken('')).toBeNull()
  })

  it('returns null for malformed base64', () => {
    expect(decodeToken('header.!!!invalid-base64!!!.sig')).toBeNull()
  })
})

describe('isTokenExpired', () => {
  it('returns false for a non-expired token', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const token = fakeJwt({ sub: '1', email: 'a@b.com', exp: futureExp })
    expect(isTokenExpired(token)).toBe(false)
  })

  it('returns true for an expired token', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600
    const token = fakeJwt({ sub: '1', email: 'a@b.com', exp: pastExp })
    expect(isTokenExpired(token)).toBe(true)
  })

  it('returns true for an invalid token', () => {
    expect(isTokenExpired('garbage')).toBe(true)
  })
})

describe('getGoogleLoginUrl', () => {
  it('returns the correct OAuth path', () => {
    expect(getGoogleLoginUrl()).toBe('/api/auth/google/login')
  })
})
