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
  Eye,
  Menu,
  X,
  LogOut,
  Save,
  FolderOpen,
  User,
  Trash2,
} from 'lucide-react';
import {
  ResumeData,
  CVSection,
  emptyResumeData,
  getEmptyResumeData,
  createSection,
  SectionType,
  generateId,
  TemplateId,
  AVAILABLE_TEMPLATES,
  SavedResume,
  SizeVariant,
  applyTemplateSizeVariant,
  getTemplateSizeVariant,
  getBaseTemplateId,
  CustomItem,
} from './types';

// Liste des types de sections connus
const KNOWN_SECTION_TYPES: SectionType[] = [
  'summary',
  'education',
  'experiences',
  'projects',
  'skills',
  'leadership',
  'languages',
  'custom',
];

/**
 * Vérifie si un type de section est connu
 */
const isKnownSectionType = (type: string): type is SectionType => {
  return KNOWN_SECTION_TYPES.includes(type as SectionType);
};

/**
 * Convertit les items d'une section inconnue en format CustomItem[]
 * Gère différents formats possibles envoyés par le backend
 */
const convertToCustomItems = (items: unknown): CustomItem[] => {
  // Si c'est déjà un tableau
  if (Array.isArray(items)) {
    return items.map((item) => {
      // Si c'est une chaîne de caractères simple
      if (typeof item === 'string') {
        return {
          title: '',
          subtitle: '',
          dates: '',
          highlights: [item],
        };
      }
      // Si c'est un objet avec des highlights (tableau de strings)
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        // Extraire les highlights depuis différentes propriétés possibles
        let highlights: string[] = [];
        if (Array.isArray(obj.highlights)) {
          highlights = obj.highlights.filter((h): h is string => typeof h === 'string');
        } else if (Array.isArray(obj.points)) {
          highlights = obj.points.filter((p): p is string => typeof p === 'string');
        } else if (Array.isArray(obj.items)) {
          highlights = obj.items.filter((i): i is string => typeof i === 'string');
        } else if (typeof obj.description === 'string') {
          highlights = [obj.description];
        }

        return {
          title: typeof obj.title === 'string' ? obj.title : (typeof obj.name === 'string' ? obj.name : ''),
          subtitle: typeof obj.subtitle === 'string' ? obj.subtitle : (typeof obj.organization === 'string' ? obj.organization : ''),
          dates: typeof obj.dates === 'string' ? obj.dates : (typeof obj.date === 'string' ? obj.date : ''),
          highlights,
        };
      }
      // Fallback
      return {
        title: '',
        subtitle: '',
        dates: '',
        highlights: [],
      };
    });
  }
  // Si c'est une chaîne (ex: contenu texte simple)
  if (typeof items === 'string' && items.trim()) {
    return [{
      title: '',
      subtitle: '',
      dates: '',
      highlights: [items],
    }];
  }
  // Fallback: tableau vide
  return [];
};

/**
 * Normalise une section reçue du backend
 * Si le type est inconnu, convertit en section custom
 */
const normalizeSection = (sectionData: Record<string, unknown>): CVSection => {
  const type = sectionData.type as string;
  const title = (sectionData.title as string) || type || 'Section';
  const isVisible = sectionData.isVisible !== false;
  const id = generateId();

  // Si le type est connu, retourner la section telle quelle
  if (isKnownSectionType(type)) {
    return {
      id,
      type,
      title,
      isVisible,
      items: sectionData.items as CVSection['items'],
    };
  }

  // Type inconnu: convertir en section custom
  console.log(`Section type "${type}" inconnu, conversion en custom avec titre "${title}"`);
  return {
    id,
    type: 'custom',
    title, // Conserve le titre original (ex: "Centres d'intérêt", "Publications")
    isVisible,
    items: convertToCustomItems(sectionData.items),
  };
};
import PersonalSection from './components/PersonalSection';
import SortableSection from './components/SortableSection';
import AddSectionModal from './components/AddSectionModal';
import LanguageSwitcher from './components/LanguageSwitcher';
import ThemeToggle from './components/ThemeToggle';
import CVPreview from './components/CVPreview';
import AuthPage from './components/auth/AuthPage';
import Footer from './components/Footer';
import GuestUpgradeBanner from './components/GuestUpgradeBanner';
import { useAuth } from './context/AuthContext';
import { listResumes, createResume, updateResume, deleteResume } from './api/resumes';
import { Link } from 'react-router-dom';

