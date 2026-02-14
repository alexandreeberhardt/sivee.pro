/**
 * Authentication Context for managing user state
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  setOnUnauthorized,
  api,
} from '../api/client'
import {
  loginUser,
  registerUser,
  decodeToken,
  isTokenExpired,
  createGuestAccount,
  upgradeGuestAccount,
} from '../api/auth'
import type { User, AuthState, LoginCredentials, RegisterCredentials } from '../types'

interface TokenResponse {
  access_token: string
  token_type: string
}

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => void
  isGuest: boolean
  loginAsGuest: () => Promise<void>
  upgradeAccount: (email: string, password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  const isAuthenticated = !!token && !!user

  /**
   * Logout: clear token and user state
   */
  const logout = useCallback(() => {
    removeStoredToken()
    setToken(null)
    setUser(null)
    setIsGuest(false)
  }, [])

  /**
   * Initialize auth state from localStorage or URL (OAuth callback)
   */
  useEffect(() => {
    const initAuth = async () => {
      // Check for OAuth code in URL (from OAuth callback)
      // SECURITY: We now receive a temporary code instead of the JWT directly
      // This prevents the JWT from being exposed in browser history or logs
      const urlParams = new URLSearchParams(window.location.search)
      const oauthCode = urlParams.get('code')

      if (oauthCode) {
        // Remove code from URL immediately
        window.history.replaceState({}, document.title, window.location.pathname)

        try {
          // Exchange the temporary code for a JWT token
          const response = await api.post<TokenResponse>(
            `/auth/google/exchange?code=${encodeURIComponent(oauthCode)}`,
          )
          const urlToken = response.access_token

          // Validate and store the token
          if (!isTokenExpired(urlToken)) {
            const decoded = decodeToken(urlToken)
            if (decoded) {
              setStoredToken(urlToken)
              setToken(urlToken)
              setUser({
                id: parseInt(decoded.sub, 10),
                email: decoded.email,
                isGuest: decoded.is_guest,
                feedbackCompleted: decoded.feedback_completed,
              })
              setIsGuest(decoded.is_guest || false)
              setIsLoading(false)
              return
            }
          }
        } catch (error) {
          console.error('OAuth code exchange failed:', error)
          // Continue to check stored token
        }
      }

      // Check for stored token
      const storedToken = getStoredToken()

      if (storedToken) {
        // Check if token is expired
        if (isTokenExpired(storedToken)) {
          logout()
        } else {
          // Decode token to get user info
          const decoded = decodeToken(storedToken)
          if (decoded) {
            setToken(storedToken)
            setUser({
              id: parseInt(decoded.sub, 10),
              email: decoded.email,
              isGuest: decoded.is_guest,
              feedbackCompleted: decoded.feedback_completed,
            })
            setIsGuest(decoded.is_guest || false)
          } else {
            logout()
          }
        }
      }

      setIsLoading(false)
    }

    initAuth()
  }, [logout])

  /**
   * Set up unauthorized callback
   */
  useEffect(() => {
    setOnUnauthorized(logout)
  }, [logout])

  /**
   * Login with email and password
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    const response = await loginUser(credentials)
    const newToken = response.access_token

    // Store token
    setStoredToken(newToken)
    setToken(newToken)

    // Decode token to get user info
    const decoded = decodeToken(newToken)
    if (decoded) {
      setUser({
        id: parseInt(decoded.sub, 10),
        email: decoded.email,
        isGuest: decoded.is_guest,
        feedbackCompleted: decoded.feedback_completed,
      })
      setIsGuest(decoded.is_guest || false)
    }
  }

  /**
   * Register a new user (does not auto-login)
   */
  const register = async (credentials: RegisterCredentials): Promise<void> => {
    await registerUser(credentials)
    // After registration, user needs to login
  }

  /**
   * Login as a guest (anonymous account)
   */
  const loginAsGuest = async (): Promise<void> => {
    const response = await createGuestAccount()
    const newToken = response.access_token

    // Store token
    setStoredToken(newToken)
    setToken(newToken)

    // Decode token to get user info
    const decoded = decodeToken(newToken)
    if (decoded) {
      setUser({
        id: parseInt(decoded.sub, 10),
        email: decoded.email,
        isGuest: true,
      })
      setIsGuest(true)
    }
  }

  /**
   * Upgrade guest account to permanent account
   */
  const upgradeAccount = async (email: string, password: string): Promise<void> => {
    const updatedUser = await upgradeGuestAccount(email, password)

    // Update user state with new email and non-guest status
    setUser({
      id: updatedUser.id,
      email: updatedUser.email,
      isGuest: false,
    })
    setIsGuest(false)

    // Re-login to get a new token without the is_guest claim
    await login({ email, password })
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    isGuest,
    loginAsGuest,
    upgradeAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
