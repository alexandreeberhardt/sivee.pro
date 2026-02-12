/**
 * Authentication page - Modern split-screen design
 */
import { useState } from 'react';
import { FileText, Sparkles, Shield, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Login from './Login';
import Register from './Register';
import ThemeToggle from '../ThemeToggle';
import LanguageSwitcher from '../LanguageSwitcher';

type AuthMode = 'login' | 'register';

interface AuthPageProps {
  onContinueWithoutAuth?: () => void;
}

export default function AuthPage({ onContinueWithoutAuth }: AuthPageProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('login');

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-indigo-900 via-brand to-indigo-950">        {/* Decorative background patterns */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/20 rounded-full blur-3xl" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">{t('landing.appName')}</span>
          </div>

          {/* Main content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4">
                {t('auth.brandingTitle') || 'Créez des CV professionnels en quelques minutes'}
              </h1>
              <p className="text-lg text-white/80 max-w-md">
                {t('auth.brandingSubtitle') || 'Importez, éditez et exportez vos CV avec un rendu LaTeX impeccable.'}
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <Feature
                icon={<Sparkles className="w-5 h-5" />}
                text={t('auth.feature1') || 'Templates professionnels et modernes'}
              />
              <Feature
                icon={<Zap className="w-5 h-5" />}
                text={t('auth.feature2') || 'Export PDF haute qualité instantané'}
              />
              <Feature
                icon={<Shield className="w-5 h-5" />}
                text={t('auth.feature3') || 'Vos données sécurisées et sauvegardées'}
              />
            </div>
          </div>

          {/* Footer */}
          <a
            href="https://github.com/alexandreeberhardt/sivee.pro/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white/60 hover:text-white/80 transition-colors"
          >
            {t('landing.openSource')}
          </a>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col bg-surface-50 dark:bg-surface-100 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }} />

        {/* Mobile Header */}
        <header className="lg:hidden relative z-10 bg-surface-0/80 dark:bg-surface-100/80 backdrop-blur-md border-b border-primary-100/50 dark:border-primary-800/50">
          <div className="px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-7 h-7 text-brand" />
              <span className="text-lg font-semibold text-primary-900 dark:text-white">{t('landing.appName')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Desktop header with theme/language toggles */}
        <div className="hidden lg:flex justify-end gap-1.5 p-4 relative z-10">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>

        {/* Form Container */}
        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 relative z-10">
          <div className="w-full max-w-[400px]">
            {/* Glass card container */}
            <div className="bg-surface-0/90 dark:bg-surface-200/90 backdrop-blur-xl rounded-2xl border border-primary-200/30 dark:border-primary-700/30 shadow-xl shadow-primary-900/5 dark:shadow-primary-950/20 p-6 sm:p-8">
              {/* Animated content */}
              <div
                key={mode}
                className="animate-fade-in"
              >
                {mode === 'login' ? (
                  <Login onSwitchToRegister={() => setMode('register')} />
                ) : (
                  <Register onSwitchToLogin={() => setMode('login')} />
                )}
              </div>
            </div>

            {/* Optional: Continue without account */}
            {onContinueWithoutAuth && (
              <div className="mt-6 text-center">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-primary-200/50 dark:border-primary-700/50" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-surface-50 dark:bg-surface-200 text-primary-400 dark:text-white text-xs">
                      {t('auth.or') || 'ou'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={onContinueWithoutAuth}
                  className="mt-3 text-sm text-primary-500 dark:text-white hover:text-brand transition-colors font-medium"
                >
                  {t('auth.continueWithoutAccount') || 'Continuer sans compte'}
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 px-4 text-center lg:hidden relative z-10">
          <a
            href="https://github.com/alexandreeberhardt/sivee.pro/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-400 dark:text-primary-500 hover:text-primary-600 transition-colors"
          >
            {t('landing.openSource')}
          </a>
        </footer>
      </div>
    </div>
  );
}

function Feature({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center text-white">
        {icon}
      </div>
      <span className="text-white/90 font-medium">{text}</span>
    </div>
  );
}
