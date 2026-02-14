/**
 * Reset Password page - Set a new password using a reset token
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  Loader2,
  Lock,
  KeyRound,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  FileText,
  Check,
  X,
} from 'lucide-react'
import { resetPassword } from '../api/auth'
import { ApiError } from '../api/client'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'

const PASSWORD_RULES = [
  { key: 'length', test: (v: string) => v.length >= 12 },
  { key: 'uppercase', test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lowercase', test: (v: string) => /[a-z]/.test(v) },
  { key: 'digit', test: (v: string) => /\d/.test(v) },
  { key: 'special', test: (v: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v) },
]

export default function ResetPassword() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const allRulesPass = PASSWORD_RULES.every((r) => r.test(password))
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!allRulesPass || !passwordsMatch) return

    setError(null)
    setLoading(true)

    try {
      await resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/'), 3000)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail || t('auth.errors.generic'))
      } else {
        setError(t('auth.errors.generic'))
      }
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-100 p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-error-500 mx-auto" />
          <p className="text-primary-700 dark:text-primary-300">{t('auth.resetPassword.invalidLink')}</p>
          <Link to="/" className="btn-brand inline-flex py-2 px-4">
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-100">
      {/* Header */}
      <header className="bg-surface-0/80 dark:bg-surface-100/80 backdrop-blur-md border-b border-primary-100/50 dark:border-primary-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <FileText className="w-7 h-7 text-brand" />
            <span className="text-lg font-semibold text-primary-900 dark:text-white">
              {t('landing.appName')}
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          <div className="bg-surface-0/90 dark:bg-surface-200/90 backdrop-blur-xl rounded-2xl border border-primary-200/30 dark:border-primary-700/30 shadow-xl shadow-primary-900/5 dark:shadow-primary-950/20 p-6 sm:p-8">
            <div className="w-full animate-fade-in">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-10 h-10 bg-primary-100 dark:bg-primary-200 rounded-xl mb-4">
                  <KeyRound className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold text-primary-900 dark:text-white mb-1.5 tracking-tight">
                  {t('auth.resetPassword.title')}
                </h2>
                <p className="text-sm text-black dark:text-white">
                  {t('auth.resetPassword.subtitle')}
                </p>
              </div>

              {success ? (
                <div className="text-center space-y-4">
                  <div className="mx-auto w-12 h-12 bg-green-100 dark:bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    {t('auth.resetPassword.successMessage')}
                  </p>
                </div>
              ) : (
                <>
                  {/* Error */}
                  {error && (
                    <div className="mb-5 p-3 bg-error-50 dark:bg-error-100/20 border border-error-200 dark:border-error-500/30 rounded-xl flex items-center gap-3 animate-shake">
                      <div className="w-8 h-8 bg-error-100 dark:bg-error-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <AlertCircle className="w-4 h-4 text-error-600 dark:text-error-500" />
                      </div>
                      <p className="text-sm text-error-700 dark:text-error-400 flex-1 min-w-0">
                        {error}
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* New password */}
                    <div className="form-group">
                      <label htmlFor="new-password" className="label">
                        {t('auth.resetPassword.newPassword')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="new-password"
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
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Password rules */}
                    {password.length > 0 && (
                      <div className="space-y-1.5 px-1">
                        {PASSWORD_RULES.map((rule) => {
                          const passes = rule.test(password)
                          return (
                            <div key={rule.key} className="flex items-center gap-2 text-xs">
                              {passes ? (
                                <Check className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <X className="w-3.5 h-3.5 text-primary-400" />
                              )}
                              <span
                                className={
                                  passes
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-primary-500 dark:text-primary-400'
                                }
                              >
                                {t(`auth.passwordRules.${rule.key}`)}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Confirm password */}
                    <div className="form-group">
                      <label htmlFor="confirm-password" className="label">
                        {t('auth.confirmPassword')}
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="confirm-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder={t('auth.confirmPasswordPlaceholder')}
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
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {confirmPassword.length > 0 && (
                        <p
                          className={`text-xs mt-1 ${passwordsMatch ? 'text-green-600 dark:text-green-400' : 'text-error-600 dark:text-error-400'}`}
                        >
                          {passwordsMatch
                            ? t('auth.passwordsMatch')
                            : t('auth.passwordsDontMatch')}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !allRulesPass || !passwordsMatch}
                      className="btn-brand w-full py-3 mt-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{t('auth.resetPassword.resetting')}</span>
                        </>
                      ) : (
                        <span>{t('auth.resetPassword.button')}</span>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
