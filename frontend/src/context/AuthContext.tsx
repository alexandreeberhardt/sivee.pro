/**
 * Authentication Context for managing user state
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  setOnUnauthorized,
} from '../api/client';
import { loginUser, registerUser, decodeToken, isTokenExpired } from '../api/auth';
import type { User, AuthState, LoginCredentials, RegisterCredentials } from '../types';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!token && !!user;

  /**
   * Logout: clear token and user state
   */
  const logout = useCallback(() => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Initialize auth state from localStorage or URL (OAuth callback)
   */
  useEffect(() => {
    const initAuth = () => {
      // Check for token in URL (from OAuth callback)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');

      if (urlToken) {
        // Remove token from URL
        window.history.replaceState({}, document.title, window.location.pathname);

        // Validate and store the token
        if (!isTokenExpired(urlToken)) {
          const decoded = decodeToken(urlToken);
          if (decoded) {
            setStoredToken(urlToken);
            setToken(urlToken);
            setUser({
              id: parseInt(decoded.sub, 10),
              email: decoded.email,
            });
            setIsLoading(false);
            return;
          }
        }
      }

      // Check for stored token
      const storedToken = getStoredToken();

      if (storedToken) {
        // Check if token is expired
        if (isTokenExpired(storedToken)) {
          logout();
        } else {
          // Decode token to get user info
          const decoded = decodeToken(storedToken);
          if (decoded) {
            setToken(storedToken);
            setUser({
              id: parseInt(decoded.sub, 10),
              email: decoded.email,
            });
          } else {
            logout();
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [logout]);

  /**
   * Set up unauthorized callback
   */
  useEffect(() => {
    setOnUnauthorized(logout);
  }, [logout]);

  /**
   * Login with email and password
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    const response = await loginUser(credentials);
    const newToken = response.access_token;

    // Store token
    setStoredToken(newToken);
    setToken(newToken);

    // Decode token to get user info
    const decoded = decodeToken(newToken);
    if (decoded) {
      setUser({
        id: parseInt(decoded.sub, 10),
        email: decoded.email,
      });
    }
  };

  /**
   * Register a new user (does not auto-login)
   */
  const register = async (credentials: RegisterCredentials): Promise<void> => {
    await registerUser(credentials);
    // After registration, user needs to login
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
