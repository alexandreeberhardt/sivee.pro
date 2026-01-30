/**
 * Authentication API functions
 */
import { api } from './client';
import type { AuthResponse, User, LoginCredentials, RegisterCredentials } from '../types';

const API_URL = import.meta.env.DEV ? '' : '';

/**
 * Register a new user
 */
export async function registerUser(credentials: RegisterCredentials): Promise<User> {
  return api.post<User>('/auth/register', credentials);
}

/**
 * Login user with OAuth2 Password Flow
 * Note: OAuth2 expects 'username' field, so we send email as username
 */
export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const formData = new URLSearchParams();
  formData.append('username', credentials.email);
  formData.append('password', credentials.password);

  return api.postForm<AuthResponse>('/auth/login', formData);
}

/**
 * Decode JWT token to extract user info
 * Note: This is client-side decoding for convenience - the server still validates the token
 */
export function decodeToken(token: string): { sub: string; email: string; exp: number } | null {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded) return true;

  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Get Google OAuth login URL
 */
export function getGoogleLoginUrl(): string {
  return `${API_URL}/api/auth/google/login`;
}

/**
 * Redirect to Google OAuth login
 */
export function loginWithGoogle(): void {
  window.location.href = getGoogleLoginUrl();
}
