import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  FileDown,
  Loader2,
  AlertCircle,
  Plus,
  Upload,
  FileText,
  Sparkles,
  Layout,
  FileUp,
  Eye,
  Menu,
  X,
  LogOut,
  Save,
  FolderOpen,
  User,
} from 'lucide-react';
import {
  ResumeData,
  emptyResumeData,
  getEmptyResumeData,
  TemplateId,
  AVAILABLE_TEMPLATES,
  applyTemplateSizeVariant,
  getTemplateSizeVariant,
  getBaseTemplateId,
} from './types';
import { getTranslatedSectionTitle, isDefaultTitle } from './utils/sectionTitles';
import { useViewNavigation } from './hooks/useViewNavigation';
import { useResumeManager } from './hooks/useResumeManager';
import { usePdfGeneration } from './hooks/usePdfGeneration';
import { usePdfImport } from './hooks/usePdfImport';
import { useSectionManager } from './hooks/useSectionManager';
import { useAutoSize } from './hooks/useAutoSize';
import PersonalSection from './components/PersonalSection';
import SortableSection from './components/SortableSection';
import AddSectionModal from './components/AddSectionModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeToggle from './components/ThemeToggle';
import CVPreview from './components/CVPreview';
import AuthPage from './components/auth/AuthPage';
import Footer from './components/Footer';
import GuestUpgradeBanner from './components/GuestUpgradeBanner';
import FeatureCard from './components/FeatureCard';
import ResumeCard from './components/ResumeCard';
import { useAuth } from './context/AuthContext';
import { Link } from 'react-router-dom';

