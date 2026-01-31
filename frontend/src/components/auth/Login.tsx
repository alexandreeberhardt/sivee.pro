/**
 * Login component - Matching CV form design system
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import { loginWithGoogle } from '../../api/auth';

interface LoginProps {
  onSwitchToRegister: () => void;
}

export default function Login({ onSwitchToRegister }: LoginProps) {
  const { t } = useTranslation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || t('auth.errors.invalidCredentials'));
      } else {
        setError(t('auth.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-primary-100 dark:bg-primary-200 rounded-xl mb-4">
          <LogIn className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-primary-900 dark:text-white mb-1.5 tracking-tight">
          {t('auth.login.title')}
        </h2>
        <p className="text-sm text-black dark:text-white">
          {t('auth.login.subtitle')}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-5 p-3 bg-error-50 dark:bg-error-100/20 border border-error-200 dark:border-error-500/30 rounded-xl flex items-center gap-3 animate-shake">
          <div className="w-8 h-8 bg-error-100 dark:bg-error-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-error-600 dark:text-error-500" />
          </div>
          <p className="text-sm text-error-700 dark:text-error-400 flex-1 min-w-0">{error}</p>
        </div>
      )}

      {/* Google Login Button - Style matching CV secondary buttons */}
      <button
        type="button"
        onClick={loginWithGoogle}
        className="btn-secondary w-full py-3 flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        <span>{t('auth.loginWithGoogle')}</span>
      </button>

      {/* Divider - Style matching CV */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-primary-200 dark:border-primary-700"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-surface-0 dark:bg-surface-100 text-black dark:text-white">
            {t('auth.orContinueWith')}
          </span>
        </div>
      </div>

      {/* Form - Using CV form styling */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email field - CV style */}
        <div className="form-group">
          <label htmlFor="email" className="label">
            {t('auth.email')}
          </label>
          <div className="relative">
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              className="input pl-10"
              required
              autoComplete="email"
            />
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-500" />
          </div>
        </div>

        {/* Password field - CV style */}
        <div className="form-group">
          <label htmlFor="password" className="label">
            {t('auth.password')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              className="input pl-10 pr-10"
              required
              autoComplete="current-password"
            />
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-500" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-primary-400 dark:text-primary-500 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit button - CV brand button style */}
        <button
          type="submit"
          disabled={loading}
          className="btn-brand w-full py-3 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('auth.loggingIn')}</span>
            </>
          ) : (
            <span>{t('auth.login.button')}</span>
          )}
        </button>
      </form>

      {/* Switch to register */}
      <div className="mt-6 text-center">
        <p className="text-sm text-black dark:text-white">
          {t('auth.noAccount')}{' '}
          <button
            onClick={onSwitchToRegister}
            className="font-medium text-brand hover:text-brand-hover transition-colors"
          >
            {t('auth.register.link')}
          </button>
        </p>
      </div>
    </div>
  );
}
