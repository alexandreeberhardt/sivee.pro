import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
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
  ArrowRight,
  FileUp,
} from 'lucide-react';
import {
  ResumeData,
  CVSection,
  emptyResumeData,
  createSection,
  SectionType,
  generateId,
  TemplateId,
  AVAILABLE_TEMPLATES,
} from './types';
import PersonalSection from './components/PersonalSection';
import SortableSection from './components/SortableSection';
import AddSectionModal from './components/AddSectionModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeToggle from './components/ThemeToggle';
import CVPreview from './components/CVPreview';

const API_URL = import.meta.env.DEV ? '/api' : '';

function App() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<ResumeData>(emptyResumeData);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [hasImported, setHasImported] = useState(false);
  const [editorStep, setEditorStep] = useState(0); // 0 = personal info, 1+ = sections
  const [importStep, setImportStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  const importMessages = [
    t('import.analyzing'),
    t('import.extracting'),
    t('import.identifying'),
    t('import.structuring'),
    t('import.finalizing'),
  ];

  const templatePreviews: { id: TemplateId; name: string; imgBase: string }[] = [
    { id: 'harvard', name: 'Harvard', imgBase: '/exemples/Luffy_Harvard' },
    { id: 'aurianne', name: 'Aurianne', imgBase: '/exemples/Homer_Aurianne' },
    { id: 'michel', name: 'Michel', imgBase: '/exemples/Luke_Michel' },
    { id: 'stephane', name: 'Stephane', imgBase: '/exemples/Luke_Stephane' },
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
    // Start with empty data
    setInitialLoading(false);
  }, []);

  // Update page title based on language
  useEffect(() => {
    document.title = t('landing.pageTitle');
  }, [t, i18n.language]);

  // Cycle through import messages
  useEffect(() => {
    if (!importLoading) {
      setImportStep(0);
      return;
    }
    const interval = setInterval(() => {
      setImportStep((prev) => Math.min(prev + 1, importMessages.length - 1));
    }, 4000);
    return () => clearInterval(interval);
  }, [importLoading, importMessages.length]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, lang: i18n.language }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || t('errors.generation'));
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = data.personal.name
        ? `${data.personal.name.trim().replace(/\s+/g, '_')}_CV.pdf`
        : 'CV.pdf';
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || t('errors.import'));
      }

      const importedData: ResumeData = await response.json();
      const processedData: ResumeData = {
        ...importedData,
        sections: importedData.sections.map((section) => ({
          ...section,
          id: generateId(),
        })),
      };

      setData(processedData);
      setShowLanding(false);
      setHasImported(true);
      setEditorStep(999); // Show all sections after import
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'import");
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setData((prev) => {
        const oldIndex = prev.sections.findIndex((s) => s.id === active.id);
        const newIndex = prev.sections.findIndex((s) => s.id === over.id);
        return {
          ...prev,
          sections: arrayMove(prev.sections, oldIndex, newIndex),
        };
      });
    }
  };

  const updateSection = (sectionId: string, updates: Partial<CVSection>) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }));
  };

  const deleteSection = (sectionId: string) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const addSection = (type: SectionType, title: string) => {
    const newSection = createSection(type, title);
    setData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setShowAddModal(false);
    // Advance to show the new section
    if (!hasImported) {
      setEditorStep((prev) => prev + 1);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          <p className="text-sm text-primary-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Landing Page
  if (showLanding) {
    return (
      <div className="min-h-screen bg-surface-50">
        {/* Navigation */}
        <nav className="fixed top-0 inset-x-0 z-50 bg-surface-0/80 backdrop-blur-md border-b border-primary-100">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-primary-900" />
              <span className="text-lg font-semibold text-primary-900">{t('landing.appName')}</span>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <LanguageSwitcher />
              <button
                onClick={() => setShowLanding(false)}
                className="btn-brand text-base"
              >
                {t('landing.start')}
              </button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">

            <h1 className="text-5xl font-bold text-primary-900 mb-6 text-balance">
              {t('landing.heroTitle')}
            </h1>

            <p className="text-xl text-primary-600 mb-10 max-w-2xl mx-auto text-balance">
              {t('landing.heroSubtitle')}
            </p>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setShowLanding(false)}
                className="btn-brand px-6 py-3 text-base"
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
                className="btn-secondary px-6 py-3 text-base"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {importMessages[importStep]}
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
        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-primary-900 mb-4">
                {t('landing.templatesAvailable', { count: AVAILABLE_TEMPLATES.length })}
              </h2>
              <p className="text-lg text-primary-600">
                {t('landing.templatesDescription')}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { img: '/exemples/Luffy_Harvard.png', name: 'Harvard', id: 'harvard' },
                { img: '/exemples/Homer_Aurianne.png', name: 'Aurianne', id: 'aurianne' },
                { img: '/exemples/Luke_Michel.png', name: 'Michel', id: 'michel' },
                { img: '/exemples/Luke_Stephane.png', name: 'Stephane', id: 'stephane' },
              ].map((template) => (
                <div
                  key={template.id}
                  className="group card p-3 text-center hover:shadow-medium transition-all cursor-pointer"
                  onClick={() => {
                    setData((prev) => ({ ...prev, template_id: template.id as TemplateId }));
                    setShowLanding(false);
                    window.scrollTo(0, 0);
                  }}
                >
                  <div className="w-full aspect-[3/4] rounded-lg mb-3 overflow-hidden bg-primary-50">
                    <img
                      src={template.img}
                      alt={`Template ${template.name}`}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-sm font-medium text-primary-900">{template.name}</p>
                </div>
              ))}
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => setShowLanding(false)}
                className="btn-ghost text-primary-600"
              >
                {t('landing.viewAllTemplates')}
              </button>
            </div>
          </div>
        </section>
        {/* Features */}
        <section className="py-20 px-6 bg-surface-0">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-primary-900 mb-4">
                {t('landing.whyChoose')}
              </h2>
              <p className="text-lg text-primary-600 max-w-2xl mx-auto">
                {t('landing.whyDescription')}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
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
        <section className="py-20 px-6 bg-slate-200 dark:bg-slate-800">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              {t('landing.ctaTitle')}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
              {t('landing.ctaSubtitle')}
            </p>
            <button
              onClick={() => setShowLanding(false)}
              className="btn-brand px-8 py-3 text-base"
            >
              {t('landing.startNow')}
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 bg-surface-0 border-t border-primary-100">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              <span className="text-sm text-primary-500">{t('landing.appName')}</span>
            </div>
            <p className="text-sm text-primary-400">
              {t('landing.madeWith')}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Editor Interface
  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-surface-0/80 backdrop-blur-md border-b border-primary-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => setShowLanding(true)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <FileText className="w-8 h-8 text-primary-900" />
            <span className="text-lg font-semibold text-primary-900">{t('landing.appName')}</span>
          </button>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LanguageSwitcher />
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
              className="btn-ghost"
            >
              {importLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{t('landing.importPdf').split(' ')[0]}</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Section</span>
            </button>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">{t('common.exporting')}</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('common.export')}</span>
                </>
              )}
            </button>
          </div>
        </div>
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
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        {/* Left: Form */}
        <main className="flex-1 space-y-6 min-w-0">
        {/* Import suggestion card - only if not imported and at step 0 */}
        {!hasImported && editorStep === 0 && (
          <div className="card p-6 border-2 border-dashed border-primary-200 bg-primary-50/30 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileUp className="w-6 h-6 text-brand" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-900 mb-1">
                  {t('import.title')}
                </h3>
                <p className="text-sm text-primary-600">
                  {t('import.description')}
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                className="btn-brand"
              >
                {importLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {importMessages[importStep]}
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

        {/* Next button after personal info if in step mode */}
        {editorStep === 0 && !hasImported && (
          <div className="flex justify-end">
            <button
              ref={nextButtonRef}
              onClick={() => {
                if (data.sections.length === 0) {
                  setShowAddModal(true);
                } else {
                  setEditorStep(1);
                  setTimeout(() => nextButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 100);
                }
              }}
              className="btn-brand"
              style={{ scrollMarginBottom: '2rem' }}
            >
              {t('common.next')}
              <ArrowRight className="w-4 h-4" />
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
              {data.sections.map((section, index) => (
                (hasImported || editorStep > index) && (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onUpdate={(updates) => updateSection(section.id, updates)}
                    onDelete={() => deleteSection(section.id)}
                  />
                )
              ))}
            </SortableContext>
          </DndContext>
        )}

        {/* Next button for sections in step mode */}
        {!hasImported && editorStep >= 1 && editorStep <= data.sections.length && (
          <div
            ref={actionButtonsRef}
            className="flex justify-between"
            style={{ scrollMarginBottom: '2rem' }}
          >
            <button
              onClick={() => setEditorStep(editorStep - 1)}
              className="btn-secondary"
            >
              {t('common.previous')}
            </button>
            <div className="flex gap-3">
              <button
                ref={editorStep < data.sections.length ? nextButtonRef : undefined}
                onClick={() => {
                  if (editorStep < data.sections.length) {
                    setEditorStep(editorStep + 1);
                    // Scroll to next button, or to action buttons if reaching last section
                    const isLastSection = editorStep + 1 >= data.sections.length;
                    setTimeout(() => {
                      if (isLastSection) {
                        actionButtonsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                      } else {
                        nextButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                      }
                    }, 100);
                  } else {
                    setShowAddModal(true);
                  }
                }}
                className={editorStep >= data.sections.length ? "btn-secondary" : "btn-brand"}
                style={{ scrollMarginBottom: '2rem' }}
              >
                {editorStep < data.sections.length ? (
                  <>
                    {t('common.next')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {t('addSection.addButton')}
                  </>
                )}
              </button>
              {editorStep >= data.sections.length && (
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
              )}
            </div>
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
            <h3 className="text-xl font-semibold text-primary-900 mb-4">{t('sections.templates')}</h3>

            {/* Size selector */}
            <div className="mb-4">
              <div className="flex rounded-lg border border-primary-200 overflow-hidden">
                {(['compact', 'normal', 'large'] as const).map((size) => {
                  const currentBase = data.template_id.replace(/_compact|_large/, '');
                  const currentSize = data.template_id.includes('_compact') ? 'compact'
                    : data.template_id.includes('_large') ? 'large' : 'normal';
                  const isSelected = currentSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => {
                        const newId = size === 'normal' ? currentBase : `${currentBase}_${size}`;
                        setData((prev) => ({ ...prev, template_id: newId as TemplateId }));
                      }}
                      className={`flex-1 py-2 text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-brand text-white'
                          : 'bg-surface-0 text-primary-600 hover:bg-primary-50'
                      }`}
                    >
                      {size === 'compact' ? 'Compact' : size === 'normal' ? 'Normal' : 'Large'}
                    </button>
                  );
                })}
              </div>
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
                    className={`w-full text-left rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-brand ring-2 ring-brand/20'
                        : 'border-primary-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="bg-primary-50">
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
                    <div className="p-1.5 bg-surface-0 border-t border-primary-100">
                      <p className="text-xs font-medium text-primary-900 text-center">{template.name}</p>
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
          existingSections={data.sections.map((s) => s.type)}
        />
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card p-6">
      <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4 text-primary-600">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-primary-900 mb-2">{title}</h3>
      <p className="text-primary-600">{description}</p>
    </div>
  );
}

export default App;
