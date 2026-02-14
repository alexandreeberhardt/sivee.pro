/**
 * Authentication API functions
 */
import { api } from './client'
import type { AuthResponse, User, LoginCredentials, RegisterCredentials } from '../types'

const API_URL = import.meta.env.DEV ? '' : ''

/**
 * Register a new user
 */
export async function registerUser(credentials: RegisterCredentials): Promise<User> {
  return api.post<User>('/auth/register', credentials)
}

/**
 * Login user with OAuth2 Password Flow
 * Note: OAuth2 expects 'username' field, so we send email as username
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const formData = new URLSearchParams()
  formData.append('username', credentials.email)
  formData.append('password', credentials.password)

  return api.postForm<AuthResponse>('/auth/login', formData)
}

/**
 * Decode JWT token to extract user info
 * Note: This is client-side decoding for convenience - the server still validates the token
 */
export function decodeToken(
  token: string,
): { sub: string; email: string; exp: number; is_guest?: boolean; feedback_completed?: boolean } | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    return decoded
  } catch {
    return null
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded) return true

  const now = Math.floor(Date.now() / 1000)
  return decoded.exp < now
}

/**
 * Get Google OAuth login URL
 */
export function getGoogleLoginUrl(): string {
  return `${API_URL}/api/auth/google/login`
}

/**
 * Redirect to Google OAuth login
 */
export function loginWithGoogle(): void {
  window.location.href = getGoogleLoginUrl()
}

/**
 * Export all user data (GDPR right to portability)
 */
export async function exportUserData(): Promise<Record<string, unknown>> {
  return api.get<Record<string, unknown>>('/auth/me/export')
}

/**
 * Delete user account (GDPR right to erasure)
 */
export async function deleteUserAccount(): Promise<void> {
  return api.delete<void>('/auth/me')
}

/**
 * Request a password reset email
 */
export async function forgotPassword(email: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/forgot-password', { email })
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/auth/reset-password', { token, password })
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<User> {
  return api.get<User>('/auth/me')
}

/**
 * Create an anonymous guest account
 */
export async function createGuestAccount(): Promise<AuthResponse> {
  return api.post<AuthResponse>('/auth/guest', {})
}

/**
 * Upgrade a guest account to a permanent account
 */
export async function upgradeGuestAccount(email: string, password: string): Promise<User> {
  return api.post<User>('/auth/upgrade', { email, password })
}

/**
 * Submit feedback and receive bonus limits
 */
export interface FeedbackData {
  profile?: string
  target_sector?: string
  source?: string
  ease_rating: number
  time_spent?: string
  obstacles?: string
  alternative?: string
  suggestions?: string
  nps?: number
  future_help?: string
}

export interface FeedbackResponse {
  message: string
  bonus_resumes: number
  bonus_downloads: number
}

export async function submitFeedback(data: FeedbackData): Promise<FeedbackResponse> {
  return api.post<FeedbackResponse>('/auth/feedback', data)
}
