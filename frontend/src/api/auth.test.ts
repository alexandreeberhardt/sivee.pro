import { describe, it, expect } from 'vitest'
import { getGoogleLoginUrl } from './auth'

describe('getGoogleLoginUrl', () => {
  it('returns the correct OAuth path', () => {
    expect(getGoogleLoginUrl()).toBe('/api/auth/google/login')
  })
})