function App() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, isLoading: authLoading, user, logout, loginAsGuest } = useAuth();

  const [data, setData] = useState<ResumeData>(emptyResumeData);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [hasImported, setHasImported] = useState(false);
  const [editorStep, setEditorStep] = useState(0);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const { showLanding, setShowLanding, showResumesPage, setShowResumesPage } = useViewNavigation();

  const resumeManager = useResumeManager({
    isAuthenticated,
    setData,
    setShowLanding,
    setShowResumesPage,
    setHasImported,
    setEditorStep,
    setError,
    data,
  });

  const { loading, handleGenerate } = usePdfGeneration({ data, setError });

  const { importLoading, importStep, fileInputRef, handleImport } = usePdfImport({
    setData,
    setShowLanding,
    setHasImported,
    setEditorStep,
    setError,
  });

  const { handleDragEnd, updateSection, deleteSection, addSection } = useSectionManager({
    setData,
    setShowAddModal,
    hasImported,
    setEditorStep,
  });

  const { autoSize, setAutoSize, recommendedSize, autoSizeLoading } = useAutoSize({ data, setData });

  const importMessages = [
    t('import.analyzing'),
    t('import.extracting'),
    t('import.identifying'),
    t('import.structuring'),
    t('import.finalizing'),
  ];

  const templatePreviews: { id: TemplateId; name: string; imgBase: string }[] = [
    { id: 'harvard', name: 'Harvard', imgBase: '/exemples/Luffy_Harvard' },
    { id: 'double', name: 'Double', imgBase: '/exemples/Alexandre_Double' },
    { id: 'michel', name: 'Michel', imgBase: '/exemples/Luke_Michel' },
    { id: 'stephane', name: 'Stephane', imgBase: '/exemples/Luke_Stephane' },
    { id: 'aurianne', name: 'Aurianne', imgBase: '/exemples/Homer_Aurianne' },
  ];

  const getTemplateImage = (imgBase: string, size: string) => {
    if (size === 'normal') return `${imgBase}.png`;
    return `${imgBase}_${size}.png`;
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setData(getEmptyResumeData());
    setInitialLoading(false);
  }, []);

  // Update default section titles when language changes
  useEffect(() => {
    document.title = t('landing.pageTitle');

    setData(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (isDefaultTitle(section.type, section.title)) {
          return { ...section, title: getTranslatedSectionTitle(section.type, t) };
        }
        return section;
      }),
    }));
  }, [i18n.language]);

  // Show loading during auth check
  if (authLoading || initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-sm text-primary-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage onContinueWithoutAuth={loginAsGuest} />;
  }

  // Landing Page
  if (showLanding) {
    return (
      <div className="min-h-screen bg-surface-50">
        {/* Navigation */}
        <nav className="fixed top-0 inset-x-0 z-50 bg-surface-0/80 backdrop-blur-md border-b border-primary-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-7 h-7 text-primary-900" />
              <span className="text-lg font-semibold text-primary-900 hidden xs:inline">{t('landing.appName')}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3">
              <ThemeToggle />
              <LanguageSwitcher />
              <button
                onClick={() => {
                  setShowLanding(false);
                  setShowResumesPage(true);
                }}
                className="btn-brand text-sm px-2.5 sm:px-4 py-2"
              >
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">{t('resumes.myResumes')}</span>
              </button>
              <div className="w-px h-5 bg-primary-200/60 hidden sm:block" />
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-primary-500 hidden md:inline max-w-[140px] truncate">
                  {user?.email}
                </span>
                <Link
                  to="/account"
                  className="btn-ghost !p-2 text-primary-500 hover:text-primary-700"
                  title={t('account.title')}
                >
                  <User className="w-4 h-4" />
                </Link>
                <button
                  onClick={logout}
                  className="btn-ghost !p-2 text-primary-500 hover:text-error-600 hover:bg-error-50"
                  title={t('common.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary-900 mb-4 sm:mb-6 text-balance">
              {t('landing.heroTitle')}
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-primary-600 mb-8 sm:mb-10 max-w-2xl mx-auto text-balance">
              {t('landing.heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                onClick={() => {
                  setShowLanding(false);
                  window.scrollTo(0, 0);
                }}
                className="btn-brand px-6 py-3 text-base w-full sm:w-auto"
              >
                {t('landing.createCv')}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".pdf"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                className="btn-secondary px-6 py-3 text-base w-full sm:w-auto"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="truncate">{importMessages[importStep]}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    {t('landing.importPdf')}
                  </>
                )}
              </button>
            </div>
          </div>
        </section>



        {/* Templates Preview */}
        <section className="py-12 sm:py-20 px-4 sm:px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-3 sm:mb-4">
                {t('landing.templatesAvailable', { count: AVAILABLE_TEMPLATES.length })}
              </h2>
              <p className="text-base sm:text-lg text-primary-600">
                {t('landing.templatesDescription')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              {[
                { img: '/exemples/Luffy_Harvard.png', name: 'Harvard', id: 'harvard' },
                { img: '/exemples/Alexandre_Double.png', name: 'Double', id: 'double' },
                { img: '/exemples/Luke_Michel.png', name: 'Michel', id: 'michel' },
                { img: '/exemples/Luke_Stephane.png', name: 'Stephane', id: 'stephane' },
              ].map((template) => (
                <div
                  key={template.id}
                  className="group card p-2 sm:p-3 text-center hover:shadow-medium transition-all cursor-pointer active:scale-[0.98]"
                  onClick={() => {
                    setData((prev) => ({ ...prev, template_id: template.id as TemplateId }));
                    setShowLanding(false);
                    window.scrollTo(0, 0);
                  }}
                >
                  <div className="w-full aspect-[3/4] rounded-lg mb-2 sm:mb-3 overflow-hidden bg-primary-50">
                    <img
                      src={template.img}
                      alt={`Template ${template.name}`}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-primary-900">{template.name}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => {
                  setShowLanding(false);
                  window.scrollTo(0, 0);
                }}
                className="btn-ghost text-primary-600"
              >
                {t('landing.viewAllTemplates')}
              </button>
            </div>
          </div>
        </section>
        {/* Features */}
        <section className="py-12 sm:py-20 px-4 sm:px-6 bg-surface-0">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8 sm:mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-900 mb-3 sm:mb-4">
                {t('landing.whyChoose')}
              </h2>
              <p className="text-base sm:text-lg text-primary-600 max-w-2xl mx-auto">
                {t('landing.whyDescription')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
              <FeatureCard
                icon={<Layout className="w-6 h-6" />}
                title={t('features.professionalTemplates')}
                description={t('features.professionalTemplatesDesc')}
              />
              <FeatureCard
                icon={<Sparkles className="w-6 h-6" />}
                title={t('features.intuitiveInterface')}
                description={t('features.intuitiveInterfaceDesc')}
              />
              <FeatureCard
                icon={<FileDown className="w-6 h-6" />}
                title={t('features.highQualityExport')}
                description={t('features.highQualityExportDesc')}
              />
            </div>
          </div>
        </section>
        {/* CTA */}
        <section className="py-12 sm:py-20 px-4 sm:px-6 bg-slate-200 dark:bg-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4">
              {t('landing.ctaTitle')}
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 mb-6 sm:mb-8">
              {t('landing.ctaSubtitle')}
            </p>
            <button
              onClick={() => {
                setShowLanding(false);
                window.scrollTo(0, 0);
              }}
              className="btn-brand px-6 sm:px-8 py-3 text-base w-full sm:w-auto"
            >
              {t('landing.startNow')}
            </button>
          </div>
        </section>

        {/* Footer */}
        <Footer />

      </div>
    );
  }

  // Resumes Page
  if (showResumesPage) {
    return (
      <div className="min-h-screen bg-surface-50">
        {/* Header */}
        <header className="bg-surface-0/80 backdrop-blur-xl border-b border-primary-100/50 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <button
              onClick={() => {
                setShowResumesPage(false);
                setShowLanding(true);
              }}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <FileText className="w-7 h-7 text-primary-900" />
              <span className="text-lg font-semibold text-primary-900">{t('landing.appName')}</span>
            </button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-primary-900">{t('resumes.myResumes')}</h1>
              <p className="text-sm text-primary-500 mt-1">{t('resumes.pageSubtitle') || 'Gérez et accédez à tous vos CV'}</p>
            </div>
            <button
              onClick={resumeManager.handleNewResume}
              className="btn-brand"
            >
              <Plus className="w-4 h-4" />
              {t('resumes.createNew')}
            </button>
          </div>

          {resumeManager.savedResumes.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="w-10 h-10 text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-primary-900 mb-2">{t('resumes.noResumes')}</h2>
              <p className="text-primary-500 mb-6 max-w-md mx-auto">{t('resumes.noResumesHint')}</p>
              <button
                onClick={resumeManager.handleNewResume}
                className="btn-brand"
              >
                <Plus className="w-4 h-4" />
                {t('resumes.createNew')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {resumeManager.savedResumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  isActive={resumeManager.currentResumeId === resume.id}
                  onOpen={() => resumeManager.handleOpenResume(resume)}
                  onDelete={() => resumeManager.handleDeleteResume(resume.id)}
                  onRename={(newName) => resumeManager.handleRenameResume(resume.id, newName)}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  // Editor Interface
  return (
    <div className="min-h-screen bg-surface-50 pb-20 lg:pb-0">
      {/* Header */}
      <header className="bg-surface-0/80 backdrop-blur-xl border-b border-primary-100/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => setShowLanding(true)}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <FileText className="w-7 h-7 text-primary-900" />
            <span className="hidden sm:inline text-lg font-semibold text-primary-900">{t('landing.appName')}</span>
          </button>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2 flex-nowrap">
            <ThemeToggle />
            <LanguageSwitcher />

            <div className="w-px h-5 bg-primary-200/60 mx-1" />

            {/* My Resumes */}
            <button
              onClick={() => setShowResumesPage(true)}
              className="btn-ghost"
            >
              <FolderOpen className="w-4 h-4" />
              <span className="hidden lg:inline">{t('resumes.myResumes')}</span>
            </button>

            {/* Save */}
            <button
              onClick={() => resumeManager.currentResumeId ? resumeManager.handleSaveResume() : resumeManager.setShowSaveModal(true)}
              disabled={resumeManager.saveLoading}
              className="btn-ghost"
            >
              {resumeManager.saveLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden lg:inline">{t('common.save')}</span>
            </button>

            {/* Hidden file input for import */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".pdf"
              className="hidden"
            />

            {/* Primary Export button */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-brand"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden lg:inline">{t('common.exporting')}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>{t('common.export')}</span>
                </>
              )}
            </button>

            <div className="w-px h-5 bg-primary-200/60 mx-1" />

            {/* User menu */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-primary-500 hidden lg:inline max-w-[140px] truncate">
                {user?.email}
              </span>
              <Link
                to="/account"
                className="btn-ghost !p-2 text-primary-500 hover:text-primary-700"
                title={t('account.title')}
              >
                <User className="w-4 h-4" />
              </Link>
              <button
                onClick={logout}
                className="btn-ghost !p-2 text-primary-500 hover:text-error-600 hover:bg-error-50"
                title={t('common.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile actions */}
          <div className="flex md:hidden items-center gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-brand !px-3"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="btn-ghost !p-2"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-primary-100/50 bg-surface-0/95 backdrop-blur-xl animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              {/* User info */}
              <div className="flex items-center gap-2 px-2 py-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <span className="text-sm text-primary-700 truncate font-medium">{user?.email}</span>
              </div>

              <div className="h-px bg-primary-100/80 !my-2" />

              {/* My Account */}
              <Link
                to="/account"
                onClick={() => setShowMobileMenu(false)}
                className="w-full px-2 py-2.5 text-left text-sm text-primary-700 hover:bg-primary-50 rounded-lg flex items-center gap-3 transition-colors"
              >
                <User className="w-4 h-4 text-primary-500" />
                {t('account.title')}
              </Link>

              {/* My Resumes */}
              <button
                onClick={() => {
                  setShowResumesPage(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-2 py-2.5 text-left text-sm text-primary-700 hover:bg-primary-50 rounded-lg flex items-center gap-3 transition-colors"
              >
                <FolderOpen className="w-4 h-4 text-primary-500" />
                {t('resumes.myResumes')}
              </button>

              {/* Save */}
              <button
                onClick={() => {
                  resumeManager.currentResumeId ? resumeManager.handleSaveResume() : resumeManager.setShowSaveModal(true);
                  setShowMobileMenu(false);
                }}
                disabled={resumeManager.saveLoading}
                className="w-full px-2 py-2.5 text-left text-sm text-primary-700 hover:bg-primary-50 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50"
              >
                {resumeManager.saveLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                ) : (
                  <Save className="w-4 h-4 text-primary-500" />
                )}
                {t('common.save')}
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".pdf"
                className="hidden"
              />
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowMobileMenu(false);
                }}
                disabled={importLoading}
                className="w-full px-2 py-2.5 text-left text-sm text-primary-700 hover:bg-primary-50 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50"
              >
                {importLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                ) : (
                  <Upload className="w-4 h-4 text-primary-500" />
                )}
                {t('landing.importPdf')}
              </button>

              <button
                onClick={() => {
                  setShowAddModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full px-2 py-2.5 text-left text-sm text-primary-700 hover:bg-primary-50 rounded-lg flex items-center gap-3 transition-colors"
              >
                <Plus className="w-4 h-4 text-primary-500" />
                {t('addSection.addButton')}
              </button>

              <div className="h-px bg-primary-100/80 !my-2" />

              <div className="flex items-center justify-between px-2 py-2">
                <span className="text-sm text-primary-600">{t('common.language')}</span>
                <LanguageSwitcher />
              </div>

              <div className="h-px bg-primary-100/80 !my-2" />

              {/* Logout */}
              <button
                onClick={() => {
                  logout();
                  setShowMobileMenu(false);
                }}
                className="w-full px-2 py-2.5 text-left text-sm text-error-600 hover:bg-error-50 rounded-lg flex items-center gap-3 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('common.logout')}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Error Banner */}
      {error && (
        <div className="max-w-5xl mx-auto px-6 pt-4">
          <div className="bg-error-50 border border-error-200 rounded-xl p-4 flex items-start gap-3 animate-slide-up">
            <AlertCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-error-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-error-400 hover:text-error-600 transition-colors"
            >
              <span className="sr-only">Fermer</span>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8 flex gap-4 lg:gap-8">
        {/* Left: Form */}
        <main className="flex-1 space-y-4 sm:space-y-6 min-w-0">
        {/* Import suggestion card - only if not imported and at step 0 */}
        {!hasImported && editorStep === 0 && (
          <div className="card p-4 sm:p-6 border-2 border-dashed border-primary-200 bg-primary-50/30 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileUp className="w-5 h-5 sm:w-6 sm:h-6 text-brand" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-primary-900 mb-1 text-sm sm:text-base">
                  {t('import.title')}
                </h3>
                <p className="text-xs sm:text-sm text-primary-600">
                  {t('import.description')}
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                className="btn-brand w-full sm:w-auto mt-2 sm:mt-0"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="truncate">{importMessages[importStep]}</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    {t('landing.importPdf')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 0: Personal Information */}
        {editorStep >= 0 && (
          <PersonalSection
            data={data.personal}
            onChange={(personal) => setData((prev) => ({ ...prev, personal }))}
          />
        )}

        {/* Add section button after personal info if in step mode */}
        {editorStep === 0 && !hasImported && (
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4" />
              {t('addSection.title')}
            </button>
          </div>
        )}

        {/* Sections - show based on step or all if imported */}
        {editorStep >= 1 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={data.sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {data.sections.map((section) => (
                <SortableSection
                  key={section.id}
                  section={section}
                  onUpdate={(updates) => updateSection(section.id, updates)}
                  onDelete={() => deleteSection(section.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Action buttons for sections in step mode */}
        {!hasImported && editorStep >= 1 && (
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4" />
              {t('addSection.title')}
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-brand"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {t('common.export')}
            </button>
          </div>
        )}

        {/* Action buttons when imported (all sections visible) */}
        {hasImported && data.sections.length > 0 && (
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4" />
              {t('addSection.addButton')}
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-brand"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              {t('common.export')}
            </button>
          </div>
        )}

        {/* Empty state - only when imported but no sections */}
        {hasImported && data.sections.length === 0 && (
          <div className="card p-12 text-center animate-fade-in">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-primary-900 mb-2">
              {t('sections.noSections')}
            </h3>
            <p className="text-primary-500 mb-6">
              {t('sections.noSectionsHint')}
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-brand"
            >
              <Plus className="w-4 h-4" />
              {t('addSection.addButton')}
            </button>
          </div>
        )}
        </main>

        {/* Right: Preview and Template Selector */}
        <aside className="w-80 flex-shrink-0 hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto space-y-6 pr-2">
            {/* CV Preview */}
            <CVPreview data={data} />

            {/* Template Selector */}
            <div>
            <h3 className="text-base font-semibold text-primary-900 mb-3">{t('sections.templates')}</h3>

            {/* Size selector */}
            <div className="mb-3 space-y-2">
              <div className="flex rounded-lg bg-primary-100/50 p-0.5">
                {/* Auto button */}
                <button
                  onClick={() => setAutoSize(true)}
                  className={`flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                    autoSize
                      ? 'bg-brand text-white shadow-sm'
                      : 'text-primary-500 hover:text-primary-700'
                  }`}
                  title={t('templates.autoSizeDesc')}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto</span>
                </button>
                {(['compact', 'normal', 'large'] as const).map((size) => {
                  const currentSize = getTemplateSizeVariant(data.template_id);
                  const isSelected = !autoSize && currentSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        setAutoSize(false);
                        const currentBase = getBaseTemplateId(data.template_id);
                        const newId = applyTemplateSizeVariant(currentBase as TemplateId, size);
                        setData((prev) => ({ ...prev, template_id: newId }));
                      }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                        isSelected
                          ? 'bg-surface-0 text-primary-900 shadow-sm'
                          : 'text-primary-500 hover:text-primary-700'
                      }`}
                    >
                      {size === 'compact' ? 'Compact' : size === 'normal' ? 'Normal' : 'Large'}
                    </button>
                  );
                })}
              </div>
              {/* Auto-size indicator */}
              {autoSize && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-brand/5 rounded-md">
                  {autoSizeLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 text-brand animate-spin" />
                      <span className="text-[10px] text-brand font-medium">
                        {t('templates.autoSizeCalculating') || 'Calcul en cours...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-brand" />
                      <span className="text-[10px] text-brand font-medium">
                        {t('templates.autoSizeOptimized')}: {recommendedSize === 'compact' ? 'Compact' : recommendedSize === 'large' ? 'Large' : 'Normal'}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {templatePreviews.map((template) => {
                const currentBase = data.template_id.replace(/_compact|_large/, '');
                const currentSize = data.template_id.includes('_compact') ? 'compact'
                  : data.template_id.includes('_large') ? 'large' : 'normal';
                const currentSizeSuffix = currentSize === 'normal' ? '' : `_${currentSize}`;
                const isSelected = currentBase === template.id;
                const imgSrc = getTemplateImage(template.imgBase, currentSize);
                const fallbackSrc = `${template.imgBase}.png`;
                return (
                  <button
                    key={template.id}
                    onClick={() => {
                      const newId = `${template.id}${currentSizeSuffix}` as TemplateId;
                      setData((prev) => ({ ...prev, template_id: newId }));
                    }}
                    className={`w-full text-left rounded-xl overflow-hidden transition-all ${
                      isSelected
                        ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface-50'
                        : 'ring-1 ring-primary-100 hover:ring-primary-200'
                    }`}
                  >
                    <div className="bg-white">
                      <img
                        src={imgSrc}
                        alt={template.name}
                        className="w-full h-auto"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== fallbackSrc) {
                            target.src = fallbackSrc;
                          }
                        }}
                      />
                    </div>
                    <div className={`p-1.5 border-t transition-colors ${
                      isSelected ? 'bg-brand/5 border-brand/10' : 'bg-surface-0 border-primary-50'
                    }`}>
                      <p className={`text-xs font-medium text-center ${
                        isSelected ? 'text-brand' : 'text-primary-700'
                      }`}>{template.name}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            </div>
          </div>
        </aside>
      </div>

      {showAddModal && (
        <AddSectionModal
          onAdd={addSection}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Save Modal */}
      {resumeManager.showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/50 backdrop-blur-sm p-4">
          <div className="bg-surface-0 rounded-2xl shadow-xl border border-primary-100/30 w-full max-w-md animate-fade-in">
            <div className="px-5 py-4 border-b border-primary-100/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary-900">{t('resumes.saveAs')}</h2>
              <button
                onClick={() => resumeManager.setShowSaveModal(false)}
                className="p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-primary-700">
                  {t('resumes.resumeName')}
                </label>
                <input
                  type="text"
                  value={resumeManager.resumeName}
                  onChange={(e) => resumeManager.setResumeName(e.target.value)}
                  placeholder={t('resumes.resumeNamePlaceholder')}
                  className="input"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => resumeManager.setShowSaveModal(false)}
                  className="btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={resumeManager.handleSaveResume}
                  disabled={resumeManager.saveLoading}
                  className="btn-brand flex-1"
                >
                  {resumeManager.saveLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest Upgrade Banner */}
      <GuestUpgradeBanner />

      {/* Mobile Preview Button - Fixed at bottom */}
      <button
        onClick={() => setShowMobilePreview(true)}
        className="lg:hidden fixed bottom-5 right-5 z-40 bg-brand text-white shadow-xl shadow-brand/30 rounded-full p-4 hover:bg-brand-hover active:scale-95 transition-all"
        aria-label={t('common.preview')}
      >
        <Eye className="w-5 h-5" />
      </button>

      {/* Mobile Preview Panel */}
      {showMobilePreview && (
        <div className="lg:hidden fixed inset-0 z-50 bg-surface-50">
          {/* Header */}
          <div className="sticky top-0 bg-surface-0/80 backdrop-blur-xl border-b border-primary-100/50 px-4 py-3 flex items-center justify-between">
            <h2 className="font-semibold text-primary-900">{t('common.preview')}</h2>
            <button
              onClick={() => setShowMobilePreview(false)}
              className="p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview content */}
          <div className="p-4 overflow-y-auto h-[calc(100vh-60px)]">
            <CVPreview data={data} />

            {/* Template Selector in mobile */}
            <div className="mt-6">
              <h3 className="text-base font-semibold text-primary-900 mb-3">{t('sections.templates')}</h3>

              {/* Size selector */}
              <div className="mb-3 space-y-2">
                <div className="flex rounded-lg bg-primary-100/50 p-0.5">
                  {/* Auto button */}
                  <button
                    onClick={() => setAutoSize(true)}
                    className={`flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-all ${
                      autoSize
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-primary-500'
                    }`}
                    title={t('templates.autoSizeDesc')}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto</span>
                  </button>
                  {(['compact', 'normal', 'large'] as const).map((size) => {
                    const currentSize = getTemplateSizeVariant(data.template_id);
                    const isSelected = !autoSize && currentSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => {
                          setAutoSize(false);
                          const currentBase = getBaseTemplateId(data.template_id);
                          const newId = applyTemplateSizeVariant(currentBase as TemplateId, size);
                          setData((prev) => ({ ...prev, template_id: newId }));
                        }}
                        className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                          isSelected
                            ? 'bg-surface-0 text-primary-900 shadow-sm'
                            : 'text-primary-500'
                        }`}
                      >
                        {size === 'compact' ? 'Compact' : size === 'normal' ? 'Normal' : 'Large'}
                      </button>
                    );
                  })}
                </div>
                {/* Auto-size indicator */}
                {autoSize && (
                  <div className="flex items-center gap-1.5 px-2 py-1.5 bg-brand/5 rounded-md">
                    {autoSizeLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
                        <span className="text-xs text-brand font-medium">
                          {t('templates.autoSizeCalculating') || 'Calcul en cours...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-brand" />
                        <span className="text-xs text-brand font-medium">
                          {t('templates.autoSizeOptimized')}: {recommendedSize === 'compact' ? 'Compact' : recommendedSize === 'large' ? 'Large' : 'Normal'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {templatePreviews.map((template) => {
                  const currentBase = data.template_id.replace(/_compact|_large/, '');
                  const currentSize = data.template_id.includes('_compact') ? 'compact'
                    : data.template_id.includes('_large') ? 'large' : 'normal';
                  const currentSizeSuffix = currentSize === 'normal' ? '' : `_${currentSize}`;
                  const isSelected = currentBase === template.id;
                  const imgSrc = getTemplateImage(template.imgBase, currentSize);
                  const fallbackSrc = `${template.imgBase}.png`;
                  return (
                    <button
                      key={template.id}
                      onClick={() => {
                        const newId = `${template.id}${currentSizeSuffix}` as TemplateId;
                        setData((prev) => ({ ...prev, template_id: newId }));
                      }}
                      className={`w-full text-left rounded-xl overflow-hidden transition-all active:scale-[0.98] ${
                        isSelected
                          ? 'ring-2 ring-brand ring-offset-2 ring-offset-surface-50'
                          : 'ring-1 ring-primary-100'
                      }`}
                    >
                      <div className="bg-white">
                        <img
                          src={imgSrc}
                          alt={template.name}
                          className="w-full h-auto"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== fallbackSrc) {
                              target.src = fallbackSrc;
                            }
                          }}
                        />
                      </div>
                      <div className={`p-1.5 border-t transition-colors ${
                        isSelected ? 'bg-brand/5 border-brand/10' : 'bg-surface-0 border-primary-50'
                      }`}>
                        <p className={`text-xs font-medium text-center ${
                          isSelected ? 'text-brand' : 'text-primary-700'
                        }`}>{template.name}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
