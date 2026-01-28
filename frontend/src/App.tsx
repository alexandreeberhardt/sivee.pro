import { useState, useEffect } from 'react';
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
import { FileDown, Loader2, AlertCircle, Plus } from 'lucide-react';
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

// URL de l'API (en dev: proxy vers localhost:8000, en prod: même domaine)
const API_URL = import.meta.env.DEV ? '/api' : '';

function App() {
  const [data, setData] = useState<ResumeData>(emptyResumeData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger les données par défaut au démarrage
  useEffect(() => {
    fetch(`${API_URL}/default-data`)
      .then((res) => res.json())
      .then((defaultData) => {
        // Convertir l'ancien format vers le nouveau format avec sections
        const convertedData = convertLegacyData(defaultData);
        setData(convertedData);
        setInitialLoading(false);
      })
      .catch((err) => {
        console.error('Erreur chargement données:', err);
        setInitialLoading(false);
      });
  }, []);

  // Convertir l'ancien format de données vers le nouveau
  const convertLegacyData = (legacyData: any): ResumeData => {
    const sections: CVSection[] = [];

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

  // Générer et télécharger le PDF
  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Erreur lors de la génération');
      }

      // Télécharger le PDF
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

  // Gestion du drag & drop
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

  // Mettre à jour une section
  const updateSection = (sectionId: string, updates: Partial<CVSection>) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...updates } : s
      ),
    }));
  };

  // Supprimer une section
  const deleteSection = (sectionId: string) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  // Ajouter une nouvelle section
  const addSection = (type: SectionType, title: string) => {
    const newSection = createSection(type, title);
    setData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setShowAddModal(false);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">CV Generator</h1>
          <div className="flex items-center gap-3">
            <select
              value={data.template_id}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  template_id: e.target.value as TemplateId,
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            >
              {AVAILABLE_TEMPLATES.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Ajouter section
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <FileDown className="w-5 h-5" />
                  Générer PDF
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Erreur */}
      {error && (
        <div className="max-w-5xl mx-auto px-4 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Informations personnelles (toujours en premier, non déplaçable) */}
        <PersonalSection
          data={data.personal}
          onChange={(personal) => setData((prev) => ({ ...prev, personal }))}
        />

        {/* Sections déplaçables */}
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

        {data.sections.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 mb-4">Aucune section ajoutée</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Ajouter une section
            </button>
          </div>
        )}
      </main>

      {/* Modal d'ajout de section */}
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

export default App;
