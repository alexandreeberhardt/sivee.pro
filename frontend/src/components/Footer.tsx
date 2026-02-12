/**
 * Footer component with legal links
 */
import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { t, i18n } = useTranslation();
  const isFrench = i18n.language.startsWith('fr');

  return (
    <footer className="py-6 sm:py-8 px-4 sm:px-6 bg-surface-0 border-t border-primary-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-400" />
            <span className="text-sm text-primary-500">{t('landing.appName')}</span>
          </div>

          {/* Legal links */}
          <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm">
            <Link
              to={isFrench ? '/mentions-legales' : '/legal-notice'}
              className="text-primary-500 hover:text-primary-700 transition-colors"
            >
              {t('legal.legalNotice.title')}
            </Link>
            <Link
              to={isFrench ? '/politique-confidentialite' : '/privacy-policy'}
              className="text-primary-500 hover:text-primary-700 transition-colors"
            >
              {t('legal.privacyPolicy.title')}
            </Link>
            <Link
              to={isFrench ? '/cgu' : '/terms'}
              className="text-primary-500 hover:text-primary-700 transition-colors"
            >
              {t('legal.termsOfService.title')}
            </Link>
          </nav>

          <a
            href="https://github.com/alexandreeberhardt/sivee.pro/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-primary-400 hover:text-primary-600 transition-colors"
          >
            {t('landing.openSource')}
          </a>
        </div>
      </div>
    </footer>
  );
}
