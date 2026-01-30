/**
 * Register component - Modern design
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail, Lock, UserPlus, AlertCircle, CheckCircle, Eye, EyeOff, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';

interface RegisterProps {
  onSwitchToLogin: () => void;
}

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const { t } = useTranslation();
  const { register, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Password validation
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /\d/.test(password),
  };
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const allChecksValid = isPasswordValid && passwordsMatch;

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

      // Auto-login after successful registration
      setTimeout(async () => {
        try {
          await login({ email, password });
        } catch {
          onSwitchToLogin();
        }
      }, 1500);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 400) {
          setError(t('auth.errors.emailExists'));
        } else {
          setError(err.detail || t('auth.errors.generic'));
        }
      } else {
        setError(t('auth.errors.generic'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full text-center py-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-success-100 rounded-2xl mb-5 animate-bounce-in">
          <CheckCircle className="w-7 h-7 text-success-600" />
        </div>
        <h2 className="text-xl font-semibold text-primary-900 mb-2">
          {t('auth.register.success')}
        </h2>
        <p className="text-sm text-primary-500 mb-5">{t('auth.register.successMessage')}</p>
        <div className="flex items-center justify-center gap-2 text-brand">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">{t('auth.loggingIn')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand/10 rounded-2xl mb-5">
          <UserPlus className="w-7 h-7 text-brand" />
        </div>
        <h2 className="text-2xl font-semibold text-primary-900 mb-1.5 tracking-tight">
          {t('auth.register.title')}
        </h2>
        <p className="text-sm text-primary-500">
          {t('auth.register.subtitle')}
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email field */}
        <div className="space-y-1.5">
          <label
            htmlFor="register-email"
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
              id="register-email"
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
            htmlFor="register-password"
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
              id="register-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className="w-full pl-11 pr-11 py-3 bg-surface-0 border border-primary-200/80 rounded-xl text-primary-900 placeholder-primary-400 transition-all duration-200 focus:outline-none focus:border-brand/50 focus:ring-4 focus:ring-brand/10"
              placeholder={t('auth.passwordPlaceholder')}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-primary-400 hover:text-primary-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>

          {/* Password requirements */}
          {password && (
            <div className="mt-2.5 p-2.5 bg-primary-50/80 dark:bg-primary-900/20 rounded-lg border border-primary-100/50">
              <div className="grid grid-cols-2 gap-1.5">
                <PasswordCheck passed={passwordChecks.length} label={t('auth.passwordRules.length')} />
                <PasswordCheck passed={passwordChecks.uppercase} label={t('auth.passwordRules.uppercase')} />
                <PasswordCheck passed={passwordChecks.lowercase} label={t('auth.passwordRules.lowercase')} />
                <PasswordCheck passed={passwordChecks.digit} label={t('auth.passwordRules.digit')} />
              </div>
            </div>
          )}
        </div>

        {/* Confirm password field */}
        <div className="space-y-1.5">
          <label
            htmlFor="register-confirm-password"
            className="block text-sm font-medium text-primary-700"
          >
            {t('auth.confirmPassword')}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className={`w-[18px] h-[18px] transition-colors duration-200 ${
                focusedField === 'confirmPassword' ? 'text-brand' : 'text-primary-400'
              }`} />
            </div>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="register-confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              className={`w-full pl-11 pr-11 py-3 bg-surface-0 border rounded-xl text-primary-900 placeholder-primary-400 transition-all duration-200 focus:outline-none focus:ring-4 ${
                confirmPassword && !passwordsMatch
                  ? 'border-error-300 focus:border-error-400 focus:ring-error-100'
                  : confirmPassword && passwordsMatch
                  ? 'border-success-300 focus:border-success-400 focus:ring-success-100'
                  : 'border-primary-200/80 focus:border-brand/50 focus:ring-brand/10'
              }`}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-primary-400 hover:text-primary-600 transition-colors"
            >
              {showConfirmPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p className="mt-1.5 text-xs text-error-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {t('auth.errors.passwordMismatch')}
            </p>
          )}
          {confirmPassword && passwordsMatch && (
            <p className="mt-1.5 text-xs text-success-600 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {t('auth.passwordsMatch') || 'Les mots de passe correspondent'}
            </p>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !allChecksValid}
          className="w-full mt-2 py-3 px-6 bg-brand hover:bg-brand-hover text-white font-medium rounded-xl shadow-sm shadow-brand/20 hover:shadow-md hover:shadow-brand/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-primary-300 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-[18px] h-[18px] animate-spin" />
              <span>{t('auth.registering')}</span>
            </>
          ) : (
            <span>{t('auth.register.button')}</span>
          )}
        </button>
      </form>

      {/* Switch to login */}
      <div className="mt-6 text-center">
        <p className="text-sm text-primary-500">
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
      passed ? 'text-success-600' : 'text-primary-400'
    }`}>
      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all duration-200 ${
        passed ? 'bg-success-500 text-white' : 'bg-primary-200'
      }`}>
        {passed && <Check className="w-2.5 h-2.5" />}
      </div>
      <span>{label}</span>
    </div>
  );
}
