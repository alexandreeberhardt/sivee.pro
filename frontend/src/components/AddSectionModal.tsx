import { useState } from 'react';
import { X, GraduationCap, Briefcase, FolderKanban, Wrench, Users, Languages, FileText, User } from 'lucide-react';
import { SectionType, defaultSectionTitles } from '../types';

interface AddSectionModalProps {
  onAdd: (type: SectionType, title: string) => void;
  onClose: () => void;
  existingSections: SectionType[];
}

const sectionOptions: { type: SectionType; icon: React.ReactNode; description: string }[] = [
  {
    type: 'summary',
    icon: <User className="w-6 h-6" />,
    description: 'Profil et objectif professionnel',
  },
  {
    type: 'education',
    icon: <GraduationCap className="w-6 h-6" />,
    description: 'Formations, diplômes, certifications',
  },
  {
    type: 'experiences',
    icon: <Briefcase className="w-6 h-6" />,
    description: 'Expériences professionnelles',
  },
  {
    type: 'projects',
    icon: <FolderKanban className="w-6 h-6" />,
    description: 'Projets personnels ou professionnels',
  },
  {
    type: 'skills',
    icon: <Wrench className="w-6 h-6" />,
    description: 'Compétences techniques',
  },
  {
    type: 'leadership',
    icon: <Users className="w-6 h-6" />,
    description: 'Leadership et engagement associatif',
  },
  {
    type: 'languages',
    icon: <Languages className="w-6 h-6" />,
    description: 'Langues parlées',
  },
  {
    type: 'custom',
    icon: <FileText className="w-6 h-6" />,
    description: 'Section personnalisée avec titre et points',
  },
];

export default function AddSectionModal({ onAdd, onClose, existingSections }: AddSectionModalProps) {
  const [selectedType, setSelectedType] = useState<SectionType | null>(null);
  const [customTitle, setCustomTitle] = useState('');

  const handleAdd = () => {
    if (!selectedType) return;

    const title = selectedType === 'custom' && customTitle
      ? customTitle
      : defaultSectionTitles[selectedType];

    onAdd(selectedType, title);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Ajouter une section</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {sectionOptions.map((option) => {
            const isExisting = existingSections.includes(option.type) && option.type !== 'custom';
            return (
              <button
                key={option.type}
                onClick={() => !isExisting && setSelectedType(option.type)}
                disabled={isExisting}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                  selectedType === option.type
                    ? 'border-blue-500 bg-blue-50'
                    : isExisting
                    ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    selectedType === option.type
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {defaultSectionTitles[option.type]}
                    {isExisting && (
                      <span className="ml-2 text-xs text-gray-400">(déjà ajouté)</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Titre personnalisé pour section custom */}
        {selectedType === 'custom' && (
          <div className="px-4 pb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre de la section
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Ex: Publications, Certifications, Hobbies..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedType || (selectedType === 'custom' && !customTitle)}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}
