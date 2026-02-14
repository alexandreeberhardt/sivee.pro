/**
 * Account page - User profile and GDPR data management
 */
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText,
  ArrowLeft,
  User,
  Download,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  LogOut,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ThemeToggle'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { exportUserData, deleteUserAccount } from '../api/auth'
import FeedbackBanner from '../components/FeedbackBanner'

export default function Account() {
  const { t } = useTranslation()
  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, isLoading, navigate])

  // Show nothing while checking auth or if not authenticated
  if (isLoading || !isAuthenticated) {
    return null
  }

  const [exportLoading, setExportLoading] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleExportData = async () => {
    setExportLoading(true)
    setError(null)
    try {
      const data = await exportUserData()

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sivee_data_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      URL.revokeObjectURL(url)
      a.remove()

      setSuccess(t('account.exportSuccess'))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.exportError'))
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER' && deleteConfirmText !== 'DELETE') {
      setError(t('account.deleteConfirmError'))
      return
    }

    setDeleteLoading(true)
    setError(null)
    try {
      await deleteUserAccount()
      logout()
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.deleteError'))
      setDeleteLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-surface-0/80 backdrop-blur-xl border-b border-primary-100/50 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <FileText className="w-7 h-7 text-primary-900" />
            <span className="text-lg font-semibold text-primary-900">{t('landing.appName')}</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            <Link to="/" className="btn-ghost text-sm">
              <ArrowLeft className="w-4 h-4" />
              {t('legal.backToHome')}
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-primary-900 mb-8">{t('account.title')}</h1>

        {/* Success message */}
        {success && (
          <div className="mb-6 p-4 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3 animate-fade-in">
            <CheckCircle className="w-5 h-5 text-success-600" />
            <p className="text-sm text-success-700">{success}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl flex items-center gap-3 animate-fade-in">
            <AlertTriangle className="w-5 h-5 text-error-600" />
            <p className="text-sm text-error-700">{error}</p>
          </div>
        )}

        {/* User info card */}
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-7 h-7 text-primary-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-primary-900">{t('account.profile')}</h2>
              <p className="text-primary-500">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/')
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:text-primary-300 dark:hover:bg-primary-800 transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            {t('common.logout')}
          </button>
        </div>

        {/* Feedback Banner */}
        <FeedbackBanner />

        {/* GDPR Actions */}
        <div className="space-y-4">
          {/* Export data */}
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-brand" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-900 mb-1">{t('account.exportData')}</h3>
                <p className="text-sm text-primary-500 mb-4">{t('account.exportDataDesc')}</p>
                <button
                  onClick={handleExportData}
                  disabled={exportLoading}
                  className="btn-secondary"
                >
                  {exportLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t('account.exporting')}
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      {t('account.downloadData')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Delete account */}
          <div className="card p-6 border-error-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-error-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-error-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-error-700 mb-1">{t('account.deleteAccount')}</h3>
                <p className="text-sm text-primary-500 mb-4">{t('account.deleteAccountDesc')}</p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-error-50 text-error-700 rounded-lg hover:bg-error-100 transition-colors font-medium text-sm"
                  >
                    {t('account.deleteAccountButton')}
                  </button>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
                      <p className="text-sm text-error-700 font-medium mb-2">
                        {t('account.deleteWarning')}
                      </p>
                      <p className="text-sm text-error-600">
                        {t('account.deleteConfirmInstructions')}
                      </p>
                    </div>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder={t('account.deleteConfirmPlaceholder')}
                      className="input w-full"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                          setError(null)
                        }}
                        className="btn-secondary flex-1"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={
                          deleteLoading ||
                          (deleteConfirmText !== 'SUPPRIMER' && deleteConfirmText !== 'DELETE')
                        }
                        className="flex-1 px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm flex items-center justify-center gap-2"
                      >
                        {deleteLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('account.deleting')}
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            {t('account.confirmDelete')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Links */}
        <div className="mt-8 pt-6 border-t border-primary-100">
          <p className="text-sm text-primary-500 mb-4">{t('account.legalLinks')}</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/politique-confidentialite" className="text-sm text-brand hover:underline">
              {t('legal.privacyPolicy.title')}
            </Link>
            <Link to="/mentions-legales" className="text-sm text-brand hover:underline">
              {t('legal.legalNotice.title')}
            </Link>
            <Link to="/cgu" className="text-sm text-brand hover:underline">
              {t('legal.termsOfService.title')}
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
