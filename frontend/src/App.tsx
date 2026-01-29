import { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
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

const API_URL = import.meta.env.DEV ? '/api' : '';

function App() {
  const [data, setData] = useState<ResumeData>(emptyResumeData);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [hasImported, setHasImported] = useState(false);
  const [editorStep, setEditorStep] = useState(0); // 0 = personal info, 1+ = sections
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetch(`${API_URL}/default-data`)
      .then((res) => res.json())
      .then((defaultData) => {
        const convertedData = convertLegacyData(defaultData);
        setData(convertedData);
        setInitialLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement donnees:', err);
        setInitialLoading(false);
      });
  }, []);

  const convertLegacyData = (legacyData: any): ResumeData => {
    const sections: CVSection[] = [];

    if (legacyData.summary) {
      sections.push({
        id: generateId(),
        type: 'summary',
        title: 'Summary',
        isVisible: true,
        items: legacyData.summary,
      });
    }

    if (legacyData.education?.length > 0) {
      sections.push({
        id: generateId(),
        type: 'education',
        title: 'Education',
        isVisible: true,
        items: legacyData.education,
      });
    }

    if (legacyData.experiences?.length > 0) {
      sections.push({
        id: generateId(),
        type: 'experiences',
        title: 'Experiences',
        isVisible: true,
        items: legacyData.experiences,
      });
    }

    if (legacyData.projects?.length > 0) {
      sections.push({
        id: generateId(),
        type: 'projects',
        title: 'Projects',
        isVisible: true,
        items: legacyData.projects.map((p: any) => ({ ...p, year: String(p.year) })),
      });
    }

    if (legacyData.skills) {
      sections.push({
        id: generateId(),
        type: 'skills',
        title: 'Technical Skills',
        isVisible: true,
        items: legacyData.skills,
      });
    }

    if (legacyData.leadership?.length > 0) {
      sections.push({
        id: generateId(),
        type: 'leadership',
        title: 'Leadership & Community Involvement',
        isVisible: true,
        items: legacyData.leadership,
      });
    }

    if (legacyData.languages_spoken) {
      sections.push({
        id: generateId(),
        type: 'languages',
        title: 'Languages',
        isVisible: true,
        items: legacyData.languages_spoken,
      });
    }

    return {
      personal: legacyData.personal || emptyResumeData.personal,
      sections,
      template_id: 'harvard' as TemplateId,
    };
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Erreur lors de la generation');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cv.pdf';
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
        throw new Error(errData.detail || "Erreur lors de l'import");
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
          <p className="text-sm text-primary-500">Chargement...</p>
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
              <span className="text-lg font-semibold text-primary-900">Sivee</span>
            </div>
            <button
              onClick={() => setShowLanding(false)}
              className="btn-brand text-base"
            >
              Commencer
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">

            <h1 className="text-6xl font-bold text-primary-900 mb-6 text-balance">
              Creez un CV professionnel en quelques minutes
            </h1>

            <p className="text-xl text-primary-600 mb-10 max-w-2xl mx-auto text-balance">
              Importez votre CV existant ou partez de zero. Editez, personnalisez et exportez en PDF avec un rendu LaTeX impeccable.

            </p>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setShowLanding(false)}
                className="btn-brand px-6 py-3 text-base"
              >
                Creer mon CV
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
                    Import en cours...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Importer un PDF
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
                {AVAILABLE_TEMPLATES.length} templates disponibles
              </h2>
              <p className="text-lg text-primary-600">
                Du style classique au design moderne
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { img: '/exemples/Luffy_Harvard.png', name: 'Harvard', id: 'harvard' },
                { img: '/exemples/Homer_Auriane.png', name: 'Aurianne', id: 'aurianne' },
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
                Voir tous les templates
              </button>
            </div>
          </div>
        </section>
        {/* Features */}
        <section className="py-20 px-6 bg-surface-0">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-primary-900 mb-4">
                Pourquoi choisir Sivee ?
              </h2>
              <p className="text-lg text-primary-600 max-w-2xl mx-auto">
                Des outils simples et puissants pour creer le CV parfait
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Layout className="w-6 h-6" />}
                title="Templates professionnels"
                description="Choisissez parmi nos templates concu pour impressionner les recruteurs."
              />
              <FeatureCard
                icon={<Sparkles className="w-6 h-6" />}
                title="Interface intuitive"
                description="Glissez-deposez vos sections, modifiez en temps reel, sans friction."
              />
              <FeatureCard
                icon={<FileDown className="w-6 h-6" />}
                title="Export PDF haute qualite"
                description="Generez un PDF parfaitement formate, pret a etre envoye."
              />
            </div>
          </div>
        </section>
        {/* CTA */}
        <section className="py-20 px-6 bg-primary-900">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Pret a creer votre CV ?
            </h2>
            <p className="text-lg text-primary-300 mb-8">
              Commencez gratuitement, exportez en PDF en quelques clics
            </p>
            <button
              onClick={() => setShowLanding(false)}
              className="btn-brand px-8 py-3 text-base"
            >
              Commencer maintenant
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-6 bg-surface-0 border-t border-primary-100">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-400" />
              <span className="text-sm text-primary-500">Sivee</span>
            </div>
            <p className="text-sm text-primary-400">
              Fait avec soin
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
      <header className="bg-surface-0 border-b border-primary-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => setShowLanding(true)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <FileText className="w-6 h-6 text-primary-900" />
            <span className="font-semibold text-primary-900">Sivee</span>
          </button>

          <div className="flex items-center gap-3">
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
              <span className="hidden sm:inline">Importer</span>
            </button>

            <div className="relative">
              <select
                value={data.template_id}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    template_id: e.target.value as TemplateId,
                  }))
                }
                className="appearance-none h-10 pl-4 pr-10 bg-surface-0 border border-primary-200
                           rounded-xl text-sm font-medium text-primary-700
                           hover:border-primary-300 focus:outline-none focus:border-primary-400
                           focus:ring-2 focus:ring-primary-100 cursor-pointer transition-all"
              >
                {AVAILABLE_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 pointer-events-none" />
            </div>

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
                  <span className="hidden sm:inline">Generation...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Exporter en PDF</span>
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
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Import suggestion card - only if not imported and at step 0 */}
        {!hasImported && editorStep === 0 && (
          <div className="card p-6 border-2 border-dashed border-primary-200 bg-primary-50/30 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileUp className="w-6 h-6 text-brand" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-primary-900 mb-1">
                  Vous avez deja un CV ?
                </h3>
                <p className="text-sm text-primary-600">
                  Importez-le pour pre-remplir automatiquement vos informations
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importLoading}
                className="btn-brand"
              >
                {importLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Importer un PDF
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
              onClick={() => {
                if (data.sections.length === 0) {
                  setShowAddModal(true);
                } else {
                  setEditorStep(1);
                  setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
                }
              }}
              className="btn-brand"
            >
              Suivant
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
          <div className="flex justify-between">
            <button
              onClick={() => setEditorStep(editorStep - 1)}
              className="btn-secondary"
            >
              Precedent
            </button>
            <div className="flex gap-3">
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
                  Exporter en PDF
                </button>
              )}
              <button
                onClick={() => {
                  if (editorStep < data.sections.length) {
                    setEditorStep(editorStep + 1);
                    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
                  } else {
                    setShowAddModal(true);
                  }
                }}
                className={editorStep >= data.sections.length ? "btn-secondary" : "btn-brand"}
              >
                {editorStep < data.sections.length ? (
                  <>
                    Suivant
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Ajouter une section
                  </>
                )}
              </button>
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
              Ajouter une section
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
              Exporter en PDF
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
              Aucune section
            </h3>
            <p className="text-primary-500 mb-6">
              Ajoutez des sections pour construire votre CV
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-brand"
            >
              <Plus className="w-4 h-4" />
              Ajouter une section
            </button>
          </div>
        )}
      </main>

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
