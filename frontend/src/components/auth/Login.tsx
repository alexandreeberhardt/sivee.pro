/**
 * Login component - Modern design
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

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
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand/10 rounded-2xl mb-5">
          <LogIn className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-2xl font-semibold text-primary-900 mb-1.5 tracking-tight">
          {t('auth.login.title')}
        </h2>
        <p className="text-sm text-primary-500">
          {t('auth.login.subtitle')}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-3.5 bg-error-50/80 border border-error-200/50 rounded-xl flex items-center gap-3 animate-shake">
          <div className="w-9 h-9 bg-error-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4.5 h-4.5 text-error-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-error-700 truncate">{error}</p>
          </div>
        </div>
      )}

      {/* Google Login Button */}
      <button
        type="button"
        onClick={loginWithGoogle}
        className="w-full py-3 px-6 bg-surface-0 border border-primary-200/80 hover:border-primary-300 text-primary-700 font-medium rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3"
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

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-primary-200/60"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-surface-0 text-primary-400">{t('auth.orContinueWith')}</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email field */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-primary-700"
          >
            {t('auth.email')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className={`w-[18px] h-[18px] transition-colors duration-200 ${
                focusedField === 'email' ? 'text-brand' : 'text-primary-400'
              }`} />
            </div>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              className="w-full pl-11 pr-4 py-3 bg-surface-0 border border-primary-200/80 rounded-xl text-primary-900 placeholder-primary-400 transition-all duration-200 focus:outline-none focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
              placeholder={t('auth.emailPlaceholder')}
              required
              autoComplete="email"
            />
          </div>
        </div>

        {/* Password field */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-primary-700"
          >
            {t('auth.password')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className={`w-[18px] h-[18px] transition-colors duration-200 ${
                focusedField === 'password' ? 'text-brand' : 'text-primary-400'
              }`} />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className="w-full pl-11 pr-11 py-3 bg-surface-0 border border-primary-200/80 rounded-xl text-primary-900 placeholder-primary-400 transition-all duration-200 focus:outline-none focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
              placeholder={t('auth.passwordPlaceholder')}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-primary-400 hover:text-primary-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-3 px-6 bg-brand hover:bg-brand-hover text-white font-medium rounded-xl shadow-sm shadow-brand/20 hover:shadow-md hover:shadow-brand/25 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
              <span>{t('auth.loggingIn')}</span>
            </>
          ) : (
            <span>{t('auth.login.button')}</span>
          )}
        </button>
      </form>

      {/* Switch to register */}
      <div className="mt-6 text-center">
        <p className="text-sm text-primary-500">
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