const API_URL = import.meta.env.DEV ? '/api' : '';

function App() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, isLoading: authLoading, user, logout, loginAsGuest } = useAuth();

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
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const actionButtonsRef = useRef<HTMLDivElement>(null);

  // Resume management state
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [currentResumeId, setCurrentResumeId] = useState<number | null>(null);
  const [showResumesPage, setShowResumesPage] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [resumeName, setResumeName] = useState('');

  // Auto-size state
  const [autoSize, setAutoSize] = useState(true);
  const [recommendedSize, setRecommendedSize] = useState<SizeVariant>('normal');
  const [autoSizeLoading, setAutoSizeLoading] = useState(false);
  const autoSizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Helper to get translated section title
  const getTranslatedSectionTitle = (type: SectionType): string => {
    const titles: Record<SectionType, string> = {
      summary: t('sections.summary'),
      education: t('sections.education'),
      experiences: t('sections.experience'),
      projects: t('sections.projects'),
      skills: t('sections.skills'),
      leadership: t('sections.leadership'),
      languages: t('sections.languages'),
      custom: t('sections.custom'),
    };
    return titles[type];
  };

  // Default titles in all languages (to detect if a title is customized)
  const defaultTitlesAllLanguages: Record<SectionType, string[]> = {
    summary: ['Summary', 'Résumé'],
    education: ['Education', 'Formation'],
    experiences: ['Experience', 'Expérience'],
    projects: ['Projects', 'Projets'],
    skills: ['Skills', 'Compétences'],
    leadership: ['Leadership', 'Leadership'],
    languages: ['Languages', 'Langues'],
    custom: ['Custom', 'Personnalisé'],
  };

  const isDefaultTitle = (type: SectionType, title: string): boolean => {
    return defaultTitlesAllLanguages[type]?.includes(title) ?? false;
  };

  useEffect(() => {
    // Initialize with translated section titles
    setData(getEmptyResumeData(getTranslatedSectionTitle));
    setInitialLoading(false);
  }, []);

  // Load saved resumes when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSavedResumes();
    } else {
      setSavedResumes([]);
      setCurrentResumeId(null);
    }
  }, [isAuthenticated]);

  const loadSavedResumes = async () => {
    try {
      const response = await listResumes();
      setSavedResumes(response.resumes);
    } catch (err) {
      console.error('Failed to load resumes:', err);
    }
  };

  const handleSaveResume = async () => {
    if (!isAuthenticated) return;

    setSaveLoading(true);
    try {
      if (currentResumeId) {
        // Update existing resume
        await updateResume(currentResumeId, {
          json_content: data,
        });
      } else {
        // Create new resume
        const name = resumeName || data.personal.name || 'Mon CV';
        const newResume = await createResume(name, data);
        setCurrentResumeId(newResume.id);
        setShowSaveModal(false);
      }
      await loadSavedResumes();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save resume');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleOpenResume = async (resume: SavedResume) => {
    if (resume.json_content) {
      setData(resume.json_content);
      setCurrentResumeId(resume.id);
      setShowResumesPage(false);
      setShowLanding(false);
      setHasImported(true);
      setEditorStep(999);
    }
  };

  const handleDeleteResume = async (resumeId: number) => {
    if (!confirm(t('resumes.deleteConfirm'))) return;

    try {
      await deleteResume(resumeId);
      if (currentResumeId === resumeId) {
        setCurrentResumeId(null);
      }
      await loadSavedResumes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete resume');
    }
  };

  const handleNewResume = () => {
    setData(getEmptyResumeData(getTranslatedSectionTitle));
    setCurrentResumeId(null);
    setShowResumesPage(false);
    setShowLanding(false);
    setHasImported(false);
    setEditorStep(0);
  };

  // Update default section titles when language changes
  useEffect(() => {
    document.title = t('landing.pageTitle');

    // Update section titles that are still default (not customized)
    setData(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        // Only update if the current title is a default title
        if (isDefaultTitle(section.type, section.title)) {
          return { ...section, title: getTranslatedSectionTitle(section.type) };
        }
        return section;
      }),
    }));
  }, [i18n.language]);

  // Reset import step when not loading
  useEffect(() => {
    if (!importLoading) {
      setImportStep(0);
    }
  }, [importLoading]);

  // Auto-size: call backend to find optimal size when data changes
  useEffect(() => {
    if (!autoSize) return;

    // Debounce the API call to avoid excessive requests
    if (autoSizeTimeoutRef.current) {
      clearTimeout(autoSizeTimeoutRef.current);
    }

    // Get current base template to use in API call
    const currentBase = getBaseTemplateId(data.template_id);

    autoSizeTimeoutRef.current = setTimeout(async () => {
      setAutoSizeLoading(true);
      try {
        // Always use the base template for optimal-size calculation
        const dataToSend = {
          ...data,
          template_id: currentBase,
          lang: i18n.language.substring(0, 2),
        };

        const response = await fetch(`${API_URL}/optimal-size`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });

        if (response.ok) {
          const result = await response.json();
          const newRecommendedSize = result.optimal_size as SizeVariant;
          setRecommendedSize(newRecommendedSize);

          // Apply the optimal template only if different
          const newTemplateId = result.template_id as TemplateId;
          setData(prev => {
            if (prev.template_id !== newTemplateId) {
              return { ...prev, template_id: newTemplateId };
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Failed to get optimal size:', err);
      } finally {
        setAutoSizeLoading(false);
      }
    }, 1000); // 1 second debounce

    return () => {
      if (autoSizeTimeoutRef.current) {
        clearTimeout(autoSizeTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data.sections), JSON.stringify(data.personal), autoSize]);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, lang: i18n.language.substring(0, 2) }),
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
    setShowLanding(false);

    // Initialiser avec des données vides pour afficher progressivement
    const initialData: ResumeData = {
      personal: { name: '', title: '', location: '', email: '', phone: '', links: [] },
      sections: [],
      template_id: 'harvard',
    };
    setData(initialData);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/import-stream`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || t('errors.import'));
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream non disponible');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              switch (event.type) {
                case 'status':
                  // Met à jour le message de statut
                  if (event.message === 'extracting') {
                    setImportStep(0);
                  } else if (event.message === 'processing') {
                    setImportStep(1);
                  }
                  break;

                case 'personal':
                  // Met à jour les infos personnelles
                  setData(prev => ({
                    ...prev,
                    personal: event.data,
                  }));
                  setImportStep(2);
                  break;

                case 'section':
                  // Ajoute une section (avec normalisation pour les types inconnus)
                  const normalizedSection = normalizeSection(event.data as Record<string, unknown>);
                  setData(prev => ({
                    ...prev,
                    sections: [...prev.sections, normalizedSection],
                  }));
                  setImportStep(3);
                  break;

                case 'complete':
                  // Données finales complètes (avec normalisation des sections)
                  const processedData: ResumeData = {
                    ...event.data,
                    sections: event.data.sections.map((section: Record<string, unknown>) =>
                      normalizeSection(section)
                    ),
                  };
                  setData(processedData);
                  setHasImported(true);
                  setEditorStep(999);
                  setImportStep(4);
                  break;

                case 'error':
                  throw new Error(event.message);
              }
            } catch (parseErr) {
              // Ignorer les erreurs de parsing SSE partielles
              if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
                console.error('SSE parse error:', parseErr);
              }
            }
          }
        }
      }
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
              onClick={handleNewResume}
              className="btn-brand"
            >
              <Plus className="w-4 h-4" />
              {t('resumes.createNew')}
            </button>
          </div>

          {savedResumes.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-primary-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <FolderOpen className="w-10 h-10 text-primary-400" />
              </div>
              <h2 className="text-xl font-semibold text-primary-900 mb-2">{t('resumes.noResumes')}</h2>
              <p className="text-primary-500 mb-6 max-w-md mx-auto">{t('resumes.noResumesHint')}</p>
              <button
                onClick={handleNewResume}
                className="btn-brand"
              >
                <Plus className="w-4 h-4" />
                {t('resumes.createNew')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedResumes.map((resume) => (
                <ResumeCard
                  key={resume.id}
                  resume={resume}
                  isActive={currentResumeId === resume.id}
                  onOpen={() => handleOpenResume(resume)}
                  onDelete={() => handleDeleteResume(resume.id)}
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
              onClick={() => currentResumeId ? handleSaveResume() : setShowSaveModal(true)}
              disabled={saveLoading}
              className="btn-ghost"
            >
              {saveLoading ? (
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
                  currentResumeId ? handleSaveResume() : setShowSaveModal(true);
                  setShowMobileMenu(false);
                }}
                disabled={saveLoading}
                className="w-full px-2 py-2.5 text-left text-sm text-primary-700 hover:bg-primary-50 rounded-lg flex items-center gap-3 transition-colors disabled:opacity-50"
              >
                {saveLoading ? (
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
          existingSections={data.sections.map((s) => s.type)}
        />
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary-950/50 backdrop-blur-sm p-4">
          <div className="bg-surface-0 rounded-2xl shadow-xl border border-primary-100/30 w-full max-w-md animate-fade-in">
            <div className="px-5 py-4 border-b border-primary-100/50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary-900">{t('resumes.saveAs')}</h2>
              <button
                onClick={() => setShowSaveModal(false)}
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
                  value={resumeName}
                  onChange={(e) => setResumeName(e.target.value)}
                  placeholder={t('resumes.resumeNamePlaceholder')}
                  className="input"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="btn-secondary flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveResume}
                  disabled={saveLoading}
                  className="btn-brand flex-1"
                >
                  {saveLoading ? (
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
    <div className="p-5 sm:p-6 rounded-2xl bg-surface-0 border border-primary-100/50 hover:border-primary-200/50 hover:shadow-soft transition-all">
      <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center mb-4 text-brand">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-primary-900 mb-1.5">{title}</h3>
      <p className="text-sm text-primary-500 leading-relaxed">{description}</p>
    </div>
  );
}

// Detect if we're on a mobile device that doesn't support inline PDF
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
};

function ResumeCard({
  resume,
  isActive,
  onOpen,
  onDelete,
}: {
  resume: SavedResume;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMobile] = useState(isMobileDevice);

  // Generate preview on mount
  useEffect(() => {
    if (resume.json_content) {
      generatePreview();
    }
  }, [resume.id]);

  const generatePreview = async () => {
    if (!resume.json_content) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...resume.json_content, lang: 'fr' }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (err) {
      console.error('Failed to generate preview:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cleanup URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Get template name from resume data
  const templateId = resume.json_content?.template_id?.replace(/_compact|_large/, '') || 'harvard';
  const displayName = resume.name;

  return (
    <div
      className={`group bg-surface-0 rounded-2xl border overflow-hidden transition-all cursor-pointer hover:shadow-lg ${
        isActive
          ? 'border-brand ring-2 ring-brand/20'
          : 'border-primary-100 hover:border-primary-200'
      }`}
      onClick={onOpen}
    >
      {/* Preview */}
      <div className="relative aspect-[210/297] bg-primary-50 overflow-hidden">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary-200 border-t-brand animate-spin" />
          </div>
        ) : previewUrl && !isMobile ? (
          <object
            data={previewUrl}
            type="application/pdf"
            className="w-full h-full pointer-events-none"
          >
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-12 h-12 text-primary-300" />
            </div>
          </object>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FileText className="w-12 h-12 text-primary-300" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-primary-900/0 group-hover:bg-primary-900/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border border-primary-100">
            <span className="text-sm font-medium text-primary-700">{t('resumes.open') || 'Ouvrir'}</span>
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-2 right-2 p-2 bg-white/90 hover:bg-error-50 text-primary-400 hover:text-error-600 rounded-lg transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Active indicator */}
        {isActive && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-brand text-white text-xs font-medium rounded-md">
            {t('resumes.current') || 'Actuel'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-medium text-primary-900 truncate">{displayName}</h3>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-xs text-primary-400 capitalize">{templateId}</span>
          {resume.created_at && (
            <span className="text-xs text-primary-400">
              {new Date(resume.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
