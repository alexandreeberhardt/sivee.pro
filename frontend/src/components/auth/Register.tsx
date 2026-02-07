/**
 * Register component - Matching CV form design system
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, Lock, UserPlus, AlertCircle, CheckCircle, Eye, EyeOff, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import { loginWithGoogle } from '../../api/auth';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const { t, i18n } = useTranslation();
  const { register, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const isFrench = i18n.language.startsWith('fr');

  // Password validation - must match backend requirements (12 chars + special char)
  const passwordChecks = {
    length: password.length >= 12,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const allChecksValid = isPasswordValid && passwordsMatch && acceptedTerms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError(t('auth.errors.passwordRequirements'));
      return;
    }

    if (!passwordsMatch) {
      setError(t('auth.errors.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await register({ email, password });
      setSuccess(true);
      setLoading(false);

      // Auto-login after successful registration
      await new Promise((resolve) => setTimeout(resolve, 1500));
      try {
        await login({ email, password });
      } catch {
        onSwitchToLogin();
      }
    } catch (err) {
      setLoading(false);
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setError(t('auth.errors.emailExists'));
        } else {
          setError(err.detail || t('auth.errors.generic'));
        }
      } else {
        setError(t('auth.errors.generic'));
      }
    }
  };

  if (success) {
    return (
      <div className="w-full text-center py-4 animate-fade-in">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-success-100 dark:bg-success-500/20 rounded-xl mb-4 animate-bounce-in">
          <CheckCircle className="w-5 h-5 text-success-600 dark:text-success-400" />
        </div>
        <h2 className="text-xl font-semibold text-primary-900 dark:text-white mb-2">
          {t('auth.register.success')}
        </h2>
        <p className="text-sm text-black dark:text-white mb-5">{t('auth.register.successMessage')}</p>
        <div className="flex items-center justify-center gap-2 text-brand">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">{t('auth.loggingIn')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-10 h-10 bg-primary-100 dark:bg-primary-200 rounded-xl mb-4">
          <UserPlus className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-primary-900 dark:text-white mb-1.5 tracking-tight">
          {t('auth.register.title')}
        </h2>
        <p className="text-sm text-black dark:text-white">
          {t('auth.register.subtitle')}
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
          <label htmlFor="register-email" className="label">
            {t('auth.email')}
          </label>
          <div className="relative">
            <input
              type="email"
              id="register-email"
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
          <label htmlFor="register-password" className="label">
            {t('auth.password')}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="register-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              className="input pl-10 pr-10"
              required
              autoComplete="new-password"
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

          {/* Password requirements */}
          {password && (
            <div className="mt-2.5 p-2.5 bg-primary-50 dark:bg-primary-200/50 rounded-lg border border-primary-100 dark:border-primary-700/50">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-1.5">
                <PasswordCheck passed={passwordChecks.length} label={t('auth.passwordRules.length')} />
                <PasswordCheck passed={passwordChecks.uppercase} label={t('auth.passwordRules.uppercase')} />
                <PasswordCheck passed={passwordChecks.lowercase} label={t('auth.passwordRules.lowercase')} />
                <PasswordCheck passed={passwordChecks.digit} label={t('auth.passwordRules.digit')} />
                <PasswordCheck passed={passwordChecks.special} label={t('auth.passwordRules.special')} />
              </div>
            </div>
          )}
        </div>

        {/* Confirm password field - CV style */}
        <div className="form-group">
          <label htmlFor="register-confirm-password" className="label">
            {t('auth.confirmPassword')}
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="register-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              className={`input pl-10 pr-10 ${
                confirmPassword && !passwordsMatch
                  ? 'border-error-300 focus:border-error-400 focus:ring-error-100 dark:focus:ring-error-900/30'
                  : confirmPassword && passwordsMatch
                  ? 'border-success-300 focus:border-success-400 focus:ring-success-100 dark:focus:ring-success-900/30'
                  : ''
              }`}
              required
              autoComplete="new-password"
            />
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-500" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-primary-400 dark:text-primary-500 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1.5 text-xs text-error-600 dark:text-error-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {t('auth.errors.passwordMismatch')}
            </p>
          )}
          {confirmPassword && passwordsMatch && (
            <p className="mt-1.5 text-xs text-success-600 dark:text-success-400 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {t('auth.passwordsMatch') || 'Les mots de passe correspondent'}
            </p>
          )}
        </div>

        {/* Terms acceptance checkbox */}
        <div className="form-group">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="sr-only peer"
              />
              <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                acceptedTerms
                  ? 'bg-brand border-brand'
                  : 'border-primary-300 dark:border-primary-600 group-hover:border-primary-400'
              }`}>
                {acceptedTerms && <Check className="w-3.5 h-3.5 text-white" />}
              </div>
            </div>
            <span className="text-sm text-primary-700 dark:text-white leading-relaxed">
              {isFrench ? (
                <>
                  J'accepte les{' '}
                  <Link
                    to="/cgu"
                    className="text-brand hover:underline"
                    target="_blank"
                  >
                    conditions d'utilisation
                  </Link>
                  {' '}et la{' '}
                  <Link
                    to="/politique-confidentialite"
                    className="text-brand hover:underline"
                    target="_blank"
                  >
                    politique de confidentialité
                  </Link>
                </>
              ) : (
                <>
                  I accept the{' '}
                  <Link
                    to="/terms"
                    className="text-brand hover:underline"
                    target="_blank"
                  >
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link
                    to="/privacy-policy"
                    className="text-brand hover:underline"
                    target="_blank"
                  >
                    Privacy Policy
                  </Link>
                </>
              )}
            </span>
          </label>
        </div>

        {/* Submit button - CV brand button style */}
        <button
          type="submit"
          disabled={loading || !allChecksValid}
          className="btn-brand w-full py-3 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{t('auth.registering')}</span>
            </>
          ) : (
            <span>{t('auth.register.button')}</span>
          )}
        </button>
      </form>

      {/* Switch to login */}
      <div className="mt-6 text-center">
        <p className="text-sm text-black dark:text-white">
          {t('auth.hasAccount')}{' '}
          <button
            onClick={onSwitchToLogin}
            className="font-medium text-brand hover:text-brand-hover transition-colors"
          >
            {t('auth.login.link')}
          </button>
        </p>
      </div>
    </div>
  );
}

function PasswordCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] transition-all duration-200 ${
      passed ? 'text-success-600 dark:text-success-400' : 'text-primary-500 dark:text-primary-400'
    }`}>
      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-200 ${
        passed ? 'bg-success-500 text-white' : 'bg-primary-200 dark:bg-primary-600'
      }`}>
        {passed && <Check className="w-2.5 h-2.5" />}
      </div>
      <span>{label}</span>
    </div>
  );
}
